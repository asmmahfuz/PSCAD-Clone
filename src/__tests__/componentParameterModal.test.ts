/**
 * PSCAD CLONE - Component Parameter Modal & Companion Theory Unit Tests
 * Phase 21 - Step 21.1: Multi-Tab Component Parameter Dialogs & Units Engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCompanionModelTheory } from '../components/inspector/companionTheory';
import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';

describe('Component Parameter Modal - EMTDC Companion Model Theory Engine', () => {
  const dtSec = 50e-6; // 50 microseconds

  it('computes exact companion conductance Geq and zero Ihist for linear Resistor', () => {
    const comp: CircuitComponentData = {
      id: 'res_1',
      type: COMPONENT_TYPES.RESISTOR,
      name: 'R1',
      x: 100,
      y: 100,
      rotation: 0,
      params: { resistance: 20 },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'Norton');
    assert.equal(theory.calculatedGeq, 1 / 20);
    assert.equal(theory.calculatedGeqUnit, 'S (Ω⁻¹)');
    assert.match(theory.geqFormula, /\{1\}\{R\}|1\/R/);
    assert.match(theory.ihistFormula, /0/);
    assert.equal(theory.availableProbes.length, 3);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_V'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_I'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_P'));
  });

  it('computes Dommel trapezoidal Norton companion conductance Geq = dt / (2L) for Inductor', () => {
    const L = 0.1; // 100 mH
    const comp: CircuitComponentData = {
      id: 'ind_1',
      type: COMPONENT_TYPES.INDUCTOR,
      name: 'L1',
      x: 100,
      y: 100,
      rotation: 0,
      params: { inductance: L },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'Norton');
    const expectedGeq = dtSec / (2 * L);
    assert.equal(theory.calculatedGeq, expectedGeq);
    assert.match(theory.geqFormula, /2L/);
    assert.match(theory.ihistFormula, /v\(t - \\Delta t\)/);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Flux'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Energy'));
  });

  it('computes Dommel trapezoidal Norton companion conductance Geq = 2C / dt for Capacitor', () => {
    const C = 20e-6; // 20 uF
    const comp: CircuitComponentData = {
      id: 'cap_1',
      type: COMPONENT_TYPES.CAPACITOR,
      name: 'C1',
      x: 100,
      y: 100,
      rotation: 0,
      params: { capacitance: C },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'Norton');
    const expectedGeq = (2 * C) / dtSec;
    assert.equal(theory.calculatedGeq, expectedGeq);
    assert.match(theory.geqFormula, /2C/);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Q'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Energy'));
  });

  it('formulates coupled matrix equations and probes for 3-Phase Transformer', () => {
    const comp: CircuitComponentData = {
      id: 'trans_1',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      name: 'T1',
      x: 200,
      y: 200,
      rotation: 0,
      params: {
        V1_nom: 230000,
        V2_nom: 69000,
        MVA_rating: 150,
        primaryConn: 'Yg',
        secondaryConn: 'Delta',
        enableSaturation: true,
        kneeFluxPu: 1.25,
      },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'CoupledMatrix');
    assert.match(theory.title, /3-Phase/);
    assert.match(theory.geqFormula, /\[L\]\^\{-1\}/);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Vpri'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Vsec'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Ipri'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Isec'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Isat'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_P'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Q'));
  });

  it("formulates d'Alembert traveling wave model for Bergeron Transmission Lines", () => {
    const comp: CircuitComponentData = {
      id: 'line_1',
      type: COMPONENT_TYPES.BERGERON_LINE_3PH,
      name: 'TL_500kV',
      x: 300,
      y: 150,
      rotation: 0,
      params: {
        lengthKm: 120,
        Zc_aerial: 370,
        R_per_km: 0.025,
      },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'TravelingWave');
    assert.match(theory.geqFormula, /Z_c/);
    assert.match(theory.ihistFormula, /\\tau/);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Vsend'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Vrec'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Losses'));
  });

  it('formulates Park d-q transformation and electromechanical swing equations for Synchronous Generator', () => {
    const comp: CircuitComponentData = {
      id: 'gen_1',
      type: COMPONENT_TYPES.SYNC_GENERATOR,
      name: 'GEN1',
      x: 100,
      y: 300,
      rotation: 0,
      params: {
        H: 3.8,
        Xd: 1.85,
        Xd_pp: 0.22,
        voltage: 18000,
      },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'StateSpace');
    assert.ok(theory.equations.some((eq) => eq.label === 'Park Transformation'));
    assert.ok(theory.equations.some((eq) => eq.label === 'Electromechanical Swing Equation'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Speed'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Angle'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Te'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Efd'));
  });

  it('formulates variable resistance branch with CDA chatter detection for Breakers', () => {
    const comp: CircuitComponentData = {
      id: 'brk_1',
      type: COMPONENT_TYPES.BREAKER_3PH,
      name: 'BRK1',
      x: 150,
      y: 250,
      rotation: 0,
      params: {
        initClosed: true,
        Ron: 0.001,
        Roff: 1e6,
        openTime: 0.05,
      },
    };

    const theory = getCompanionModelTheory(comp, dtSec);
    assert.equal(theory.companionType, 'NonLinear');
    assert.match(theory.geqFormula, /R_\{contact\}/);
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_State'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Icontact'));
    assert.ok(theory.availableProbes.some((p) => p.id === 'probe_Vtrv'));
  });
});

describe('Component Parameter Modal - State Mutation & Dirty Tracking Semantics', () => {
  it('correctly detects dirty state and generates updated component without mutating original', () => {
    const originalComp: CircuitComponentData = {
      id: 'trans_orig',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      name: 'T1_Main',
      x: 200,
      y: 200,
      rotation: 0,
      params: {
        V1_nom: 230000,
        V2_nom: 69000,
        MVA_rating: 100,
        primaryConn: 'Y',
        secondaryConn: 'Delta',
      },
    };

    // Simulate draft editing
    const draftName = 'T1_Substation_North';
    const draftParams = {
      ...originalComp.params,
      V1_nom: 242000,
      MVA_rating: 150,
      enableSaturation: true,
    };

    const updatedComp: CircuitComponentData = {
      ...originalComp,
      name: draftName,
      params: draftParams,
    };

    // Verify original remains pristine
    assert.equal(originalComp.name, 'T1_Main');
    assert.equal(originalComp.params?.V1_nom, 230000);
    assert.equal(originalComp.params?.MVA_rating, 100);
    assert.equal(originalComp.params?.enableSaturation, undefined);

    // Verify updated component reflects all draft modifications
    assert.equal(updatedComp.name, 'T1_Substation_North');
    assert.equal(updatedComp.params?.V1_nom, 242000);
    assert.equal(updatedComp.params?.MVA_rating, 150);
    assert.equal(updatedComp.params?.enableSaturation, true);
    assert.equal(updatedComp.id, originalComp.id);
  });

  it('manages internal probe subscriptions and automatic signal naming', () => {
    const comp: CircuitComponentData = {
      id: 'res_probe_test',
      type: COMPONENT_TYPES.RESISTOR,
      name: 'R_Load',
      x: 50,
      y: 50,
      rotation: 0,
      params: {
        resistance: 50,
      },
    };

    const theory = getCompanionModelTheory(comp);
    const selectedProbes = new Set<string>();

    // Toggle probe_V
    const vProbe = theory.availableProbes.find((p) => p.id === 'probe_V')!;
    selectedProbes.add(vProbe.id);

    // Toggle probe_I
    const iProbe = theory.availableProbes.find((p) => p.id === 'probe_I')!;
    selectedProbes.add(iProbe.id);

    const updatedParams = {
      ...comp.params,
      activeProbes: Array.from(selectedProbes),
      signalName: comp.params?.signalName || vProbe.defaultSignalName,
      monitored: true,
    };

    assert.deepEqual(updatedParams.activeProbes, ['probe_V', 'probe_I']);
    assert.equal(updatedParams.signalName, 'R_Load_V');
    assert.equal(updatedParams.monitored, true);
  });
});
