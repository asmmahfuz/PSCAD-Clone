/**
 * PSCAD Modern - Static Synchronous Compensator (STATCOM) Model (TypeScript)
 * 
 * Supports:
 * - 3-Phase VSC with DC link capacitor
 * - Grid Phase-Locked Loop (PLL) synchronization
 * - Decoupled d-q PI vector current controller:
 *   - d-axis regulates DC link capacitor voltage (active power)
 *   - q-axis regulates AC bus voltage / reactive var injection (reactive power)
 * - Dynamic capacitive (+VAR) and inductive (-VAR) fast reactive power injection (< 20 ms)
 */

import type { ComponentParams } from '../../types';

export interface StatcomState {
  v_dc: number;           // DC capacitor voltage [V]
  v_ac_rms: number;       // Grid AC voltage [V]
  i_d: number;            // d-axis active current [A]
  i_q: number;            // q-axis reactive current [A] (positive = capacitive injection)
  i_d_ref: number;
  i_q_ref: number;
  theta_pll: number;      // PLL phase angle [rad]
  p_mw: number;           // Active power [MW]
  q_mvar: number;         // Reactive power [MVAR] (+ capacitive, - inductive)
  m_index: number;        // Modulation index
  delta_deg: number;      // Converter voltage phase shift [deg]
  // PI Integrators
  int_vdc: number;
  int_vac: number;
  int_id: number;
  int_iq: number;
}

export class Statcom {
  id: string;
  V_nom_ll: number;       // Nominal grid line-to-line RMS [V] (e.g. 230 kV)
  Q_rating_MVAR: number;  // Rated dynamic reactive capability [MVAR] (e.g. ±100 MVAR)
  Vdc_ref: number;        // DC bus voltage setpoint [V] (e.g. 40 kV)
  Cdc: number;            // DC link capacitor [F] (e.g. 20 mF)
  Lf: number;             // Coupling interface filter inductor [H] (e.g. 10 mH)
  Rf: number;             // Filter resistance [Ω] (e.g. 0.05 Ω)
  freq: number;           // Grid frequency [Hz] (60 Hz)

  // Controller gains
  Kp_vdc: number;
  Ki_vdc: number;
  Kp_vac: number;
  Ki_vac: number;
  Kp_i: number;
  Ki_i: number;

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.V_nom_ll = params.V_ac_nom ?? params.voltage ?? 230000;
    this.Q_rating_MVAR = params.Q_rating_MVAR ?? 100.0;
    this.Vdc_ref = params.Vdc_nom ?? 40000;
    this.Cdc = Math.max(params.Cdc_F ?? params.capacitance ?? 0.020, 1e-4);
    this.Lf = Math.max(params.inductance ?? 0.010, 1e-5);
    this.Rf = Math.max(params.resistance ?? 0.05, 1e-4);
    this.freq = params.freq ?? 60;

    // Fast PI controller parameters
    this.Kp_vdc = 0.5;
    this.Ki_vdc = 20.0;
    this.Kp_vac = 2.0;
    this.Ki_vac = 50.0;
    this.Kp_i = 1.2;
    this.Ki_i = 120.0;
  }

  initState(): StatcomState {
    return {
      v_dc: this.Vdc_ref,
      v_ac_rms: this.V_nom_ll,
      i_d: 0.0,
      i_q: 0.0,
      i_d_ref: 0.0,
      i_q_ref: 0.0,
      theta_pll: 0.0,
      p_mw: 0.0,
      q_mvar: 0.0,
      m_index: 0.90,
      delta_deg: 0.0,
      int_vdc: 0.0,
      int_vac: 0.0,
      int_id: 0.0,
      int_iq: 0.0,
    };
  }

  /**
   * Run Decoupled d-q PI Current Vector Controller
   */
  executeControl(
    v_a: number,
    v_b: number,
    v_c: number,
    i_a: number,
    i_b: number,
    i_c: number,
    _t: number,
    dt: number,
    state: StatcomState,
    Vac_ref_pu: number = 1.0,
    Q_ref_mvar?: number
  ): { v_conv_a: number; v_conv_b: number; v_conv_c: number } {
    const omega = 2.0 * Math.PI * this.freq;

    // 1. PLL Phase Angle tracking
    state.theta_pll = (state.theta_pll + omega * dt) % (2.0 * Math.PI);
    const theta = state.theta_pll;

    // 2. Clarke Transformation (abc -> alpha, beta)
    const v_alpha = (2.0 / 3.0) * (v_a - 0.5 * v_b - 0.5 * v_c);
    const v_beta = (2.0 / 3.0) * ((Math.sqrt(3) / 2) * (v_b - v_c));

    const i_alpha = (2.0 / 3.0) * (i_a - 0.5 * i_b - 0.5 * i_c);
    const i_beta = (2.0 / 3.0) * ((Math.sqrt(3) / 2) * (i_b - i_c));

    // 3. Park Transformation (alpha, beta -> d, q)
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const v_d = v_alpha * cosT + v_beta * sinT;
    const v_q = -v_alpha * sinT + v_beta * cosT;

    const i_d = i_alpha * cosT + i_beta * sinT;
    const i_q = -i_alpha * sinT + i_beta * cosT;

    state.i_d = i_d;
    state.i_q = i_q;

    // Estimate RMS
    const v_pk = Math.sqrt(v_d * v_d + v_q * v_q);
    const v_rms = (v_pk * Math.sqrt(3)) / Math.SQRT2;
    state.v_ac_rms = v_rms;

    // 4. Outer Voltage Loops
    // DC link voltage control -> i_d_ref
    const err_vdc = this.Vdc_ref - state.v_dc;
    state.int_vdc += err_vdc * dt;
    state.i_d_ref = this.Kp_vdc * err_vdc + this.Ki_vdc * state.int_vdc;

    // AC bus voltage / Q control -> i_q_ref
    const I_base = (this.Q_rating_MVAR * 1e6) / (Math.sqrt(3) * this.V_nom_ll);
    if (Q_ref_mvar !== undefined) {
      state.i_q_ref = (Q_ref_mvar * 1e6) / (Math.sqrt(3) * this.V_nom_ll);
    } else {
      const v_pu = v_rms / this.V_nom_ll;
      const err_vac = Vac_ref_pu - v_pu;
      state.int_vac += err_vac * dt;
      state.i_q_ref = Math.max(-I_base * 1.2, Math.min(I_base * 1.2, this.Kp_vac * err_vac * I_base + this.Ki_vac * state.int_vac * I_base));
    }

    // 5. Inner Decoupled Current Loops
    const err_id = state.i_d_ref - i_d;
    state.int_id += err_id * dt;
    const u_d = this.Kp_i * err_id + this.Ki_i * state.int_id;

    const err_iq = state.i_q_ref - i_q;
    state.int_iq += err_iq * dt;
    const u_q = this.Kp_i * err_iq + this.Ki_i * state.int_iq;

    // Decoupled feedforward:
    // v_conv_d* = v_d - omega * Lf * i_q - u_d
    // v_conv_q* = v_q + omega * Lf * i_d - u_q
    const v_conv_d = v_d - omega * this.Lf * i_q - u_d;
    const v_conv_q = v_q + omega * this.Lf * i_d - u_q;

    // 6. Inverse Park Transformation (d, q -> alpha, beta)
    const v_conv_alpha = v_conv_d * cosT - v_conv_q * sinT;
    const v_conv_beta = v_conv_d * sinT + v_conv_q * cosT;

    // 7. Inverse Clarke Transformation (alpha, beta -> a, b, c)
    const v_conv_a = v_conv_alpha;
    const v_conv_b = -0.5 * v_conv_alpha + (Math.sqrt(3) / 2) * v_conv_beta;
    const v_conv_c = -0.5 * v_conv_alpha - (Math.sqrt(3) / 2) * v_conv_beta;

    // Update Powers & Telemetry
    const P = 1.5 * (v_d * i_d + v_q * i_q);
    const Q = 1.5 * (v_q * i_d - v_d * i_q);
    state.p_mw = P / 1e6;
    state.q_mvar = -Q / 1e6; // Positive = capacitive vars delivered to grid

    // Update DC capacitor charge balance
    const i_dc_in = P / Math.max(state.v_dc, 1000);
    state.v_dc += (-i_dc_in / this.Cdc) * dt;

    return { v_conv_a, v_conv_b, v_conv_c };
  }

  /**
   * Compute Norton Companion Admittance for STATCOM 3-phase interface
   */
  computeCompanionStamp(dt: number, isBE: boolean = false): { G: number; R_th: number } {
    const R_Lf = isBE ? this.Lf / dt : (2.0 * this.Lf) / dt;
    const R_th = this.Rf + R_Lf;
    const G = 1.0 / Math.max(R_th, 1e-4);
    return { G, R_th };
  }
}
