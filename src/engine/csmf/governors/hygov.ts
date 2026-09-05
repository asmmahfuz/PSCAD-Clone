/**
 * PSCAD CLONE - IEEE Standard Hydro Turbine Governor Model (HYGOV)
 * 
 * Complies with:
 * - IEEE Std 421.5 / IEEE Working Group on Prime Mover and Energy Supply Models for System Dynamic Studies
 * 
 * Features:
 * - Permanent droop R (e.g. 0.05 pu) and temporary droop r (e.g. 0.35 to 0.40 pu) with reset time constant Tr (e.g. 5 s)
 * - Gate servo actuator dynamics with time constant Tg, opening velocity Vopen, closing velocity Vclose, and stroke limits [Gmin, Gmax]
 * - Non-linear penstock water column inertia Tw (water hammer effect: initial inverse power surge on gate movement)
 * - Turbine torque/power conversion accounting for no-load water flow q_nl and turbine gain At:
 *     q = g * sqrt(h)
 *     dq/dt = (1 - h) / Tw
 *     Pm = At * h * (q - qnl) - D * g * deltaW
 */

import { TransferFunctionS } from '../transferFunction';

export interface HYGOVParams {
  R: number; // Permanent droop [pu] (e.g. 0.05)
  r: number; // Temporary droop [pu] (e.g. 0.38)
  Tr: number; // Governor reset time constant [s] (e.g. 5.0)
  Tg: number; // Gate servo actuator time constant [s] (e.g. 0.25)
  Vopen: number; // Max gate opening velocity [pu/s] (e.g. 0.16)
  Vclose: number; // Max gate closing velocity [pu/s] (e.g. -0.14)
  Gmax: number; // Max gate position [pu] (e.g. 1.0)
  Gmin: number; // Min gate position [pu] (e.g. 0.0)
  Tw: number; // Water starting time constant [s] (e.g. 1.5)
  At: number; // Turbine gain coefficient (e.g. 1.2)
  Dturb: number; // Turbine damping factor (e.g. 0.5)
  qnl: number; // No-load water flow [pu] (e.g. 0.08)
}

export interface HYGOVState {
  gate: number; // Gate opening position g [pu]
  gateVel: number; // Gate rate dg/dt [pu/s]
  q: number; // Water flow rate [pu]
  h: number; // Effective hydraulic head [pu]
  Pmech: number; // Turbine mechanical power [pu]
  tempDroopState: number;
}

export class HYGOVGovernor {
  public id: string;
  public params: HYGOVParams;
  public state: HYGOVState;

  private tempDroopWashout: TransferFunctionS;

  constructor(id: string, customParams: Partial<HYGOVParams> = {}) {
    this.id = id;
    this.params = {
      R: customParams.R ?? 0.05,
      r: customParams.r ?? 0.38,
      Tr: customParams.Tr ?? 5.0,
      Tg: customParams.Tg ?? 0.25,
      Vopen: customParams.Vopen ?? 0.16,
      Vclose: customParams.Vclose ?? -0.14,
      Gmax: customParams.Gmax ?? 1.0,
      Gmin: customParams.Gmin ?? 0.0,
      Tw: customParams.Tw ?? 1.5,
      At: customParams.At ?? 1.2,
      Dturb: customParams.Dturb ?? 0.5,
      qnl: customParams.qnl ?? 0.08,
    };

    this.state = {
      gate: 0.8,
      gateVel: 0.0,
      q: 0.8,
      h: 1.0,
      Pmech: 0.8,
      tempDroopState: 0.0,
    };

    // Washout filter for temporary droop: (r * s * Tr) / (1 + s * Tr)
    this.tempDroopWashout = new TransferFunctionS({
      num: [this.params.r * this.params.Tr, 0.0],
      den: [this.params.Tr, 1.0],
    });
  }

  public initialize(Pmech0: number, dt: number): void {
    // Solve initial steady-state:
    // In steady-state: h = 1.0, deltaW = 0
    // Pm = At * 1.0 * (g*1.0 - qnl) => g = Pm / At + qnl
    const g0 = Math.max(this.params.Gmin, Math.min(this.params.Gmax, Pmech0 / this.params.At + this.params.qnl));
    this.state.gate = g0;
    this.state.q = g0;
    this.state.h = 1.0;
    this.state.Pmech = this.params.At * 1.0 * (g0 - this.params.qnl);
    this.state.gateVel = 0.0;
    this.state.tempDroopState = 0.0;

    this.tempDroopWashout.initializeSteadyState(g0, dt);
  }

  /**
   * Step HYGOV hydro governor
   * @param w_pu Current rotor speed in pu (nominal = 1.0)
   * @param w_ref Speed reference setpoint in pu (nominal = 1.0)
   * @param Pref Power setpoint in pu
   * @param dt Time step in seconds
   * @returns Mechanical power output Pm in pu
   */
  public step(w_pu: number, w_ref: number = 1.0, Pref: number = 0.8, dt: number = 0.0001): number {
    const deltaW = w_pu - w_ref; // Speed error: + when fast, - when slow

    // Temporary droop feedback
    const deltaGateTemp = this.tempDroopWashout.step(this.state.gate, dt);

    // Speed error summation:
    // Error = Pref - (deltaW / R) - deltaGateTemp - gate
    // Main servo input: error / Tg
    const permDroopOffset = deltaW / Math.max(1e-4, this.params.R);
    const speedDemand = Pref - permDroopOffset - deltaGateTemp;
    let gateError = (speedDemand - this.state.gate) / Math.max(1e-4, this.params.Tg);

    // Apply velocity rate limits
    gateError = Math.max(this.params.Vclose, Math.min(this.params.Vopen, gateError));
    this.state.gateVel = gateError;

    // Integrate gate position
    let newGate = this.state.gate + gateError * dt;
    newGate = Math.max(this.params.Gmin, Math.min(this.params.Gmax, newGate));
    this.state.gate = newGate;

    // Water column dynamics (Penstock flow and head):
    // dq/dt = (1 - h) / Tw
    // In terms of gate: h = (q / g)^2
    // dq/dt = (1 - (q / g)^2) / Tw
    const gEff = Math.max(0.01, this.state.gate);
    const hCurrent = Math.pow(this.state.q / gEff, 2.0);
    this.state.h = Math.max(0.0, Math.min(3.0, hCurrent));

    const dqdt = (1.0 - this.state.h) / Math.max(1e-3, this.params.Tw);
    this.state.q += dqdt * dt;
    this.state.q = Math.max(0.0, this.state.q);

    // Calculate turbine mechanical power:
    // Pm = At * h * (q - qnl) - Dturb * gate * deltaW
    const activeFlow = Math.max(0.0, this.state.q - this.params.qnl);
    const hydroPower = this.params.At * this.state.h * activeFlow;
    const dampingLoss = this.params.Dturb * this.state.gate * deltaW;

    this.state.Pmech = Math.max(0.0, hydroPower - dampingLoss);
    return this.state.Pmech;
  }
}
