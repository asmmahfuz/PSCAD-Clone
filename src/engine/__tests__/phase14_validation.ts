/**
 * PSCAD Modern - Phase 14 Comprehensive Validation Test Suite
 * 
 * Verifies:
 * - Step 14.1: Jiles-Atherton Dynamic B-H Hysteresis Core Model (Langevin, loop closure, Br, inrush)
 * - Step 14.2: Motorized On-Load Tap Changer (OLTC) & AVR Closed-Loop Regulation
 * - Step 14.3: High-Frequency Stray Capacitances & Swept Frequency Response Analysis (SFRA)
 * - Step 14.4: Zig-Zag Grounding Transformers & Quadrature Booster Phase Shifting Transformers (PST)
 */

import {
  JilesAthertonCore,
} from '../transformers/jilesAtherton';
import {
  OltcTransformer,
} from '../transformers/oltcTransformer';
import {
  TransformerStrayCapacitance,
} from '../transformers/strayCapacitance';
import {
  ZigZagTransformer,
} from '../transformers/zigzagTransformer';
import {
  PhaseShiftingTransformer,
} from '../transformers/phaseShifter';


export interface TestResult {
  groupName: string;
  test: string;
  passed: boolean;
  message: string;
}

export interface Phase14ValidationReport {
  allPassed: boolean;
  results: TestResult[];
}

export function runPhase14Validation(): Phase14ValidationReport {
  const results: TestResult[] = [];

  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 14 TEST SUITE');
  console.log('   Advanced Magnetics, Hysteresis & Substation Equipment');
  console.log('========================================\n');

  // =========================================================================
  // GROUP 1: Jiles-Atherton Dynamic B-H Hysteresis Core Model
  // =========================================================================
  console.log('--- Group 1: Jiles-Atherton Dynamic B-H Hysteresis ---');

  // Test 1.1: Langevin Function & Taylor Series at Origin
  const l0 = JilesAthertonCore.langevin(0.0);
  const lSmall = JilesAthertonCore.langevin(1e-5);
  const lLarge = JilesAthertonCore.langevin(50.0);
  const dl0 = JilesAthertonCore.dLangevin(0.0);

  const t1Passed =
    Math.abs(l0) < 1e-12 &&
    Math.abs(lSmall - 1e-5 / 3.0) < 1e-10 &&
    Math.abs(lLarge - 0.98) < 0.05 &&
    Math.abs(dl0 - 1.0 / 3.0) < 1e-6;

  results.push({
    groupName: 'Jiles-Atherton Hysteresis',
    test: 'Langevin Anhysteretic & Taylor Series Numerical Stability',
    passed: t1Passed,
    message: `L(0)=${l0.toFixed(4)}, L(1e-5)=${lSmall.toExponential(4)}, dL/dz(0)=${dl0.toFixed(4)} (Expected: 0.3333)`,
  });
  console.log(`${t1Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 1.2: Major Hysteresis Loop Generation, Remanence (Br) & Coercivity (Hc)
  const jaCore = new JilesAthertonCore('JA_Core_1', {
    Ms: 1.65e6,
    a: 1100.0,
    alpha: 1.5e-3,
    k: 450.0,
    c: 0.18,
  });

  const loop = jaCore.generateHysteresisLoop(3000, 300);
  const loss = jaCore.calculateCycleLoss(loop);

  // Find Remanence Br (B when H ~ 0 on descending branch)
  let Br = 0.0;
  let Hc = 0.0;
  for (let i = 0; i < loop.H.length - 1; i++) {
    if (loop.H[i] >= 0 && loop.H[i + 1] <= 0) {
      Br = loop.B[i];
    }
    if (loop.B[i] >= 0 && loop.B[i + 1] <= 0) {
      Hc = Math.abs(loop.H[i]);
    }
  }

  const t2Passed = loop.H.length > 0 && Br > 0.4 && Hc > 50.0 && loss > 100.0;
  results.push({
    groupName: 'Jiles-Atherton Hysteresis',
    test: 'Major B-H Loop Closure, Remanence (Br), Coercivity (Hc) & Loss',
    passed: t2Passed,
    message: `Remanent Br = ${Br.toFixed(3)} T, Coercive Hc = ${Hc.toFixed(1)} A/m, Hysteresis Loss = ${loss.toFixed(1)} J/m³`,
  });
  console.log(`${t2Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 1.3: Residual Flux Trapping upon De-energization & Severe Inrush Peak
  const jaStateRemanent = jaCore.initState(1.15); // Trapped remnant flux of 1.15 T
  const jaStateDemag = jaCore.initState(0.0);    // Demagnetized core (0.0 T)

  const dtSim = 50e-6; // 50 us
  let maxInrushRemanent = 0.0;
  let maxInrushDemag = 0.0;

  // Apply AC voltage step for 3 cycles (50 ms at 60 Hz)
  for (let step = 0; step < 1000; step++) {
    const t = step * dtSim;
    const vAc = 3000.0 * Math.sin(2 * Math.PI * 60 * t);

    const iRem = Math.abs(jaCore.updateEMTStep(vAc, dtSim, jaStateRemanent));
    const iDem = Math.abs(jaCore.updateEMTStep(vAc, dtSim, jaStateDemag));

    if (iRem > maxInrushRemanent) maxInrushRemanent = iRem;
    if (iDem > maxInrushDemag) maxInrushDemag = iDem;
  }

  const inrushRatio = maxInrushRemanent / Math.max(1e-3, maxInrushDemag);
  const t3Passed = maxInrushRemanent > maxInrushDemag && inrushRatio > 2.5;

  results.push({
    groupName: 'Jiles-Atherton Hysteresis',
    test: 'Residual Flux Trapping & Severe Asymmetric Inrush Current Spike',
    passed: t3Passed,
    message: `Remnant Inrush = ${maxInrushRemanent.toFixed(1)} A vs Demagnetized Inrush = ${maxInrushDemag.toFixed(1)} A (Ratio: ${inrushRatio.toFixed(2)}x)`,
  });
  console.log(`${t3Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // =========================================================================
  // GROUP 2: Motorized On-Load Tap Changer (OLTC) & AVR Regulators
  // =========================================================================
  console.log('\n--- Group 2: Motorized OLTC & Automatic Voltage Regulator ---');

  // Test 2.1: Discrete Tap Stepping & Turns Ratio Modulation
  const oltc = new OltcTransformer('OLTC_1', {
    V1_nom: 138000,
    V2_nom: 13800,
    stepPercent: 0.625,
    maxTap: 16,
    minTap: -16,
    t_mechDelay: 3.0,
    t_diverterTransit: 0.05,
    R_trans: 10.0,
    enableAVR: false,
  });

  const oltcState = oltc.initState();
  const baseRatio = oltc.baseRatio; // 10.0

  oltc.commandRaiseTap(oltcState);
  // Advance 3.1 seconds through motor mechanical transit (t_mech = 3.0 s)
  for (let s = 0; s < 310; s++) {
    oltc.stepController(0.01, oltcState, 13800);
  }

  const raisedTap = oltcState.currentTap;
  const raisedRatio = oltcState.effectiveRatio;
  const expectedRatioTap1 = baseRatio / (1.0 + 0.00625);

  const t4Passed = raisedTap === 1 && Math.abs(raisedRatio - expectedRatioTap1) < 1e-4;
  results.push({
    groupName: 'Motorized OLTC & AVR',
    test: 'Discrete Tap Stepping & Turns Ratio Modulation (+1 Tap)',
    passed: t4Passed,
    message: `Tap=${raisedTap}, Effective Ratio = ${raisedRatio.toFixed(4)} (Expected: ${expectedRatioTap1.toFixed(4)})`,
  });
  console.log(`${t4Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 2.2: Diverter Switch Transition Resistor Bridging Detection
  const oltcState2 = oltc.initState();
  oltc.commandRaiseTap(oltcState2);
  let resistorBridgeDetected = false;
  for (let s = 0; s < 310; s++) {
    oltc.stepController(0.01, oltcState2, 13800);
    if (oltcState2.inResistorBridge) {
      resistorBridgeDetected = true;
    }
  }

  const t5Passed = resistorBridgeDetected;
  results.push({
    groupName: 'Motorized OLTC & AVR',
    test: 'Diverter Switch Transition Resistor Bridging Mode',
    passed: t5Passed,
    message: `Transition Resistor Bridging Triggered = ${resistorBridgeDetected} (t_transit = 50 ms, R_trans = 10 Ω)`,
  });
  console.log(`${t5Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 2.3: Closed-Loop AVR Voltage Regulation with Deadband & LDC
  const avrOltc = new OltcTransformer('AVR_OLTC', {
    V1_nom: 138000,
    V2_nom: 13800,
    enableAVR: true,
    V_set_pu: 1.0,
    deadband_pu: 0.0125, // +/- 1.25%
    delayTime: 1.0,      // 1.0 s response delay
    t_mechDelay: 1.0,
    stepPercent: 1.25,
  });

  const avrState = avrOltc.initState();
  // Secondary voltage sags to 0.94 pu (12,972 V) due to step load addition
  for (let s = 0; s < 500; s++) {
    // 5.0 seconds of simulation
    avrOltc.stepController(0.01, avrState, 12972.0, 500.0);
  }

  const t6Passed = avrState.currentTap > 0 && avrState.currentTap <= 5;
  results.push({
    groupName: 'Motorized OLTC & AVR',
    test: 'Closed-Loop Automatic Voltage Regulation (AVR ANSI 90)',
    passed: t6Passed,
    message: `AVR initiated RAISE commands: Final Tap = ${avrState.currentTap}, AVR Command = ${avrState.avrCommand}`,
  });
  console.log(`${t6Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // =========================================================================
  // GROUP 3: High-Frequency Stray Capacitances & SFRA
  // =========================================================================
  console.log('\n--- Group 3: High-Frequency Stray Capacitances & SFRA ---');

  // Test 3.1: Nodal Capacitance Matrix & Companion Stamping
  const stray = new TransformerStrayCapacitance('Stray_1', {
    C_pg: 2.0e-9,
    C_sg: 3.0e-9,
    C_ps: 2.5e-9,
    C_s1: 0.8e-9,
    C1_bushing: 500e-12,
    C2_bushing: 3000e-12,
  });

  const C_mat = stray.computeNodalCapacitanceMatrix();
  const G_comp = stray.computeCompanionConductance(1e-6); // dt = 1 us

  const isSymmetric =
    Math.abs(C_mat[0][1] - C_mat[1][0]) < 1e-15 &&
    Math.abs(C_mat[0][2] - C_mat[2][0]) < 1e-15 &&
    Math.abs(C_mat[0][3] - C_mat[3][0]) < 1e-15;

  const t7Passed = isSymmetric && C_mat[0][0] > 0 && G_comp[0][0] > 0;
  results.push({
    groupName: 'HF Stray Capacitance & SFRA',
    test: '4x4 Nodal Capacitance Matrix & EMT Companion Conductance Stamping',
    passed: t7Passed,
    message: `C_mat[0][0] = ${(C_mat[0][0] * 1e9).toFixed(3)} nF, G_comp[0][0] = ${G_comp[0][0].toFixed(2)} S, Symmetric: ${isSymmetric}`,
  });
  console.log(`${t7Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 3.2: Swept Frequency Response Analysis (SFRA) 20 Hz to 2 MHz
  const sfraNormal = stray.computeSFRA(20, 2e6, 250, 'healthy');
  const sfraDeformed = stray.computeSFRA(20, 2e6, 250, 'winding_deformation');

  const hasResonances = sfraNormal.resonancePeaks.length >= 1;
  const detectsWindingShift = sfraDeformed.magnitudeDb[100] !== sfraNormal.magnitudeDb[100];

  const t8Passed = sfraNormal.points.length === 250 && hasResonances && detectsWindingShift;
  results.push({
    groupName: 'HF Stray Capacitance & SFRA',
    test: 'SFRA Frequency Scan (20 Hz - 2 MHz) & Winding Deformation Discrimination',
    passed: t8Passed,
    message: `Scanned 250 points, Detected ${sfraNormal.resonancePeaks.length} resonances, Deformation signature delta = ${Math.abs(sfraDeformed.magnitudeDb[100] - sfraNormal.magnitudeDb[100]).toFixed(2)} dB`,
  });
  console.log(`${t8Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 3.3: High-Voltage Condenser Bushing Voltage Divider Ratio
  const bushingTest = stray.computeBushingTapVoltage(138000.0 / Math.sqrt(3));
  const expectedTapV = (138000.0 / Math.sqrt(3)) * (500e-12 / (500e-12 + 3000e-12));

  const t9Passed = Math.abs(bushingTest.V_tap - expectedTapV) < 1.0;
  results.push({
    groupName: 'HF Stray Capacitance & SFRA',
    test: 'Condenser Bushing C1/C2 Capacitive Voltage Division',
    passed: t9Passed,
    message: `V_tap = ${bushingTest.V_tap.toFixed(1)} V (Expected: ${expectedTapV.toFixed(1)} V, Ratio: ${(bushingTest.divisionRatio * 100).toFixed(2)}%)`,
  });
  console.log(`${t9Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // =========================================================================
  // GROUP 4: Zig-Zag Grounding & Quadrature Booster Phase Shifters
  // =========================================================================
  console.log('\n--- Group 4: Zig-Zag Grounding & Quadrature Booster (PST) ---');

  // Test 4.1: Zig-Zag Grounding Transformer Zero-Sequence Cancellation
  const zigzag = new ZigZagTransformer('ZigZag_1', {
    V_nom_kV: 13.8,
    MVA_rating: 10.0,
    R_winding_pu: 0.005,
    X_leakage_pu: 0.05,
    X_mag_pu: 250.0,
    R_neutral: 10.0,
  });

  const seq = zigzag.getSequenceImpedances();
  const t10Passed = seq.Z1_mag > 1000.0 && seq.Z0_mag < 100.0 && seq.ratio_Z1_over_Z0 > 50.0;

  results.push({
    groupName: 'Zig-Zag & Phase Shifter',
    test: 'Zig-Zag Zero-Sequence Cancellation (Z1 >> Z0)',
    passed: t10Passed,
    message: `Z1 = ${seq.Z1_mag.toFixed(1)} Ω, Z0 = ${seq.Z0_mag.toFixed(1)} Ω (Z1/Z0 ratio = ${seq.ratio_Z1_over_Z0.toFixed(1)}x)`,
  });
  console.log(`${t10Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // Test 4.2: Zig-Zag Grounding Single-Line-to-Ground Fault EMT Simulation
  const zzState = zigzag.initState();
  // Apply SLG fault on Phase A in ungrounded delta system (Va = 0V, Vb = 13.8kV, Vc = 13.8kV, Vn = 0V)
  const vFault = new Float64Array([0.0, 13800.0, 13800.0, 0.0]);
  zigzag.updateEMTStep(vFault, 50e-6, zzState);


  const t11Passed = Math.abs(zzState.I_neutral) > 10.0 && Math.abs(zzState.I_0_seq) > 10.0;
  results.push({
    groupName: 'Zig-Zag & Phase Shifter',
    test: 'Zig-Zag SLG Ground Fault Neutral Return Current Injection',
    passed: t11Passed,
    message: `Neutral Return Current I_N = ${Math.abs(zzState.I_neutral).toFixed(1)} A, Zero-Seq I0 = ${Math.abs(zzState.I_0_seq).toFixed(1)} A`,
  });
  console.log(`${t11Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);


  // Test 4.3: Quadrature Booster Phase Shift Angle & Active Power Redirection
  const pst = new PhaseShiftingTransformer('PST_400kV', {
    V_nom_kV: 400.0,
    MVA_rating: 500.0,
    maxPhaseShiftDeg: 30.0,
    minPhaseShiftDeg: -30.0,
    totalTaps: 33,
    initialTap: 0,
  });

  const pstState = pst.initState();
  const P_tap0 = pst.calculateTheoreticalPowerFlow(400e3, 400e3, 40.0, 5.0, pstState); // delta = 5 deg

  pst.setTap(pstState, 10); // Tap +10 (+18.75 deg shift)
  const P_tap10 = pst.calculateTheoreticalPowerFlow(400e3, 400e3, 40.0, 5.0, pstState);

  pst.setTap(pstState, -10); // Tap -10 (-18.75 deg shift)
  const P_tapNeg10 = pst.calculateTheoreticalPowerFlow(400e3, 400e3, 40.0, 5.0, pstState);

  const t12Passed = P_tap10 > P_tap0 && P_tap0 > P_tapNeg10 && Math.abs(pstState.phaseAngleDeg - (-18.75)) < 1e-3;
  results.push({
    groupName: 'Zig-Zag & Phase Shifter',
    test: 'Quadrature Booster Active Power Redirection P(alpha)',
    passed: t12Passed,
    message: `P(Tap -10) = ${P_tapNeg10.toFixed(1)} MW < P(Tap 0) = ${P_tap0.toFixed(1)} MW < P(Tap +10) = ${P_tap10.toFixed(1)} MW`,
  });
  console.log(`${t12Passed ? '✅ PASS' : '❌ FAIL'}: ${results[results.length - 1].test} -> ${results[results.length - 1].message}`);

  // =========================================================================
  // Summary
  // =========================================================================
  const allPassed = results.every(r => r.passed);
  console.log('\n========================================');
  console.log(`🏁 PHASE 14 TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
  console.log(`   ${results.filter(r => r.passed).length} / ${results.length} Test Benches Passed`);
  console.log('========================================\n');

  return { allPassed, results };
}
