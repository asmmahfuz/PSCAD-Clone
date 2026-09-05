/**
 * PSCAD CLONE - Unit Tests for Canvas Interactive Runtime Controls
 * Phase 19 - Step 19.1 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES } from '../constants/index';
import { RuntimeControlsManager } from '../components/canvas/RuntimeControls';
import { CASE_STUDIES } from '../examples/caseStudies';
import { simulationEngine } from '../engine/solver';
import { CircuitNetlist } from '../engine/netlist';
import type { CircuitComponentData } from '../types/index';

describe('RuntimeControlsManager - Parameter & Geometry Math', () => {
  const sampleSlider: CircuitComponentData = {
    id: 'slider_test_1',
    type: COMPONENT_TYPES.RUNTIME_SLIDER,
    name: 'Load_R_Slider',
    x: 200,
    y: 300,
    rotation: 0,
    params: {
      label: 'Load Resistance',
      minValue: 10,
      maxValue: 200,
      step: 5,
      defaultValue: 50,
      value: 75,
      unitLabel: 'Ω',
      accentColor: '#00e5ff',
    },
  };

  const sampleDial: CircuitComponentData = {
    id: 'dial_test_1',
    type: COMPONENT_TYPES.RUNTIME_DIAL,
    name: 'Freq_Dial',
    x: 400,
    y: 300,
    rotation: 0,
    params: {
      label: 'Grid Frequency',
      minValue: 40,
      maxValue: 80,
      step: 0.5,
      defaultValue: 60,
      value: 60,
      unitLabel: 'Hz',
      accentColor: '#38bdf8',
    },
  };

  it('should extract and normalize slider parameters accurately', () => {
    const params = RuntimeControlsManager.getSliderParams(sampleSlider);
    assert.strictEqual(params.min, 10);
    assert.strictEqual(params.max, 200);
    assert.strictEqual(params.step, 5);
    assert.strictEqual(params.val, 75);
    assert.strictEqual(params.unit, 'Ω');
    assert.strictEqual(params.label, 'Load Resistance');
    assert.strictEqual(params.accentColor, '#00e5ff');
    // Norm: (75 - 10) / (200 - 10) = 65 / 190 = 0.342105...
    assert.ok(Math.abs(params.norm - 65 / 190) < 1e-4);
  });

  it('should calculate slider geometry with exact track and thumb positions', () => {
    const geom = RuntimeControlsManager.getSliderGeometry(sampleSlider);
    assert.strictEqual(geom.bounds.x, 200 - 104 / 2);
    assert.strictEqual(geom.bounds.y, 300 - 54 / 2);
    assert.strictEqual(geom.bounds.w, 104);
    assert.strictEqual(geom.bounds.h, 54);

    assert.strictEqual(geom.track.x, 200 - 76 / 2);
    assert.strictEqual(geom.track.w, 76);

    const expectedThumbX = 200 - 76 / 2 + (65 / 190) * 76;
    assert.ok(Math.abs(geom.thumb.x - expectedThumbX) < 1e-2);
  });

  it('should extract and normalize dial parameters and geometry', () => {
    const params = RuntimeControlsManager.getDialParams(sampleDial);
    assert.strictEqual(params.min, 40);
    assert.strictEqual(params.max, 80);
    assert.strictEqual(params.step, 0.5);
    assert.strictEqual(params.val, 60);
    assert.strictEqual(params.unit, 'Hz');
    // Norm: (60 - 40) / (80 - 40) = 20 / 40 = 0.5 (center)
    assert.strictEqual(params.norm, 0.5);

    const geom = RuntimeControlsManager.getDialGeometry(sampleDial);
    assert.strictEqual(geom.center.x, 400);
    assert.strictEqual(geom.center.y, 300);
    assert.strictEqual(geom.radius, 34);

    // At 50% norm, dial points straight up (-90 deg or 270 deg)
    // start is 135 deg, sweep 270 deg -> 135 + 135 = 270 deg = 1.5 * PI
    const expectedAngle = (270 * Math.PI) / 180;
    assert.ok(Math.abs(geom.currentAngle - expectedAngle) < 1e-4);
  });
});

describe('RuntimeControlsManager - Value Quantization & Clamping', () => {
  it('should quantize raw values according to step resolution', () => {
    // Step = 5, Range = [10, 200]
    assert.strictEqual(RuntimeControlsManager.quantizeValue(72.3, 10, 200, 5), 70);
    assert.strictEqual(RuntimeControlsManager.quantizeValue(73.5, 10, 200, 5), 75);
    assert.strictEqual(RuntimeControlsManager.quantizeValue(77.9, 10, 200, 5), 80);

    // Floating step = 0.1
    assert.strictEqual(RuntimeControlsManager.quantizeValue(50.26, 0, 100, 0.1), 50.3);
    assert.strictEqual(RuntimeControlsManager.quantizeValue(50.24, 0, 100, 0.1), 50.2);
  });

  it('should strictly clamp values to min and max boundaries', () => {
    assert.strictEqual(RuntimeControlsManager.quantizeValue(-50, 10, 200, 5), 10);
    assert.strictEqual(RuntimeControlsManager.quantizeValue(350, 10, 200, 5), 200);
  });
});

describe('RuntimeControlsManager - Coordinate to Value Mapping', () => {
  const slider: CircuitComponentData = {
    id: 'slider_calc_1',
    type: COMPONENT_TYPES.RUNTIME_SLIDER,
    name: 'Slider_1',
    x: 100,
    y: 100,
    rotation: 0,
    params: {
      minValue: 0,
      maxValue: 100,
      step: 10,
      value: 0,
    },
  };

  it('should compute slider value from mouse world X coordinates', () => {
    const trackLeft = 100 - 76 / 2; // 62
    const trackRight = 100 + 76 / 2; // 138
    const trackMid = 100;

    assert.strictEqual(RuntimeControlsManager.computeSliderValue(slider, trackLeft), 0);
    assert.strictEqual(RuntimeControlsManager.computeSliderValue(slider, trackRight), 100);
    assert.strictEqual(RuntimeControlsManager.computeSliderValue(slider, trackMid), 50);

    // Overshoot left and right
    assert.strictEqual(RuntimeControlsManager.computeSliderValue(slider, trackLeft - 50), 0);
    assert.strictEqual(RuntimeControlsManager.computeSliderValue(slider, trackRight + 50), 100);
  });

  it('should compute dial value from mouse world angles and handle dead zone', () => {
    const dial: CircuitComponentData = {
      id: 'dial_calc_1',
      type: COMPONENT_TYPES.RUNTIME_DIAL,
      name: 'Dial_1',
      x: 200,
      y: 200,
      rotation: 0,
      params: {
        minValue: 0,
        maxValue: 100,
        step: 1,
        value: 50,
      },
    };

    // 135 deg (bottom-left) -> 0%
    const cos135 = Math.cos((135 * Math.PI) / 180);
    const sin135 = Math.sin((135 * Math.PI) / 180);
    const valMin = RuntimeControlsManager.computeDialValue(dial, 200 + 40 * cos135, 200 + 40 * sin135);
    assert.strictEqual(valMin, 0);

    // 270 deg (straight up) -> 50%
    const valMid = RuntimeControlsManager.computeDialValue(dial, 200, 200 - 40);
    assert.strictEqual(valMid, 50);

    // 405 deg / 45 deg (bottom-right) -> 100%
    const cos45 = Math.cos((45 * Math.PI) / 180);
    const sin45 = Math.sin((45 * Math.PI) / 180);
    const valMax = RuntimeControlsManager.computeDialValue(dial, 200 + 40 * cos45, 200 + 40 * sin45);
    assert.strictEqual(valMax, 100);
  });
});

describe('RuntimeControlsManager - Hit-Testing & Formatting', () => {
  const slider: CircuitComponentData = {
    id: 's_hit',
    type: COMPONENT_TYPES.RUNTIME_SLIDER,
    name: 'S_Hit',
    x: 100,
    y: 100,
    rotation: 0,
    params: {},
  };

  const dial: CircuitComponentData = {
    id: 'd_hit',
    type: COMPONENT_TYPES.RUNTIME_DIAL,
    name: 'D_Hit',
    x: 300,
    y: 300,
    rotation: 0,
    params: {},
  };

  it('should hit-test slider bounds accurately', () => {
    assert.strictEqual(RuntimeControlsManager.hitTestSlider(slider, 100, 100), true);
    assert.strictEqual(RuntimeControlsManager.hitTestSlider(slider, 100 + 50, 100 + 25), true);
    assert.strictEqual(RuntimeControlsManager.hitTestSlider(slider, 100 + 60, 100), false);
    assert.strictEqual(RuntimeControlsManager.hitTestSlider(slider, 0, 0), false);
  });

  it('should hit-test dial housing circle accurately', () => {
    assert.strictEqual(RuntimeControlsManager.hitTestDial(dial, 300, 300), true);
    assert.strictEqual(RuntimeControlsManager.hitTestDial(dial, 300 + 30, 300), true);
    assert.strictEqual(RuntimeControlsManager.hitTestDial(dial, 300 + 50, 300), false);
  });

  it('should format engineering values with units correctly', () => {
    assert.strictEqual(RuntimeControlsManager.formatControlValue(50, 'Ω', 5), '50 Ω');
    assert.strictEqual(RuntimeControlsManager.formatControlValue(60.25, 'Hz', 0.01), '60.25 Hz');
    assert.strictEqual(RuntimeControlsManager.formatControlValue(230, 'V', 10), '230 V');
    assert.strictEqual(RuntimeControlsManager.formatControlValue(12.5, 'A', 0.1), '12.5 A');
  });
});

describe('Simulation Engine & Runtime Controls Live Interactivity', () => {
  it('should execute RUNTIME_CONTROLS_STUDY and dynamically modulate load resistance live', () => {
    const study = CASE_STUDIES.RUNTIME_CONTROLS_STUDY;
    assert.ok(study, 'RUNTIME_CONTROLS_STUDY exists');

    const netlist = new CircuitNetlist().compile(study.components, study.wires);
    simulationEngine.initialize(netlist);

    // Initial simulation run with default 50 Ohm load
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    const initialCurrent = simulationEngine.componentStates.get('c_am_line')?.prevI || 0;
    assert.ok(Math.abs(initialCurrent) > 0.1, `Initial circuit current is non-zero: ${initialCurrent} A`);

    // Modulate slider to 100 Ohm live
    const sliderComp = study.components.find((c) => c.type === COMPONENT_TYPES.RUNTIME_SLIDER);
    assert.ok(sliderComp, 'Slider component found in study');

    simulationEngine.setRuntimeControlValue(sliderComp.id, 100);

    // Verify target component parameter (c_load_r resistance) was updated live
    const targetComp = netlist.components.find((c) => c.id === 'c_load_r');
    assert.ok(targetComp, 'Target load resistor found');
    assert.strictEqual(targetComp.params.resistance, 100);

    // Step simulation further with updated 100 Ohm load
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    // Verify simulation time advanced smoothly
    assert.ok(simulationEngine.t > 0, `Simulation time advanced: t = ${simulationEngine.t}s`);
  });
});
