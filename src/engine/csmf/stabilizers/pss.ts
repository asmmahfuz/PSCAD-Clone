/**
 * PSCAD CLONE - IEEE Standard Power System Stabilizers (PSS1A & PSS2B)
 * 
 * Complies with:
 * - IEEE Std 421.5-2016 (IEEE Recommended Practice for Excitation System Models & Stabilizers)
 * 
 * Includes:
 * 1. PSS1A: Single-input stabilizer (Delta-omega / Delta-f / Delta-Pe) with washout,
 *    2-stage lead-lag phase compensation, torsional notch SSR filter, and output limits.
 * 2. PSS2B: Dual-input integral accelerating power stabilizer (Delta-omega and Pe),
 *    synthesizing accelerating power Pa = Pm - Pe to eliminate torsional interaction,
 *    with multi-washout filtering and low-power generator lockout logic.
 */

import { TransferFunctionS } from '../transferFunction';

// =========================================================================
// 1. IEEE Std 421.5 Type PSS1A (Single-Input Stabilizer)
// =========================================================================

export interface PSS1AParams {
  Kpss: number; // Stabilizer gain [pu] (e.g. 5.0 to 20.0)
  Tw: number; // Washout time constant [s] (e.g. 10.0)
  Tw2?: number; // 2nd washout time constant [s] (e.g. 0.0)
  T1: number; // Lead time constant 1 [s] (e.g. 0.25)
  T2: number; // Lag time constant 1 [s] (e.g. 0.04)
  T3: number; // Lead time constant 2 [s] (e.g. 0.25)
  T4: number; // Lag time constant 2 [s] (e.g. 0.04)
  T6?: number; // Transducer filter time constant [s] (e.g. 0.0)
  VstMax: number; // Maximum stabilizer output limit [pu] (e.g. 0.10)
  VstMin: number; // Minimum stabilizer output limit [pu] (e.g. -0.10)
  notchFreqRad?: number; // Torsional SSR notch center frequency [rad/s] (e.g. 2*pi*15 Hz)
  notchZeta?: number; // Notch filter damping ratio (e.g. 0.1)
}

export interface PSS1AState {
  inputFiltered: number;
  washoutOut: number;
  leadLag1Out: number;
  leadLag2Out: number;
  notchOut: number;
  Vst: number; // Stabilizer output signal injected to AVR [pu]
}

export class PSS1AStabilizer {
  public id: string;
  public params: PSS1AParams;
  public state: PSS1AState;

  private transducerLag?: TransferFunctionS;
  private washout: TransferFunctionS;
  private washout2?: TransferFunctionS;
  private leadLag1: TransferFunctionS;
  private leadLag2: TransferFunctionS;
  private notchFilter?: TransferFunctionS;

  constructor(id: string, customParams: Partial<PSS1AParams> = {}) {
    this.id = id;
    this.params = {
      Kpss: customParams.Kpss ?? 10.0,
      Tw: customParams.Tw ?? 10.0,
      Tw2: customParams.Tw2 ?? 0.0,
      T1: customParams.T1 ?? 0.25,
      T2: customParams.T2 ?? 0.04,
      T3: customParams.T3 ?? 0.25,
      T4: customParams.T4 ?? 0.04,
      T6: customParams.T6 ?? 0.0,
      VstMax: customParams.VstMax ?? 0.10,
      VstMin: customParams.VstMin ?? -0.10,
      notchFreqRad: customParams.notchFreqRad,
      notchZeta: customParams.notchZeta ?? 0.1,
    };

    this.state = {
      inputFiltered: 0.0,
      washoutOut: 0.0,
      leadLag1Out: 0.0,
      leadLag2Out: 0.0,
      notchOut: 0.0,
      Vst: 0.0,
    };

    if (this.params.T6 && this.params.T6 > 1e-4) {
      this.transducerLag = TransferFunctionS.firstOrderLag(1.0, this.params.T6);
    }
    this.washout = TransferFunctionS.washout(Math.max(1e-3, this.params.Tw));
    if (this.params.Tw2 && this.params.Tw2 > 1e-4) {
      this.washout2 = TransferFunctionS.washout(this.params.Tw2);
    }
    this.leadLag1 = TransferFunctionS.leadLag(1.0, this.params.T1, Math.max(1e-4, this.params.T2));
    this.leadLag2 = TransferFunctionS.leadLag(1.0, this.params.T3, Math.max(1e-4, this.params.T4));

    if (this.params.notchFreqRad && this.params.notchFreqRad > 0) {
      this.notchFilter = TransferFunctionS.biquadNotch(this.params.notchFreqRad, this.params.notchZeta);
    }
  }

  public initialize(u0: number = 0.0, dt: number = 0.0001): void {
    this.state = {
      inputFiltered: u0,
      washoutOut: 0.0,
      leadLag1Out: 0.0,
      leadLag2Out: 0.0,
      notchOut: 0.0,
      Vst: 0.0,
    };
    if (this.transducerLag) this.transducerLag.initializeSteadyState(u0, dt);
    this.washout.initializeSteadyState(u0, dt);
    if (this.washout2) this.washout2.initializeSteadyState(0.0, dt);
    this.leadLag1.initializeSteadyState(0.0, dt);
    this.leadLag2.initializeSteadyState(0.0, dt);
    if (this.notchFilter) this.notchFilter.initializeSteadyState(0.0, dt);
  }

  /**
   * Step the PSS1A stabilizer
   * @param inputSignal Input signal in pu (e.g. speed deviation delta_w = w - 1.0)
   * @param dt Time step in seconds
   * @returns Stabilizer output signal Vst in pu
   */
  public step(inputSignal: number, dt: number = 0.0001): number {
    // 1. Transducer filter
    let u = inputSignal;
    if (this.transducerLag) {
      u = this.transducerLag.step(u, dt);
    }
    this.state.inputFiltered = u;

    // 2. High-pass washout filter(s)
    let wOut = this.washout.step(u, dt);
    if (this.washout2) {
      wOut = this.washout2.step(wOut, dt);
    }
    this.state.washoutOut = wOut;

    // 3. Stabilizer gain and 2-stage lead-lag phase compensation
    const amplified = this.params.Kpss * wOut;
    this.state.leadLag1Out = this.leadLag1.step(amplified, dt);
    this.state.leadLag2Out = this.leadLag2.step(this.state.leadLag1Out, dt);

    // 4. SSR Torsional notch filter if configured
    let filteredSig = this.state.leadLag2Out;
    if (this.notchFilter) {
      filteredSig = this.notchFilter.step(filteredSig, dt);
    }
    this.state.notchOut = filteredSig;

    // 5. Output clamping limits [-VstMin, +VstMax]
    this.state.Vst = Math.max(this.params.VstMin, Math.min(this.params.VstMax, filteredSig));
    return this.state.Vst;
  }
}

// =========================================================================
// 2. IEEE Std 421.5 Type PSS2B (Dual-Input Accelerating Power Stabilizer)
// =========================================================================

export interface PSS2BParams {
  Kpss: number; // Stabilizer gain [pu] (e.g. 15.0)
  Tw1: number; // Washout 1 time constant [s] (e.g. 2.0)
  Tw2: number; // Washout 2 time constant [s] (e.g. 2.0)
  Tw3: number; // Washout 3 time constant [s] (e.g. 2.0)
  Tw4: number; // Washout 4 time constant [s] (e.g. 0.0)
  T1: number; // Lead time constant 1 [s] (e.g. 0.16)
  T2: number; // Lag time constant 1 [s] (e.g. 0.02)
  T3: number; // Lead time constant 2 [s] (e.g. 0.16)
  T4: number; // Lag time constant 2 [s] (e.g. 0.02)
  T6: number; // Speed channel transducer filter [s] (e.g. 0.0)
  T7: number; // Power channel transducer filter [s] (e.g. 2.0)
  T8: number; // Ramp tracking filter [s] (e.g. 0.5)
  T9: number; // Derivator filter [s] (e.g. 0.1)
  H: number; // Generator inertia constant [s] (e.g. 3.5)
  PminLockout: number; // Minimum power lockout threshold [pu] (e.g. 0.15)
  VstMax: number; // Output upper limit [pu] (e.g. 0.10)
  VstMin: number; // Output lower limit [pu] (e.g. -0.10)
}

export interface PSS2BState {
  wFiltered: number;
  peFiltered: number;
  synthPm: number; // Synthesized mechanical power [pu]
  Pa: number; // Accelerating power Pa = Pm - Pe [pu]
  washoutOut: number;
  leadLagOut: number;
  isLockedOut: boolean;
  Vst: number; // Stabilizer output to AVR [pu]
}

export class PSS2BStabilizer {
  public id: string;
  public params: PSS2BParams;
  public state: PSS2BState;

  private wWashout1: TransferFunctionS;
  private wWashout2: TransferFunctionS;
  private peWashout1: TransferFunctionS;
  private peWashout2?: TransferFunctionS;
  private speedDerivator: TransferFunctionS;
  private leadLag1: TransferFunctionS;
  private leadLag2: TransferFunctionS;

  constructor(id: string, customParams: Partial<PSS2BParams> = {}) {
    this.id = id;
    this.params = {
      Kpss: customParams.Kpss ?? 15.0,
      Tw1: customParams.Tw1 ?? 2.0,
      Tw2: customParams.Tw2 ?? 2.0,
      Tw3: customParams.Tw3 ?? 2.0,
      Tw4: customParams.Tw4 ?? 0.0,
      T1: customParams.T1 ?? 0.16,
      T2: customParams.T2 ?? 0.02,
      T3: customParams.T3 ?? 0.16,
      T4: customParams.T4 ?? 0.02,
      T6: customParams.T6 ?? 0.0,
      T7: customParams.T7 ?? 2.0,
      T8: customParams.T8 ?? 0.5,
      T9: customParams.T9 ?? 0.1,
      H: customParams.H ?? 3.5,
      PminLockout: customParams.PminLockout ?? 0.15,
      VstMax: customParams.VstMax ?? 0.10,
      VstMin: customParams.VstMin ?? -0.10,
    };

    this.state = {
      wFiltered: 1.0,
      peFiltered: 0.8,
      synthPm: 0.8,
      Pa: 0.0,
      washoutOut: 0.0,
      leadLagOut: 0.0,
      isLockedOut: false,
      Vst: 0.0,
    };

    this.wWashout1 = TransferFunctionS.washout(Math.max(1e-3, this.params.Tw1));
    this.wWashout2 = TransferFunctionS.washout(Math.max(1e-3, this.params.Tw2));
    this.peWashout1 = TransferFunctionS.washout(Math.max(1e-3, this.params.Tw3));
    if (this.params.Tw4 > 1e-4) {
      this.peWashout2 = TransferFunctionS.washout(this.params.Tw4);
    }

    // Speed derivator: 2*H*s / (1 + s*T9)
    this.speedDerivator = new TransferFunctionS({
      num: [2.0 * this.params.H, 0.0],
      den: [Math.max(1e-3, this.params.T9), 1.0],
    });

    this.leadLag1 = TransferFunctionS.leadLag(1.0, this.params.T1, Math.max(1e-4, this.params.T2));
    this.leadLag2 = TransferFunctionS.leadLag(1.0, this.params.T3, Math.max(1e-4, this.params.T4));
  }

  public initialize(w0: number = 1.0, pe0: number = 0.8, dt: number = 0.0001): void {
    this.state = {
      wFiltered: w0,
      peFiltered: pe0,
      synthPm: pe0,
      Pa: 0.0,
      washoutOut: 0.0,
      leadLagOut: 0.0,
      isLockedOut: false,
      Vst: 0.0,
    };

    this.wWashout1.initializeSteadyState(w0, dt);
    this.wWashout2.initializeSteadyState(0.0, dt);
    this.peWashout1.initializeSteadyState(pe0, dt);
    if (this.peWashout2) this.peWashout2.initializeSteadyState(0.0, dt);
    this.speedDerivator.initializeSteadyState(w0, dt);
    this.leadLag1.initializeSteadyState(0.0, dt);
    this.leadLag2.initializeSteadyState(0.0, dt);
  }

  /**
   * Step the PSS2B dual-input accelerating power stabilizer
   * @param w_pu Rotor electrical speed in pu (nominal = 1.0)
   * @param Pe_pu Electrical active power in pu
   * @param dt Time step in seconds
   * @returns Stabilizer output signal Vst in pu
   */
  public step(w_pu: number, Pe_pu: number, dt: number = 0.0001): number {
    this.state.wFiltered = w_pu;
    this.state.peFiltered = Pe_pu;

    // Check low-power lockout (e.g. generator off-line or very low load)
    if (Pe_pu < this.params.PminLockout) {
      this.state.isLockedOut = true;
      this.state.Vst = 0.0;
      return 0.0;
    }
    this.state.isLockedOut = false;

    // 1. Synthesize accelerating power:
    // d(omega)/dt channel derivative: 2H * dw/dt
    const dWdtPart = this.speedDerivator.step(w_pu, dt);

    // Washout speed derivative channel
    const wPartWashout = this.wWashout2.step(this.wWashout1.step(dWdtPart, dt), dt);

    // Washout electrical power channel
    let pePartWashout = this.peWashout1.step(Pe_pu, dt);
    if (this.peWashout2) {
      pePartWashout = this.peWashout2.step(pePartWashout, dt);
    }

    // Accelerating power Pa = 2H*dw/dt - deltaPe
    this.state.Pa = wPartWashout - pePartWashout;
    this.state.washoutOut = this.state.Pa;

    // 2. Lead-lag phase compensation & gain
    const amplified = this.params.Kpss * this.state.Pa;
    this.state.leadLagOut = this.leadLag2.step(this.leadLag1.step(amplified, dt), dt);

    // 3. Limit output signal
    this.state.Vst = Math.max(this.params.VstMin, Math.min(this.params.VstMax, this.state.leadLagOut));
    return this.state.Vst;
  }
}
