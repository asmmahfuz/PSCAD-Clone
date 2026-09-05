/**
 * PSCAD CLONE - IEEE Standard AC1A Alternator-Rectifier Excitation System
 * 
 * Complies with:
 * - IEEE Std 421.5-2016 (IEEE Recommended Practice for Excitation System Models)
 * 
 * Features:
 * - Alternator-supplied controlled/uncontrolled rectifier excitation system
 * - Voltage transducer filter TR and PSS / UEL / OEL summing junction
 * - High-gain AVR amplifier KA, TA with output limits [VRmin, VRmax]
 * - Exciter alternator dynamics TE, KE with non-linear magnetic saturation SE(VE) = Aex * exp(Bex * VE)
 * - Rectifier commutation characteristic FEX(IN) accounting for demagnetizing current KD * Ifd
 * - Transient excitation stabilizer feedback KF / (1 + s*TF)
 */

import { TransferFunctionS } from '../transferFunction';

export interface AC1AParams {
  TR: number; // Voltage transducer time constant [s] (e.g. 0.02)
  KA: number; // Voltage regulator gain [pu] (e.g. 400.0)
  TA: number; // Voltage regulator time constant [s] (e.g. 0.02)
  TB: number; // Voltage regulator lag time constant [s] (e.g. 0.0)
  TC: number; // Voltage regulator lead time constant [s] (e.g. 0.0)
  VRmax: number; // Maximum regulator voltage [pu] (e.g. 7.3)
  VRmin: number; // Minimum regulator voltage [pu] (e.g. -7.3)
  TE: number; // Exciter alternator field time constant [s] (e.g. 0.8)
  KE: number; // Exciter field resistance constant (e.g. 1.0)
  KD: number; // Exciter demagnetizing current factor (e.g. 0.38)
  KC: number; // Rectifier commutation factor (e.g. 0.20)
  KF: number; // Stabilizer rate feedback gain (e.g. 0.03)
  TF: number; // Stabilizer rate feedback time constant [s] (e.g. 1.0)
  E1: number; // Saturation voltage point 1 [pu] (e.g. 3.0)
  SE1: number; // Saturation at E1 (e.g. 0.10)
  E2: number; // Saturation voltage point 2 [pu] (e.g. 4.0)
  SE2: number; // Saturation at E2 (e.g. 0.35)
}

export interface AC1AState {
  VtFiltered: number; // Sensed terminal voltage [pu]
  regulatorOut: number; // VR voltage regulator output [pu]
  VE: number; // Exciter alternator internal field voltage [pu]
  Efd: number; // Generator main field excitation voltage [pu]
  stabilizerOut: number; // Rate feedback signal [pu]
}

export class AC1AExciter {
  public id: string;
  public params: AC1AParams;
  public state: AC1AState;

  // Saturation coefficients SE(V) = Aex * exp(Bex * V)
  private Aex: number = 0.0;
  private Bex: number = 0.0;

  // Internal filters
  private transducerLag: TransferFunctionS;
  private regulatorLag: TransferFunctionS;
  private leadLag?: TransferFunctionS;
  private stabilizerWashout: TransferFunctionS;

  constructor(id: string, customParams: Partial<AC1AParams> = {}) {
    this.id = id;
    this.params = {
      TR: customParams.TR ?? 0.02,
      KA: customParams.KA ?? 400.0,
      TA: customParams.TA ?? 0.02,
      TB: customParams.TB ?? 0.0,
      TC: customParams.TC ?? 0.0,
      VRmax: customParams.VRmax ?? 7.3,
      VRmin: customParams.VRmin ?? -7.3,
      TE: customParams.TE ?? 0.8,
      KE: customParams.KE ?? 1.0,
      KD: customParams.KD ?? 0.38,
      KC: customParams.KC ?? 0.20,
      KF: customParams.KF ?? 0.03,
      TF: customParams.TF ?? 1.0,
      E1: customParams.E1 ?? 3.0,
      SE1: customParams.SE1 ?? 0.10,
      E2: customParams.E2 ?? 4.0,
      SE2: customParams.SE2 ?? 0.35,
    };

    this.calculateSaturationCoefficients();

    this.state = {
      VtFiltered: 1.0,
      regulatorOut: 1.0,
      VE: 1.0,
      Efd: 1.0,
      stabilizerOut: 0.0,
    };

    this.transducerLag = TransferFunctionS.firstOrderLag(1.0, Math.max(1e-4, this.params.TR));
    this.regulatorLag = TransferFunctionS.firstOrderLag(this.params.KA, Math.max(1e-4, this.params.TA), this.params.VRmin, this.params.VRmax);
    if (this.params.TB > 1e-4) {
      this.leadLag = TransferFunctionS.leadLag(1.0, this.params.TC, this.params.TB);
    }
    this.stabilizerWashout = new TransferFunctionS({
      num: [this.params.KF, 0.0],
      den: [this.params.TF, 1.0],
    });
  }

  private calculateSaturationCoefficients(): void {
    if (this.params.SE1 > 1e-5 && this.params.SE2 > 1e-5 && this.params.E2 > this.params.E1) {
      // SE = A * exp(B * E)
      // ln(SE2 / SE1) = B * (E2 - E1) => B = ln(SE2 / SE1) / (E2 - E1)
      this.Bex = Math.log(this.params.SE2 / this.params.SE1) / (this.params.E2 - this.params.E1);
      this.Aex = this.params.SE1 / Math.exp(this.Bex * this.params.E1);
    } else {
      this.Aex = 0.0;
      this.Bex = 0.0;
    }
  }

  public getSaturation(VE: number): number {
    if (VE <= 0 || this.Aex === 0) return 0.0;
    return this.Aex * Math.exp(this.Bex * Math.abs(VE));
  }

  public initialize(Efd0: number, Ifd0: number = 1.0, dt: number = 0.0001): void {
    this.state.Efd = Efd0;
    this.state.VE = Math.max(0.1, Efd0);
    const SE = this.getSaturation(this.state.VE);
    const VR0 = (this.params.KE + SE) * this.state.VE + this.params.KD * Ifd0;

    this.state.regulatorOut = VR0;
    this.state.VtFiltered = 1.0;
    this.state.stabilizerOut = 0.0;

    this.transducerLag.initializeSteadyState(1.0, dt);
    this.regulatorLag.initializeSteadyState(VR0 / this.params.KA, dt);
    this.stabilizerWashout.initializeSteadyState(this.state.VE, dt);
  }

  /**
   * Step the AC1A excitation system
   * @param Vt_pu Sensed generator terminal voltage in pu
   * @param Vref_pu Voltage reference setpoint in pu (nominal 1.0)
   * @param Ifd_pu Generator field current in pu
   * @param Vpss_pu Power system stabilizer input signal (optional)
   * @param dt Time step in seconds
   * @returns Field voltage output Efd in pu
   */
  public step(Vt_pu: number, Vref_pu: number = 1.0, Ifd_pu: number = 1.0, Vpss_pu: number = 0.0, dt: number = 0.0001): number {
    // 1. Transducer filter
    this.state.VtFiltered = this.transducerLag.step(Vt_pu, dt);

    // 2. Voltage error calculation:
    // V_err = Vref - VtFiltered + Vpss - V_stabilizer
    this.state.stabilizerOut = this.stabilizerWashout.step(this.state.VE, dt);
    let vError = Vref_pu - this.state.VtFiltered + Vpss_pu - this.state.stabilizerOut;

    // Optional lead-lag
    if (this.leadLag) {
      vError = this.leadLag.step(vError, dt);
    }

    // 3. Voltage regulator amplifier
    this.state.regulatorOut = this.regulatorLag.step(vError, dt);

    // 4. Exciter alternator field dynamics:
    // dVE/dt = (VR - (KE + SE(VE))*VE - KD*Ifd) / TE
    const SE = this.getSaturation(this.state.VE);
    const demagLoss = this.params.KD * Ifd_pu;
    const dVEdt = (this.state.regulatorOut - (this.params.KE + SE) * this.state.VE - demagLoss) / Math.max(1e-3, this.params.TE);

    this.state.VE += dVEdt * dt;
    this.state.VE = Math.max(0.01, this.state.VE);

    // 5. Rectifier commutation regulation characteristic FEX(IN):
    // IN = KC * Ifd / VE
    const In = (this.params.KC * Math.max(0.0, Ifd_pu)) / Math.max(1e-4, this.state.VE);
    let Fex = 1.0;
    if (In <= 0.433) {
      Fex = 1.0 - 0.577 * In;
    } else if (In <= 0.75) {
      Fex = Math.sqrt(Math.max(0.0, 0.75 - In * In));
    } else if (In <= 1.0) {
      Fex = 1.732 * (1.0 - In);
    } else {
      Fex = 0.0;
    }

    // Generator field voltage output
    this.state.Efd = this.state.VE * Fex;
    return this.state.Efd;
  }
}
