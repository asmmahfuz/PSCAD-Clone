/**
 * PSCAD CLONE - IEEE Standard ST1A Static Thyristor Excitation System
 * 
 * Complies with:
 * - IEEE Std 421.5-2016 (IEEE Recommended Practice for Excitation System Models)
 * 
 * Features:
 * - High Initial Response (HIR) potential-source static thyristor rectifier exciter
 * - Terminal voltage-dependent supply ceiling: [VRmin * Vt, VRmax * Vt]
 * - Transient lead-lag filter (TC, TB) providing high low-frequency loop gain with fast phase lead
 * - Rectifier bridge commutation reactance voltage drop KC * Ifd
 * - Field current limiter (ILR, KLR) and PSS input channel VST
 */

import { TransferFunctionS } from '../transferFunction';

export interface ST1AParams {
  TR: number; // Voltage transducer time constant [s] (e.g. 0.02)
  KA: number; // Voltage regulator gain [pu] (e.g. 210.0)
  TA: number; // Voltage regulator time constant [s] (e.g. 0.02)
  TB: number; // Transient lag time constant [s] (e.g. 10.0)
  TC: number; // Transient lead time constant [s] (e.g. 1.0)
  VRmax: number; // Maximum regulator ceiling [pu] (e.g. 7.8)
  VRmin: number; // Minimum regulator ceiling [pu] (e.g. -6.7)
  KC: number; // Rectifier commutation factor (e.g. 0.05)
  KF: number; // Excitation stabilizer feedback gain (e.g. 0.0)
  TF: number; // Excitation stabilizer time constant [s] (e.g. 1.0)
  ILR: number; // Field current limit reference [pu] (e.g. 4.0)
  KLR: number; // Field current limiter gain (e.g. 0.0)
}

export interface ST1AState {
  VtFiltered: number; // Sensed terminal voltage [pu]
  leadLagOut: number; // Lead-lag filter output [pu]
  regulatorOut: number; // Amplifier output VR [pu]
  Efd: number; // Excitation field voltage output [pu]
}

export class ST1AExciter {
  public id: string;
  public params: ST1AParams;
  public state: ST1AState;

  private transducerLag: TransferFunctionS;
  private leadLag: TransferFunctionS;
  private regulatorLag: TransferFunctionS;

  constructor(id: string, customParams: Partial<ST1AParams> = {}) {
    this.id = id;
    this.params = {
      TR: customParams.TR ?? 0.02,
      KA: customParams.KA ?? 210.0,
      TA: customParams.TA ?? 0.02,
      TB: customParams.TB ?? 10.0,
      TC: customParams.TC ?? 1.0,
      VRmax: customParams.VRmax ?? 7.8,
      VRmin: customParams.VRmin ?? -6.7,
      KC: customParams.KC ?? 0.05,
      KF: customParams.KF ?? 0.0,
      TF: customParams.TF ?? 1.0,
      ILR: customParams.ILR ?? 4.0,
      KLR: customParams.KLR ?? 0.0,
    };

    this.state = {
      VtFiltered: 1.0,
      leadLagOut: 0.0,
      regulatorOut: 1.0,
      Efd: 1.0,
    };

    this.transducerLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.TR));
    this.leadLag = TransferFunctionS.leadLag(1.0, this.params.TC, Math.max(1e-4, this.params.TB));
    this.regulatorLag = TransferFunctionS.firstOrderLag(this.params.KA, Math.max(1e-4, this.params.TA));
  }

  public initialize(Efd0: number, Ifd0: number = 1.0, dt: number = 0.0001): void {
    this.state.Efd = Efd0;
    this.state.regulatorOut = Efd0 + this.params.KC * Ifd0;
    this.state.VtFiltered = 1.0;
    this.state.leadLagOut = this.state.regulatorOut / this.params.KA;

    this.transducerLag.initializeSteadyState(1.0, dt);
    this.leadLag.initializeSteadyState(this.state.leadLagOut, dt);
    this.regulatorLag.initializeSteadyState(this.state.leadLagOut, dt);
  }

  /**
   * Step the ST1A static excitation system
   * @param Vt_pu Sensed generator terminal voltage in pu
   * @param Vref_pu Voltage reference setpoint in pu (nominal 1.0)
   * @param Ifd_pu Field current in pu
   * @param Vpss_pu PSS input signal in pu
   * @param dt Time step in seconds
   * @returns Excitation voltage Efd in pu
   */
  public step(Vt_pu: number, Vref_pu: number = 1.0, Ifd_pu: number = 1.0, Vpss_pu: number = 0.0, dt: number = 0.0001): number {
    // 1. Sensed terminal voltage
    this.state.VtFiltered = this.transducerLag.step(Vt_pu, dt);

    // 2. Voltage error
    const vError = Vref_pu - this.state.VtFiltered + Vpss_pu;

    // 3. Transient lead-lag filter
    this.state.leadLagOut = this.leadLag.step(vError, dt);

    // 4. Voltage regulator amplifier with potential-source terminal voltage ceiling
    const vCeilMax = this.params.VRmax * Math.max(0.2, Vt_pu);
    const vCeilMin = this.params.VRmin * Math.max(0.2, Vt_pu);

    this.regulatorLag.minVal = vCeilMin;
    this.regulatorLag.maxVal = vCeilMax;
    this.state.regulatorOut = this.regulatorLag.step(this.state.leadLagOut, dt);

    // 5. Rectifier commutation voltage drop:
    // Efd = VR - KC * Ifd
    const commutationDrop = this.params.KC * Math.max(0.0, Ifd_pu);
    let efdUnclamped = this.state.regulatorOut - commutationDrop;

    // Field current limiter if active
    if (this.params.KLR > 0 && Ifd_pu > this.params.ILR) {
      efdUnclamped -= this.params.KLR * (Ifd_pu - this.params.ILR);
    }

    this.state.Efd = efdUnclamped;
    return this.state.Efd;
  }
}
