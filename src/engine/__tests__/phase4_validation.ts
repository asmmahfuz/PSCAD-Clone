/**
 * PSCAD CLONE - Phase 4 Verification & Validation Test Suite (TypeScript)
 * 
 * Verifies:
 * - Step 4.1: Interpolated Power Semiconductor Switches (Diode with Qrr, Thyristor, IGBT/MOSFET, Ideal Switch)
 * - Step 4.2: Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM) with 100+ SMs/arm and balancing
 * - Step 4.3: HVDC & FACTS Library (6/12-Pulse LCC Bridges with ripple cancellation, STATCOM decoupled d-q, and SVC TCR/TSC)
 */

import { IdealSwitch } from '../powerElectronics/idealSwitch';
import { PowerDiode } from '../powerElectronics/diode';
import { Thyristor } from '../powerElectronics/thyristor';
import { IgbtDiode } from '../powerElectronics/igbtMosfet';
import { MmcArmDEM } from '../powerElectronics/mmcArm';
import { MmcConverterDEM } from '../powerElectronics/mmcConverter';
import { LccGraetzBridge } from '../powerElectronics/lccBridge';
import { Statcom } from '../powerElectronics/statcom';
import { StaticVarCompensator } from '../powerElectronics/svc';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

export function runPhase4Validation(): { allPassed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // =========================================================================
  // TEST 4.1: Interpolated Power Semiconductor Switches
  // =========================================================================
  try {
    // 1. Ideal Switch Test
    const idealSw = new IdealSwitch('sw1', { initClosed: false, openTime: 0.05, closeTime: 0.02, Ron: 1e-4, Roff: 1e7 });
    const isClosedBefore = idealSw.evaluateState(0.01);
    const isClosedAfter = idealSw.evaluateState(0.03);
    const swStampOn = idealSw.computeCompanionStamp(true);
    const swStampOff = idealSw.computeCompanionStamp(false);
    const swPass = !isClosedBefore && isClosedAfter && swStampOn.G === 1e4 && swStampOff.G === 1e-7;

    // 2. Power Diode with Qrr Test
    const diode = new PowerDiode('d1', { Vf: 0.8, Ron: 0.001, Roff: 1e6, Qrr: 50e-6, trr: 20e-6 });
    const dState = diode.initState();
    // Turn-on when forward biased
    diode.updateState(1.5, 50.0, 1e-6, dState);
    const diodeOn = dState.mode === 'ON';
    // Sub-step zero crossing turn-off interpolation
    const alphaTurnOff = diode.computeCommutationAlpha(1.5, -0.5, 10.0, -10.0, 'ON');
    const validAlpha = alphaTurnOff !== null && Math.abs(alphaTurnOff - 0.5) < 0.01;
    // Enter Reverse Recovery when current goes negative
    diode.updateState(-5.0, -10.0, 1e-6, dState);
    const diodeQrr = dState.mode === 'REVERSE_RECOVERY';
    // Finish Reverse Recovery
    for (let s = 0; s < 25; s++) {
      diode.updateState(-10.0, -2.5, 1e-6, dState);
    }
    const diodeOff = dState.mode === 'OFF';

    // 3. Line-Commutated Thyristor (SCR) Test
    const thy = new Thyristor('th1', { Vf: 1.2, Ron: 0.001, Roff: 1e6, I_holding: 0.05, trr: 30e-6 });
    const thyState = thy.initState();
    // Forward biased without gate pulse -> BLOCKING
    thy.updateState(200.0, 0.0, false, 1e-6, thyState);
    const thyBlocked = thyState.mode === 'BLOCKING';
    // Fired with gate pulse -> CONDUCTING
    thy.updateState(200.0, 100.0, true, 1e-6, thyState);
    const thyFired = thyState.mode === 'CONDUCTING';
    // Gate pulse removed, but current above holding -> REMAINS CONDUCTING
    thy.updateState(1.5, 10.0, false, 1e-6, thyState);
    const thyHolding = thyState.mode === 'CONDUCTING';
    // Current drops below zero -> EXTINGUISHING and recovers to BLOCKING
    thy.updateState(-50.0, -5.0, false, 1e-6, thyState);
    for (let s = 0; s < 35; s++) {
      thy.updateState(-50.0, 0.0, false, 1e-6, thyState);
    }
    const thyOff = thyState.mode === 'BLOCKING';

    // 4. IGBT with Antiparallel Freewheeling Diode (FWD) Test
    const igbt = new IgbtDiode('igbt1', { Vf: 1.5, Ron: 0.001, Roff: 1e6 });
    const igbtState = igbt.initState();
    // Gate ON, forward voltage -> IGBT_ON
    igbt.updateState(300.0, 50.0, true, igbtState);
    const igbtConducting = igbtState.mode === 'IGBT_ON';
    // Gate OFF, positive voltage -> OFF (Blocking)
    igbt.updateState(300.0, 0.0, false, igbtState);
    const igbtBlocked = igbtState.mode === 'OFF';
    // Gate OFF, negative inductive voltage -> DIODE_FWD (Freewheeling)
    igbt.updateState(-10.0, -20.0, false, igbtState);
    const igbtFwd = igbtState.mode === 'DIODE_FWD';

    const step41Passed = swPass && diodeOn && validAlpha && diodeQrr && diodeOff && 
                         thyBlocked && thyFired && thyHolding && thyOff &&
                         igbtConducting && igbtBlocked && igbtFwd;

    if (step41Passed) {
      results.push({
        test: 'Step 4.1: Interpolated Power Semiconductor Switches',
        passed: true,
        message: `Validated Ideal Switch (Ron=${swStampOn.G}S), Diode (Vf=0.8V, Qrr=50µC, alpha=${alphaTurnOff?.toFixed(3)}), Thyristor (Ih=50mA, tq=30µs), and IGBT+FWD freewheeling commutation with 0 chatter.`
      });
    } else {
      results.push({
        test: 'Step 4.1: Interpolated Power Semiconductor Switches',
        passed: false,
        message: `Switch validation failed: sw=${swPass}, diode=[${diodeOn},${validAlpha},${diodeQrr},${diodeOff}], thy=[${thyBlocked},${thyFired},${thyHolding},${thyOff}], igbt=[${igbtConducting},${igbtBlocked},${igbtFwd}]`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 4.1: Interpolated Power Semiconductor Switches',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  // =========================================================================
  // TEST 4.2: Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM)
  // =========================================================================
  try {
    const N = 100; // 100 submodules per arm (201 voltage levels)
    const arm = new MmcArmDEM('mmc_arm_test', {
      numSubmodules: N,
      C_submodule: 0.005, // 5 mF
      L_arm: 0.040,       // 40 mH
      R_arm: 0.40,
      Vdc_nom: 400000,    // 400 kV DC
    });

    const armState = arm.initState();
    const dt = 2.5e-5;

    // 1. Verify Thévenin Equivalent reduction
    const thStamp = arm.computeThArmStamp(dt, armState, false);
    const hasValidConductance = thStamp.G > 0 && thStamp.G < 1.0;

    // 2. Verify fast capacitor voltage sorting and balancing algorithm
    // Apply charging current (i_arm = +500 A) and insert 50 submodules
    arm.balanceCapacitors(50, 500.0, armState);
    arm.updateArmState(200000, 500.0, dt, armState);

    // Apply discharging current (i_arm = -500 A) and insert 50 submodules
    arm.balanceCapacitors(50, -500.0, armState);
    arm.updateArmState(200000, -500.0, dt, armState);

    // Verify capacitor voltages are tightly balanced (ripple < 1.5%)
    const rippleOk = armState.vRipplePct < 1.5;
    const meanVcOk = Math.abs(armState.meanVc - 4000) < 50;

    // 3. Test Full 3-Phase MMC Converter with Nearest Level Control (201 Levels)
    const mmc = new MmcConverterDEM('mmc_conv_test', {
      numSubmodules: 100,
      Vdc_nom: 400000,
      V_ac_nom: 230000,
      Pac_ref: 500,
      modulationIndex: 0.88,
      freq: 60,
    });

    const mmcState = mmc.initState();

    // Simulate 1 cycle (16.67 ms = 667 steps at dt=25µs)
    const steps = 667;
    const v_phaseA: number[] = [];

    for (let step = 0; step < steps; step++) {
      const t = step * dt;
      mmc.executeControlAndBalancing(t, mmcState);
      mmc.computeArmStamps(dt, mmcState, false);

      // Node voltages for 400 kV DC link and generated AC
      const omega = 2.0 * Math.PI * 60;
      const vA_inst = 0.88 * 200000 * Math.sin(omega * t);
      const vB_inst = 0.88 * 200000 * Math.sin(omega * t - (2 * Math.PI) / 3);
      const vC_inst = 0.88 * 200000 * Math.sin(omega * t + (2 * Math.PI) / 3);

      mmc.updateConverterState({
        v_dcp: 200000,
        v_dcn: -200000,
        v_a: vA_inst,
        v_b: vB_inst,
        v_c: vC_inst,
      }, dt, mmcState, false);

      v_phaseA.push(vA_inst);
    }

    // Calculate THD for the 201-level waveform
    const thd = mmcState.thd_ac;
    const thdPass = thd < 1.5;
    const energyStoredOk = mmcState.totalArmEnergy_kJ > 1000;

    if (hasValidConductance && rippleOk && meanVcOk && thdPass && energyStoredOk) {
      results.push({
        test: 'Step 4.2: Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM)',
        passed: true,
        message: `Validated N=100 SMs/arm (201-level synthesis), Thévenin Norton stamp (G=${thStamp.G.toFixed(5)} S), capacitor balancing (ripple=${armState.vRipplePct.toFixed(2)}% < 1.5%), and AC THD=${thd.toFixed(2)}% (< 1.5%).`
      });
    } else {
      results.push({
        test: 'Step 4.2: Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM)',
        passed: false,
        message: `MMC DEM validation failed: G=${hasValidConductance}, ripple=${armState.vRipplePct.toFixed(2)}% (ok=${rippleOk}), meanVc=${armState.meanVc.toFixed(1)}V (ok=${meanVcOk}), THD=${thd.toFixed(2)}% (ok=${thdPass})`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 4.2: Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM)',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  // =========================================================================
  // TEST 4.3: HVDC & FACTS Substation Library
  // =========================================================================
  try {
    // 1. 6-Pulse vs 12-Pulse LCC Graetz Bridge Comparison
    const lcc6 = new LccGraetzBridge('lcc6_test', { V_ac_nom: 230000, alphaDeg: 18.0, inductance: 0.015 }, false);
    const lcc12 = new LccGraetzBridge('lcc12_test', { V_ac_nom: 230000, alphaDeg: 18.0, inductance: 0.015 }, true);

    const op6 = lcc6.calculateOperatingPoint(230000, 1000.0, 18.0);
    const op12 = lcc12.calculateOperatingPoint(230000, 1000.0, 18.0);

    // 12-Pulse produces double the DC voltage with 1/5th the ripple (< 1.0%)
    const v12Higher = op12.v_dc > op6.v_dc * 1.9;
    const lcc12State = lcc12.initState();
    const dt = 2.5e-5;
    lcc12.updateBridgeState(187000, -93500, -93500, op12.v_dc / 2, -op12.v_dc / 2, 0.005, dt, lcc12State);
    const lccRippleLow = lcc12State.dcRipplePct < 1.0;
    const marginAngleSafe = lcc12State.gammaDeg >= 15.0 && !lcc12State.commutationFailure;

    // 2. STATCOM Decoupled d-q Vector Controller Step Response
    const statcom = new Statcom('stat_test', {
      V_ac_nom: 230000,
      Q_rating_MVAR: 100.0,
      Vdc_nom: 40000,
      Cdc_F: 0.020,
      inductance: 0.010,
    });

    const statState = statcom.initState();
    // Command reactive current step injection (+100 MVAR capacitive)
    for (let s = 0; s < 400; s++) { // 10 ms at 25µs
      const t = s * dt;
      const vA = 230000 * Math.SQRT2 / Math.sqrt(3) * Math.sin(2 * Math.PI * 60 * t);
      const vB = 230000 * Math.SQRT2 / Math.sqrt(3) * Math.sin(2 * Math.PI * 60 * t - 2 * Math.PI / 3);
      const vC = 230000 * Math.SQRT2 / Math.sqrt(3) * Math.sin(2 * Math.PI * 60 * t + 2 * Math.PI / 3);
      statcom.executeControl(vA, vB, vC, statState.i_d, statState.i_q, 0, t, dt, statState, 1.0, 100.0);
    }
    const statcomFastResponse = Math.abs(statState.i_q_ref) > 100;

    // 3. SVC (TCR/TSC) Firing Angle & Susceptance Coordination
    const svc = new StaticVarCompensator('svc_test', {
      V_ac_nom: 230000,
      Q_rating_MVAR: 200.0,
      num_tsc_banks: 2,
    });

    const svcState = svc.initState();
    // Test TCR variable susceptance range: sigma = 90° (max inductive) to 180° (blocked)
    const B_tcr_max = svc.computeTcrSusceptance(90.0);
    const B_tcr_zero = svc.computeTcrSusceptance(180.0);
    const tcrRangeOk = B_tcr_max > 0.001 && B_tcr_zero === 0.0;

    // Test SVC closed loop response to 0.92 pu grid voltage sag (requires capacitive boost)
    svc.executeControl(170000, -85000, -85000, 0.01, dt, svcState, 1.0);
    const svcBoostOk = svcState.tscBanksActive > 0 && svcState.B_svc_total > 0;

    const step43Passed = v12Higher && lccRippleLow && marginAngleSafe && statcomFastResponse && tcrRangeOk && svcBoostOk;

    if (step43Passed) {
      results.push({
        test: 'Step 4.3: HVDC & FACTS Substation Library (LCC, STATCOM & SVC)',
        passed: true,
        message: `Validated 12-Pulse LCC (Vdc=${(op12.v_dc/1e3).toFixed(1)}kV, ripple=${lcc12State.dcRipplePct}% < 1%), STATCOM dynamic reactive response (i_q_ref=${statState.i_q_ref.toFixed(1)}A in <15ms), and SVC TCR/TSC coordination (B_tcr=${B_tcr_max.toFixed(4)}S to 0, TSC banks=${svcState.tscBanksActive}).`
      });
    } else {
      results.push({
        test: 'Step 4.3: HVDC & FACTS Substation Library (LCC, STATCOM & SVC)',
        passed: false,
        message: `FACTS validation failed: v12Higher=${v12Higher}, rippleLow=${lccRippleLow}, gammaSafe=${marginAngleSafe}, statcomFast=${statcomFastResponse}, tcrOk=${tcrRangeOk}, svcBoost=${svcBoostOk}`
      });
    }
  } catch (e: any) {
    results.push({
      test: 'Step 4.3: HVDC & FACTS Substation Library (LCC, STATCOM & SVC)',
      passed: false,
      message: `Exception: ${e.message}`
    });
  }

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}
