/**
 * PSCAD CLONE - Unit Tests for Canvas-Embedded Schematic Meters & Live Instrumentation
 * Phase 19 - Step 19.3 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES } from '../constants/index';
import { SchematicMetersManager } from '../components/canvas/SchematicMeters';
import { CASE_STUDIES } from '../examples/caseStudies';
import { simulationEngine } from '../engine/solver';
import { CircuitNetlist } from '../engine/netlist';
import type { CircuitComponentData } from '../types/index';

describe('SchematicMetersManager - RMS, Peak, & Power Calculations', () => {
  it('should compute true RMS and peak amplitude for a pure sinusoidal waveform', () => {
    const N = 200;
    const amp = 325.27; // 230 V RMS
    const samples: number[] = [];

    for (let i = 0; i < N; i++) {
      const theta = (2 * Math.PI * i) / 40; // 5 full cycles in 200 samples (sample at i=10 is exactly pi/2)
      samples.push(amp * Math.sin(theta));
    }

    const rms = SchematicMetersManager.computeRMS(samples, N);
    const peak = SchematicMetersManager.computePeak(samples, N);

    // Theoretical RMS: amp / sqrt(2) = 325.27 / 1.41421356 = 230.0 V
    assert.ok(Math.abs(rms - 230.0) < 0.5, `Expected RMS ~230 V, got ${rms.toFixed(2)}`);
    assert.ok(Math.abs(peak - amp) < 1e-3, `Expected Peak ${amp}, got ${peak.toFixed(2)}`);
  });

  it('should compute active power P, reactive power Q, apparent power S, and power factor', () => {
    const N = 200;
    const vAmp = 325.27; // 230 V RMS
    const iAmp = 14.14;  // 10 A RMS
    const phaseLagRad = (30 * Math.PI) / 180; // 30 deg lagging (cos(30) = 0.866)

    const vSamples: number[] = [];
    const iSamples: number[] = [];

    for (let i = 0; i < N; i++) {
      const theta = (2 * Math.PI * i) / 50;
      vSamples.push(vAmp * Math.sin(theta));
      iSamples.push(iAmp * Math.sin(theta - phaseLagRad));
    }

    const P = SchematicMetersManager.computeActivePower(vSamples, iSamples, N);
    const { Q, S, pf } = SchematicMetersManager.computeReactivePower(vSamples, iSamples, N);

    // S = 230 V * 10 A = 2300 VA
    // P = 2300 * cos(30 deg) = 1991.86 W
    // Q = 2300 * sin(30 deg) = 1150.0 VAR
    // pf = cos(30 deg) = 0.866
    assert.ok(Math.abs(S - 2300.0) < 10.0, `Expected S ~2300 VA, got ${S.toFixed(2)}`);
    assert.ok(Math.abs(P - 1991.86) < 15.0, `Expected P ~1991.86 W, got ${P.toFixed(2)}`);
    assert.ok(Math.abs(Q - 1150.0) < 20.0, `Expected Q ~1150 VAR, got ${Q.toFixed(2)}`);
    assert.ok(Math.abs(pf - 0.866) < 0.02, `Expected pf ~0.866, got ${pf.toFixed(3)}`);
  });

  it('should auto-scale engineering SI prefixes correctly across all magnitudes', () => {
    // Volts
    assert.strictEqual(SchematicMetersManager.formatMetricValue(230000, 'V'), '230.00 kV');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(120.5, 'V'), '120.50 V');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(0.045, 'V'), '45.00 mV');

    // Amperes
    assert.strictEqual(SchematicMetersManager.formatMetricValue(1850, 'A'), '1.85 kA');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(12.4, 'A'), '12.40 A');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(0.0025, 'A'), '2.50 mA');

    // Watts & VAR
    assert.strictEqual(SchematicMetersManager.formatMetricValue(4500000, 'W'), '4.50 MW');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(75000, 'VAR'), '75.00 kVAR');
    assert.strictEqual(SchematicMetersManager.formatMetricValue(1.2e9, 'VA'), '1.20 GVA');
  });
});

describe('SchematicMetersManager - Analog Gauge Geometry & Operating Zones', () => {
  const sampleGauge: CircuitComponentData = {
    id: 'gauge_test_1',
    type: COMPONENT_TYPES.RUNTIME_GAUGE,
    name: 'Feeder_Gauge',
    x: 200,
    y: 200,
    rotation: 0,
    params: {
      label: 'Feeder Voltage',
      minValue: 0,
      maxValue: 300,
      unitLabel: 'V',
      normalZoneMax: 0.70,
      warningZoneMax: 0.85,
      measurementType: 'instant',
      value: 150,
      peakValue: 240,
    },
  };

  it('should compute exact gauge chassis geometry, angles, and operating zones', () => {
    const geom = SchematicMetersManager.getGaugeGeometry(sampleGauge);

    assert.strictEqual(geom.bounds.w, 96);
    assert.strictEqual(geom.bounds.h, 96);
    assert.strictEqual(geom.bounds.x, 200 - 96 / 2);
    assert.strictEqual(geom.bounds.y, 200 - 96 / 2);
    assert.strictEqual(geom.radius, 42);

    // Angle span: 135 deg to 405 deg (270 deg sweep)
    const expectedStartA = (135 * Math.PI) / 180;
    const expectedSweepA = (270 * Math.PI) / 180;
    assert.ok(Math.abs(geom.startAngle - expectedStartA) < 1e-4);
    assert.ok(Math.abs(geom.sweepAngle - expectedSweepA) < 1e-4);

    // Value norm: 150 / 300 = 0.5 (50%)
    assert.strictEqual(geom.normVal, 0.5);
    const expectedNeedleA = expectedStartA + 0.5 * expectedSweepA;
    assert.ok(Math.abs(geom.needleAngle - expectedNeedleA) < 1e-4);

    // Peak norm: 240 / 300 = 0.8 (80%)
    assert.strictEqual(geom.normPeak, 0.8);

    // Operating Zones: 3 zones (Normal Green, Warning Amber, Alarm Red)
    assert.strictEqual(geom.zones.length, 3);
    assert.strictEqual(geom.zones[0].color, '#10b981'); // Green
    assert.strictEqual(geom.zones[1].color, '#f59e0b'); // Amber
    assert.strictEqual(geom.zones[2].color, '#ef4444'); // Red
  });

  it('should hit-test gauge circle accurately', () => {
    assert.strictEqual(SchematicMetersManager.hitTestGauge(sampleGauge, 200, 204), true);
    assert.strictEqual(SchematicMetersManager.hitTestGauge(sampleGauge, 200 + 40, 204), true);
    assert.strictEqual(SchematicMetersManager.hitTestGauge(sampleGauge, 200 + 55, 204), false);
    assert.strictEqual(SchematicMetersManager.hitTestGauge(sampleGauge, 0, 0), false);
  });

  it('should track and reset peak hold accurately', () => {
    const updated = SchematicMetersManager.updatePeakHold(sampleGauge, 280);
    assert.strictEqual(updated.params?.peakValue, 280);

    const reset = SchematicMetersManager.resetPeakHold(updated);
    assert.strictEqual(reset.params?.peakValue, 0.0);
  });
});

describe('SchematicMetersManager - Digital Display Matrix & Mode Toggling', () => {
  const sampleDisplay: CircuitComponentData = {
    id: 'display_test_1',
    type: COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY,
    name: 'Substation_PQV',
    x: 400,
    y: 300,
    rotation: 0,
    params: {
      label: 'Feeder Metrics',
      mode: 'multimeter_4row',
      accentColor: '#38bdf8',
    },
  };

  it('should extract 4-row matrix geometry (V, I, P, Q) correctly', () => {
    const signalsMap = new Map<string, number[]>();
    signalsMap.set('V_Bus', [230.0, 230.0, 230.0]);
    signalsMap.set('I_Load', [10.0, 10.0, 10.0]);

    sampleDisplay.params = {
      ...sampleDisplay.params,
      targetVoltageSignal: 'V_Bus',
      targetCurrentSignal: 'I_Load',
    };

    const geom = SchematicMetersManager.getDigitalDisplayGeometry(sampleDisplay, signalsMap);

    assert.strictEqual(geom.bounds.w, 120);
    assert.strictEqual(geom.bounds.h, 76);
    assert.strictEqual(geom.matrixRows.length, 4);
    assert.strictEqual(geom.matrixRows[0].tag, 'V_RMS');
    assert.strictEqual(geom.matrixRows[1].tag, 'I_RMS');
    assert.strictEqual(geom.matrixRows[2].tag, 'P_ACT');
    assert.strictEqual(geom.matrixRows[3].tag, 'Q_REA');
  });

  it('should hit-test digital display box and cycle display modes', () => {
    assert.strictEqual(SchematicMetersManager.hitTestDigitalDisplay(sampleDisplay, 400, 300), true);
    assert.strictEqual(SchematicMetersManager.hitTestDigitalDisplay(sampleDisplay, 400 + 55, 300 + 30), true);
    assert.strictEqual(SchematicMetersManager.hitTestDigitalDisplay(sampleDisplay, 400 + 70, 300), false);

    const mode2 = SchematicMetersManager.toggleDisplayMode(sampleDisplay);
    assert.strictEqual(mode2.params?.mode, 'power_pq');

    const mode3 = SchematicMetersManager.toggleDisplayMode(mode2);
    assert.strictEqual(mode3.params?.mode, 'dual_vi');

    const mode4 = SchematicMetersManager.toggleDisplayMode(mode3);
    assert.strictEqual(mode4.params?.mode, 'single');

    const mode1 = SchematicMetersManager.toggleDisplayMode(mode4);
    assert.strictEqual(mode1.params?.mode, 'multimeter_4row');
  });
});

describe('Simulation Engine & Runtime Meters Live Telemetry', () => {
  it('should execute RUNTIME_METERS_STUDY and dynamically update sweeping needle and digital readouts', () => {
    const study = CASE_STUDIES.RUNTIME_METERS_STUDY;
    assert.ok(study, 'RUNTIME_METERS_STUDY must exist in caseStudies.ts');

    const netlist = new CircuitNetlist().compile(study.components, study.wires);
    simulationEngine.initialize(netlist);

    // Step 1: Run 200 steps at initial load resistance R = 50 ohms (10 ms, past the 5 ms voltage ramp)
    for (let i = 0; i < 200; i++) {
      simulationEngine.step();
    }

    const signals = simulationEngine.getSignals();
    assert.ok(signals.has('V_Bus'), 'Signal V_Bus must exist in simulation');
    assert.ok(signals.has('I_Load'), 'Signal I_Load must exist in simulation');

    const gaugeComp = study.components.find((c) => c.type === COMPONENT_TYPES.RUNTIME_GAUGE);
    assert.ok(gaugeComp, 'Analog gauge component must exist');

    const gaugeGeom1 = SchematicMetersManager.getGaugeGeometry(gaugeComp, signals);
    assert.ok(
      gaugeGeom1.metrics.rmsVal > 100,
      `Expected non-zero RMS voltage on gauge, got ${gaugeGeom1.metrics.rmsVal}`
    );
    assert.ok(
      gaugeGeom1.normVal > 0.3 && gaugeGeom1.normVal < 0.9,
      `Expected gauge needle in active sector, got normVal = ${gaugeGeom1.normVal}`
    );

    const displayComp = study.components.find((c) => c.type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY);
    assert.ok(displayComp, 'Digital display component must exist');

    const displayGeom1 = SchematicMetersManager.getDigitalDisplayGeometry(displayComp, signals);
    const pRowInit = displayGeom1.matrixRows.find((r) => r.tag === 'P_ACT');
    assert.ok(pRowInit && pRowInit.numericVal > 100, `Expected non-zero active power P, got ${pRowInit?.numericVal}`);

    // Step 2: Modulate load resistance via the on-canvas slider (e.g. cut resistance from 50 to 25 ohms)
    const sliderComp = study.components.find((c) => c.type === COMPONENT_TYPES.RUNTIME_SLIDER);
    assert.ok(sliderComp, 'Load resistance slider must exist');

    simulationEngine.setRuntimeControlValue(sliderComp.id, 25.0);

    // Run another 200 steps with R = 25 ohms (current and active power should increase)
    for (let i = 0; i < 200; i++) {
      simulationEngine.step();
    }

    const signals2 = simulationEngine.getSignals();
    const displayGeom2 = SchematicMetersManager.getDigitalDisplayGeometry(displayComp, signals2);
    const pRowAfter = displayGeom2.matrixRows.find((r) => r.tag === 'P_ACT');

    assert.ok(
      pRowAfter && pRowAfter.numericVal > pRowInit!.numericVal * 1.5,
      `Expected active power to increase significantly when reducing load resistance (init: ${pRowInit?.numericVal} W, after: ${pRowAfter?.numericVal} W)`
    );
  });
});
