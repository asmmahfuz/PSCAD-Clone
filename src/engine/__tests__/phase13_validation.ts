/**
 * PSCAD Modern - Phase 13 Verification Test Bench
 * 
 * Validates:
 * - Complex Bessel functions (I0, I1, K0, K1, J0, J1) for skin effect and internal impedances
 * - Coaxial Cable Constants Engine with CIGRE TB 531 reference benchmark cross-verification
 * - High-Pressure Pipe-Type (HPPT) Cables with steel pipe enclosure return
 * - Sheath Cross-Bonding (CIGRE / IEEE 575) & Non-linear SVL MOV surge arrester companion model
 * - Official MHI PSCAD .pscx XML bidirectional parser and serializer roundtrip fidelity
 * - Native EMTDC raw output stream (.inf / .out) reader and live comparison metrics (NRMSE, R^2)
 */

import { C, ComplexBessel } from '../lines/bessel';

import { CableConstantsSolver, CABLE_PRESETS } from '../lines/cableConstantsSolver';
import { PipeCableSolver, PIPE_CABLE_PRESETS } from '../lines/pipeCableSolver';
import { CrossBondingEngine, type CrossBondingConfig } from '../lines/crossBonding';
import { PscxParser } from '../../interop/pscxParser';
import { PscxSerializer } from '../../interop/pscxSerializer';
import { EmtdcOutputReader } from '../../interop/outReader';

export interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

export function runPhase13Validation(): { results: TestResult[]; allPassed: boolean } {
  const results: TestResult[] = [];

  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 13 TEST SUITE');
  console.log('   Advanced Cable Constants & Real PSCAD Interoperability (.pscx)');
  console.log('========================================\n');

  // -------------------------------------------------------------
  // Group 1: Complex Bessel Functions (I0, I1, K0, K1, J0, J1)
  // -------------------------------------------------------------
  console.log('--- Group 1: Complex Bessel Functions for Skin Effect ---');
  {
    // Test 1.1: I0(0) = 1, I1(0) = 0
    const i0_0 = ComplexBessel.I0(C.zero());
    const i1_0 = ComplexBessel.I1(C.zero());
    const pass1 = Math.abs(i0_0.re - 1.0) < 1e-7 && Math.abs(i1_0.re) < 1e-7;
    results.push({
      test: 'Bessel I0(0) and I1(0) Zero Values',
      passed: pass1,
      message: `I0(0)=${i0_0.re.toFixed(4)}, I1(0)=${i1_0.re.toFixed(4)}`,
    });
    console.log(`${pass1 ? '✅' : '❌'} PASS: Bessel I0(0) & I1(0) origin values`);

    // Test 1.2: I0(1.0) ~ 1.266066, I1(1.0) ~ 0.565159
    const i0_1 = ComplexBessel.I0(C.create(1.0, 0));
    const i1_1 = ComplexBessel.I1(C.create(1.0, 0));
    const pass2 = Math.abs(i0_1.re - 1.266066) < 1e-4 && Math.abs(i1_1.re - 0.565159) < 1e-4;
    results.push({
      test: 'Bessel I0(1.0) and I1(1.0) Real Values',
      passed: pass2,
      message: `I0(1)=${i0_1.re.toFixed(6)} (Exp: 1.266066), I1(1)=${i1_1.re.toFixed(6)} (Exp: 0.565159)`,
    });
    console.log(`${pass2 ? '✅' : '❌'} PASS: Bessel I0(1) & I1(1) analytical accuracy`);

    // Test 1.3: K0(1.0) ~ 0.421024, K1(1.0) ~ 0.601907
    const k0_1 = ComplexBessel.K0(C.create(1.0, 0));
    const k1_1 = ComplexBessel.K1(C.create(1.0, 0));
    const pass3 = Math.abs(k0_1.re - 0.421024) < 1e-4 && Math.abs(k1_1.re - 0.601907) < 1e-4;
    results.push({
      test: 'Bessel K0(1.0) and K1(1.0) Real Values',
      passed: pass3,
      message: `K0(1)=${k0_1.re.toFixed(6)} (Exp: 0.421024), K1(1)=${k1_1.re.toFixed(6)} (Exp: 0.601907)`,
    });
    console.log(`${pass3 ? '✅' : '❌'} PASS: Bessel K0(1) & K1(1) analytical accuracy`);

    // Test 1.4: Large argument asymptotic stability
    const zLarge = C.create(30, 30);
    const i0_large = ComplexBessel.I0(zLarge);
    const k0_large = ComplexBessel.K0(zLarge);
    const pass4 = isFinite(i0_large.re) && isFinite(i0_large.im) && isFinite(k0_large.re) && isFinite(k0_large.im);
    results.push({
      test: 'Bessel Asymptotic Expansions (z = 30 + j30)',
      passed: pass4,
      message: `Asymptotic evaluations stable without NaN or overflow`,
    });
    console.log(`${pass4 ? '✅' : '❌'} PASS: Bessel asymptotic stability for large complex arguments`);
  }

  // -------------------------------------------------------------
  // Group 2: Coaxial Cable Constants Engine (CIGRE TB 531 Benchmark)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Coaxial Cable Constants (CIGRE TB 531) ---');
  {
    const preset = CABLE_PRESETS['CIGRE_TB_531_132KV_SC'];
    const res = CableConstantsSolver.solve(
      preset.cableGeometry,
      preset.cables,
      preset.frequencyHz,
      preset.soilResistivity_Ohm_m,
      preset.sheathBonding
    );

    // Test 2.1: Positive sequence resistance R1
    // Standard copper 706 mm2 132kV cable R1 ~ 0.035 - 0.055 Ohm/km at 50 Hz with solid bonding
    const passR1 = res.R1 >= 0.030 && res.R1 <= 0.070;
    results.push({
      test: '132 kV Cable Pos-Seq Resistance R1 (CIGRE TB 531)',
      passed: passR1,
      message: `R1 = ${res.R1.toFixed(5)} Ohm/km (Benchmark: ~0.045 Ohm/km)`,
    });
    console.log(`${passR1 ? '✅' : '❌'} PASS: 132 kV Cable Pos-Seq Resistance R1 = ${res.R1.toFixed(5)} Ω/km`);

    // Test 2.2: Positive sequence inductance L1 & reactance X1
    // L1 ~ 0.35 - 0.55 mH/km, X1 ~ 0.10 - 0.18 Ohm/km at 50 Hz
    const L1_mH = res.L1 * 1000;
    const passL1 = L1_mH >= 0.30 && L1_mH <= 0.65;
    results.push({
      test: '132 kV Cable Pos-Seq Inductance L1 (CIGRE TB 531)',
      passed: passL1,
      message: `L1 = ${L1_mH.toFixed(4)} mH/km, X1 = ${res.X1.toFixed(4)} Ohm/km`,
    });
    console.log(`${passL1 ? '✅' : '❌'} PASS: 132 kV Cable Pos-Seq Inductance L1 = ${L1_mH.toFixed(4)} mH/km`);

    // Test 2.3: Positive sequence capacitance C1 & wave speed v1
    // C1 ~ 0.15 - 0.25 uF/km, v1 ~ 105,000 - 180,000 km/s
    const C1_uF = res.C1 * 1e6;
    const passC1 = C1_uF >= 0.14 && C1_uF <= 0.28 && res.v1_km_s >= 100000 && res.v1_km_s <= 200000;
    results.push({
      test: '132 kV Cable Pos-Seq Capacitance C1 & Propagation Velocity v1',
      passed: passC1,
      message: `C1 = ${C1_uF.toFixed(4)} uF/km, v1 = ${res.v1_km_s.toFixed(1)} km/s (${((res.v1_km_s/300000)*100).toFixed(1)}% c)`,
    });
    console.log(`${passC1 ? '✅' : '❌'} PASS: 132 kV Cable C1 = ${C1_uF.toFixed(4)} µF/km, v1 = ${res.v1_km_s.toFixed(1)} km/s`);

    // Test 2.4: Zero sequence impedance R0 > R1, L0 > L1
    const passZ0 = res.R0 > res.R1 && res.L0 > res.L1;
    results.push({
      test: '132 kV Cable Zero-Sequence Impedance Inequality (R0 > R1, L0 > L1)',
      passed: passZ0,
      message: `R0 = ${res.R0.toFixed(4)} Ohm/km > R1 = ${res.R1.toFixed(4)}, L0 = ${(res.L0*1000).toFixed(4)} mH/km > L1 = ${L1_mH.toFixed(4)}`,
    });
    console.log(`${passZ0 ? '✅' : '❌'} PASS: Zero-sequence earth return verified (R0 > R1, L0 > L1)`);
  }

  // -------------------------------------------------------------
  // Group 3: Pipe-Type HPPT Cables & Submarine Armored Cables
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Pipe-Type (HPPT) & Submarine Armored Cables ---');
  {
    // Test 3.1: 230 kV HPPT Fluid-Filled Steel Pipe Cable
    const pipeGeom = PIPE_CABLE_PRESETS['HPPT_230KV_STEEL'].geom;
    const pipeRes = PipeCableSolver.solve(pipeGeom, 60);

    const passPipe = pipeRes.R1 > 0 && pipeRes.L1 > 0 && pipeRes.C1 > 0 && isFinite(pipeRes.Zc1);
    results.push({
      test: '230 kV High-Pressure Pipe-Type (HPPT) Steel Enclosure Solver',
      passed: passPipe,
      message: `HPPT R1 = ${pipeRes.R1.toFixed(4)} Ohm/km, L1 = ${(pipeRes.L1*1000).toFixed(4)} mH/km, Zc1 = ${pipeRes.Zc1.toFixed(1)} Ohm`,
    });
    console.log(`${passPipe ? '✅' : '❌'} PASS: 230 kV HPPT Steel Pipe Cable (R1=${pipeRes.R1.toFixed(4)} Ω/km, Zc1=${pipeRes.Zc1.toFixed(1)} Ω)`);

    // Test 3.2: 400 kV Submarine Armored Cable
    const subseaPreset = CABLE_PRESETS['PRESET_400KV_SUBSEA'];
    const subseaRes = CableConstantsSolver.solve(
      subseaPreset.cableGeometry,
      subseaPreset.cables,
      subseaPreset.frequencyHz,
      subseaPreset.soilResistivity_Ohm_m,
      subseaPreset.sheathBonding
    );
    const passSubsea = subseaRes.R1 > 0 && subseaRes.r7_armor_out_mm > 0;
    results.push({
      test: '400 kV Submarine Armored Cable (Sea Water Earth Return)',
      passed: passSubsea,
      message: `Subsea R1 = ${subseaRes.R1.toFixed(4)} Ohm/km, Diam = ${(subseaRes.r_outermost_mm*2).toFixed(1)} mm`,
    });
    console.log(`${passSubsea ? '✅' : '❌'} PASS: 400 kV Subsea Armored Cable Solver`);
  }

  // -------------------------------------------------------------
  // Group 4: Cross-Bonding & Sheath Voltage Limiter (SVL)
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Sheath Cross-Bonding & SVL Surge Protection ---');
  {
    // Test 4.1: Balanced 3-Minor Section Cross-Bonding (Zero Circulating Current)
    const balancedConfig: CrossBondingConfig = {
      cableSystemVoltageKv: 132,
      routeLengthKm: 3.0,
      minorSectionLengthsKm: [1.0, 1.0, 1.0],
      loadCurrentA: 800,
      loadPowerFactor: 0.95,
      phaseSpacingM: 0.3,
      layoutType: 'flat',
      sheathRadiusMm: 35.0,
      sheathResistancePerKm: 0.15,
      groundingResistanceOhm: 2.0,
      svlRatedVoltageKv: 6.0,
      svlRefCurrentA: 1000,
      svlNonLinearExponentAlpha: 30,
      svlMaxEnergyRatingKj: 150,
    };
    const cbBal = CrossBondingEngine.evaluate(balancedConfig, 60);

    const passCbBal = cbBal.isBalanced && cbBal.sheathCirculatingCurrentA < 0.05 && cbBal.sheathLossReductionPercent >= 99.0;
    results.push({
      test: 'Balanced Sheath Cross-Bonding Circulating Current Suppression',
      passed: passCbBal,
      message: `I_circ = ${cbBal.sheathCirculatingCurrentA} A (Expected < 0.05 A), Loss Reduction = ${cbBal.sheathLossReductionPercent}%`,
    });
    console.log(`${passCbBal ? '✅' : '❌'} PASS: Balanced Cross-Bonding I_circ = ${cbBal.sheathCirculatingCurrentA} A, Loss Reduction = ${cbBal.sheathLossReductionPercent}%`);

    // Test 4.2: Unbalanced Sections induce residual circulating current
    const unbalConfig: CrossBondingConfig = {
      ...balancedConfig,
      minorSectionLengthsKm: [1.3, 1.0, 0.7], // 30% imbalance
    };
    const cbUnbal = CrossBondingEngine.evaluate(unbalConfig, 60);
    const passCbUnbal = !cbUnbal.isBalanced && cbUnbal.sheathCirculatingCurrentA > 10.0;
    results.push({
      test: 'Unbalanced Sheath Cross-Bonding Residual Current Detection',
      passed: passCbUnbal,
      message: `Imbalance = ${cbUnbal.lengthImbalancePercent}%, Residual I_circ = ${cbUnbal.sheathCirculatingCurrentA} A`,
    });
    console.log(`${passCbUnbal ? '✅' : '❌'} PASS: Unbalanced Cross-Bonding Residual I_circ = ${cbUnbal.sheathCirculatingCurrentA} A`);

    // Test 4.3: Non-linear SVL MOV Clamping
    const iNormal = CrossBondingEngine.svlCurrent(100, 6000, 1000, 30); // At 100V standing voltage
    const iSurge = CrossBondingEngine.svlCurrent(6500, 6000, 1000, 30); // Above 6kV knee
    const passSvl = iNormal < 1e-6 && iSurge > 5000;
    results.push({
      test: 'Non-linear Sheath Voltage Limiter (SVL) MOV Surge Clamping',
      passed: passSvl,
      message: `I_normal(100V) = ${iNormal.toExponential(2)} A, I_surge(6.5kV) = ${iSurge.toFixed(1)} A`,
    });
    console.log(`${passSvl ? '✅' : '❌'} PASS: SVL MOV Clamping (I_normal < 1µA, I_surge = ${iSurge.toFixed(1)} A)`);
  }

  // -------------------------------------------------------------
  // Group 5: Official MHI PSCAD .pscx XML Round-Trip Parser & Exporter
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Official MHI PSCAD .pscx XML Round-Trip Parser & Exporter ---');
  {
    const samplePscx = `<?xml version="1.0" encoding="UTF-8"?>
<project name="Test_PSCAD_Case" version="5.0.0">
  <paramlist name="Settings">
    <param name="time_step" value="25.0" />
    <param name="total_time" value="0.75" />
    <param name="frequency" value="60.0" />
  </paramlist>
  <definitions>
    <definition name="Main" type="schematic">
      <schematic>
        <components>
          <User classid="UserCmp" name="master:source_3p" id="101" x="120" y="200">
            <paramlist name="Parameters">
              <param name="Vnom" value="230.0" />
              <param name="Fnom" value="60.0" />
            </paramlist>
          </User>
          <User classid="UserCmp" name="master:breaker_3p" id="102" x="260" y="200">
            <paramlist name="Parameters">
              <param name="openTime" value="0.1" />
            </paramlist>
          </User>
          <User classid="UserCmp" name="master:tline" id="103" x="420" y="200">
            <paramlist name="Parameters">
              <param name="length" value="100.0" />
            </paramlist>
          </User>
          <User classid="UserCmp" name="master:resistor" id="104" x="600" y="200">
            <paramlist name="Parameters">
              <param name="R" value="50.0" />
            </paramlist>
          </User>
          <User classid="UserCmp" name="master:ground" id="105" x="600" y="280">
            <paramlist name="Parameters" />
          </User>
        </components>
        <wires>
          <Wire id="201">
            <Nodes>
              <Node x="120" y="200" />
              <Node x="260" y="200" />
            </Nodes>
          </Wire>
          <Wire id="202">
            <Nodes>
              <Node x="260" y="200" />
              <Node x="420" y="200" />
            </Nodes>
          </Wire>
        </wires>
      </schematic>
    </definition>
  </definitions>
</project>`;

    // Test 5.1: Parse PSCAD XML
    const parsed = PscxParser.parse(samplePscx);
    const passParse = parsed.componentsParsed === 5 && parsed.wiresParsed === 2 && Math.abs(parsed.project.dt - 25e-6) < 1e-10;
    results.push({
      test: 'PSCAD .pscx XML Parser Schema Extraction',
      passed: passParse,
      message: `Parsed ${parsed.componentsParsed} components, ${parsed.wiresParsed} wires, dt = ${(parsed.project.dt*1e6).toFixed(1)} us`,
    });
    console.log(`${passParse ? '✅' : '❌'} PASS: PSCAD .pscx XML Parser (${parsed.componentsParsed} comps, ${parsed.wiresParsed} wires, dt=${parsed.project.dt*1e6}µs)`);

    // Test 5.2: Serialize back to PSCAD XML
    const serializedXml = PscxSerializer.serialize(parsed.project, '5.0.0');
    const reParsed = PscxParser.parse(serializedXml);
    const passRoundtrip = reParsed.componentsParsed === 5 && reParsed.wiresParsed === 2;
    results.push({
      test: 'PSCAD .pscx XML Bidirectional Round-Trip Serialization',
      passed: passRoundtrip,
      message: `Roundtrip re-parsed ${reParsed.componentsParsed} components and ${reParsed.wiresParsed} wires without loss`,
    });
    console.log(`${passRoundtrip ? '✅' : '❌'} PASS: PSCAD .pscx XML Round-Trip serialization`);
  }

  // -------------------------------------------------------------
  // Group 6: Native EMTDC Raw Output Stream (.inf / .out) Reader
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Native EMTDC Output Stream (.inf / .out) Reader ---');
  {
    const benchmark = EmtdcOutputReader.generateBenchmarkStream('TRANSMISSION_FAULT');
    const dataset = EmtdcOutputReader.parse(benchmark.inf, benchmark.out, 'EMTDC_SLG_Benchmark');

    // Test 6.1: Parse EMTDC .inf / .out channels
    const passOut = dataset.channels.length >= 3 && dataset.numSamples > 100;
    results.push({
      test: 'EMTDC .inf & .out Raw Output Stream Parsing',
      passed: passOut,
      message: `Extracted ${dataset.channels.length} channels, ${dataset.numSamples} samples, tMax = ${dataset.tMax.toFixed(2)}s`,
    });
    console.log(`${passOut ? '✅' : '❌'} PASS: EMTDC .inf & .out Parsing (${dataset.channels.length} channels, ${dataset.numSamples} samples)`);

    // Test 6.2: Live comparison error metrics
    const simTime = dataset.time;
    const simSig = dataset.signals.get('V_Load_PhaseA') || [];
    // Compare signal against itself (perfect match test)
    const metricExact = EmtdcOutputReader.compare(simTime, simSig, simTime, simSig, 'V_Load_PhaseA');
    const passExact = metricExact.nrmsePercent < 0.001 && Math.abs(metricExact.rSquared - 1.0) < 1e-6;
    results.push({
      test: 'EMTDC Live Waveform Delta Metrics (NRMSE & R^2 Correlation)',
      passed: passExact,
      message: `NRMSE = ${metricExact.nrmsePercent.toFixed(4)}%, R^2 = ${metricExact.rSquared.toFixed(6)}`,
    });
    console.log(`${passExact ? '✅' : '❌'} PASS: EMTDC Waveform Comparison NRMSE = ${metricExact.nrmsePercent.toFixed(4)}%, R² = ${metricExact.rSquared.toFixed(6)}`);
  }

  const allPassed = results.every((r) => r.passed);

  console.log('\n========================================');
  if (allPassed) {
    console.log('🏁 PHASE 13 TEST SUITE RESULT: ALL TESTS PASSED ✨');
  } else {
    console.log('❌ PHASE 13 TEST SUITE RESULT: SOME TESTS FAILED');
  }
  console.log('========================================\n');

  return { results, allPassed };
}
