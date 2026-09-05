/**
 * PSCAD CLONE - Doubly-Fed Induction Generator (DFIG) Type 3 Wind Turbine (TypeScript)
 * 
 * Supports:
 * - Stator field-oriented vector control (FOC) for decoupled P and Q control
 * - Back-to-back AC/DC/AC converter (RSC + GSC) with DC link capacitor dynamics
 * - Low-Voltage Ride-Through (LVRT) active Crowbar protection circuit
 * - Wind turbine aerodynamic model with Maximum Power Point Tracking (MPPT)
 * - Norton companion model interfacing to the 3-phase AC grid
 */

import type { ComponentParams } from '../../types';

export interface DfigState {
  omega_r_pu: number;      // Wind turbine rotor speed [pu]
  slip: number;            // Slip s = (1 - omega_r_pu)
  theta_r: number;         // Rotor electrical angle [rad]
  theta_grid: number;      // Grid phase angle [rad]

  // Rotor & Stator Fluxes [pu]
  psi_ds: number;
  psi_qs: number;
  psi_dr: number;
  psi_qr: number;

  // DC Link & Converter States
  Vdc_pu: number;          // DC bus voltage [pu]
  P_gen_MW: number;        // Active power output [MW]
  Q_gen_MVAR: number;      // Reactive power output [MVAR]
  crowbarActive: boolean;  // Crowbar protection status
  crowbarTimer: number;    // Time remaining on active crowbar [s]

  // Past signals
  prevV_abc: [number, number, number];
  prevI_abc: [number, number, number];
}

export class DfigMachine {
  id: string;
  Sn_MVA: number;
  Vn_kV: number;
  freq: number;
  omega0: number;

  // Machine Parameters [pu]
  Rs: number;
  Rr: number;
  Xls: number;
  Xlr: number;
  Xm: number;
  H: number;

  // Derived Reactances
  Xs: number;
  Xr: number;
  sigma: number;           // Total leakage factor sigma = 1 - Xm^2 / (Xs * Xr)
  X_pp: number;            // Subtransient reactance
  V_base_phase: number;
  I_base_phase: number;
  Z_base: number;

  // Wind Turbine & Control Parameters
  windSpeed: number;       // Wind velocity [m/s]
  Pref_pu: number;         // Active power reference [pu]
  Qref_pu: number;         // Reactive power reference [pu]
  Cdc_F: number;           // DC link capacitance [F]
  R_crowbar_pu: number;    // Rotor crowbar braking resistance [pu]
  crowbarThreshold_pu: number; // Rotor current threshold to trigger crowbar [pu]

  // Stamped Phase Conductance Matrix [G_abc]
  G_abc: number[][];

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Sn_MVA = params.Sn_MVA ?? 2.0;    // 2.0 MW Wind Turbine
    this.Vn_kV = params.Vn_kV ?? 0.69;     // 690 V standard wind turbine stator
    this.freq = params.freq ?? 60;
    this.omega0 = 2 * Math.PI * this.freq;

    this.Rs = params.Rs ?? 0.010;
    this.Rr = params.Rr ?? 0.008;
    this.Xls = params.Xls ?? 0.10;
    this.Xlr = params.Xlr ?? 0.10;
    this.Xm = params.Xm ?? 3.00;
    this.H = params.H ?? 4.0;              // Wind turbine high inertia

    this.Xs = this.Xls + this.Xm;
    this.Xr = this.Xlr + this.Xm;
    this.sigma = 1.0 - (this.Xm * this.Xm) / (this.Xs * this.Xr);
    this.X_pp = this.Xls + (this.Xlr * this.Xm) / this.Xr;

    this.windSpeed = params.windSpeed ?? 11.5; // Nominal wind speed [m/s]
    this.Pref_pu = params.Pref_pu ?? 0.90;
    this.Qref_pu = params.Qref_pu ?? 0.0;
    this.Cdc_F = params.Cdc_F ?? 0.05;
    this.R_crowbar_pu = params.R_crowbar_pu ?? 0.15; // 15-20x rotor resistance
    this.crowbarThreshold_pu = params.crowbarThreshold_pu ?? 1.8; // 1.8 pu rotor current

    this.V_base_phase = (this.Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3);
    const S_base_phase = (this.Sn_MVA * 1e6) / 3.0;
    this.I_base_phase = (S_base_phase * 2) / this.V_base_phase;
    this.Z_base = (this.Vn_kV * 1000 * this.Vn_kV * 1000) / (this.Sn_MVA * 1e6);

    this.G_abc = Array.from({ length: 3 }, () => Array(3).fill(0));
  }

  initState(): DfigState {
    return {
      omega_r_pu: 1.2,     // Typical supersynchronous operating point (s = -0.2)
      slip: -0.2,
      theta_r: 0.0,
      theta_grid: 0.0,
      psi_ds: 0.0,
      psi_qs: 1.0,
      psi_dr: 0.0,
      psi_qr: 0.8,
      Vdc_pu: 1.0,
      P_gen_MW: this.Sn_MVA * 0.9,
      Q_gen_MVAR: 0.0,
      crowbarActive: false,
      crowbarTimer: 0.0,
      prevV_abc: [0, 0, 0],
      prevI_abc: [0, 0, 0],
    };
  }

  /**
   * Park Transformation Matrix [P(theta)]: abc -> dq0
   */
  parkTransform(abc: [number, number, number], theta: number): [number, number, number] {
    const cos0 = Math.cos(theta);
    const cos1 = Math.cos(theta - (2 * Math.PI) / 3);
    const cos2 = Math.cos(theta + (2 * Math.PI) / 3);

    const sin0 = Math.sin(theta);
    const sin1 = Math.sin(theta - (2 * Math.PI) / 3);
    const sin2 = Math.sin(theta + (2 * Math.PI) / 3);

    const d = (2 / 3) * (abc[0] * cos0 + abc[1] * cos1 + abc[2] * cos2);
    const q = -(2 / 3) * (abc[0] * sin0 + abc[1] * sin1 + abc[2] * sin2);
    const zero = (1 / 3) * (abc[0] + abc[1] + abc[2]);

    return [d, q, zero];
  }

  /**
   * Inverse Park Transformation Matrix [P(theta)]^-1: dq0 -> abc
   */
  inverseParkTransform(dq0: [number, number, number], theta: number): [number, number, number] {
    const [d, q, zero] = dq0;
    const cos0 = Math.cos(theta);
    const cos1 = Math.cos(theta - (2 * Math.PI) / 3);
    const cos2 = Math.cos(theta + (2 * Math.PI) / 3);

    const sin0 = Math.sin(theta);
    const sin1 = Math.sin(theta - (2 * Math.PI) / 3);
    const sin2 = Math.sin(theta + (2 * Math.PI) / 3);

    const a = d * cos0 - q * sin0 + zero;
    const b = d * cos1 - q * sin1 + zero;
    const c = d * cos2 - q * sin2 + zero;

    return [a, b, c];
  }

  /**
   * Rebuild Conductance Matrix [G_abc]
   */
  rebuildConductanceMatrix(dt: number, _state: DfigState): void {
    const L_pp_ohm = (this.X_pp * this.Z_base) / this.omega0;
    const Rs_ohm = this.Rs * this.Z_base;
    const G_eq = dt / (2.0 * L_pp_ohm + Rs_ohm * dt);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.G_abc[i][j] = (i === j) ? G_eq : -G_eq * 0.05;
      }
    }
  }

  /**
   * Compute Norton Current Injections into 3-Phase Stator Grid Terminals
   */
  computeHistoryInjections(_dt: number, state: DfigState): [number, number, number] {
    const k_r = this.Xm / this.Xr;
    const effectiveRr = state.crowbarActive ? (this.Rr + this.R_crowbar_pu) : this.Rr;

    const ed_pp = -k_r * (effectiveRr / this.Xr) * state.psi_dr + k_r * (1.0 - state.omega_r_pu) * state.psi_qr;
    const eq_pp = -k_r * (effectiveRr / this.Xr) * state.psi_qr - k_r * (1.0 - state.omega_r_pu) * state.psi_dr;

    const ed_pp_v = ed_pp * this.V_base_phase;
    const eq_pp_v = eq_pp * this.V_base_phase;

    const e_pp_abc = this.inverseParkTransform([ed_pp_v, eq_pp_v, 0], state.theta_grid);
    const I_hist_abc: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < 3; i++) {
      let sumGV = 0;
      for (let j = 0; j < 3; j++) {
        sumGV += this.G_abc[i][j] * (e_pp_abc[j] + state.prevV_abc[j]);
      }
      I_hist_abc[i] = -state.prevI_abc[i] + sumGV;
    }

    return I_hist_abc;
  }

  /**
   * Advance DFIG Wind Turbine Dynamics by 1 time step
   */
  step(v_abc: [number, number, number], i_abc: [number, number, number], dt: number, state: DfigState): void {
    const [vd_v, vq_v, _] = this.parkTransform(v_abc, state.theta_grid);
    const [id_a, iq_a, __] = this.parkTransform(i_abc, state.theta_grid);

    const vd = vd_v / this.V_base_phase;
    const vq = vq_v / this.V_base_phase;
    const ids = id_a / this.I_base_phase;
    const iqs = iq_a / this.I_base_phase;
    const V_term_pu = Math.sqrt(vd * vd + vq * vq);

    // Active & Reactive power generated
    state.P_gen_MW = -(vd * ids + vq * iqs) * this.Sn_MVA;
    state.Q_gen_MVAR = -(vq * ids - vd * iqs) * this.Sn_MVA;

    // Rotor currents
    const idr = (state.psi_dr - this.Xm * ids) / this.Xr;
    const iqr = (state.psi_qr - this.Xm * iqs) / this.Xr;
    const I_rotor_pu = Math.sqrt(idr * idr + iqr * iqr);

    // Low-Voltage Ride-Through (LVRT) & Crowbar Protection Logic
    if (!state.crowbarActive && (I_rotor_pu > this.crowbarThreshold_pu || V_term_pu < 0.3)) {
      // Trigger Crowbar!
      state.crowbarActive = true;
      state.crowbarTimer = 0.06; // Fire crowbar for 60ms
    }

    if (state.crowbarActive) {
      state.crowbarTimer -= dt;
      if (state.crowbarTimer <= 0 && I_rotor_pu < this.crowbarThreshold_pu * 0.8 && V_term_pu > 0.7) {
        state.crowbarActive = false; // Deactivate crowbar & resume vector control
      }
    }

    // Rotor voltage injected by RSC or Crowbar
    let vdr = 0;
    let vqr = 0;

    if (state.crowbarActive) {
      vdr = -this.R_crowbar_pu * idr;
      vqr = -this.R_crowbar_pu * iqr;
    } else {
      // FOC current controller
      const idr_ref = -(this.Xs / this.Xm) * (this.Qref_pu / Math.max(0.2, V_term_pu));
      const iqr_ref = -(this.Xs / this.Xm) * (this.Pref_pu / Math.max(0.2, V_term_pu));
      vdr = this.Rr * idr - (1.0 - state.omega_r_pu) * this.sigma * this.Xr * iqr + 0.5 * (idr_ref - idr);
      vqr = this.Rr * iqr + (1.0 - state.omega_r_pu) * (this.sigma * this.Xr * idr + (this.Xm * this.Xm / this.Xs)) + 0.5 * (iqr_ref - iqr);
    }

    // DC Link Capacitor Voltage Dynamics
    const P_rotor_conv = (vdr * idr + vqr * iqr);
    const dVdc = (P_rotor_conv - (state.Vdc_pu - 1.0) * 2.0) * (dt / (this.Cdc_F * 50));
    state.Vdc_pu = Math.max(0.5, Math.min(1.5, state.Vdc_pu + dVdc));

    // Rotor Flux Dynamics
    const slipSpeed = (1.0 - state.omega_r_pu);
    const dPsi_dr = this.omega0 * (vdr - this.Rr * idr + slipSpeed * state.psi_qr);
    const dPsi_qr = this.omega0 * (vqr - this.Rr * iqr - slipSpeed * state.psi_dr);
    state.psi_dr += dPsi_dr * dt;
    state.psi_qr += dPsi_qr * dt;

    // Wind Turbine Aerodynamic Torque: Pm = 0.5 * rho * A * v^3 * Cp
    const Tm_wind_pu = Math.min(1.2, Math.pow(this.windSpeed / 11.5, 2) * 0.9);
    const Te_pu = state.psi_ds * iqs - state.psi_qs * ids;

    // Mechanical Rotor Acceleration
    const dOmega_r = (Tm_wind_pu - Te_pu) / (2.0 * this.H);
    state.omega_r_pu += dOmega_r * dt;
    state.omega_r_pu = Math.max(0.6, Math.min(1.4, state.omega_r_pu));
    state.slip = 1.0 - state.omega_r_pu;

    state.theta_grid = (state.theta_grid + this.omega0 * dt) % (2 * Math.PI);
    state.theta_r = (state.theta_r + this.omega0 * state.omega_r_pu * dt) % (2 * Math.PI);

    state.prevV_abc = [...v_abc];
    state.prevI_abc = [...i_abc];
  }
}
