/**
 * PSCAD CLONE - Unit Tests for Graph Binding & Multi-Trace Overlay Legend
 * Phase 18 - Step 18.2 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES, WAVEFORM_COLORS } from '../constants/index';
import { GraphBindingManager } from '../components/canvas/GraphBinding';
import { GraphFrameRenderer } from '../components/canvas/GraphFrame';
import type { CircuitComponentData } from '../types/index';

describe('GraphBindingManager & Multi-Trace Engine', () => {
  it('should identify probe and meter component types accurately', () => {
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.VOLTMETER), true);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.AMMETER), true);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.MULTIMETER), true);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.SIGNAL_PROBE), true);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.DATA_LABEL_TRANSMITTER), true);
    assert.equal(GraphBindingManager.isProbeComponent('csmf_gain'), true);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.RESISTOR), false);
    assert.equal(GraphBindingManager.isProbeComponent(COMPONENT_TYPES.GRAPH_FRAME), false);
  });

  it('should infer engineering units correctly from signal names and types', () => {
    assert.equal(GraphBindingManager.inferUnitFromSignal('V_Bus1', COMPONENT_TYPES.VOLTMETER), 'V');
    assert.equal(GraphBindingManager.inferUnitFromSignal('V_230kV'), 'kV');
    assert.equal(GraphBindingManager.inferUnitFromSignal('I_Line_A', COMPONENT_TYPES.AMMETER), 'A');
    assert.equal(GraphBindingManager.inferUnitFromSignal('I_ShortCircuit_kA'), 'kA');
    assert.equal(GraphBindingManager.inferUnitFromSignal('P_Generator_MW'), 'MW');
    assert.equal(GraphBindingManager.inferUnitFromSignal('Q_Var_MVAR'), 'MVAR');
    assert.equal(GraphBindingManager.inferUnitFromSignal('Freq_Grid'), 'Hz');
    assert.equal(GraphBindingManager.inferUnitFromSignal('Omega_Rotor_rad_s'), 'rad/s');
    assert.equal(GraphBindingManager.inferUnitFromSignal('Theta_Deg'), 'deg');
    assert.equal(GraphBindingManager.inferUnitFromSignal('V_pu'), 'p.u.');
  });

  it('should discover all available probe channels across schematic components', () => {
    const components: CircuitComponentData[] = [
      {
        id: 'vm1',
        type: COMPONENT_TYPES.VOLTMETER,
        name: 'V_Send',
        x: 100,
        y: 100,
        rotation: 0,
        params: { signalName: 'V_Send_BusA', unit: 'V' },
      },
      {
        id: 'am1',
        type: COMPONENT_TYPES.AMMETER,
        name: 'I_Line',
        x: 200,
        y: 100,
        rotation: 0,
        params: { signalName: 'I_Line_A', unit: 'A' },
      },
      {
        id: 'mm1',
        type: COMPONENT_TYPES.MULTIMETER,
        name: 'MM_Load',
        x: 300,
        y: 100,
        rotation: 0,
        params: { signalName: 'MM_Load' },
      },
      {
        id: 'res1',
        type: COMPONENT_TYPES.RESISTOR,
        name: 'R1',
        x: 400,
        y: 100,
        rotation: 0,
        params: { resistance: 50 },
      },
    ];

    const probes = GraphBindingManager.getAvailableProbes(components);
    // vm1 (1) + am1 (1) + mm1 (9 channels) = 11 channels
    assert.equal(probes.length, 11);

    const vmProbe = probes.find((p) => p.componentId === 'vm1');
    assert.ok(vmProbe);
    assert.equal(vmProbe!.signalName, 'V_Send_BusA');
    assert.equal(vmProbe!.unit, 'V');

    const mmChannels = probes.filter((p) => p.componentId === 'mm1');
    assert.equal(mmChannels.length, 9);
    assert.ok(mmChannels.some((c) => c.signalName === 'MM_Load_Va'));
    assert.ok(mmChannels.some((c) => c.signalName === 'MM_Load_Ia'));
    assert.ok(mmChannels.some((c) => c.signalName === 'MM_Load_P'));
  });

  it('should resolve multi-trace configurations and respect visibility toggles', () => {
    const frame: CircuitComponentData = {
      id: 'frame1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 500,
      y: 200,
      rotation: 0,
      params: {
        graphSignals: ['V_Send_BusA', 'I_Line_A', 'V_Load_A'],
        graphHiddenSignals: ['I_Line_A'],
      },
    };

    const traces = GraphBindingManager.resolveTracesForFrame(frame);
    assert.equal(traces.length, 3);
    assert.equal(traces[0].signalName, 'V_Send_BusA');
    assert.equal(traces[0].visible, true);
    assert.equal(traces[0].color, WAVEFORM_COLORS[0]);

    assert.equal(traces[1].signalName, 'I_Line_A');
    assert.equal(traces[1].visible, false); // Hidden
    assert.equal(traces[1].color, WAVEFORM_COLORS[1]);

    assert.equal(traces[2].signalName, 'V_Load_A');
    assert.equal(traces[2].visible, true);
    assert.equal(traces[2].color, WAVEFORM_COLORS[2]);
  });

  it('should dynamically bind a new probe to an existing Graph Frame without duplicates', () => {
    let frame: CircuitComponentData = {
      id: 'frame1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 500,
      y: 200,
      rotation: 0,
      params: {
        graphSignals: ['V_Send'],
      },
    };

    const newProbe: CircuitComponentData = {
      id: 'probe_ammeter',
      type: COMPONENT_TYPES.AMMETER,
      name: 'I_Fault',
      x: 100,
      y: 100,
      rotation: 0,
      params: { signalName: 'I_Fault_Current', unit: 'kA' },
    };

    frame = GraphBindingManager.bindProbeToFrame(frame, newProbe);
    assert.deepEqual(frame.params.graphSignals, ['V_Send', 'I_Fault_Current']);
    assert.equal(frame.params.traces?.length, 2);
    assert.equal(frame.params.traces?.[1].unit, 'kA');
    assert.equal(frame.params.traces?.[1].color, WAVEFORM_COLORS[1]);

    // Re-binding the same probe should not duplicate it
    frame = GraphBindingManager.bindProbeToFrame(frame, newProbe);
    assert.equal(frame.params.traces?.length, 2);
  });

  it('should toggle trace visibility state and unbind traces cleanly', () => {
    let frame: CircuitComponentData = {
      id: 'frame1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 500,
      y: 200,
      rotation: 0,
      params: {
        graphSignals: ['Sig1', 'Sig2'],
      },
    };

    // Toggle Sig1 off
    frame = GraphBindingManager.toggleTraceVisibility(frame, 'Sig1');
    assert.deepEqual(frame.params.graphHiddenSignals, ['Sig1']);
    let traces = GraphBindingManager.resolveTracesForFrame(frame);
    assert.equal(traces.find((t) => t.signalName === 'Sig1')?.visible, false);
    assert.equal(traces.find((t) => t.signalName === 'Sig2')?.visible, true);

    // Toggle Sig1 back on
    frame = GraphBindingManager.toggleTraceVisibility(frame, 'Sig1');
    assert.deepEqual(frame.params.graphHiddenSignals, []);
    traces = GraphBindingManager.resolveTracesForFrame(frame);
    assert.equal(traces.find((t) => t.signalName === 'Sig1')?.visible, true);

    // Unbind Sig2
    frame = GraphBindingManager.unbindTraceFromFrame(frame, 'Sig2');
    assert.deepEqual(frame.params.graphSignals, ['Sig1']);
    traces = GraphBindingManager.resolveTracesForFrame(frame);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].signalName, 'Sig1');
  });

  it('should calculate interactive legend item layout and perform precise hit-testing', () => {
    const frame: CircuitComponentData = {
      id: 'frame1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        graphWidth: 360,
        graphHeight: 200,
        graphSignals: ['V_Out', 'I_Out'],
      },
    };

    const signalsMap = new Map<string, number[]>([
      ['Time', [0, 0.01, 0.02]],
      ['V_Out', [0, 115.4, 230.0]],
      ['I_Out', [0, 5.2, 10.5]],
    ]);

    const legendItems = GraphFrameRenderer.getLegendItems(frame, signalsMap);
    assert.equal(legendItems.length, 2);

    assert.equal(legendItems[0].trace.signalName, 'V_Out');
    assert.equal(legendItems[0].valueStr, '230.00');
    assert.equal(legendItems[1].trace.signalName, 'I_Out');
    assert.equal(legendItems[1].valueStr, '10.50');

    // Hit test item 0
    const hit0 = GraphFrameRenderer.getLegendItemAt(frame, legendItems[0].x + 10, legendItems[0].y + 5, signalsMap);
    assert.ok(hit0);
    assert.equal(hit0!.trace.signalName, 'V_Out');

    // Hit test outside plot
    const hitMiss = GraphFrameRenderer.getLegendItemAt(frame, 50, 50, signalsMap);
    assert.equal(hitMiss, null);
  });
});
