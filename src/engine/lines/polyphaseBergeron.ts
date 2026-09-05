/**
 * PSCAD Modern - Polyphase 3-Phase Coupled Transmission Line Model
 * 
 * Implements modal transformation (Clarke / Karrenbauer) decoupling:
 * - Transforms 3 coupled phase conductors (A, B, C) into 3 independent modal channels:
 *     Mode 0: Ground mode (slower velocity tau_0 > tau_1, higher surge impedance Z_c0)
 *     Mode 1 (Alpha): Aerial mode 1 (near speed-of-light velocity, lower surge impedance Z_c1)
 *     Mode 2 (Beta):  Aerial mode 2 (near speed-of-light velocity, identical Z_c1 for transposed lines)
 * 
 * - Each mode is integrated independently using Bergeron traveling wave line engines.
 * - Exact phase domain Norton conductance matrix [G_phase] = [T] * [G_mode] * [T]^-1
 * - Full 6-terminal coupled nodal stamping (Sending A, B, C and Receiving A, B, C).
 */

import { HistoryRingBuffer } from './bergeronLine';
import type { ComponentParams } from '../../types';

// Normalized Clarke Transformation Matrix (Orthogonal: T^-1 = T^T)
// Row 0: Mode 0 (Ground), Row 1: Mode 1 (Alpha), Row 2: Mode 2 (Beta)
const SQRT_3 = Math.sqrt(3);
const SQRT_6 = Math.sqrt(6);
const SQRT_2 = Math.sqrt(2);

const T_CLARKE = [
  [1.0 / SQRT_3,  Math.sqrt(2.0 / 3.0), 0.0],
  [1.0 / SQRT_3, -1.0 / SQRT_6,         1.0 / SQRT_2],
  [1.0 / SQRT_3, -1.0 / SQRT_6,        -1.0 / SQRT_2],
];

const T_INV_CLARKE = [
  [1.0 / SQRT_3,         1.0 / SQRT_3,         1.0 / SQRT_3],
  [Math.sqrt(2.0 / 3.0), -1.0 / SQRT_6,        -1.0 / SQRT_6],
  [0.0,                  1.0 / SQRT_2,        -1.0 / SQRT_2],
];

export interface ModalLineParams {
  Zc: number;
  tau: number;
  velocity: number;
  G_equiv: number;
  hFactor: number;
  totalR: number;
}

export class PolyphaseBergeronLine {
  id: string;
  lengthKm: number;

  // Phase domain electrical parameters per km
  r_self: number;
  r_mutual: number;
  l_self: number;
  l_mutual: number;
  c_self: number;
  c_mutual: number;

  // Modal parameters for Mode 0 (Ground) and Modes 1,2 (Aerial)
  modeParams: [ModalLineParams, ModalLineParams, ModalLineParams];

  // 3 Independent modal history ring buffers for sending and receiving ends
  private sendModalBuffers: [HistoryRingBuffer, HistoryRingBuffer, HistoryRingBuffer];
  private recvModalBuffers: [HistoryRingBuffer, HistoryRingBuffer, HistoryRingBuffer];

  // Current Phase-Domain Norton Current Injections: [Phase A, Phase B, Phase C]
  I_hist_send: [number, number, number] = [0, 0, 0];
  I_hist_recv: [number, number, number] = [0, 0, 0];

  // Phase-Domain 3x3 Norton Conductance Matrix
  G_phase: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  constructor(id: string, params: ComponentParams) {
    this.id = id;
    this.lengthKm = Math.max(params.lengthKm ?? 100.0, 0.1);

    // Default 230 kV 3-phase line parameters
    this.r_self = Math.max(params.R_self_per_km ?? params.R_per_km ?? 0.05, 1e-6);
    this.r_mutual = Math.max(params.R_mutual_per_km ?? 0.02, 0.0);
    this.l_self = Math.max(params.L_self_per_km ?? params.L_per_km ?? 0.0013, 1e-8); // H/km
    this.l_mutual = Math.max(params.L_mutual_per_km ?? 0.0005, 0.0); // H/km
    this.c_self = Math.max(params.C_self_per_km ?? params.C_per_km ?? 0.012e-6, 1e-12); // F/km
    this.c_mutual = Math.max(params.C_mutual_per_km ?? 0.003e-6, 0.0); // F/km

    this.sendModalBuffers = [
      new HistoryRingBuffer(10000),
      new HistoryRingBuffer(10000),
      new HistoryRingBuffer(10000)
    ];
    this.recvModalBuffers = [
      new HistoryRingBuffer(10000),
      new HistoryRingBuffer(10000),
      new HistoryRingBuffer(10000)
    ];

    this.modeParams = [
      this.calcModalParams(0),
      this.calcModalParams(1),
      this.calcModalParams(2)
    ];

    this.rebuildConductanceMatrix();
  }

  private calcModalParams(modeIdx: number): ModalLineParams {
    let L_mode: number;
    let C_mode: number;
    let R_mode: number;

    if (modeIdx === 0) {
      // Ground Mode (Mode 0 / Zero sequence)
      L_mode = this.l_self + 2.0 * this.l_mutual;
      C_mode = Math.max(this.c_self - 2.0 * this.c_mutual, 1e-12);
      R_mode = this.r_self + 2.0 * this.r_mutual;
    } else {
      // Aerial Modes (Mode 1 Alpha, Mode 2 Beta / Positive sequence)
      L_mode = Math.max(this.l_self - this.l_mutual, 1e-8);
      C_mode = this.c_self + this.c_mutual;
      R_mode = this.r_self;
    }

    const totalR = R_mode * this.lengthKm;
    const totalL = L_mode * this.lengthKm;
    const totalC = C_mode * this.lengthKm;

    const Zc = Math.sqrt(totalL / totalC);
    const tau = this.lengthKm * Math.sqrt(L_mode * C_mode);
    const velocity = 1.0 / Math.sqrt(L_mode * C_mode);

    const rQuarter = totalR / 4.0;
    const G_equiv = 1.0 / (Zc + rQuarter);
    const hFactor = (Zc - rQuarter) / (Zc + rQuarter);

    return {
      Zc,
      tau,
      velocity,
      G_equiv,
      hFactor,
      totalR
    };
  }

  private rebuildConductanceMatrix(): void {
    // [G_mode] = diag(G_mode0, G_mode1, G_mode2)
    const G0 = this.modeParams[0].G_equiv;
    const G1 = this.modeParams[1].G_equiv;
    const G2 = this.modeParams[2].G_equiv;

    // [G_phase] = [T] * [G_mode] * [T]^T
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.G_phase[r][c] =
          T_CLARKE[r][0] * G0 * T_CLARKE[c][0] +
          T_CLARKE[r][1] * G1 * T_CLARKE[c][1] +
          T_CLARKE[r][2] * G2 * T_CLARKE[c][2];
      }
    }
  }

  reset(): void {
    for (let m = 0; m < 3; m++) {
      this.sendModalBuffers[m].reset();
      this.recvModalBuffers[m].reset();
    }
    this.I_hist_send = [0, 0, 0];
    this.I_hist_recv = [0, 0, 0];
  }

  /**
   * Calculate Phase Domain Norton History Injections at current time t
   */
  computeHistoryInjections(t: number): {
    I_hist_send: [number, number, number];
    I_hist_recv: [number, number, number];
  } {
    const I_hist_modal_send: [number, number, number] = [0, 0, 0];
    const I_hist_modal_recv: [number, number, number] = [0, 0, 0];

    for (let m = 0; m < 3; m++) {
      const mp = this.modeParams[m];
      const targetT = t - mp.tau;

      if (targetT <= 0) {
        I_hist_modal_send[m] = 0.0;
        I_hist_modal_recv[m] = 0.0;
        continue;
      }

      const recvPast = this.recvModalBuffers[m].getAt(targetT);
      const sendPast = this.sendModalBuffers[m].getAt(targetT);

      const Z_eff = mp.Zc + mp.totalR / 4.0;
      const invZ = 1.0 / Z_eff;

      const waveFromRecv = invZ * recvPast.v + recvPast.i;
      const waveFromSend = invZ * sendPast.v + sendPast.i;

      const factor1 = (1.0 + mp.hFactor) / 2.0;
      const factor2 = (1.0 - mp.hFactor) / 2.0;

      I_hist_modal_send[m] = -(factor1 * waveFromRecv + factor2 * waveFromSend);
      I_hist_modal_recv[m] = -(factor1 * waveFromSend + factor2 * waveFromRecv);
    }

    // Transform Modal Current Injections back to Phase Domain: [I_phase] = [T] * [I_modal]
    for (let ph = 0; ph < 3; ph++) {
      this.I_hist_send[ph] =
        T_CLARKE[ph][0] * I_hist_modal_send[0] +
        T_CLARKE[ph][1] * I_hist_modal_send[1] +
        T_CLARKE[ph][2] * I_hist_modal_send[2];

      this.I_hist_recv[ph] =
        T_CLARKE[ph][0] * I_hist_modal_recv[0] +
        T_CLARKE[ph][1] * I_hist_modal_recv[1] +
        T_CLARKE[ph][2] * I_hist_modal_recv[2];
    }

    return {
      I_hist_send: this.I_hist_send,
      I_hist_recv: this.I_hist_recv,
    };
  }

  /**
   * Record terminal voltages and currents (Phase A, B, C) at time t.
   * Converts phase quantities into modal quantities and pushes into ring buffers.
   */
  recordTerminalStates(
    t: number,
    vSend_abc: [number, number, number],
    iSend_abc: [number, number, number],
    vRecv_abc: [number, number, number],
    iRecv_abc: [number, number, number]
  ): void {
    // Convert to Modal Quantities: [v_mode] = [T]^-1 * [v_abc]
    const vSend_modal = this.phaseToModal(vSend_abc);
    const iSend_modal = this.phaseToModal(iSend_abc);
    const vRecv_modal = this.phaseToModal(vRecv_abc);
    const iRecv_modal = this.phaseToModal(iRecv_abc);

    for (let m = 0; m < 3; m++) {
      this.sendModalBuffers[m].push(t, vSend_modal[m], iSend_modal[m]);
      this.recvModalBuffers[m].push(t, vRecv_modal[m], iRecv_modal[m]);
    }
  }

  private phaseToModal(abc: [number, number, number]): [number, number, number] {
    return [
      T_INV_CLARKE[0][0] * abc[0] + T_INV_CLARKE[0][1] * abc[1] + T_INV_CLARKE[0][2] * abc[2],
      T_INV_CLARKE[1][0] * abc[0] + T_INV_CLARKE[1][1] * abc[1] + T_INV_CLARKE[1][2] * abc[2],
      T_INV_CLARKE[2][0] * abc[0] + T_INV_CLARKE[2][1] * abc[1] + T_INV_CLARKE[2][2] * abc[2],
    ];
  }

  getDiagnostics(): {
    Zc_ground: number;
    Zc_aerial: number;
    tau_ground_ms: number;
    tau_aerial_ms: number;
    v_ground_km_s: number;
    v_aerial_km_s: number;
  } {
    return {
      Zc_ground: this.modeParams[0].Zc,
      Zc_aerial: this.modeParams[1].Zc,
      tau_ground_ms: this.modeParams[0].tau * 1000.0,
      tau_aerial_ms: this.modeParams[1].tau * 1000.0,
      v_ground_km_s: this.modeParams[0].velocity,
      v_aerial_km_s: this.modeParams[1].velocity,
    };
  }
}
