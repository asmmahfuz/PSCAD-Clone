/**
 * PSCAD CLONE - Wire Renderer & Visual Conductor Stencils Unit Tests
 * Phase 23 - Step 23.3: Visual Distinctions for Polyphase vs. Control Signal Wires
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WireRenderer } from '../components/canvas/wireRenderer';
import { THEME_PALETTES } from '../constants/themes';
import type { WireData, Pin, Point } from '../types';

// Mock Canvas 2D Context for tracking draw calls and vector commands
function createMockContext() {
  const operations: string[] = [];
  const stateStack: Array<Record<string, any>> = [];
  let state: Record<string, any> = {
    lineWidth: 1.0,
    strokeStyle: '#000000',
    fillStyle: '#ffffff',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineDash: [] as number[],
  };

  const ctx = {
    save: () => {
      stateStack.push({ ...state, lineDash: [...state.lineDash] });
      operations.push('save');
    },
    restore: () => {
      const popped = stateStack.pop();
      if (popped) {
        state = popped;
      }
      operations.push('restore');
    },
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    moveTo: (x: number, y: number) => operations.push(`moveTo(${x.toFixed(1)},${y.toFixed(1)})`),
    lineTo: (x: number, y: number) => operations.push(`lineTo(${x.toFixed(1)},${y.toFixed(1)})`),
    arc: (x: number, y: number, r: number, s: number, e: number) =>
      operations.push(`arc(${x.toFixed(1)},${y.toFixed(1)},${r.toFixed(1)},${s.toFixed(2)},${e.toFixed(2)})`),
    fillRect: (x: number, y: number, w: number, h: number) =>
      operations.push(`fillRect(${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h.toFixed(1)})`),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    setLineDash: (d: number[]) => {
      state.lineDash = [...d];
      operations.push(`setLineDash([${d.join(',')}])`);
    },
    set lineWidth(val: number) {
      state.lineWidth = val;
      operations.push(`lineWidth=${val}`);
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set strokeStyle(val: any) {
      state.strokeStyle = val;
      operations.push(`strokeStyle=${val}`);
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set fillStyle(val: any) {
      state.fillStyle = val;
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set lineCap(val: any) {
      state.lineCap = val;
    },
    get lineCap() {
      return state.lineCap;
    },
    set lineJoin(val: any) {
      state.lineJoin = val;
    },
    get lineJoin() {
      return state.lineJoin;
    },
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, operations, state: () => state };
}

describe('Step 23.3: Wire Domain Resolution & Auto-Inference', () => {
  it('should respect explicit wire.domain when specified', () => {
    const polyWire: WireData = { id: 'w1', startPin: null, endPin: null, points: [], domain: 'polyphase' };
    const ctrlWire: WireData = { id: 'w2', startPin: null, endPin: null, points: [], domain: 'control' };
    const elecWire: WireData = { id: 'w3', startPin: null, endPin: null, points: [], domain: 'electrical' };

    assert.equal(WireRenderer.resolveWireDomain(polyWire), 'polyphase');
    assert.equal(WireRenderer.resolveWireDomain(ctrlWire), 'control');
    assert.equal(WireRenderer.resolveWireDomain(elecWire), 'electrical');
  });

  it('should auto-infer polyphase domain from connected pins', () => {
    const pinMap = new Map<string, Pin>([
      ['pin_poly_1', { id: 'pin_poly_1', name: '3Ph_1', x: 100, y: 100, localX: 0, localY: 0, componentId: 'c1', domain: 'polyphase' }],
      ['pin_elec_1', { id: 'pin_elec_1', name: 'A', x: 200, y: 100, localX: 0, localY: 0, componentId: 'c2', domain: 'electrical' }],
    ]);

    const wire: WireData = {
      id: 'w1',
      startPin: 'pin_poly_1',
      endPin: 'pin_elec_1',
      points: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
    };

    assert.equal(WireRenderer.resolveWireDomain(wire, pinMap), 'polyphase');
  });

  it('should auto-infer control domain from connected CSMF pins', () => {
    const pinMap = new Map<string, Pin>([
      ['pin_csmf_out', { id: 'pin_csmf_out', name: 'Out', x: 100, y: 200, localX: 0, localY: 0, componentId: 'c1', domain: 'control', direction: 'out' }],
      ['pin_csmf_in', { id: 'pin_csmf_in', name: 'In', x: 300, y: 200, localX: 0, localY: 0, componentId: 'c2', domain: 'control', direction: 'in' }],
    ]);

    const wire: WireData = {
      id: 'w2',
      startPin: 'pin_csmf_out',
      endPin: 'pin_csmf_in',
      points: [{ x: 100, y: 200 }, { x: 300, y: 200 }],
    };

    assert.equal(WireRenderer.resolveWireDomain(wire, pinMap), 'control');
  });

  it('should default to electrical domain when pins are standard electrical or absent', () => {
    const pinMap = new Map<string, Pin>([
      ['pin_e1', { id: 'pin_e1', name: 'P1', x: 50, y: 50, localX: 0, localY: 0, componentId: 'r1', domain: 'electrical' }],
      ['pin_e2', { id: 'pin_e2', name: 'P2', x: 150, y: 50, localX: 0, localY: 0, componentId: 'r2', domain: 'electrical' }],
    ]);

    const wire1: WireData = { id: 'w1', startPin: 'pin_e1', endPin: 'pin_e2', points: [] };
    const wire2: WireData = { id: 'w2', startPin: null, endPin: null, points: [] };

    assert.equal(WireRenderer.resolveWireDomain(wire1, pinMap), 'electrical');
    assert.equal(WireRenderer.resolveWireDomain(wire2, pinMap), 'electrical');
  });
});

describe('Step 23.3: Signal Flow Direction Calculation', () => {
  it('should detect forward direction when start is out and end is in', () => {
    const pinMap = new Map<string, Pin>([
      ['tx_out', { id: 'tx_out', name: 'Out', x: 100, y: 100, localX: 0, localY: 0, componentId: 'tx', direction: 'out', domain: 'control' }],
      ['rx_in', { id: 'rx_in', name: 'In', x: 200, y: 100, localX: 0, localY: 0, componentId: 'rx', direction: 'in', domain: 'control' }],
    ]);

    const wire: WireData = { id: 'w1', startPin: 'tx_out', endPin: 'rx_in', points: [] };
    assert.equal(WireRenderer.resolveSignalDirection(wire, pinMap), 'forward');
  });

  it('should detect reverse direction when start is in and end is out', () => {
    const pinMap = new Map<string, Pin>([
      ['rx_in', { id: 'rx_in', name: 'In', x: 100, y: 100, localX: 0, localY: 0, componentId: 'rx', direction: 'in', domain: 'control' }],
      ['tx_out', { id: 'tx_out', name: 'Out', x: 200, y: 100, localX: 0, localY: 0, componentId: 'tx', direction: 'out', domain: 'control' }],
    ]);

    const wire: WireData = { id: 'w1', startPin: 'rx_in', endPin: 'tx_out', points: [] };
    assert.equal(WireRenderer.resolveSignalDirection(wire, pinMap), 'reverse');
  });
});

describe('Step 23.3: Wire Visual Style Configurations', () => {
  const lightTheme = THEME_PALETTES.LIGHT;
  const darkTheme = THEME_PALETTES.DARK;

  it('should configure 1-Phase Electrical wire as standard 2.0px solid line', () => {
    const wire: WireData = { id: 'w1', startPin: null, endPin: null, points: [], domain: 'electrical' };
    const styleLight = WireRenderer.getWireStyle(wire, 'electrical', false, lightTheme);
    const styleDark = WireRenderer.getWireStyle(wire, 'electrical', false, darkTheme);

    assert.equal(styleLight.lineWidth, 2.0);
    assert.equal(styleLight.strokeColor, lightTheme.wireNormal); // #1e293b
    assert.deepEqual(styleLight.lineDash, []);
    assert.equal(styleLight.junctionShape, 'circle');
    assert.equal(styleLight.junctionRadius, 2.5);
    assert.equal(styleLight.hasBundleIndicator, false);
    assert.equal(styleLight.hasSignalArrowheads, false);

    assert.equal(styleDark.lineWidth, 2.0);
    assert.equal(styleDark.strokeColor, darkTheme.wireNormal); // #4fc1ff
  });

  it('should configure 3-Phase Polyphase wire as heavy 3.5px solid blue line with bundle indicator', () => {
    const wire: WireData = { id: 'w_poly', startPin: null, endPin: null, points: [], domain: 'polyphase' };
    const styleLight = WireRenderer.getWireStyle(wire, 'polyphase', false, lightTheme);
    const styleDark = WireRenderer.getWireStyle(wire, 'polyphase', false, darkTheme);

    assert.equal(styleLight.lineWidth, 3.5);
    assert.equal(styleLight.strokeColor, lightTheme.wirePolyphase); // #1d4ed8
    assert.deepEqual(styleLight.lineDash, []);
    assert.equal(styleLight.junctionShape, 'circle');
    assert.equal(styleLight.junctionRadius, 3.8);
    assert.equal(styleLight.hasBundleIndicator, true);
    assert.equal(styleLight.hasSignalArrowheads, false);

    assert.equal(styleDark.lineWidth, 3.5);
    assert.equal(styleDark.strokeColor, darkTheme.wirePolyphase); // #38bdf8
  });

  it('should configure Control Signal wire as 1.5px green dashed line with arrowheads & square markers', () => {
    const wire: WireData = { id: 'w_ctrl', startPin: null, endPin: null, points: [], domain: 'control' };
    const styleLight = WireRenderer.getWireStyle(wire, 'control', false, lightTheme);
    const styleDark = WireRenderer.getWireStyle(wire, 'control', false, darkTheme);

    assert.equal(styleLight.lineWidth, 1.5);
    assert.equal(styleLight.strokeColor, lightTheme.wireControl); // #059669
    assert.deepEqual(styleLight.lineDash, [5, 4]);
    assert.equal(styleLight.junctionShape, 'square');
    assert.equal(styleLight.junctionRadius, 2.5);
    assert.equal(styleLight.hasBundleIndicator, false);
    assert.equal(styleLight.hasSignalArrowheads, true);

    assert.equal(styleDark.lineWidth, 1.5);
    assert.equal(styleDark.strokeColor, darkTheme.wireControl); // #10b981
  });

  it('should increase stroke widths and colors appropriately when wire is selected', () => {
    const wireElec: WireData = { id: 'w1', startPin: null, endPin: null, points: [] };
    const wirePoly: WireData = { id: 'w2', startPin: null, endPin: null, points: [], domain: 'polyphase' };
    const wireCtrl: WireData = { id: 'w3', startPin: null, endPin: null, points: [], domain: 'control' };

    const selElec = WireRenderer.getWireStyle(wireElec, 'electrical', true, lightTheme);
    const selPoly = WireRenderer.getWireStyle(wirePoly, 'polyphase', true, lightTheme);
    const selCtrl = WireRenderer.getWireStyle(wireCtrl, 'control', true, lightTheme);

    assert.equal(selElec.lineWidth, 3.5);
    assert.equal(selPoly.lineWidth, 5.0);
    assert.equal(selCtrl.lineWidth, 2.5);
  });

  it('should respect electrical individual phase colors (Phase A, B, C, Neutral)', () => {
    const wireA: WireData = { id: 'wa', startPin: null, endPin: null, points: [], phase: 'phaseA' };
    const wireB: WireData = { id: 'wb', startPin: null, endPin: null, points: [], phase: 'phaseB' };
    const wireC: WireData = { id: 'wc', startPin: null, endPin: null, points: [], phase: 'phaseC' };
    const wireN: WireData = { id: 'wn', startPin: null, endPin: null, points: [], phase: 'neutral' };

    assert.equal(WireRenderer.getWireStyle(wireA, 'electrical', false, lightTheme).strokeColor, '#ef4444');
    assert.equal(WireRenderer.getWireStyle(wireB, 'electrical', false, lightTheme).strokeColor, '#eab308');
    assert.equal(WireRenderer.getWireStyle(wireC, 'electrical', false, lightTheme).strokeColor, '#3b82f6');
    assert.equal(WireRenderer.getWireStyle(wireN, 'electrical', false, lightTheme).strokeColor, '#475569');
  });
});

describe('Step 23.3: 3-Phase Slash Bundle Vector Geometry', () => {
  it('should render 3 diagonal slashes across a horizontal segment', () => {
    const { ctx, operations } = createMockContext();
    const p1: Point = { x: 100, y: 200 };
    const p2: Point = { x: 200, y: 200 };

    WireRenderer.drawSlashBundleIndicator(ctx, p1, p2, '#1d4ed8', 3);

    // Should draw 3 lines (moveTo, lineTo x 3)
    const moveTos = operations.filter((op) => op.startsWith('moveTo'));
    const lineTos = operations.filter((op) => op.startsWith('lineTo'));
    const strokes = operations.filter((op) => op === 'stroke');

    assert.equal(moveTos.length, 3, 'Must render exactly 3 slashes');
    assert.equal(lineTos.length, 3, 'Must render exactly 3 slashes');
    assert.equal(strokes.length, 3, 'Must stroke each slash');
  });

  it('should render 3 diagonal slashes across a vertical segment', () => {
    const { ctx, operations } = createMockContext();
    const p1: Point = { x: 200, y: 100 };
    const p2: Point = { x: 200, y: 200 };

    WireRenderer.drawSlashBundleIndicator(ctx, p1, p2, '#1d4ed8', 3);

    const moveTos = operations.filter((op) => op.startsWith('moveTo'));
    assert.equal(moveTos.length, 3, 'Must render 3 slashes on vertical line');
  });

  it('should skip slash bundle indicator on segments shorter than 26px', () => {
    const { ctx, operations } = createMockContext();
    const p1: Point = { x: 100, y: 200 };
    const p2: Point = { x: 120, y: 200 }; // 20px length

    WireRenderer.drawSlashBundleIndicator(ctx, p1, p2, '#1d4ed8', 3);
    assert.equal(operations.length, 0, 'Must not draw slashes on short segments');
  });
});

describe('Step 23.3: Control Signal Directional Arrowhead Geometry', () => {
  it('should draw a triangular filled arrowhead pointing toward the destination', () => {
    const { ctx, operations } = createMockContext();
    const from: Point = { x: 100, y: 100 };
    const to: Point = { x: 200, y: 100 };

    WireRenderer.drawSignalArrowhead(ctx, from, to, '#059669', 8.0, 0);

    const fills = operations.filter((op) => op === 'fill');
    const closePaths = operations.filter((op) => op === 'closePath');
    assert.equal(fills.length, 1, 'Arrowhead must be filled');
    assert.equal(closePaths.length, 1, 'Arrowhead path must be closed');
  });

  it('should skip arrowhead on micro segments (< 10px)', () => {
    const { ctx, operations } = createMockContext();
    WireRenderer.drawSignalArrowhead(ctx, { x: 10, y: 10 }, { x: 15, y: 10 }, '#059669', 8.0);
    assert.equal(operations.length, 0, 'Must not draw on micro segments');
  });
});

describe('Step 23.3: Wire Hit-Testing & Tolerance Engine', () => {
  const horizontalWire: WireData = {
    id: 'w1',
    startPin: null,
    endPin: null,
    points: [{ x: 50, y: 100 }, { x: 250, y: 100 }],
    domain: 'electrical',
  };

  const polyphaseWire: WireData = {
    id: 'w2',
    startPin: null,
    endPin: null,
    points: [{ x: 50, y: 100 }, { x: 250, y: 100 }],
    domain: 'polyphase',
  };

  it('should hit-test true when click is within tolerance of wire conductor', () => {
    assert.equal(WireRenderer.hitTestWire(horizontalWire, 150, 103, undefined, 6.0), true);
    assert.equal(WireRenderer.hitTestWire(horizontalWire, 150, 96, undefined, 6.0), true);
  });

  it('should reject clicks outside wire tolerance', () => {
    assert.equal(WireRenderer.hitTestWire(horizontalWire, 150, 115, undefined, 6.0), false);
    assert.equal(WireRenderer.hitTestWire(horizontalWire, 150, 80, undefined, 6.0), false);
  });

  it('should grant wider hit tolerance for 3-Phase polyphase wires', () => {
    // 7.2px distance from wire: fails for electrical (threshold 6.0), passes for polyphase (threshold 7.5)
    assert.equal(WireRenderer.hitTestWire(horizontalWire, 150, 107.2, undefined, 6.0), false);
    assert.equal(WireRenderer.hitTestWire(polyphaseWire, 150, 107.2, undefined, 6.0), true);
  });
});

describe('Step 23.3: Complete Canvas Wire Rendering Integration', () => {
  const pinMap = new Map<string, Pin>();
  const lightTheme = THEME_PALETTES.LIGHT;

  it('should render 1-Phase electrical wire with solid stroke and circular junction dots', () => {
    const { ctx, operations } = createMockContext();
    const wire: WireData = {
      id: 'w1',
      startPin: null,
      endPin: null,
      points: [{ x: 40, y: 40 }, { x: 100, y: 40 }, { x: 100, y: 120 }],
      domain: 'electrical',
    };

    WireRenderer.renderWire(ctx, wire, pinMap, lightTheme, false);

    assert.ok(operations.includes('lineWidth=2'), 'Must set lineWidth to 2.0 for electrical wire');
    assert.ok(operations.includes('setLineDash([])'), 'Must set solid line for electrical wire');
    const arcs = operations.filter((op) => op.startsWith('arc'));
    assert.equal(arcs.length, 3, 'Must render 3 circular junction dots at vertices');
  });

  it('should render 3-Phase polyphase wire with 3.5px stroke, slashes, and larger junction dots', () => {
    const { ctx, operations } = createMockContext();
    const wire: WireData = {
      id: 'w2',
      startPin: null,
      endPin: null,
      points: [{ x: 40, y: 40 }, { x: 140, y: 40 }], // 100px segment
      domain: 'polyphase',
    };

    WireRenderer.renderWire(ctx, wire, pinMap, lightTheme, false);

    assert.ok(operations.includes('lineWidth=3.5'), 'Must set lineWidth to 3.5 for polyphase wire');
    assert.ok(operations.includes(`strokeStyle=${lightTheme.wirePolyphase}`), 'Must use polyphase theme color');
    // Bundle indicator slashes
    const strokes = operations.filter((op) => op === 'stroke');
    assert.ok(strokes.length >= 4, 'Must stroke wire and 3 bundle slashes');
  });

  it('should render Control Signal wire with dashed line, directional arrow, and square markers', () => {
    const { ctx, operations } = createMockContext();
    const wire: WireData = {
      id: 'w3',
      startPin: null,
      endPin: null,
      points: [{ x: 40, y: 40 }, { x: 140, y: 40 }], // 100px segment
      domain: 'control',
    };

    WireRenderer.renderWire(ctx, wire, pinMap, lightTheme, false);

    const dashes = operations.filter((op) => op.includes('setLineDash([5,4])'));
    assert.ok(dashes.length > 0, 'Must apply dashed line style');

    const fillRects = operations.filter((op) => op.startsWith('fillRect'));
    assert.equal(fillRects.length, 2, 'Must render square markers at vertices');

    const fills = operations.filter((op) => op === 'fill');
    assert.ok(fills.length >= 1, 'Must fill directional arrowheads');
  });
});
