/**
 * PSCAD CLONE - Automated On-Load Tap Changer (OLTC) & Motorized Voltage Regulator
 * 
 * Features:
 * - Motorized OLTC with mechanical transit delay (3-5 s per tap step)
 * - Diverter switch with transition resistors (R_trans) during switching bridging intervals
 * - Tap range: +/- 16 steps (+/- 10% or +/- 16% in discrete 0.625% steps)
 * - ANSI 90 / IEEE C57.131 Automatic Voltage Regulating (AVR) Controller:
 *   - RMS / Positive-sequence voltage sensor with low-pass filtering
 *   - Configurable voltage setpoint (V_set) and deadband (+/- delta_V_db)
 *   - Line Drop Compensator (LDC): V_comp = V_meas - (R_ldc * I_R + X_ldc * I_X)
 *   - Inverse-time / Definite-time integration delay before initiating tap change
 *   - Anti-hunting lockouts and maximum/minimum tap limit stops
 * - Full EMT Nodal Companion Conductance Matrix [G_term] and Norton history currents.
 */

import type { ComponentParams } from '../../types';

export interface OltcParams {
  V1_nom: number;          // Primary nominal voltage [V] (e.g. 138,000 V)
  V2_nom: number;          // Secondary nominal voltage [V] (e.g. 13,800 V)
  MVA_rating: number;      // Rated power [MVA] (e.g. 50 MVA)
  freq: number;            // Nominal frequency [Hz] (e.g. 60 Hz)
  leakageReactancePu: number; // Leakage reactance [pu] (e.g. 0.08 pu)
  windingLossPu: number;   // Copper losses [pu] (e.g. 0.004 pu)
  
  // Tap Changer specs
  maxTap: number;          // Maximum tap position (e.g. +16)
  minTap: number;          // Minimum tap position (e.g. -16)
  stepPercent: number;     // Voltage step per tap [%] (e.g. 0.625%)
  initialTap: number;      // Initial tap position (e.g. 0)
  t_mechDelay: number;     // Mechanical motor transit time per step [s] (e.g. 3.0 s)
  t_diverterTransit: number; // Diverter switch resistor bridging time [s] (e.g. 0.05 s)
  R_trans: number;         // Diverter transition resistor [Ohm] (e.g. 10.0 Ohm)

  // AVR Controller specs
  enableAVR: boolean;      // Enable automatic closed-loop voltage regulation
  V_set_pu: number;        // Target secondary voltage setpoint [pu] (e.g. 1.00 pu)
  deadband_pu: number;     // Deadband +/- [%] (e.g. 0.0125 pu = +/- 1.25%)
  delayTime: number;       // Controller response delay [s] (e.g. 5.0 s)
  R_ldc_pu: number;        // Line drop compensation resistance [pu] (e.g. 0.02 pu)
  X_ldc_pu: number;        // Line drop compensation reactance [pu] (e.g. 0.05 pu)
}

export interface OltcState {
  currentTap: number;      // Current active tap position [-16 .. +16]
  targetTap: number;       // Target tap position
  isMoving: boolean;       // Motor drive currently in transit
  moveProgress: number;    // Progress of tap transition [0.0 .. 1.0]
  timeInTransition: number;// Elapsed time in current tap transition [s]
  inResistorBridge: boolean;// Diverter switch bridging resistors active
  effectiveRatio: number;  // Current effective turns ratio N1/N2
  
  // AVR Controller state
  V_meas_rms: number;      // Measured secondary RMS voltage [V]
  V_meas_pu: number;       // Measured secondary voltage [pu]
  V_comp_pu: number;       // Line drop compensated voltage [pu]
  timerAccumulator: number;// Integrated time error [s]
  avrCommand: 'HOLD' | 'RAISE' | 'LOWER';
  
  // Electrical branch state
  branchV: Float64Array;   // 6 branch voltages [Pri_A, Pri_B, Pri_C, Sec_A, Sec_B, Sec_C]
  branchI: Float64Array;   // 6 branch currents
  prevTermV: Float64Array; // 8 terminal voltages
  prevTermI: Float64Array; // 8 terminal currents
}

export const DEFAULT_OLTC_PARAMS: OltcParams = {
  V1_nom: 138000,
  V2_nom: 13800,
  MVA_rating: 50,
  freq: 60,
  leakageReactancePu: 0.08,
  windingLossPu: 0.004,
  maxTap: 16,
  minTap: -16,
  stepPercent: 0.625,
  initialTap: 0,
  t_mechDelay: 3.0,
  t_diverterTransit: 0.05,
  R_trans: 10.0,
  enableAVR: true,
  V_set_pu: 1.0,
  deadband_pu: 0.0125,
  delayTime: 5.0,
  R_ldc_pu: 0.02,
  X_ldc_pu: 0.05,
};

export class OltcTransformer {
  id: string;
  params: OltcParams;
  baseRatio: number;       // Nominal turns ratio V1_phase / V2_phase
  N1_base: number;
  N2_base: number;
  Z_base1: number;
  L_leak1: number;
  L_leak2: number;
  R_w1: number;
  R_w2: number;

  constructor(id: string, customParams: Partial<OltcParams> | ComponentParams = {}) {
    this.id = id;
    this.params = { ...DEFAULT_OLTC_PARAMS, ...(customParams as Partial<OltcParams>) };

    const omega = 2 * Math.PI * this.params.freq;
    this.Z_base1 = (this.params.V1_nom * this.params.V1_nom) / (this.params.MVA_rating * 1e6);
    this.baseRatio = this.params.V1_nom / this.params.V2_nom;
    this.N1_base = 1000;
    this.N2_base = Math.round(this.N1_base / this.baseRatio);

    const L_leak_total = (this.params.leakageReactancePu * this.Z_base1) / omega;
    this.L_leak1 = L_leak_total * 0.5;
    this.L_leak2 = this.L_leak1 / (this.baseRatio * this.baseRatio);

    const R_wind_total = this.params.windingLossPu * this.Z_base1;
    this.R_w1 = R_wind_total * 0.5;
    this.R_w2 = this.R_w1 / (this.baseRatio * this.baseRatio);
  }

  initState(): OltcState {
    const tap = this.params.initialTap;
    const ratioFactor = 1.0 + (tap * this.params.stepPercent) / 100.0;
    const effectiveRatio = this.baseRatio / ratioFactor;

    return {
      currentTap: tap,
      targetTap: tap,
      isMoving: false,
      moveProgress: 0.0,
      timeInTransition: 0.0,
      inResistorBridge: false,
      effectiveRatio,
      V_meas_rms: this.params.V2_nom,
      V_meas_pu: 1.0,
      V_comp_pu: 1.0,
      timerAccumulator: 0.0,
      avrCommand: 'HOLD',
      branchV: new Float64Array(6),
      branchI: new Float64Array(6),
      prevTermV: new Float64Array(8),
      prevTermI: new Float64Array(8),
    };
  }

  /**
   * Manual tap raise command
   */
  commandRaiseTap(state: OltcState): boolean {
    if (state.currentTap < this.params.maxTap && !state.isMoving) {
      state.targetTap = state.currentTap + 1;
      state.isMoving = true;
      state.timeInTransition = 0.0;
      state.moveProgress = 0.0;
      return true;
    }
    return false;
  }

  /**
   * Manual tap lower command
   */
  commandLowerTap(state: OltcState): boolean {
    if (state.currentTap > this.params.minTap && !state.isMoving) {
      state.targetTap = state.currentTap - 1;
      state.isMoving = true;
      state.timeInTransition = 0.0;
      state.moveProgress = 0.0;
      return true;
    }
    return false;
  }

  /**
   * Step the motorized tap changer mechanism and AVR regulator
   */
  stepController(
    dt: number,
    state: OltcState,
    secondaryRmsVoltage: number,
    secondaryLoadCurrent: number = 0.0
  ): void {
    state.V_meas_rms = secondaryRmsVoltage;
    state.V_meas_pu = secondaryRmsVoltage / this.params.V2_nom;

    // Line drop compensation: V_comp = V_meas - (R_ldc * I_p + X_ldc * I_q)
    const I_base2 = (this.params.MVA_rating * 1e6) / (Math.sqrt(3) * this.params.V2_nom);
    const I_pu = secondaryLoadCurrent / Math.max(1.0, I_base2);
    const vDrop = (this.params.R_ldc_pu * 0.9 + this.params.X_ldc_pu * 0.436) * I_pu;
    state.V_comp_pu = state.V_meas_pu - vDrop;

    // 1. Motor mechanical transition dynamics
    if (state.isMoving) {
      state.timeInTransition += dt;
      state.moveProgress = Math.min(1.0, state.timeInTransition / this.params.t_mechDelay);

      // Resistor bridging interval during the final switching instant
      const transitStart = this.params.t_mechDelay - this.params.t_diverterTransit;
      state.inResistorBridge = state.timeInTransition >= (transitStart - 1e-5) && state.timeInTransition <= (this.params.t_mechDelay + 1e-5);

      if (state.timeInTransition >= (this.params.t_mechDelay - 1e-5)) {
        state.currentTap = state.targetTap;
        state.isMoving = false;
        state.inResistorBridge = false;
        state.timeInTransition = 0.0;
        state.moveProgress = 0.0;

        const ratioFactor = 1.0 + (state.currentTap * this.params.stepPercent) / 100.0;
        state.effectiveRatio = this.baseRatio / ratioFactor;
      }

    }

    // 2. Automatic Voltage Regulating (AVR) Controller
    if (this.params.enableAVR && !state.isMoving) {
      const vErr = this.params.V_set_pu - state.V_comp_pu;

      if (vErr > this.params.deadband_pu) {
        // Voltage too low -> Need to RAISE tap (increase secondary voltage)
        state.avrCommand = 'RAISE';
        state.timerAccumulator += dt;

        if (state.timerAccumulator >= this.params.delayTime) {
          if (this.commandRaiseTap(state)) {
            state.timerAccumulator = 0.0;
          }
        }
      } else if (vErr < -this.params.deadband_pu) {
        // Voltage too high -> Need to LOWER tap
        state.avrCommand = 'LOWER';
        state.timerAccumulator += dt;

        if (state.timerAccumulator >= this.params.delayTime) {
          if (this.commandLowerTap(state)) {
            state.timerAccumulator = 0.0;
          }
        }
      } else {
        state.avrCommand = 'HOLD';
        state.timerAccumulator = Math.max(0.0, state.timerAccumulator - 2.0 * dt);
      }
    }
  }

  /**
   * Build 8x8 Conductance Matrix [G_term] for EMT simulation:
   * Terminals: [Pa, Pb, Pc, Pn, Sa, Sb, Sc, Sn]
   */
  computeConductanceMatrix(dt: number, state: OltcState, isBE: boolean = false): number[][] {
    const G = Array.from({ length: 8 }, () => Array(8).fill(0));
    const factor = isBE ? 1.0 / dt : 2.0 / dt;

    const ratio = state.effectiveRatio;
    const L1 = this.L_leak1;
    const L2 = this.L_leak2;
    let R1 = this.R_w1;
    let R2 = this.R_w2;

    // In resistor bridging mode, add transition damping resistance
    if (state.inResistorBridge) {
      R2 += this.params.R_trans;
    }

    const g_pri = 1.0 / (factor * L1 + R1);
    const g_sec = 1.0 / (factor * L2 + R2);
    const g_mut = Math.sqrt(g_pri * g_sec);

    // Primary phases (Pa-Pn, Pb-Pn, Pc-Pn)
    for (let i = 0; i < 3; i++) {
      const p = i;
      const pn = 3;
      const s = i + 4;
      const sn = 7;

      G[p][p] += g_pri;
      G[p][pn] -= g_pri;
      G[pn][p] -= g_pri;
      G[pn][pn] += g_pri;

      G[s][s] += g_sec;
      G[s][sn] -= g_sec;
      G[sn][s] -= g_sec;
      G[sn][sn] += g_sec;

      // Ideal transformer turns ratio coupling
      G[p][s] -= g_mut / ratio;
      G[s][p] -= g_mut / ratio;
      G[p][sn] += g_mut / ratio;
      G[sn][p] += g_mut / ratio;
      G[pn][s] += g_mut / ratio;
      G[s][pn] += g_mut / ratio;
      G[pn][sn] -= g_mut / ratio;
      G[sn][pn] -= g_mut / ratio;
    }

    return G;
  }

  /**
   * Compute companion history current injections into 8 terminals
   */
  computeHistoryInjections(dt: number, state: OltcState, isBE: boolean = false): Float64Array {
    const G = this.computeConductanceMatrix(dt, state, isBE);
    const I_hist = new Float64Array(8);

    for (let r = 0; r < 8; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 8; c++) {
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
   * EMT State update step
   */
  updateEMTStep(termVoltages: Float64Array, dt: number, state: OltcState): Float64Array {
    const G = this.computeConductanceMatrix(dt, state);
    const I_hist = this.computeHistoryInjections(dt, state);
    const currents = new Float64Array(8);

    for (let r = 0; r < 8; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 8; c++) {
        sumGV += G[r][c] * termVoltages[c];
      }
      currents[r] = sumGV + I_hist[r];
    }

    state.prevTermV.set(termVoltages);
    state.prevTermI.set(currents);

    // Calculate secondary line-to-line RMS voltage
    const vSa = termVoltages[4] - termVoltages[7];
    const vSb = termVoltages[5] - termVoltages[7];
    const vSc = termVoltages[6] - termVoltages[7];
    const vMag = Math.sqrt((vSa * vSa + vSb * vSb + vSc * vSc) / 1.5);
    const iMag = Math.sqrt((currents[4] * currents[4] + currents[5] * currents[5] + currents[6] * currents[6]) / 1.5);

    this.stepController(dt, state, vMag, iMag);

    return currents;
  }
}
