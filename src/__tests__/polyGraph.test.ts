/**
 * PSCAD CLONE - Unit Tests for PolyGraph Stacked Sub-Traces & Dynamic Y-Scaling
 * Phase 18 - Step 18.3 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES } from '../constants/index';
import { PolyGraphManager } from '../components/canvas/PolyGraphView';
import { GraphFrameRenderer } from '../components/canvas/GraphFrame';
import { GraphBindingManager } from '../components/canvas/GraphBinding';
import type { CircuitComponentData } from '../types/index';

describe('PolyGraphManager & Dynamic Y-Scaling Engine', () => {
  it('should accurately detect PolyGraph and Stacked mode flags', () => {
    const polyFrame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 100,
      y: 100,
      rotation: 0,
      params: { graphMode: 'polygraph' },
    };
    assert.equal(PolyGraphManager.isPolyGraphMode(polyFrame), true);

    const stackedFrame: CircuitComponentData = {
      id: 'f2',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope2',
      x: 100,
      y: 100,
      rotation: 0,
      params: { graphMode: 'stacked' },
    };
    assert.equal(PolyGraphManager.isPolyGraphMode(stackedFrame), true);

    const numSubGridsFrame: CircuitComponentData = {
      id: 'f3',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope3',
      x: 100,
      y: 100,
      rotation: 0,
      params: { numSubGrids: 3 },
    };
    assert.equal(PolyGraphManager.isPolyGraphMode(numSubGridsFrame), true);

    const overlayFrame: CircuitComponentData = {
      id: 'f4',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope4',
      x: 100,
      y: 100,
      rotation: 0,
      params: { graphMode: 'overlay' },
    };
    assert.equal(PolyGraphManager.isPolyGraphMode(overlayFrame), false);
  });

  it('should partition traces across sub-grids with explicit subGridIndex', () => {
    const frame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        numSubGrids: 2,
        traces: [
          { id: 'tr_va', signalName: 'Va', label: 'Va', unit: 'V', color: '#00e5ff', visible: true, subGridIndex: 0 },
          { id: 'tr_vb', signalName: 'Vb', label: 'Vb', unit: 'V', color: '#ff4081', visible: true, subGridIndex: 0 },
          { id: 'tr_ia', signalName: 'Ia', label: 'Ia', unit: 'A', color: '#ffeb3b', visible: true, subGridIndex: 1 },
          { id: 'tr_ib', signalName: 'Ib', label: 'Ib', unit: 'A', color: '#00e676', visible: true, subGridIndex: 1 },
        ],
      },
    };

    const traces = GraphBindingManager.resolveTracesForFrame(frame);
    const { numSubGrids, subGridTraces } = PolyGraphManager.partitionTraces(frame, traces);

    assert.equal(numSubGrids, 2);
    assert.equal(subGridTraces.get(0)?.length, 2);
    assert.equal(subGridTraces.get(1)?.length, 2);
    assert.equal(subGridTraces.get(0)?.[0].signalName, 'Va');
    assert.equal(subGridTraces.get(0)?.[1].signalName, 'Vb');
    assert.equal(subGridTraces.get(1)?.[0].signalName, 'Ia');
    assert.equal(subGridTraces.get(1)?.[1].signalName, 'Ib');
  });

  it('should automatically group mixed voltage and current traces into separate tracks', () => {
    const frame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope1',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        graphMode: 'polygraph',
        graphSignals: ['V_Send', 'V_Load', 'I_Line'],
      },
    };

    const allComps: CircuitComponentData[] = [
      { id: 'vm1', type: COMPONENT_TYPES.VOLTMETER, name: 'V_Send', x: 0, y: 0, rotation: 0, params: { signalName: 'V_Send', unit: 'kV' } },
      { id: 'vm2', type: COMPONENT_TYPES.VOLTMETER, name: 'V_Load', x: 0, y: 0, rotation: 0, params: { signalName: 'V_Load', unit: 'kV' } },
      { id: 'am1', type: COMPONENT_TYPES.AMMETER, name: 'I_Line', x: 0, y: 0, rotation: 0, params: { signalName: 'I_Line', unit: 'kA' } },
    ];

    const traces = GraphBindingManager.resolveTracesForFrame(frame, allComps);
    const { numSubGrids, subGridTraces } = PolyGraphManager.partitionTraces(frame, traces);

    assert.equal(numSubGrids, 2);
    const track0 = subGridTraces.get(0) || [];
    const track1 = subGridTraces.get(1) || [];

    assert.equal(track0.length, 2); // V_Send, V_Load
    assert.equal(track1.length, 1); // I_Line
    assert.equal(track0[0].signalName, 'V_Send');
    assert.equal(track0[1].signalName, 'V_Load');
    assert.equal(track1[0].signalName, 'I_Line');
  });

  it('should compute independent dynamic Y-scaling for stacked sub-grids with disparate magnitudes', () => {
    const frame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope_VI',
      x: 200,
      y: 150,
      rotation: 0,
      params: {
        graphWidth: 400,
        graphHeight: 300,
        graphMode: 'polygraph',
        numSubGrids: 2,
        traces: [
          { id: 'tr_v', signalName: 'V_Grid', label: 'V_Grid', unit: 'V', color: '#00e5ff', visible: true, subGridIndex: 0 },
          { id: 'tr_i', signalName: 'I_Line', label: 'I_Line', unit: 'A', color: '#ffeb3b', visible: true, subGridIndex: 1 },
        ],
      },
    };

    // Voltage is +/- 230,000 V, Current is +/- 1,200 A
    const signalsMap = new Map<string, number[]>([
      ['Time', [0, 0.005, 0.010, 0.015, 0.020]],
      ['V_Grid', [-230000, 0, 230000, 0, -230000]],
      ['I_Line', [-1200, 0, 1200, 0, -1200]],
    ]);

    const traces = GraphBindingManager.resolveTracesForFrame(frame);
    const geometries = PolyGraphManager.calculateSubGridGeometries(frame, traces, signalsMap);

    assert.equal(geometries.length, 2);

    // Track 0: Voltages (~ +/- 230 kV)
    const g0 = geometries[0];
    assert.equal(g0.index, 0);
    assert.ok(g0.yMin < -230000);
    assert.ok(g0.yMax > 230000);
    assert.ok(Math.abs(g0.yMax - 276000) < 10000); // with ~10% padding

    // Track 1: Currents (~ +/- 1.2 kA)
    const g1 = geometries[1];
    assert.equal(g1.index, 1);
    assert.ok(g1.yMin < -1200);
    assert.ok(g1.yMax > 1200);
    assert.ok(Math.abs(g1.yMax - 1440) < 100); // with ~10% padding

    // Check stacked layout geometry: same width, aligned X, stacked Y
    assert.equal(g0.x, g1.x);
    assert.equal(g0.w, g1.w);
    assert.ok(g1.y > g0.y + g0.h);
  });

  it('should interpolate synchronized crosshairs and marker positions at time t', () => {
    const frame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope_VI',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        graphWidth: 400,
        graphHeight: 300,
        graphMode: 'polygraph',
        numSubGrids: 2,
        traces: [
          { id: 'tr_v', signalName: 'V_Grid', label: 'V_Grid', unit: 'V', color: '#00e5ff', visible: true, subGridIndex: 0 },
          { id: 'tr_i', signalName: 'I_Line', label: 'I_Line', unit: 'A', color: '#ffeb3b', visible: true, subGridIndex: 1 },
        ],
      },
    };

    const signalsMap = new Map<string, number[]>([
      ['Time', [0.0, 0.1, 0.2, 0.3, 0.4]],
      ['V_Grid', [0, 100, 200, 100, 0]],
      ['I_Line', [0, 10, 20, 10, 0]],
    ]);

    const traces = GraphBindingManager.resolveTracesForFrame(frame);

    // Crosshair at worldX corresponding to t = 0.15s (halfway between 0.1 and 0.2)
    const { x, w } = GraphFrameRenderer.getBounds(frame);
    const plotX = x + PolyGraphManager.MARGIN_LEFT;
    const plotW = w - PolyGraphManager.MARGIN_LEFT - PolyGraphManager.MARGIN_RIGHT;
    const targetX = plotX + (0.15 / 0.4) * plotW;
    const targetY = 150;

    const crosshair = PolyGraphManager.calculateCrosshairAt(frame, targetX, targetY, traces, signalsMap);
    assert.ok(crosshair);
    assert.ok(Math.abs(crosshair!.time - 0.15) < 1e-4);
    assert.equal(crosshair!.markers.length, 2);

    // Marker 0: V_Grid at t=0.15 should be linear interpolation of [100, 200] = 150
    const m0 = crosshair!.markers.find((m) => m.trace.signalName === 'V_Grid');
    assert.ok(m0);
    assert.ok(Math.abs(m0!.value - 150) < 1e-3);
    assert.equal(m0!.subGridIndex, 0);

    // Marker 1: I_Line at t=0.15 should be linear interpolation of [10, 20] = 15
    const m1 = crosshair!.markers.find((m) => m.trace.signalName === 'I_Line');
    assert.ok(m1);
    assert.ok(Math.abs(m1!.value - 15) < 1e-3);
    assert.equal(m1!.subGridIndex, 1);
  });

  it('should generate interactive legend item geometries for stacked sub-grids', () => {
    const frame: CircuitComponentData = {
      id: 'f1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Scope_VI',
      x: 100,
      y: 100,
      rotation: 0,
      params: {
        graphWidth: 400,
        graphHeight: 300,
        graphMode: 'polygraph',
        numSubGrids: 2,
        traces: [
          { id: 'tr_v', signalName: 'V_Grid', label: 'V_Grid', unit: 'kV', color: '#00e5ff', visible: true, subGridIndex: 0 },
          { id: 'tr_i', signalName: 'I_Line', label: 'I_Line', unit: 'kA', color: '#ffeb3b', visible: true, subGridIndex: 1 },
        ],
      },
    };

    const signalsMap = new Map<string, number[]>([
      ['Time', [0.0, 0.1]],
      ['V_Grid', [0, 230]],
      ['I_Line', [0, 1.2]],
    ]);

    const legendItems = PolyGraphManager.getPolyGraphLegendItems(frame, signalsMap);
    assert.equal(legendItems.length, 2);

    assert.equal(legendItems[0].trace.signalName, 'V_Grid');
    assert.equal(legendItems[0].valueStr, '230.00');
    assert.equal(legendItems[0].unitStr, 'kV');

    assert.equal(legendItems[1].trace.signalName, 'I_Line');
    assert.equal(legendItems[1].valueStr, '1.20');
    assert.equal(legendItems[1].unitStr, 'kA');
  });
});
