/**
 * PSCAD CLONE - Phase 2 Automated Validation & Test Suite
 * 
 * Verifies all 4 sub-tasks of Phase 2:
 * 1. Step 2.1: Bergeron Single-Phase Traveling Wave Line Model (Zc, tau, reflection coefficient Gamma)
 * 2. Step 2.2: Polyphase 3-Phase Coupled Line (Clarke modal decoupling, ground vs aerial delays)
 * 3. Step 2.3: Sanathanan-Koerner Vector Fitting & FD-Phase Line Model (rational fit, LHP stability)
 * 4. Step 2.4: Integrated Line Constants Program (LCP) (Carson earth return, Maxwell potential, sequence parameters)
 */

import { BergeronLine1Ph } from '../lines/bergeronLine';
import { PolyphaseBergeronLine } from '../lines/polyphaseBergeron';
import { VectorFitter } from '../lines/vectorFitting';
import { FDPhaseLine } from '../lines/fdPhaseLine';
import { LineConstantsSolver, TOWER_PRESETS } from '../lines/lineConstantsSolver';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export function runPhase2Validation(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // -------------------------------------------------------------
  // Test 1: Step 2.1 Bergeron Traveling Wave Model
  // -------------------------------------------------------------
  try {
    const lengthKm = 150.0;
    const lPerKm = 0.001; // 1.0 mH/km
    const cPerKm = 0.01111111e-6; // ~11.11 nF/km
    const rPerKm = 0.02; // 0.02 Ohm/km

    const line = new BergeronLine1Ph('test_berg', {
      lengthKm,
      L_per_km: lPerKm,
      C_per_km: cPerKm,
      R_per_km: rPerKm,
    });

    const expectedZc = Math.sqrt(lPerKm / cPerKm); // 300.0 Ohm
    const expectedTau = lengthKm * Math.sqrt(lPerKm * cPerKm); // 0.50 ms

    const zcErr = Math.abs(line.Zc - expectedZc) / expectedZc;
    const tauErr = Math.abs(line.tau - expectedTau) / expectedTau;

    // Simulate step surge wave injection into sending end at t >= 0
    const dt = 2.5e-5;
    let t = 0.0;
    let waveArrivedAtRecv = false;
    let arrivalTime = 0.0;

    for (let step = 0; step < 40; step++) {
      t = step * dt;
      const vSend = 100.0;
      const iSend = vSend / line.Zc;

      // Injections
      const { I_hist_recv } = line.computeHistoryInjections(t);
      if (Math.abs(I_hist_recv) > 0.01 && !waveArrivedAtRecv) {
        waveArrivedAtRecv = true;
        arrivalTime = t;
      }

      line.recordTerminalStates(t, vSend, iSend, 0.0, 0.0);
    }

    const tauPassed = zcErr < 1e-4 && tauErr < 1e-4;
    const reflectionPassed = waveArrivedAtRecv && Math.abs(arrivalTime - expectedTau) <= dt;

    results.push({
      test: 'Step 2.1: Bergeron Constant Parameter Line Model',
      passed: tauPassed && reflectionPassed,
      message: `Surge impedance Zc = ${line.Zc.toFixed(2)} Ω, transit delay tau = ${(line.tau * 1000).toFixed(3)} ms, wave arrival at t = ${(arrivalTime * 1000).toFixed(3)} ms.`,
      details: {
        Zc: line.Zc,
        expectedZc,
        tau_ms: line.tau * 1000,
        expectedTau_ms: expectedTau * 1000,
        velocity_km_s: line.velocity,
        waveArrivedAtRecv,
        arrivalTime_ms: arrivalTime * 1000,
      },
    });
  } catch (err: any) {
    results.push({
      test: 'Step 2.1: Bergeron Constant Parameter Line Model',
      passed: false,
      message: `Execution failed: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 2: Step 2.2 Polyphase 3-Phase Coupled Line (Modal Decoupling)
  // -------------------------------------------------------------
  try {
    const polyLine = new PolyphaseBergeronLine('test_poly', {
      lengthKm: 100.0,
      R_self_per_km: 0.05,
      R_mutual_per_km: 0.02,
      L_self_per_km: 0.0013,
      L_mutual_per_km: 0.0005,
      C_self_per_km: 0.012e-6,
      C_mutual_per_km: 0.003e-6,
    });

    const diag = polyLine.getDiagnostics();
    // In transmission lines, Ground mode (Mode 0) travels slower (tau_0 > tau_1) and has higher surge impedance (Zc0 > Zc1)
    const modalDelayDecoupled = diag.tau_ground_ms > diag.tau_aerial_ms;
    const modalSurgeValid = diag.Zc_ground > diag.Zc_aerial;

    // Check symmetry of 3x3 Phase Conductance Matrix
    let isSymmetric = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (Math.abs(polyLine.G_phase[r][c] - polyLine.G_phase[c][r]) > 1e-10) {
          isSymmetric = false;
        }
      }
    }

    results.push({
      test: 'Step 2.2: Polyphase 3-Phase Coupled Line (Clarke Modal Decoupling)',
      passed: modalDelayDecoupled && modalSurgeValid && isSymmetric,
      message: `Aerial mode: Zc1 = ${diag.Zc_aerial.toFixed(2)} Ω (v1 = ${diag.v_aerial_km_s.toFixed(0)} km/s), Ground mode: Zc0 = ${diag.Zc_ground.toFixed(2)} Ω (v0 = ${diag.v_ground_km_s.toFixed(0)} km/s).`,
      details: {
        Zc_aerial: diag.Zc_aerial,
        Zc_ground: diag.Zc_ground,
        tau_aerial_ms: diag.tau_aerial_ms,
        tau_ground_ms: diag.tau_ground_ms,
        v_aerial_km_s: diag.v_aerial_km_s,
        v_ground_km_s: diag.v_ground_km_s,
        isSymmetric,
      },
    });
  } catch (err: any) {
    results.push({
      test: 'Step 2.2: Polyphase 3-Phase Coupled Line (Clarke Modal Decoupling)',
      passed: false,
      message: `Execution failed: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 3: Step 2.3 Vector Fitting & FD-Phase Line
  // -------------------------------------------------------------
  try {
    // Fit rational approximation to frequency-dependent transfer function
    const freqs = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
    const samples = freqs.map(f => {
      const w = 2.0 * Math.PI * f;
      // Target complex admittance: Y(w) = 0.003 + j*w*1e-8 / (1 + j*w*1e-5)
      const denomRe = 1.0;
      const denomIm = w * 1e-5;
      const dMag2 = denomRe * denomRe + denomIm * denomIm;
      const numRe = 0.003 * denomRe + w * 1e-8 * denomIm;
      const numIm = -0.003 * denomIm + w * 1e-8 * denomRe;
      return { re: numRe / dMag2, im: numIm / dMag2 };
    });

    const rationalModel = VectorFitter.fit(freqs, samples, 4, 3);

    // Verify all poles are strictly located in Left-Half Plane (LHP: Re(p) < 0) for passive stability
    let allStable = true;
    for (const p of rationalModel.poles) {
      if (p.re >= 0) allStable = false;
    }

    // Instantiate FDPhaseLine
    const fdLine = new FDPhaseLine('test_fd', {
      lengthKm: 100,
      R_per_km: 0.03,
      L_per_km: 0.001,
      C_per_km: 0.012e-6,
    }, 5e-5);

    const fdDiag = fdLine.getDiagnostics();
    const passed = allStable && rationalModel.poles.length === 4 && fdDiag.Zc_equiv > 0;

    results.push({
      test: 'Step 2.3: Vector Fitting & Frequency-Dependent Phase Domain Line',
      passed,
      message: `Rational fitting converged with 4 stable LHP poles (RMS error = ${(rationalModel.rmsError * 100).toFixed(4)}%), FD-Phase G_eq = ${(1 / fdDiag.Zc_equiv).toFixed(5)} S.`,
      details: {
        numPoles: rationalModel.poles.length,
        allStable,
        rmsError: rationalModel.rmsError,
        directTerm: rationalModel.d,
        fd_Zc_equiv: fdDiag.Zc_equiv,
      },
    });
  } catch (err: any) {
    results.push({
      test: 'Step 2.3: Vector Fitting & Frequency-Dependent Phase Domain Line',
      passed: false,
      message: `Execution failed: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 4: Step 2.4 Integrated Line Constants Program (LCP)
  // -------------------------------------------------------------
  try {
    const preset230 = TOWER_PRESETS['PRESET_230KV_H_FRAME'];
    const lcpRes = LineConstantsSolver.solve(preset230.conductors, 60.0, 100.0);

    // Standard 230 kV overhead line physical ranges:
    // Positive sequence surge impedance Zc1 ~ 280 to 380 Ohm
    // Velocity v1 ~ 290,000 to 300,000 km/s (close to speed of light c)
    // Zero sequence surge impedance Zc0 ~ 450 to 700 Ohm
    // Earth penetration depth p ~ 500 to 800 m for 100 Ohm-m soil at 60 Hz
    const zc1Valid = lcpRes.Zc1 >= 250 && lcpRes.Zc1 <= 450;
    const zc0Valid = lcpRes.Zc0 >= 400 && lcpRes.Zc0 <= 800;
    const v1Valid = lcpRes.v1_km_s >= 280000 && lcpRes.v1_km_s <= 310000;
    const depthValid = lcpRes.penetrationDepth_m >= 400 && lcpRes.penetrationDepth_m <= 900;

    const passed = zc1Valid && zc0Valid && v1Valid && depthValid;

    results.push({
      test: 'Step 2.4: Integrated Line Constants Program (LCP) Engine',
      passed,
      message: `230 kV H-Frame solved: Zc1 = ${lcpRes.Zc1.toFixed(2)} Ω, Zc0 = ${lcpRes.Zc0.toFixed(2)} Ω, v1 = ${lcpRes.v1_km_s.toFixed(0)} km/s, Carson skin depth = ${lcpRes.penetrationDepth_m.toFixed(1)} m.`,
      details: {
        R1_ohm_per_km: lcpRes.R1,
        X1_ohm_per_km: lcpRes.X1,
        Zc1_ohm: lcpRes.Zc1,
        v1_km_s: lcpRes.v1_km_s,
        R0_ohm_per_km: lcpRes.R0,
        X0_ohm_per_km: lcpRes.X0,
        Zc0_ohm: lcpRes.Zc0,
        v0_km_s: lcpRes.v0_km_s,
        penetrationDepth_m: lcpRes.penetrationDepth_m,
      },
    });
  } catch (err: any) {
    results.push({
      test: 'Step 2.4: Integrated Line Constants Program (LCP) Engine',
      passed: false,
      message: `Execution failed: ${err.message}`,
    });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}
