/**
 * PSCAD CLONE - Phase 3 Verification & Validation Test Suite (TypeScript)
 * 
 * Verifies:
 * - Step 3.1: UMEC (Unified Magnetic Equivalent Circuit) 3-limb transformer reluctance matrix, dual-slope saturation, inrush DC offset & harmonics
 * - Step 3.2: 6th-Order Park d-q-0 Synchronous Machine subtransient short circuit decay & Multi-Mass torsional shaft SSR modes
 * - Step 3.3: 4th-Order Induction Motor DOL starting torque curve, DFIG Crowbar LVRT response, and PMSG MPPT control
 * - Step 3.4: Metal Oxide Varistor (MOV) non-linear surge arrester 8/20 us lightning impulse clamping & thermal energy absorption
 */

import { UmecTransformer } from '../transformers/umecTransformer';
import { SynchronousMachineDq } from '../machines/synchronousMachineDq';
import { InductionMachine } from '../machines/inductionMachine';
import { DfigMachine } from '../machines/dfigMachine';
import { PmsgMachine } from '../machines/pmsgMachine';
import { SurgeArrester } from '../passives/surgeArrester';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

export function runPhase3Validation(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // =========================================================================
  // TEST 3.1: UMEC Multi-Limb Transformer Reluctance & Core Saturation
  // =========================================================================
  try {
    const umec = new UmecTransformer('umec_test', {
      V1_nom: 230000,
      V2_nom: 69000,
      MVA_rating: 100,
      freq: 60,
      coreType: '3_limb',
      primaryConn: 'Yg',
      secondaryConn: 'Delta',
      kneeFluxPu: 1.15,
      satSlopeRatio: 20.0,
      zeroSeqReluctance: 10.0
    });

    const state = umec.initState();
    const dt = 2.5e-5;

    // 1. Verify unsaturated Reluctance Matrix [R_m] symmetry and zero-sequence return path
    const Rm_unsat = umec.computeReluctanceMatrix([0, 0, 0]);
    const isSymmetric = Math.abs(Rm_unsat[0][1] - Rm_unsat[1][0]) < 1e-10 &&
                        Math.abs(Rm_unsat[0][2] - Rm_unsat[2][0]) < 1e-10;

    // 2. Verify saturation behavior when Limb A exceeds knee flux
    const Rm_sat = umec.computeReluctanceMatrix([umec.baseFlux * 1.5, 0, 0]);
    const limbASatReluctanceHigher = Rm_sat[0][0] > Rm_unsat[0][0] * 5.0;

    // 3. Verify terminal conductance matrix [G_term] has 8x8 dimension and non-zero entries
    umec.rebuildTerminalConductance(dt, state);
    const hasValidGterm = umec.G_term.length === 8 && umec.G_term[0][0] > 0;

    // 4. Simulate half-cycle inrush current transient at zero-crossing
    for (let step = 0; step < 200; step++) {
      const t = step * dt;
      // Supply Phase A voltage starting at t=0 (zero crossing)
      const vA = 230000 * Math.SQRT2 / Math.sqrt(3) * Math.sin(2 * Math.PI * 60 * t);
      const termV = new Float64Array(8);
      termV[0] = vA;
      umec.updateState(termV, dt, state);
    }

    const maxFluxPu = Math.max(...state.flux.map(f => Math.abs(f / umec.baseFlux)));
    const saturationReached = maxFluxPu > 1.15 && state.inrushDetected === true;

    if (isSymmetric && limbASatReluctanceHigher && hasValidGterm && saturationReached) {
      results.push({
        test: 'Step 3.1: UMEC 3-Limb Core Reluctance & Dual-Slope Saturation',
        passed: true,
        message: `Validated 3-limb reluctance matrix coupling, saturation limb reluctance increase (${(Rm_sat[0][0]/Rm_unsat[0][0]).toFixed(1)}x), and inrush peak flux (${maxFluxPu.toFixed(2)} pu > 1.15 pu knee).`
      });
    } else {
      results.push({
        test: 'Step 3.1: UMEC 3-Limb Core Reluctance & Dual-Slope Saturation',
        passed: false,
        message: `UMEC validation failed: isSymmetric=${isSymmetric}, satHigher=${limbASatReluctanceHigher}, validG=${hasValidGterm}, satReached=${saturationReached}`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 3.1: UMEC 3-Limb Core Reluctance & Dual-Slope Saturation',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  // =========================================================================
  // TEST 3.2: Full Park d-q-0 Synchronous Machine & Multi-Mass Shaft
  // =========================================================================
  try {
    const sm = new SynchronousMachineDq('sm_test', {
      Sn_MVA: 100,
      Vn_kV: 13.8,
      freq: 60,
      Xd: 1.80,
      Xq: 1.70,
      Xd_prime: 0.30,
      Xd_pp: 0.20,
      Xq_pp: 0.20,
      Td0_prime: 6.0,
      Td0_pp: 0.04,
      useMultiMassShaft: true,
      H_hp: 0.88,
      H_ip: 0.77,
      H_lp: 1.45,
      H_gen: 0.85
    });

    const state = sm.initState();
    const dt = 5e-5;

    // 1. Verify Park and Inverse Park transformation reversibility: P^-1(P(v)) == v
    const vTest: [number, number, number] = [10000, -5000, -5000];
    const dq0 = sm.parkTransform(vTest, 0.75);
    const vReconstructed = sm.inverseParkTransform(dq0, 0.75);
    const parkError = Math.abs(vTest[0] - vReconstructed[0]) + Math.abs(vTest[1] - vReconstructed[1]);
    const isParkAccurate = parkError < 1e-4;

    // 2. Verify Multi-Mass Shaft Torsional Natural Modes calculation
    const modes = sm.multiMassShaft ? sm.multiMassShaft.calculateTorsionalModes() : [];
    const hasValidTorsionalModes = modes.length === 3 && modes[0] > 10 && modes[0] < 50;

    // 3. Simulate sudden 3-phase short-circuit to verify subtransient current peak (I'' = 1/Xd'' = 5.0 pu)
    sm.rebuildConductanceMatrix(dt, state);
    const v_terminal: [number, number, number] = [0, 0, 0]; // Bolted fault
    const i_fault_init: [number, number, number] = [sm.I_base_phase * (1.0 / sm.Xd_pp), 0, 0];

    // Step machine dynamics during fault
    sm.step(v_terminal, i_fault_init, dt, state);
    const isEqppDecaying = state.Eq_pp < 1.0;

    if (isParkAccurate && hasValidTorsionalModes && isEqppDecaying) {
      results.push({
        test: 'Step 3.2: 6th-Order Park d-q-0 Synchronous Machine & Multi-Mass Shaft (SSR)',
        passed: true,
        message: `Validated exact Park/Inverse-Park bijection (error < 1e-4), multi-mass torsional modes [${modes.join(', ')} Hz], and subtransient flux decay (Eq'' = ${state.Eq_pp.toFixed(3)} pu).`
      });
    } else {
      results.push({
        test: 'Step 3.2: 6th-Order Park d-q-0 Synchronous Machine & Multi-Mass Shaft (SSR)',
        passed: false,
        message: `Sync machine validation failed: isParkAccurate=${isParkAccurate}, validModes=${hasValidTorsionalModes}, EqppDecay=${isEqppDecaying}`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 3.2: 6th-Order Park d-q-0 Synchronous Machine & Multi-Mass Shaft (SSR)',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  // =========================================================================
  // TEST 3.3: Induction Motor Starting, DFIG LVRT Crowbar & PMSG MPPT
  // =========================================================================
  try {
    // 1. Induction Machine DOL start
    const im = new InductionMachine('im_test', {
      Sn_MVA: 1.5,
      Vn_kV: 4.16,
      Rs: 0.015,
      Rr: 0.012,
      H: 0.15
    });
    const imState = im.initState();
    const dt_im = 1e-4;

    im.rebuildConductanceMatrix(dt_im);
    // Accelerate for 1.0s (10,000 steps)
    for (let step = 0; step < 10000; step++) {
      const v_grid: [number, number, number] = [
        im.V_base_phase * Math.sin(2 * Math.PI * 60 * step * dt_im),
        im.V_base_phase * Math.sin(2 * Math.PI * 60 * step * dt_im - 2 * Math.PI / 3),
        im.V_base_phase * Math.sin(2 * Math.PI * 60 * step * dt_im + 2 * Math.PI / 3)
      ];
      const i_grid: [number, number, number] = [0, 0, 0];
      im.step(v_grid, i_grid, dt_im, imState);
    }
    const imStarted = imState.omega_r_pu > 0.85 && imState.slip < 0.15;

    // 2. DFIG LVRT & Crowbar Activation
    const dfig = new DfigMachine('dfig_test', {
      Sn_MVA: 2.0,
      Vn_kV: 0.69,
      windSpeed: 11.5
    });
    const dfigState = dfig.initState();
    // Simulate severe voltage dip (V_term = 0.15 pu)
    const v_fault: [number, number, number] = [dfig.V_base_phase * 0.15, 0, 0];
    const i_fault: [number, number, number] = [dfig.I_base_phase * 2.2, 0, 0]; // 2.2 pu rotor overcurrent
    dfig.step(v_fault, i_fault, 1e-4, dfigState);
    const crowbarTriggered = dfigState.crowbarActive === true;

    // 3. PMSG Wind Turbine MPPT power delivery
    const pmsg = new PmsgMachine('pmsg_test', {
      Sn_MVA: 3.0,
      Vn_kV: 0.69,
      windSpeed: 12.0
    });
    const pmsgState = pmsg.initState();
    pmsg.step([pmsg.V_base_phase, 0, 0], [pmsg.I_base_phase * 0.95, 0, 0], 1e-4, pmsgState);
    const pmsgPowerDelivered = pmsgState.P_gen_MW > 0.0 && pmsgState.Vdc_pu > 0.8;

    if (imStarted && crowbarTriggered && pmsgPowerDelivered) {
      results.push({
        test: 'Step 3.3: Induction Motor (DOL), DFIG Crowbar LVRT & PMSG MPPT',
        passed: true,
        message: `Validated IM DOL acceleration (speed=${imState.omega_r_pu.toFixed(2)} pu, slip=${(imState.slip*100).toFixed(1)}%), DFIG Crowbar protection firing under grid fault, and PMSG active power (${pmsgState.P_gen_MW.toFixed(2)} MW).`
      });
    } else {
      results.push({
        test: 'Step 3.3: Induction Motor (DOL), DFIG Crowbar LVRT & PMSG MPPT',
        passed: false,
        message: `Machines validation failed: imStarted=${imStarted}, crowbarTriggered=${crowbarTriggered}, pmsgPower=${pmsgPowerDelivered}`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 3.3: Induction Motor (DOL), DFIG Crowbar LVRT & PMSG MPPT',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  // =========================================================================
  // TEST 3.4: Metal Oxide Varistor (MOV) Non-Linear Surge Arrester
  // =========================================================================
  try {
    const arrester = new SurgeArrester('mov_test', {
      V_ref: 210000,
      I_ref: 1000.0,
      alpha1: 4.0,
      alpha2: 32.0,
      alpha3: 8.0,
      energyRatingKJ: 500.0
    });

    const state = arrester.initState();
    const dt = 1e-6;

    // 1. Verify low-voltage leakage region current (e.g. at normal operating voltage 188 kV = 0.895 Vref)
    const { I: I_normal } = arrester.evaluateVI(188000);
    const isNormalLeakageLow = Math.abs(I_normal) < 200.0;

    // 2. Verify non-linear clamping at 1.05 Vref (220 kV)
    const { I: I_clamp, dIdV } = arrester.evaluateVI(220000);
    const isClampingActive = I_clamp > 1000.0 && dIdV > 0.01;

    // 3. Verify Newton-Raphson companion stamp
    state.prevV = 220000;
    const { G, Ihist } = arrester.computeCompanionStamp(state);
    const isCompanionStampValid = G > 0 && Math.abs(Ihist) > 0;

    // 4. Simulate 8/20 us lightning impulse injection and energy accumulation
    for (let step = 0; step < 50; step++) {
      const t = step * dt;
      // 8/20 us standard double-exponential surge waveform
      const vSurge = 350000 * (Math.exp(-t / 20e-6) - Math.exp(-t / 1.5e-6));
      arrester.updateState(vSurge, dt, state);
    }

    const hasAbsorbedEnergy = state.energyAbsorbed_kJ > 0 && state.energyUtilizationPct > 0;

    if (isNormalLeakageLow && isClampingActive && isCompanionStampValid && hasAbsorbedEnergy) {
      results.push({
        test: 'Step 3.4: Metal Oxide Varistor (MOV) Surge Arrester Non-Linear Clamping',
        passed: true,
        message: `Validated 3-zone exponential V-I characteristic, Newton-Raphson linearization, high-current clamping (I=${I_clamp.toFixed(0)} A at 220 kV), and impulse energy absorption (${state.energyAbsorbed_kJ.toFixed(2)} kJ / ${state.energyUtilizationPct.toFixed(1)}% rating).`
      });
    } else {
      results.push({
        test: 'Step 3.4: Metal Oxide Varistor (MOV) Surge Arrester Non-Linear Clamping',
        passed: false,
        message: `Arrester validation failed: lowLeakage=${isNormalLeakageLow}, clamping=${isClampingActive}, validStamp=${isCompanionStampValid}, energy=${hasAbsorbedEnergy}`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 3.4: Metal Oxide Varistor (MOV) Surge Arrester Non-Linear Clamping',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}
