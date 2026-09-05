/**
 * PSCAD Modern - Fast Fourier Transform (FFT) & Harmonic Analyzer (TypeScript)
 */

import type { FftResult, HarmonicItem } from '../types';

export class HarmonicAnalyzer {
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

  static analyze(times: number[], values: number[], targetF0: number = 60): FftResult {
    if (!values || values.length < 32 || !times || times.length < 32) {
      return { thdPercent: 0, fundamentalMag: 0, harmonics: [], dcMag: 0, freqBinResolution: 1 };
    }

    const dtAvg = (times[times.length - 1] - times[0]) / (times.length - 1);
    const Fs = 1.0 / Math.max(1e-7, dtAvg);

    let N = 256;
    while (N * 2 <= values.length && N < 2048) {
      N *= 2;
    }

    const startIndex = values.length - N;
    const real = new Float64Array(N);
    const imag = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      const window = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / (N - 1)));
      real[i] = values[startIndex + i] * window;
      imag[i] = 0.0;
    }

    HarmonicAnalyzer.fft(real, imag);

    const freqBinResolution = Fs / N;
    const halfN = N >> 1;
    const magnitudes = new Float64Array(halfN);

    for (let i = 0; i < halfN; i++) {
      magnitudes[i] = (2.0 / N) * Math.hypot(real[i], imag[i]) * 2.0;
    }

    const dcMag = magnitudes[0] / 2.0;
    const fundBin = Math.max(1, Math.round(targetF0 / freqBinResolution));
    const fundamentalMag = magnitudes[fundBin] || 1e-9;

    const harmonics: HarmonicItem[] = [];
    let sumHarmonicsSq = 0.0;

    for (let h = 1; h <= 25; h++) {
      const targetFreq = h * targetF0;
      const bin = Math.round(targetFreq / freqBinResolution);
      if (bin < halfN) {
        const mag = magnitudes[bin] || 0.0;
        const percent = (mag / fundamentalMag) * 100.0;
        harmonics.push({
          order: h,
          freq: targetFreq,
          mag: mag,
          percent: h === 1 ? 100.0 : percent,
        });
        if (h > 1) {
          sumHarmonicsSq += mag * mag;
        }
      }
    }

    const thdPercent = (Math.sqrt(sumHarmonicsSq) / fundamentalMag) * 100.0;

    return {
      thdPercent: isNaN(thdPercent) ? 0 : thdPercent,
      fundamentalMag,
      harmonics,
      dcMag,
      freqBinResolution,
    };
  }
}
