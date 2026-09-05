/**
 * PSCAD Modern - Phase 11 Verification & Validation Test Suite
 * Power System Protection & ANSI Relay Suite
 */

import { OvercurrentRelay } from '../protection/overcurrentRelay';
import { DistanceRelay, cMag, type Complex } from '../protection/distanceRelay';
import { DifferentialRelay } from '../protection/differentialRelay';
import { GeneratorProtectionRelay } from '../protection/generatorProtection';
import { CurrentTransformer, VoltageTransformer } from '../passives/instrumentTransformers';

export interface Phase11TestResult {
  group: string;
  name: string;
  passed: boolean;
  message: string;
}

export function runPhase11Validation(): { allPassed: boolean; results: Phase11TestResult[] } {
  const results: Phase11TestResult[] = [];

  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 11 TEST SUITE');
  console.log('   Power System Protection & ANSI Relay Suite');
  console.log('========================================\n');

  // -------------------------------------------------------------
  // Group 1: ANSI 50/51/67 Time-Overcurrent & Instantaneous Relays
  // -------------------------------------------------------------
  console.log('--- Group 1: ANSI 50/51/67 Time-Overcurrent & Instantaneous Relays ---');
  try {
    const ocRelay = new OvercurrentRelay('oc1', {
      curveType: 'IEC_STANDARD_INVERSE',
      pickupCurrent: 5.0,
      timeDial: 1.0,
      enable50: true,
      instantaneousPickup: 25.0,
      directionalMode: 'FORWARD',
      maxTorqueAngleDeg: 45.0,
    });

    // 1. Analytical IEC 60255-151 curve accuracy test
    // Formula: t = TD * 0.14 / ( (I/Is)^0.02 - 1 )
    const is = 5.0;
    const testI = 10.0; // 2x pickup
    const analyticalT2x = 0.14 / (Math.pow(testI / is, 0.02) - 1.0); // ~10.029 s
    const calcT2x = ocRelay.calculateTripTime(testI);
    const relError = Math.abs(calcT2x - analyticalT2x) / analyticalT2x;

    const g1aPass = relError < 0.001; // < 0.1% error
    results.push({
      group: 'ANSI 50/51/67 Overcurrent',
      name: 'IEC 60255-151 Curve Analytical Accuracy (< 0.1% error)',
      passed: g1aPass,
      message: `Calculated t(2x) = ${calcT2x.toFixed(4)} s vs Analytical ${analyticalT2x.toFixed(4)} s (Error: ${(relError * 100).toFixed(4)}%)`,
    });
    console.log(`${g1aPass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);

    // 2. Continuous disk reset integration & instantaneous tripping test
    ocRelay.reset();
    const dt = 0.01; // 10 ms
    // Step forward with 15A (3x pickup, t_trip ~ 6.3s) for 100 steps (1.0s)
    for (let i = 0; i < 100; i++) {
      ocRelay.step(15.0, dt, 0, 0); // Forward direction
    }
    const diskTravelAfter1s = ocRelay.state.diskTravel;
    const g1bPass = diskTravelAfter1s > 0.1 && diskTravelAfter1s < 0.25 && !ocRelay.state.isTripped;

    // Test ANSI 50 Instantaneous pickup
    ocRelay.step(30.0, dt, 0, 0); // > 25A instantaneous
    const g1cPass = ocRelay.state.isTripped && ocRelay.state.tripSource === '50';

    results.push({
      group: 'ANSI 50/51/67 Overcurrent',
      name: 'Induction Disk Reset Integrator & ANSI 50 Instantaneous Trip',
      passed: g1bPass && g1cPass,
      message: `Disk accumulated travel = ${(diskTravelAfter1s * 100).toFixed(1)}% after 1.0s, Instantaneous 50 fired on 30A fault`,
    });
    console.log(`${g1bPass && g1cPass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);
  } catch (err: any) {
    results.push({ group: 'ANSI 50/51/67 Overcurrent', name: 'Overcurrent Error', passed: false, message: err.message });
  }

  // -------------------------------------------------------------
  // Group 2: ANSI 21 Multi-Zone Distance Protection Relay
  // -------------------------------------------------------------
  console.log('\n--- Group 2: ANSI 21 Multi-Zone Distance Protection Relay ---');
  try {
    const lineZ1: Complex = { r: 1.0, i: 8.0 }; // 8.06 Ω at 82.87°
    const lineZ0: Complex = { r: 3.0, i: 24.0 };

    const distRelay = new DistanceRelay('dist1', {
      lineZ1,
      lineZ0,
      zone1: {
        enabled: true,
        reachZ1Mag: 6.4, // 80% of line
        reachZ1AngDeg: 82.87,
        timeDelay: 0.0,
        characteristic: 'MHO',
      },
      zone2: {
        enabled: true,
        reachZ1Mag: 9.6, // 120% of line
        reachZ1AngDeg: 82.87,
        timeDelay: 0.3,
        characteristic: 'MHO',
      },
      zone3: {
        enabled: true,
        reachZ1Mag: 14.0, // 175% of line
        reachZ1AngDeg: 82.87,
        timeDelay: 0.8,
        characteristic: 'MHO',
      },
    });

    // Zero-sequence compensation k0 verification: k0 = (Z0 - Z1) / (3*Z1) = (2 + j16) / (3 + j24) = 2/3 = 0.6667
    const k0Mag = cMag(distRelay.k0);
    const k0Pass = Math.abs(k0Mag - 2.0 / 3.0) < 1e-4;

    // Test 1: In-Zone 1 Fault (50% line distance: Z_fault = 0.5 + j4.0)
    const zFaultZ1: Complex = { r: 0.5, i: 4.0 };
    const inZ1 = distRelay.isInsideZone(zFaultZ1, distRelay.settings.zone1);

    // Test 2: Zone 2 Fault (100% line distance: Z_fault = 1.0 + j8.0 -> outside Z1 80%, inside Z2 120%)
    const zFaultZ2: Complex = { r: 1.0, i: 8.0 };
    const inZ2Only = !distRelay.isInsideZone(zFaultZ2, distRelay.settings.zone1) &&
                     distRelay.isInsideZone(zFaultZ2, distRelay.settings.zone2);

    // Test 3: Reverse Out-of-Zone Fault (Z_fault = -0.5 - j4.0)
    const zFaultRev: Complex = { r: -0.5, i: -4.0 };
    const revRejected = !distRelay.isInsideZone(zFaultRev, distRelay.settings.zone1) &&
                        !distRelay.isInsideZone(zFaultRev, distRelay.settings.zone2);

    const g2Pass = k0Pass && inZ1 && inZ2Only && revRejected;
    results.push({
      group: 'ANSI 21 Distance',
      name: 'Multi-Zone Mho Discrimination & Zero-Sequence Compensation k0',
      passed: g2Pass,
      message: `Zero-sequence k0 = ${k0Mag.toFixed(4)} (Expected: 0.6667), Zone 1 (50% line) = ${inZ1}, Zone 2 (100% line) = ${inZ2Only}, Reverse rejected = ${revRejected}`,
    });
    console.log(`${g2Pass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);
  } catch (err: any) {
    results.push({ group: 'ANSI 21 Distance', name: 'Distance Error', passed: false, message: err.message });
  }

  // -------------------------------------------------------------
  // Group 3: ANSI 87T Transformer & 87L Differential Protection
  // -------------------------------------------------------------
  console.log('\n--- Group 3: ANSI 87T Transformer & 87L Differential Protection ---');
  try {
    const diffRelay = new DifferentialRelay('diff1', {
      pickupCurrent: 0.3,
      slope1: 0.25,
      slope2: 0.65,
      kneeCurrent: 2.0,
      unrestrainedPickup: 8.0,
      enable2ndHarmonicRestraint: true,
      ratio2ndHarmonic: 0.15,
      enable5thHarmonicRestraint: true,
      ratio5thHarmonic: 0.35,
      vectorGroup: 'Yy0',
    });

    // 1. Through-fault security test: I1 = 10 pu, I2 = -10 pu -> I_op = |10 - 10| = 0, I_res = 10 pu
    const throughState = diffRelay.step(
      { a: { r: 10.0, i: 0 }, b: { r: -5.0, i: 8.66 }, c: { r: -5.0, i: -8.66 } },
      { a: { r: -10.0, i: 0 }, b: { r: 5.0, i: -8.66 }, c: { r: 5.0, i: 8.66 } }
    );
    const throughPass = !throughState.isTripped && throughState.phaseResults.A.iOp < 1e-6;

    // 2. Inrush Harmonic Restraint test: Internal fault with 2nd harmonic = 20% (> 15% threshold)
    const inrushState = diffRelay.step(
      { a: { r: 2.0, i: 0 }, b: { r: -1.0, i: 1.73 }, c: { r: -1.0, i: -1.73 } },
      { a: { r: 0, i: 0 }, b: { r: 0, i: 0 }, c: { r: 0, i: 0 } },
      { a: 0.4, b: 0, c: 0 } // 0.4 / 2.0 = 20% 2nd harmonic
    );
    const inrushBlocked = inrushState.phaseResults.A.is2ndBlocked && !inrushState.isTripped;

    // 3. Genuine Internal Fault test: I1 = 3 pu, I2 = 3 pu -> I_op = 6 pu > I_thresh
    const internalState = diffRelay.step(
      { a: { r: 3.0, i: 0 }, b: { r: -1.5, i: 2.59 }, c: { r: -1.5, i: -2.59 } },
      { a: { r: 3.0, i: 0 }, b: { r: -1.5, i: 2.59 }, c: { r: -1.5, i: -2.59 } }
    );
    const internalTripPass = internalState.isTripped && internalState.tripMode === 'RESTRAINED';

    const g3Pass = throughPass && inrushBlocked && internalTripPass;
    results.push({
      group: 'ANSI 87 Differential',
      name: 'Dual-Slope Percentage Restraint & 2nd Harmonic Inrush Restraint',
      passed: g3Pass,
      message: `Through-fault stable: ${throughPass}, 20% inrush blocked: ${inrushBlocked}, Internal fault tripped: ${internalTripPass}`,
    });
    console.log(`${g3Pass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);
  } catch (err: any) {
    results.push({ group: 'ANSI 87 Differential', name: 'Differential Error', passed: false, message: err.message });
  }

  // -------------------------------------------------------------
  // Group 4: ANSI 81O/81U, 81R, ANSI 40 & ANSI 78 Generator Suite
  // -------------------------------------------------------------
  console.log('\n--- Group 4: ANSI 81O/81U, 81R, ANSI 40 & ANSI 78 Generator Protection ---');
  try {
    const genRelay = new GeneratorProtectionRelay('gen1', {
      underFreqStages: [{ enabled: true, frequencyHz: 59.3, timeDelaySec: 0.1 }],
      enableRocof: true,
      rocofThresholdHzPerSec: 1.0,
      rocofTimeDelaySec: 0.02,
      enableLossOfField: true,
      xd: 1.8,
      xdPrime: 0.3,
      circle1DelaySec: 0.05,
      enablePowerSwing: true,
      outerBlinderR: 12.0,
      innerBlinderR: 6.0,
      powerSwingDeltaTimeThresholdSec: 0.035,
    });

    // 1. Test 81U Under-Frequency
    genRelay.step(59.0, 1.0, { r: 0.8, i: 0.4 }, 0.12);
    const ufPass = genRelay.state.underFreqActive && genRelay.state.tripReasons.includes('ANSI_81U_STAGE_1');

    // 2. Test ANSI 40 Loss of Field (Impedance in lower half plane: Z = 0 - j0.8 pu, inside Circle 1)
    genRelay.reset();
    for (let k = 0; k < 6; k++) {
      genRelay.step(60.0, 1.0, { r: 0.0, i: -0.7 }, 0.02);
    }
    const loePass = genRelay.state.loeTripped && genRelay.state.tripReasons.includes('ANSI_40_LOE_CIRCLE_1');

    // 3. Test ANSI 78 Power Swing Blocking
    genRelay.reset();
    // Simulate trajectory lingering in transit zone between outer (12Ω) and inner (6Ω) for 40 ms
    genRelay.step(60.0, 1.0, { r: 9.0, i: 2.0 }, 0.04);
    genRelay.step(60.0, 1.0, { r: 4.0, i: 2.0 }, 0.01);
    const psbPass = genRelay.state.powerSwingActive;

    const g4Pass = ufPass && loePass && psbPass;
    results.push({
      group: 'ANSI 81/40/78 Generator',
      name: 'Under-Frequency (81U), Loss of Field (40 LOE), & Power Swing (78 PSB)',
      passed: g4Pass,
      message: `81U Trip = ${ufPass}, 40 LOE Trip = ${loePass}, 78 Power Swing Blocking = ${psbPass}`,
    });
    console.log(`${g4Pass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);
  } catch (err: any) {
    results.push({ group: 'ANSI 81/40/78 Generator', name: 'Generator Protection Error', passed: false, message: err.message });
  }

  // -------------------------------------------------------------
  // Group 5: Instrument Transformer Magnetic Core Saturation (CT & VT)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Instrument Transformer Magnetic Core Saturation ---');
  try {
    const ct = new CurrentTransformer('ct_val', {
      ratioPrimary: 1200,
      ratioSecondary: 5,
      burdenResistance: 2.0,
      kneeFluxLinkage: 1.8,
      remanenceFluxPu: 0.0,
    });

    // 1. Unsaturated linear operation test (Nominal 1200A RMS -> 5A secondary)
    ct.reset();
    const dt = 5e-5; // 50 µs
    let maxUnsatIs = 0;
    for (let step = 0; step < 200; step++) {
      const ip = Math.sqrt(2) * 1200 * Math.sin(2 * Math.PI * 60 * step * dt);
      const st = ct.step(ip, dt);
      maxUnsatIs = Math.max(maxUnsatIs, Math.abs(st.actualSecondaryCurrent));
    }
    const linearPass = Math.abs(maxUnsatIs - Math.sqrt(2) * 5.0) < 0.2; // < 3% error

    // 2. Severe Fault with DC offset causing saturation collapse
    ct.reset();
    let maxSatFlux = 0;
    let sawSaturation = false;
    for (let step = 0; step < 400; step++) {
      const t = step * dt;
      const ip = Math.sqrt(2) * 15000 * (Math.sin(2 * Math.PI * 60 * t) + Math.exp(-t / 0.03));
      const st = ct.step(ip, dt);
      maxSatFlux = Math.max(maxSatFlux, st.fluxLinkage);
      if (st.isCoreSaturated) sawSaturation = true;
    }
    const satPass = sawSaturation && maxSatFlux > 1.8;

    // 3. VT Test
    const vt = new VoltageTransformer('vt_val', { primaryVoltageNominal: 230000, secondaryVoltageNominal: 115 });
    const vtState = vt.step(230000);
    const vtPass = Math.abs(vtState.actualSecondaryVoltage - 115.0) < 1e-3;

    const g5Pass = linearPass && satPass && vtPass;
    results.push({
      group: 'CT/VT Instrument Transformers',
      name: 'Non-Linear CT Core Saturation Dynamics & VT Burden Regulation',
      passed: g5Pass,
      message: `Linear 5A reproduction: ${linearPass}, Core saturation triggered (ψ_max = ${maxSatFlux.toFixed(2)} Wb-t > 1.8): ${satPass}, VT 115V output: ${vtPass}`,
    });
    console.log(`${g5Pass ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].name} -> ${results[results.length - 1].message}`);
  } catch (err: any) {
    results.push({ group: 'CT/VT Instrument Transformers', name: 'CT/VT Error', passed: false, message: err.message });
  }

  const allPassed = results.length > 0 && results.every((r) => r.passed);
  console.log('\n========================================');
  console.log(`🏁 PHASE 11 TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
  console.log('========================================\n');

  return { allPassed, results };
}
