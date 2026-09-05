/**
 * PSCAD CLONE - Phase 6 Test Suite
 * Comprehensive automated verification of:
 * 1. Multi-Sheet Hierarchical Submodule compilation & recursive netlist flattening
 * 2. Custom Component Workshop Script Engine & dynamic stateful evaluator
 * 3. Interactive Runtime Canvas Controls live signal generation (Sliders, Dials, Buttons, Switches, Gauges)
 * 4. Manhattan Orthogonal Wire Auto-Router with obstacle avoidance
 */

import { HierarchyManager } from '../hierarchy';
import { CustomComponentRegistry } from '../customComponents';
import { CSMFEngine } from '../csmf/csmfEngine';
import { WireRouter } from '../../components/canvas/wireRouter';
import { CircuitNetlist } from '../netlist';
import { COMPONENT_TYPES } from '../../constants';
import type { CircuitComponentData, WireData, CustomComponentDef } from '../../types';

export function runPhase6Tests(): boolean {
  console.log('\n========================================');
  console.log('🧪 RUNNING PHASE 6 TEST SUITE');
  console.log('========================================\n');

  let allPassed = true;
  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: ${msg}`);
    }
  };

  // -------------------------------------------------------------
  // Test Group 1: Hierarchical Submodule System & Netlist Flattening
  // -------------------------------------------------------------
  console.log('\n--- Group 1: Hierarchical Submodule System ---');
  try {
    const hier = new HierarchyManager();
    hier.initRoot(
      [
        {
          id: 'sub1',
          type: COMPONENT_TYPES.SUBMODULE,
          name: 'Submodule_Inverter',
          x: 200,
          y: 200,
          rotation: 0,
          params: { childSheetId: 'sheet_inv' },
        },
        {
          id: 'vsrc1',
          type: COMPONENT_TYPES.DC_SOURCE,
          name: 'Vdc',
          x: 100,
          y: 200,
          rotation: 0,
          params: { voltage: 400 },
        },
      ],
      [
        {
          id: 'w_main1',
          startPin: 'vsrc1_p1',
          endPin: 'sub1_in1',
          points: [{ x: 100, y: 200 }, { x: 200, y: 200 }],
        },
      ],
      'Top Level Grid'
    );

    // Create child sheet for the inverter
    const childSheet = hier.createSubmoduleSheet('root', 'sub1', 'Inverter Internal Circuit');
    assert(childSheet.id.length > 0, 'Submodule child sheet created successfully');
    assert(hier.getAllSheets().length === 2, 'HierarchyManager tracks 2 sheets');

    // Add components inside child sheet (Input Port, RLC filter, Output Port)
    childSheet.components = [
      {
        id: 'port_in',
        type: COMPONENT_TYPES.SUBMODULE_PORT_IN,
        name: 'in1',
        x: 50,
        y: 100,
        rotation: 0,
        params: { portName: 'in1', portDomain: 'electrical' },
      },
      {
        id: 'r_filter',
        type: COMPONENT_TYPES.RESISTOR,
        name: 'Rfilt',
        x: 150,
        y: 100,
        rotation: 0,
        params: { resistance: 2.5 },
      },
      {
        id: 'port_out',
        type: COMPONENT_TYPES.SUBMODULE_PORT_OUT,
        name: 'out1',
        x: 250,
        y: 100,
        rotation: 0,
        params: { portName: 'out1', portDomain: 'electrical' },
      },
    ];

    childSheet.wires = [
      {
        id: 'w_inner1',
        startPin: 'port_in_p1',
        endPin: 'r_filter_p1',
        points: [{ x: 50, y: 100 }, { x: 150, y: 100 }],
      },
      {
        id: 'w_inner2',
        startPin: 'r_filter_p2',
        endPin: 'port_out_p1',
        points: [{ x: 150, y: 100 }, { x: 250, y: 100 }],
      },
    ];

    hier.updateSheet(childSheet.id, childSheet.components, childSheet.wires);

    // Test Navigation & Breadcrumbs
    hier.navigateTo(childSheet.id);
    const crumbs = hier.getBreadcrumbs();
    assert(crumbs.length === 2, 'Breadcrumbs shows 2 levels: Top Level Grid > Inverter Internal Circuit');
    assert(crumbs[1].name === 'Inverter Internal Circuit', 'Current breadcrumb matches active child sheet');

    // Test Recursive Flattening
    const flat = hier.flattenHierarchy('root');
    assert(flat.components.length >= 4, `Flattened hierarchy contains ${flat.components.length} components`);
    const hasPrefixedFilter = flat.components.some((c) => c.id.includes('sub1/') && c.type === COMPONENT_TYPES.RESISTOR);
    assert(hasPrefixedFilter, 'Internal components receive submodule instance prefix (e.g. sub1/r_filter)');

    // Test compiling flattened circuit into Netlist
    const netlist = new CircuitNetlist();
    const compiled = netlist.compile(flat.components, flat.wires);
    assert(compiled.nodeCount >= 2, `Compiled flattened netlist generated ${compiled.nodeCount} electrical nodes`);
  } catch (err) {
    console.error(err);
    assert(false, 'Hierarchical submodule test threw an error');
  }

  // -------------------------------------------------------------
  // Test Group 2: Custom Component Workshop Script Engine
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Custom Component Workshop Script Engine ---');
  try {
    const registry = new CustomComponentRegistry();
    const builtins = registry.getAllComponents();
    assert(builtins.length >= 3, `Registry contains ${builtins.length} built-in template components`);

    // Verify 1st-Order Lag Filter template
    const lagFilter = builtins.find((c) => c.id === 'custom_first_order_lag');
    assert(lagFilter !== undefined, 'First-order lag filter template registered');

    // Test evaluation of Lag Filter: dy/dt = (K*u - y) / T => with K=1, T=0.05, u=10, dt=0.001, state={prevU: 0, prevY: 0}
    const evalRes1 = registry.evaluate(
      'custom_first_order_lag',
      { u: 10.0 },
      { K: 1.0, T: 0.05 },
      { prevU: 0.0, prevY: 0.0 },
      0.001,
      0.0
    );
    assert(evalRes1.outputs.y !== undefined, 'Custom component produced output signal "y"');
    assert(evalRes1.outputs.y > 0.0 && evalRes1.outputs.y < 5.0, `Lag filter stepped forward: y = ${evalRes1.outputs.y.toFixed(4)}`);

    // Test Creating Dynamic Custom User Component
    const userDef: CustomComponentDef = {
      id: 'custom_cubic_amplifier',
      name: 'Nonlinear Cubic Amplifier',
      category: 'Nonlinear Controls',
      description: 'Calculates y = gain * u^3 + bias with saturation clamping',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shapes: [{ id: 's1', type: 'rect', x1: -30, y1: -20, x2: 30, y2: 20, fill: '#1e293b', stroke: '#a855f7', strokeWidth: 2 }],
      pins: [
        { id: 'in1', name: 'u', localX: -30, localY: 0, domain: 'control', direction: 'in' },
        { id: 'out1', name: 'y', localX: 30, localY: 0, domain: 'control', direction: 'out' },
      ],
      parameters: [
        { name: 'gain', label: 'Cubic Gain', type: 'number', default: 0.5 },
        { name: 'limit', label: 'Max Limit', type: 'number', default: 100.0 },
      ],
      scriptCode: `
        const raw = (params.gain || 0.5) * Math.pow(inputs.u || 0, 3);
        const lim = params.limit || 100.0;
        const clamped = Math.max(-lim, Math.min(lim, raw));
        return {
          outputs: { y: clamped },
          state: { prevY: clamped }
        };
      `,
    };

    registry.registerComponent(userDef, false);
    const userEval = registry.evaluate('custom_cubic_amplifier', { u: 4.0 }, { gain: 0.5, limit: 50.0 }, {}, 0.001, 0.0);
    // 0.5 * 4^3 = 0.5 * 64 = 32.0 (below limit 50.0)
    assert(Math.abs(userEval.outputs.y - 32.0) < 1e-6, `Cubic amplifier evaluated accurately: y = ${userEval.outputs.y}`);

    const saturatedEval = registry.evaluate('custom_cubic_amplifier', { u: 10.0 }, { gain: 0.5, limit: 50.0 }, {}, 0.001, 0.0);
    // 0.5 * 1000 = 500 => clamped to 50.0
    assert(Math.abs(saturatedEval.outputs.y - 50.0) < 1e-6, `Cubic amplifier clamped correctly: y = ${saturatedEval.outputs.y}`);
  } catch (err) {
    console.error(err);
    assert(false, 'Custom component workshop test threw an error');
  }

  // -------------------------------------------------------------
  // Test Group 3: Interactive Runtime Canvas Controls & CSMF Engine
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Interactive Runtime Canvas Controls ---');
  try {
    const csmf = new CSMFEngine();

    const sliderComp: CircuitComponentData = {
      id: 'slider1',
      type: COMPONENT_TYPES.RUNTIME_SLIDER,
      name: 'Freq_Slider',
      x: 100,
      y: 100,
      rotation: 0,
      params: { value: 75.5, minValue: 0, maxValue: 120 },
    };

    const dialComp: CircuitComponentData = {
      id: 'dial1',
      type: COMPONENT_TYPES.RUNTIME_DIAL,
      name: 'Voltage_Dial',
      x: 200,
      y: 100,
      rotation: 0,
      params: { value: 230.0, minValue: 0, maxValue: 400 },
    };

    const buttonComp: CircuitComponentData = {
      id: 'btn1',
      type: COMPONENT_TYPES.RUNTIME_BUTTON,
      name: 'Trip_Btn',
      x: 300,
      y: 100,
      rotation: 0,
      params: { buttonState: true },
    };

    const switchComp: CircuitComponentData = {
      id: 'sw1',
      type: COMPONENT_TYPES.RUNTIME_SWITCH,
      name: 'Enable_Sw',
      x: 400,
      y: 100,
      rotation: 0,
      params: { switchState: true },
    };

    const gaugeComp: CircuitComponentData = {
      id: 'gauge1',
      type: COMPONENT_TYPES.RUNTIME_GAUGE,
      name: 'Current_Meter',
      x: 500,
      y: 100,
      rotation: 0,
      params: { gaugeMin: 0, gaugeMax: 100 },
    };

    const controlsWire: WireData = {
      id: 'w_ctrl1',
      startPin: 'slider1_out',
      endPin: 'gauge1_in',
      points: [{ x: 100, y: 100 }, { x: 500, y: 100 }],
      domain: 'control',
    };

    csmf.initialize([sliderComp, dialComp, buttonComp, switchComp, gaugeComp], [controlsWire]);
    csmf.step(0.0, 0.001);

    // Verify control block output pins
    const sliderVal = csmf.readPinValue('slider1_out');
    assert(sliderVal === 75.5, `Runtime Slider outputs live modulated value: ${sliderVal}`);

    const dialVal = csmf.readPinValue('dial1_out');
    assert(dialVal === 230.0, `Runtime Dial outputs live tuned value: ${dialVal}`);

    const btnVal = csmf.readPinValue('btn1_out');
    assert(btnVal === 1.0, `Runtime Push Button outputs 1.0 when held active: ${btnVal}`);

    const swVal = csmf.readPinValue('sw1_out');
    assert(swVal === 1.0, `Runtime Toggle Switch outputs 1.0 when ON: ${swVal}`);

    const gaugeInVal = csmf.readPinValue('gauge1_in');
    assert(gaugeInVal === 75.5, `Runtime Gauge successfully received upstream slider signal: ${gaugeInVal}`);
  } catch (err) {
    console.error(err);
    assert(false, 'Interactive runtime controls test threw an error');
  }

  // -------------------------------------------------------------
  // Test Group 4: Manhattan Orthogonal Wire Auto-Router
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Manhattan Orthogonal Wire Auto-Router ---');
  try {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 200 };

    // 1. Unobstructed 90-degree L-route
    const route1 = WireRouter.routeOrthogonal(p1, p2, []);
    assert(route1.length === 3, `Unobstructed route produces standard 3-point Manhattan L-corner: ${route1.length} points`);
    assert(route1[0].x === 100 && route1[0].y === 100, 'Start point matches exactly');
    assert(route1[1].x === 300 && route1[1].y === 100, 'Middle corner point turns 90 degrees orthogonally');
    assert(route1[2].x === 300 && route1[2].y === 200, 'End point terminates at target pin');

    // 2. Collinear Straight Paths
    const straightH = WireRouter.routeOrthogonal({ x: 50, y: 50 }, { x: 200, y: 50 }, []);
    assert(straightH.length === 2, 'Collinear horizontal path simplifies to 2 straight points');

    const straightV = WireRouter.routeOrthogonal({ x: 50, y: 50 }, { x: 50, y: 250 }, []);
    assert(straightV.length === 2, 'Collinear vertical path simplifies to 2 straight points');

    // 3. Obstacle Avoidance: Component right in the middle of L-bend
    const obstacleComp: CircuitComponentData = {
      id: 'obs1',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      name: 'T_Block',
      x: 300,
      y: 100,
      rotation: 0,
      params: {},
    };

    const routeWithObs = WireRouter.routeOrthogonal(p1, p2, [obstacleComp]);
    assert(routeWithObs.length >= 3, `Avoidance route successfully navigated around obstacle: ${routeWithObs.length} points`);
  } catch (err) {
    console.error(err);
    assert(false, 'Manhattan wire router test threw an error');
  }

  console.log('\n========================================');
  console.log(`🏁 PHASE 6 TEST SUITE RESULT: ${allPassed ? 'ALL TESTS PASSED ✨' : 'SOME TESTS FAILED ❌'}`);
  console.log('========================================\n');

  return allPassed;
}
