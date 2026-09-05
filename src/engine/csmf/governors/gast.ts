/**
 * PSCAD CLONE - IEEE Standard Gas Turbine Governor Model (GAST)
 * 
 * Complies with:
 * - IEEE Recommended Practice for Excitation and Turbine-Governor Models in Power System Stability Studies
 * 
 * Features:
 * - Speed droop regulation R (typically 4% to 5%)
 * - Fuel valve positioner time constant T1 (e.g. 0.4 s)
 * - Compressor discharge / combustor volume time constant T2 (e.g. 0.1 s)
 * - Turbine exhaust temperature thermocouple sensor time constant T3 (e.g. 3.0 s)
 * - High temperature fuel limiting control with ambient temperature derating
 * - Valve stroke limits [Vmin, Vmax]
 */

import { TransferFunctionS } from '../transferFunction';

export interface GASTParams {
  R: number; // Permanent speed droop [pu] (e.g. 0.04)
  T1: number; // Fuel valve positioner time constant [s] (e.g. 0.4)
  T2: number; // Combustor / compressor discharge time constant [s] (e.g. 0.1)
  T3: number; // Exhaust temperature thermocouple time constant [s] (e.g. 3.0)
  Lmax: number; // Temperature radiation load limit [pu] (e.g. 1.05)
  Kt: number; // Temperature control loop gain (e.g. 2.0)
  Vmax: number; // Maximum fuel valve position [pu] (e.g. 1.05)
  Vmin: number; // Minimum fuel valve position [pu] (e.g. 0.0)
  Dturb: number; // Turbine damping factor (e.g. 0.0)
  ambientTempC?: number; // Ambient temperature in deg C (nominal 15°C)
}

export interface GASTState {
  valvePos: number; // Fuel valve opening position [pu]
  fuelFlow: number; // Combustor fuel flow rate [pu]
  exhaustTemp: number; // Thermocouple sensed exhaust temp [pu]
  tempLimiterOut: number; // Fuel demand from temp controller [pu]
  Pmech: number; // Net mechanical output power [pu]
}

export class GASTGovernor {
  public id: string;
  public params: GASTParams;
  public state: GASTState;

  private valveLag: TransferFunctionS;
  private combustorLag: TransferFunctionS;
  private thermoLag: TransferFunctionS;

  constructor(id: string, customParams: Partial<GASTParams> = {}) {
    this.id = id;
    this.params = {
      R: customParams.R ?? 0.04,
      T1: customParams.T1 ?? 0.4,
      T2: customParams.T2 ?? 0.1,
      T3: customParams.T3 ?? 3.0,
      Lmax: customParams.Lmax ?? 1.05,
      Kt: customParams.Kt ?? 2.0,
      Vmax: customParams.Vmax ?? 1.05,
      Vmin: customParams.Vmin ?? 0.0,
      Dturb: customParams.Dturb ?? 0.0,
      ambientTempC: customParams.ambientTempC ?? 15.0,
    };

    this.state = {
      valvePos: 0.8,
      fuelFlow: 0.8,
      exhaustTemp: 0.8,
      tempLimiterOut: 1.05,
      Pmech: 0.8,
    };

    this.valveLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T1), this.params.Vmin, this.params.Vmax);
    this.combustorLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T2));
    this.thermoLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.T3));
  }

  public initialize(Pmech0: number, dt: number): void {
    const pInit = Math.max(this.params.Vmin, Math.min(this.params.Vmax, Pmech0));
    this.state.valvePos = pInit;
    this.state.fuelFlow = pInit;
    this.state.exhaustTemp = pInit;
    this.state.tempLimiterOut = this.params.Lmax;
    this.state.Pmech = pInit;

    this.valveLag.initializeSteadyState(pInit, dt);
    this.combustorLag.initializeSteadyState(pInit, dt);
    this.thermoLag.initializeSteadyState(pInit, dt);
  }

  /**
   * Step the GAST gas turbine governor
   * @param w_pu Current rotor speed in pu (nominal = 1.0)
   * @param w_ref Speed reference in pu (nominal = 1.0)
   * @param Pref Power reference in pu
   * @param dt Time step in seconds
   * @returns Mechanical power output Pm in pu
   */
  public step(w_pu: number, w_ref: number = 1.0, Pref: number = 0.8, dt: number = 0.0001): number {
    const deltaW = w_ref - w_pu; // Speed error: + when slow, - when fast

    // Speed droop demand: Pref + deltaW / R
    const droopGain = 1.0 / Math.max(1e-4, this.params.R);
    const speedDemand = Pref + droopGain * deltaW;

    // Exhaust temperature feedback & radiation limiter:
    // Sensed temperature is proportional to fuel flow
    this.state.exhaustTemp = this.thermoLag.step(this.state.fuelFlow, dt);
    
    // Temperature limit fuel demand: Lmax - Kt * (exhaustTemp - 1.0)
    const tempFuelLimit = this.params.Lmax - this.params.Kt * Math.max(0.0, this.state.exhaustTemp - 1.0);
    this.state.tempLimiterOut = tempFuelLimit;

    // Minimum fuel selector (Lowest Value Selector: speed demand vs temperature limit)
    const fuelDemand = Math.min(speedDemand, tempFuelLimit);

    // Fuel valve positioning actuator
    this.state.valvePos = this.valveLag.step(fuelDemand, dt);

    // Combustor delay & fuel-to-torque conversion
    this.state.fuelFlow = this.combustorLag.step(this.state.valvePos, dt);

    // Mechanical output power with turbine self-damping
    const dampingPower = this.params.Dturb * deltaW;
    this.state.Pmech = Math.max(0.0, this.state.fuelFlow + dampingPower);
    return this.state.Pmech;
  }
}
