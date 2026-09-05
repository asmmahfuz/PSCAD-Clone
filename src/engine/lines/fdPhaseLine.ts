/**
 * PSCAD Modern - Frequency-Dependent Phase Domain Line Model (FD-Phase / J.Marti)
 * 
 * Implements full frequency-dependent transmission line modeling with rational approximations
 * and time-domain recursive convolution:
 * 
 * - Rational approximation for Characteristic Admittance Y_c(s) = d + sum( c_k / (s - p_k) )
 * - Rational approximation for Propagation Matrix H(s) = exp(-s * tau) * sum( r_m / (s - q_m) )
 * - Time-domain recursive convolution at each time-step dt
 * - Captures lightning surge wavefront rounding, high-frequency attenuation, and dispersion
 * - Stamped as Norton companion circuit with dynamic history injections
 */

import { VectorFitter, type RationalModel, type Complex } from './vectorFitting';
import { HistoryRingBuffer } from './bergeronLine';
import type { ComponentParams } from '../../types';

export class FDPhaseLine {
  id: string;
  lengthKm: number;
  dt: number;

  // Electrical line parameters
  rPerKm: number;
  lPerKm: number;
  cPerKm: number;
  tau: number;
  velocity: number;

  // Rational fitted models for Yc(s) and H(s)
  ycModel: RationalModel;
  hModel: RationalModel;

  // Norton Equivalent Conductance (S)
  G_equiv: number = 0.0;

  // Recursive convolution state variables for Yc and H filter states
  private x_yc_send: number[] = [];
  private x_yc_recv: number[] = [];
  private x_h_send: number[] = [];
  private x_h_recv: number[] = [];

  // Delay ring buffers for forward traveling wave history
  private forwardWaveSendBuffer: HistoryRingBuffer;
  private forwardWaveRecvBuffer: HistoryRingBuffer;

  // Current Norton history injections
  I_hist_send: number = 0.0;
  I_hist_recv: number = 0.0;

  constructor(id: string, params: ComponentParams, dt: number = 5e-5) {
    this.id = id;
    this.dt = dt;
    this.lengthKm = Math.max(params.lengthKm ?? 100.0, 0.1);
    this.rPerKm = Math.max(params.R_per_km ?? 0.03, 1e-6);
    this.lPerKm = Math.max(params.L_per_km ?? 0.001, 1e-8);
    this.cPerKm = Math.max(params.C_per_km ?? 0.012e-6, 1e-12);

    this.tau = this.lengthKm * Math.sqrt(this.lPerKm * this.cPerKm);
    this.velocity = 1.0 / Math.sqrt(this.lPerKm * this.cPerKm);

    // Compute Vector Fitting rational models across 10 Hz to 1 MHz
    const fitData = this.synthesizeFrequencyData();
    this.ycModel = VectorFitter.fit(fitData.freqsHz, fitData.Yc_samples, 4, 3);
    this.hModel = VectorFitter.fit(fitData.freqsHz, fitData.H_samples, 4, 3);

    this.forwardWaveSendBuffer = new HistoryRingBuffer(10000);
    this.forwardWaveRecvBuffer = new HistoryRingBuffer(10000);

    this.initFilterStates();
    this.rebuildConductance();
  }

  private synthesizeFrequencyData(): {
    freqsHz: number[];
    Yc_samples: Complex[];
    H_samples: Complex[];
  } {
    const freqsHz: number[] = [];
    const Yc_samples: Complex[] = [];
    const H_samples: Complex[] = [];

    // 25 Logarithmically spaced frequency points from 10 Hz to 1 MHz
    for (let k = 0; k < 25; k++) {
      const f = 10.0 * Math.pow(1000000.0 / 10.0, k / 24.0);
      const w = 2.0 * Math.PI * f;

      // Skin effect frequency-dependent resistance: R(f) = R_dc * (1 + 0.1 * sqrt(f/60))
      const R_f = this.rPerKm * (1.0 + 0.15 * Math.sqrt(f / 60.0));
      const Z_series: Complex = { re: R_f, im: w * this.lPerKm };
      const Y_shunt: Complex = { re: 1e-9, im: w * this.cPerKm };

      // Propagation constant gamma = sqrt(Z * Y)
      // Characteristic impedance Zc = sqrt(Z / Y) -> Yc = 1 / Zc = sqrt(Y / Z)
      const Z_mag = Math.sqrt(Z_series.re * Z_series.re + Z_series.im * Z_series.im);
      const Z_ang = Math.atan2(Z_series.im, Z_series.re);

      const Y_mag = Math.sqrt(Y_shunt.re * Y_shunt.re + Y_shunt.im * Y_shunt.im);
      const Y_ang = Math.atan2(Y_shunt.im, Y_shunt.re);

      const Yc_mag = Math.sqrt(Y_mag / Z_mag);
      const Yc_ang = (Y_ang - Z_ang) / 2.0;

      const gamma_mag = Math.sqrt(Z_mag * Y_mag);
      const gamma_ang = (Z_ang + Y_ang) / 2.0;
      const alpha = gamma_mag * Math.cos(gamma_ang); // Attenuation (Np/km)
      const beta = gamma_mag * Math.sin(gamma_ang);  // Phase constant (rad/km)

      // H(w) = exp(-gamma * length) / exp(-j * w * tau)
      const H_mag = Math.exp(-alpha * this.lengthKm);
      const H_ang = -(beta * this.lengthKm - w * this.tau);

      freqsHz.push(f);
      Yc_samples.push({
        re: Yc_mag * Math.cos(Yc_ang),
        im: Yc_mag * Math.sin(Yc_ang),
      });
      H_samples.push({
        re: H_mag * Math.cos(H_ang),
        im: H_mag * Math.sin(H_ang),
      });
    }

    return { freqsHz, Yc_samples, H_samples };
  }

  private initFilterStates(): void {
    this.x_yc_send = new Array(this.ycModel.poles.length).fill(0.0);
    this.x_yc_recv = new Array(this.ycModel.poles.length).fill(0.0);
    this.x_h_send = new Array(this.hModel.poles.length).fill(0.0);
    this.x_h_recv = new Array(this.hModel.poles.length).fill(0.0);
  }

  rebuildConductance(): void {
    // Companion Norton Conductance: G = d + sum( (c_k * dt / 2) / (1 - p_k * dt / 2) )
    let G = this.ycModel.d;
    for (let k = 0; k < this.ycModel.poles.length; k++) {
      const p = this.ycModel.poles[k].re;
      const c = this.ycModel.residues[k].re;
      const denom = 1.0 - (p * this.dt) / 2.0;
      G += (c * this.dt * 0.5) / denom;
    }
    this.G_equiv = Math.max(G, 1e-4);
  }

  reset(): void {
    this.initFilterStates();
    this.forwardWaveSendBuffer.reset();
    this.forwardWaveRecvBuffer.reset();
    this.I_hist_send = 0.0;
    this.I_hist_recv = 0.0;
  }

  /**
   * Compute Norton History Injections at time t using recursive convolution
   */
  computeHistoryInjections(t: number): { I_hist_send: number; I_hist_recv: number } {
    const targetT = t - this.tau;

    let arrivingWaveAtSend = 0.0;
    let arrivingWaveAtRecv = 0.0;

    if (targetT > 0) {
      // Arriving forward waves from past travel delay
      const pastSend = this.forwardWaveSendBuffer.getAt(targetT);
      const pastRecv = this.forwardWaveRecvBuffer.getAt(targetT);

      // Filter through H(s) rational model (high-frequency surge smoothing & attenuation)
      arrivingWaveAtSend = this.filterWithH(pastRecv.v, this.x_h_send);
      arrivingWaveAtRecv = this.filterWithH(pastSend.v, this.x_h_recv);
    }

    // Yc recursive convolution history terms
    let yc_hist_send = 0.0;
    let yc_hist_recv = 0.0;

    for (let k = 0; k < this.ycModel.poles.length; k++) {
      const p = this.ycModel.poles[k].re;
      const alpha = (1.0 + (p * this.dt) / 2.0) / (1.0 - (p * this.dt) / 2.0);
      yc_hist_send += alpha * this.x_yc_send[k];
      yc_hist_recv += alpha * this.x_yc_recv[k];
    }

    this.I_hist_send = -(2.0 * arrivingWaveAtSend + yc_hist_send);
    this.I_hist_recv = -(2.0 * arrivingWaveAtRecv + yc_hist_recv);

    return {
      I_hist_send: this.I_hist_send,
      I_hist_recv: this.I_hist_recv,
    };
  }

  private filterWithH(inputVal: number, stateArray: number[]): number {
    let out = this.hModel.d * inputVal;
    for (let m = 0; m < this.hModel.poles.length; m++) {
      const p = this.hModel.poles[m].re;
      const r = this.hModel.residues[m].re;
      const alpha = (1.0 + (p * this.dt) / 2.0) / (1.0 - (p * this.dt) / 2.0);
      const beta = (r * this.dt) / (1.0 - (p * this.dt) / 2.0);

      out += stateArray[m] + beta * inputVal;
      stateArray[m] = alpha * stateArray[m] + beta * inputVal;
    }
    return out;
  }

  /**
   * Record terminal states and update recursive convolution filter memories
   */
  recordTerminalStates(t: number, vSend: number, iSend: number, vRecv: number, iRecv: number): void {
    // Forward wave entering sending end: f_send = v_send + Zc * i_send
    const Zc_base = 1.0 / this.G_equiv;
    const f_send = vSend + Zc_base * iSend;
    const f_recv = vRecv + Zc_base * iRecv;

    this.forwardWaveSendBuffer.push(t, f_send, iSend);
    this.forwardWaveRecvBuffer.push(t, f_recv, iRecv);

    // Update Yc recursive states with terminal voltages
    for (let k = 0; k < this.ycModel.poles.length; k++) {
      const p = this.ycModel.poles[k].re;
      const c = this.ycModel.residues[k].re;
      const beta = (c * this.dt) / (1.0 - (p * this.dt) / 2.0);

      this.x_yc_send[k] += beta * vSend;
      this.x_yc_recv[k] += beta * vRecv;
    }
  }

  getDiagnostics(): {
    Zc_equiv: number;
    tauMs: number;
    ycRmsError: number;
    hRmsError: number;
    poleCount: number;
  } {
    return {
      Zc_equiv: 1.0 / this.G_equiv,
      tauMs: this.tau * 1000.0,
      ycRmsError: this.ycModel.rmsError,
      hRmsError: this.hModel.rmsError,
      poleCount: this.ycModel.poles.length,
    };
  }
}
