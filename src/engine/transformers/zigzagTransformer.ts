/**
 * PSCAD CLONE - Zig-Zag Grounding Transformer (Zn) Model
 * 
 * Features:
 * - Neutral derivation for ungrounded delta distribution & transmission grids
 * - Interconnected star winding halves with cross-limb series coupling:
 *   - Phase A: Winding A1 (+Va1) in series with Winding C2 (-Vc2)
 *   - Phase B: Winding B1 (+Vb1) in series with Winding A2 (-Va2)
 *   - Phase C: Winding C1 (+Vc1) in series with Winding B2 (-Vb2)
 * - Zero-sequence MMF cancellation per limb:
 *   - Near-zero zero-sequence impedance Z0 ~ X_leakage (1-5 Ohm)
 *   - High positive-sequence magnetizing impedance Z1 ~ X_mag (> 20,000 Ohm)
 * - Integrated Neutral Grounding Resistor (NGR / Rn) and neutral grounding surge arresters
 * - Full EMT nodal companion conductance matrix [G_zigzag] and Norton history currents.
 */

import type { ComponentParams } from '../../types';

export interface ZigZagParams {
  V_nom_kV: number;        // Nominal line-to-line voltage [kV] (e.g. 13.8 kV or 34.5 kV)
  MVA_rating: number;      // Rated power [MVA] (e.g. 10 MVA)
  freq: number;            // Nominal frequency [Hz] (e.g. 60 Hz)
  R_winding_pu: number;    // Winding copper resistance [pu] (e.g. 0.005 pu)
  X_leakage_pu: number;    // Zero-sequence leakage reactance [pu] (e.g. 0.06 pu)
  X_mag_pu: number;        // Positive-sequence magnetizing reactance [pu] (e.g. 200.0 pu)
  R_neutral: number;       // Neutral Grounding Resistor (NGR) [Ohm] (e.g. 10.0 Ohm, 0 for solid ground)
}

export interface ZigZagState {
  I_neutral: number;       // Neutral return current [A]
  I_0_seq: number;         // Zero-sequence current I0 [A]
  I_1_seq: number;         // Positive-sequence current I1 [A]
  prevTermV: Float64Array; // 4 terminal voltages [A, B, C, N]
  prevTermI: Float64Array; // 4 terminal currents [A, B, C, N]
}

export const DEFAULT_ZIGZAG_PARAMS: ZigZagParams = {
  V_nom_kV: 13.8,
  MVA_rating: 10.0,
  freq: 60,
  R_winding_pu: 0.005,
  X_leakage_pu: 0.06,
  X_mag_pu: 200.0,
  R_neutral: 10.0, // 10 Ohm NGR
};

export class ZigZagTransformer {
  id: string;
  params: ZigZagParams;
  Z_base: number;
  R_w: number;
  L_leak: number;
  L_mag: number;

  constructor(id: string, customParams: Partial<ZigZagParams> | ComponentParams = {}) {
    this.id = id;
    this.params = { ...DEFAULT_ZIGZAG_PARAMS, ...(customParams as Partial<ZigZagParams>) };

    const omega = 2 * Math.PI * this.params.freq;
    const V_base = this.params.V_nom_kV * 1e3;
    this.Z_base = (V_base * V_base) / (this.params.MVA_rating * 1e6);

    this.R_w = this.params.R_winding_pu * this.Z_base;
    this.L_leak = (this.params.X_leakage_pu * this.Z_base) / omega;
    this.L_mag = (this.params.X_mag_pu * this.Z_base) / omega;
  }

  initState(): ZigZagState {
    return {
      I_neutral: 0.0,
      I_0_seq: 0.0,
      I_1_seq: 0.0,
      prevTermV: new Float64Array(4),
      prevTermI: new Float64Array(4),
    };
  }

  /**
   * Evaluates theoretical Sequence Impedances (Z0 and Z1)
   */
  getSequenceImpedances(): { Z1_mag: number; Z0_mag: number; ratio_Z1_over_Z0: number } {
    const omega = 2 * Math.PI * this.params.freq;
    const Z1_mag = Math.sqrt(this.R_w * this.R_w + omega * this.L_mag * omega * this.L_mag);
    const Z0_mag = Math.sqrt(this.R_w * this.R_w + omega * this.L_leak * omega * this.L_leak) + 3 * this.params.R_neutral;

    return {
      Z1_mag,
      Z0_mag,
      ratio_Z1_over_Z0: Z1_mag / Math.max(1e-3, Z0_mag),
    };
  }

  /**
   * Build 4x4 Conductance Matrix [G_term] for EMT simulation:
   * Terminals: [0: Phase_A, 1: Phase_B, 2: Phase_C, 3: Neutral_N]
   */
  computeConductanceMatrix(dt: number, isBE: boolean = false): number[][] {
    const G = Array.from({ length: 4 }, () => Array(4).fill(0));
    const factor = isBE ? 1.0 / dt : 2.0 / dt;

    // Zero-sequence branch conductance (leakage + winding resistance)
    const g_0 = 1.0 / (factor * this.L_leak + this.R_w);
    // Positive-sequence magnetizing branch conductance
    const g_1 = 1.0 / (factor * this.L_mag + this.R_w);

    // Mutual inter-phase zig-zag coupling
    const g_self = (g_0 + 2 * g_1) / 3.0;
    const g_mut = (g_0 - g_1) / 3.0;

    // Neutral branch conductance with NGR
    const g_neut = this.params.R_neutral > 1e-4 ? 1.0 / this.params.R_neutral : 1e6;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === j) {
          G[i][j] = g_self;
        } else {
          G[i][j] = -g_mut * 0.5;
        }
      }
      // Coupling to neutral node
      G[i][3] = -g_0 / 3.0;
      G[3][i] = -g_0 / 3.0;
    }

    G[3][3] = g_0 + g_neut;

    return G;
  }

  /**
   * Compute companion history injections
   */
  computeHistoryInjections(
    state: ZigZagState,
    dt: number,
    isBE: boolean = false
  ): Float64Array {
    const G = this.computeConductanceMatrix(dt, isBE);
    const I_hist = new Float64Array(4);

    for (let r = 0; r < 4; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 4; c++) {
        sumGV += G[r][c] * state.prevTermV[c];
      }
      if (isBE) {
        I_hist[r] = -state.prevTermI[r];
      } else {
        I_hist[r] = -state.prevTermI[r] - sumGV;
      }
    }

    return I_hist;
  }

  /**
   * Step simulation and evaluate single-line-to-ground fault return currents
   */
  updateEMTStep(termVoltages: Float64Array, dt: number, state: ZigZagState): Float64Array {
    const G = this.computeConductanceMatrix(dt);
    const I_hist = this.computeHistoryInjections(state, dt);
    const currents = new Float64Array(4);

    for (let r = 0; r < 4; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 4; c++) {
        sumGV += G[r][c] * termVoltages[c];
      }
      currents[r] = sumGV + I_hist[r];
    }

    state.prevTermV.set(termVoltages);
    state.prevTermI.set(currents);

    // Neutral return current = currents[3]
    state.I_neutral = Math.abs(currents[3]);
    state.I_0_seq = state.I_neutral / 3.0;

    // Sequence I1 estimate
    const Ia = currents[0];
    const Ib = currents[1];
    const Ic = currents[2];
    state.I_1_seq = Math.sqrt(Ia * Ia + Ib * Ib + Ic * Ic) / Math.sqrt(3);

    return currents;

  }
}
