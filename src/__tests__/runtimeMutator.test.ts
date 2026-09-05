/**
 * PSCAD Modern - Unit & Integration Test Suite for Non-Pausing EMTDC Simulation State Mutator Bridge
 * Phase 19 - Step 19.4 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, LUSolver } from '../engine/matrix';
import {
  ShermanMorrisonEngine,
  PhaseContinuousIntegrator,
  RuntimeMutator,
  type BranchConductanceUpdate,
} from '../engine/runtimeMutator';
import { COMPONENT_TYPES } from '../constants';
import { CASE_STUDIES } from '../examples/caseStudies';
import { simulationEngine } from '../engine/solver';
import { CircuitNetlist } from '../engine/netlist';
import type { CircuitComponentData } from '../types';

describe('ShermanMorrisonEngine - Rank-1 & Rank-K Conductance Matrix Updates', () => {
  it('should accurately solve rank-1 conductance updates with zero error compared to full LU solve', () => {
    // 3-node circuit conductance matrix G (3x3)
    // Node 1 connected to Node 2 with G12 = 0.5 S
    // Node 2 connected to Node 3 with G23 = 0.2 S
    // Node 3 connected to Ground (Node 0) with G30 = 0.1 S
    // Node 1 connected to Ground with G10 = 0.05 S
    const G_base = new Matrix(3, 3);
    // Node 1: G10 + G12 = 0.55, -G12 = -0.5
    G_base.set(0, 0, 0.55);
    G_base.set(0, 1, -0.5);
    G_base.set(0, 2, 0.0);

    // Node 2: -G12 = -0.5, G12 + G23 = 0.7, -G23 = -0.2
    G_base.set(1, 0, -0.5);
    G_base.set(1, 1, 0.7);
    G_base.set(1, 2, -0.2);

    // Node 3: -G23 = -0.2, G23 + G30 = 0.3
    G_base.set(2, 0, 0.0);
    G_base.set(2, 1, -0.2);
    G_base.set(2, 2, 0.3);

    const baseLu = new LUSolver(G_base);
    const rhs = new Float64Array([10.0, 0.0, -5.0]); // Current injection vector

    // Now modify the branch between Node 1 and Node 2 by adding deltaG = +0.3 S
    const deltaG = 0.3;
    const node1 = 1; // 1-based index
    const node2 = 2; // 1-based index

    // 1. Solve via Sherman-Morrison rank-1 update
    const x_sm = ShermanMorrisonEngine.solveRank1(rhs, baseLu, node1, node2, deltaG);

    // 2. Solve directly by modifying G and full LU factorizing
    const G_modified = G_base.clone();
    G_modified.add(0, 0, deltaG);
    G_modified.add(0, 1, -deltaG);
    G_modified.add(1, 0, -deltaG);
    G_modified.add(1, 1, deltaG);

    const modLu = new LUSolver(G_modified);
    const x_exact = modLu.solve(rhs);

    // Check maximum discrepancy
    for (let i = 0; i < 3; i++) {
      const err = Math.abs(x_sm[i] - x_exact[i]);
      assert.ok(
        err < 1e-12,
        `Node ${i + 1} Sherman-Morrison solution (${x_sm[i]}) matches exact full LU (${x_exact[i]}) with err=${err}`
      );
    }
  });

  it('should accurately solve branch-to-ground conductance updates via Sherman-Morrison', () => {
    const G_base = new Matrix(2, 2);
    G_base.set(0, 0, 1.0);
    G_base.set(0, 1, -0.4);
    G_base.set(1, 0, -0.4);
    G_base.set(1, 1, 0.8);

    const baseLu = new LUSolver(G_base);
    const rhs = new Float64Array([5.0, 2.0]);

    // Add shunt conductance to ground on Node 2: deltaG = +0.5 S (node2 = 0)
    const deltaG = 0.5;
    const x_sm = ShermanMorrisonEngine.solveRank1(rhs, baseLu, 2, 0, deltaG);

    const G_mod = G_base.clone();
    G_mod.add(1, 1, deltaG);
    const modLu = new LUSolver(G_mod);
    const x_exact = modLu.solve(rhs);

    for (let i = 0; i < 2; i++) {
      assert.ok(Math.abs(x_sm[i] - x_exact[i]) < 1e-12);
    }
  });

  it('should accurately solve multiple simultaneous branch updates via solveRankK', () => {
    const G_base = new Matrix(3, 3);
    G_base.set(0, 0, 1.2);
    G_base.set(0, 1, -0.5);
    G_base.set(0, 2, -0.2);
    G_base.set(1, 0, -0.5);
    G_base.set(1, 1, 1.5);
    G_base.set(1, 2, -0.4);
    G_base.set(2, 0, -0.2);
    G_base.set(2, 1, -0.4);
    G_base.set(2, 2, 0.9);

    const baseLu = new LUSolver(G_base);
    const rhs = new Float64Array([12.0, -4.0, 6.0]);

    const updates: BranchConductanceUpdate[] = [
      { componentId: 'res_1', node1: 1, node2: 2, oldG: 0.5, newG: 0.8, deltaG: 0.3 },
      { componentId: 'res_2', node1: 2, node2: 3, oldG: 0.4, newG: 0.1, deltaG: -0.3 },
    ];

    const x_sm = ShermanMorrisonEngine.solveRankK(rhs, baseLu, updates);

    // Compute exact matrix
    const G_mod = G_base.clone();
    G_mod.add(0, 0, 0.3);
    G_mod.add(0, 1, -0.3);
    G_mod.add(1, 0, -0.3);
    G_mod.add(1, 1, 0.3);

    G_mod.add(1, 1, -0.3);
    G_mod.add(1, 2, 0.3);
    G_mod.add(2, 1, 0.3);
    G_mod.add(2, 2, -0.3);

    const modLu = new LUSolver(G_mod);
    const x_exact = modLu.solve(rhs);

    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(x_sm[i] - x_exact[i]) < 1e-10);
    }
  });
});

describe('PhaseContinuousIntegrator - Smooth Frequency Transitions', () => {
  it('should advance phase linearly at constant frequency', () => {
    const integrator = new PhaseContinuousIntegrator(60.0);
    const dt = 1e-4; // 100 us
    const steps = 100;

    let finalPhase = 0;
    for (let i = 0; i < steps; i++) {
      finalPhase = integrator.advance(60.0, dt);
    }

    const expectedPhase = 2.0 * Math.PI * 60.0 * (steps * dt);
    assert.ok(Math.abs(finalPhase - expectedPhase) < 1e-9);
  });

  it('should maintain strict C0 phase continuity without step jumps when frequency changes dynamically', () => {
    const integrator = new PhaseContinuousIntegrator(50.0);
    const dt = 1e-4;

    // Run for 0.1s at 50 Hz
    let phaseBefore = 0;
    for (let i = 0; i < 1000; i++) {
      phaseBefore = integrator.advance(50.0, dt);
    }

    // Now dynamically switch to 80 Hz on next step
    const phaseAfter = integrator.advance(80.0, dt);
    const phaseStep = phaseAfter - phaseBefore;
    const expectedStep = 2.0 * Math.PI * 80.0 * dt;

    assert.ok(
      Math.abs(phaseStep - expectedStep) < 1e-9,
      `Phase advanced smoothly by omega*dt = ${expectedStep} rad, actual = ${phaseStep} rad`
    );

    // Instantaneous sine wave value at the transition point
    const vBefore = Math.sin(phaseBefore);
    const vAfter = Math.sin(phaseAfter);
    const vDelta = Math.abs(vAfter - vBefore);

    // The voltage difference over 100us should be small (continuous), not a jump of 1.0 or 2.0
    assert.ok(vDelta < 0.1, `Voltage delta across frequency change is continuous: delta=${vDelta}`);
  });
});

describe('RuntimeMutator - Parameter Routing & Mutation Pipeline', () => {
  const sampleComponents: CircuitComponentData[] = [
    {
      id: 'gen_1',
      type: COMPONENT_TYPES.AC_SOURCE_1PH,
      name: 'Grid_Gen',
      x: 100,
      y: 100,
      rotation: 0,
      params: { voltage: 230, freq: 60 },
    },
    {
      id: 'load_r',
      type: COMPONENT_TYPES.RESISTOR,
      name: 'R_Load',
      x: 200,
      y: 100,
      rotation: 0,
      params: { resistance: 50 },
    },
    {
      id: 'dial_freq',
      type: COMPONENT_TYPES.RUNTIME_DIAL,
      name: 'Freq_Knob',
      x: 100,
      y: 300,
      rotation: 0,
      params: {
        label: 'Frequency',
        minValue: 40,
        maxValue: 80,
        value: 60,
        targetCompId: 'gen_1',
        targetParam: 'freq',
      },
    },
    {
      id: 'slider_r',
      type: COMPONENT_TYPES.RUNTIME_SLIDER,
      name: 'R_Slider',
      x: 200,
      y: 300,
      rotation: 0,
      params: {
        label: 'Resistance',
        minValue: 10,
        maxValue: 200,
        value: 50,
        targetCompId: 'load_r',
        targetParam: 'resistance',
      },
    },
  ];

  it('should dispatch runtime dial frequency adjustments to target generator component', () => {
    const mutator = new RuntimeMutator();
    let mutationCaught: any = null;
    mutator.onMutation((e) => {
      mutationCaught = e;
    });

    const result = mutator.mutateRuntimeControl(sampleComponents, 'dial_freq', 72.5);
    assert.strictEqual(result.targetCompId, 'gen_1');
    assert.strictEqual(result.targetParam, 'freq');

    const updatedGen = result.updatedComponents.find((c) => c.id === 'gen_1');
    assert.ok(updatedGen);
    assert.strictEqual(updatedGen.params.freq, 72.5);

    const updatedDial = result.updatedComponents.find((c) => c.id === 'dial_freq');
    assert.ok(updatedDial);
    assert.strictEqual(updatedDial.params.value, 72.5);

    assert.ok(mutationCaught);
    assert.strictEqual(mutationCaught.componentId, 'dial_freq');
    assert.strictEqual(mutationCaught.newValue, 72.5);
  });

  it('should dispatch slider load resistance adjustments to target load resistor', () => {
    const mutator = new RuntimeMutator();
    const result = mutator.mutateRuntimeControl(sampleComponents, 'slider_r', 120);
    assert.strictEqual(result.targetCompId, 'load_r');
    assert.strictEqual(result.targetParam, 'resistance');

    const updatedLoad = result.updatedComponents.find((c) => c.id === 'load_r');
    assert.ok(updatedLoad);
    assert.strictEqual(updatedLoad.params.resistance, 120);
  });
});

describe('Non-Pausing EMTDC Simulation State Mutator Live Benchmark', () => {
  it('should execute RUNTIME_MUTATOR_STUDY and dynamically modulate frequency, voltage, and load live', () => {
    const study = CASE_STUDIES.RUNTIME_MUTATOR_STUDY;
    assert.ok(study, 'RUNTIME_MUTATOR_STUDY must exist');

    const netlist = new CircuitNetlist().compile(study.components, study.wires);
    simulationEngine.initialize(netlist);

    // 1. Initial run for 50 steps at nominal 60Hz and 50 Ohm
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    const tAfterInitial = simulationEngine.t;
    assert.ok(tAfterInitial > 0, `Simulation time advanced to t=${tAfterInitial}s`);

    const initialGenV = simulationEngine.componentStates.get('c_gen_ac')?.prevV || 0;
    assert.ok(!isNaN(initialGenV), 'Initial generator voltage is valid');

    // 2. Modulate generator frequency dial to 50 Hz live without resetting simulation clock
    const freqDial = study.components.find((c) => c.id === 'c_dial_freq_ctrl');
    assert.ok(freqDial, 'Frequency dial found');

    simulationEngine.setRuntimeControlValue('c_dial_freq_ctrl', 50.0);

    const genComp = netlist.components.find((c) => c.id === 'c_gen_ac');
    assert.ok(genComp);
    assert.strictEqual(genComp.params.freq, 50.0);

    // 3. Step 50 more steps at 50 Hz
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    // Verify simulation time advanced smoothly across the parameter modification without resetting to 0
    assert.ok(
      simulationEngine.t > tAfterInitial,
      `Simulation time continued advancing non-stop: t=${simulationEngine.t}s`
    );

    // 4. Modulate load resistance slider to 150 Ohm live
    simulationEngine.setRuntimeControlValue('c_slider_load_ctrl', 150.0);
    const loadComp = netlist.components.find((c) => c.id === 'c_load_r_mut');
    assert.ok(loadComp);
    assert.strictEqual(loadComp.params.resistance, 150.0);

    // 5. Modulate terminal voltage to 380 V live
    simulationEngine.setRuntimeControlValue('c_dial_volt_ctrl', 380.0);
    assert.strictEqual(genComp.params.voltage, 380.0);

    // 6. Run 50 more steps
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    assert.strictEqual(simulationEngine.stepCount, 150);
    assert.ok(Math.abs(simulationEngine.t - 150 * simulationEngine.dt) < 1e-4, `Sim time t=${simulationEngine.t} matches expected`);

    // Check signals recorded throughout all 150 steps without buffer truncation
    const timeSig = simulationEngine.getSignals().get('Time');
    assert.ok(timeSig);
    const expectedSamples = Math.ceil(150 / simulationEngine.sampleDecimation);
    assert.strictEqual(timeSig.length, expectedSamples);
  });
});
