/**
 * PSCAD Modern - IEEE Standard DC1A Direct Current Commutator Excitation System
 * 
 * Complies with:
 * - IEEE Std 421.5-2016 (IEEE Recommended Practice for Excitation System Models)
 * 
 * Features:
 * - Direct-current commutator exciter with self-excited or separately-excited field winding
 * - High-gain AVR amplifier KA, TA with lead-lag filter TC/TB and limits [VRmin, VRmax]
 * - Non-linear magnetic saturation function SE(Efd) = Aex * exp(Bex * Efd)
 * - Rate feedback stabilizer KF / (1 + s*TF)
 */

import { TransferFunctionS } from '../transferFunction';

export interface DC1AParams {
  TR: number; // Voltage transducer time constant [s] (e.g. 0.02)
  KA: number; // Voltage regulator gain [pu] (e.g. 40.0)
  TA: number; // Voltage regulator time constant [s] (e.g. 0.05)
  TB: number; // Voltage regulator lag time constant [s] (e.g. 0.0)
  TC: number; // Voltage regulator lead time constant [s] (e.g. 0.0)
  VRmax: number; // Maximum regulator voltage [pu] (e.g. 1.0)
  VRmin: number; // Minimum regulator voltage [pu] (e.g. -0.9)
  TE: number; // Exciter field time constant [s] (e.g. 0.5)
  KE: number; // Exciter self-excitation constant (e.g. -0.05 for self-excited, 1.0 for separate)
  KF: number; // Stabilizer rate feedback gain (e.g. 0.05)
  TF: number; // Stabilizer rate feedback time constant [s] (e.g. 0.6)
  E1: number; // Saturation voltage point 1 [pu] (e.g. 2.8)
  SE1: number; // Saturation at E1 (e.g. 0.08)
  E2: number; // Saturation voltage point 2 [pu] (e.g. 3.7)
  SE2: number; // Saturation at E2 (e.g. 0.26)
}

export interface DC1AState {
  VtFiltered: number; // Sensed terminal voltage [pu]
  regulatorOut: number; // VR voltage regulator output [pu]
  Efd: number; // Generator field voltage output [pu]
  stabilizerOut: number; // Rate feedback signal [pu]
}

export class DC1AExciter {
  public id: string;
  public params: DC1AParams;
  public state: DC1AState;

  private Aex: number = 0.0;
  private Bex: number = 0.0;

  private transducerLag: TransferFunctionS;
  private regulatorLag: TransferFunctionS;
  private leadLag?: TransferFunctionS;
  private stabilizerWashout: TransferFunctionS;

  constructor(id: string, customParams: Partial<DC1AParams> = {}) {
    this.id = id;
    this.params = {
      TR: customParams.TR ?? 0.02,
      KA: customParams.KA ?? 40.0,
      TA: customParams.TA ?? 0.05,
      TB: customParams.TB ?? 0.0,
      TC: customParams.TC ?? 0.0,
      VRmax: customParams.VRmax ?? 4.5,
      VRmin: customParams.VRmin ?? -4.0,
      TE: customParams.TE ?? 0.5,
      KE: customParams.KE ?? 1.0,
      KF: customParams.KF ?? 0.05,
      TF: customParams.TF ?? 0.6,
      E1: customParams.E1 ?? 2.8,
      SE1: customParams.SE1 ?? 0.08,
      E2: customParams.E2 ?? 3.7,
      SE2: customParams.SE2 ?? 0.26,
    };

    this.calculateSaturationCoefficients();

    this.state = {
      VtFiltered: 1.0,
      regulatorOut: 1.0,
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
      this.Bex = Math.log(this.params.SE2 / this.params.SE1) / (this.params.E2 - this.params.E1);
      this.Aex = this.params.SE1 / Math.exp(this.Bex * this.params.E1);
    } else {
      this.Aex = 0.0;
      this.Bex = 0.0;
    }
  }

  public getSaturation(Efd: number): number {
    if (Efd <= 0 || this.Aex === 0) return 0.0;
    return this.Aex * Math.exp(this.Bex * Math.abs(Efd));
  }

  public initialize(Efd0: number, dt: number = 0.0001): void {
    this.state.Efd = Efd0;
    const SE = this.getSaturation(Efd0);
    const VR0 = (this.params.KE + SE) * Efd0;

    this.state.regulatorOut = VR0;
    this.state.VtFiltered = 1.0;
    this.state.stabilizerOut = 0.0;

    this.transducerLag.initializeSteadyState(1.0, dt);
    this.regulatorLag.initializeSteadyState(VR0 / this.params.KA, dt);
    this.stabilizerWashout.initializeSteadyState(Efd0, dt);
  }

  /**
   * Step the DC1A excitation system
   * @param Vt_pu Sensed terminal voltage in pu
   * @param Vref_pu Voltage reference in pu (nominal 1.0)
   * @param Vpss_pu PSS input signal
   * @param dt Time step in seconds
   * @returns Field voltage output Efd in pu
   */
  public step(Vt_pu: number, Vref_pu: number = 1.0, Vpss_pu: number = 0.0, dt: number = 0.0001): number {
    // 1. Transducer filter
    this.state.VtFiltered = this.transducerLag.step(Vt_pu, dt);

    // 2. Voltage error calculation:
    this.state.stabilizerOut = this.stabilizerWashout.step(this.state.Efd, dt);
    let vError = Vref_pu - this.state.VtFiltered + Vpss_pu - this.state.stabilizerOut;

    if (this.leadLag) {
      vError = this.leadLag.step(vError, dt);
    }

    // 3. Voltage regulator amplifier
    this.state.regulatorOut = this.regulatorLag.step(vError, dt);

    // 4. DC commutator exciter field differential equation:
    // dEfd/dt = (VR - (KE + SE(Efd))*Efd) / TE
    const SE = this.getSaturation(this.state.Efd);
    const dEfddt = (this.state.regulatorOut - (this.params.KE + SE) * this.state.Efd) / Math.max(1e-3, this.params.TE);

    this.state.Efd += dEfddt * dt;
    this.state.Efd = Math.max(0.0, this.state.Efd);
    return this.state.Efd;
  }
}
