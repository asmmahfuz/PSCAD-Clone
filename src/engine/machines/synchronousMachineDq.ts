/**
 * PSCAD CLONE - Full 6th-Order Park d-q-0 Synchronous Machine Model (TypeScript)
 * 
 * Supports:
 * - 6th-order state-space machine dynamics (field winding, 1 d-axis damper, 2 q-axis dampers)
 * - Subtransient (Xd'', Xq'', Td0'', Tq0'') and Transient (Xd', Xq', Td0', Tq0') parameters
 * - Dynamic Park transformation [P(theta)] between phase coordinates (a, b, c) and rotor (d, q, 0)
 * - Norton companion model conductance matrix [G_abc] and history current injections
 * - IEEE Type 1 / ST1A Excitation System (AVR) & Speed Governor
 * - Coupled multi-mass torsional shaft option for SSR studies
 */

import type { ComponentParams } from '../../types';
import { MultiMassShaft, type MultiMassState } from './multiMassShaft';

export interface SyncMachineDqState {
  // Rotor and mechanical states
  delta: number;           // Rotor angle [rad]
  omega_pu: number;        // Rotor electrical speed [pu]
  theta_e: number;         // Electrical angle [rad] = delta + omega0 * t

  // 6th-Order Flux Linkages & Internal Voltages [pu]
  Ed_prime: number;        // Transient d-axis EMF
  Eq_prime: number;        // Transient q-axis EMF
  Ed_pp: number;           // Subtransient d-axis EMF
  Eq_pp: number;           // Subtransient q-axis EMF
  psi_1d: number;          // d-axis damper flux
  psi_2q: number;          // q-axis damper flux 2

  // Control states
  Vf: number;              // Field voltage [pu]
  Tm_pu: number;           // Mechanical turbine torque [pu]
  Te_pu: number;           // Electrical air-gap torque [pu]

  // Past terminal currents & voltages in (a, b, c)
  prevV_abc: [number, number, number];
  prevI_abc: [number, number, number];

  // Optional multi-mass shaft state
  shaftState?: MultiMassState;
}

export class SynchronousMachineDq {
  id: string;
  Sn_MVA: number;
  Vn_kV: number;
  freq: number;
  omega0: number;
  
  // Reactances [pu]
  Xd: number;
  Xq: number;
  Xd_prime: number;
  Xq_prime: number;
  Xd_pp: number;
  Xq_pp: number;
  Xl: number;              // Stator leakage reactance
  Ra: number;              // Stator resistance

  // Time constants [s]
  Td0_prime: number;
  Tq0_prime: number;
  Td0_pp: number;
  Tq0_pp: number;

  // Inertia & Damping
  H: number;               // Machine inertia constant [s]
  D: number;               // Damping factor

  // Exciter (AVR) & Governor
  enableAVR: boolean;
  AVR_gain: number;
  AVR_time_const: number;
  Vref_pu: number;
  Gov_droop: number;
  Gov_time_const: number;

  // Base values
  V_base_phase: number;
  I_base_phase: number;
  Z_base: number;

  // Multi-Mass Shaft (optional)
  multiMassShaft: MultiMassShaft | null = null;

  // Stamped 3-phase Norton Conductance Matrix [G_abc]
  G_abc: number[][];

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Sn_MVA = params.Sn_MVA ?? 100;
    this.Vn_kV = params.Vn_kV ?? 13.8;
    this.freq = params.freq ?? 60;
    this.omega0 = 2 * Math.PI * this.freq;

    // Reactance parameters (standard utility hydro/thermal machine)
    this.Xd = params.Xd ?? 1.80;
    this.Xq = params.Xq ?? 1.70;
    this.Xd_prime = params.Xd_prime ?? 0.30;
    this.Xq_prime = params.Xq_prime ?? 0.55;
    this.Xd_pp = params.Xd_pp ?? 0.20;
    this.Xq_pp = params.Xq_pp ?? 0.20;
    this.Xl = params.Xl ?? 0.12;
    this.Ra = params.Ra ?? 0.003;

    // Time constants
    this.Td0_prime = params.Td0_prime ?? 6.0;
    this.Tq0_prime = params.Tq0_prime ?? 1.0;
    this.Td0_pp = params.Td0_pp ?? 0.04;
    this.Tq0_pp = params.Tq0_pp ?? 0.05;

    this.H = params.H ?? 3.5;
    this.D = params.D ?? 1.0;

    // Controls
    this.enableAVR = params.enableAVR !== false;
    this.AVR_gain = params.AVR_gain ?? 50.0;
    this.AVR_time_const = params.AVR_time_const ?? 0.05;
    this.Vref_pu = params.Vref_pu ?? 1.0;
    this.Gov_droop = params.Gov_droop ?? 0.05;
    this.Gov_time_const = params.Gov_time_const ?? 0.2;

    // Base calculations
    this.V_base_phase = (this.Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3);
    const S_base_phase = (this.Sn_MVA * 1e6) / 3.0;
    this.I_base_phase = (S_base_phase * 2) / this.V_base_phase;
    this.Z_base = (this.Vn_kV * 1000 * this.Vn_kV * 1000) / (this.Sn_MVA * 1e6);

    // Multi-mass shaft if configured
    if (params.useMultiMassShaft) {
      this.multiMassShaft = new MultiMassShaft(`${this.id}_shaft`, params);
    }

    this.G_abc = Array.from({ length: 3 }, () => Array(3).fill(0));
  }

  initState(): SyncMachineDqState {
    const state: SyncMachineDqState = {
      delta: 0.15, // initial rotor load angle
      omega_pu: 1.0,
      theta_e: 0.15,
      Ed_prime: 0.0,
      Eq_prime: 1.0,
      Ed_pp: 0.0,
      Eq_pp: 1.0,
      psi_1d: 1.0,
      psi_2q: 0.0,
      Vf: 1.0,
      Tm_pu: 0.8,
      Te_pu: 0.8,
      prevV_abc: [0, 0, 0],
      prevI_abc: [0, 0, 0],
    };

    if (this.multiMassShaft) {
      state.shaftState = this.multiMassShaft.initState();
    }

    return state;
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
   * Rebuild Norton 3x3 Phase Conductance Matrix [G_abc]
   */
  rebuildConductanceMatrix(dt: number, state: SyncMachineDqState): void {
    // Equivalent subtransient conductances in physical Ohms
    const Ld_pp = (this.Xd_pp * this.Z_base) / this.omega0;
    const Lq_pp = (this.Xq_pp * this.Z_base) / this.omega0;
    const Ra_ohm = this.Ra * this.Z_base;

    const Gd_pp = dt / (2.0 * Ld_pp + Ra_ohm * dt);
    const Gq_pp = dt / (2.0 * Lq_pp + Ra_ohm * dt);
    const G_zero = Gd_pp * 0.1; // Zero sequence conductance

    const theta = state.theta_e;
    const cos0 = Math.cos(theta);
    const cos1 = Math.cos(theta - (2 * Math.PI) / 3);
    const cos2 = Math.cos(theta + (2 * Math.PI) / 3);

    const sin0 = Math.sin(theta);
    const sin1 = Math.sin(theta - (2 * Math.PI) / 3);
    const sin2 = Math.sin(theta + (2 * Math.PI) / 3);

    // [G_abc] = [P]^-1 * [G_dq0] * [P]
    const P_inv = [
      [cos0, -sin0, 1.0],
      [cos1, -sin1, 1.0],
      [cos2, -sin2, 1.0]
    ];

    const G_dq0 = [
      [Gd_pp, 0, 0],
      [0, Gq_pp, 0],
      [0, 0, G_zero]
    ];

    const P = [
      [(2 / 3) * cos0, (2 / 3) * cos1, (2 / 3) * cos2],
      [-(2 / 3) * sin0, -(2 / 3) * sin1, -(2 / 3) * sin2],
      [1 / 3, 1 / 3, 1 / 3]
    ];

    // Multiply: G_abc = P_inv * G_dq0 * P
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          for (let m = 0; m < 3; m++) {
            sum += P_inv[i][k] * G_dq0[k][m] * P[m][j];
          }
        }
        this.G_abc[i][j] = sum;
      }
    }
  }

  /**
   * Compute Norton History Injections I_hist into 3-phase stator nodes (a, b, c)
   */
  computeHistoryInjections(_dt: number, state: SyncMachineDqState): [number, number, number] {
    // Internal subtransient voltages behind X'' in physical Volts
    const ed_pp_volts = state.Ed_pp * this.V_base_phase;
    const eq_pp_volts = state.Eq_pp * this.V_base_phase;

    // Convert internal subtransient EMF to phase coordinates
    const e_pp_abc = this.inverseParkTransform([ed_pp_volts, eq_pp_volts, 0], state.theta_e);

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
   * Advance 6th-Order State Space Equations by 1 time step
   */
  step(v_abc: [number, number, number], i_abc: [number, number, number], dt: number, state: SyncMachineDqState): void {
    // Convert terminal voltages and currents to d-q-0 (in pu)
    const [vd_v, vq_v, _] = this.parkTransform(v_abc, state.theta_e);
    const [id_a, iq_a, __] = this.parkTransform(i_abc, state.theta_e);

    const vd = vd_v / this.V_base_phase;
    const vq = vq_v / this.V_base_phase;
    const id = id_a / this.I_base_phase;
    const iq = iq_a / this.I_base_phase;

    // Air-gap electrical torque: Te = psi_d * iq - psi_q * id (approx: Eq'' * iq + Ed'' * id)
    state.Te_pu = state.Eq_pp * iq + state.Ed_pp * id;

    // Exciter / AVR Dynamics (IEEE Type 1 / ST1A)
    if (this.enableAVR) {
      const V_term_pu = Math.sqrt(vd * vd + vq * vq);
      const targetVf = 1.0 + this.AVR_gain * (this.Vref_pu - V_term_pu);
      const safeTargetVf = Math.max(0.0, Math.min(4.5, targetVf));
      state.Vf += (safeTargetVf - state.Vf) * (dt / this.AVR_time_const);
    }

    // Governor / Turbine Dynamics
    const targetTm = 1.0 - (1.0 / this.Gov_droop) * (state.omega_pu - 1.0);
    const safeTargetTm = Math.max(0.1, Math.min(1.5, targetTm));
    state.Tm_pu += (safeTargetTm - state.Tm_pu) * (dt / this.Gov_time_const);

    // 6th-Order Flux Linkage Integrations
    // 1. Transient d-axis Eq'
    const dEq_prime = (1.0 / this.Td0_prime) * (
      state.Vf - state.Eq_prime - id * (this.Xd - this.Xd_prime - (this.Xd_pp - this.Xl) * (this.Xd - this.Xd_prime) / (this.Xd_prime - this.Xl))
    );
    state.Eq_prime += dEq_prime * dt;

    // 2. Transient q-axis Ed'
    const dEd_prime = (1.0 / this.Tq0_prime) * (
      -state.Ed_prime + iq * (this.Xq - this.Xq_prime - (this.Xq_pp - this.Xl) * (this.Xq - this.Xq_prime) / (this.Xq_prime - this.Xl))
    );
    state.Ed_prime += dEd_prime * dt;

    // 3. Subtransient d-axis Eq''
    const dEq_pp = (1.0 / this.Td0_pp) * (
      state.Eq_prime - state.Eq_pp - id * (this.Xd_prime - this.Xd_pp)
    );
    state.Eq_pp += dEq_pp * dt;

    // 4. Subtransient q-axis Ed''
    const dEd_pp = (1.0 / this.Tq0_pp) * (
      state.Ed_prime - state.Ed_pp + iq * (this.Xq_prime - this.Xq_pp)
    );
    state.Ed_pp += dEd_pp * dt;

    // Mechanical Rotor Swing or Multi-Mass Shaft
    if (this.multiMassShaft && state.shaftState) {
      state.shaftState = this.multiMassShaft.step(state.Tm_pu, state.Te_pu, dt, state.shaftState);
      const genMassIdx = this.multiMassShaft.numMasses - 1;
      state.omega_pu = state.shaftState.omega[genMassIdx];
      state.delta = state.shaftState.theta[genMassIdx];
    } else {
      // Standard single-mass swing equation: 2H d(omega)/dt = Tm - Te - D(omega - 1)
      const dOmega_dt = (state.Tm_pu - state.Te_pu - this.D * (state.omega_pu - 1.0)) / (2.0 * this.H);
      state.omega_pu += dOmega_dt * dt;
      state.delta += (state.omega_pu - 1.0) * this.omega0 * dt;
    }

    state.theta_e = (state.theta_e + this.omega0 * state.omega_pu * dt) % (2 * Math.PI);
    state.prevV_abc = [...v_abc];
    state.prevI_abc = [...i_abc];
  }
}
