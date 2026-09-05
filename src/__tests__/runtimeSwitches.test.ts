/**
 * PSCAD Modern - Unit Tests for On-Schematic Push Buttons & Toggle Switches
 * Phase 19 - Step 19.2 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES } from '../constants/index';
import { RuntimeSwitchesManager } from '../components/canvas/RuntimeSwitches';
import { CASE_STUDIES } from '../examples/caseStudies';
import { simulationEngine } from '../engine/solver';
import { CircuitNetlist } from '../engine/netlist';
import type { CircuitComponentData } from '../types/index';

describe('RuntimeSwitchesManager - Parameter & Geometry Math', () => {
  const sampleButton: CircuitComponentData = {
    id: 'btn_test_1',
    type: COMPONENT_TYPES.RUNTIME_BUTTON,
    name: 'Trip_Button',
    x: 200,
    y: 300,
    rotation: 0,
    params: {
      label: 'Emergency Trip',
      sublabel: 'MOMENTARY',
      buttonState: false,
      mode: 'momentary',
      accentColor: '#ef4444',
      targetCompId: 'c_breaker_main',
      targetParam: 'isClosed',
    },
  };

  const sampleSwitch: CircuitComponentData = {
    id: 'sw_test_1',
    type: COMPONENT_TYPES.RUNTIME_SWITCH,
    name: 'Main_Breaker_Switch',
    x: 400,
    y: 300,
    rotation: 0,
    params: {
      label: 'Feeder Breaker',
      switchState: true,
      isClosed: true,
      onLabel: 'CLOSED',
      offLabel: 'OPEN',
      onColor: '#10b981',
      offColor: '#ef4444',
      targetCompId: 'c_breaker_main',
      targetParam: 'isClosed',
    },
  };

  it('should extract and normalize push button parameters accurately', () => {
    const params = RuntimeSwitchesManager.getButtonParams(sampleButton);
    assert.strictEqual(params.label, 'Emergency Trip');
    assert.strictEqual(params.sublabel, 'MOMENTARY');
    assert.strictEqual(params.isPressed, false);
    assert.strictEqual(params.mode, 'momentary');
    assert.strictEqual(params.accentColor, '#ef4444');
    assert.strictEqual(params.targetCompId, 'c_breaker_main');
    assert.strictEqual(params.targetParam, 'isClosed');
  });

  it('should calculate button geometry with exact chassis bounds and cap dimensions', () => {
    const geom = RuntimeSwitchesManager.getButtonGeometry(sampleButton);
    assert.strictEqual(geom.bounds.x, 200 - 84 / 2);
    assert.strictEqual(geom.bounds.y, 300 - 56 / 2);
    assert.strictEqual(geom.bounds.w, 84);
    assert.strictEqual(geom.bounds.h, 56);
    assert.strictEqual(geom.center.x, 200);
    assert.strictEqual(geom.center.y, 300 + 4);
    assert.strictEqual(geom.capRadius, 15);
    assert.strictEqual(geom.bezelRadius, 19);
  });

  it('should extract and normalize toggle switch parameters and geometry', () => {
    const params = RuntimeSwitchesManager.getSwitchParams(sampleSwitch);
    assert.strictEqual(params.label, 'Feeder Breaker');
    assert.strictEqual(params.isOn, true);
    assert.strictEqual(params.onLabel, 'CLOSED');
    assert.strictEqual(params.offLabel, 'OPEN');
    assert.strictEqual(params.onColor, '#10b981');
    assert.strictEqual(params.offColor, '#ef4444');
    assert.strictEqual(params.targetCompId, 'c_breaker_main');

    const geom = RuntimeSwitchesManager.getSwitchGeometry(sampleSwitch);
    assert.strictEqual(geom.bounds.x, 400 - 84 / 2);
    assert.strictEqual(geom.bounds.y, 300 - 60 / 2);
    assert.strictEqual(geom.bounds.w, 84);
    assert.strictEqual(geom.bounds.h, 60);
    assert.strictEqual(geom.rocker.w, 32);
    assert.strictEqual(geom.rocker.h, 34);
    assert.strictEqual(geom.isOn, true);
  });
});

describe('RuntimeSwitchesManager - Hit-Testing & State Mutation', () => {
  const btn: CircuitComponentData = {
    id: 'btn_1',
    type: COMPONENT_TYPES.RUNTIME_BUTTON,
    name: 'Button_1',
    x: 100,
    y: 100,
    rotation: 0,
    params: { buttonState: false },
  };

  const sw: CircuitComponentData = {
    id: 'sw_1',
    type: COMPONENT_TYPES.RUNTIME_SWITCH,
    name: 'Switch_1',
    x: 300,
    y: 300,
    rotation: 0,
    params: { switchState: false },
  };

  it('should hit-test button bounds accurately', () => {
    assert.strictEqual(RuntimeSwitchesManager.hitTestButton(btn, 100, 100), true);
    assert.strictEqual(RuntimeSwitchesManager.hitTestButton(btn, 100 + 40, 100 + 25), true);
    assert.strictEqual(RuntimeSwitchesManager.hitTestButton(btn, 100 + 50, 100), false);
    assert.strictEqual(RuntimeSwitchesManager.hitTestButton(btn, 0, 0), false);
  });

  it('should hit-test switch bounds accurately', () => {
    assert.strictEqual(RuntimeSwitchesManager.hitTestSwitch(sw, 300, 300), true);
    assert.strictEqual(RuntimeSwitchesManager.hitTestSwitch(sw, 300 + 40, 300 + 28), true);
    assert.strictEqual(RuntimeSwitchesManager.hitTestSwitch(sw, 300 + 50, 300), false);
    assert.strictEqual(RuntimeSwitchesManager.hitTestSwitch(sw, 0, 0), false);
  });

  it('should mutate button state cleanly', () => {
    const pressed = RuntimeSwitchesManager.setButtonState(btn, true);
    assert.strictEqual(pressed.params?.buttonState, true);
    const released = RuntimeSwitchesManager.setButtonState(pressed, false);
    assert.strictEqual(released.params?.buttonState, false);
  });

  it('should toggle and set switch state cleanly', () => {
    const toggledOn = RuntimeSwitchesManager.toggleSwitch(sw);
    assert.strictEqual(toggledOn.params?.switchState, true);
    assert.strictEqual(toggledOn.params?.isClosed, true);

    const toggledOff = RuntimeSwitchesManager.toggleSwitch(toggledOn);
    assert.strictEqual(toggledOff.params?.switchState, false);
    assert.strictEqual(toggledOff.params?.isClosed, false);

    const setExplicit = RuntimeSwitchesManager.setSwitchState(sw, true);
    assert.strictEqual(setExplicit.params?.switchState, true);
  });
});

describe('Simulation Engine & Runtime Switches Live Interactivity', () => {
  it('should execute RUNTIME_SWITCHES_STUDY and dynamically toggle breaker state live', () => {
    const study = CASE_STUDIES.RUNTIME_SWITCHES_STUDY;
    assert.ok(study, 'RUNTIME_SWITCHES_STUDY must exist');

    const netlist = new CircuitNetlist().compile(study.components, study.wires);
    simulationEngine.initialize(netlist);

    // Step 1: Run 50 steps with breaker initially closed
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    const breakerStateInit = simulationEngine.componentStates.get('c_breaker_main');
    assert.ok(breakerStateInit, 'Breaker state must exist');
    assert.strictEqual(breakerStateInit.isClosed, true, 'Breaker should initially be closed');

    const feederCurrentClosed = simulationEngine.componentStates.get('c_am_feeder')?.prevI || 0;
    assert.ok(
      Math.abs(feederCurrentClosed) > 0.1,
      `Expected non-zero load current when breaker is closed, got ${feederCurrentClosed}`
    );

    // Step 2: Dynamically OPEN breaker via the on-canvas switch
    const swComp = study.components.find((c) => c.type === COMPONENT_TYPES.RUNTIME_SWITCH);
    assert.ok(swComp, 'Switch component must exist');

    simulationEngine.setRuntimeControlValue(swComp.id, false);

    const breakerStateAfterSwitch = simulationEngine.componentStates.get('c_breaker_main');
    assert.strictEqual(breakerStateAfterSwitch?.isClosed, false, 'Breaker state should be OPEN after switch toggle');

    // Step for 50 iterations with breaker open
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    const feederCurrentOpen = simulationEngine.componentStates.get('c_am_feeder')?.prevI || 0;
    assert.ok(
      Math.abs(feederCurrentOpen) < 1e-3,
      `Expected near-zero current after opening breaker, got ${feederCurrentOpen}`
    );

    // Step 3: Dynamically CLOSE breaker via on-canvas button
    const btnClose = study.components.find((c) => c.id === 'c_btn_close');
    assert.ok(btnClose, 'Close button must exist');

    simulationEngine.setRuntimeControlValue(btnClose.id, true);

    const breakerStateAfterCloseBtn = simulationEngine.componentStates.get('c_breaker_main');
    assert.strictEqual(breakerStateAfterCloseBtn?.isClosed, true, 'Breaker should be CLOSED after close button press');

    // Step for 50 iterations with breaker re-closed
    for (let i = 0; i < 50; i++) {
      simulationEngine.step();
    }

    const feederCurrentReclosed = simulationEngine.componentStates.get('c_am_feeder')?.prevI || 0;
    assert.ok(
      Math.abs(feederCurrentReclosed) > 0.1,
      `Expected current to resume after re-closing breaker, got ${feederCurrentReclosed}`
    );
  });
});
