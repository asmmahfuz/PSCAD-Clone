/**
 * PSCAD CLONE - Laboratory Fast Fourier Transform (FFT) & Harmonic Spectrum Engine
 * Phase 20 - Step 20.3: Deep-Dive Signal Analysis Suite
 */

import type { FftResult, HarmonicItem } from '../types';

export type WindowType = 'rectangular' | 'hanning' | 'hamming' | 'blackmanHarris' | 'flatTop';

export interface DetailedHarmonicItem extends HarmonicItem {
  phaseDeg: number;
  dbMag: number; // dB relative to fundamental
  rmsMag: number; // RMS magnitude (peak / sqrt(2))
}

export interface DetailedFftResult extends FftResult {
  harmonics: DetailedHarmonicItem[];
  thdRelativeRms: number; // THD-R (%)
  trueRms: number;
  peakMag: number;
  crestFactor: number;
  dominantHarmonic?: DetailedHarmonicItem;
  ieee519Compliance: 'PASS' | 'WARN' | 'FAIL';
  windowType: WindowType;
  actualF0: number;
  spectralBins: { freq: number; mag: number }[];
}

export interface FftAnalysisOptions {
  targetF0?: number | 'auto';
  windowType?: WindowType;
  maxOrder?: number;
  fftSize?: number;
}

export class FftEngine {
  /**
   * In-place Radix-2 Cooley-Tukey Fast Fourier Transform
   */
  static fft(real: Float64Array, imag: Float64Array): void {
    const n = real.length;
    if (n <= 1) return;

    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let temp = real[i]; real[i] = real[j]; real[j] = temp;
        temp = imag[i]; imag[i] = imag[j]; imag[j] = temp;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    for (let len = 2; len <= n; len <<= 1) {
      const angle = (-2.0 * Math.PI) / len;
      const wlen_r = Math.cos(angle);
      const wlen_i = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let w_r = 1.0;
        let w_i = 0.0;
        for (let k = 0; k < (len >> 1); k++) {
          const u_r = real[i + k];
          const u_i = imag[i + k];
          const v_r = real[i + k + (len >> 1)] * w_r - imag[i + k + (len >> 1)] * w_i;
          const v_i = real[i + k + (len >> 1)] * w_i + imag[i + k + (len >> 1)] * w_r;

          real[i + k] = u_r + v_r;
          imag[i + k] = u_i + v_i;
          real[i + k + (len >> 1)] = u_r - v_r;
          imag[i + k + (len >> 1)] = u_i - v_i;

          const next_w_r = w_r * wlen_r - w_i * wlen_i;
          w_i = w_r * wlen_i + w_i * wlen_r;
          w_r = next_w_r;
        }
      }
    }
  }

  /**
   * Generate window coefficients and coherent gain correction factor
   */
  static generateWindow(type: WindowType, n: number): { window: Float64Array; coherentGain: number } {
    const w = new Float64Array(n);
    let sum = 0.0;

    switch (type) {
      case 'rectangular':
        w.fill(1.0);
        sum = n;
        break;

      case 'hamming':
        for (let i = 0; i < n; i++) {
          w[i] = 0.54 - 0.46 * Math.cos((2.0 * Math.PI * i) / (n - 1));
          sum += w[i];
        }
        break;

      case 'blackmanHarris': {
        const a0 = 0.35875;
        const a1 = 0.48829;
        const a2 = 0.14128;
        const a3 = 0.01168;
        for (let i = 0; i < n; i++) {
          const phi = (2.0 * Math.PI * i) / (n - 1);
          w[i] = a0 - a1 * Math.cos(phi) + a2 * Math.cos(2 * phi) - a3 * Math.cos(3 * phi);
          sum += w[i];
        }
        break;
      }

      case 'flatTop': {
        const a0 = 0.21557895;
        const a1 = 0.41663158;
        const a2 = 0.277263158;
        const a3 = 0.083578947;
        const a4 = 0.006947368;
        for (let i = 0; i < n; i++) {
          const phi = (2.0 * Math.PI * i) / (n - 1);
          w[i] = a0 - a1 * Math.cos(phi) + a2 * Math.cos(2 * phi) - a3 * Math.cos(3 * phi) + a4 * Math.cos(4 * phi);
          sum += w[i];
        }
        break;
      }

      case 'hanning':
      default:
        for (let i = 0; i < n; i++) {
          w[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (n - 1)));
          sum += w[i];
        }
        break;
    }

    const coherentGain = sum / n;
    return { window: w, coherentGain };
  }

  /**
   * Deep-dive laboratory harmonic analysis
   */
  static analyze(
    times: number[],
    values: number[],
    options: FftAnalysisOptions = {}
  ): DetailedFftResult {
    const {
      targetF0 = 60,
      windowType = 'hanning',
      maxOrder = 50,
      fftSize,
    } = options;

    if (!values || values.length < 32 || !times || times.length < 32) {
      return {
        thdPercent: 0,
        fundamentalMag: 0,
        harmonics: [],
        dcMag: 0,
        freqBinResolution: 1,
        thdRelativeRms: 0,
        trueRms: 0,
        peakMag: 0,
        crestFactor: 0,
        ieee519Compliance: 'PASS',
        windowType,
        actualF0: typeof targetF0 === 'number' ? targetF0 : 60,
        spectralBins: [],
      };
    }

    const len = Math.min(times.length, values.length);
    const dtAvg = (times[len - 1] - times[0]) / (len - 1);
    const Fs = 1.0 / Math.max(1e-9, dtAvg);

    // Calculate time-domain metrics
    let sumSq = 0.0;
    let sumVal = 0.0;
    let peakVal = 0.0;
    for (let i = 0; i < len; i++) {
      const v = values[i];
      const absV = Math.abs(v);
      sumVal += v;
      sumSq += v * v;
      if (absV > peakVal) peakVal = absV;
    }
    const trueRms = Math.sqrt(sumSq / len);
    const dcDirect = sumVal / len;

    // Determine optimal FFT power-of-2 size
    let N = 256;
    if (fftSize && (fftSize & (fftSize - 1)) === 0) {
      N = fftSize;
    } else {
      while (N * 2 <= len && N < 4096) {
        N *= 2;
      }
    }

    const startIndex = Math.max(0, len - N);
    const sampleCount = Math.min(N, len - startIndex);

    const { window, coherentGain } = this.generateWindow(windowType, sampleCount);

    const real = new Float64Array(N);
    const imag = new Float64Array(N);

    for (let i = 0; i < sampleCount; i++) {
      real[i] = values[startIndex + i] * window[i];
      imag[i] = 0.0;
    }

    // Run Radix-2 FFT
    this.fft(real, imag);

    const freqBinResolution = Fs / N;
    const halfN = N >> 1;
    const magnitudes = new Float64Array(halfN);
    const phases = new Float64Array(halfN);

    // Coherent gain normalization for single-sided peak spectrum
    const norm = 2.0 / (sampleCount * Math.max(1e-6, coherentGain));

    for (let i = 0; i < halfN; i++) {
      magnitudes[i] = Math.hypot(real[i], imag[i]) * norm;
      phases[i] = (Math.atan2(imag[i], real[i]) * 180.0) / Math.PI;
    }

    const dcMag = magnitudes[0] * 0.5; // DC bin doesn't double in single-sided spectrum

    // Determine fundamental frequency f0
    let f0 = 60;
    if (targetF0 === 'auto') {
      // Find highest peak in 10 Hz - 1000 Hz range
      let maxMag = 0.0;
      let bestBin = 1;
      const minBin = Math.max(1, Math.round(10 / freqBinResolution));
      const maxBin = Math.min(halfN - 1, Math.round(1000 / freqBinResolution));
      for (let b = minBin; b <= maxBin; b++) {
        if (magnitudes[b] > maxMag) {
          maxMag = magnitudes[b];
          bestBin = b;
        }
      }
      f0 = bestBin * freqBinResolution;
    } else {
      f0 = targetF0;
    }

    // Find fundamental peak near f0 using parabolic peak interpolation
    const fundNominalBin = Math.max(1, Math.round(f0 / freqBinResolution));
    let fundBin = fundNominalBin;
    let maxNearFund = 0.0;
    const searchRange = Math.max(1, Math.round(3 / freqBinResolution));
    for (let b = Math.max(1, fundNominalBin - searchRange); b <= Math.min(halfN - 1, fundNominalBin + searchRange); b++) {
      if (magnitudes[b] > maxNearFund) {
        maxNearFund = magnitudes[b];
        fundBin = b;
      }
    }

    // Parabolic interpolation for sub-bin peak accuracy
    let fundamentalMag = maxNearFund;
    let exactF0 = fundBin * freqBinResolution;
    if (fundBin > 1 && fundBin < halfN - 1) {
      const alpha = magnitudes[fundBin - 1];
      const beta = magnitudes[fundBin];
      const gamma = magnitudes[fundBin + 1];
      const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma + 1e-12);
      if (Math.abs(p) < 1.0) {
        exactF0 = (fundBin + p) * freqBinResolution;
        fundamentalMag = beta - 0.25 * (alpha - gamma) * p;
      }
    }

    fundamentalMag = Math.max(1e-12, fundamentalMag);

    // Extract harmonics
    const harmonics: DetailedHarmonicItem[] = [];
    let sumHarmonicsSq = 0.0;
    let dominantHarmonic: DetailedHarmonicItem | undefined;
    let maxHarmonicMag = 0.0;

    const limitOrders = Math.min(maxOrder, 50);
    const noiseFloor = fundamentalMag * 0.004; // 0.4% noise/leakage rejection threshold

    for (let h = 1; h <= limitOrders; h++) {
      const targetFreq = h * exactF0;
      const nominalBin = Math.round(targetFreq / freqBinResolution);
      if (nominalBin >= halfN) break;

      // Determine if a distinct local peak exists near the harmonic bin
      let isLocalPeak = false;
      let peakBin = nominalBin;
      let peakMag = magnitudes[nominalBin] || 0.0;

      const searchSpan = Math.max(1, Math.min(2, Math.round(0.4 * exactF0 / freqBinResolution)));
      const minB = Math.max(2, nominalBin - searchSpan);
      const maxB = Math.min(halfN - 2, nominalBin + searchSpan);

      // Check for local peak
      for (let b = minB; b <= maxB; b++) {
        if (magnitudes[b] >= magnitudes[b - 1] && magnitudes[b] >= magnitudes[b + 1]) {
          if (magnitudes[b] > peakMag) {
            peakMag = magnitudes[b];
            peakBin = b;
            isLocalPeak = true;
          }
        }
      }

      // Parabolic sub-bin interpolation if distinct peak detected
      if (isLocalPeak && peakBin > 1 && peakBin < halfN - 1) {
        const alpha = magnitudes[peakBin - 1];
        const beta = magnitudes[peakBin];
        const gamma = magnitudes[peakBin + 1];
        const denom = alpha - 2 * beta + gamma;
        if (Math.abs(denom) > 1e-12) {
          const p = 0.5 * (alpha - gamma) / denom;
          if (Math.abs(p) < 1.0) {
            peakMag = beta - 0.25 * (alpha - gamma) * p;
          }
        }
      } else {
        // Evaluate at nominal bin
        peakMag = magnitudes[nominalBin] || 0.0;
      }

      const percent = (peakMag / fundamentalMag) * 100.0;
      const dbMag = 20.0 * Math.log10(Math.max(1e-9, peakMag / fundamentalMag));
      const phaseDeg = phases[peakBin] || 0.0;
      const rmsMag = peakMag / Math.SQRT2;

      const item: DetailedHarmonicItem = {
        order: h,
        freq: Math.round(exactF0 * h * 10) / 10,
        mag: peakMag,
        percent: h === 1 ? 100.0 : percent,
        phaseDeg,
        dbMag: h === 1 ? 0.0 : dbMag,
        rmsMag,
      };

      harmonics.push(item);

      if (h > 1) {
        // Only count harmonics that represent true spectral peaks or exceed instrument noise floor
        if (isLocalPeak || peakMag > noiseFloor) {
          sumHarmonicsSq += peakMag * peakMag;
        }
        if (peakMag > maxHarmonicMag && (isLocalPeak || peakMag > noiseFloor)) {
          maxHarmonicMag = peakMag;
          dominantHarmonic = item;
        }
      }
    }

    const thdPercent = (Math.sqrt(sumHarmonicsSq) / fundamentalMag) * 100.0;
    const thdRelativeRms = trueRms > 1e-9 ? (Math.sqrt(sumHarmonicsSq / 2.0) / trueRms) * 100.0 : 0.0;
    const crestFactor = trueRms > 1e-9 ? peakVal / trueRms : 1.0;

    // IEEE 519 Grid Compliance Assessment (Standard for <= 1 kV: THD <= 8%, individual <= 5%)
    let ieee519Compliance: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (thdPercent > 8.0 || (dominantHarmonic && dominantHarmonic.percent > 5.0)) {
      ieee519Compliance = 'FAIL';
    } else if (thdPercent > 5.0 || (dominantHarmonic && dominantHarmonic.percent > 3.0)) {
      ieee519Compliance = 'WARN';
    }

    // Downsample spectral bins for UI visualization (e.g. 128 bins)
    const spectralBins: { freq: number; mag: number }[] = [];
    const binStep = Math.max(1, Math.floor(halfN / 128));
    for (let b = 0; b < halfN; b += binStep) {
      spectralBins.push({
        freq: b * freqBinResolution,
        mag: magnitudes[b],
      });
    }

    return {
      thdPercent: isNaN(thdPercent) ? 0 : thdPercent,
      fundamentalMag,
      harmonics,
      dcMag: isNaN(dcMag) ? dcDirect : dcMag,
      freqBinResolution,
      thdRelativeRms: isNaN(thdRelativeRms) ? 0 : thdRelativeRms,
      trueRms,
      peakMag: peakVal,
      crestFactor: isNaN(crestFactor) ? 1.414 : crestFactor,
      dominantHarmonic,
      ieee519Compliance,
      windowType,
      actualF0: exactF0,
      spectralBins,
    };
  }
}
