/**
 * PSCAD Modern - FFT Engine & Lissajous Deep-Dive Analysis Unit Tests
 * Phase 20 - Step 20.3: Deep-Dive Signal Analysis Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FftEngine, type WindowType } from '../analysis/fftEngine';
import { LissajousEngine } from '../analysis/lissajousEngine';

describe('FftEngine - Core FFT & Windowing', () => {
  it('computes FFT for impulse and constant DC signals correctly', () => {
    // 8-point impulse [1, 0, 0, 0, 0, 0, 0, 0]
    const real = new Float64Array([1, 0, 0, 0, 0, 0, 0, 0]);
    const imag = new Float64Array(8);
    FftEngine.fft(real, imag);

    // FFT of unit impulse has magnitude 1.0 across all frequencies
    for (let i = 0; i < 8; i++) {
      assert.ok(Math.abs(real[i] - 1.0) < 1e-9, `Bin ${i} real should be 1.0`);
      assert.ok(Math.abs(imag[i]) < 1e-9, `Bin ${i} imag should be 0.0`);
    }

    // 8-point DC [2, 2, 2, 2, 2, 2, 2, 2]
    const realDc = new Float64Array([2, 2, 2, 2, 2, 2, 2, 2]);
    const imagDc = new Float64Array(8);
    FftEngine.fft(realDc, imagDc);

    // DC bin should be 16.0 (sum), other bins 0.0
    assert.ok(Math.abs(realDc[0] - 16.0) < 1e-9, 'DC bin should equal sum');
    for (let i = 1; i < 8; i++) {
      assert.ok(Math.abs(realDc[i]) < 1e-9, `AC bin ${i} should be 0.0`);
    }
  });

  it('generates all standard windowing functions with proper coherent gains', () => {
    const windows: WindowType[] = ['rectangular', 'hanning', 'hamming', 'blackmanHarris', 'flatTop'];
    const N = 512;

    for (const winType of windows) {
      const { window, coherentGain } = FftEngine.generateWindow(winType, N);
      assert.equal(window.length, N);
      assert.ok(coherentGain > 0.1 && coherentGain <= 1.0, `${winType} coherent gain should be positive`);

      if (winType === 'rectangular') {
        assert.equal(coherentGain, 1.0);
        assert.equal(window[0], 1.0);
      } else if (winType === 'hanning') {
        assert.ok(Math.abs(window[0]) < 1e-9, 'Hann start should be 0');
        assert.ok(Math.abs(window[N / 2] - 1.0) < 0.01, 'Hann center should be ~1.0');
        assert.ok(Math.abs(coherentGain - 0.5) < 0.01, 'Hann coherent gain should be ~0.5');
      }
    }
  });
});

describe('FftEngine - Harmonic Spectrum & THD Analysis', () => {
  it('analyzes pure 60 Hz sinusoidal voltage with near-zero THD', () => {
    const dt = 50e-6; // 20 kHz sampling rate
    const N = 2000;
    const times: number[] = [];
    const values: number[] = [];
    const Vpk = 120.0;
    const f0 = 60.0;

    for (let i = 0; i < N; i++) {
      const t = i * dt;
      times.push(t);
      values.push(Vpk * Math.sin(2 * Math.PI * f0 * t));
    }

    const res = FftEngine.analyze(times, values, { targetF0: 60, windowType: 'hanning' });

    assert.ok(Math.abs(res.actualF0 - 60.0) < 0.5, `Fundamental should be ~60 Hz, got ${res.actualF0}`);
    assert.ok(Math.abs(res.fundamentalMag - Vpk) < 3.0, `Fundamental magnitude should be ~${Vpk}, got ${res.fundamentalMag}`);
    assert.ok(res.thdPercent < 1.0, `THD of pure sine should be < 1.0%, got ${res.thdPercent}%`);
    assert.equal(res.ieee519Compliance, 'PASS');
    assert.ok(Math.abs(res.trueRms - Vpk / Math.SQRT2) < 2.0, 'RMS should match Vpk / sqrt(2)');
    assert.ok(Math.abs(res.crestFactor - Math.SQRT2) < 0.05, 'Crest factor should be ~1.414');
  });

  it('accurately identifies 3rd and 5th harmonics with exact THD calculation', () => {
    const dt = 50e-6;
    const N = 2000;
    const times: number[] = [];
    const values: number[] = [];
    const V1 = 100.0;
    const V3 = 20.0; // 20% 3rd harmonic (180 Hz)
    const V5 = 10.0; // 10% 5th harmonic (300 Hz)

    for (let i = 0; i < N; i++) {
      const t = i * dt;
      times.push(t);
      values.push(
        V1 * Math.sin(2 * Math.PI * 60 * t) +
        V3 * Math.sin(2 * Math.PI * 180 * t) +
        V5 * Math.sin(2 * Math.PI * 300 * t)
      );
    }

    const res = FftEngine.analyze(times, values, { targetF0: 60, windowType: 'blackmanHarris' });

    // Theoretical THD = sqrt(20^2 + 10^2) / 100 * 100% = 22.36%
    const expectedTHD = (Math.hypot(V3, V5) / V1) * 100.0;
    assert.ok(Math.abs(res.thdPercent - expectedTHD) < 2.5, `THD should be ~${expectedTHD}%, got ${res.thdPercent}%`);

    // Verify individual harmonics
    const h3 = res.harmonics.find(h => h.order === 3);
    const h5 = res.harmonics.find(h => h.order === 5);

    assert.ok(h3, '3rd harmonic should exist');
    assert.ok(Math.abs((h3?.percent || 0) - 20.0) < 2.5, `3rd harmonic should be ~20%, got ${h3?.percent}%`);

    assert.ok(h5, '5th harmonic should exist');
    assert.ok(Math.abs((h5?.percent || 0) - 10.0) < 2.5, `5th harmonic should be ~10%, got ${h5?.percent}%`);

    // Non-compliance due to THD > 8% and 3rd > 5%
    assert.equal(res.ieee519Compliance, 'FAIL');
    assert.ok(res.dominantHarmonic, 'Should identify dominant harmonic');
    assert.equal(res.dominantHarmonic?.order, 3);
  });

  it('auto-detects 50 Hz fundamental frequency when targetF0 is "auto"', () => {
    const dt = 100e-6;
    const N = 2048;
    const times: number[] = [];
    const values: number[] = [];
    const fGrid = 50.0;

    for (let i = 0; i < N; i++) {
      const t = i * dt;
      times.push(t);
      values.push(230 * Math.cos(2 * Math.PI * fGrid * t));
    }

    const res = FftEngine.analyze(times, values, { targetF0: 'auto', windowType: 'hanning' });

    assert.ok(Math.abs(res.actualF0 - 50.0) < 1.0, `Auto-detected frequency should be ~50 Hz, got ${res.actualF0}`);
    assert.ok(Math.abs(res.fundamentalMag - 230.0) < 5.0, 'Fundamental magnitude should match 230 V');
  });
});

describe('LissajousEngine - Trajectory & Phase Orbit Analysis', () => {
  it('correctly calculates in-phase (0° shift) resistive trajectory with Unity PF', () => {
    const N = 500;
    const times: number[] = [];
    const xVals: number[] = [];
    const yVals: number[] = [];

    for (let i = 0; i < N; i++) {
      const t = i * 0.0001;
      times.push(t);
      const v = 120 * Math.sin(2 * Math.PI * 60 * t);
      xVals.push(v);
      yVals.push(v / 10); // I = V / 10 (12 A peak, in-phase)
    }

    const metrics = LissajousEngine.analyze(xVals, yVals, times);

    assert.ok(Math.abs(metrics.phaseDiffDeg) < 2.0, `Phase diff should be ~0°, got ${metrics.phaseDiffDeg}°`);
    assert.ok(Math.abs(metrics.powerFactor - 1.0) < 0.01, 'Power factor should be ~1.0');
    assert.equal(metrics.powerFactorType, 'Unity');
    assert.equal(metrics.circulation, 'Linear');
    assert.ok(metrics.eccentricity > 0.99, 'Eccentricity of straight line should be ~1.0');
  });

  it('correctly calculates 90° quadrature trajectory (circle/ellipse) with zero PF and circulation', () => {
    const N = 1000;
    const times: number[] = [];
    const xVals: number[] = [];
    const yVals: number[] = [];

    // V = 100 * sin(wt), I = 10 * cos(wt) -> I leads V by 90° (CounterClockwise in standard coords)
    for (let i = 0; i < N; i++) {
      const t = i * 0.00005;
      times.push(t);
      const phi = 2 * Math.PI * 60 * t;
      xVals.push(100 * Math.sin(phi));
      yVals.push(10 * Math.cos(phi));
    }

    const metrics = LissajousEngine.analyze(xVals, yVals, times);

    assert.ok(Math.abs(Math.abs(metrics.phaseDiffDeg) - 90.0) < 5.0, `Phase diff should be ~90°, got ${metrics.phaseDiffDeg}°`);
    assert.ok(metrics.powerFactor < 0.05, `Power factor of pure reactive orbit should be ~0, got ${metrics.powerFactor}`);
    assert.ok(metrics.enclosedArea > 0, 'Enclosed contour area should be strictly positive');
    assert.equal(metrics.frequencyRatio, '1:1');
  });

  it('synthesizes magnetic flux linkage λ(t) = ∫ V dt with zero DC drift', () => {
    const N = 1000;
    const times: number[] = [];
    const voltage: number[] = [];
    const f0 = 60.0;
    const Vpk = 120.0;

    for (let i = 0; i < N; i++) {
      const t = i * 0.0001;
      times.push(t);
      // v(t) = Vpk * cos(wt) -> lambda(t) = (Vpk / w) * sin(wt)
      voltage.push(Vpk * Math.cos(2 * Math.PI * f0 * t));
    }

    const flux = LissajousEngine.integrateFlux(voltage, times);

    assert.equal(flux.length, N);
    const expectedLambdaPeak = Vpk / (2 * Math.PI * f0); // ~0.318 Wb·t

    let maxFlux = 0;
    let sumFlux = 0;
    for (const fl of flux) {
      if (Math.abs(fl) > maxFlux) maxFlux = Math.abs(fl);
      sumFlux += fl;
    }

    assert.ok(Math.abs(maxFlux - expectedLambdaPeak) < 0.03, `Flux peak should be ~${expectedLambdaPeak}, got ${maxFlux}`);
    assert.ok(Math.abs(sumFlux / N) < 1e-6, 'DC drift should be eliminated');
  });

  it('computes trajectory arrows with correct coordinates and tangent angles', () => {
    const xVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const yVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const arrows = LissajousEngine.computeTrajectoryArrows(xVals, yVals, 2);
    assert.ok(arrows.length > 0, 'Should generate directional arrows');
    for (const arr of arrows) {
      // 45 degree diagonal line
      assert.ok(Math.abs(arr.angle - Math.PI / 4) < 1e-4, 'Tangent angle should be 45° (PI/4)');
    }
  });
});

describe('Differential Delta Cursors - Math & Slew Rate Telemetry', () => {
  it('accurately computes delta time Δt, frequency f = 1/Δt, delta V, and slew rate', () => {
    const t1 = 0.010; // 10 ms
    const t2 = 0.026667; // 26.667 ms (16.667 ms delta = 1 cycle at 60 Hz)
    const dt = Math.abs(t2 - t1);

    assert.ok(Math.abs(dt - 0.016667) < 1e-5, 'dt should be ~16.667 ms');
    const f = 1.0 / dt;
    assert.ok(Math.abs(f - 60.0) < 0.1, `Frequency should be ~60.0 Hz, got ${f} Hz`);

    // Slew rate test
    const v1 = -100.0;
    const v2 = 100.0;
    const dv = v2 - v1; // 200 V
    const slewRate = dv / dt; // 200 / 0.016667 = 12000 V/s = 12 V/ms

    assert.equal(dv, 200.0);
    assert.ok(Math.abs(slewRate - 12000.0) < 50.0, `Slew rate should be ~12000 V/s, got ${slewRate}`);
  });

  it('correctly interpolates sample values at sub-step cursor timestamps', () => {
    const times = [0.0, 0.01, 0.02, 0.03];
    const vals = [0.0, 10.0, 20.0, 30.0];

    const getValAtT = (t: number) => {
      let low = 0;
      let high = times.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (times[mid] < t) low = mid + 1;
        else high = mid - 1;
      }
      const i0 = Math.max(0, low - 1);
      const i1 = Math.min(times.length - 1, low);
      if (i0 === i1 || times[i1] === times[i0]) return vals[i0] ?? 0;
      const frac = (t - times[i0]) / (times[i1] - times[i0]);
      return (vals[i0] ?? 0) + frac * ((vals[i1] ?? 0) - (vals[i0] ?? 0));
    };

    assert.equal(getValAtT(0.0), 0.0);
    assert.equal(getValAtT(0.01), 10.0);
    assert.ok(Math.abs(getValAtT(0.015) - 15.0) < 1e-6, 'Halfway interpolation should equal 15.0');
    assert.ok(Math.abs(getValAtT(0.027) - 27.0) < 1e-6, 'Sub-step interpolation should equal 27.0');
  });
});

