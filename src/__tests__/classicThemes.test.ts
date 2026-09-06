/**
 * PSCAD CLONE - Classic Themes & Light CAD Grid Stencil Unit Tests
 * Phase 23 - Step 23.1: Classic PSCAD Light Engineering Palette & Grid Stencil
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_PALETTES,
  getThemePalette,
  type ThemePalette,
} from '../constants/themes';
import { COLOR_PALETTES } from '../constants';

describe('Theme Palette Engine - Classic PSCAD Themes & Tokens', () => {
  it('should export all 3 primary CAD themes (LIGHT, DARK, BLUEPRINT)', () => {
    assert.ok(THEME_PALETTES.LIGHT, 'LIGHT palette must be defined');
    assert.ok(THEME_PALETTES.DARK, 'DARK palette must be defined');
    assert.ok(THEME_PALETTES.BLUEPRINT, 'BLUEPRINT palette must be defined');
  });

  it('should resolve theme palettes case-insensitively with getThemePalette', () => {
    const light = getThemePalette('light');
    assert.equal(light.name, 'light');
    assert.equal(light.label, 'Classic PSCAD Light CAD');

    const dark = getThemePalette('DARK');
    assert.equal(dark.name, 'dark');

    const blueprint = getThemePalette('blueprint');
    assert.equal(blueprint.name, 'blueprint');

    const fallback = getThemePalette('unknown_theme' as any);
    assert.equal(fallback.name, 'dark', 'Fallback for unknown theme must default to dark');
  });

  it('should maintain 100% backward compatibility via COLOR_PALETTES alias', () => {
    assert.equal(COLOR_PALETTES.LIGHT.canvasBg, THEME_PALETTES.LIGHT.canvasBg);
    assert.equal(COLOR_PALETTES.DARK.canvasBg, THEME_PALETTES.DARK.canvasBg);
    assert.equal(COLOR_PALETTES.BLUEPRINT.canvasBg, THEME_PALETTES.BLUEPRINT.canvasBg);
  });
});

describe('Classic PSCAD Light Engineering Palette Specifications (Step 23.1)', () => {
  const light: ThemePalette = THEME_PALETTES.LIGHT;

  it('should have an authentic off-white / light gray canvas background (#F4F6F9 / #FFFFFF)', () => {
    assert.match(light.canvasBg.toLowerCase(), /^#(f4f6f9|ffffff)$/);
  });

  it('should have crisp high-contrast dark charcoal / black schematic conductors (#1E293B / #000000)', () => {
    assert.match(light.wireNormal.toLowerCase(), /^#(1e293b|000000|0f172a)$/);
  });

  it('should define heavy solid 3-phase blue and dark red busbar colors', () => {
    // 3-Phase Blue: deep engineering blue #1e3a8a
    assert.match(light.busbar3Ph.toLowerCase(), /^#(1e3a8a|003366|1d4ed8)$/);
    // 3-Phase Dark Red: classic dark red / burgundy #881337
    assert.match(light.busbar3PhSecondary.toLowerCase(), /^#(881337|991b1b|8b0000)$/);
    // 1-Phase: solid charcoal
    assert.match(light.busbar1Ph.toLowerCase(), /^#(1e293b|0f172a|000000)$/);
  });

  it('should have crisp dark symbol stroke and clean white component bodies', () => {
    assert.equal(light.componentBody.toLowerCase(), '#ffffff');
    assert.match(light.componentStroke.toLowerCase(), /^#(0f172a|000000|1e293b)$/);
    assert.match(light.componentText.toLowerCase(), /^#(0f172a|000000|1e293b)$/);
  });

  it('should configure engineering title block colors suited for light drawing sheets', () => {
    assert.equal(light.titleBlockBg.toLowerCase(), '#ffffff');
    assert.match(light.titleBlockBorder.toLowerCase(), /^#(1e3a8a|003366|2563eb)$/);
    assert.match(light.titleBlockText.toLowerCase(), /^#(0f172a|000000|1e293b)$/);
    assert.match(light.titleBlockHeading.toLowerCase(), /^#(1e3a8a|003366|2563eb)$/);
  });
});

describe('Grid Stencil & 10px Snapping Logic (Step 23.1)', () => {
  const snapGridSize = 10;
  const majorGridSize = 20;

  const snap = (val: number) => Math.round(val / snapGridSize) * snapGridSize;

  it('should snap coordinates to exact 10px intervals', () => {
    assert.equal(snap(0), 0);
    assert.equal(snap(4), 0);
    assert.equal(snap(5), 10);
    assert.equal(snap(7), 10);
    assert.equal(snap(12), 10);
    assert.equal(snap(15), 20);
    assert.equal(snap(24), 20);
    assert.equal(snap(26), 30);
    assert.equal(snap(-14), -10);
    assert.equal(snap(-16), -20);
  });

  it('should accurately differentiate between major 20px and minor 10px grid points', () => {
    const isMajor = (x: number, y: number) => x % majorGridSize === 0 && y % majorGridSize === 0;

    // Major grid intersections (every 20px)
    assert.equal(isMajor(0, 0), true);
    assert.equal(isMajor(20, 20), true);
    assert.equal(isMajor(40, 20), true);
    assert.equal(isMajor(-20, 60), true);

    // Minor grid points (half-grid 10px offset)
    assert.equal(isMajor(10, 0), false);
    assert.equal(isMajor(0, 10), false);
    assert.equal(isMajor(10, 10), false);
    assert.equal(isMajor(30, 20), false);
  });

  it('should declutter minor grid markers when zoom is below LOD threshold', () => {
    const shouldRenderMarker = (x: number, y: number, zoom: number) => {
      const isMajor = x % majorGridSize === 0 && y % majorGridSize === 0;
      const isLowZoom = zoom < 0.65;
      if (!isMajor && isLowZoom) return false;
      return true;
    };

    // At normal zoom (1.0), all points render
    assert.equal(shouldRenderMarker(0, 0, 1.0), true);
    assert.equal(shouldRenderMarker(10, 10, 1.0), true);

    // At low zoom (0.5), major points render, minor points are decluttered
    assert.equal(shouldRenderMarker(20, 20, 0.5), true, 'Major points must render even at low zoom');
    assert.equal(shouldRenderMarker(10, 10, 0.5), false, 'Minor points must be skipped at low zoom');
  });
});

describe('Busbar Dynamic Color Scheme Resolution (Step 23.1)', () => {
  const light = THEME_PALETTES.LIGHT;

  function resolveBusbarColor(is3Ph: boolean, colorParam?: string): string {
    const isRed = colorParam === 'red';
    if (is3Ph) {
      return isRed ? light.busbar3PhSecondary : light.busbar3Ph;
    }
    return light.busbar1Ph;
  }

  it('should resolve standard 3-phase busbars to heavy solid blue (#1E3A8A)', () => {
    const color = resolveBusbarColor(true);
    assert.equal(color, light.busbar3Ph);
    assert.equal(color, '#1e3a8a');
  });

  it('should resolve red-flagged 3-phase busbars to heavy dark red (#881337)', () => {
    const color = resolveBusbarColor(true, 'red');
    assert.equal(color, light.busbar3PhSecondary);
    assert.equal(color, '#881337');
  });

  it('should resolve single-phase busbars to solid charcoal (#1E293B)', () => {
    const color = resolveBusbarColor(false);
    assert.equal(color, light.busbar1Ph);
    assert.equal(color, '#1e293b');
  });
});

describe('Classic PSCAD Light Theme CSS Coverage & Persistence', () => {
  it('should contain all required panel and surface overrides in index.css', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Check light theme block presence
    assert.ok(css.includes('[data-theme="light"]'), 'Must define [data-theme="light"] rules');

    // Check key surface and panel classes
    assert.ok(css.includes('header'), 'Must style header');
    assert.ok(css.includes('footer'), 'Must style footer');
    assert.ok(css.includes('aside'), 'Must style aside');
    assert.ok(css.includes('.bg-\\[\\#192130\\]'), 'Must style explorer header');
    assert.ok(css.includes('.bg-\\[\\#1c2333\\]'), 'Must style dock and status headers');
    assert.ok(css.includes('.bg-\\[\\#181f2c\\]'), 'Must style compiler sub-toolbar');
    assert.ok(css.includes('.bg-\\[\\#121620\\]'), 'Must style stats and phase cards');
    assert.ok(css.includes('.bg-\\[\\#1e2a3f\\]'), 'Must style active tree items');
    assert.ok(css.includes('.border-\\[\\#263147\\]'), 'Must style primary panel borders');

    // Expanded dark utility overrides
    assert.ok(css.includes('.bg-\\[\\#080b11\\]'), 'Must override dark ribbon inputs .bg-[#080b11]');
    assert.ok(css.includes('.bg-\\[\\#0f141f\\]'), 'Must override dark timing containers .bg-[#0f141f]');
    assert.ok(css.includes('.bg-\\[\\#0f172a\\]'), 'Must override .bg-[#0f172a]');
    assert.ok(css.includes('.bg-\\[\\#1e273a\\]'), 'Must override .bg-[#1e273a]');
    assert.ok(css.includes('.bg-slate-900'), 'Must override .bg-slate-900');
    assert.ok(css.includes('.bg-black\\/85'), 'Must override deep modal backdrops .bg-black/85');
    assert.ok(css.includes('.bg-\\[\\#090d14\\]'), 'Must override .bg-[#090d14]');
    assert.ok(css.includes('.bg-\\[\\#090c14\\]'), 'Must override .bg-[#090c14]');
    assert.ok(css.includes('.bg-\\[\\#0d1424\\]'), 'Must override .bg-[#0d1424]');
    assert.ok(css.includes('.bg-\\[\\#101522\\]'), 'Must override .bg-[#101522]');
  });

  it('telemetryStreamer should process incoming peer THEME_SYNC payloads for pop-out windows', async () => {
    const { telemetryStreamer } = await import('../services/telemetryStreamer');
    let receivedTheme = '';
    const unsub = telemetryStreamer.subscribe((payload) => {
      if (payload.type === 'THEME_SYNC') {
        receivedTheme = payload.theme || '';
      }
    });

    telemetryStreamer.handleIncomingPayload({
      type: 'THEME_SYNC',
      theme: 'light',
      senderId: 'peer_window_detached',
      timestamp: Date.now(),
    });

    assert.strictEqual(receivedTheme, 'light', 'Must receive and handle THEME_SYNC payload from peer window');
    unsub();
  });
});

describe('Light Mode Component Stencils & Schematics Rendering', () => {
  function createMockCtx() {
    const fills: string[] = [];
    const strokes: string[] = [];
    const texts: { text: string; fill: string }[] = [];
    const state: Record<string, any> = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
    };
    const ctx = new Proxy(state, {
      get(target, prop) {
        if (prop in target) return target[prop as string];
        return (...args: any[]) => {
          if (prop === 'fill') {
            fills.push(target.fillStyle);
          } else if (prop === 'stroke') {
            strokes.push(target.strokeStyle);
          } else if (prop === 'fillText') {
            texts.push({ text: String(args[0]), fill: target.fillStyle });
          } else if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return {
              addColorStop: (_pos: number, col: string) => {
                fills.push(col);
              },
            };
          } else if (prop === 'measureText') {
            return { width: 32 };
          }
        };
      },
      set(target, prop, value) {
        target[prop as string] = value;
        return true;
      },
    });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, state, fills, strokes, texts };
  }

  it('drawFaultBlock should use clean light background (#ffffff) and dark borders in light mode', async () => {
    const { SymbolRenderer } = await import('../components/canvas/symbols');
    const mock = createMockCtx();
    const light = THEME_PALETTES.LIGHT;

    const state: any = { isFaultActive: false };

    SymbolRenderer.drawFaultBlock(mock.ctx, light, state);

    // Verify it did not use dark charcoal body
    assert.ok(!mock.fills.includes('rgba(30, 37, 51, 0.9)'), 'Must not use dark body in light mode');
    // Verify it used light body (#ffffff)
    assert.ok(mock.fills.includes('#ffffff'), 'Must use white body in light mode');
    // Verify dark crisp border (#0f172a or colors.componentStroke)
    assert.ok(mock.strokes.includes('#0f172a') || mock.strokes.includes(light.componentStroke));
  });

  it('drawDataLabelTransmitter and drawDataLabelReceiver should use clean light styling in light mode', async () => {
    const { SymbolRenderer } = await import('../components/canvas/symbols');
    const light = THEME_PALETTES.LIGHT;

    // Transmitter test
    const mockTx = createMockCtx();
    const compTx: any = {
      id: 'tx_1',
      name: 'Tx_Fault_Trigger',
      type: 'data_label_transmitter',
      x: 100,
      y: 100,
      params: { labelName: 'FAULT_TRIG' },
    };
    SymbolRenderer.drawDataLabelTransmitter(mockTx.ctx, compTx, light);
    // In dark mode Tx was #064e3b; in light mode it should be #ecfdf5
    assert.ok(!mockTx.fills.includes('#064e3b'), 'Must not use dark green #064e3b in light mode');
    assert.ok(mockTx.fills.includes('#ecfdf5'), 'Must use light emerald #ecfdf5 in light mode');

    // Receiver test
    const mockRx = createMockCtx();
    const compRx: any = {
      id: 'rx_1',
      name: 'Rx_Breaker_Trip',
      type: 'data_label_receiver',
      x: 100,
      y: 100,
      params: { labelName: 'TRIP' },
    };
    SymbolRenderer.drawDataLabelReceiver(mockRx.ctx, compRx, light);
    // In dark mode Rx was #0c4a6e; in light mode it should be #f0f9ff
    assert.ok(!mockRx.fills.includes('#0c4a6e'), 'Must not use dark navy #0c4a6e in light mode');
    assert.ok(mockRx.fills.includes('#f0f9ff'), 'Must use light sky #f0f9ff in light mode');
  });

  it('drawOnSchematicMeterBadge should use clean white pill badge in light mode', async () => {
    const { SchematicMetersRenderer } = await import('../components/canvas/SchematicMeters');
    const mock = createMockCtx();
    const light = THEME_PALETTES.LIGHT;

    const meter: any = {
      id: 'meter_1',
      type: 'voltmeter',
      name: 'V_BusA',
      params: { signalName: 'BusA_V' },
    };

    SchematicMetersRenderer.drawOnSchematicMeterBadge(mock.ctx, meter, light, { inputVal: 120 });

    // Must NOT be dark pitch pill rgba(7, 10, 16, 0.9)
    assert.ok(!mock.fills.includes('rgba(7, 10, 16, 0.9)'), 'Must not use pitch black pill in light mode');
    // Must be light pill
    assert.ok(mock.fills.includes('rgba(255, 255, 255, 0.96)'), 'Must use clean white pill in light mode');
  });

  it('RuntimeSwitchesRenderer should render light chassis for push buttons and switches', async () => {
    const { RuntimeSwitchesRenderer } = await import('../components/canvas/RuntimeSwitches');
    const light = THEME_PALETTES.LIGHT;

    const mockBtn = createMockCtx();
    const compBtn: any = {
      id: 'btn_1',
      name: 'PushBtn_1',
      type: 'RUNTIME_BUTTON',
      params: { label: 'TRIP', isPressed: false },
    };
    RuntimeSwitchesRenderer.drawButton(mockBtn.ctx, compBtn, light);
    // Button chassis gradient in light mode should add #ffffff and #f1f5f9
    assert.ok(mockBtn.fills.includes('#ffffff'), 'Push button chassis should use light gradient');
    assert.ok(mockBtn.fills.includes('#f1f5f9'), 'Push button chassis should use light gradient');

    const mockSw = createMockCtx();
    const compSw: any = {
      id: 'sw_1',
      name: 'Switch_1',
      type: 'RUNTIME_SWITCH',
      params: { label: 'SW1', switchState: false },
    };
    RuntimeSwitchesRenderer.drawSwitch(mockSw.ctx, compSw, light);
    // Switch chassis gradient in light mode should add #ffffff and #f1f5f9
    assert.ok(mockSw.fills.includes('#ffffff'), 'Switch chassis should use light gradient');
    assert.ok(mockSw.fills.includes('#f1f5f9'), 'Switch chassis should use light gradient');
  });
});

describe('Backstage Drawer & Modals Light Mode Verification', () => {
  it('should include all required modal and drawer dark hex classes in index.css [data-theme="light"]', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Drawer and Modal surfaces
    assert.ok(css.includes('.bg-\\[\\#121724\\]'), 'Must override .bg-[#121724] (FileBackstage drawer left nav)');
    assert.ok(css.includes('.bg-\\[\\#141b2b\\]'), 'Must override .bg-[#141b2b] (FileBackstage stat cards)');
    assert.ok(css.includes('.bg-\\[\\#171f30\\]'), 'Must override .bg-[#171f30] (Case studies modal header)');
    assert.ok(css.includes('.bg-\\[\\#141b29\\]'), 'Must override .bg-[#141b29] (Case studies modal toolbar)');
    assert.ok(css.includes('.bg-\\[\\#161d2a\\]'), 'Must override .bg-[#161d2a] (Case studies metric chips)');
    assert.ok(css.includes('.border-\\[\\#242f44\\]'), 'Must override .border-[#242f44] (Case studies borders)');
    assert.ok(css.includes('.border-\\[\\#23314d\\]'), 'Must override .border-[#23314d] (Backstage card borders)');
    assert.ok(css.includes('.border-\\[\\#202c42\\]'), 'Must override .border-[#202c42] (Backstage nav borders)');
    assert.ok(css.includes('.from-\\[\\#181f2f\\]'), 'Must override flagship gradient from');
    assert.ok(css.includes('.to-\\[\\#0f1420\\]'), 'Must override flagship gradient to');
  });
});


