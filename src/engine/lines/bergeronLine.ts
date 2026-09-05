/**
 * PSCAD Modern - Bergeron Constant Parameter Traveling Wave Transmission Line Model
 * 
 * Implements the classic Dommel / EMTDC distributed parameter line model:
 * - Characteristic impedance: Zc = sqrt(L / C)
 * - Wave travel time: tau = length * sqrt(L * C)
 * - Propagation velocity: v = 1 / sqrt(L * C)
 * - Distributed losses approximated via lumped end/center resistance partition (R/4, R/2, R/4)
 * - Ring buffer with continuous sub-step interpolation for arbitrary travel time tau
 * - Norton companion model:
 *     I_send(t) = G * V_send(t) + I_hist_send(t)
 *     I_recv(t) = G * V_recv(t) + I_hist_recv(t)
 *   where:
 *     G = 1 / (Zc + R_total / 4)
 *     I_hist_send(t) = -((1 + h) / (1 - h)) * [ (1 / Zc') * V_recv(t - tau) + I_recv(t - tau) ]
 */

import type { ComponentParams } from '../../types';

export interface RingBufferSample {
  t: number;
  v: number;
  i: number;
}

export class HistoryRingBuffer {
  private buffer: RingBufferSample[];
  private head: number = 0;
  private size: number;
  private count: number = 0;

  constructor(capacity: number = 20000) {
    this.size = capacity;
    this.buffer = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.buffer[i] = { t: 0, v: 0, i: 0 };
    }
  }

  reset(): void {
    this.head = 0;
    this.count = 0;
    for (let i = 0; i < this.size; i++) {
      this.buffer[i] = { t: 0, v: 0, i: 0 };
    }
  }

  push(t: number, v: number, i: number): void {
    this.buffer[this.head] = { t, v, i };
    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;
  }

  /**
   * Interpolate (v, i) at historical timestamp targetT using linear/cubic interpolation.
   */
  getAt(targetT: number): { v: number; i: number } {
    if (this.count === 0 || targetT <= 0) {
      return { v: 0.0, i: 0.0 };
    }

    // Search backward from latest inserted sample
    const latestIdx = (this.head - 1 + this.size) % this.size;
    const latestSample = this.buffer[latestIdx];

    if (targetT >= latestSample.t) {
      return { v: latestSample.v, i: latestSample.i };
    }

    const oldestIdx = (this.head - this.count + this.size) % this.size;
    const oldestSample = this.buffer[oldestIdx];

    if (targetT <= oldestSample.t) {
      return { v: oldestSample.v, i: oldestSample.i };
    }

    // Binary search through ring buffer
    let low = 0;
    let high = this.count - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bufIdx = (this.head - this.count + mid + this.size) % this.size;
      const sampleT = this.buffer[bufIdx].t;

      if (sampleT < targetT) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx0 = (this.head - this.count + Math.max(0, low - 1) + this.size) % this.size;
    const idx1 = (this.head - this.count + Math.min(this.count - 1, low) + this.size) % this.size;

    const s0 = this.buffer[idx0];
    const s1 = this.buffer[idx1];

    if (s0 === s1 || Math.abs(s1.t - s0.t) < 1e-15) {
      return { v: s0.v, i: s0.i };
    }

    const fraction = (targetT - s0.t) / (s1.t - s0.t);
    const clampedFrac = Math.max(0.0, Math.min(1.0, fraction));

    return {
      v: s0.v + clampedFrac * (s1.v - s0.v),
      i: s0.i + clampedFrac * (s1.i - s0.i),
    };
  }
}

export class BergeronLine1Ph {
  id: string;
  lengthKm: number;
  rPerKm: number;
  lPerKm: number;
  cPerKm: number;

  // Calculated distributed electrical parameters
  totalR: number;
  totalL: number;
  totalC: number;
  Zc: number;          // Characteristic surge impedance (Ohm)
  tau: number;         // Transit time delay (seconds)
  velocity: number;    // Wave propagation velocity (km/s)
  G_equiv: number;     // Equivalent Norton terminal conductance (S)
  hFactor: number;     // Lumped resistance attenuation factor

  // Ring buffers for wave transit history
  private sendBuffer: HistoryRingBuffer;
  private recvBuffer: HistoryRingBuffer;

  // Current Norton history injection values
  I_hist_send: number = 0.0;
  I_hist_recv: number = 0.0;

  constructor(id: string, params: ComponentParams) {
    this.id = id;
    this.lengthKm = Math.max(params.lengthKm ?? 100.0, 0.1);
    this.rPerKm = Math.max(params.R_per_km ?? 0.03, 1e-6);
    this.lPerKm = Math.max(params.L_per_km ?? 0.001, 1e-8); // H/km
    this.cPerKm = Math.max(params.C_per_km ?? 0.012e-6, 1e-12); // F/km

    this.totalR = this.rPerKm * this.lengthKm;
    this.totalL = this.lPerKm * this.lengthKm;
    this.totalC = this.cPerKm * this.lengthKm;

    this.Zc = Math.sqrt(this.totalL / this.totalC);
    this.tau = this.lengthKm * Math.sqrt(this.lPerKm * this.cPerKm);
    this.velocity = 1.0 / Math.sqrt(this.lPerKm * this.cPerKm);

    // Dommel lumped resistance approximation (R/4 at ends, R/2 in middle)
    const rQuarter = this.totalR / 4.0;
    this.G_equiv = 1.0 / (this.Zc + rQuarter);
    this.hFactor = (this.Zc - rQuarter) / (this.Zc + rQuarter);

    this.sendBuffer = new HistoryRingBuffer(10000);
    this.recvBuffer = new HistoryRingBuffer(10000);
  }

  reset(): void {
    this.sendBuffer.reset();
    this.recvBuffer.reset();
    this.I_hist_send = 0.0;
    this.I_hist_recv = 0.0;
  }

  /**
   * Update line parameters dynamically if user modifies inspector properties
   */
  updateParams(params: ComponentParams): void {
    this.lengthKm = Math.max(params.lengthKm ?? 100.0, 0.1);
    this.rPerKm = Math.max(params.R_per_km ?? 0.03, 1e-6);
    this.lPerKm = Math.max(params.L_per_km ?? 0.001, 1e-8);
    this.cPerKm = Math.max(params.C_per_km ?? 0.012e-6, 1e-12);

    this.totalR = this.rPerKm * this.lengthKm;
    this.totalL = this.lPerKm * this.lengthKm;
    this.totalC = this.cPerKm * this.lengthKm;

    this.Zc = Math.sqrt(this.totalL / this.totalC);
    this.tau = this.lengthKm * Math.sqrt(this.lPerKm * this.cPerKm);
    this.velocity = 1.0 / Math.sqrt(this.lPerKm * this.cPerKm);

    const rQuarter = this.totalR / 4.0;
    this.G_equiv = 1.0 / (this.Zc + rQuarter);
    this.hFactor = (this.Zc - rQuarter) / (this.Zc + rQuarter);
  }

  /**
   * Calculate Norton history injections for the current time-step t
   */
  computeHistoryInjections(t: number): { I_hist_send: number; I_hist_recv: number } {
    const targetT = t - this.tau;

    if (targetT <= 0) {
      this.I_hist_send = 0.0;
      this.I_hist_recv = 0.0;
      return { I_hist_send: 0.0, I_hist_recv: 0.0 };
    }

    // Historical values arriving from opposite ends
    const recvPast = this.recvBuffer.getAt(targetT);
    const sendPast = this.sendBuffer.getAt(targetT);

    // Dommel formulation with series resistance attenuation
    // Current entering line at terminal m (recv) traveling to k (send):
    // I_hist_k(t) = -(1 + h)/2 * [ (1/Zc') * V_m(t-tau) + I_m(t-tau) ] - (1 - h)/2 * [ (1/Zc') * V_k(t-tau) + I_k(t-tau) ]
    const Z_eff = this.Zc + this.totalR / 4.0;
    const invZ = 1.0 / Z_eff;

    const waveFromRecv = invZ * recvPast.v + recvPast.i;
    const waveFromSend = invZ * sendPast.v + sendPast.i;

    const factor1 = (1.0 + this.hFactor) / 2.0;
    const factor2 = (1.0 - this.hFactor) / 2.0;

    this.I_hist_send = -(factor1 * waveFromRecv + factor2 * waveFromSend);
    this.I_hist_recv = -(factor1 * waveFromSend + factor2 * waveFromRecv);

    return {
      I_hist_send: this.I_hist_send,
      I_hist_recv: this.I_hist_recv,
    };
  }

  /**
   * Record terminal voltages and currents computed at time t into ring buffers
   */
  recordTerminalStates(t: number, vSend: number, iSend: number, vRecv: number, iRecv: number): void {
    this.sendBuffer.push(t, vSend, iSend);
    this.recvBuffer.push(t, vRecv, iRecv);
  }

  getDiagnostics(): {
    Zc: number;
    tauMs: number;
    velocityKmS: number;
    delaySteps: number;
  } {
    return {
      Zc: this.Zc,
      tauMs: this.tau * 1000.0,
      velocityKmS: this.velocity,
      delaySteps: Math.round(this.tau / 5e-5),
    };
  }
}
