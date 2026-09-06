/**
 * PSCAD CLONE - Standard ANSI / IEEE / IEC Electrical Symbol Vectors Unit Tests
 * Phase 23 - Step 23.2: Standard ANSI / IEEE / IEC Electrical Symbol Vectors
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SymbolRenderer } from '../components/canvas/symbols';
import { getComponentPinsLocal } from '../engine/netlist';
import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';

// Mock Canvas 2D Context for tracking draw calls and vector commands
function createMockContext() {
  const operations: string[] = [];
  const state: Record<string, any> = {
    lineWidth: 2.0,
    strokeStyle: '#000000',
    fillStyle: '#ffffff',
    lineJoin: 'round',
    miterLimit: 10,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineDash: [] as number[],
  };

  const ctx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    translate: (x: number, y: number) => operations.push(`translate(${x},${y})`),
    rotate: (rad: number) => operations.push(`rotate(${rad.toFixed(3)})`),
    scale: (sx: number, sy: number) => operations.push(`scale(${sx},${sy})`),
    beginPath: () => operations.push('beginPath'),
    closePath: () => operations.push('closePath'),
    moveTo: (x: number, y: number) => operations.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => operations.push(`lineTo(${x},${y})`),
    arc: (x: number, y: number, r: number, s: number, e: number, _ccw?: boolean) =>
      operations.push(`arc(${x},${y},${r},${s.toFixed(2)},${e.toFixed(2)})`),
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) =>
      operations.push(`bezierCurveTo(${cp1x},${cp1y},${cp2x},${cp2y},${x},${y})`),
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) =>
      operations.push(`quadraticCurveTo(${cpx},${cpy},${x},${y})`),
    rect: (x: number, y: number, w: number, h: number) => operations.push(`rect(${x},${y},${w},${h})`),
    stroke: () => operations.push('stroke'),
    fill: () => operations.push('fill'),
    fillText: (text: string, x: number, y: number) => operations.push(`fillText("${text}",${x},${y})`),
    setLineDash: (d: number[]) => {
      state.lineDash = d;
      operations.push(`setLineDash([${d.join(',')}])`);
    },
    set lineWidth(val: number) {
      state.lineWidth = val;
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set strokeStyle(val: any) {
      state.strokeStyle = val;
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
    set lineJoin(val: any) {
      state.lineJoin = val;
    },
    get lineJoin() {
      return state.lineJoin;
    },
    set miterLimit(val: number) {
      state.miterLimit = val;
    },
    get miterLimit() {
      return state.miterLimit;
    },
    set font(val: string) {
      state.font = val;
    },
    get font() {
      return state.font;
    },
    set textAlign(val: string) {
      state.textAlign = val;
    },
    get textAlign() {
      return state.textAlign;
    },
    set textBaseline(val: string) {
      state.textBaseline = val;
    },
    get textBaseline() {
      return state.textBaseline;
    },
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, operations, state };
}

describe('Step 23.2: ANSI / IEEE / IEC Resistor Vector Stencils', () => {
  it('should draw an authentic ANSI IEEE Std 315 symmetrical sharp zigzag resistor', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_r1',
      name: 'R1',
      type: COMPONENT_TYPES.RESISTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { resistance: 50.0 },
    };

    SymbolRenderer.drawResistor(mock.ctx, comp);

    // Verify lead lines and zigzag vertices
    assert.ok(mock.operations.includes('moveTo(-40,0)'), 'Must have lead at -40');
    assert.ok(mock.operations.includes('lineTo(-24,0)'), 'Must transition to zigzag at -24');
    assert.ok(mock.operations.includes('lineTo(-20,-9)'), 'Must have positive peak 1');
    assert.ok(mock.operations.includes('lineTo(-12,9)'), 'Must have negative trough 1');
    assert.ok(mock.operations.includes('lineTo(-4,-9)'), 'Must have positive peak 2');
    assert.ok(mock.operations.includes('lineTo(4,9)'), 'Must have negative trough 2');
    assert.ok(mock.operations.includes('lineTo(12,-9)'), 'Must have positive peak 3');
    assert.ok(mock.operations.includes('lineTo(20,9)'), 'Must have negative trough 3');
    assert.ok(mock.operations.includes('lineTo(24,0)'), 'Must transition out of zigzag at 24');
    assert.ok(mock.operations.includes('lineTo(40,0)'), 'Must have lead extending to +40');
    assert.equal(mock.state.lineJoin, 'miter', 'Must use miter joins for crisp sharp peaks');
  });

  it('should support IEC 60617 rectangular box mode when requested in params', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_r_iec',
      name: 'R_IEC',
      type: COMPONENT_TYPES.RESISTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { resistance: 100.0, symbolStandard: 'IEC' },
    };

    SymbolRenderer.drawResistor(mock.ctx, comp);
    assert.ok(mock.operations.includes('rect(-24,-8,48,16)'), 'Must draw IEC rectangular box');
    assert.ok(mock.operations.includes('fill'), 'IEC box must be filled');
  });

  it('should render a potentiometer / variable resistor diagonal arrow', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_r_pot',
      name: 'R_POT',
      type: COMPONENT_TYPES.RESISTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { resistance: 1000.0, isVariable: true },
    };

    SymbolRenderer.drawResistor(mock.ctx, comp);
    assert.ok(mock.operations.includes('moveTo(-16,16)'), 'Must draw variable arrow shaft');
    assert.ok(mock.operations.includes('lineTo(16,-16)'), 'Arrow shaft ends at top right');
    assert.ok(mock.operations.includes('closePath'), 'Arrowhead is closed polygon');
  });
});

describe('Step 23.2: Curled Inductor Vector Stencils & Core Models', () => {
  it('should draw an authentic curled solenoid with 4 coiled loops and loopbacks', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_l1',
      name: 'L1',
      type: COMPONENT_TYPES.INDUCTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { inductance: 0.025 },
    };

    SymbolRenderer.drawInductor(mock.ctx, comp);

    assert.ok(mock.operations.includes('moveTo(-40,0)'), 'Lead from -40');
    assert.ok(mock.operations.includes('lineTo(-24,0)'), 'Lead to coil start -24');
    // Coiled loops: 4 arcs
    const arcOps = mock.operations.filter((op) => op.startsWith('arc('));
    assert.equal(arcOps.length, 4, 'Must draw 4 coil arches');
    // Loopback Béziers connecting arches
    const bezierOps = mock.operations.filter((op) => op.startsWith('bezierCurveTo('));
    assert.equal(bezierOps.length, 3, 'Must draw 3 helical loopback transitions between 4 arches');
    assert.ok(mock.operations.includes('lineTo(40,0)'), 'Lead extending to +40');
  });

  it('should render parallel iron core lines when core is iron / saturable', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_l_core',
      name: 'L_Core',
      type: COMPONENT_TYPES.INDUCTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { inductance: 0.1, core: 'iron' },
    };

    SymbolRenderer.drawInductor(mock.ctx, comp);
    assert.ok(mock.operations.includes('moveTo(-24,-13)'), 'Iron core line 1');
    assert.ok(mock.operations.includes('lineTo(24,-13)'), 'Iron core line 1 end');
    assert.ok(mock.operations.includes('moveTo(-24,-16)'), 'Iron core line 2');
    assert.ok(mock.operations.includes('lineTo(24,-16)'), 'Iron core line 2 end');
  });

  it('should render dashed core lines for ferrite cores', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_l_ferrite',
      name: 'L_Ferrite',
      type: COMPONENT_TYPES.INDUCTOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { inductance: 0.05, core: 'ferrite' },
    };

    SymbolRenderer.drawInductor(mock.ctx, comp);
    assert.ok(mock.operations.includes('setLineDash([4,2])'), 'Ferrite core must be dashed');
  });
});

describe('Step 23.2: Parallel-Plate Capacitor Vector Stencils', () => {
  it('should draw crisp parallel plates with calibrated gap and lead terminals', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_c1',
      name: 'C1',
      type: COMPONENT_TYPES.CAPACITOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { capacitance: 10e-6 },
    };

    SymbolRenderer.drawCapacitor(mock.ctx, comp);
    assert.ok(mock.operations.includes('moveTo(-40,0)'), 'Lead 1 from -40');
    assert.ok(mock.operations.includes('lineTo(-5,0)'), 'Lead 1 to left plate');
    assert.ok(mock.operations.includes('moveTo(-5,-16)'), 'Left plate top');
    assert.ok(mock.operations.includes('lineTo(-5,16)'), 'Left plate bottom');
    assert.ok(mock.operations.includes('moveTo(5,-16)'), 'Right plate top');
    assert.ok(mock.operations.includes('lineTo(5,16)'), 'Right plate bottom');
    assert.ok(mock.operations.includes('lineTo(40,0)'), 'Lead 2 to +40');
    assert.equal(mock.state.lineWidth, 2.5, 'Plate lines must be heavy 2.5px');
  });

  it('should render electrolytic / polarized capacitor with curved cathode plate and + indicator', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_c_pol',
      name: 'C_Pol',
      type: COMPONENT_TYPES.CAPACITOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { capacitance: 100e-6, polarized: true },
    };

    SymbolRenderer.drawCapacitor(mock.ctx, comp);
    assert.ok(mock.operations.some((op) => op.startsWith('quadraticCurveTo(')), 'Must render curved cathode plate');
    assert.ok(mock.operations.includes('fillText("+",-14,-10)'), 'Must render positive polarity + mark');
  });

  it('should render variable trimming capacitor diagonal arrow', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_c_var',
      name: 'C_Var',
      type: COMPONENT_TYPES.CAPACITOR,
      x: 100,
      y: 100,
      rotation: 0,
      params: { capacitance: 50e-12, isVariable: true },
    };

    SymbolRenderer.drawCapacitor(mock.ctx, comp);
    assert.ok(mock.operations.includes('moveTo(-14,16)'), 'Arrow start at bottom-left');
    assert.ok(mock.operations.includes('lineTo(14,-16)'), 'Arrow point at top-right');
    assert.ok(mock.operations.includes('closePath'), 'Arrowhead closed');
  });
});

describe('Step 23.2: AC Sources (1-Phase & 3-Phase) & 20px Grid Pin Alignment', () => {
  it('should draw 1-Phase AC source with mathematical sine curve and 20px grid terminals', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_src1',
      name: 'V1',
      type: COMPONENT_TYPES.AC_SOURCE_1PH,
      x: 100,
      y: 100,
      rotation: 0,
      params: { voltage: 120, freq: 60 },
    };

    SymbolRenderer.drawACSource1Ph(mock.ctx, comp, { componentStroke: '#000' });
    assert.ok(mock.operations.includes('arc(0,0,22,0.00,6.28)'), 'Radius 22 circle');
    assert.ok(mock.operations.some((op) => op.startsWith('bezierCurveTo(')), 'Smooth sine curve inside');
    assert.ok(mock.operations.includes('lineTo(0,-40)'), 'Terminal 1 on 20px grid at y=-40');
    assert.ok(mock.operations.includes('lineTo(0,40)'), 'Terminal 2 on 20px grid at y=40');
  });

  it('should draw 3-Phase AC source with 3~ vector insignia and terminals at x = -20, 0, 20', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_src3',
      name: 'Grid_3Ph',
      type: COMPONENT_TYPES.AC_SOURCE_3PH,
      x: 100,
      y: 100,
      rotation: 0,
      params: { voltage: 230000, freq: 60 },
    };

    SymbolRenderer.drawACSource3Ph(mock.ctx, { componentStroke: '#000', componentText: '#000' }, comp);
    assert.ok(mock.operations.includes('fillText("3 ~",0,0)'), '3~ vector insignia');
    // Phase A at x = -20
    assert.ok(mock.operations.includes('lineTo(-20,-40)'), 'Phase A terminal at x=-20, y=-40');
    // Phase B at x = 0
    assert.ok(mock.operations.includes('lineTo(0,-40)'), 'Phase B terminal at x=0, y=-40');
    // Phase C at x = 20
    assert.ok(mock.operations.includes('lineTo(20,-40)'), 'Phase C terminal at x=20, y=-40');
    // Neutral at y = 40
    assert.ok(mock.operations.includes('lineTo(0,40)'), 'Neutral terminal at x=0, y=40');
  });

  it('should return 20px-grid-aligned pins for AC_SOURCE_3PH in getComponentPinsLocal', () => {
    const comp: CircuitComponentData = {
      id: 'c_test_src',
      name: 'Src',
      type: COMPONENT_TYPES.AC_SOURCE_3PH,
      x: 200,
      y: 200,
      rotation: 0,
      params: {},
    };

    const pins = getComponentPinsLocal(comp);
    const pa = pins.find((p) => p.name === 'A')!;
    const pb = pins.find((p) => p.name === 'B')!;
    const pc = pins.find((p) => p.name === 'C')!;
    const pn = pins.find((p) => p.name === 'N')!;

    assert.equal(pa.x, -20, 'Pin A must be at x=-20 (aligned with 20px grid)');
    assert.equal(pa.y, -40, 'Pin A must be at y=-40 (aligned with 20px grid)');
    assert.equal(pb.x, 0, 'Pin B must be at x=0 (aligned with 20px grid)');
    assert.equal(pb.y, -40, 'Pin B must be at y=-40 (aligned with 20px grid)');
    assert.equal(pc.x, 20, 'Pin C must be at x=20 (aligned with 20px grid)');
    assert.equal(pc.y, -40, 'Pin C must be at y=-40 (aligned with 20px grid)');
    assert.equal(pn.x, 0, 'Pin N must be at x=0');
    assert.equal(pn.y, 40, 'Pin N must be at y=40');
  });
});

describe('Step 23.2: 2-Winding Transformer Vectors with Vector Groups', () => {
  it('should draw 1-Phase transformer with dual interlocking circles, core bars, and polarity dots', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_tx1',
      name: 'Tx1',
      type: COMPONENT_TYPES.TRANSFORMER_1PH,
      x: 100,
      y: 100,
      rotation: 0,
      params: { V1_nom: 230000, V2_nom: 69000 },
    };

    SymbolRenderer.drawTransformer1Ph(mock.ctx, comp, { componentStroke: '#000' });
    // Dual circles
    assert.ok(mock.operations.includes('arc(-13,0,16,0.00,6.28)'), 'Primary winding circle at x=-13');
    assert.ok(mock.operations.includes('arc(13,0,16,0.00,6.28)'), 'Secondary winding circle at x=13');
    // Magnetic core bars
    assert.ok(mock.operations.includes('moveTo(-1.5,-16)'), 'Core bar 1');
    assert.ok(mock.operations.includes('moveTo(1.5,-16)'), 'Core bar 2');
    // Polarity dots
    assert.ok(mock.operations.includes('arc(-20,-22,2.5,0.00,6.28)'), 'Primary polarity dot');
    assert.ok(mock.operations.includes('arc(6,-22,2.5,0.00,6.28)'), 'Secondary polarity dot');
  });

  it('should draw 3-Phase transformer with dual circles, internal winding symbols, and vector group text', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_tx3',
      name: 'Tx3',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      x: 100,
      y: 100,
      rotation: 0,
      params: { ratingMva: 100, vectorGroup: 'Dyn11' },
    };

    SymbolRenderer.drawTransformer3Ph(mock.ctx, { componentStroke: '#000', componentText: '#000' }, comp);
    // Dual circles
    assert.ok(mock.operations.includes('arc(-18,0,22,0.00,6.28)'), 'Primary circle');
    assert.ok(mock.operations.includes('arc(18,0,22,0.00,6.28)'), 'Secondary circle');
    // Vector group label
    assert.ok(mock.operations.includes('fillText("Dyn11",0,28)'), 'Vector group Dyn11 text badge');
    // Delta triangle on primary side (Dyn11 has Delta primary)
    assert.ok(mock.operations.includes('moveTo(-18,-9)'), 'Delta primary triangle start');
    // Wye spoke on secondary side
    assert.ok(mock.operations.includes('lineTo(18,9)'), 'Wye secondary center spoke');
  });

  it('should return 20px-grid-aligned pins for TRANSFORMER_3PH in getComponentPinsLocal', () => {
    const comp: CircuitComponentData = {
      id: 'c_tx_pins',
      name: 'Tx_Pins',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      x: 300,
      y: 300,
      rotation: 0,
      params: {},
    };

    const pins = getComponentPinsLocal(comp);
    assert.equal(pins.length, 8, '3-Phase transformer has 8 pins (A, B, C, N primary & secondary)');

    const pa = pins.find((p) => p.name === 'P_A')!;
    const pb = pins.find((p) => p.name === 'P_B')!;
    const pc = pins.find((p) => p.name === 'P_C')!;
    const pn = pins.find((p) => p.name === 'P_N')!;

    assert.equal(pa.x, -40);
    assert.equal(pa.y, -20);
    assert.equal(pb.x, -40);
    assert.equal(pb.y, 0);
    assert.equal(pc.x, -40);
    assert.equal(pc.y, 20);
    assert.equal(pn.x, -40);
    assert.equal(pn.y, 40);

    // All pins are multiples of 20!
    pins.forEach((pin) => {
      assert.equal(Math.abs(pin.x) % 20, 0, `Pin ${pin.name} x coordinate (${pin.x}) must be multiple of 20`);
      assert.equal(Math.abs(pin.y) % 20, 0, `Pin ${pin.name} y coordinate (${pin.y}) must be multiple of 20`);
    });
  });
});

describe('Step 23.2: CAD Component Designator & Parameter Annotation Engine', () => {
  it('should generate standard designators when comp.name is not set', () => {
    const r: CircuitComponentData = { id: 'c_123', name: '', type: COMPONENT_TYPES.RESISTOR, x: 0, y: 0, rotation: 0, params: {} };
    assert.equal(SymbolRenderer.getComponentDesignator(r), 'R_123');

    const l: CircuitComponentData = { id: 'c_abc', name: '', type: COMPONENT_TYPES.INDUCTOR, x: 0, y: 0, rotation: 0, params: {} };
    assert.equal(SymbolRenderer.getComponentDesignator(l), 'L_abc');

    const tx: CircuitComponentData = { id: 'c_xfmr', name: '', type: COMPONENT_TYPES.TRANSFORMER_3PH, x: 0, y: 0, rotation: 0, params: {} };
    assert.equal(SymbolRenderer.getComponentDesignator(tx), 'Tx_xfmr');

    const custom: CircuitComponentData = { id: 'c_cust', name: 'R_Filter', type: COMPONENT_TYPES.RESISTOR, x: 0, y: 0, rotation: 0, params: {} };
    assert.equal(SymbolRenderer.getComponentDesignator(custom), 'R_Filter');
  });

  it('should format engineering parameters with appropriate metric SI prefixes', () => {
    const r: CircuitComponentData = {
      id: 'c_r',
      name: 'R',
      type: COMPONENT_TYPES.RESISTOR,
      x: 0,
      y: 0,
      rotation: 0,
      params: { resistance: 50.0 },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(r), '50 Ω');

    const l: CircuitComponentData = {
      id: 'c_l',
      name: 'L',
      type: COMPONENT_TYPES.INDUCTOR,
      x: 0,
      y: 0,
      rotation: 0,
      params: { inductance: 0.025 },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(l), '25 mH');

    const c: CircuitComponentData = {
      id: 'c_c',
      name: 'C',
      type: COMPONENT_TYPES.CAPACITOR,
      x: 0,
      y: 0,
      rotation: 0,
      params: { capacitance: 10e-6 },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(c), '10 µF');

    const src: CircuitComponentData = {
      id: 'c_grid',
      name: 'Src',
      type: COMPONENT_TYPES.AC_SOURCE_3PH,
      x: 0,
      y: 0,
      rotation: 0,
      params: { voltage: 230000, freq: 60 },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(src), '230 kV, 60 Hz');

    const tx: CircuitComponentData = {
      id: 'c_tx',
      name: 'Tx',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      x: 0,
      y: 0,
      rotation: 0,
      params: { ratingMva: 250, vectorGroup: 'Dyn11' },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(tx), '250 MVA, Dyn11');

    const brk: CircuitComponentData = {
      id: 'c_brk',
      name: 'CB',
      type: COMPONENT_TYPES.BREAKER_3PH,
      x: 0,
      y: 0,
      rotation: 0,
      params: { initClosed: true, openTime: 0.15 },
    };
    assert.equal(SymbolRenderer.getComponentParameterAnnotation(brk), 'CLOSED (t=0.15s)');
  });

  it('should position labels above and below in horizontal orientation (rotation 0°)', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_r_horiz',
      type: COMPONENT_TYPES.RESISTOR,
      x: 200,
      y: 150,
      rotation: 0,
      name: 'R_Load',
      params: { resistance: 100.0 },
    };

    SymbolRenderer.drawLabels(mock.ctx, comp, { componentText: '#111', wireNormal: '#333' });
    assert.equal(mock.state.textAlign, 'center');
    assert.ok(mock.operations.includes('fillText("R_Load",200,122)'), 'Designator at y = 150 - 28 = 122');
    assert.ok(mock.operations.includes('fillText("100 Ω",200,176)'), 'Parameter at y = 150 + 26 = 176');
  });

  it('should offset labels to the side in vertical orientation (rotation 90°) to prevent wire collision', () => {
    const mock = createMockContext();
    const comp: CircuitComponentData = {
      id: 'c_r_vert',
      type: COMPONENT_TYPES.RESISTOR,
      x: 200,
      y: 150,
      rotation: 90,
      name: 'R_Load_Vert',
      params: { resistance: 50.0 },
    };

    SymbolRenderer.drawLabels(mock.ctx, comp, { componentText: '#111', wireNormal: '#333' });
    // Text aligned left and placed at x = 200 + 30 = 230
    assert.equal(mock.state.textAlign, 'left');
    assert.ok(mock.operations.includes('fillText("R_Load_Vert",230,146)'), 'Designator placed to side at x=230, y=146');
    assert.ok(mock.operations.includes('fillText("50 Ω",230,161)'), 'Parameter placed below designator at x=230, y=161');
  });
});
