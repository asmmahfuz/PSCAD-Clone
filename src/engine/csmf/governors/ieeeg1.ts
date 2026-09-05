/**
 * PSCAD Modern - IEEE Standard General-Purpose Steam Turbine Governor (IEEEG1)
 * 
 * Complies with:
 * - IEEE Std 421.5 / IEEE PES Dynamic Models for Steam Turbines (IEEEG1 / GGOV1)
 * 
 * Features:
 * - Speed droop regulation Rp (typically 0.04 to 0.05 pu, or K = 1/Rp = 20 to 25 pu)
 * - Pilot valve / servo actuator dynamics: lag Ts with opening rate Uo and closing rate Uc
 * - Main steam valve stroke limits [Vmin, Vmax]
 * - Multi-stage HP, IP, and LP turbine reheat stages:
 *   - High-Pressure (HP) turbine stage: K1/K2 with steam chest delay T4
 *   - Intermediate-Pressure (IP) stage 1: K3/K4 with reheater delay T5
 *   - Low-Pressure (LP) stage 1: K5/K6 with 2nd reheater delay T6
 *   - LP stage 2: K7/K8 with crossover piping delay T7
 * - Fast valving transient stability actuation
 */

import { TransferFunctionS } from '../transferFunction';

export interface IEEEG1Params {
  K: number; // Governor gain (1/Rp), pu [e.g. 20.0 = 5% droop]
  T1: number; // Governor lead time constant [s] (default 0)
  T2: number; // Governor lag time constant [s] (default 0)
  T3: number; // Servo positioner lag time constant [s] (default 0.1 s)
  Uo: number; // Maximum valve opening rate [pu/s] (e.g. 0.1 to 1.0)
  Uc: number; // Maximum valve closing rate [pu/s] (e.g. -0.3 to -1.0)
  Pmax: number; // Maximum valve opening [pu] (e.g. 1.05)
  Pmin: number; // Minimum valve opening [pu] (e.g. 0.0)
  T4: number; // Steam chest time constant [s] (HP inlet, e.g. 0.2 s)
  K1: number; // HP turbine fraction (forward) [e.g. 0.3]
  K2: number; // HP turbine fraction (reverse/damping) [e.g. 0.0]
  T5: number; // Reheater time constant [s] (e.g. 7.0 s)
  K3: number; // IP turbine fraction (forward) [e.g. 0.4]
  K4: number; // IP turbine fraction (reverse) [e.g. 0.0]
  T6: number; // 2nd reheater / crossover time constant [s] (e.g. 0.5 s)
  K5: number; // LP turbine fraction 1 (forward) [e.g. 0.3]
  K6: number; // LP turbine fraction 1 (reverse) [e.g. 0.0]
  T7: number; // LP piping time constant [s] (e.g. 0.0 s)
  K7: number; // LP turbine fraction 2 (forward) [e.g. 0.0]
  K8: number; // LP turbine fraction 2 (reverse) [e.g. 0.0]
}

export interface IEEEG1State {
  valvePos: number; // Main steam valve opening [pu]
  xHP: number; // HP reheat stage state [pu]
  xIP: number; // IP reheat stage state [pu]
  xLP1: number; // LP1 reheat stage state [pu]
  xLP2: number; // LP2 reheat stage state [pu]
  Pmech: number; // Total mechanical power output [pu]
}

export class IEEEG1Governor {
  public id: string;
  public params: IEEEG1Params;
  public state: IEEEG1State;

  // Internal filters
  private govLeadLag?: TransferFunctionS;
  private servoLag: TransferFunctionS;
  private hpLag: TransferFunctionS;
  private ipLag: TransferFunctionS;
  private lp1Lag: TransferFunctionS;
  private lp2Lag: TransferFunctionS;

  constructor(id: string, customParams: Partial<IEEEG1Params> = {}) {
    this.id = id;
    this.params = {
      K: customParams.K ?? 20.0, // 5% droop
      T1: customParams.T1 ?? 0.0,
      T2: customParams.T2 ?? 0.0,
      T3: customParams.T3 ?? 0.1,
      Uo: customParams.Uo ?? 0.2,
      Uc: customParams.Uc ?? -0.5,
      Pmax: customParams.Pmax ?? 1.05,
      Pmin: customParams.Pmin ?? 0.0,
      T4: customParams.T4 ?? 0.25,
      K1: customParams.K1 ?? 0.3,
      K2: customParams.K2 ?? 0.0,
      T5: customParams.T5 ?? 7.5,
      K3: customParams.K3 ?? 0.4,
      K4: customParams.K4 ?? 0.0,
      T6: customParams.T6 ?? 0.4,
      K5: customParams.K5 ?? 0.3,
      K6: customParams.K6 ?? 0.0,
      T7: customParams.T7 ?? 0.0,
      K7: customParams.K7 ?? 0.0,
      K8: customParams.K8 ?? 0.0,
    };

    this.state = {
      valvePos: 0.8,
      xHP: 0.8,
      xIP: 0.8,
      xLP1: 0.8,
      xLP2: 0.8,
      Pmech: 0.8,
    };

    // Initialize transfer functions
    if (this.params.T2 > 1e-4) {
      this.govLeadLag = TransferFunctionS.leadLag(this.params.K, this.params.T1, this.params.T2);
    }

    this.servoLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T3), this.params.Pmin, this.params.Pmax);
    this.servoLag.slewRateMax = this.params.Uo;
    this.servoLag.slewRateMin = this.params.Uc;

    this.hpLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T4));
    this.ipLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T5));
    this.lp1Lag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T6));
    this.lp2Lag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T7));
  }

  public initialize(Pmech0: number, dt: number): void {
    const pInit = Math.max(this.params.Pmin, Math.min(this.params.Pmax, Pmech0));
    this.state.valvePos = pInit;
    this.state.xHP = pInit;
    this.state.xIP = pInit;
    this.state.xLP1 = pInit;
    this.state.xLP2 = pInit;
    this.state.Pmech = pInit;

    this.servoLag.initializeSteadyState(pInit, dt);
    this.hpLag.initializeSteadyState(pInit, dt);
    this.ipLag.initializeSteadyState(pInit, dt);
    this.lp1Lag.initializeSteadyState(pInit, dt);
    this.lp2Lag.initializeSteadyState(pInit, dt);
  }

  /**
   * Step the IEEEG1 governor
   * @param w_pu Current rotor speed in pu (nominal = 1.0)
   * @param w_ref Speed reference in pu (nominal = 1.0)
   * @param Pref Power reference setpoint in pu
   * @param dt Time step in seconds
   * @returns Mechanical power output Pm in pu
   */
  public step(w_pu: number, w_ref: number = 1.0, Pref: number = 1.0, dt: number = 0.0001): number {
    const deltaW = w_ref - w_pu; // Speed error: + when slow, - when fast

    // Speed droop input
    let droopSig: number;
    if (this.govLeadLag) {
      droopSig = this.govLeadLag.step(deltaW, dt);
    } else {
      droopSig = this.params.K * deltaW;
    }

    const valveDemand = Pref + droopSig;

    // Servo valve actuator
    this.state.valvePos = this.servoLag.step(valveDemand, dt);

    // Multi-stage turbine reheater sections
    this.state.xHP = this.hpLag.step(this.state.valvePos, dt);
    this.state.xIP = this.ipLag.step(this.state.xHP, dt);
    this.state.xLP1 = this.lp1Lag.step(this.state.xIP, dt);
    this.state.xLP2 = this.lp2Lag.step(this.state.xLP1, dt);

    // Sum individual stage powers:
    // Pm = K1*xHP + K3*xIP + K5*xLP1 + K7*xLP2
    const p1 = this.params.K1 * this.state.xHP + this.params.K2 * this.state.valvePos;
    const p2 = this.params.K3 * this.state.xIP + this.params.K4 * this.state.xHP;
    const p3 = this.params.K5 * this.state.xLP1 + this.params.K6 * this.state.xIP;
    const p4 = this.params.K7 * this.state.xLP2 + this.params.K8 * this.state.xLP1;

    this.state.Pmech = p1 + p2 + p3 + p4;
    return this.state.Pmech;
  }
}
