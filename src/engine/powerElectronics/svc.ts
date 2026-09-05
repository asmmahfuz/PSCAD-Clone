/**
 * PSCAD CLONE - Static Var Compensator (SVC) with TCR & TSC Banks (TypeScript)
 * 
 * Supports:
 * - Thyristor-Controlled Reactor (TCR) continuous variable susceptance B_TCR(sigma)
 * - Thyristor-Switched Capacitor (TSC) stepped discrete capacitive banks
 * - Closed-loop bus voltage error PI regulator with slope/droop compensation
 * - Rapid reactive compensation for transmission line voltage stabilization
 */

import type { ComponentParams } from '../../types';

export interface SvcState {
  v_ac_rms: number;       // Measured AC voltage [V]
  v_pu: number;           // Measured AC voltage in pu
  i_svc_rms: number;      // Total SVC current RMS [A]
  q_mvar: number;         // Net reactive power [MVAR] (+ capacitive, - inductive)
  B_svc_total: number;    // Total effective susceptance [S]
  B_tcr: number;          // TCR inductive susceptance [S]
  sigmaDeg: number;       // TCR firing angle [90° to 180°]
  tscBanksActive: number; // Number of currently energized TSC banks
  v_error: number;        // Voltage error [pu]
  int_error: number;      // Integrator state
}

export class StaticVarCompensator {
  id: string;
  V_nom_ll: number;       // Nominal AC line-to-line RMS [V] (e.g. 230 kV)
  Q_cap_max_MVAR: number; // Maximum capacitive rating [MVAR] (e.g. +200 MVAR)
  Q_ind_max_MVAR: number; // Maximum inductive rating [MVAR] (e.g. -100 MVAR)
  freq: number;           // Grid frequency [Hz]
  droop_pu: number;       // Slope / Droop characteristic (e.g. 0.03 pu / 3%)
  num_tsc: number;        // Number of TSC banks (e.g. 2 banks)
  L_tcr: number;          // TCR reactor inductance [H]
  C_tsc: number;          // Per-bank TSC capacitance [F]

  // PI Controller gains
  Kp: number;
  Ki: number;

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.V_nom_ll = params.V_ac_nom ?? params.voltage ?? 230000;
    this.Q_cap_max_MVAR = params.Q_rating_MVAR ?? 200.0;
    this.Q_ind_max_MVAR = 100.0;
    this.freq = params.freq ?? 60;
    this.droop_pu = 0.03; // 3% slope
    this.num_tsc = params.num_tsc_banks ?? 2;

    const omega = 2.0 * Math.PI * this.freq;
    const V_base = this.V_nom_ll;

    // Sizing TCR and TSC components
    const Q_tcr_rated = (this.Q_ind_max_MVAR + (this.Q_cap_max_MVAR / this.num_tsc)) * 1e6;
    this.L_tcr = (V_base * V_base) / (omega * Q_tcr_rated);

    const Q_per_tsc = (this.Q_cap_max_MVAR * 1e6) / this.num_tsc;
    this.C_tsc = Q_per_tsc / (omega * V_base * V_base);

    this.Kp = params.Kp ?? 1.5;
    this.Ki = params.Ki ?? 30.0;
  }

  initState(): SvcState {
    return {
      v_ac_rms: this.V_nom_ll,
      v_pu: 1.0,
      i_svc_rms: 0.0,
      q_mvar: 0.0,
      B_svc_total: 0.0,
      B_tcr: 0.0,
      sigmaDeg: 180.0, // TCR fully blocked
      tscBanksActive: 0,
      v_error: 0.0,
      int_error: 0.0,
    };
  }

  /**
   * Calculate TCR Susceptance B_tcr as a function of firing angle sigma in [90°, 180°]
   * B_tcr(sigma) = (2*(pi - sigma) + sin(2*sigma)) / (pi * omega * L_tcr)
   */
  computeTcrSusceptance(sigmaDeg: number): number {
    const sigma = (Math.max(90.0, Math.min(180.0, sigmaDeg)) * Math.PI) / 180.0;
    const omega = 2.0 * Math.PI * this.freq;
    const B_max = 1.0 / (omega * this.L_tcr);

    const conductionFactor = (2.0 * (Math.PI - sigma) + Math.sin(2.0 * sigma)) / Math.PI;
    return B_max * Math.max(0.0, Math.min(1.0, conductionFactor));
  }

  /**
   * Inverse calculation: Given desired TCR susceptance B, find firing angle sigma
   */
  computeFiringAngle(B_desired: number): number {
    const omega = 2.0 * Math.PI * this.freq;
    const B_max = 1.0 / (omega * this.L_tcr);
    const ratio = Math.max(0.0, Math.min(1.0, B_desired / B_max));

    // Fast approximation of inverse function
    // For ratio in [0, 1], sigma ranges from 180° down to 90°
    const sigma = 180.0 - 90.0 * Math.pow(ratio, 0.65);
    return Math.max(90.0, Math.min(180.0, sigma));
  }

  /**
   * Execute Voltage Regulator & Susceptance Coordination Control
   */
  executeControl(
    v_a: number,
    v_b: number,
    v_c: number,
    _t: number,
    dt: number,
    state: SvcState,
    V_ref_pu: number = 1.0
  ): { G_svc: number; B_svc: number } {
    const omega = 2.0 * Math.PI * this.freq;
    const v_rms_ll = Math.sqrt((v_a * v_a + v_b * v_b + v_c * v_c) / 3.0) * Math.sqrt(3);
    const v_pu = v_rms_ll / this.V_nom_ll;

    state.v_ac_rms = v_rms_ll;
    state.v_pu = v_pu;

    // 1. Voltage error calculation with droop
    const I_svc_pu = state.i_svc_rms / ((this.Q_cap_max_MVAR * 1e6) / (Math.sqrt(3) * this.V_nom_ll));
    const V_meas_droop = v_pu - this.droop_pu * I_svc_pu;
    const err = V_ref_pu - V_meas_droop;
    state.v_error = err;

    // 2. PI Regulator
    state.int_error += err * dt;
    const B_base = (this.Q_cap_max_MVAR * 1e6) / (this.V_nom_ll * this.V_nom_ll);
    const B_target = Math.max(
      -this.Q_ind_max_MVAR / this.Q_cap_max_MVAR * B_base,
      Math.min(B_base, this.Kp * err * B_base + this.Ki * state.int_error * B_base)
    );

    // 3. Coordination between TSC banks and TCR
    const B_tsc_per_bank = omega * this.C_tsc;

    let activeTsc = 0;
    let B_tcr_req = 0;

    if (B_target > 0) {
      // Net Capacitive needed
      activeTsc = Math.min(this.num_tsc, Math.ceil(B_target / B_tsc_per_bank));
      const B_tsc_current = activeTsc * B_tsc_per_bank;
      B_tcr_req = Math.max(0.0, B_tsc_current - B_target);
    } else {
      // Net Inductive needed: All TSC banks OFF, TCR provides full inductance
      activeTsc = 0;
      B_tcr_req = Math.abs(B_target);
    }

    state.tscBanksActive = activeTsc;
    state.sigmaDeg = this.computeFiringAngle(B_tcr_req);
    state.B_tcr = this.computeTcrSusceptance(state.sigmaDeg);

    // Total net susceptance: B_total = B_tsc - B_tcr
    state.B_svc_total = (activeTsc * B_tsc_per_bank) - state.B_tcr;

    // Telemetry: Q = V^2 * B
    state.q_mvar = (v_rms_ll * v_rms_ll * state.B_svc_total) / 1e6;
    state.i_svc_rms = Math.abs(state.B_svc_total) * (v_rms_ll / Math.sqrt(3));

    // Parallel damping conductance for numerical stability
    const G_svc = 1e-5;
    const B_svc = state.B_svc_total;

    return { G_svc, B_svc };
  }
}
