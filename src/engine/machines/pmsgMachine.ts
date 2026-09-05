/**
 * PSCAD CLONE - Permanent Magnet Synchronous Generator (PMSG) Type 4 Wind Turbine (TypeScript)
 * 
 * Supports:
 * - Full-scale Back-to-Back converter (MSC + GSI) decoupling generator and grid
 * - Permanent magnet rotor flux linkage lambda_pm
 * - DC-link intermediate capacitor energy balance & voltage control
 * - Optimal Tip-Speed Ratio (TSR) MPPT wind turbine power controller
 * - Grid-Side Inverter Norton companion model injecting regulated 3-phase AC current
 */

import type { ComponentParams } from '../../types';

export interface PmsgState {
  omega_m_pu: number;      // Mechanical rotor shaft speed [pu]
  theta_gen: number;       // Generator rotor angle [rad]
  theta_grid: number;      // Grid voltage angle [rad]

  // Electrical variables
  id_gen: number;          // Generator d-axis current
  iq_gen: number;          // Generator q-axis current
  Vdc_pu: number;          // Intermediate DC link voltage [pu]
  P_gen_MW: number;        // Active power output [MW]
  Q_gen_MVAR: number;      // Reactive power output [MVAR]

  // Past signals
  prevV_abc: [number, number, number];
  prevI_abc: [number, number, number];
}

export class PmsgMachine {
  id: string;
  Sn_MVA: number;
  Vn_kV: number;
  freq: number;
  omega0: number;

  // Machine Parameters [pu]
  Rs: number;
  Ld: number;
  Lq: number;
  lambda_pm: number;       // Permanent magnet flux linkage [pu]
  H: number;               // Wind turbine + generator inertia [s]
  poles: number;

  // Grid Converter Parameters
  Cdc_F: number;
  Vdc_ref_pu: number;
  windSpeed: number;
  Pref_pu: number;
  Qref_pu: number;

  // Base Values
  V_base_phase: number;
  I_base_phase: number;
  Z_base: number;

  // Stamped Phase Conductance Matrix [G_abc]
  G_abc: number[][];

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Sn_MVA = params.Sn_MVA ?? 3.0;    // 3.0 MW Type 4 Wind Turbine
    this.Vn_kV = params.Vn_kV ?? 0.69;     // 690 V grid connection
    this.freq = params.freq ?? 60;
    this.omega0 = 2 * Math.PI * this.freq;

    this.Rs = params.Rs ?? 0.02;
    this.Ld = params.Ld ?? 0.80;
    this.Lq = params.Lq ?? 0.80;
    this.lambda_pm = params.lambda_pm ?? 1.0;
    this.H = params.H ?? 4.5;
    this.poles = params.poles ?? 60;       // Direct drive low-speed multi-pole machine

    this.Cdc_F = params.Cdc_F ?? 0.08;
    this.Vdc_ref_pu = params.Vdc_ref_pu ?? 1.0;
    this.windSpeed = params.windSpeed ?? 12.0;
    this.Pref_pu = params.Pref_pu ?? 0.95;
    this.Qref_pu = params.Qref_pu ?? 0.0;

    this.V_base_phase = (this.Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3);
    const S_base_phase = (this.Sn_MVA * 1e6) / 3.0;
    this.I_base_phase = (S_base_phase * 2) / this.V_base_phase;
    this.Z_base = (this.Vn_kV * 1000 * this.Vn_kV * 1000) / (this.Sn_MVA * 1e6);

    this.G_abc = Array.from({ length: 3 }, () => Array(3).fill(0));
  }

  initState(): PmsgState {
    return {
      omega_m_pu: 1.0,
      theta_gen: 0.0,
      theta_grid: 0.0,
      id_gen: 0.0,
      iq_gen: 0.9,
      Vdc_pu: 1.0,
      P_gen_MW: this.Sn_MVA * 0.95,
      Q_gen_MVAR: 0.0,
      prevV_abc: [0, 0, 0],
      prevI_abc: [0, 0, 0],
    };
  }

  /**
   * Rebuild GSI Grid-Side Inverter Norton Conductance [G_abc]
   */
  rebuildConductanceMatrix(dt: number): void {
    // GSI AC output filter reactor
    const L_filter = 0.15 * this.Z_base / this.omega0;
    const R_filter = 0.005 * this.Z_base;
    const G_eq = dt / (2.0 * L_filter + R_filter * dt);

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.G_abc[i][j] = (i === j) ? G_eq : 0;
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
   * Compute Injected Currents from GSI into the 3-Phase Grid
   */
  computeHistoryInjections(_dt: number, state: PmsgState): [number, number, number] {
    // Current references dictated by active power and reactive power
    const id_gsi_ref = -(state.P_gen_MW / this.Sn_MVA) * this.I_base_phase;
    const iq_gsi_ref = -(this.Qref_pu) * this.I_base_phase;

    const I_cmd_abc = this.inverseParkTransform([id_gsi_ref, iq_gsi_ref, 0], state.theta_grid);
    const I_hist_abc: [number, number, number] = [0, 0, 0];

    for (let i = 0; i < 3; i++) {
      I_hist_abc[i] = I_cmd_abc[i];
    }

    return I_hist_abc;
  }

  /**
   * Advance PMSG Turbine Dynamics by 1 time step
   */
  step(v_abc: [number, number, number], i_abc: [number, number, number], dt: number, state: PmsgState): void {
    const [vd_v, vq_v, _] = this.parkTransform(v_abc, state.theta_grid);
    const [id_a, iq_a, __] = this.parkTransform(i_abc, state.theta_grid);

    const vd = vd_v / this.V_base_phase;
    const vq = vq_v / this.V_base_phase;
    const ids = id_a / this.I_base_phase;
    const iqs = iq_a / this.I_base_phase;

    // Power delivered to grid
    state.P_gen_MW = Math.abs(vd * ids + vq * iqs) * this.Sn_MVA;
    state.Q_gen_MVAR = (vq * ids - vd * iqs) * this.Sn_MVA;

    // Wind Turbine Aerodynamics & MPPT: P_wind = 0.5 * rho * A * v^3 * Cp
    const P_wind_pu = Math.min(1.0, Math.pow(this.windSpeed / 12.0, 3) * 0.95);
    const Tm_wind_pu = P_wind_pu / Math.max(0.2, state.omega_m_pu);

    // Generator torque: Te = 1.5 * p * lambda_pm * iq_gen
    const Te_gen_pu = this.lambda_pm * state.iq_gen;

    // Mechanical acceleration: 2H d(omega)/dt = Tm - Te
    const dOmega = (Tm_wind_pu - Te_gen_pu) / (2.0 * this.H);
    state.omega_m_pu += dOmega * dt;
    state.omega_m_pu = Math.max(0.3, Math.min(1.3, state.omega_m_pu));

    // DC Link Capacitor Voltage Dynamics: C d(Vdc)/dt = P_gen - P_grid
    const P_gen_pu = Te_gen_pu * state.omega_m_pu;
    const P_grid_pu = state.P_gen_MW / this.Sn_MVA;
    const dVdc = ((P_gen_pu - P_grid_pu) / Math.max(0.5, state.Vdc_pu)) * (dt / this.Cdc_F);
    state.Vdc_pu = Math.max(0.5, Math.min(1.5, state.Vdc_pu + dVdc));

    // Update generator q-axis current based on MPPT speed controller
    const omega_opt = Math.min(1.0, this.windSpeed / 12.0);
    state.iq_gen += (omega_opt - state.omega_m_pu) * 5.0 * dt + (P_wind_pu - state.iq_gen) * 0.1;
    state.iq_gen = Math.max(0.0, Math.min(1.2, state.iq_gen));

    state.theta_grid = (state.theta_grid + this.omega0 * dt) % (2 * Math.PI);
    state.theta_gen = (state.theta_gen + this.omega0 * (this.poles / 2) * state.omega_m_pu * dt) % (2 * Math.PI);

    state.prevV_abc = [...v_abc];
    state.prevI_abc = [...i_abc];
  }
}
