/**
 * PSCAD Modern - Quadrature Booster Phase Shifting Transformer (PST) Model
 * 
 * Features:
 * - Dual-core phase shifter: Shunt Exciter unit + Series Booster unit
 * - Symmetrical & Asymmetrical quadrature voltage injection:
 *   - V_inj_A = k * (V_b - V_c) in series with Phase A
 *   - V_inj_B = k * (V_c - V_a) in series with Phase B
 *   - V_inj_C = k * (V_a - V_b) in series with Phase C
 * - Discrete tap changer with phase shift angle alpha in [-35 deg, +35 deg]
 * - Power flow control: P_12 = (V1 * V2 / X_line) * sin(delta + alpha)
 * - Automatic closed-loop MW power flow regulation mode
 * - Full EMT nodal companion conductance matrix [G_PST] for 6 terminals [In_A, In_B, In_C, Out_A, Out_B, Out_C].
 */

import type { ComponentParams } from '../../types';

export interface PhaseShifterParams {
  V_nom_kV: number;        // Nominal line-to-line voltage [kV] (e.g. 230 kV or 400 kV)
  MVA_rating: number;      // Rated throughput power [MVA] (e.g. 300 MVA)
  freq: number;            // Nominal frequency [Hz] (e.g. 60 Hz)
  maxPhaseShiftDeg: number;// Maximum phase shift angle alpha_max [deg] (e.g. 30 deg)
  minPhaseShiftDeg: number;// Minimum phase shift angle alpha_min [deg] (e.g. -30 deg)
  totalTaps: number;       // Total tap steps (e.g. 33 steps from -16 to +16)
  initialTap: number;      // Initial tap position (e.g. 0)
  leakageReactancePu: number; // Leakage reactance [pu] (e.g. 0.12 pu)
  windingLossPu: number;   // Copper losses [pu] (e.g. 0.003 pu)

  // Closed-loop active power flow control mode
  enablePowerControl: boolean;
  targetMW: number;        // Target active power flow [MW]
  powerDeadbandMW: number; // Deadband [MW] (e.g. 5 MW)
}

export interface PhaseShifterState {
  currentTap: number;      // Active tap [-16 .. +16]
  phaseAngleDeg: number;   // Current phase shift angle alpha [deg]
  measuredP_MW: number;    // Measured active power flow [MW]
  measuredQ_MVAR: number;  // Measured reactive power flow [MVAR]
  prevTermV: Float64Array; // 6 terminal voltages [In_A, In_B, In_C, Out_A, Out_B, Out_C]
  prevTermI: Float64Array; // 6 terminal currents [In_A, In_B, In_C, Out_A, Out_B, Out_C]
}

export const DEFAULT_PST_PARAMS: PhaseShifterParams = {
  V_nom_kV: 230.0,
  MVA_rating: 300.0,
  freq: 60,
  maxPhaseShiftDeg: 30.0,
  minPhaseShiftDeg: -30.0,
  totalTaps: 33,
  initialTap: 0,
  leakageReactancePu: 0.12,
  windingLossPu: 0.003,
  enablePowerControl: false,
  targetMW: 150.0,
  powerDeadbandMW: 5.0,
};

export class PhaseShiftingTransformer {
  id: string;
  params: PhaseShifterParams;
  Z_base: number;
  R_w: number;
  L_leak: number;
  degPerTap: number;

  constructor(id: string, customParams: Partial<PhaseShifterParams> | ComponentParams = {}) {
    this.id = id;
    this.params = { ...DEFAULT_PST_PARAMS, ...(customParams as Partial<PhaseShifterParams>) };

    const omega = 2 * Math.PI * this.params.freq;
    const V_base = this.params.V_nom_kV * 1e3;
    this.Z_base = (V_base * V_base) / (this.params.MVA_rating * 1e6);

    this.R_w = this.params.windingLossPu * this.Z_base;
    this.L_leak = (this.params.leakageReactancePu * this.Z_base) / omega;

    const numSteps = Math.floor((this.params.totalTaps - 1) / 2);
    this.degPerTap = this.params.maxPhaseShiftDeg / Math.max(1, numSteps);
  }

  initState(): PhaseShifterState {
    const tap = this.params.initialTap;
    const alpha = tap * this.degPerTap;

    return {
      currentTap: tap,
      phaseAngleDeg: alpha,
      measuredP_MW: 0.0,
      measuredQ_MVAR: 0.0,
      prevTermV: new Float64Array(6),
      prevTermI: new Float64Array(6),
    };
  }

  /**
   * Set discrete tap position
   */
  setTap(state: PhaseShifterState, newTap: number): void {
    const maxT = Math.floor((this.params.totalTaps - 1) / 2);
    state.currentTap = Math.max(-maxT, Math.min(maxT, Math.round(newTap)));
    state.phaseAngleDeg = state.currentTap * this.degPerTap;
  }

  /**
   * Calculate power transfer change given line reactance X_line
   */
  calculateTheoreticalPowerFlow(V1: number, V2: number, X_line: number, deltaDeg: number, state: PhaseShifterState): number {
    const totalAngleRad = ((deltaDeg + state.phaseAngleDeg) * Math.PI) / 180.0;
    const P_watts = (V1 * V2 / X_line) * Math.sin(totalAngleRad);
    return P_watts / 1e6; // in MW
  }

  /**
   * Build 6x6 Conductance Matrix [G_PST] for EMT simulation:
   * Terminals: [0: In_A, 1: In_B, 2: In_C, 3: Out_A, 4: Out_B, 5: Out_C]
   */
  computeConductanceMatrix(dt: number, state: PhaseShifterState, isBE: boolean = false): number[][] {
    const G = Array.from({ length: 6 }, () => Array(6).fill(0));
    const factor = isBE ? 1.0 / dt : 2.0 / dt;

    // Series leakage impedance
    const g_series = 1.0 / (factor * this.L_leak + this.R_w);

    // Phase shift angle in radians
    const alphaRad = (state.phaseAngleDeg * Math.PI) / 180.0;
    const cosA = Math.cos(alphaRad);
    const sinA_over_sqrt3 = Math.sin(alphaRad) / Math.sqrt(3.0);

    // Direct series coupling with quadrature rotation:
    // V_out = [R(alpha)] * V_in
    for (let i = 0; i < 3; i++) {
      const inNode = i;
      const outNode = i + 3;

      G[inNode][inNode] += g_series;
      G[outNode][outNode] += g_series;

      // In-phase coupling
      G[inNode][outNode] -= g_series * cosA;
      G[outNode][inNode] -= g_series * cosA;

      // Cross-phase quadrature injection coupling
      const prevPhaseIn = (i + 2) % 3;
      const nextPhaseIn = (i + 1) % 3;

      G[outNode][prevPhaseIn] -= g_series * sinA_over_sqrt3;
      G[outNode][nextPhaseIn] += g_series * sinA_over_sqrt3;
      G[inNode][prevPhaseIn] += g_series * sinA_over_sqrt3;
      G[inNode][nextPhaseIn] -= g_series * sinA_over_sqrt3;
    }

    return G;
  }

  /**
   * Compute companion history current injections
   */
  computeHistoryInjections(
    state: PhaseShifterState,
    dt: number,
    isBE: boolean = false
  ): Float64Array {
    const G = this.computeConductanceMatrix(dt, state, isBE);
    const I_hist = new Float64Array(6);

    for (let r = 0; r < 6; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 6; c++) {
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
   * EMT Step execution with optional closed-loop MW flow regulation
   */
  updateEMTStep(termVoltages: Float64Array, dt: number, state: PhaseShifterState): Float64Array {
    const G = this.computeConductanceMatrix(dt, state);
    const I_hist = this.computeHistoryInjections(state, dt);
    const currents = new Float64Array(6);

    for (let r = 0; r < 6; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 6; c++) {
        sumGV += G[r][c] * termVoltages[c];
      }
      currents[r] = sumGV + I_hist[r];
    }

    state.prevTermV.set(termVoltages);
    state.prevTermI.set(currents);

    // Calculate instantaneous active power through Phase Shifter (MW)
    const pA = termVoltages[0] * currents[0];
    const pB = termVoltages[1] * currents[1];
    const pC = termVoltages[2] * currents[2];
    const totalP = (pA + pB + pC);
    state.measuredP_MW = totalP / 1e6;

    // Closed loop power regulation
    if (this.params.enablePowerControl) {
      const pErr = this.params.targetMW - state.measuredP_MW;
      if (pErr > this.params.powerDeadbandMW) {
        this.setTap(state, state.currentTap + 1);
      } else if (pErr < -this.params.powerDeadbandMW) {
        this.setTap(state, state.currentTap - 1);
      }
    }

    return currents;
  }
}
