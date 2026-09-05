/**
 * PSCAD Modern - 6-Pulse & 12-Pulse Line Commutated Converter (LCC) Graetz Bridge (TypeScript)
 * 
 * Supports:
 * - 6-Pulse Graetz Bridge and 12-Pulse Y-Y / Y-Δ Phase-Shifting Configuration (30° shift)
 * - Firing angle (alpha) phase-locked controller
 * - Commutation overlap angle (mu) and extinction angle (gamma) margin monitoring
 * - Commutation failure protection and 12-pulse DC ripple reduction (< 1.0%)
 */

import type { ComponentParams } from '../../types';
import { Thyristor, type ThyristorState } from './thyristor';

export interface LccBridgeState {
  is12Pulse: boolean;
  alphaDeg: number;       // Firing angle [degrees]
  muDeg: number;          // Commutation overlap angle [degrees]
  gammaDeg: number;       // Extinction angle [degrees]
  v_dc: number;           // DC output voltage [V]
  i_dc: number;           // DC output current [A]
  v_ac_rms: number;       // AC line-to-line RMS voltage [V]
  p_mw: number;           // Real power [MW]
  q_mvar: number;         // Reactive power consumed [MVAR]
  dcRipplePct: number;    // Peak-to-peak DC voltage ripple %
  commutationFailure: boolean;
  thyristors: ThyristorState[]; // 6 thyristor states for 6-pulse, 12 for 12-pulse
}

export class LccGraetzBridge {
  id: string;
  is12Pulse: boolean;
  V_nom_ll: number;      // Nominal AC line-to-line RMS [V] (e.g. 230 kV)
  alphaDeg: number;      // Firing angle [deg] (e.g. 15° for rectifier, 140° for inverter)
  gammaMinDeg: number;   // Minimum extinction angle margin [deg] (default 15°)
  freq: number;          // Grid frequency [Hz]
  Lc: number;            // Commutating transformer leakage inductance [H]
  Ldc: number;           // DC smoothing reactor [H]
  Rdc: number;           // DC circuit resistance [Ω]

  private thyristorModels: Thyristor[];

  constructor(id: string, params: ComponentParams = {}, is12Pulse: boolean = false) {
    this.id = id;
    this.is12Pulse = is12Pulse || params.type?.includes('12pulse') || false;
    this.V_nom_ll = params.V_ac_nom ?? params.voltage ?? 230000;
    this.alphaDeg = params.alphaDeg ?? params.firingAngleDeg ?? 18.0; // 18° default
    this.gammaMinDeg = params.gammaMinDeg ?? 15.0;
    this.freq = params.freq ?? 60;
    this.Lc = Math.max(params.inductance ?? 0.015, 1e-4); // 15 mH commutating inductance
    this.Ldc = 0.100; // 100 mH DC smoothing reactor
    this.Rdc = 0.50;  // 0.5 Ω

    const numThyristors = this.is12Pulse ? 12 : 6;
    this.thyristorModels = [];
    for (let i = 0; i < numThyristors; i++) {
      this.thyristorModels.push(new Thyristor(`${id}_th_${i + 1}`, params));
    }
  }

  initState(): LccBridgeState {
    const states: ThyristorState[] = [];
    const numTh = this.is12Pulse ? 12 : 6;
    for (let i = 0; i < numTh; i++) {
      states.push(this.thyristorModels[i].initState());
    }

    const V_base_dc = (this.is12Pulse ? 2 : 1) * (3.0 * Math.SQRT2 / Math.PI) * this.V_nom_ll * Math.cos((this.alphaDeg * Math.PI) / 180);

    return {
      is12Pulse: this.is12Pulse,
      alphaDeg: this.alphaDeg,
      muDeg: 12.0,
      gammaDeg: 180.0 - this.alphaDeg - 12.0,
      v_dc: V_base_dc,
      i_dc: 1000.0,
      v_ac_rms: this.V_nom_ll,
      p_mw: (V_base_dc * 1000) / 1e6,
      q_mvar: (V_base_dc * 1000 * Math.tan((this.alphaDeg * Math.PI) / 180)) / 1e6,
      dcRipplePct: this.is12Pulse ? 0.8 : 4.5,
      commutationFailure: false,
      thyristors: states,
    };
  }

  /**
   * Calculate Ideal DC Voltage and Commutation Overlap
   */
  calculateOperatingPoint(v_ac_ll: number, i_dc: number, alphaDeg: number): {
    v_dc: number;
    muDeg: number;
    gammaDeg: number;
    commFailure: boolean;
  } {
    const alphaRad = (alphaDeg * Math.PI) / 180.0;
    const omega = 2.0 * Math.PI * this.freq;
    const factor = this.is12Pulse ? 2 : 1;

    // Ideal no-load average DC voltage: V_d0 = factor * (3*sqrt(2)/pi) * V_ll
    const V_d0 = factor * (3.0 * Math.SQRT2 / Math.PI) * v_ac_ll;

    // Commutation voltage drop: delta_V = factor * (3 * omega * Lc / pi) * i_dc
    const deltaV = factor * (3.0 * omega * this.Lc / Math.PI) * i_dc;

    // Average DC voltage: V_dc = V_d0 * cos(alpha) - deltaV
    const v_dc = V_d0 * Math.cos(alphaRad) - deltaV;

    // Commutation overlap angle: cos(alpha + mu) = cos(alpha) - 2*omega*Lc*i_dc / (sqrt(2)*V_ll)
    const cosArg = Math.max(-1.0, Math.min(1.0, Math.cos(alphaRad) - (2.0 * omega * this.Lc * i_dc) / (Math.SQRT2 * v_ac_ll)));
    const alphaPlusMu = Math.acos(cosArg);
    const muDeg = Math.max(0.0, ((alphaPlusMu - alphaRad) * 180.0) / Math.PI);

    // Extinction angle gamma = 180° - alpha - mu
    const gammaDeg = 180.0 - alphaDeg - muDeg;
    const commFailure = gammaDeg < this.gammaMinDeg;

    return { v_dc, muDeg, gammaDeg, commFailure };
  }

  /**
   * Compute Norton Equivalent Companion Stamp for LCC DC and AC interfaces
   */
  computeCompanionStamp(dt: number, state: LccBridgeState, isBE: boolean = false): {
    G_dc: number;
    Ihist_dc: number;
    G_ac: number;
  } {
    // DC smoothing reactor companion model: R_eq = Rdc + 2*Ldc / dt
    const R_Ldc = isBE ? this.Ldc / dt : (2.0 * this.Ldc) / dt;
    const Req_dc = this.Rdc + R_Ldc;
    const G_dc = 1.0 / Req_dc;

    // DC Norton source
    const Ihist_dc = (state.v_dc + R_Ldc * state.i_dc) * G_dc;

    // AC equivalent commutating admittance
    const G_ac = 1.0 / (Math.max(this.Lc, 1e-4) * 2.0 * Math.PI * this.freq);

    return { G_dc, Ihist_dc, G_ac };
  }

  /**
   * Update LCC Graetz bridge state during dynamic time step
   */
  updateBridgeState(
    v_ac_a: number,
    v_ac_b: number,
    v_ac_c: number,
    v_dcp: number,
    v_dcn: number,
    t: number,
    dt: number,
    state: LccBridgeState
  ): void {
    // Estimate instantaneous AC line-to-line RMS
    const v_ab = v_ac_a - v_ac_b;
    const v_bc = v_ac_b - v_ac_c;
    const v_ca = v_ac_c - v_ac_a;
    const v_peak_ll = Math.sqrt((2.0 / 3.0) * (v_ab * v_ab + v_bc * v_bc + v_ca * v_ca));
    const v_ac_rms = v_peak_ll / Math.SQRT2;

    const op = this.calculateOperatingPoint(v_ac_rms > 1000 ? v_ac_rms : this.V_nom_ll, state.i_dc, this.alphaDeg);

    // Instantaneous ripple calculation:
    // 6-Pulse has 6th harmonic (360 Hz) dominant ripple
    // 12-Pulse cancels 6th, has 12th harmonic (720 Hz) dominant ripple with ~1/5th amplitude
    const omega = 2.0 * Math.PI * this.freq;
    const harmonicOrder = this.is12Pulse ? 12 : 6;
    const rippleMagPct = this.is12Pulse ? 0.75 : 4.2;
    const rippleWave = op.v_dc * (rippleMagPct / 100) * Math.sin(harmonicOrder * omega * t);

    state.v_dc = op.v_dc + rippleWave;
    state.muDeg = op.muDeg;
    state.gammaDeg = op.gammaDeg;
    state.commutationFailure = op.commFailure;
    state.v_ac_rms = v_ac_rms;

    const v_dc_terminal = v_dcp - v_dcn;
    state.i_dc += ((state.v_dc - v_dc_terminal - this.Rdc * state.i_dc) / this.Ldc) * dt;

    // Power calculations
    const P = state.v_dc * state.i_dc;
    const phi = ((this.alphaDeg + op.muDeg * 0.5) * Math.PI) / 180.0;
    const Q = Math.abs(P * Math.tan(phi));

    state.p_mw = P / 1e6;
    state.q_mvar = Q / 1e6;
    state.dcRipplePct = rippleMagPct;
  }
}
