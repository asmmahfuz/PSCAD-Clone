/**
 * PSCAD Modern - Woodward / IEEE Diesel Engine Speed Governor (DEGOV)
 * 
 * Complies with:
 * - IEEE Recommended Models for Isolated and Microgrid Diesel Generators
 * 
 * Features:
 * - Electric speed governor amplifier with lead-lag compensator (T1, T2)
 * - Hydro-mechanical actuator positioner with time constant T3 and stroke limits [Tmin, Tmax]
 * - Diesel engine combustion transport lag (pure dead-time delay tau_delay)
 * - Slew rate limits and engine fuel limits
 */

import { TransferFunctionS } from '../transferFunction';

export interface DEGOVParams {
  K: number; // Governor gain (1/R) [e.g. 20.0 to 25.0]
  T1: number; // Governor lead time constant [s] (e.g. 0.2)
  T2: number; // Governor lag time constant [s] (e.g. 0.1)
  T3: number; // Actuator time constant [s] (e.g. 0.05)
  Tmax: number; // Maximum actuator torque limit [pu] (e.g. 1.1)
  Tmin: number; // Minimum actuator torque limit [pu] (e.g. 0.0)
  tauDelay: number; // Combustion firing transport delay [s] (e.g. 0.02)
  slewMax?: number; // Max fuel rate [pu/s] (e.g. 2.0)
}

export interface DEGOVState {
  electricOut: number; // Output of electric governor lead-lag [pu]
  actuatorPos: number; // Mechanical fuel rack position [pu]
  Pmech: number; // Net mechanical torque/power output [pu]
}

export class DEGOVGovernor {
  public id: string;
  public params: DEGOVParams;
  public state: DEGOVState;

  private leadLag: TransferFunctionS;
  private actuatorLag: TransferFunctionS;
  private delayBuffer: number[] = [];
  private bufferIndex: number = 0;
  private bufferSize: number = 200;

  constructor(id: string, customParams: Partial<DEGOVParams> = {}) {
    this.id = id;
    this.params = {
      K: customParams.K ?? 25.0, // 4% droop
      T1: customParams.T1 ?? 0.2,
      T2: customParams.T2 ?? 0.1,
      T3: customParams.T3 ?? 0.05,
      Tmax: customParams.Tmax ?? 1.1,
      Tmin: customParams.Tmin ?? 0.0,
      tauDelay: customParams.tauDelay ?? 0.02,
      slewMax: customParams.slewMax ?? 2.0,
    };

    this.state = {
      electricOut: 0.8,
      actuatorPos: 0.8,
      Pmech: 0.8,
    };

    this.leadLag = TransferFunctionS.leadLag(this.params.K, this.params.T1, Math.max(1e-4, this.params.T2));
    this.actuatorLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T3), this.params.Tmin, this.params.Tmax);
    if (this.params.slewMax) {
      this.actuatorLag.slewRateMax = this.params.slewMax;
      this.actuatorLag.slewRateMin = -this.params.slewMax;
    }
  }

  public initialize(Pmech0: number, dt: number): void {
    const pInit = Math.max(this.params.Tmin, Math.min(this.params.Tmax, Pmech0));
    this.state.electricOut = pInit;
    this.state.actuatorPos = pInit;
    this.state.Pmech = pInit;

    this.leadLag.initializeSteadyState(0.0, dt);
    this.actuatorLag.initializeSteadyState(pInit, dt);

    const delaySteps = Math.max(1, Math.round(this.params.tauDelay / Math.max(1e-6, dt)));
    this.bufferSize = delaySteps;
    this.delayBuffer = new Array(this.bufferSize).fill(pInit);
    this.bufferIndex = 0;
  }

  /**
   * Step the DEGOV diesel engine speed governor
   * @param w_pu Current rotor speed in pu (nominal = 1.0)
   * @param w_ref Speed reference in pu (nominal = 1.0)
   * @param Pref Power setpoint in pu
   * @param dt Time step in seconds
   * @returns Mechanical power output Pm in pu
   */
  public step(w_pu: number, w_ref: number = 1.0, Pref: number = 0.8, dt: number = 0.0001): number {
    const deltaW = w_ref - w_pu; // Speed error: + when slow, - when fast

    // Electric governor with lead-lag phase compensation
    const govDelta = this.leadLag.step(deltaW, dt);
    const fuelDemand = Pref + govDelta;

    // Fuel rack actuator positioner with mechanical lag and stroke limits
    this.state.actuatorPos = this.actuatorLag.step(fuelDemand, dt);

    // Pure combustion transport lag (delay ring-buffer)
    if (this.delayBuffer.length !== this.bufferSize) {
      const delaySteps = Math.max(1, Math.round(this.params.tauDelay / Math.max(1e-6, dt)));
      this.bufferSize = delaySteps;
      this.delayBuffer = new Array(this.bufferSize).fill(this.state.actuatorPos);
      this.bufferIndex = 0;
    }

    // Read delayed torque
    const delayedTorque = this.delayBuffer[this.bufferIndex];
    this.delayBuffer[this.bufferIndex] = this.state.actuatorPos;
    this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;

    this.state.Pmech = delayedTorque;
    return this.state.Pmech;
  }
}
