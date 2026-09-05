/**
 * PSCAD CLONE - Canvas-Embedded Runtime Push Buttons & Toggle Switches
 * Phase 19 - Step 19.2: On-Schematic Push Buttons & Toggle Switches
 */

import type { CircuitComponentData } from '../../types';

export interface RuntimeButtonParams {
  label?: string;
  sublabel?: string;
  buttonState?: boolean;
  mode?: 'momentary' | 'toggle';
  color?: string;
  accentColor?: string;
  targetCompId?: string;
  targetParam?: string;
  targetSignal?: string;
  ledColor?: string;
}

export interface RuntimeSwitchParams {
  label?: string;
  switchState?: boolean;
  isClosed?: boolean;
  style?: 'rocker' | 'toggle_lever';
  onLabel?: string;
  offLabel?: string;
  onColor?: string;
  offColor?: string;
  accentColor?: string;
  targetCompId?: string;
  targetParam?: string;
  targetSignal?: string;
}

export interface ButtonGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  capRadius: number;
  bezelRadius: number;
  ledPos: { x: number; y: number; r: number };
  label: string;
  sublabel: string;
  isPressed: boolean;
  mode: 'momentary' | 'toggle';
  accentColor: string;
  ledColor: string;
}

export interface SwitchGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  rocker: { x: number; y: number; w: number; h: number };
  ledPos: { x: number; y: number; r: number };
  label: string;
  onLabel: string;
  offLabel: string;
  isOn: boolean;
  style: 'rocker' | 'toggle_lever';
  accentColor: string;
  ledColor: string;
}

export class RuntimeSwitchesManager {
  public static readonly BUTTON_WIDTH = 84;
  public static readonly BUTTON_HEIGHT = 56;
  public static readonly BUTTON_CAP_RADIUS = 15;
  public static readonly BUTTON_BEZEL_RADIUS = 19;

  public static readonly SWITCH_WIDTH = 84;
  public static readonly SWITCH_HEIGHT = 60;
  public static readonly SWITCH_ROCKER_W = 32;
  public static readonly SWITCH_ROCKER_H = 34;

  /**
   * Extract and normalize button parameters with standard defaults
   */
  static getButtonParams(comp: CircuitComponentData) {
    const label = comp.params?.label || comp.name || 'Push Button';
    const sublabel = comp.params?.sublabel || (comp.params?.mode === 'toggle' ? 'LATCH' : 'MOMENTARY');
    const isPressed = Boolean(comp.params?.buttonState);
    const mode = (comp.params?.mode === 'toggle' ? 'toggle' : 'momentary') as 'momentary' | 'toggle';
    const accentColor = comp.params?.accentColor || comp.params?.color || '#ef4444';
    const ledColor = comp.params?.ledColor || (isPressed ? '#22c55e' : '#64748b');
    const targetCompId = comp.params?.targetCompId;
    const targetParam = comp.params?.targetParam || 'isClosed';
    const targetSignal = comp.params?.targetSignal;

    return {
      label,
      sublabel,
      isPressed,
      mode,
      accentColor,
      ledColor,
      targetCompId,
      targetParam,
      targetSignal,
    };
  }

  /**
   * Extract and normalize switch parameters with standard defaults
   */
  static getSwitchParams(comp: CircuitComponentData) {
    const label = comp.params?.label || comp.name || 'Toggle Switch';
    const isOn = comp.params?.switchState !== undefined
      ? Boolean(comp.params.switchState)
      : comp.params?.isClosed !== undefined
      ? Boolean(comp.params.isClosed)
      : false;
    const style = (comp.params?.style === 'toggle_lever' ? 'toggle_lever' : 'rocker') as 'rocker' | 'toggle_lever';
    const onLabel = comp.params?.onLabel || 'CLOSED';
    const offLabel = comp.params?.offLabel || 'OPEN';
    const onColor = comp.params?.onColor || '#10b981';
    const offColor = comp.params?.offColor || '#ef4444';
    const accentColor = isOn ? onColor : offColor;
    const ledColor = isOn ? onColor : '#475569';
    const targetCompId = comp.params?.targetCompId;
    const targetParam = comp.params?.targetParam || 'isClosed';
    const targetSignal = comp.params?.targetSignal;

    return {
      label,
      isOn,
      style,
      onLabel,
      offLabel,
      onColor,
      offColor,
      accentColor,
      ledColor,
      targetCompId,
      targetParam,
      targetSignal,
    };
  }

  /**
   * Get world geometry for a Push Button component
   */
  static getButtonGeometry(comp: CircuitComponentData): ButtonGeometry {
    const params = this.getButtonParams(comp);
    const w = RuntimeSwitchesManager.BUTTON_WIDTH;
    const h = RuntimeSwitchesManager.BUTTON_HEIGHT;

    const bounds = {
      x: comp.x - w / 2,
      y: comp.y - h / 2,
      w,
      h,
    };

    const center = { x: comp.x, y: comp.y + 4 };
    const ledPos = { x: comp.x - w / 2 + 12, y: comp.y - h / 2 + 10, r: 3.5 };

    return {
      bounds,
      center,
      capRadius: RuntimeSwitchesManager.BUTTON_CAP_RADIUS,
      bezelRadius: RuntimeSwitchesManager.BUTTON_BEZEL_RADIUS,
      ledPos,
      label: params.label,
      sublabel: params.sublabel,
      isPressed: params.isPressed,
      mode: params.mode,
      accentColor: params.accentColor,
      ledColor: params.ledColor,
    };
  }

  /**
   * Get world geometry for a Toggle Switch component
   */
  static getSwitchGeometry(comp: CircuitComponentData): SwitchGeometry {
    const params = this.getSwitchParams(comp);
    const w = RuntimeSwitchesManager.SWITCH_WIDTH;
    const h = RuntimeSwitchesManager.SWITCH_HEIGHT;
    const rw = RuntimeSwitchesManager.SWITCH_ROCKER_W;
    const rh = RuntimeSwitchesManager.SWITCH_ROCKER_H;

    const bounds = {
      x: comp.x - w / 2,
      y: comp.y - h / 2,
      w,
      h,
    };

    const center = { x: comp.x, y: comp.y + 6 };
    const rocker = {
      x: center.x - rw / 2,
      y: center.y - rh / 2,
      w: rw,
      h: rh,
    };
    const ledPos = { x: comp.x + w / 2 - 12, y: comp.y - h / 2 + 10, r: 3.5 };

    return {
      bounds,
      center,
      rocker,
      ledPos,
      label: params.label,
      onLabel: params.onLabel,
      offLabel: params.offLabel,
      isOn: params.isOn,
      style: params.style,
      accentColor: params.accentColor,
      ledColor: params.ledColor,
    };
  }

  /**
   * Hit test button component bounds
   */
  static hitTestButton(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const geom = this.getButtonGeometry(comp);
    return (
      wx >= geom.bounds.x &&
      wx <= geom.bounds.x + geom.bounds.w &&
      wy >= geom.bounds.y &&
      wy <= geom.bounds.y + geom.bounds.h
    );
  }

  /**
   * Hit test switch component bounds
   */
  static hitTestSwitch(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const geom = this.getSwitchGeometry(comp);
    return (
      wx >= geom.bounds.x &&
      wx <= geom.bounds.x + geom.bounds.w &&
      wy >= geom.bounds.y &&
      wy <= geom.bounds.y + geom.bounds.h
    );
  }

  /**
   * Create updated component clone with updated button pressed state
   */
  static setButtonState(comp: CircuitComponentData, isPressed: boolean): CircuitComponentData {
    return {
      ...comp,
      params: {
        ...comp.params,
        buttonState: isPressed,
      },
    };
  }

  /**
   * Create updated component clone toggling switch state
   */
  static toggleSwitch(comp: CircuitComponentData): CircuitComponentData {
    const current = Boolean(comp.params?.switchState);
    return {
      ...comp,
      params: {
        ...comp.params,
        switchState: !current,
        isClosed: !current,
      },
    };
  }

  /**
   * Create updated component clone setting explicit switch state
   */
  static setSwitchState(comp: CircuitComponentData, isOn: boolean): CircuitComponentData {
    return {
      ...comp,
      params: {
        ...comp.params,
        switchState: isOn,
        isClosed: isOn,
      },
    };
  }
}

export class RuntimeSwitchesRenderer {
  /**
   * Draw ultra-realistic industrial push button element
   */
  static drawButton(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    _colors: any,
    state: { isSelected?: boolean; isHovered?: boolean; isDragging?: boolean } = {}
  ): void {
    const geom = RuntimeSwitchesManager.getButtonGeometry(comp);
    const isSelected = state.isSelected || false;
    const isHovered = state.isHovered || false;
    const isPressed = geom.isPressed;

    ctx.save();

    const w = RuntimeSwitchesManager.BUTTON_WIDTH;
    const h = RuntimeSwitchesManager.BUTTON_HEIGHT;
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. Outer Beveled Metallic Chassis
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 6);

    const bgGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bgGrad.addColorStop(0, '#19202e');
    bgGrad.addColorStop(1, '#0e131b');
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

    // 2. Header: Title Label & Status Pilot LED
    // LED Lamp (top-left)
    const ledX = -halfW + 12;
    const ledY = -halfH + 10;
    const ledR = 3.5;

    ctx.beginPath();
    ctx.arc(ledX, ledY, ledR, 0, 2 * Math.PI);
    ctx.fillStyle = isPressed ? geom.accentColor : '#1e293b';
    if (isPressed) {
      ctx.shadowColor = geom.accentColor;
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isPressed ? '#ffffff' : '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title Label
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.label, ledX + 7, ledY);

    // 3. 3D Tactile Push Button Assembly
    const buttonCenterY = 6;
    const bezelR = geom.bezelRadius;
    const capR = geom.capRadius;
    const pressOffset = isPressed ? 1.8 : 0;

    // Outer Metallic Bezel Ring
    ctx.beginPath();
    ctx.arc(0, buttonCenterY, bezelR, 0, 2 * Math.PI);
    const bezelGrad = ctx.createLinearGradient(0, buttonCenterY - bezelR, 0, buttonCenterY + bezelR);
    bezelGrad.addColorStop(0, '#475569');
    bezelGrad.addColorStop(0.5, '#1e293b');
    bezelGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bezelGrad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inset Shadow Well
    ctx.beginPath();
    ctx.arc(0, buttonCenterY, capR + 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#06090e';
    ctx.fill();

    // Tactile Button Cap (with 3D depression offset)
    const capY = buttonCenterY + pressOffset;
    ctx.beginPath();
    ctx.arc(0, capY, capR, 0, 2 * Math.PI);

    const capGrad = ctx.createRadialGradient(-3, capY - 3, 1, 0, capY, capR);
    if (isPressed) {
      capGrad.addColorStop(0, geom.accentColor);
      capGrad.addColorStop(0.8, '#991b1b');
      capGrad.addColorStop(1, '#450a0a');
    } else {
      capGrad.addColorStop(0, '#f87171');
      capGrad.addColorStop(0.5, geom.accentColor);
      capGrad.addColorStop(1, '#7f1d1d');
    }
    ctx.fillStyle = capGrad;

    if (!isPressed) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = isPressed ? '#fca5a5' : '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner Concentric Grip Ring
    ctx.beginPath();
    ctx.arc(0, capY, capR * 0.6, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Button Action Text
    ctx.font = 'bold 8.5px "Fira Code", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPressed ? 'ACTIVE' : 'PUSH', 0, capY + 0.5);

    // 4. Control Domain Output Terminal Pin Indicator
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
   * Draw ultra-realistic industrial toggle / rocker switch element
   */
  static drawSwitch(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    _colors: any,
    state: { isSelected?: boolean; isHovered?: boolean } = {}
  ): void {
    const geom = RuntimeSwitchesManager.getSwitchGeometry(comp);
    const isSelected = state.isSelected || false;
    const isHovered = state.isHovered || false;
    const isOn = geom.isOn;

    ctx.save();

    const w = RuntimeSwitchesManager.SWITCH_WIDTH;
    const h = RuntimeSwitchesManager.SWITCH_HEIGHT;
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. Outer Beveled Metallic Chassis
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 6);

    const bgGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bgGrad.addColorStop(0, '#19202e');
    bgGrad.addColorStop(1, '#0e131b');
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

    // 2. Header: Title Label & Illuminated Status Pilot LED
    // LED Lamp (top-right)
    const ledX = halfW - 12;
    const ledY = -halfH + 10;
    const ledR = 3.5;

    ctx.beginPath();
    ctx.arc(ledX, ledY, ledR, 0, 2 * Math.PI);
    ctx.fillStyle = isOn ? '#10b981' : '#ef4444';
    ctx.shadowColor = isOn ? '#10b981' : '#ef4444';
    ctx.shadowBlur = 7;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Title Label
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.label, -halfW + 8, ledY);

    // 3. 3D Rocker Switch Body
    const rw = RuntimeSwitchesManager.SWITCH_ROCKER_W;
    const rh = RuntimeSwitchesManager.SWITCH_ROCKER_H;
    const rx = -rw / 2;
    const ry = -rh / 2 + 8;

    // Inset Well
    ctx.beginPath();
    ctx.roundRect(rx - 2, ry - 2, rw + 4, rh + 4, 4);
    ctx.fillStyle = '#06090e';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3D Rocker Plate (split top and bottom)
    const halfRh = rh / 2;

    // Top half of rocker
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, halfRh, [3, 3, 0, 0]);
    const topGrad = ctx.createLinearGradient(0, ry, 0, ry + halfRh);
    if (isOn) {
      // Depressed top half when ON
      topGrad.addColorStop(0, '#1e293b');
      topGrad.addColorStop(1, '#0f172a');
    } else {
      // Raised upper deck when OFF
      topGrad.addColorStop(0, '#64748b');
      topGrad.addColorStop(0.3, '#475569');
      topGrad.addColorStop(1, '#334155');
    }
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Laser-etched "I" marking on top
    ctx.font = 'bold 8.5px monospace';
    ctx.fillStyle = isOn ? '#10b981' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('I', 0, ry + halfRh / 2);

    // Bottom half of rocker
    ctx.beginPath();
    ctx.roundRect(rx, ry + halfRh, rw, halfRh, [0, 0, 3, 3]);
    const botGrad = ctx.createLinearGradient(0, ry + halfRh, 0, ry + rh);
    if (isOn) {
      // Raised lower deck when ON
      botGrad.addColorStop(0, '#475569');
      botGrad.addColorStop(0.7, '#334155');
      botGrad.addColorStop(1, '#1e293b');
    } else {
      // Depressed bottom half when OFF
      botGrad.addColorStop(0, '#1e293b');
      botGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = botGrad;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Laser-etched "O" marking on bottom
    ctx.font = 'bold 8.5px monospace';
    ctx.fillStyle = !isOn ? '#ef4444' : '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O', 0, ry + halfRh + halfRh / 2);

    // Center pivot line
    ctx.beginPath();
    ctx.moveTo(rx, ry + halfRh);
    ctx.lineTo(rx + rw, ry + halfRh);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Status Text Pill Badge (bottom)
    const statusText = isOn ? geom.onLabel : geom.offLabel;
    ctx.font = 'bold 8px "Fira Code", monospace';
    const pillW = Math.max(34, ctx.measureText(statusText).width + 8);
    const pillH = 13;
    const pillX = -pillW / 2;
    const pillY = ry + rh + 3;

    if (pillY + pillH <= halfH - 1) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 2.5);
      ctx.fillStyle = isOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.strokeStyle = isOn ? '#059669' : '#dc2626';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = isOn ? '#34d399' : '#f87171';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusText, 0, pillY + pillH / 2 + 0.5);
    }

    // 5. Control Domain Output Terminal Pin Indicator
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.rect(halfW - 3, -3, 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
