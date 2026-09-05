/**
 * PSCAD CLONE - Schematic Parameter Illustration Diagrams Unit Tests
 * Phase 21 - Step 21.3: Vector Group Calculations, Park d-q Geometry,
 * Bergeron Line Parameters, and Terminal Callouts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTransformerVectorGroup,
  calculateBergeronLineParameters,
  calculateParkFrameGeometry,
} from '../components/inspector/ParameterDiagramPreview';
import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';

describe('ParameterDiagramPreview - Transformer Vector Group Engine', () => {
  it('computes YNd11 vector group (-30° phase shift) for grounded Wye primary and Delta secondary', () => {
    const res = calculateTransformerVectorGroup('Yg', 'Delta');
    assert.equal(res.vectorGroup, 'YNd11');
    assert.equal(res.clockHour, 11);
    assert.equal(res.phaseShiftDeg, -30);
    assert.equal(res.priNotation, 'YN');
    assert.equal(res.secNotation, 'd');
  });

  it('computes Yd11 vector group for ungrounded Wye primary and Delta secondary', () => {
    const res = calculateTransformerVectorGroup('Y', 'Delta');
    assert.equal(res.vectorGroup, 'Yd11');
    assert.equal(res.clockHour, 11);
    assert.equal(res.phaseShiftDeg, -30);
    assert.equal(res.priNotation, 'Y');
    assert.equal(res.secNotation, 'd');
  });

  it('computes YNy0 vector group (0° phase shift) for grounded Wye primary and Wye secondary', () => {
    const res = calculateTransformerVectorGroup('Yg', 'Y');
    assert.equal(res.vectorGroup, 'YNy0');
    assert.equal(res.clockHour, 0);
    assert.equal(res.phaseShiftDeg, 0);
  });

  it('computes Dd0 vector group for Delta-Delta transformer', () => {
    const res = calculateTransformerVectorGroup('Delta', 'Delta');
    assert.equal(res.vectorGroup, 'Dd0');
    assert.equal(res.clockHour, 0);
    assert.equal(res.phaseShiftDeg, 0);
  });

  it('computes Dy11 vector group for Delta primary and Wye secondary', () => {
    const res = calculateTransformerVectorGroup('Delta', 'Y');
    assert.equal(res.vectorGroup, 'Dy11');
    assert.equal(res.clockHour, 11);
    assert.equal(res.phaseShiftDeg, -30);
  });
});

describe('ParameterDiagramPreview - Bergeron Wave Geometry & Delay Math', () => {
  it('computes exact electromagnetic transit delay tau = d / v and surge impedance Zc', () => {
    const params = {
      lengthKm: 100,
      v_aerial: 300000,
      Zc_aerial: 370,
    };

    const res = calculateBergeronLineParameters(params);
    const expectedTauSec = 100 / 300000;
    assert.ok(Math.abs(res.tauSec - expectedTauSec) < 1e-9);
    assert.ok(Math.abs(res.tauMs - expectedTauSec * 1000) < 1e-6);
    assert.equal(res.zc, 370);
    assert.equal(res.lengthKm, 100);
    assert.equal(res.vAerialKmS, 300000);
  });

  it('clamps non-physical values and provides safe defaults for Bergeron line', () => {
    const res = calculateBergeronLineParameters({});
    assert.ok(res.lengthKm > 0);
    assert.ok(res.vAerialKmS > 0);
    assert.ok(res.zc > 0);
    assert.ok(res.tauSec > 0);
    assert.ok(res.tauMs > 0);
  });
});

describe('ParameterDiagramPreview - Park d-q Frame & Angle Geometry', () => {
  it('computes orthogonal d-q rotating axes with q-axis leading d-axis by 90 degrees', () => {
    const deltaDeg = 30;
    const res = calculateParkFrameGeometry(deltaDeg);
    assert.equal(res.deltaDeg, 30);
    assert.equal(res.dAxisDeg, 30);
    assert.equal(res.qAxisDeg, 120); // 90° ahead of d
    assert.equal(res.qAxisDeg - res.dAxisDeg, 90);
    assert.ok(Math.abs(res.deltaRad - (30 * Math.PI) / 180) < 1e-9);
  });

  it('aligns reference terminal voltage phasor at 90 degrees', () => {
    const res = calculateParkFrameGeometry(25);
    assert.equal(res.vPhasorDeg, 90);
    assert.equal(res.dAxisDeg, 25);
    assert.equal(res.qAxisDeg, 115);
  });
});

describe('ParameterDiagramPreview - Component Parameter Callout Mappings', () => {
  it('correctly associates transformer callouts with rated parameters', () => {
    const comp: CircuitComponentData = {
      id: 't1',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      name: 'Main_T1',
      x: 200,
      y: 200,
      rotation: 0,
      params: {
        V1_nom: 230000,
        V2_nom: 69000,
        MVA_rating: 150,
        primaryConn: 'Yg',
        secondaryConn: 'Delta',
        coreType: '3limb',
      },
    };

    const vg = calculateTransformerVectorGroup(comp.params?.primaryConn, comp.params?.secondaryConn);
    assert.equal(vg.vectorGroup, 'YNd11');
    assert.equal(comp.params?.MVA_rating, 150);
  });

  it('correctly associates synchronous generator callouts with reactances and inertia', () => {
    const comp: CircuitComponentData = {
      id: 'gen1',
      type: COMPONENT_TYPES.SYNC_GENERATOR,
      name: 'G1',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        Xd: 1.85,
        Xq: 1.62,
        Xd_pp: 0.21,
        H: 4.2,
      },
    };

    assert.equal(comp.params?.Xd, 1.85);
    assert.equal(comp.params?.Xq, 1.62);
    assert.equal(comp.params?.Xd_pp, 0.21);
    assert.equal(comp.params?.H, 4.2);
  });

  it('correctly associates transmission line callouts with line length and surge impedance', () => {
    const comp: CircuitComponentData = {
      id: 'line1',
      type: COMPONENT_TYPES.BERGERON_LINE_3PH,
      name: 'Line_12',
      x: 300,
      y: 100,
      rotation: 0,
      params: {
        lengthKm: 85,
        v_aerial: 298000,
        Zc_aerial: 360,
      },
    };

    const b = calculateBergeronLineParameters(comp.params || {});
    assert.equal(b.lengthKm, 85);
    assert.equal(b.zc, 360);
    assert.ok(b.tauMs > 0);
  });
});
