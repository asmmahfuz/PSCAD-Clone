/**
 * PSCAD CLONE - Electrical Schematic Symbol Drawing Functions (TypeScript)
 */

import type { CircuitComponentData } from '../../types';
import { COMPONENT_TYPES } from '../../constants';
import { customComponentRegistry } from '../../engine/customComponents';
import { hierarchyManager } from '../../engine/hierarchy';
import { GraphFrameRenderer } from './GraphFrame';
import { RuntimeControlsRenderer } from './RuntimeControls';
import { RuntimeSwitchesRenderer } from './RuntimeSwitches';
import { SchematicMetersRenderer } from './SchematicMeters';

// Polyfill roundRect for universal browser compatibility
if (typeof CanvasRenderingContext2D !== 'undefined' && !(CanvasRenderingContext2D.prototype as any).roundRect) {
  (CanvasRenderingContext2D.prototype as any).roundRect = function (x: number, y: number, w: number, h: number) {
    this.rect(x, y, w, h);
    return this;
  };
}

export class SymbolRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    state: any = {}
  ): void {
    ctx.save();
    ctx.translate(comp.x, comp.y);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    if (comp.flippedH) ctx.scale(-1, 1);
    if (comp.flippedV) ctx.scale(1, -1);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = colors.componentStroke;
    ctx.fillStyle = colors.componentBody;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    try {
      switch (comp.type) {
        case COMPONENT_TYPES.RESISTOR:
          SymbolRenderer.drawResistor(ctx);
          break;
        case COMPONENT_TYPES.INDUCTOR:
          SymbolRenderer.drawInductor(ctx);
          break;
        case COMPONENT_TYPES.CAPACITOR:
          SymbolRenderer.drawCapacitor(ctx);
          break;
        case COMPONENT_TYPES.SERIES_RLC:
          SymbolRenderer.drawSeriesRLC(ctx);
          break;
        case COMPONENT_TYPES.GROUND:
          SymbolRenderer.drawGround(ctx);
          break;
        case COMPONENT_TYPES.AC_SOURCE_1PH:
          SymbolRenderer.drawACSource1Ph(ctx);
          break;
        case COMPONENT_TYPES.AC_SOURCE_3PH:
          SymbolRenderer.drawACSource3Ph(ctx, colors);
          break;
        case COMPONENT_TYPES.DC_SOURCE:
          SymbolRenderer.drawDCSource(ctx, colors);
          break;
        case COMPONENT_TYPES.BREAKER_1PH:
        case COMPONENT_TYPES.TIMED_SWITCH:
          SymbolRenderer.drawBreaker1Ph(ctx, comp, state);
          break;
        case COMPONENT_TYPES.BREAKER_3PH:
          SymbolRenderer.drawBreaker3Ph(ctx, comp, state);
          break;
        case COMPONENT_TYPES.FAULT_BLOCK:
          SymbolRenderer.drawFaultBlock(ctx, state);
          break;
        case COMPONENT_TYPES.TRANSFORMER_1PH:
        case COMPONENT_TYPES.JILES_ATHERTON_CORE:
        case COMPONENT_TYPES.STRAY_CAP_TRANSFORMER:
          SymbolRenderer.drawTransformer1Ph(ctx);
          break;
        case COMPONENT_TYPES.TRANSFORMER_3PH:
        case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH:
        case COMPONENT_TYPES.OLTC_TRANSFORMER_3PH:
        case COMPONENT_TYPES.ZIGZAG_TRANSFORMER:
        case COMPONENT_TYPES.PHASE_SHIFTER_PST:
          SymbolRenderer.drawUmecTransformer(ctx, comp, colors, state);
          break;

        case COMPONENT_TYPES.PI_LINE:
          SymbolRenderer.drawPiLine(ctx);
          break;
        case COMPONENT_TYPES.BERGERON_LINE_1PH:
          SymbolRenderer.drawBergeron1Ph(ctx, colors);
          break;
        case COMPONENT_TYPES.BERGERON_LINE_3PH:
          SymbolRenderer.drawBergeron3Ph(ctx, colors);
          break;
        case COMPONENT_TYPES.FD_PHASE_LINE:
          SymbolRenderer.drawFDPhaseLine(ctx, colors);
          break;
        case COMPONENT_TYPES.VOLTMETER:
        case COMPONENT_TYPES.SIGNAL_PROBE:
          SymbolRenderer.drawVoltmeter(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.GRAPH_FRAME:
          GraphFrameRenderer.render(ctx, comp, colors, state.signalsMap || new Map(), state.isSelected || false);
          break;
        case COMPONENT_TYPES.AMMETER:
          SymbolRenderer.drawAmmeter(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.MULTIMETER:
          SymbolRenderer.drawMultimeter(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.SYNC_GENERATOR:
          SymbolRenderer.drawSyncGenerator(ctx, colors);
          break;
        case COMPONENT_TYPES.SYNC_MACHINE_DQ:
          SymbolRenderer.drawSyncMachineDq(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.MULTI_MASS_SHAFT:
          SymbolRenderer.drawMultiMassShaft(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.INDUCTION_MACHINE:
          SymbolRenderer.drawInductionMachine(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.DFIG_GENERATOR:
          SymbolRenderer.drawDfigGenerator(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.PMSG_GENERATOR:
          SymbolRenderer.drawPmsgGenerator(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.SURGE_ARRESTER:
          SymbolRenderer.drawSurgeArrester(ctx, colors, state);
          break;
        case COMPONENT_TYPES.IDEAL_SWITCH:
          SymbolRenderer.drawIdealSwitch(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.DIODE:
          SymbolRenderer.drawDiode(ctx, colors, state);
          break;
        case COMPONENT_TYPES.THYRISTOR:
          SymbolRenderer.drawThyristor(ctx, colors, state);
          break;
        case COMPONENT_TYPES.IGBT_DIODE:
          SymbolRenderer.drawIgbtDiode(ctx, colors, state);
          break;
        case COMPONENT_TYPES.MMC_CONVERTER_3PH:
          SymbolRenderer.drawMmcConverter(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
        case COMPONENT_TYPES.LCC_BRIDGE_12PULSE:
          SymbolRenderer.drawLccBridge(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.STATCOM:
          SymbolRenderer.drawStatcom(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.SVC:
          SymbolRenderer.drawSvc(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.BUSBAR_1PH:
        case COMPONENT_TYPES.BUSBAR_3PH:
          SymbolRenderer.drawBusbar(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.POLYPHASE_BUS_3PH:
          SymbolRenderer.drawPolyphaseBus(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.PHASE_SPLITTER_3PH:
          SymbolRenderer.drawPhaseSplitter(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.PHASE_MERGER_3PH:
          SymbolRenderer.drawPhaseMerger(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.DATA_LABEL_TRANSMITTER:
          SymbolRenderer.drawDataLabelTransmitter(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.DATA_LABEL_RECEIVER:
          SymbolRenderer.drawDataLabelReceiver(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.CSMF_CONSTANT:
        case COMPONENT_TYPES.CSMF_GAIN:
        case COMPONENT_TYPES.CSMF_INTEGRATOR:
        case COMPONENT_TYPES.CSMF_PID:
        case COMPONENT_TYPES.CSMF_SUM:
        case COMPONENT_TYPES.CSMF_MULTIPLIER:
        case COMPONENT_TYPES.CSMF_DIVIDER:
        case COMPONENT_TYPES.CSMF_MATH_FUNC:
        case COMPONENT_TYPES.CSMF_MIN_MAX:
        case COMPONENT_TYPES.CSMF_LOGIC_GATE:
        case COMPONENT_TYPES.CSMF_EDGE_DETECTOR:
        case COMPONENT_TYPES.CSMF_FLIP_FLOP:
        case COMPONENT_TYPES.CSMF_COMPARATOR:
        case COMPONENT_TYPES.CSMF_LIMITER:
        case COMPONENT_TYPES.CSMF_RATE_LIMITER:
        case COMPONENT_TYPES.CSMF_DEADBAND:
        case COMPONENT_TYPES.CSMF_HYSTERESIS:
        case COMPONENT_TYPES.CSMF_BACKLASH:
        case COMPONENT_TYPES.CSMF_LOOKUP_1D:
        case COMPONENT_TYPES.CSMF_LOOKUP_2D:
        case COMPONENT_TYPES.CSMF_CLARKE:
        case COMPONENT_TYPES.CSMF_PARK:
        case COMPONENT_TYPES.CSMF_PLL:
        case COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER:
        case COMPONENT_TYPES.CSMF_SPWM:
        case COMPONENT_TYPES.CSMF_SVPWM:
        case COMPONENT_TYPES.CSMF_FIRING_GEN_6PULSE:
          SymbolRenderer.drawControlBlock(ctx, comp, colors);
          break;
        // Phase 6: Submodules & Hierarchical Ports
        case COMPONENT_TYPES.SUBMODULE:
          SymbolRenderer.drawSubmodule(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.SUBMODULE_PORT_IN:
        case COMPONENT_TYPES.SUBMODULE_PORT_OUT:
        case COMPONENT_TYPES.SUBMODULE_PORT_ELECTRICAL:
        case COMPONENT_TYPES.SUBMODULE_PORT_POLYPHASE:
          SymbolRenderer.drawSubmodulePort(ctx, comp, colors);
          break;
        // Phase 6: Interactive Runtime Controls
        case COMPONENT_TYPES.RUNTIME_SLIDER:
          SymbolRenderer.drawRuntimeSlider(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RUNTIME_DIAL:
          SymbolRenderer.drawRuntimeDial(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RUNTIME_BUTTON:
          SymbolRenderer.drawRuntimeButton(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RUNTIME_SWITCH:
          SymbolRenderer.drawRuntimeSwitch(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RUNTIME_GAUGE:
          SymbolRenderer.drawRuntimeGauge(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY:
          SymbolRenderer.drawRuntimeDigitalDisplay(ctx, comp, colors, state);
          break;
        // Phase 11: Protection Relays & ANSI Suite
        case COMPONENT_TYPES.RELAY_OVERCURRENT_50_51:
          SymbolRenderer.drawOvercurrentRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RELAY_DISTANCE_21:
          SymbolRenderer.drawDistanceRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RELAY_DIFFERENTIAL_87:
          SymbolRenderer.drawDifferentialRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RELAY_FREQ_ROCOF_81:
          SymbolRenderer.drawFrequencyRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RELAY_LOSS_OF_FIELD_40:
          SymbolRenderer.drawLossOfFieldRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.RELAY_OUT_OF_STEP_78:
          SymbolRenderer.drawOutOfStepRelay(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.CURRENT_TRANSFORMER_CT:
          SymbolRenderer.drawCurrentTransformer(ctx, comp, colors, state);
          break;
        case COMPONENT_TYPES.VOLTAGE_TRANSFORMER_VT:
          SymbolRenderer.drawVoltageTransformer(ctx, comp, colors, state);
          break;
        // Phase 12: IEEE Control Systems & Dynamic Regulators
        case COMPONENT_TYPES.CSMF_TRANSFER_FUNCTION_S:
        case COMPONENT_TYPES.CSMF_FILTER_Z:
          SymbolRenderer.drawTransferFunction(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.GOV_IEEEG1:
        case COMPONENT_TYPES.GOV_HYGOV:
        case COMPONENT_TYPES.GOV_GAST:
        case COMPONENT_TYPES.GOV_DEGOV:
          SymbolRenderer.drawGovernor(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.AVR_AC1A:
        case COMPONENT_TYPES.AVR_DC1A:
        case COMPONENT_TYPES.AVR_ST1A:
          SymbolRenderer.drawExciter(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.PSS_PSS1A:
        case COMPONENT_TYPES.PSS_PSS2B:
          SymbolRenderer.drawStabilizer(ctx, comp, colors);
          break;
        case COMPONENT_TYPES.WIND_TURBINE_AERO:
          SymbolRenderer.drawWindTurbineAero(ctx, comp, colors);
          break;
        default:
          SymbolRenderer.drawGenericBox(ctx, comp, colors);
      }
    } catch (_err) {
      SymbolRenderer.drawGenericBox(ctx, comp, colors);
    }

    ctx.restore();

    // Render component label non-rotated
    SymbolRenderer.drawLabels(ctx, comp, colors);
  }

  static drawResistor(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-12, 10);
    ctx.lineTo(-4, -10);
    ctx.lineTo(4, 10);
    ctx.lineTo(12, -10);
    ctx.lineTo(20, 10);
    ctx.lineTo(24, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
  }

  static drawInductor(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-24, 0);
    for (let i = 0; i < 4; i++) {
      const cx = -18 + i * 12;
      ctx.arc(cx, 0, 6, Math.PI, 0, false);
    }
    ctx.lineTo(40, 0);
    ctx.stroke();
  }

  static drawCapacitor(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(-6, -18);
    ctx.lineTo(-6, 18);
    ctx.moveTo(6, -18);
    ctx.lineTo(6, 18);
    ctx.moveTo(6, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
  }

  static drawSeriesRLC(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(-45, 0);
    ctx.lineTo(-40, -8);
    ctx.lineTo(-32, 8);
    ctx.lineTo(-24, -8);
    ctx.lineTo(-16, 0);
    ctx.arc(-10, 0, 5, Math.PI, 0, false);
    ctx.arc(0, 0, 5, Math.PI, 0, false);
    ctx.lineTo(16, 0);
    ctx.moveTo(22, -14);
    ctx.lineTo(22, 14);
    ctx.moveTo(30, -14);
    ctx.lineTo(30, 14);
    ctx.moveTo(30, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();
  }

  static drawGround(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 0);
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(-10, 6);
    ctx.lineTo(10, 6);
    ctx.moveTo(-4, 12);
    ctx.lineTo(4, 12);
    ctx.stroke();
  }

  static drawACSource1Ph(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.bezierCurveTo(-6, -14, -6, -14, 0, 0);
    ctx.bezierCurveTo(6, 14, 6, 14, 12, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -40);
    ctx.moveTo(0, 22);
    ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawACSource3Ph(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3~', 0, 0);

    ctx.beginPath();
    ctx.moveTo(-18, -22);
    ctx.lineTo(-18, -40);
    ctx.moveTo(0, -28);
    ctx.lineTo(0, -40);
    ctx.moveTo(18, -22);
    ctx.lineTo(18, -40);
    ctx.moveTo(0, 28);
    ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawDCSource(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(10, -5);
    ctx.moveTo(-10, 5);
    ctx.lineTo(-4, 5);
    ctx.moveTo(4, 5);
    ctx.lineTo(10, 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -40);
    ctx.moveTo(0, 22);
    ctx.lineTo(0, 40);
    ctx.stroke();

    ctx.font = '10px sans-serif';
    ctx.fillStyle = colors.componentStroke;
    ctx.fillText('+', 8, -14);
    ctx.fillText('-', 8, 18);
  }

  static drawBreaker1Ph(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, state: any): void {
    const isClosed = state.isClosed !== undefined ? state.isClosed : (comp.params?.initClosed ?? true);

    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-15, 0);
    ctx.arc(-15, 0, 3, 0, 2 * Math.PI);
    ctx.moveTo(15, 0);
    ctx.arc(15, 0, 3, 0, 2 * Math.PI);
    ctx.lineTo(40, 0);
    ctx.stroke();

    ctx.beginPath();
    if (isClosed) {
      ctx.strokeStyle = '#00e676';
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
    } else {
      ctx.strokeStyle = '#ff5252';
      ctx.moveTo(-15, 0);
      ctx.lineTo(10, -18);
    }
    ctx.stroke();

    ctx.font = '9px monospace';
    ctx.fillStyle = isClosed ? '#00e676' : '#ff5252';
    ctx.textAlign = 'center';
    ctx.fillText(isClosed ? 'CLOSED' : 'OPEN', 0, 16);
  }

  static drawBreaker3Ph(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, state: any): void {
    const isClosed = state.isClosed !== undefined ? state.isClosed : (comp.params?.initClosed ?? true);

    ctx.beginPath();
    ctx.roundRect(-30, -35, 60, 70, 6);
    ctx.fill();
    ctx.stroke();

    const yOffsets = [-20, 0, 20];
    ctx.strokeStyle = isClosed ? '#00e676' : '#ff5252';
    for (const y of yOffsets) {
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.lineTo(-20, y);
      if (isClosed) {
        ctx.lineTo(20, y);
      } else {
        ctx.lineTo(10, y - 8);
      }
      ctx.moveTo(20, y);
      ctx.lineTo(40, y);
      ctx.stroke();
    }

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isClosed ? '#00e676' : '#ff5252';
    ctx.textAlign = 'center';
    ctx.fillText(isClosed ? '3P CLOSED' : '3P OPEN', 0, 30);
  }

  static drawFaultBlock(ctx: CanvasRenderingContext2D, state: any): void {
    const isFault = state.isFaultActive || false;
    ctx.beginPath();
    ctx.roundRect(-25, -25, 50, 50, 4);
    ctx.fillStyle = isFault ? 'rgba(255, 82, 82, 0.25)' : 'rgba(30, 37, 51, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isFault ? '#ff5252' : '#61afef';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(2, -16);
    ctx.lineTo(-8, 0);
    ctx.lineTo(4, 0);
    ctx.lineTo(-2, 16);
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#61afef';
    ctx.beginPath();
    ctx.moveTo(-25, -15);
    ctx.lineTo(-40, -15);
    ctx.moveTo(-25, 0);
    ctx.lineTo(-40, 0);
    ctx.moveTo(-25, 15);
    ctx.lineTo(-40, 15);
    ctx.moveTo(25, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
  }

  static drawTransformer1Ph(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(-12, 0, 18, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 0, 18, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(-12, -35);
    ctx.moveTo(-12, 18);
    ctx.lineTo(-12, 35);
    ctx.moveTo(12, -18);
    ctx.lineTo(12, -35);
    ctx.moveTo(12, 18);
    ctx.lineTo(12, 35);
    ctx.stroke();
  }

  static drawTransformer3Ph(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -28, 70, 56, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Y - Δ', 0, 0);

    ctx.beginPath();
    ctx.moveTo(-35, -18);
    ctx.lineTo(-50, -18);
    ctx.moveTo(-35, 0);
    ctx.lineTo(-50, 0);
    ctx.moveTo(-35, 18);
    ctx.lineTo(-50, 18);

    ctx.moveTo(35, -18);
    ctx.lineTo(50, -18);
    ctx.moveTo(35, 0);
    ctx.lineTo(50, 0);
    ctx.moveTo(35, 18);
    ctx.lineTo(50, 18);
    ctx.stroke();
  }

  static drawPiLine(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(-45, 0);
    ctx.lineTo(45, 0);
    ctx.moveTo(-15, 0);
    ctx.lineTo(-5, -20);
    ctx.lineTo(5, -20);
    ctx.lineTo(15, 0);
    ctx.moveTo(-5, -20);
    ctx.lineTo(0, -26);
    ctx.lineTo(5, -20);
    ctx.stroke();
  }

  static drawBergeron1Ph(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -20, 70, 40, 4);
    ctx.fill();
    ctx.stroke();

    // Traveling wave pulse inside
    ctx.beginPath();
    ctx.moveTo(-25, 4);
    ctx.bezierCurveTo(-15, -16, -5, -16, 0, 4);
    ctx.bezierCurveTo(5, 20, 15, 20, 25, 4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = colors.componentText || '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText('Zc, τ (1-Ph)', 0, -8);

    // Terminal leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-45, 0);
    ctx.moveTo(35, 0);
    ctx.lineTo(45, 0);
    ctx.stroke();
  }

  static drawBergeron3Ph(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -30, 70, 60, 6);
    ctx.fill();
    ctx.stroke();

    // Tower symbol & modal indicator
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.moveTo(-15, -12);
    ctx.lineTo(15, -12);
    ctx.moveTo(-18, 4);
    ctx.lineTo(18, 4);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('3-Ph MODAL', 0, -23);

    // 3 pairs of leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    // Sending A, B, C
    ctx.moveTo(-35, -20);
    ctx.lineTo(-45, -20);
    ctx.moveTo(-35, 0);
    ctx.lineTo(-45, 0);
    ctx.moveTo(-35, 20);
    ctx.lineTo(-45, 20);
    // Receiving A, B, C
    ctx.moveTo(35, -20);
    ctx.lineTo(45, -20);
    ctx.moveTo(35, 0);
    ctx.lineTo(45, 0);
    ctx.moveTo(35, 20);
    ctx.lineTo(45, 20);
    ctx.stroke();
  }

  static drawFDPhaseLine(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -22, 70, 44, 4);
    ctx.fill();
    ctx.stroke();

    // Frequency response wave symbol
    ctx.beginPath();
    ctx.moveTo(-24, 8);
    ctx.quadraticCurveTo(-12, -18, 0, 0);
    ctx.quadraticCurveTo(12, 18, 24, -8);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 8.5px monospace';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'center';
    ctx.fillText('FD-Phase', 0, -10);

    // Leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-45, 0);
    ctx.moveTo(35, 0);
    ctx.lineTo(45, 0);
    ctx.stroke();
  }

  static drawVoltmeter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 0, 0);

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -35);
    ctx.moveTo(0, 18);
    ctx.lineTo(0, 35);
    ctx.stroke();

    // Floating On-Schematic Live Telemetry Badge
    SchematicMetersRenderer.drawOnSchematicMeterBadge(ctx, comp, colors, state);
  }

  static drawAmmeter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, 0);

    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-18, 0);
    ctx.moveTo(18, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();

    // Floating On-Schematic Live Telemetry Badge
    SchematicMetersRenderer.drawOnSchematicMeterBadge(ctx, comp, colors, state);
  }

  static drawMultimeter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    ctx.beginPath();
    ctx.roundRect(-22, -18, 44, 36, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PQV', 0, 0);

    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-22, 0);
    ctx.moveTo(22, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();

    // Floating On-Schematic Live Telemetry Badge
    SchematicMetersRenderer.drawOnSchematicMeterBadge(ctx, comp, colors, state);
  }

  static drawSyncGenerator(ctx: CanvasRenderingContext2D, colors: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = colors.componentStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SM (G)', 0, 0);

    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -40);
    ctx.moveTo(0, 26);
    ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawUmecTransformer(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any, state: any): void {
    ctx.beginPath();
    ctx.roundRect(-38, -32, 76, 64, 6);
    ctx.fill();
    ctx.stroke();

    // 3 magnetic core limbs
    ctx.fillStyle = state.inrushDetected ? '#ef4444' : '#64748b';
    ctx.fillRect(-22, -22, 6, 44);
    ctx.fillRect(-3, -22, 6, 44);
    ctx.fillRect(16, -22, 6, 44);

    // Top and bottom yokes
    ctx.fillRect(-26, -26, 52, 6);
    ctx.fillRect(-26, 20, 52, 6);

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = state.inrushDetected ? '#fca5a5' : '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('UMEC CORE', 0, 0);

    // 4 primary leads (left) and 4 secondary leads (right)
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    [-20, 0, 20, 35].forEach(y => {
      ctx.moveTo(-38, y);
      ctx.lineTo(-45, y);
      ctx.moveTo(38, y);
      ctx.lineTo(45, y);
    });
    ctx.stroke();
  }

  static drawSyncMachineDq(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any, state: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Rotor angle indicator
    const angle = state.theta_e || 0.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16 * Math.cos(angle), 16 * Math.sin(angle));
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'center';
    ctx.fillText('SM d-q-0', 0, -8);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('AVR+GOV', 0, 10);

    // 3 phase terminals top, neutral bottom
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(-18, -40);
    ctx.moveTo(0, -28); ctx.lineTo(0, -40);
    ctx.moveTo(18, -22); ctx.lineTo(18, -40);
    ctx.moveTo(0, 28); ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawMultiMassShaft(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, _colors: any, _state: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -20, 70, 40, 4);
    ctx.fill();
    ctx.stroke();

    // 4 inertia masses (HP, IP, LP, Gen)
    const massWidth = 10;
    const xOffsets = [-25, -10, 5, 20];
    const labels = ['HP', 'IP', 'LP', 'G'];

    xOffsets.forEach((x, i) => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - massWidth / 2, -14, massWidth, 28);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(x - massWidth / 2, -14, massWidth, 28);

      ctx.font = 'bold 7px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, 2);
    });

    // Shaft spring couplings
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-35, 0); ctx.lineTo(35, 0);
    ctx.stroke();
  }

  static drawInductionMachine(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any, state: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Inner rotor circle with squirrel cage bars
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, 2 * Math.PI);
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    ctx.font = 'bold 9.5px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'center';
    ctx.fillText('IM (DOL)', 0, -4);
    ctx.font = '7.5px monospace';
    ctx.fillStyle = '#38bdf8';
    const slip = state.slip !== undefined ? (state.slip * 100).toFixed(1) : '100';
    ctx.fillText(`s=${slip}%`, 0, 8);

    // Stator leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(-18, -40);
    ctx.moveTo(0, -28); ctx.lineTo(0, -40);
    ctx.moveTo(18, -22); ctx.lineTo(18, -40);
    ctx.moveTo(0, 28); ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawDfigGenerator(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any, state: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Wind turbine 3 blades
    ctx.save();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -16);
      ctx.stroke();
      ctx.rotate((2 * Math.PI) / 3);
    }
    ctx.restore();

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = state.crowbarActive ? '#ef4444' : '#10b981';
    ctx.textAlign = 'center';
    ctx.fillText(state.crowbarActive ? 'CROWBAR' : 'DFIG-FOC', 0, 10);

    // Stator leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(-18, -40);
    ctx.moveTo(0, -28); ctx.lineTo(0, -40);
    ctx.moveTo(18, -22); ctx.lineTo(18, -40);
    ctx.moveTo(0, 28); ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawPmsgGenerator(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any, _state: any): void {
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // PM Magnets (N / S)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-12, -8, 12, 16);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, -8, 12, 16);

    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('N', -6, 3);
    ctx.fillText('S', 6, 3);

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('PMSG-BTB', 0, 18);

    // Stator leads
    ctx.strokeStyle = colors.componentStroke;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-18, -22); ctx.lineTo(-18, -40);
    ctx.moveTo(0, -28); ctx.lineTo(0, -40);
    ctx.moveTo(18, -22); ctx.lineTo(18, -40);
    ctx.moveTo(0, 28); ctx.lineTo(0, 40);
    ctx.stroke();
  }

  static drawSurgeArrester(ctx: CanvasRenderingContext2D, colors?: any, state?: any): void {
    ctx.beginPath();
    ctx.roundRect(-14, -22, 28, 44, 3);
    ctx.fillStyle = state?.isConducting ? '#ef444433' : (colors?.componentBody || '#1e2533');
    ctx.fill();
    ctx.strokeStyle = state?.isConducting ? '#ef4444' : (colors?.componentStroke || '#38bdf8');
    ctx.stroke();

    // Lightning surge arrow
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.lineTo(18, -14);
    ctx.lineTo(10, -14);
    ctx.strokeStyle = state?.isConducting ? '#ef4444' : '#eab308';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText('MOV', 0, 6);

    // Terminals
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -35);
    ctx.moveTo(0, 22);
    ctx.lineTo(0, 35);
    ctx.stroke();
  }

  static drawBusbar(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    const is3Ph = comp.type === COMPONENT_TYPES.BUSBAR_3PH;
    const len = comp.params?.length || 120;

    ctx.fillStyle = is3Ph ? '#40c4ff' : colors.wireNormal;
    ctx.fillRect(-len / 2, -4, len, 8);
    ctx.strokeStyle = colors.componentStroke;
    ctx.strokeRect(-len / 2, -4, len, 8);
  }

  static drawPolyphaseBus(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    const len = comp.params?.length || 140;
    // Draw thick 3-Phase Polyphase Bus
    ctx.save();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-len / 2, -5, len, 10);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(-len / 2, -5, len, 10);

    // Multi-phase 3-slash marker "/// 3"
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(-4, -4);
    ctx.moveTo(-5, -14);
    ctx.lineTo(1, -4);
    ctx.moveTo(0, -14);
    ctx.lineTo(6, -4);
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'left';
    ctx.fillText('3Ph', 10, -7);
    ctx.restore();
  }

  static drawPhaseSplitter(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any): void {
    ctx.save();
    // Splitter Body
    ctx.beginPath();
    ctx.roundRect(-30, -28, 60, 56, 4);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 3Ph bundled input lead
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-40, 0);
    ctx.stroke();

    // Output phase leads (A, B, C, N)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.wireNormal;
    ctx.beginPath();
    ctx.moveTo(30, -20); ctx.lineTo(40, -20); // A
    ctx.moveTo(30, 0); ctx.lineTo(40, 0);   // B
    ctx.moveTo(30, 20); ctx.lineTo(40, 20);  // C
    ctx.stroke();

    // Labels
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'left';
    ctx.fillText('3Ph', -24, 4);

    ctx.font = '9px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'right';
    ctx.fillText('A', 24, -17);
    ctx.fillText('B', 24, 3);
    ctx.fillText('C', 24, 23);
    ctx.restore();
  }

  static drawPhaseMerger(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, colors: any): void {
    ctx.save();
    // Merger Body
    ctx.beginPath();
    ctx.roundRect(-30, -28, 60, 56, 4);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Input phase leads (A, B, C)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.wireNormal;
    ctx.beginPath();
    ctx.moveTo(-30, -20); ctx.lineTo(-40, -20); // A
    ctx.moveTo(-30, 0); ctx.lineTo(-40, 0);   // B
    ctx.moveTo(-30, 20); ctx.lineTo(-40, 20);  // C
    ctx.stroke();

    // 3Ph bundled output lead
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();

    // Labels
    ctx.font = '9px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'left';
    ctx.fillText('A', -24, -17);
    ctx.fillText('B', -24, 3);
    ctx.fillText('C', -24, 23);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'right';
    ctx.fillText('3Ph', 24, 4);
    ctx.restore();
  }

  static drawDataLabelTransmitter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    const sigName = comp.params?.signalName || comp.name || 'Sig';
    ctx.save();

    // Arrow tag pointing right: < SignalName >
    ctx.beginPath();
    ctx.moveTo(-25, -14);
    ctx.lineTo(15, -14);
    ctx.lineTo(28, 0);
    ctx.lineTo(15, 14);
    ctx.lineTo(-25, 14);
    ctx.closePath();

    ctx.fillStyle = '#064e3b';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Input lead on left
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(-35, 0);
    ctx.stroke();

    // Label Text
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sigName.length > 8 ? sigName.substring(0, 7) + '…' : sigName, -2, 0);
    ctx.restore();
  }

  static drawDataLabelReceiver(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    const sigName = comp.params?.signalName || comp.name || 'Sig';
    ctx.save();

    // Boxed banner with chevron indent on left: [ SignalName ]
    ctx.beginPath();
    ctx.moveTo(-28, -14);
    ctx.lineTo(25, -14);
    ctx.lineTo(25, 14);
    ctx.lineTo(-28, 14);
    ctx.lineTo(-18, 0);
    ctx.closePath();

    ctx.fillStyle = '#0c4a6e';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Output lead on right
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();

    // Label Text
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#bae6fd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sigName.length > 8 ? sigName.substring(0, 7) + '…' : sigName, 2, 0);
    ctx.restore();
  }

  static drawControlBlock(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-30, -24, 60, 48, 5);
    ctx.fillStyle = '#13231f';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    let label = 'CSMF';
    let sub = '';

    switch (comp.type) {
      case COMPONENT_TYPES.CSMF_CONSTANT:
        label = `${comp.params?.voltage !== undefined ? comp.params.voltage : (comp.params?.gain ?? 1.0)}`;
        sub = 'Const';
        break;
      case COMPONENT_TYPES.CSMF_GAIN:
        label = `×${comp.params?.gain !== undefined ? comp.params.gain : 1}`;
        sub = 'Gain';
        break;
      case COMPONENT_TYPES.CSMF_SUM:
        label = 'Σ';
        sub = 'Sum';
        break;
      case COMPONENT_TYPES.CSMF_MULTIPLIER:
        label = '✕';
        sub = 'Mult';
        break;
      case COMPONENT_TYPES.CSMF_DIVIDER:
        label = '÷';
        sub = 'Div';
        break;
      case COMPONENT_TYPES.CSMF_MATH_FUNC:
        label = `${comp.params?.mathOp || 'sin'}(u)`;
        break;
      case COMPONENT_TYPES.CSMF_MIN_MAX:
        label = `${comp.params?.minMaxMode || 'min'}`;
        sub = 'Selector';
        break;
      case COMPONENT_TYPES.CSMF_INTEGRATOR:
        label = '∫ 1/s';
        sub = 'Integ';
        break;
      case COMPONENT_TYPES.CSMF_PID:
        label = 'PID';
        sub = `Kp=${comp.params?.pidKp || 1}`;
        break;
      case COMPONENT_TYPES.CSMF_LOGIC_GATE:
        label = `${comp.params?.logicOp || 'AND'}`;
        sub = 'Logic';
        break;
      case COMPONENT_TYPES.CSMF_EDGE_DETECTOR:
        label = comp.params?.edgeType === 'falling' ? '⮡' : '⮠';
        sub = 'Edge';
        break;
      case COMPONENT_TYPES.CSMF_FLIP_FLOP:
        label = `${comp.params?.flipFlopType || 'RS'}-FF`;
        break;
      case COMPONENT_TYPES.CSMF_COMPARATOR:
        label = comp.params?.compOp === 'EQ' ? '==' : comp.params?.compOp === 'LT' ? '<' : '>';
        sub = 'Comp';
        break;
      case COMPONENT_TYPES.CSMF_LIMITER:
        label = '[-/+]';
        sub = 'Limit';
        break;
      case COMPONENT_TYPES.CSMF_RATE_LIMITER:
        label = 'dy/dt';
        sub = 'Rate';
        break;
      case COMPONENT_TYPES.CSMF_DEADBAND:
        label = '|_/|';
        sub = 'Dead';
        break;
      case COMPONENT_TYPES.CSMF_HYSTERESIS:
        label = '⮂';
        sub = 'Hyst';
        break;
      case COMPONENT_TYPES.CSMF_BACKLASH:
        label = '⮀';
        sub = 'Backl';
        break;
      case COMPONENT_TYPES.CSMF_LOOKUP_1D:
        label = 'LUT 1D';
        break;
      case COMPONENT_TYPES.CSMF_LOOKUP_2D:
        label = 'LUT 2D';
        break;
      case COMPONENT_TYPES.CSMF_CLARKE:
        label = 'abc ➔ αβ0';
        sub = 'Clarke';
        break;
      case COMPONENT_TYPES.CSMF_PARK:
        label = 'αβ ➔ dq';
        sub = 'Park';
        break;
      case COMPONENT_TYPES.CSMF_PLL:
        label = 'PLL';
        sub = `${comp.params?.freq || 60} Hz`;
        break;
      case COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER:
        label = 'V1,V2,V0';
        sub = 'Sequence';
        break;
      case COMPONENT_TYPES.CSMF_SPWM:
        label = 'SPWM';
        sub = `${(comp.params?.carrierFreq || 2000) / 1000}kHz`;
        break;
      case COMPONENT_TYPES.CSMF_SVPWM:
        label = 'SVPWM';
        sub = 'SpaceVec';
        break;
      case COMPONENT_TYPES.CSMF_FIRING_GEN_6PULSE:
        label = '6-Pulse';
        sub = `α=${comp.params?.firingAngleDeg || 30}°`;
        break;
    }

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, sub ? -4 : 0);

    if (sub) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(sub, 0, 10);
    }

    // Lead pins
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(-40, 0);
    ctx.moveTo(30, 0); ctx.lineTo(40, 0);
    ctx.stroke();
    ctx.restore();
  }

  static drawIdealSwitch(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any): void {
    const isClosed = state.isClosed !== undefined ? state.isClosed : comp.params?.initClosed ?? false;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();

    // Contact terminals
    ctx.beginPath();
    ctx.arc(-16, 0, 3, 0, 2 * Math.PI);
    ctx.arc(16, 0, 3, 0, 2 * Math.PI);
    ctx.stroke();

    // Switch Blade
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isClosed ? '#10b981' : colors.componentStroke;
    if (isClosed) {
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
    } else {
      ctx.moveTo(-16, 0);
      ctx.lineTo(12, -18);
    }
    ctx.stroke();
  }

  static drawDiode(ctx: CanvasRenderingContext2D, colors: any, state: any): void {
    const isConducting = state.mode === 'ON' || state.mode === 'REVERSE_RECOVERY';
    // Leads
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-14, 0);
    ctx.moveTo(14, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();

    // Triangle (Anode -> Cathode)
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fillStyle = isConducting ? 'rgba(16, 185, 129, 0.3)' : colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // Cathode Bar
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isConducting ? '#10b981' : colors.componentStroke;
    ctx.moveTo(14, -14);
    ctx.lineTo(14, 14);
    ctx.stroke();
  }

  static drawThyristor(ctx: CanvasRenderingContext2D, colors: any, state: any): void {
    const isConducting = state.mode === 'CONDUCTING';
    // Anode / Cathode leads
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-14, 0);
    ctx.moveTo(14, 0);
    ctx.lineTo(35, 0);
    // Gate lead
    ctx.moveTo(0, -25);
    ctx.lineTo(6, -14);
    ctx.stroke();

    // Triangle
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fillStyle = isConducting ? 'rgba(56, 189, 248, 0.3)' : colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // Cathode Bar
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isConducting ? '#38bdf8' : colors.componentStroke;
    ctx.moveTo(14, -14);
    ctx.lineTo(14, 14);
    ctx.stroke();
  }

  static drawIgbtDiode(ctx: CanvasRenderingContext2D, colors: any, state: any): void {
    const isConducting = state.mode === 'IGBT_ON' || state.mode === 'DIODE_FWD';
    // Collector / Emitter leads
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(0, -18);
    ctx.moveTo(0, 18);
    ctx.lineTo(0, 35);
    // Gate lead
    ctx.moveTo(-35, 0);
    ctx.lineTo(-16, 0);
    ctx.stroke();

    // Insulated Gate Plate
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isConducting ? '#10b981' : colors.componentStroke;
    ctx.moveTo(-16, -16);
    ctx.lineTo(-16, 16);
    ctx.moveTo(-11, -16);
    ctx.lineTo(-11, 16);
    ctx.stroke();

    // Collector & Emitter angled branches
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.moveTo(-11, -10);
    ctx.lineTo(0, -18);
    ctx.moveTo(-11, 10);
    ctx.lineTo(0, 18);
    // Emitter arrow
    ctx.moveTo(-4, 14);
    ctx.lineTo(0, 18);
    ctx.lineTo(-2, 10);
    ctx.stroke();

    // Antiparallel Freewheeling Diode
    ctx.save();
    ctx.translate(18, 0);
    ctx.beginPath();
    ctx.moveTo(-10, 16);
    ctx.lineTo(0, 16);
    ctx.lineTo(0, -16);
    ctx.lineTo(-10, -16);
    ctx.stroke();

    // FWD Triangle pointing Up (E to C)
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(6, 8);
    ctx.lineTo(0, -8);
    ctx.closePath();
    ctx.fillStyle = state.mode === 'DIODE_FWD' ? '#10b981' : colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // FWD Cathode Bar
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.stroke();
    ctx.restore();
  }

  static drawMmcConverter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, _state: any): void {
    ctx.beginPath();
    ctx.roundRect(-45, -35, 90, 70, 6);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // Multilevel Staircase Graphic
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.moveTo(-20, 15);
    ctx.lineTo(-10, 15);
    ctx.lineTo(-10, 5);
    ctx.lineTo(0, 5);
    ctx.lineTo(0, -5);
    ctx.lineTo(10, -5);
    ctx.lineTo(10, -15);
    ctx.lineTo(20, -15);
    ctx.stroke();

    // Text Badge
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`MMC ${comp.params?.numSubmodules || 100} SM`, 0, 24);
  }

  static drawLccBridge(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, _state: any): void {
    const is12 = comp.type === COMPONENT_TYPES.LCC_BRIDGE_12PULSE;
    ctx.beginPath();
    ctx.roundRect(-45, -30, 90, 60, 6);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // Bridge Diamond
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.moveTo(0, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.stroke();

    // Thyristor Symbol Inside
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fillStyle = colors.componentStroke;
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText(is12 ? '12-PULSE' : '6-PULSE', 0, 24);
  }

  static drawStatcom(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, _state: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -35, 70, 70, 6);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.stroke();

    // VSC Inverter & Capacitor Graphic
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'center';
    ctx.fillText('STATCOM', 0, -8);

    ctx.font = '9px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.fillText(`±${comp.params?.Q_rating_MVAR || 100} MVAR`, 0, 12);
  }

  static drawSvc(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, _state: any): void {
    ctx.beginPath();
    ctx.roundRect(-35, -35, 70, 70, 6);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText('SVC (TCR/TSC)', 0, -8);

    ctx.font = '9px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.fillText(`+${comp.params?.Q_rating_MVAR || 200}/-100M`, 0, 12);
  }

  // --- PHASE 6: HIERARCHICAL SUBMODULES & PORTS ---

  static drawSubmodule(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    const childSheetId = comp.params?.childSheetId;
    const ports = childSheetId ? hierarchyManager.getSubmodulePorts(childSheetId) : [];

    // Outer double-border modular enclosure
    ctx.beginPath();
    ctx.roundRect(-45, -35, 90, 70, 6);
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.strokeStyle = '#388bfd';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Inner dashed boundary
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-40, -30, 80, 60, 4);
    ctx.strokeStyle = 'rgba(56, 139, 253, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.restore();

    // Module Icon & Name
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#58a6ff';
    ctx.textAlign = 'center';
    ctx.fillText('📦 SUBMODULE', 0, -10);

    const sheetName = childSheetId ? hierarchyManager.getSheet(childSheetId)?.name || 'Nested Sheet' : 'Empty';
    ctx.font = '10px monospace';
    ctx.fillStyle = colors.componentText;
    ctx.fillText(sheetName.length > 12 ? sheetName.substring(0, 10) + '..' : sheetName, 0, 8);

    // Drill down hint
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('[Double-Click]', 0, 22);

    // Port pin markers along edges
    ports.forEach((port, idx) => {
      const isLeft = idx % 2 === 0;
      const py = -20 + Math.floor(idx / 2) * 18;
      const px = isLeft ? -45 : 45;

      ctx.beginPath();
      if (port.domain === 'control') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(px - 3, py - 3, 6, 6);
      } else if (port.domain === 'polyphase') {
        ctx.fillStyle = '#00e5ff';
        ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillStyle = '#61afef';
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.font = '7px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = isLeft ? 'left' : 'right';
      ctx.fillText(port.portName.substring(0, 5), isLeft ? px + 6 : px - 6, py + 2);
    });
  }

  static drawSubmodulePort(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    const isOut = comp.type === COMPONENT_TYPES.SUBMODULE_PORT_OUT;
    const isPoly = comp.type === COMPONENT_TYPES.SUBMODULE_PORT_POLYPHASE;
    const isElec = comp.type === COMPONENT_TYPES.SUBMODULE_PORT_ELECTRICAL;

    const strokeColor = isPoly ? '#00e5ff' : isElec ? '#61afef' : '#10b981';

    ctx.beginPath();
    if (isOut) {
      // Pointing outward right
      ctx.moveTo(-25, -15);
      ctx.lineTo(10, -15);
      ctx.lineTo(25, 0);
      ctx.lineTo(10, 15);
      ctx.lineTo(-25, 15);
    } else {
      // Pointing inward right
      ctx.moveTo(-25, -15);
      ctx.lineTo(10, -15);
      ctx.lineTo(25, 0);
      ctx.lineTo(10, 15);
      ctx.lineTo(-25, 15);
    }
    ctx.closePath();
    ctx.fillStyle = colors.componentBody;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(comp.name || (isOut ? 'OUT' : 'IN'), 0, 0);
  }

  // --- PHASE 6: INTERACTIVE RUNTIME CANVAS CONTROLS ---

  static drawRuntimeSlider(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    RuntimeControlsRenderer.drawSlider(ctx, comp, colors, state);
  }

  static drawRuntimeDial(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    RuntimeControlsRenderer.drawDial(ctx, comp, colors, state);
  }

  static drawRuntimeButton(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    RuntimeSwitchesRenderer.drawButton(ctx, comp, colors, state);
  }

  static drawRuntimeSwitch(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    RuntimeSwitchesRenderer.drawSwitch(ctx, comp, colors, state);
  }

  static drawRuntimeGauge(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any, state: any = {}): void {
    SchematicMetersRenderer.drawAnalogGauge(ctx, comp, colors, state);
  }

  static drawRuntimeDigitalDisplay(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    state: any = {}
  ): void {
    SchematicMetersRenderer.drawDigitalDisplay(ctx, comp, colors, state);
  }

  // --- PHASE 6: CUSTOM USER WORKSHOP COMPONENT ---

  static drawCustomUserComponent(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    const defId = comp.params?.customDefId;
    const def = defId ? customComponentRegistry.getComponent(defId) : undefined;

    if (!def) {
      SymbolRenderer.drawGenericBox(ctx, comp, colors);
      return;
    }

    // Render defined geometric shapes
    def.shapes.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.stroke || '#61afef';
      ctx.fillStyle = s.fill || '#1e2533';
      ctx.lineWidth = s.strokeWidth || 2;

      if (s.type === 'rect' && s.x1 !== undefined && s.y1 !== undefined && s.x2 !== undefined && s.y2 !== undefined) {
        const x = Math.min(s.x1, s.x2);
        const y = Math.min(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1);
        const h = Math.abs(s.y2 - s.y1);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (s.type === 'circle' && s.cx !== undefined && s.cy !== undefined && s.r !== undefined) {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (s.type === 'line' && s.x1 !== undefined && s.y1 !== undefined && s.x2 !== undefined && s.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else if (s.type === 'text' && s.cx !== undefined && s.cy !== undefined) {
        ctx.fillStyle = s.fill || '#e6edf3';
        ctx.font = `bold ${s.fontSize || 10}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text || '', s.cx, s.cy);
      }
      ctx.restore();
    });
  }

  // ==========================================
  // Phase 11: Protection Relays & ANSI Suite
  // ==========================================

  static drawOvercurrentRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#162238';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner ANSI text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50/51', 0, -6);

    // Inverse curve graphic symbol
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(0, 14, 10, 4);
    ctx.stroke();

    // Trip indicator LED
    ctx.beginPath();
    ctx.arc(0, 15, 3, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawDistanceRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#1a1f3c';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#818cf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner ANSI text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('21', 0, -8);

    // Mho Circle / R-X icon
    ctx.beginPath();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.2;
    ctx.arc(0, 7, 7, 0, 2 * Math.PI);
    ctx.stroke();

    // Trip indicator LED
    ctx.beginPath();
    ctx.arc(0, 18, 3, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawDifferentialRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#292014';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('87T', 0, -8);

    // Delta / dual-slope icon
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.moveTo(-10, 12);
    ctx.lineTo(0, 4);
    ctx.lineTo(10, 12);
    ctx.stroke();

    // Status LED
    ctx.beginPath();
    ctx.arc(0, 18, 3, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawFrequencyRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#132820';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('81U/O', 0, -6);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('df/dt', 0, 7);

    // Status LED
    ctx.beginPath();
    ctx.arc(0, 16, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawLossOfFieldRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#281424';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#ec4899';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('40', 0, -6);

    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#f472b6';
    ctx.fillText('LOE', 0, 7);

    // Status LED
    ctx.beginPath();
    ctx.arc(0, 16, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawOutOfStepRelay(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any, state: any): void {
    const isTripped = state?.isTripped || comp.params?.isTripped;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#3b1219' : '#241738';
    ctx.fill();
    ctx.strokeStyle = isTripped ? '#ef4444' : '#a855f7';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('78', 0, -6);

    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('OST', 0, 7);

    // Status LED
    ctx.beginPath();
    ctx.arc(0, 16, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = isTripped ? '#ef4444' : '#22c55e';
    ctx.fill();
  }

  static drawCurrentTransformer(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, _colors: any, _state: any): void {
    // Primary conductor line through center
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.0;
    ctx.moveTo(-35, 0);
    ctx.lineTo(35, 0);
    ctx.stroke();

    // Toroidal Core Ring
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 20, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Secondary winding leads
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.moveTo(-10, 16);
    ctx.lineTo(-15, 30);
    ctx.moveTo(10, 16);
    ctx.lineTo(15, 30);
    ctx.stroke();

    // Polarity dot
    ctx.beginPath();
    ctx.arc(-20, -7, 2.5, 0, 2 * Math.PI);
    ctx.arc(-18, 22, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  static drawVoltageTransformer(ctx: CanvasRenderingContext2D, _comp: CircuitComponentData, _colors: any, _state: any): void {
    // Primary Winding
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.moveTo(0, -35);
    ctx.lineTo(0, -18);
    for (let i = 0; i < 3; i++) {
      ctx.arc(0, -12 + i * 12, 6, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.lineTo(0, 35);
    ctx.stroke();

    // Core Laminations
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.moveTo(10, -20);
    ctx.lineTo(10, 20);
    ctx.moveTo(14, -20);
    ctx.lineTo(14, 20);
    ctx.stroke();

    // Secondary Winding
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.moveTo(24, -12);
    ctx.arc(24, 0, 8, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(24, -12);
    ctx.lineTo(35, -12);
    ctx.moveTo(24, 12);
    ctx.lineTo(35, 12);
    ctx.stroke();
  }

  static drawTransferFunction(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    const isZ = comp.type === COMPONENT_TYPES.CSMF_FILTER_Z;
    ctx.beginPath();
    ctx.roundRect(-36, -26, 72, 52, 6);
    ctx.fillStyle = '#102a24';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#6ee7b7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isZ ? 'H(z)' : 'H(s)', 0, -8);

    // Polynomial ratio fraction divider
    ctx.beginPath();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.2;
    ctx.moveTo(-20, 2);
    ctx.lineTo(20, 2);
    ctx.stroke();

    ctx.font = '9px monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('N(s)', 0, -4);
    ctx.fillText('D(s)', 0, 12);

    // Input/Output pins
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-36, 0); ctx.lineTo(-46, 0);
    ctx.moveTo(36, 0); ctx.lineTo(46, 0);
    ctx.stroke();
  }

  static drawGovernor(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-40, -30, 80, 60, 6);
    ctx.fillStyle = '#1a2736';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    let title = 'GOV';
    let icon = '💨';
    let sub = 'Speed Droop';
    if (comp.type === COMPONENT_TYPES.GOV_IEEEG1) {
      title = 'IEEEG1';
      icon = '💨';
      sub = 'Steam';
    } else if (comp.type === COMPONENT_TYPES.GOV_HYGOV) {
      title = 'HYGOV';
      icon = '💧';
      sub = 'Hydro Tw';
    } else if (comp.type === COMPONENT_TYPES.GOV_GAST) {
      title = 'GAST';
      icon = '🔥';
      sub = 'Gas Turb';
    } else if (comp.type === COMPONENT_TYPES.GOV_DEGOV) {
      title = 'DEGOV';
      icon = '🚜';
      sub = 'Diesel';
    }

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icon, 0, -14);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(title, 0, -2);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(sub, 0, 12);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Rp=${(100 / (comp.params?.K || 20)).toFixed(0)}%`, 0, 22);

    // Leads
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.lineTo(-50, 0);
    ctx.moveTo(40, 0); ctx.lineTo(50, 0);
    ctx.stroke();
  }

  static drawExciter(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-40, -30, 80, 60, 6);
    ctx.fillStyle = '#2d1b36';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    let title = 'AVR';
    let sub = 'IEEE 421.5';
    if (comp.type === COMPONENT_TYPES.AVR_AC1A) {
      title = 'AC1A';
      sub = 'Alt-Rect';
    } else if (comp.type === COMPONENT_TYPES.AVR_DC1A) {
      title = 'DC1A';
      sub = 'DC Comm';
    } else if (comp.type === COMPONENT_TYPES.AVR_ST1A) {
      title = 'ST1A';
      sub = 'Static HIR';
    }

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#e9d5ff';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ${title}`, 0, -8);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#c084fc';
    ctx.fillText(sub, 0, 7);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`Ka=${comp.params?.KA || 200}`, 0, 20);

    // Leads
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.lineTo(-50, 0);
    ctx.moveTo(40, 0); ctx.lineTo(50, 0);
    ctx.stroke();
  }

  static drawStabilizer(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    const isDual = comp.type === COMPONENT_TYPES.PSS_PSS2B;
    ctx.beginPath();
    ctx.roundRect(-38, -28, 76, 56, 6);
    ctx.fillStyle = '#1c2e28';
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.textAlign = 'center';
    ctx.fillText(isDual ? 'PSS2B' : 'PSS1A', 0, -8);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(isDual ? 'Pa = Pm - Pe' : 'Δω Washout', 0, 6);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#bbf7d0';
    ctx.fillText('IEEE 421.5', 0, 18);

    // Leads
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0); ctx.lineTo(-48, 0);
    ctx.moveTo(38, 0); ctx.lineTo(48, 0);
    ctx.stroke();
  }

  static drawWindTurbineAero(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, _colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-42, -32, 84, 64, 6);
    ctx.fillStyle = '#16283a';
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 3-Blade Wind Rotor Icon
    ctx.save();
    ctx.translate(0, -6);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((2 * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(3, -14);
      ctx.lineTo(-3, -14);
      ctx.closePath();
      ctx.fillStyle = '#67e8f9';
      ctx.fill();
    }
    ctx.restore();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#a5f3fc';
    ctx.textAlign = 'center';
    ctx.fillText('WIND AERO', 0, 14);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#06b6d4';
    ctx.fillText(`Cp(λ,β) ${comp.params?.ratedPowerMW || 5}MW`, 0, 24);

    // Leads
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-42, 0); ctx.lineTo(-52, 0);
    ctx.moveTo(42, 0); ctx.lineTo(52, 0);
    ctx.stroke();
  }

  static drawGenericBox(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    ctx.beginPath();
    ctx.roundRect(-30, -20, 60, 40, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(comp.type.substring(0, 8), 0, 0);
  }

  static drawLabels(ctx: CanvasRenderingContext2D, comp: CircuitComponentData, colors: any): void {
    ctx.save();
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = colors.componentText;
    ctx.textAlign = 'center';

    if (comp.name) {
      ctx.fillText(comp.name, comp.x, comp.y - 34);
    }

    const p = comp.params;
    let valText = '';
    if (p.resistance !== undefined) valText = `${p.resistance} Ω`;
    else if (p.inductance !== undefined) valText = `${(p.inductance * 1000).toFixed(1)} mH`;
    else if (p.capacitance !== undefined) valText = `${(p.capacitance * 1e6).toFixed(1)} µF`;
    else if (p.voltage !== undefined) valText = `${(p.voltage / 1000).toFixed(1)} kV`;
    else if (p.lengthKm !== undefined) valText = `${p.lengthKm} km`;

    if (valText) {
      ctx.font = '10px monospace';
      ctx.fillStyle = colors.wireNormal;
      ctx.fillText(valText, comp.x, comp.y + 34);
    }
    ctx.restore();
  }
}
