/**
 * PSCAD CLONE - Unit Tests for Waveform Export & Graph Frame Actions
 * Phase 18 - Step 18.4 Verification Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENT_TYPES } from '../constants/index';
import { WaveformExportManager } from '../utils/waveformExport';
import { GraphFrameRenderer } from '../components/canvas/GraphFrame';
import type { CircuitComponentData } from '../types/index';

describe('WaveformExportManager & CSV Generation', () => {
  const sampleFrame: CircuitComponentData = {
    id: 'frame_test_1',
    type: COMPONENT_TYPES.GRAPH_FRAME,
    name: 'Telemetry_Frame_1',
    x: 100,
    y: 100,
    rotation: 0,
    params: {
      graphTitle: 'Main Bus 3-Phase Telemetry',
      traces: [
        {
          id: 'tr_va',
          signalName: 'V_BusA',
          label: 'V_Bus_A',
          unit: 'kV',
          color: '#00e5ff',
          visible: true,
          gain: 1e-3, // Convert V to kV
          offset: 0,
        },
        {
          id: 'tr_ia',
          signalName: 'I_BusA',
          label: 'I_Line_A',
          unit: 'A',
          color: '#ff4081',
          visible: true,
          gain: 1.0,
          offset: 0,
        },
        {
          id: 'tr_hidden',
          signalName: 'V_Hidden',
          label: 'Hidden_Channel',
          unit: 'V',
          color: '#ffffff',
          visible: false, // Should be omitted from CSV
        },
      ],
    },
  };

  const signalsMap = new Map<string, number[]>();
  signalsMap.set('Time', [0.0, 0.001, 0.002, 0.003]);
  signalsMap.set('V_BusA', [100000, 110000, 120000, 130000]); // in Volts -> 100kV, 110kV...
  signalsMap.set('I_BusA', [15.5, 16.2, 17.0, 18.1]);
  signalsMap.set('V_Hidden', [999, 999, 999, 999]);

  it('should generate IEEE COMTRADE / PSCAD formatted CSV with metadata comments', () => {
    const csv = WaveformExportManager.generateGraphCSV(sampleFrame, signalsMap);
    assert.ok(csv.length > 0);

    const lines = csv.split('\r\n');
    assert.ok(lines.some((l) => l.includes('# PSCAD CLONE EMT Simulation Waveform Export')));
    assert.ok(lines.some((l) => l.includes('# Frame Title: Main Bus 3-Phase Telemetry')));
    assert.ok(lines.some((l) => l.includes('# Total Samples: 4')));
    assert.ok(lines.some((l) => l.includes('# Channels (2): V_Bus_A [kV], I_Line_A [A]')));

    // Check column headers (hidden trace must NOT appear)
    const headerIndex = lines.findIndex((l) => l.startsWith('Time (s)'));
    assert.ok(headerIndex >= 0);
    assert.equal(lines[headerIndex], 'Time (s),V_Bus_A (kV),I_Line_A (A)');

    // Check data row values with gain applied
    const row1 = lines[headerIndex + 1].split(',');
    assert.equal(row1[0], '0.00000000');
    assert.equal(parseFloat(row1[1]), 100.0); // 100000 * 1e-3 = 100 kV
    assert.equal(parseFloat(row1[2]), 15.5);

    const row4 = lines[headerIndex + 4].split(',');
    assert.equal(row4[0], '0.00300000');
    assert.equal(parseFloat(row4[1]), 130.0);
    assert.equal(parseFloat(row4[2]), 18.1);
  });

  it('should generate COMTRADE style format with microsecond timestamps when requested', () => {
    const csv = WaveformExportManager.generateGraphCSV(sampleFrame, signalsMap, [], {
      comtradeFormat: true,
      includeHeaders: false,
    });

    const lines = csv.split('\r\n');
    assert.equal(lines[0], 'Sample,Time_us,V_BusA_kV,I_BusA_A');

    const row1 = lines[1].split(',');
    assert.equal(row1[0], '1');
    assert.equal(parseFloat(row1[1]), 0.0); // 0us
    assert.equal(parseFloat(row1[2]), 100.0);

    const row2 = lines[2].split(',');
    assert.equal(row2[0], '2');
    assert.equal(parseFloat(row2[1]), 1000.0); // 0.001s = 1000us
  });

  it('should support PolyGraph stacked frames and export all visible sub-grid tracks', () => {
    const polyFrame: CircuitComponentData = {
      id: 'poly_1',
      type: COMPONENT_TYPES.GRAPH_FRAME,
      name: 'Poly_Test',
      x: 0,
      y: 0,
      rotation: 0,
      params: {
        graphTitle: 'PolyGraph Stacked Tracks',
        graphMode: 'polygraph',
        numSubGrids: 2,
        traces: [
          {
            id: 'tr1',
            signalName: 'V_BusA',
            label: 'Track1_V',
            unit: 'V',
            color: '#00e5ff',
            visible: true,
            subGridIndex: 0,
          },
          {
            id: 'tr2',
            signalName: 'I_BusA',
            label: 'Track2_I',
            unit: 'A',
            color: '#ffeb3b',
            visible: true,
            subGridIndex: 1,
          },
        ],
      },
    };

    const csv = WaveformExportManager.generateGraphCSV(polyFrame, signalsMap);
    assert.ok(csv.includes('# Mode: PolyGraph (Stacked)'));
    assert.ok(csv.includes('Time (s),Track1_V (V),Track2_I (A)'));
  });
});

describe('GraphFrameRenderer Mutation Methods', () => {
  const baseFrame: CircuitComponentData = {
    id: 'frame_mut_1',
    type: COMPONENT_TYPES.GRAPH_FRAME,
    name: 'Frame_Mut',
    x: 50,
    y: 50,
    rotation: 0,
    params: {
      graphTitle: 'Mutable Frame',
      graphWidth: 360,
      graphHeight: 200,
      graphShowGrid: true,
      graphShowLegend: true,
    },
  };

  it('should set custom axis limits and disable auto-scale', () => {
    const updated = GraphFrameRenderer.setAxisLimits(baseFrame, -250000, 250000);
    assert.deepEqual(updated.params?.graphYRange, [-250000, 250000]);
    assert.equal(updated.params?.autoScale, false);
  });

  it('should reset to dynamic auto-scaling', () => {
    const limited = GraphFrameRenderer.setAxisLimits(baseFrame, -100, 100);
    const autoScaled = GraphFrameRenderer.setAutoScaleY(limited);
    assert.equal(autoScaled.params?.graphYRange, undefined);
    assert.equal(autoScaled.params?.autoScale, true);
  });

  it('should clear waveform traces and signals', () => {
    const populated: CircuitComponentData = {
      ...baseFrame,
      params: {
        ...baseFrame.params,
        traces: [{ id: '1', signalName: 'V1', label: 'V1', color: '#fff', visible: true }],
        graphSignals: ['V1'],
      },
    };
    const cleared = GraphFrameRenderer.clearWaveforms(populated);
    assert.deepEqual(cleared.params?.traces, []);
    assert.deepEqual(cleared.params?.graphSignals, []);
  });

  it('should convert between Overlay and PolyGraph modes', () => {
    const poly = GraphFrameRenderer.convertToPolyGraph(baseFrame, 3);
    assert.equal(poly.params?.graphMode, 'polygraph');
    assert.equal(poly.params?.isPolyGraph, true);
    assert.equal(poly.params?.numSubGrids, 3);

    const overlay = GraphFrameRenderer.convertToOverlayGraph(poly);
    assert.equal(overlay.params?.graphMode, undefined);
    assert.equal(overlay.params?.isPolyGraph, undefined);
  });

  it('should toggle grid and legend flags', () => {
    const noGrid = GraphFrameRenderer.toggleGrid(baseFrame);
    assert.equal(noGrid.params?.graphShowGrid, false);
    const withGrid = GraphFrameRenderer.toggleGrid(noGrid);
    assert.equal(withGrid.params?.graphShowGrid, true);

    const noLegend = GraphFrameRenderer.toggleLegend(baseFrame);
    assert.equal(noLegend.params?.graphShowLegend, false);
    const withLegend = GraphFrameRenderer.toggleLegend(noLegend);
    assert.equal(withLegend.params?.graphShowLegend, true);
  });
});
