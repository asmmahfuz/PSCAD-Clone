/**
 * PSCAD CLONE - Canvas-Embedded Runtime Interactive Controls
 * Phase 19 - Step 19.1: On-Schematic Slider & Rotary Knob Elements
 */

import type { CircuitComponentData } from '../../types';

export interface RuntimeControlParams {
  label?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  unitLabel?: string;
  targetCompId?: string;
  targetParam?: string;
  targetSignal?: string;
  accentColor?: string;
  showTicks?: boolean;
}

export interface SliderGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  track: { x: number; y: number; w: number; h: number };
  thumb: { x: number; y: number; r: number };
  value: number;
  min: number;
  max: number;
  step: number;
  norm: number;
  unit: string;
  label: string;
  accentColor: string;
}

export interface DialGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  currentAngle: number;
  notch: { x: number; y: number };
  value: number;
  min: number;
  max: number;
  step: number;
  norm: number;
  unit: string;
  label: string;
  accentColor: string;
}

export class RuntimeControlsManager {
  public static readonly SLIDER_WIDTH = 104;
  public static readonly SLIDER_HEIGHT = 54;
  public static readonly SLIDER_TRACK_W = 76;
  public static readonly SLIDER_TRACK_H = 6;

  public static readonly DIAL_RADIUS = 34;
  public static readonly DIAL_START_DEG = 135;
  public static readonly DIAL_SWEEP_DEG = 270;

  /**
   * Extract and normalize slider parameters with standard defaults
   */
  static getSliderParams(comp: CircuitComponentData) {
    const min = comp.params?.minValue !== undefined ? Number(comp.params.minValue) : 0;
    const max = comp.params?.maxValue !== undefined ? Number(comp.params.maxValue) : 100;
    const step = comp.params?.step !== undefined ? Number(comp.params.step) : (max - min <= 10 ? 0.1 : 1);
    const defVal = comp.params?.defaultValue !== undefined ? Number(comp.params.defaultValue) : min;
    const val = comp.params?.value !== undefined ? Number(comp.params.value) : defVal;
    const unit = comp.params?.unitLabel || comp.params?.unit || '';
    const label = comp.params?.label || comp.name || 'Slider';
    const accentColor = comp.params?.accentColor || '#00e5ff';

    const range = max - min || 1;
    const norm = Math.max(0, Math.min(1, (val - min) / range));

    return { min, max, step, val, unit, label, accentColor, norm, range };
  }

  /**
   * Extract and normalize dial parameters with standard defaults
   */
  static getDialParams(comp: CircuitComponentData) {
    const min = comp.params?.minValue !== undefined ? Number(comp.params.minValue) : 0;
    const max = comp.params?.maxValue !== undefined ? Number(comp.params.maxValue) : 100;
    const step = comp.params?.step !== undefined ? Number(comp.params.step) : (max - min <= 10 ? 0.1 : 1);
    const defVal = comp.params?.defaultValue !== undefined ? Number(comp.params.defaultValue) : min;
    const val = comp.params?.value !== undefined ? Number(comp.params.value) : defVal;
    const unit = comp.params?.unitLabel || comp.params?.unit || '';
    const label = comp.params?.label || comp.name || 'Dial';
    const accentColor = comp.params?.accentColor || '#00e5ff';

    const range = max - min || 1;
    const norm = Math.max(0, Math.min(1, (val - min) / range));

    return { min, max, step, val, unit, label, accentColor, norm, range };
  }

  /**
   * Format numerical value with engineering units and proper precision based on step
   */
  static formatControlValue(val: number, unit = '', step = 1): string {
    if (isNaN(val)) return `0.0 ${unit}`.trim();

    let decimals = 0;
    if (step > 0) {
      const stepStr = step.toString();
      if (stepStr.includes('.')) {
        decimals = Math.min(4, stepStr.split('.')[1].length);
      }
    }

    if (decimals === 0 && Math.abs(val % 1) > 1e-4) {
      decimals = 1;
    }

    const formattedNum = val.toFixed(decimals);
    return unit ? `${formattedNum} ${unit}` : formattedNum;
  }

  /**
   * Get world geometry for a Slider component
   */
  static getSliderGeometry(comp: CircuitComponentData): SliderGeometry {
    const { min, max, step, val, unit, label, accentColor, norm } = this.getSliderParams(comp);

    const w = RuntimeControlsManager.SLIDER_WIDTH;
    const h = RuntimeControlsManager.SLIDER_HEIGHT;
    const trackW = RuntimeControlsManager.SLIDER_TRACK_W;
    const trackH = RuntimeControlsManager.SLIDER_TRACK_H;

    const bounds = {
      x: comp.x - w / 2,
      y: comp.y - h / 2,
      w,
      h,
    };

    const track = {
      x: comp.x - trackW / 2,
      y: comp.y + 6,
      w: trackW,
      h: trackH,
    };

    const thumb = {
      x: track.x + norm * track.w,
      y: track.y + track.h / 2,
      r: 8,
    };

    return {
      bounds,
      track,
      thumb,
      value: val,
      min,
      max,
      step,
      norm,
      unit,
      label,
      accentColor,
    };
  }

  /**
   * Get world geometry for a Dial component
   */
  static getDialGeometry(comp: CircuitComponentData): DialGeometry {
    const { min, max, step, val, unit, label, accentColor, norm } = this.getDialParams(comp);

    const r = RuntimeControlsManager.DIAL_RADIUS;
    const startAngle = (RuntimeControlsManager.DIAL_START_DEG * Math.PI) / 180;
    const sweepAngle = (RuntimeControlsManager.DIAL_SWEEP_DEG * Math.PI) / 180;
    const endAngle = startAngle + sweepAngle;
    const currentAngle = startAngle + norm * sweepAngle;

    const bounds = {
      x: comp.x - r - 4,
      y: comp.y - r - 4,
      w: (r + 4) * 2,
      h: (r + 4) * 2,
    };

    const notch = {
      x: comp.x + 16 * Math.cos(currentAngle),
      y: comp.y + 16 * Math.sin(currentAngle),
    };

    return {
      bounds,
      center: { x: comp.x, y: comp.y },
      radius: r,
      startAngle,
      endAngle,
      sweepAngle,
      currentAngle,
      notch,
      value: val,
      min,
      max,
      step,
      norm,
      unit,
      label,
      accentColor,
    };
  }

  /**
   * Hit test slider component bounds
   */
  static hitTestSlider(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const geom = this.getSliderGeometry(comp);
    return (
      wx >= geom.bounds.x &&
      wx <= geom.bounds.x + geom.bounds.w &&
      wy >= geom.bounds.y &&
      wy <= geom.bounds.y + geom.bounds.h
    );
  }

  /**
   * Hit test dial component bounds
   */
  static hitTestDial(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const geom = this.getDialGeometry(comp);
    const dist = Math.hypot(wx - geom.center.x, wy - geom.center.y);
    return dist <= geom.radius + 6;
  }

  /**
   * Quantize raw value according to step and clamp within [min, max]
   */
  static quantizeValue(rawVal: number, min: number, max: number, step = 0): number {
    let clamped = Math.max(min, Math.min(max, rawVal));
    if (step > 0) {
      const stepsCount = Math.round((clamped - min) / step);
      clamped = min + stepsCount * step;
      // Re-clamp to fix float rounding overshoots
      clamped = Math.max(min, Math.min(max, clamped));
      // Fix float representation e.g. 14.000000000000002
      const stepStr = step.toString();
      if (stepStr.includes('.')) {
        const decimals = stepStr.split('.')[1].length;
        clamped = parseFloat(clamped.toFixed(decimals));
      } else {
        clamped = Math.round(clamped);
      }
    }
    return clamped;
  }

  /**
   * Calculate new slider value from world mouse coordinates
   */
  static computeSliderValue(comp: CircuitComponentData, wx: number, _wy?: number): number {
    const { min, max, step } = this.getSliderParams(comp);
    const trackW = RuntimeControlsManager.SLIDER_TRACK_W;
    const trackLeft = comp.x - trackW / 2;

    const norm = Math.max(0, Math.min(1, (wx - trackLeft) / trackW));
    const rawVal = min + norm * (max - min);

    return this.quantizeValue(rawVal, min, max, step);
  }

  /**
   * Calculate new dial value from world mouse coordinates
   */
  static computeDialValue(comp: CircuitComponentData, wx: number, wy: number): number {
    const { min, max, step } = this.getDialParams(comp);
    const dx = wx - comp.x;
    const dy = wy - comp.y;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;

    const startA = (RuntimeControlsManager.DIAL_START_DEG * Math.PI) / 180;
    const sweepA = (RuntimeControlsManager.DIAL_SWEEP_DEG * Math.PI) / 180;

    let relA = angle - startA;
    if (relA < 0) relA += 2 * Math.PI;

    // If angle is outside sweep arc (dead zone in lower sector), snap to nearest extreme
    if (relA > sweepA) {
      const deadZoneSpan = 2 * Math.PI - sweepA;
      const midpoint = sweepA + deadZoneSpan / 2;
      relA = relA >= midpoint ? 0 : sweepA;
    }

    const norm = Math.max(0, Math.min(1, relA / sweepA));
    const rawVal = min + norm * (max - min);

    return this.quantizeValue(rawVal, min, max, step);
  }

  /**
   * Create updated component clone with updated value
   */
  static setValue(comp: CircuitComponentData, newValue: number): CircuitComponentData {
    const { min, max, step } = this.getSliderParams(comp);
    const quantized = this.quantizeValue(newValue, min, max, step);
    return {
      ...comp,
      params: {
        ...comp.params,
        value: quantized,
      },
    };
  }

  /**
   * Create updated component clone with updated range and step
   */
  static setMinMax(
    comp: CircuitComponentData,
    min: number,
    max: number,
    step?: number
  ): CircuitComponentData {
    const currentVal = comp.params?.value !== undefined ? comp.params.value : min;
    const updatedStep = step !== undefined ? step : comp.params?.step;
    const clampedVal = this.quantizeValue(currentVal, min, max, updatedStep);

    return {
      ...comp,
      params: {
        ...comp.params,
        minValue: min,
        maxValue: max,
        step: updatedStep,
        value: clampedVal,
      },
    };
  }
}

export class RuntimeControlsRenderer {
  /**
   * Draw high-aesthetic schematic slider element
   */
  static drawSlider(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    _colors: any,
    state: { isSelected?: boolean; isHovered?: boolean; isDragging?: boolean } = {}
  ): void {
    const geom = RuntimeControlsManager.getSliderGeometry(comp);
    const isSelected = state.isSelected || false;
    const isDragging = state.isDragging || false;
    const isHovered = state.isHovered || false;

    ctx.save();

    const w = RuntimeControlsManager.SLIDER_WIDTH;
    const h = RuntimeControlsManager.SLIDER_HEIGHT;
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. Outer Beveled Metallic Chassis
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 6);

    const bgGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bgGrad.addColorStop(0, '#161c28');
    bgGrad.addColorStop(1, '#0e121a');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Chassis Border / Selection Glow
    ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#475569' : '#263147';
    ctx.lineWidth = isSelected ? 2 : 1.5;
    if (isSelected) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Header Bar: Title Label & Digital LCD Value Badge
    ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.label, -halfW + 8, -halfH + 11);

    // Digital LCD Pill Badge
    const valText = RuntimeControlsManager.formatControlValue(geom.value, geom.unit, geom.step);
    ctx.font = 'bold 9.5px "Fira Code", monospace';
    const textWidth = ctx.measureText(valText).width;
    const pillW = Math.max(40, textWidth + 10);
    const pillH = 14;
    const pillX = halfW - pillW - 6;
    const pillY = -halfH + 4;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 3);
    ctx.fillStyle = '#070a0f';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = geom.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(valText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);

    // 3. Slider Track Groove
    const trackW = RuntimeControlsManager.SLIDER_TRACK_W;
    const trackH = RuntimeControlsManager.SLIDER_TRACK_H;
    const trackX = -trackW / 2;
    const trackY = 4;

    // Inset track channel
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, 3);
    ctx.fillStyle = '#06090e';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Active illuminated track fill
    const thumbX = trackX + geom.norm * trackW;
    const fillWidth = Math.max(0, thumbX - trackX);

    if (fillWidth > 0) {
      ctx.beginPath();
      ctx.roundRect(trackX, trackY, fillWidth, trackH, 3);
      const trackGrad = ctx.createLinearGradient(trackX, 0, thumbX, 0);
      trackGrad.addColorStop(0, '#0284c7');
      trackGrad.addColorStop(1, geom.accentColor);
      ctx.fillStyle = trackGrad;
      ctx.fill();
    }

    // 4. Calibration Tick Marks & Min/Max Labels
    const tickY = trackY + trackH + 3;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const tx = trackX + (i / 4) * trackW;
      ctx.beginPath();
      ctx.moveTo(tx, tickY);
      ctx.lineTo(tx, tickY + (i % 2 === 0 ? 3 : 2));
      ctx.stroke();
    }

    // Min & Max Micro Text
    ctx.font = '8px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${geom.min}`, trackX, tickY + 3);

    ctx.textAlign = 'right';
    ctx.fillText(`${geom.max}`, trackX + trackW, tickY + 3);

    // 5. Tactile Draggable Thumb Handle
    ctx.save();
    const thumbRadius = 7.5;
    const thumbCenterY = trackY + trackH / 2;

    ctx.beginPath();
    ctx.arc(thumbX, thumbCenterY, thumbRadius, 0, 2 * Math.PI);

    const thumbGrad = ctx.createRadialGradient(
      thumbX - 2,
      thumbCenterY - 2,
      1,
      thumbX,
      thumbCenterY,
      thumbRadius
    );
    thumbGrad.addColorStop(0, '#ffffff');
    thumbGrad.addColorStop(0.7, '#cbd5e1');
    thumbGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = thumbGrad;

    if (isDragging || isHovered) {
      ctx.shadowColor = geom.accentColor;
      ctx.shadowBlur = isDragging ? 10 : 6;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
    }
    ctx.fill();

    ctx.strokeStyle = isDragging ? '#ffffff' : geom.accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tactile vertical grip ridges on the thumb
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (const offset of [-2.5, 0, 2.5]) {
      ctx.beginPath();
      ctx.moveTo(thumbX + offset, thumbCenterY - 3);
      ctx.lineTo(thumbX + offset, thumbCenterY + 3);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Control Domain Output Terminal Pin Indicator
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.rect(halfW - 3, -3, 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw high-aesthetic schematic rotary dial / knob element
   */
  static drawDial(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    _colors: any,
    state: { isSelected?: boolean; isHovered?: boolean; isDragging?: boolean } = {}
  ): void {
    const geom = RuntimeControlsManager.getDialGeometry(comp);
    const isSelected = state.isSelected || false;
    const isDragging = state.isDragging || false;
    const isHovered = state.isHovered || false;

    ctx.save();

    const r = geom.radius;

    // 1. Outer Metallic Bezel & Housing
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);

    const housingGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
    housingGrad.addColorStop(0, '#161c28');
    housingGrad.addColorStop(1, '#0b0f16');
    ctx.fillStyle = housingGrad;
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#475569' : '#263147';
    ctx.lineWidth = isSelected ? 2 : 1.5;
    if (isSelected) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Circumferential Calibration Tick Marks
    const tickR = r - 4;
    const numTicks = 9; // 0%, 12.5%, 25%, ... 100%
    for (let i = 0; i < numTicks; i++) {
      const tickAngle = geom.startAngle + (i / (numTicks - 1)) * geom.sweepAngle;
      const isMajor = i === 0 || i === (numTicks - 1) / 2 || i === numTicks - 1;
      const innerR = isMajor ? tickR - 5 : tickR - 3;

      ctx.beginPath();
      ctx.moveTo(innerR * Math.cos(tickAngle), innerR * Math.sin(tickAngle));
      ctx.lineTo(tickR * Math.cos(tickAngle), tickR * Math.sin(tickAngle));
      ctx.strokeStyle = isMajor ? '#64748b' : '#334155';
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.stroke();
    }

    // 3. Outer Background Arc & Illuminated Active Progress Arc
    const arcRadius = 24;

    // Inactive background track
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, geom.startAngle, geom.endAngle);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Active progress arc with glow
    if (geom.norm > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, geom.startAngle, geom.currentAngle);
      ctx.strokeStyle = geom.accentColor;
      ctx.lineWidth = 3.5;
      if (isDragging || isHovered) {
        ctx.shadowColor = geom.accentColor;
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Machined Aluminum / Dark Metal Rotary Knob Core
    const knobRadius = 17;
    ctx.beginPath();
    ctx.arc(0, 0, knobRadius, 0, 2 * Math.PI);

    const knobGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, knobRadius);
    knobGrad.addColorStop(0, '#334155');
    knobGrad.addColorStop(0.7, '#1e293b');
    knobGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = knobGrad;
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 5. Directional Illuminated Pointer Notch
    const notchRadius = 11;
    const notchX = notchRadius * Math.cos(geom.currentAngle);
    const notchY = notchRadius * Math.sin(geom.currentAngle);

    ctx.save();
    ctx.beginPath();
    ctx.arc(notchX, notchY, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = geom.accentColor;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.strokeStyle = geom.accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 6. Central LCD Value Readout Badge
    const valText = RuntimeControlsManager.formatControlValue(geom.value, geom.unit, geom.step);
    ctx.font = 'bold 8px "Fira Code", monospace';
    ctx.fillStyle = isDragging || isHovered ? '#ffffff' : '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(valText, 0, 0);

    // 7. Top Label Text
    ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(geom.label, 0, -r - 2);

    // 8. Control Domain Output Terminal Pin Indicator
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.rect(r - 2, -3, 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
