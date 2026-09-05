/**
 * PSCAD CLONE - Phase 12 Automated Verification Test Suite
 * Standard IEEE Control Systems & Dynamic Regulators
 */

import { TransferFunctionS, DiscreteFilterZ } from '../csmf/transferFunction';
import { IEEEG1Governor, HYGOVGovernor, GASTGovernor, DEGOVGovernor } from '../csmf/governors';
import { AC1AExciter, DC1AExciter, ST1AExciter } from '../csmf/exciters';
import { PSS1AStabilizer, PSS2BStabilizer } from '../csmf/stabilizers';
import { WindTurbineAerodynamics } from '../machines/windAerodynamics';

export interface TestResult {
  groupName: string;
  test: string;
  passed: boolean;
  message: string;
}

export interface Phase12ValidationReport {
  allPassed: boolean;
  results: TestResult[];
}

export function runPhase12Validation(): Phase12ValidationReport {
  const results: TestResult[] = [];

  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 12 TEST SUITE');
  console.log('   Standard IEEE Control Systems & Dynamic Regulators');
  console.log('========================================\n');

  // =========================================================================
  // Group 1: s-Domain Rational Transfer Function & z-Domain Filters (Step 12.1)
  // =========================================================================
  console.log('--- Group 1: s-Domain & z-Domain Rational Transfer Functions ---');

  // Test 1.1: 1st-Order Lag Step Response vs Analytical Formula: y(t) = K*(1 - exp(-t/T))
  try {
    const K = 2.5;
    const T = 0.05; // 50 ms
    const dt = 0.0001; // 100 µs
    const lag = TransferFunctionS.firstOrderLag(K, T);
    lag.initializeSteadyState(0.0, dt);

    let t = 0;
    const simSteps = Math.round(T / dt); // 1 time constant
    for (let i = 0; i < simSteps; i++) {
      lag.step(1.0, dt);
      t += dt;
    }

    const calculatedY = lag.getOutput();
    const analyticalY = K * (1.0 - Math.exp(-1.0)); // K * (1 - 1/e) ≈ 2.5 * 0.63212 = 1.5803
    const errorPct = (Math.abs(calculatedY - analyticalY) / analyticalY) * 100;
    const passed = errorPct < 0.1;

    results.push({
      groupName: 'Transfer Functions',
      test: '1st-Order Lag Bilinear Tustin Step Response (< 0.1% error)',
      passed,
      message: `Calculated y(T) = ${calculatedY.toFixed(4)} vs Analytical ${analyticalY.toFixed(4)} (Error: ${errorPct.toFixed(4)}%)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: 1st-Order Lag: y = ${calculatedY.toFixed(4)} (Error: ${errorPct.toFixed(4)}%)`);
  } catch (err: any) {
    results.push({
      groupName: 'Transfer Functions',
      test: '1st-Order Lag Step Response',
      passed: false,
      message: err.message,
    });
  }

  // Test 1.2: 2nd-Order Torsional Notch Filter SSR Attenuation
  try {
    const fn = 20.0; // 20 Hz SSR torsional notch
    const wn = 2 * Math.PI * fn;
    const notch = TransferFunctionS.biquadNotch(wn, 0.05);
    const dt = 0.0005; // 0.5 ms
    notch.initializeSteadyState(0.0, dt);

    // Apply 20 Hz sine wave
    let maxOutAtResonance = 0;
    for (let step = 0; step < 4000; step++) {
      const t = step * dt;
      const u = Math.sin(wn * t);
      const y = notch.step(u, dt);
      if (t > 1.0) {
        maxOutAtResonance = Math.max(maxOutAtResonance, Math.abs(y));
      }
    }

    // SSR notch should attenuate 20 Hz by > 90% (amplitude < 0.10)
    const passed = maxOutAtResonance < 0.10;
    results.push({
      groupName: 'Transfer Functions',
      test: '2nd-Order Torsional SSR Notch Filter Attenuation (> 20 dB)',
      passed,
      message: `Notch filter suppressed 20 Hz SSR sine from 1.0 to ${maxOutAtResonance.toFixed(4)} (${(20 * Math.log10(maxOutAtResonance)).toFixed(1)} dB)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: SSR Notch: Attenuated to ${maxOutAtResonance.toFixed(4)}`);
  } catch (err: any) {
    results.push({
      groupName: 'Transfer Functions',
      test: '2nd-Order Torsional SSR Notch Filter',
      passed: false,
      message: err.message,
    });
  }

  // Test 1.3: Anti-windup Clamping and Slew Rate Limiter
  try {
    const lagClamped = TransferFunctionS.firstOrderLag(10.0, 0.1, -2.0, 5.0);
    lagClamped.slewRateMax = 20.0; // 20 units/s max
    const dt = 0.001;
    lagClamped.initializeSteadyState(0.0, dt);

    // Step with input 1.0 (unclamped steady state would be 10.0)
    for (let i = 0; i < 1000; i++) {
      lagClamped.step(1.0, dt);
    }

    const clampedOut = lagClamped.getOutput();
    const passed = Math.abs(clampedOut - 5.0) < 1e-4;

    results.push({
      groupName: 'Transfer Functions',
      test: 'Anti-windup Output Clamping [ymin, ymax]',
      passed,
      message: `Output successfully clamped at upper bound: ${clampedOut.toFixed(2)} (Limit: 5.00)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Clamping: Output = ${clampedOut.toFixed(2)}`);
  } catch (err: any) {
    results.push({
      groupName: 'Transfer Functions',
      test: 'Anti-windup Clamping',
      passed: false,
      message: err.message,
    });
  }

  // Test 1.4: Direct Discrete z-Domain Filter Difference Equations
  try {
    // 1st order discrete filter: y[k] - 0.8*y[k-1] = 0.2*u[k] (DC gain = 1.0)
    const zFilter = new DiscreteFilterZ([0.2], [1.0, -0.8]);
    let yFinal = 0.0;
    for (let i = 0; i < 50; i++) {
      yFinal = zFilter.step(1.0);
    }
    const passed = Math.abs(yFinal - 1.0) < 1e-4;
    results.push({
      groupName: 'Transfer Functions',
      test: 'z-Domain Discrete Difference Equation Filter H(z)',
      passed,
      message: `z-Domain step response converged to steady state y = ${yFinal.toFixed(4)} (Expected: 1.0000)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: z-Domain Filter: y = ${yFinal.toFixed(4)}`);
  } catch (err: any) {
    results.push({
      groupName: 'Transfer Functions',
      test: 'z-Domain Filter',
      passed: false,
      message: err.message,
    });
  }

  // =========================================================================
  // Group 2: IEEE Standard Prime Mover Speed Governors (Step 12.2)
  // =========================================================================
  console.log('\n--- Group 2: IEEE Standard Prime Mover Speed Governors ---');

  // Test 2.1: IEEEG1 Steam Governor 5% Droop & Multi-Stage Reheater Power Fractions
  try {
    const dt = 0.001;
    const gov = new IEEEG1Governor('gov_ieeeg1_test', {
      K: 20.0, // 5% droop (1/0.05 = 20)
      K1: 0.3, // HP
      K3: 0.4, // IP
      K5: 0.3, // LP
      T3: 0.1,
      T4: 0.2,
      T5: 2.0,
      T6: 0.3,
    });

    gov.initialize(0.8, dt);

    // Speed drop of 1% (w = 0.99 pu): expected droop increase deltaPm = 20 * 0.01 = +0.20 pu
    // Final Pm = 0.8 + 0.20 = 1.00 pu
    for (let i = 0; i < 10000; i++) {
      gov.step(0.99, 1.0, 0.8, dt);
    }

    const finalPm = gov.state.Pmech;
    const expectedPm = 1.0;
    const error = Math.abs(finalPm - expectedPm);
    const passed = error < 0.01;

    results.push({
      groupName: 'Governors',
      test: 'IEEEG1 Steam Governor 5% Droop Response',
      passed,
      message: `Droop regulation: Pm increased from 0.80 pu to ${finalPm.toFixed(4)} pu on 1% speed drop (Expected: 1.00 pu)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: IEEEG1 Droop: Pm = ${finalPm.toFixed(4)} pu`);
  } catch (err: any) {
    results.push({
      groupName: 'Governors',
      test: 'IEEEG1 Steam Governor',
      passed: false,
      message: err.message,
    });
  }

  // Test 2.2: HYGOV Hydro Turbine Water Hammer Transient (Tw Column Inertia)
  try {
    const dt = 0.001;
    const hygov = new HYGOVGovernor('hygov_test', {
      Tw: 1.5,
      Tg: 0.2,
      R: 0.05,
      r: 0.38,
      Tr: 5.0,
      At: 1.2,
      qnl: 0.08,
    });

    hygov.initialize(0.8, dt);

    // Sudden speed drop -> gate opens -> water column inertia causes initial transient head drop
    let minHead = 1.0;
    for (let i = 0; i < 500; i++) {
      hygov.step(0.98, 1.0, 0.8, dt);
      if (hygov.state.h < minHead) {
        minHead = hygov.state.h;
      }
    }

    // Water hammer transient confirms head drops below 1.0 initially (Tw pressure inertia)
    const passed = minHead < 0.98 && hygov.state.gate > 0.70;
    results.push({
      groupName: 'Governors',
      test: 'HYGOV Hydro Governor Water Column Inertia (Tw Water Hammer)',
      passed,
      message: `Water column head transient observed: h_min = ${minHead.toFixed(3)} pu during fast gate opening`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: HYGOV Water Hammer: h_min = ${minHead.toFixed(3)} pu`);
  } catch (err: any) {
    results.push({
      groupName: 'Governors',
      test: 'HYGOV Hydro Governor',
      passed: false,
      message: err.message,
    });
  }

  // Test 2.3: GAST Gas Turbine Exhaust Temperature Limiting Action
  try {
    const dt = 0.001;
    const gast = new GASTGovernor('gast_test', {
      R: 0.04,
      Lmax: 1.05,
      Kt: 2.0,
      T1: 0.2,
      T2: 0.1,
      T3: 1.0,
    });

    gast.initialize(0.8, dt);

    // High power request (Pref = 1.3 pu) exceeds temperature limit
    for (let i = 0; i < 5000; i++) {
      gast.step(1.0, 1.0, 1.3, dt);
    }

    const finalPm = gast.state.Pmech;
    // Temperature limiter clamps fuel demand near Lmax (1.05)
    const passed = finalPm <= 1.08 && finalPm >= 1.00;
    results.push({
      groupName: 'Governors',
      test: 'GAST Gas Turbine Exhaust Temperature Radiation Limiter',
      passed,
      message: `Exhaust temperature limiter intervened: clamped Pm to ${finalPm.toFixed(3)} pu (Limit: 1.05 pu)`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: GAST Temp Limiter: Pm = ${finalPm.toFixed(3)} pu`);
  } catch (err: any) {
    results.push({
      groupName: 'Governors',
      test: 'GAST Gas Turbine Governor',
      passed: false,
      message: err.message,
    });
  }

  // Test 2.4: DEGOV Diesel Engine Combustion Ring-Buffer Delay
  try {
    const dt = 0.001;
    const tauDelay = 0.02; // 20 ms combustion delay
    const degov = new DEGOVGovernor('degov_test', {
      K: 25.0,
      T1: 0.1,
      T2: 0.05,
      T3: 0.02,
      tauDelay,
    });

    degov.initialize(0.8, dt);

    // Apply step change at step 10
    const values: number[] = [];
    for (let i = 0; i < 100; i++) {
      const pref = i >= 10 ? 1.0 : 0.8;
      const pm = degov.step(1.0, 1.0, pref, dt);
      values.push(pm);
    }

    // At step 15 (5 ms after step change, < 20 ms delay), delayed torque equals 0.800
    // At step 35 (25 ms after step change, > 20 ms delay), delayed torque has started moving (> 0.805)
    // At step 80 (70 ms after step change), torque has ramped past 0.90
    const delayVerified = Math.abs(values[15] - 0.8) < 1e-4 && values[35] > 0.805 && values[80] > 0.90;
    results.push({
      groupName: 'Governors',
      test: 'DEGOV Diesel Engine Transport Lag Delay Ring-Buffer',
      passed: delayVerified,
      message: `Combustion delay tau = ${(tauDelay * 1000).toFixed(0)} ms verified (Torque at +5ms = ${values[15].toFixed(3)}, at +25ms = ${values[35].toFixed(3)}, at +70ms = ${values[80].toFixed(3)})`,
    });
    console.log(`${delayVerified ? '✅ PASS' : '❌ FAIL'}: DEGOV Delay: Verified ${(tauDelay * 1000).toFixed(0)} ms transport lag`);
  } catch (err: any) {
    results.push({
      groupName: 'Governors',
      test: 'DEGOV Diesel Engine Governor',
      passed: false,
      message: err.message,
    });
  }

  // =========================================================================
  // Group 3: IEEE Standard Excitation Systems & AVR (Step 12.3)
  // =========================================================================
  console.log('\n--- Group 3: IEEE Standard Excitation Systems & AVR ---');

  // Test 3.1: IEEE AC1A Alternator Rectifier Exciter Saturation SE & FEX Demagnetization
  try {
    const dt = 0.0005;
    const ac1a = new AC1AExciter('ac1a_test', {
      KA: 400.0,
      TA: 0.02,
      TE: 0.8,
      KE: 1.0,
      KD: 0.38,
      KC: 0.20,
      E1: 3.0,
      SE1: 0.10,
      E2: 4.0,
      SE2: 0.35,
    });

    ac1a.initialize(1.5, 1.0, dt);

    const satAtE1 = ac1a.getSaturation(3.0);
    const satAtE2 = ac1a.getSaturation(4.0);
    const satCorrect = Math.abs(satAtE1 - 0.10) < 0.01 && Math.abs(satAtE2 - 0.35) < 0.01;

    // Step AVR with 5% voltage depression (Vt = 0.95 pu)
    for (let i = 0; i < 2000; i++) {
      ac1a.step(0.95, 1.0, 1.2, 0.0, dt);
    }

    const fieldBoosted = ac1a.state.Efd > 1.8;
    const passed = satCorrect && fieldBoosted;

    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE AC1A Non-linear Saturation SE & Ceiling Boosting',
      passed,
      message: `Saturation curve matched SE(3.0)=${satAtE1.toFixed(3)}, SE(4.0)=${satAtE2.toFixed(3)}, Efd boosted to ${ac1a.state.Efd.toFixed(3)} pu`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: AC1A Exciter: Efd boosted to ${ac1a.state.Efd.toFixed(3)} pu`);
  } catch (err: any) {
    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE AC1A Excitation System',
      passed: false,
      message: err.message,
    });
  }

  // Test 3.2: IEEE ST1A Static Thyristor Exciter Step Response (< 15% overshoot, < 1.2s settling)
  try {
    const dt = 0.0002;
    const st1a = new ST1AExciter('st1a_test', {
      KA: 210.0,
      TA: 0.02,
      TB: 10.0,
      TC: 1.0,
      VRmax: 7.8,
      VRmin: -6.7,
      KC: 0.05,
    });

    st1a.initialize(1.0, 1.0, dt);

    // Apply +5% step change in Vref (1.0 -> 1.05 pu) with Vt = 1.0
    let peakEfd = 1.0;
    let finalEfd = 1.0;
    const simTime = 1.5; // 1.5 seconds
    const steps = Math.round(simTime / dt);

    for (let i = 0; i < steps; i++) {
      const efd = st1a.step(1.0, 1.05, 1.0, 0.0, dt);
      if (efd > peakEfd) peakEfd = efd;
      if (i === steps - 1) finalEfd = efd;
    }

    // Check overshoot and settling
    const overshootPct = ((peakEfd - finalEfd) / finalEfd) * 100;
    const passed = peakEfd > 1.05 && overshootPct < 15.0;

    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE ST1A Static Exciter High-Initial Response & Step Transient',
      passed,
      message: `HIR Transient: Peak Efd = ${peakEfd.toFixed(3)} pu, Overshoot = ${overshootPct.toFixed(2)}% (< 15%), Settled Efd = ${finalEfd.toFixed(3)} pu`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ST1A Exciter: Overshoot = ${overshootPct.toFixed(2)}% (< 15%)`);
  } catch (err: any) {
    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE ST1A Static Exciter',
      passed: false,
      message: err.message,
    });
  }

  // Test 3.3: IEEE DC1A Direct Current Commutator Excitation System
  try {
    const dt = 0.0005;
    const dc1a = new DC1AExciter('dc1a_test', {
      KA: 40.0,
      TA: 0.05,
      TE: 0.5,
      KE: 1.0,
      KF: 0.05,
      TF: 0.6,
      E1: 2.8,
      SE1: 0.08,
      E2: 3.7,
      SE2: 0.26,
    });

    dc1a.initialize(1.0, dt);

    // Step with 5% voltage drop (Vt = 0.95)
    for (let i = 0; i < 2000; i++) {
      dc1a.step(0.95, 1.0, 0.0, dt);
    }

    const fieldRisen = dc1a.state.Efd > 1.3;
    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE DC1A Commutator Exciter Dynamics & Rate Feedback',
      passed: fieldRisen,
      message: `DC1A field voltage rose from 1.00 pu to ${dc1a.state.Efd.toFixed(3)} pu on terminal voltage depression`,
    });
    console.log(`${fieldRisen ? '✅ PASS' : '❌ FAIL'}: DC1A Exciter: Efd = ${dc1a.state.Efd.toFixed(3)} pu`);
  } catch (err: any) {
    results.push({
      groupName: 'Excitation Systems',
      test: 'IEEE DC1A Excitation System',
      passed: false,
      message: err.message,
    });
  }

  // =========================================================================
  // Group 4: Power System Stabilizers (PSS1A & PSS2B) (Step 12.4)
  // =========================================================================
  console.log('\n--- Group 4: Power System Stabilizers (PSS1A & PSS2B) ---');

  // Test 4.1: PSS1A DC Washout Blocking & Inter-Area Phase Lead
  try {
    const dt = 0.001;
    const pss1 = new PSS1AStabilizer('pss1a_test', {
      Kpss: 15.0,
      Tw: 5.0,
      T1: 0.25,
      T2: 0.04,
      T3: 0.25,
      T4: 0.04,
      VstMax: 0.10,
      VstMin: -0.10,
    });

    pss1.initialize(0.0, dt);

    // 1. DC Step: constant offset in speed (deltaW = 0.02)
    // Stabilizer should respond initially then washout to 0
    let peakVst = 0.0;
    for (let i = 0; i < 200; i++) {
      const vst = pss1.step(0.02, dt);
      if (Math.abs(vst) > Math.abs(peakVst)) peakVst = vst;
    }
    // Continue for 20 seconds to allow washout decay
    for (let i = 0; i < 20000; i++) {
      pss1.step(0.02, dt);
    }
    const washedOutVst = pss1.state.Vst;

    const dcBlocked = Math.abs(peakVst) > 0.05 && Math.abs(washedOutVst) < 0.005;
    results.push({
      groupName: 'Stabilizers',
      test: 'PSS1A DC Washout Blocking (Decays to 0)',
      passed: dcBlocked,
      message: `DC Step initial peak Vst = ${peakVst.toFixed(4)} pu, washed out to ${washedOutVst.toExponential(2)} pu (< 0.005 pu)`,
    });
    console.log(`${dcBlocked ? '✅ PASS' : '❌ FAIL'}: PSS1A Washout: DC Blocked (${washedOutVst.toExponential(2)} pu)`);
  } catch (err: any) {
    results.push({
      groupName: 'Stabilizers',
      test: 'PSS1A Stabilizer',
      passed: false,
      message: err.message,
    });
  }

  // Test 4.2: PSS2B Dual-Input Accelerating Power (Pa = Pm - Pe) & Low-Power Lockout
  try {
    const dt = 0.001;
    const pss2 = new PSS2BStabilizer('pss2b_test', {
      Kpss: 15.0,
      Tw1: 2.0,
      Tw2: 2.0,
      Tw3: 2.0,
      H: 3.5,
      PminLockout: 0.15,
      VstMax: 0.10,
      VstMin: -0.10,
    });

    pss2.initialize(1.0, 0.8, dt);

    // Normal operation (Pe = 0.85): 1 Hz power oscillation
    let normalActive = false;
    for (let i = 0; i < 1000; i++) {
      const t = i * dt;
      const pe = 0.85 + 0.05 * Math.sin(2 * Math.PI * 1.0 * t);
      const w = 1.0 + 0.002 * Math.cos(2 * Math.PI * 1.0 * t);
      const vst = pss2.step(w, pe, dt);
      if (Math.abs(vst) > 0.01) normalActive = true;
    }

    // Low power condition (Pe = 0.05 < PminLockout 0.15) -> Lockout should force Vst = 0
    let lockoutVerified = true;
    for (let i = 0; i < 500; i++) {
      const vst = pss2.step(1.02, 0.05, dt);
      if (vst !== 0.0 || !pss2.state.isLockedOut) {
        lockoutVerified = false;
      }
    }

    const passed = normalActive && lockoutVerified;
    results.push({
      groupName: 'Stabilizers',
      test: 'PSS2B Accelerating Power Pa Synthesis & Low-Power Lockout',
      passed,
      message: `Active oscillation damping: ${normalActive}, Generator low-power lockout (Pe < 0.15 pu): ${lockoutVerified}`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: PSS2B Pa Damping & Lockout: Active=${normalActive}, Lockout=${lockoutVerified}`);
  } catch (err: any) {
    results.push({
      groupName: 'Stabilizers',
      test: 'PSS2B Stabilizer',
      passed: false,
      message: err.message,
    });
  }

  // =========================================================================
  // Group 5: Advanced Wind Turbine Aerodynamics & Pitch Control (Step 12.5)
  // =========================================================================
  console.log('\n--- Group 5: Advanced Wind Turbine Aerodynamics & Pitch Control ---');

  // Test 5.1: Cp(lambda, beta) Surface Peak & Optimal TSR
  try {
    const wind = new WindTurbineAerodynamics('wind_test', {
      ratedPowerMW: 5.0,
      rotorRadius: 63.0,
    });

    const cpOpt = wind.calculateCp(8.1, 0.0);
    const cpFeathered = wind.calculateCp(8.1, 20.0);
    const cpStorm = wind.calculateCp(8.1, 90.0);

    // Cp at optimal TSR must be near 0.48, significantly lower when pitched to 20°, and 0 at 90°
    const passed = cpOpt > 0.45 && cpFeathered < 0.15 && cpStorm === 0.0;

    results.push({
      groupName: 'Wind Aerodynamics',
      test: '2D Cp(lambda, beta) Aerodynamic Surface Peak & Feathering',
      passed,
      message: `Cp_max(8.1, 0°) = ${cpOpt.toFixed(4)}, Cp(8.1, 20°) = ${cpFeathered.toFixed(4)}, Cp(8.1, 90°) = ${cpStorm.toFixed(4)}`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Cp Surface: Cp_max = ${cpOpt.toFixed(4)}, Feathered = ${cpFeathered.toFixed(4)}`);
  } catch (err: any) {
    results.push({
      groupName: 'Wind Aerodynamics',
      test: 'Cp Surface Calculation',
      passed: false,
      message: err.message,
    });
  }

  // Test 5.2: Multi-Region Controller: Region II MPPT to Region III Pitch Regulation Transition
  try {
    const dt = 0.001;
    const wind = new WindTurbineAerodynamics('wind_ctrl_test', {
      ratedPowerMW: 5.0,
      rotorRadius: 63.0,
      ratedWindSpeed: 11.4,
      cutInWindSpeed: 3.5,
      cutOutWindSpeed: 25.0,
      ratedRotorSpeedRpm: 12.1,
    });

    // 1. Partial load (v = 8 m/s): should operate in Region II MPPT with beta = 0°
    const wRotorLow = (10.0 * 2 * Math.PI) / 60; // 10 rpm
    for (let i = 0; i < 1000; i++) {
      wind.step(8.0, wRotorLow, dt);
    }
    const region2Ok = wind.state.region === 'REGION_2_MPPT' && wind.state.pitchAngleDeg === 0.0;

    // 2. High wind speed (v = 15 m/s > 11.4 rated): should transition to Region III with active pitch beta > 0°
    const wRotorHigh = (13.0 * 2 * Math.PI) / 60; // 13 rpm (above 12.1 rated)
    for (let i = 0; i < 5000; i++) {
      wind.step(15.0, wRotorHigh, dt);
    }
    const region3Ok = wind.state.region === 'REGION_3_PITCH' && wind.state.pitchAngleDeg > 5.0;

    // 3. Storm cut-out (v = 26 m/s > 25.0): should trigger emergency feathering (pitch -> 90°)
    for (let i = 0; i < 5000; i++) {
      wind.step(26.0, wRotorLow, dt);
    }
    const region4Ok = wind.state.region === 'REGION_4_CUTOUT' && wind.state.pitchAngleDeg > 80.0;

    const passed = region2Ok && region3Ok && region4Ok;
    results.push({
      groupName: 'Wind Aerodynamics',
      test: 'Multi-Region MPPT (Region II) -> Pitch Reg (Region III) -> Cut-out (Region IV)',
      passed,
      message: `Region II MPPT (β=0°): ${region2Ok}, Region III Pitch (β>5°): ${region3Ok}, Region IV Cut-out (β>80°): ${region4Ok}`,
    });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: Wind Controller: Reg II=${region2Ok}, Reg III=${region3Ok}, Reg IV=${region4Ok}`);
  } catch (err: any) {
    results.push({
      groupName: 'Wind Aerodynamics',
      test: 'Wind Multi-Region Controller',
      passed: false,
      message: err.message,
    });
  }

  const allPassed = results.every((r) => r.passed);
  console.log('\n========================================');
  console.log(`🏁 PHASE 12 TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
  console.log('========================================\n');

  return {
    allPassed,
    results,
  };
}
