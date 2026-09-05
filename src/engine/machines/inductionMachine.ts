/**
 * PSCAD CLONE - Induction Machine Model (SCIM & WRIM) in TypeScript
 * 
 * Supports:
 * - 4th-order state-space induction machine in synchronous d-q frame
 * - Squirrel-Cage (SCIM) and Wound-Rotor (WRIM) types
 * - Direct-on-line (DOL) starting with inrush current and slip-torque curve
 * - EMT Norton companion model interface [G_abc] and history current injection
 */

import type { ComponentParams } from '../../types';

export interface InductionMachineState {
  omega_r_pu: number;      // Rotor speed [pu]
  slip: number;            // Slip s = (1 - omega_r_pu)
  theta_e: number;         // Synchronous frame angle [rad]
  
  // 4th-Order Flux Linkages [pu]
  psi_ds: number;          // Stator d-axis flux
  psi_qs: number;          // Stator q-axis flux
  psi_dr: number;          // Rotor d-axis flux
  psi_qr: number;          // Rotor q-axis flux

  Te_pu: number;           // Electrical torque [pu]
  Tm_load_pu: number;      // Mechanical load torque [pu]

  prevV_abc: [number, number, number];
  prevI_abc: [number, number, number];
}

export class InductionMachine {
  id: string;
  isWoundRotor: boolean;
  Sn_MVA: number;
  Vn_kV: number;
  freq: number;
  omega0: number;

  // Machine parameters [pu]
  Rs: number;              // Stator resistance
  Rr: number;              // Rotor resistance
  Xls: number;             // Stator leakage reactance
  Xlr: number;             // Rotor leakage reactance
  Xm: number;              // Magnetizing reactance
  H: number;               // Inertia constant [s]
  D: number;               // Friction damping

  // Derived
  Xs: number;
  Xr: number;
  X_pp: number;            // Subtransient reactance X'' = Xls + (Xlr * Xm)/(Xlr + Xm)
  V_base_phase: number;
  I_base_phase: number;
  Z_base: number;

  // Stamped Phase Conductance Matrix [G_abc]
  G_abc: number[][];

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.isWoundRotor = params.machineType === 'WRIM';
    this.Sn_MVA = params.Sn_MVA ?? 1.5;   // 1.5 MVA default
    this.Vn_kV = params.Vn_kV ?? 4.16;    // 4.16 kV medium voltage
    this.freq = params.freq ?? 60;
    this.omega0 = 2 * Math.PI * this.freq;

    this.Rs = params.Rs ?? 0.015;
    this.Rr = params.Rr ?? 0.012;
    this.Xls = params.Xls ?? 0.08;
    this.Xlr = params.Xlr ?? 0.08;
    this.Xm = params.Xm ?? 3.50;
    this.H = params.H ?? 1.2;
    this.D = params.D ?? 0.01;

    this.Xs = this.Xls + this.Xm;
    this.Xr = this.Xlr + this.Xm;
    this.X_pp = this.Xls + (this.Xlr * this.Xm) / this.Xr;

    this.V_base_phase = (this.Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3);
    const S_base_phase = (this.Sn_MVA * 1e6) / 3.0;
    this.I_base_phase = (S_base_phase * 2) / this.V_base_phase;
    this.Z_base = (this.Vn_kV * 1000 * this.Vn_kV * 1000) / (this.Sn_MVA * 1e6);

    this.G_abc = Array.from({ length: 3 }, () => Array(3).fill(0));
  }

  initState(): InductionMachineState {
    return {
      omega_r_pu: 0.0,     // Start from locked rotor (DOL start)
      slip: 1.0,
      theta_e: 0.0,
      psi_ds: 0.0,
      psi_qs: 0.0,
      psi_dr: 0.0,
      psi_qr: 0.0,
      Te_pu: 0.0,
      Tm_load_pu: 0.0,
      prevV_abc: [0, 0, 0],
      prevI_abc: [0, 0, 0],
    };
  }

  /**
   * Rebuild Stator Phase Conductance Matrix [G_abc]
   */
  rebuildConductanceMatrix(dt: number): void {
    const L_pp_ohm = (this.X_pp * this.Z_base) / this.omega0;
    const Rs_ohm = this.Rs * this.Z_base;
    const G_eq = dt / (2.0 * L_pp_ohm + Rs_ohm * dt);

    // Symmetric decoupled phase conductances for induction machine
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.G_abc[i][j] = (i === j) ? G_eq : -G_eq * 0.05;
      }
    }
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
   * Compute Norton History Injections into Stator Terminals (a, b, c)
   */
  computeHistoryInjections(_dt: number, state: InductionMachineState): [number, number, number] {
    // Subtransient internal rotor EMF in synchronous frame
    const k_r = this.Xm / this.Xr;
    const ed_pp = -k_r * (this.Rr / this.Xr) * state.psi_dr + k_r * (1.0 - state.omega_r_pu) * state.psi_qr;
    const eq_pp = -k_r * (this.Rr / this.Xr) * state.psi_qr - k_r * (1.0 - state.omega_r_pu) * state.psi_dr;

    const ed_pp_v = ed_pp * this.V_base_phase;
    const eq_pp_v = eq_pp * this.V_base_phase;

    const e_pp_abc = this.inverseParkTransform([ed_pp_v, eq_pp_v, 0], state.theta_e);
    const I_hist_abc: [number, number, number] = [0, 0, 0];

    const prevV = state.prevV_abc || [0, 0, 0];
    const prevI = state.prevI_abc || [0, 0, 0];

    for (let i = 0; i < 3; i++) {
      let sumGV = 0;
      for (let j = 0; j < 3; j++) {
        sumGV += this.G_abc[i][j] * (e_pp_abc[j] + prevV[j]);
      }
      I_hist_abc[i] = -prevI[i] + sumGV;
    }

    return I_hist_abc;
  }

  /**
   * Advance Induction Machine State Equations by 1 time step
   */
  step(v_abc: [number, number, number], i_abc: [number, number, number], dt: number, state: InductionMachineState): void {
    const [vd_v, vq_v, _] = this.parkTransform(v_abc, state.theta_e);

    const vd = vd_v / this.V_base_phase;
    const vq = vq_v / this.V_base_phase;

    const km_r = this.Xm / this.Xr;
    const km_s = this.Xm / this.Xs;
    const sigma_Xr = this.Xlr + (this.Xls * this.Xm) / this.Xs;

    // Flux derivatives function
    const calcDerivs = (pds: number, pqs: number, pdr: number, pqr: number, om_r: number) => {
      const ids = (pds - km_r * pdr) / this.X_pp;
      const iqs = (pqs - km_r * pqr) / this.X_pp;
      const idr = (pdr - km_s * pds) / sigma_Xr;
      const iqr = (pqr - km_s * pqs) / sigma_Xr;

      const dPds = this.omega0 * (vd - this.Rs * ids + pqs);
      const dPqs = this.omega0 * (vq - this.Rs * iqs - pds);

      const s = (1.0 - om_r);
      const dPdr = this.omega0 * (-this.Rr * idr + s * pqr);
      const dPqr = this.omega0 * (-this.Rr * iqr - s * pdr);

      const Te = pds * iqs - pqs * ids;
      const Tm = 0.5 * (om_r * om_r) + 0.05;
      const dOm = (Te - Tm - this.D * om_r) / (2.0 * this.H);

      return { dPds, dPqs, dPdr, dPqr, dOm, Te, Tm, ids, iqs };
    };

    // RK2 (Midpoint / Heun method)
    const k1 = calcDerivs(state.psi_ds, state.psi_qs, state.psi_dr, state.psi_qr, state.omega_r_pu);

    const mid_pds = state.psi_ds + 0.5 * dt * k1.dPds;
    const mid_pqs = state.psi_qs + 0.5 * dt * k1.dPqs;
    const mid_pdr = state.psi_dr + 0.5 * dt * k1.dPdr;
    const mid_pqr = state.psi_qr + 0.5 * dt * k1.dPqr;
    const mid_om  = state.omega_r_pu + 0.5 * dt * k1.dOm;

    const k2 = calcDerivs(mid_pds, mid_pqs, mid_pdr, mid_pqr, mid_om);

    state.psi_ds += k2.dPds * dt;
    state.psi_qs += k2.dPqs * dt;
    state.psi_dr += k2.dPdr * dt;
    state.psi_qr += k2.dPqr * dt;
    state.omega_r_pu += k2.dOm * dt;
    state.omega_r_pu = Math.max(0.0, Math.min(1.2, state.omega_r_pu));
    state.slip = 1.0 - state.omega_r_pu;
    state.Te_pu = k2.Te;
    state.Tm_load_pu = k2.Tm;

    state.theta_e = (state.theta_e + this.omega0 * dt) % (2 * Math.PI);
    state.prevV_abc = [v_abc[0], v_abc[1], v_abc[2]];
    state.prevI_abc = [i_abc[0], i_abc[1], i_abc[2]];
  }
}
