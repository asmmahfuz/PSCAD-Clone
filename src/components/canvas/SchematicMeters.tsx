/**
 * PSCAD CLONE - Canvas-Embedded Schematic Meters & Live Instrumentation
 * Phase 19 - Step 19.3: Live Dynamic Digital Readouts & Analog Needle Meters
 */

import type { CircuitComponentData } from '../../types';
import { resolveWaveformColor } from '../../constants';

export interface MeterZone {
  startRatio: number;
  endRatio: number;
  color: string;
  label?: string;
}

export interface AnalogGaugeParams {
  label?: string;
  unitLabel?: string;
  minValue?: number;
  maxValue?: number;
  startAngleDeg?: number;
  sweepAngleDeg?: number;
  normalZoneMax?: number; // default 0.70 (70%)
  warningZoneMax?: number; // default 0.85 (85%)
  alarmZoneMax?: number; // default 1.00 (100%)
  needleColor?: string;
  peakColor?: string;
  showPeakHold?: boolean;
  peakValue?: number;
  targetSignal?: string;
  targetCompId?: string;
  measurementType?: 'instant' | 'rms' | 'peak' | 'avg';
  numTicks?: number;
}

export interface DigitalDisplayParams {
  label?: string;
  mode?: 'single' | 'multimeter_4row' | 'dual_vi' | 'power_pq';
  primaryQuantity?: 'V' | 'I' | 'P' | 'Q' | 'f' | 'custom';
  unitLabel?: string;
  targetSignal?: string;
  targetVoltageSignal?: string;
  targetCurrentSignal?: string;
  targetCompId?: string;
  accentColor?: string;
  lowAlarmLimit?: number;
  highAlarmLimit?: number;
  showRms?: boolean;
  showPeak?: boolean;
}

export interface MeterMetrics {
  instantVal: number;
  rmsVal: number;
  peakVal: number;
  activePowerP: number;
  reactivePowerQ: number;
  apparentPowerS: number;
  powerFactor: number;
  frequencyHz: number;
  alarmState: 'normal' | 'warning' | 'alarm';
  displayUnit: string;
  formattedVal: string;
}

export interface GaugeGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  needleAngle: number;
  peakAngle: number;
  normVal: number;
  normPeak: number;
  zones: { startA: number; endA: number; color: string }[];
  ticks: { angle: number; isMajor: boolean; value: number; label: string }[];
  metrics: MeterMetrics;
  label: string;
  unit: string;
  needleColor: string;
  peakColor: string;
}

export interface MatrixRowData {
  tag: string;
  name: string;
  valueText: string;
  unit: string;
  color: string;
  numericVal: number;
}

export interface DigitalDisplayGeometry {
  bounds: { x: number; y: number; w: number; h: number };
  matrixRows: MatrixRowData[];
  statusText: string;
  statusColor: string;
  metrics: MeterMetrics;
  label: string;
  accentColor: string;
  mode: 'single' | 'multimeter_4row' | 'dual_vi' | 'power_pq';
}

export class SchematicMetersManager {
  public static readonly GAUGE_WIDTH = 96;
  public static readonly GAUGE_HEIGHT = 96;
  public static readonly GAUGE_RADIUS = 42;
  public static readonly GAUGE_START_DEG = 135;
  public static readonly GAUGE_SWEEP_DEG = 270;

  public static readonly DISPLAY_4ROW_W = 120;
  public static readonly DISPLAY_4ROW_H = 76;
  public static readonly DISPLAY_SINGLE_W = 96;
  public static readonly DISPLAY_SINGLE_H = 48;

  /**
   * Compute true RMS of a time-series signal buffer:
   * RMS = sqrt( (1/N) * sum(x_k^2) )
   */
  static computeRMS(samples: number[], windowSamples = 100): number {
    if (!samples || samples.length === 0) return 0.0;
    const len = samples.length;
    const count = Math.min(len, windowSamples);
    const startIdx = len - count;

    let sumSq = 0.0;
    for (let i = startIdx; i < len; i++) {
      const v = samples[i];
      if (!isNaN(v)) {
        sumSq += v * v;
      }
    }
    return Math.sqrt(sumSq / count);
  }

  /**
   * Compute Peak amplitude of a time-series signal buffer:
   * Peak = max(|x_k|)
   */
  static computePeak(samples: number[], windowSamples = 100): number {
    if (!samples || samples.length === 0) return 0.0;
    const len = samples.length;
    const count = Math.min(len, windowSamples);
    const startIdx = len - count;

    let maxAbs = 0.0;
    for (let i = startIdx; i < len; i++) {
      const absV = Math.abs(samples[i]);
      if (!isNaN(absV) && absV > maxAbs) {
        maxAbs = absV;
      }
    }
    return maxAbs;
  }

  /**
   * Compute Active Power P (Watts) from time-series voltage and current buffers:
   * P = (1/N) * sum(v_k * i_k)
   */
  static computeActivePower(vSamples: number[], iSamples: number[], windowSamples = 100): number {
    if (!vSamples || !iSamples || vSamples.length === 0 || iSamples.length === 0) return 0.0;
    const len = Math.min(vSamples.length, iSamples.length);
    const count = Math.min(len, windowSamples);
    if (count === 0) return 0.0;
    const startIdx = len - count;

    let sumP = 0.0;
    for (let i = startIdx; i < len; i++) {
      const v = vSamples[i] || 0.0;
      const cur = iSamples[i] || 0.0;
      if (!isNaN(v) && !isNaN(cur)) {
        sumP += v * cur;
      }
    }
    return sumP / count;
  }

  /**
   * Compute Reactive Power Q (VAR), Apparent Power S (VA), and Power Factor:
   * S = V_RMS * I_RMS
   * Q = sign * sqrt( max(0, S^2 - P^2) )
   * pf = |P| / S
   */
  static computeReactivePower(
    vSamples: number[],
    iSamples: number[],
    windowSamples = 100,
    precomputedVrms?: number,
    precomputedIrms?: number,
    precomputedP?: number
  ): { Q: number; S: number; pf: number } {
    const vRms = precomputedVrms !== undefined ? precomputedVrms : this.computeRMS(vSamples, windowSamples);
    const iRms = precomputedIrms !== undefined ? precomputedIrms : this.computeRMS(iSamples, windowSamples);
    const P = precomputedP !== undefined ? precomputedP : this.computeActivePower(vSamples, iSamples, windowSamples);

    const S = vRms * iRms;
    const diffSq = Math.max(0, S * S - P * P);
    const Q = Math.sqrt(diffSq);
    const pf = S > 1e-6 ? Math.min(1.0, Math.max(0.0, Math.abs(P) / S)) : 1.0;

    return { Q, S, pf };
  }

  /**
   * Format numerical value with engineering SI prefixes (p, n, µ, m, k, M, G)
   */
  static formatMetricValue(val: number, baseUnit = '', precision = 2, autoSi = true): string {
    if (isNaN(val)) return `0.00 ${baseUnit}`.trim();
    if (Math.abs(val) < 1e-12) return `0.00 ${baseUnit}`.trim();

    if (!autoSi) {
      return `${val.toFixed(precision)} ${baseUnit}`.trim();
    }

    const absVal = Math.abs(val);
    let scale = 1;
    let prefix = '';

    if (absVal >= 1e9) {
      scale = 1e-9;
      prefix = 'G';
    } else if (absVal >= 1e6) {
      scale = 1e-6;
      prefix = 'M';
    } else if (absVal >= 1e3) {
      scale = 1e-3;
      prefix = 'k';
    } else if (absVal < 1e-6) {
      scale = 1e9;
      prefix = 'n';
    } else if (absVal < 1e-3) {
      scale = 1e6;
      prefix = 'µ';
    } else if (absVal < 1.0 && absVal >= 1e-3) {
      scale = 1e3;
      prefix = 'm';
    }

    const scaledVal = val * scale;
    const unitStr = `${prefix}${baseUnit}`.trim();
    return `${scaledVal.toFixed(precision)} ${unitStr}`.trim();
  }

  /**
   * Extract and compute comprehensive real-time telemetry metrics for any meter component
   */
  static computeMetrics(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    compState: any = {}
  ): MeterMetrics {
    const params = comp.params || {};

    // 1. Locate primary signal array
    let primarySamples: number[] = [];
    const targetSigName = params.targetSignal || params.signalName;

    if (targetSigName && signalsMap.has(targetSigName)) {
      primarySamples = signalsMap.get(targetSigName)!;
    } else if (params.targetCompId) {
      // Look up signal by linked target component ID / probe
      if (signalsMap.has(params.targetCompId)) {
        primarySamples = signalsMap.get(params.targetCompId)!;
      } else {
        // Check if target has a known signal name in params
        for (const [sigKey, arr] of signalsMap.entries()) {
          if (sigKey.includes(params.targetCompId)) {
            primarySamples = arr;
            break;
          }
        }
      }
    }

    // Direct inputVal from state (e.g. control domain wire input)
    const directInputVal =
      compState?.inputVal !== undefined
        ? Number(compState.inputVal)
        : params.value !== undefined
          ? Number(params.value)
          : 0.0;

    let instantVal = directInputVal;
    if (primarySamples.length > 0) {
      instantVal = primarySamples[primarySamples.length - 1];
    }

    // 2. Voltage and Current signals for Power calculations
    let vSamples: number[] = primarySamples;
    let iSamples: number[] = [];

    const vSigName = params.targetVoltageSignal || (params.unit === 'V' ? targetSigName : undefined);
    const iSigName = params.targetCurrentSignal || (params.unit === 'A' ? targetSigName : undefined);

    if (vSigName && signalsMap.has(vSigName)) {
      vSamples = signalsMap.get(vSigName)!;
    }
    if (iSigName && signalsMap.has(iSigName)) {
      iSamples = signalsMap.get(iSigName)!;
    }

    // If not explicitly set, search for available voltage and current probe signals
    if (iSamples.length === 0) {
      for (const [key, arr] of signalsMap.entries()) {
        if (key.toLowerCase().startsWith('i_') || key.toLowerCase().includes('current') || key.toLowerCase().includes('feeder')) {
          iSamples = arr;
          break;
        }
      }
    }
    if (vSamples.length === 0) {
      for (const [key, arr] of signalsMap.entries()) {
        if (key.toLowerCase().startsWith('v_') || key.toLowerCase().includes('volt') || key.toLowerCase().includes('load')) {
          vSamples = arr;
          break;
        }
      }
    }

    const rmsVal = primarySamples.length > 0 ? this.computeRMS(primarySamples, 100) : Math.abs(instantVal);
    const peakVal = primarySamples.length > 0 ? this.computePeak(primarySamples, 100) : Math.abs(instantVal);

    const vRms = vSamples.length > 0 ? this.computeRMS(vSamples, 100) : (params.unit === 'V' ? rmsVal : 0.0);
    const iRms = iSamples.length > 0 ? this.computeRMS(iSamples, 100) : (params.unit === 'A' ? rmsVal : 0.0);
    const P = this.computeActivePower(vSamples, iSamples, 100);
    const { Q, S, pf } = this.computeReactivePower(vSamples, iSamples, 100, vRms, iRms, P);

    // Alarm Limit Assessment
    const lowAlarm = params.lowAlarmLimit !== undefined ? Number(params.lowAlarmLimit) : params.gaugeLowAlarm;
    const highAlarm = params.highAlarmLimit !== undefined ? Number(params.highAlarmLimit) : params.gaugeHighAlarm;
    let alarmState: 'normal' | 'warning' | 'alarm' = 'normal';

    const measType = params.measurementType || 'rms';
    const evalVal = measType === 'instant' ? Math.abs(instantVal) : measType === 'peak' ? peakVal : rmsVal;

    if (highAlarm !== undefined && evalVal >= highAlarm) {
      alarmState = 'alarm';
    } else if (lowAlarm !== undefined && evalVal <= lowAlarm) {
      alarmState = 'warning';
    }

    const baseUnit = params.unitLabel || params.unit || '';
    const formattedVal = this.formatMetricValue(evalVal, baseUnit);

    return {
      instantVal,
      rmsVal,
      peakVal,
      activePowerP: P,
      reactivePowerQ: Q,
      apparentPowerS: S,
      powerFactor: pf,
      frequencyHz: params.freq || 60.0,
      alarmState,
      displayUnit: baseUnit,
      formattedVal,
    };
  }

  /**
   * Calculate exact geometry for Analog Gauge Sweep and Zones
   */
  static getGaugeGeometry(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    compState: any = {}
  ): GaugeGeometry {
    const params = comp.params || {};
    const min = params.minValue !== undefined ? Number(params.minValue) : params.gaugeMin !== undefined ? Number(params.gaugeMin) : 0;
    const max = params.maxValue !== undefined ? Number(params.maxValue) : params.gaugeMax !== undefined ? Number(params.gaugeMax) : 100;
    const range = max - min || 1;

    const metrics = this.computeMetrics(comp, signalsMap, compState);
    const measType = params.measurementType || 'rms';
    const currentVal = measType === 'instant' ? metrics.instantVal : measType === 'peak' ? metrics.peakVal : metrics.rmsVal;

    const normVal = Math.max(0, Math.min(1, (currentVal - min) / range));

    // Peak Hold Tracking
    let peakVal = params.peakValue !== undefined ? Number(params.peakValue) : currentVal;
    if (currentVal > peakVal) {
      peakVal = currentVal;
    }
    const normPeak = Math.max(0, Math.min(1, (peakVal - min) / range));

    const w = SchematicMetersManager.GAUGE_WIDTH;
    const h = SchematicMetersManager.GAUGE_HEIGHT;
    const r = SchematicMetersManager.GAUGE_RADIUS;

    const startDeg = params.startAngleDeg !== undefined ? Number(params.startAngleDeg) : SchematicMetersManager.GAUGE_START_DEG;
    const sweepDeg = params.sweepAngleDeg !== undefined ? Number(params.sweepAngleDeg) : SchematicMetersManager.GAUGE_SWEEP_DEG;

    const startAngle = (startDeg * Math.PI) / 180;
    const sweepAngle = (sweepDeg * Math.PI) / 180;
    const endAngle = startAngle + sweepAngle;

    const needleAngle = startAngle + normVal * sweepAngle;
    const peakAngle = startAngle + normPeak * sweepAngle;

    // Operating Zones: Green (Normal 0-70%), Amber (Warning 70-85%), Red (Alarm 85-100%)
    const normRatio = params.normalZoneMax !== undefined ? Number(params.normalZoneMax) : 0.7;
    const warnRatio = params.warningZoneMax !== undefined ? Number(params.warningZoneMax) : 0.85;

    const zones = [
      {
        startA: startAngle,
        endA: startAngle + normRatio * sweepAngle,
        color: '#10b981', // Normal Emerald Green
      },
      {
        startA: startAngle + normRatio * sweepAngle,
        endA: startAngle + warnRatio * sweepAngle,
        color: '#f59e0b', // Warning Amber
      },
      {
        startA: startAngle + warnRatio * sweepAngle,
        endA: endAngle,
        color: '#ef4444', // Alarm Crimson Red
      },
    ];

    // Scale graduation ticks (e.g. 0%, 25%, 50%, 75%, 100%)
    const numMajor = 5;
    const ticks: { angle: number; isMajor: boolean; value: number; label: string }[] = [];

    for (let i = 0; i < numMajor; i++) {
      const frac = i / (numMajor - 1);
      const angle = startAngle + frac * sweepAngle;
      const tickVal = min + frac * range;
      const label = tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : tickVal.toFixed(0);
      ticks.push({ angle, isMajor: true, value: tickVal, label });

      // Minor tick halfway between major ticks
      if (i < numMajor - 1) {
        const minorFrac = (i + 0.5) / (numMajor - 1);
        const minorAngle = startAngle + minorFrac * sweepAngle;
        const minorVal = min + minorFrac * range;
        ticks.push({ angle: minorAngle, isMajor: false, value: minorVal, label: '' });
      }
    }

    const bounds = {
      x: comp.x - w / 2,
      y: comp.y - h / 2,
      w,
      h,
    };

    return {
      bounds,
      center: { x: comp.x, y: comp.y + 4 },
      radius: r,
      startAngle,
      endAngle,
      sweepAngle,
      needleAngle,
      peakAngle,
      normVal,
      normPeak,
      zones,
      ticks,
      metrics,
      label: params.label || comp.name || 'Analog Meter',
      unit: params.unitLabel || params.unit || '',
      needleColor: params.needleColor || '#f43f5e',
      peakColor: params.peakColor || '#f97316',
    };
  }

  /**
   * Calculate exact geometry and matrix rows for Digital Display
   */
  static getDigitalDisplayGeometry(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    compState: any = {}
  ): DigitalDisplayGeometry {
    const params = comp.params || {};
    const mode = (params.mode || 'multimeter_4row') as 'single' | 'multimeter_4row' | 'dual_vi' | 'power_pq';
    const metrics = this.computeMetrics(comp, signalsMap, compState);

    const is4Row = mode === 'multimeter_4row' || mode === 'power_pq';
    const w = is4Row ? SchematicMetersManager.DISPLAY_4ROW_W : SchematicMetersManager.DISPLAY_SINGLE_W;
    const h = is4Row ? SchematicMetersManager.DISPLAY_4ROW_H : SchematicMetersManager.DISPLAY_SINGLE_H;

    const bounds = {
      x: comp.x - w / 2,
      y: comp.y - h / 2,
      w,
      h,
    };

    const matrixRows: MatrixRowData[] = [];

    if (mode === 'multimeter_4row') {
      matrixRows.push({
        tag: 'V_RMS',
        name: 'Voltage',
        valueText: this.formatMetricValue(metrics.rmsVal, 'V'),
        unit: 'V',
        color: '#38bdf8', // Cyan
        numericVal: metrics.rmsVal,
      });
      matrixRows.push({
        tag: 'I_RMS',
        name: 'Current',
        valueText: this.formatMetricValue(metrics.rmsVal > 0 && metrics.activePowerP !== 0 ? Math.abs(metrics.activePowerP / metrics.rmsVal) : (metrics.displayUnit === 'A' ? metrics.rmsVal : 0), 'A'),
        unit: 'A',
        color: '#34d399', // Emerald
        numericVal: metrics.rmsVal,
      });
      matrixRows.push({
        tag: 'P_ACT',
        name: 'Active P',
        valueText: this.formatMetricValue(metrics.activePowerP, 'W'),
        unit: 'W',
        color: '#fbbf24', // Amber
        numericVal: metrics.activePowerP,
      });
      matrixRows.push({
        tag: 'Q_REA',
        name: 'Reactive Q',
        valueText: this.formatMetricValue(metrics.reactivePowerQ, 'VAR'),
        unit: 'VAR',
        color: '#c084fc', // Purple
        numericVal: metrics.reactivePowerQ,
      });
    } else if (mode === 'power_pq') {
      matrixRows.push({
        tag: 'P_ACT',
        name: 'Active P',
        valueText: this.formatMetricValue(metrics.activePowerP, 'W'),
        unit: 'W',
        color: '#fbbf24',
        numericVal: metrics.activePowerP,
      });
      matrixRows.push({
        tag: 'Q_REA',
        name: 'Reactive Q',
        valueText: this.formatMetricValue(metrics.reactivePowerQ, 'VAR'),
        unit: 'VAR',
        color: '#c084fc',
        numericVal: metrics.reactivePowerQ,
      });
      matrixRows.push({
        tag: 'S_APP',
        name: 'Apparent S',
        valueText: this.formatMetricValue(metrics.apparentPowerS, 'VA'),
        unit: 'VA',
        color: '#38bdf8',
        numericVal: metrics.apparentPowerS,
      });
      matrixRows.push({
        tag: 'PF',
        name: 'Power Factor',
        valueText: metrics.powerFactor.toFixed(3),
        unit: '',
        color: '#34d399',
        numericVal: metrics.powerFactor,
      });
    } else if (mode === 'dual_vi') {
      matrixRows.push({
        tag: 'V_RMS',
        name: 'Voltage',
        valueText: this.formatMetricValue(metrics.rmsVal, 'V'),
        unit: 'V',
        color: '#38bdf8',
        numericVal: metrics.rmsVal,
      });
      matrixRows.push({
        tag: 'I_RMS',
        name: 'Current',
        valueText: this.formatMetricValue(metrics.rmsVal > 0 && metrics.activePowerP !== 0 ? Math.abs(metrics.activePowerP / metrics.rmsVal) : (metrics.displayUnit === 'A' ? metrics.rmsVal : 0), 'A'),
        unit: 'A',
        color: '#34d399',
        numericVal: metrics.rmsVal,
      });
    } else {
      // Single quantity
      const primaryQ = params.primaryQuantity || 'V';
      const baseUnit = params.unitLabel || params.unit || (primaryQ === 'I' ? 'A' : primaryQ === 'P' ? 'W' : primaryQ === 'Q' ? 'VAR' : 'V');
      const val = primaryQ === 'I' ? metrics.rmsVal : primaryQ === 'P' ? metrics.activePowerP : primaryQ === 'Q' ? metrics.reactivePowerQ : metrics.rmsVal;

      matrixRows.push({
        tag: `${primaryQ}_RMS`,
        name: primaryQ === 'I' ? 'Current' : primaryQ === 'P' ? 'Power' : 'Voltage',
        valueText: this.formatMetricValue(val, baseUnit),
        unit: baseUnit,
        color: params.accentColor || '#00e5ff',
        numericVal: val,
      });
    }

    const statusText = metrics.alarmState === 'alarm' ? 'TRIP' : metrics.alarmState === 'warning' ? 'WARN' : 'NORM';
    const statusColor = metrics.alarmState === 'alarm' ? '#ef4444' : metrics.alarmState === 'warning' ? '#f59e0b' : '#10b981';

    return {
      bounds,
      matrixRows,
      statusText,
      statusColor,
      metrics,
      label: params.label || comp.name || 'Digital Display',
      accentColor: params.accentColor || '#38bdf8',
      mode,
    };
  }

  /**
   * Hit test gauge bounds
   */
  static hitTestGauge(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const dist = Math.hypot(wx - comp.x, wy - (comp.y + 4));
    return dist <= SchematicMetersManager.GAUGE_RADIUS + 6;
  }

  /**
   * Hit test digital display bounds
   */
  static hitTestDigitalDisplay(comp: CircuitComponentData, wx: number, wy: number): boolean {
    const geom = this.getDigitalDisplayGeometry(comp);
    return (
      wx >= geom.bounds.x &&
      wx <= geom.bounds.x + geom.bounds.w &&
      wy >= geom.bounds.y &&
      wy <= geom.bounds.y + geom.bounds.h
    );
  }

  /**
   * Reset peak hold tracking value on meter
   */
  static resetPeakHold(comp: CircuitComponentData): CircuitComponentData {
    return {
      ...comp,
      params: {
        ...comp.params,
        peakValue: 0.0,
      },
    };
  }

  /**
   * Update component clone with new peak hold value
   */
  static updatePeakHold(comp: CircuitComponentData, currentVal: number): CircuitComponentData {
    const curPeak = comp.params?.peakValue !== undefined ? Number(comp.params.peakValue) : 0.0;
    const newPeak = Math.max(curPeak, currentVal);
    return {
      ...comp,
      params: {
        ...comp.params,
        peakValue: newPeak,
      },
    };
  }

  /**
   * Toggle digital display mode between 4-row matrix and single quantity
   */
  static toggleDisplayMode(comp: CircuitComponentData): CircuitComponentData {
    const curMode = comp.params?.mode || 'multimeter_4row';
    const nextMode = curMode === 'multimeter_4row' ? 'power_pq' : curMode === 'power_pq' ? 'dual_vi' : curMode === 'dual_vi' ? 'single' : 'multimeter_4row';
    return {
      ...comp,
      params: {
        ...comp.params,
        mode: nextMode,
      },
    };
  }
}

export class SchematicMetersRenderer {
  /**
   * Draw high-aesthetic analog sweeping needle meter (RUNTIME_GAUGE)
   */
  static drawAnalogGauge(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    state: any = {}
  ): void {
    const signalsMap = state.signalsMap || new Map();
    const geom = SchematicMetersManager.getGaugeGeometry(comp, signalsMap, state);
    const isSelected = state.isSelected || false;
    const isHovered = state.isHovered || false;
    const isLightMode = colors && colors.isDark === false;

    ctx.save();

    const r = geom.radius;
    const pivotY = 4;

    // 1. Outer Titanium / Dark Slate Beveled Chassis
    ctx.beginPath();
    ctx.arc(0, pivotY, r, 0, 2 * Math.PI);

    const outerGrad = ctx.createRadialGradient(0, pivotY - 10, r * 0.2, 0, pivotY, r);
    if (isLightMode) {
      outerGrad.addColorStop(0, '#ffffff');
      outerGrad.addColorStop(0.85, '#f1f5f9');
      outerGrad.addColorStop(1, '#e2e8f0');
    } else {
      outerGrad.addColorStop(0, '#1c2434');
      outerGrad.addColorStop(0.85, '#0f172a');
      outerGrad.addColorStop(1, '#06090e');
    }
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // Chassis Border / Selection Glow
    ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? (isLightMode ? '#94a3b8' : '#475569') : (isLightMode ? '#cbd5e1' : '#273549');
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    if (isSelected) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Sunken CRT/Dial Faceplate
    const faceR = r - 5;
    ctx.beginPath();
    ctx.arc(0, pivotY, faceR, 0, 2 * Math.PI);
    const faceGrad = ctx.createRadialGradient(0, pivotY, 0, 0, pivotY, faceR);
    if (isLightMode) {
      faceGrad.addColorStop(0, '#ffffff');
      faceGrad.addColorStop(1, '#f8fafc');
    } else {
      faceGrad.addColorStop(0, '#0f1523');
      faceGrad.addColorStop(1, '#080c14');
    }
    ctx.fillStyle = faceGrad;
    ctx.fill();

    ctx.strokeStyle = isLightMode ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Colored Operating Zone Arcs (Normal Green, Warning Amber, Alarm Red)
    const arcR = faceR - 6;
    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'butt';

    for (const zone of geom.zones) {
      ctx.beginPath();
      ctx.arc(0, pivotY, arcR, zone.startA, zone.endA);
      ctx.strokeStyle = zone.color;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Calibration Tick Marks & Scale Numerals
    ctx.font = 'bold 7.5px "Fira Code", monospace';
    ctx.fillStyle = isLightMode ? '#334155' : '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const tick of geom.ticks) {
      const innerR = tick.isMajor ? arcR - 6 : arcR - 3;
      const outerR = arcR + 2;

      ctx.beginPath();
      ctx.moveTo(innerR * Math.cos(tick.angle), pivotY + innerR * Math.sin(tick.angle));
      ctx.lineTo(outerR * Math.cos(tick.angle), pivotY + outerR * Math.sin(tick.angle));
      ctx.strokeStyle = isLightMode
        ? (tick.isMajor ? '#475569' : '#94a3b8')
        : (tick.isMajor ? '#94a3b8' : '#475569');
      ctx.lineWidth = tick.isMajor ? 1.2 : 0.8;
      ctx.stroke();

      // Numerical label for major ticks
      if (tick.isMajor && tick.label) {
        const textR = innerR - 7;
        const tx = textR * Math.cos(tick.angle);
        const ty = pivotY + textR * Math.sin(tick.angle);
        ctx.fillText(tick.label, tx, ty);
      }
    }

    // 5. Peak Hold Pointer (Secondary Orange Marker)
    if (geom.normPeak > 0) {
      ctx.save();
      const peakR = arcR + 3;
      const peakX = peakR * Math.cos(geom.peakAngle);
      const peakY = pivotY + peakR * Math.sin(geom.peakAngle);

      ctx.beginPath();
      ctx.moveTo(0, pivotY);
      ctx.lineTo(peakX, peakY);
      ctx.strokeStyle = geom.peakColor;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small peak indicator arrow head on outer arc
      ctx.beginPath();
      ctx.arc(peakX, peakY, 2.0, 0, 2 * Math.PI);
      ctx.fillStyle = geom.peakColor;
      ctx.shadowColor = geom.peakColor;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }

    // 6. Sweeping Analog Needle with Tapered Shaft and Glow
    ctx.save();
    const needleLength = arcR - 2;
    const tailLength = 8;
    const needleAngle = geom.needleAngle;

    const tipX = needleLength * Math.cos(needleAngle);
    const tipY = pivotY + needleLength * Math.sin(needleAngle);

    const tailX = -tailLength * Math.cos(needleAngle);
    const tailY = pivotY - tailLength * Math.sin(needleAngle);

    const perpAngle = needleAngle + Math.PI / 2;
    const baseWidth = 2.2;
    const b1x = baseWidth * Math.cos(perpAngle);
    const b1y = pivotY + baseWidth * Math.sin(perpAngle);
    const b2x = -baseWidth * Math.cos(perpAngle);
    const b2y = pivotY - baseWidth * Math.sin(perpAngle);

    // Tapered needle body
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(b1x, b1y);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(b2x, b2y);
    ctx.closePath();

    const needleGrad = ctx.createLinearGradient(0, pivotY, tipX, tipY);
    needleGrad.addColorStop(0, '#ffffff');
    needleGrad.addColorStop(0.3, geom.needleColor);
    needleGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = needleGrad;

    ctx.shadowColor = geom.needleColor;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();

    // 7. Polished Machined Chrome Center Pivot Cap
    ctx.beginPath();
    ctx.arc(0, pivotY, 5, 0, 2 * Math.PI);
    const capGrad = ctx.createRadialGradient(-1, pivotY - 1, 1, 0, pivotY, 5);
    capGrad.addColorStop(0, '#ffffff');
    capGrad.addColorStop(0.6, '#94a3b8');
    capGrad.addColorStop(1, '#334155');
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 8. Digital LCD Sub-Display Readout Badge (Bottom Center)
    const lcdW = 46;
    const lcdH = 13;
    const lcdX = -lcdW / 2;
    const lcdY = pivotY + 13;

    ctx.beginPath();
    ctx.roundRect(lcdX, lcdY, lcdW, lcdH, 2.5);
    ctx.fillStyle = isLightMode ? '#f1f5f9' : '#05080e';
    ctx.fill();
    ctx.strokeStyle = isLightMode ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = 'bold 8px "Fira Code", monospace';
    ctx.fillStyle = geom.metrics.alarmState === 'alarm' ? '#ef4444' : (isLightMode ? '#0284c7' : '#00e5ff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.metrics.formattedVal, 0, lcdY + lcdH / 2 + 0.5);

    // 9. Top Label Text
    ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = isSelected ? (isLightMode ? '#0284c7' : '#38bdf8') : (isLightMode ? '#0f172a' : '#94a3b8');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(geom.label, 0, -r + 2);

    // 10. Control Domain Input Pin Marker
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.rect(-r - 3, pivotY - 3, 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw high-aesthetic multi-row / single-quantity Digital LED Display (RUNTIME_DIGITAL_DISPLAY)
   */
  static drawDigitalDisplay(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    state: any = {}
  ): void {
    const signalsMap = state.signalsMap || new Map();
    const geom = SchematicMetersManager.getDigitalDisplayGeometry(comp, signalsMap, state);
    const isSelected = state.isSelected || false;
    const isHovered = state.isHovered || false;
    const isLightMode = colors && colors.isDark === false;

    ctx.save();

    const w = geom.bounds.w;
    const h = geom.bounds.h;
    const halfW = w / 2;
    const halfH = h / 2;

    // 1. Outer Beveled Industrial Chassis
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 5);

    const bgGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    if (isLightMode) {
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#f1f5f9');
    } else {
      bgGrad.addColorStop(0, '#161c28');
      bgGrad.addColorStop(1, '#0c1017');
    }
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Chassis Border / Selection Glow
    ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? (isLightMode ? '#94a3b8' : '#475569') : (isLightMode ? '#cbd5e1' : '#222d3d');
    ctx.lineWidth = isSelected ? 2.0 : 1.5;
    if (isSelected) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Header Bar: Title Label & Status Pill
    const headerH = 15;
    ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = isSelected ? (isLightMode ? '#0284c7' : '#38bdf8') : (isLightMode ? '#0f172a' : '#94a3b8');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.label, -halfW + 7, -halfH + 8);

    // Status Pill Badge (Top-Right)
    const pillW = 28;
    const pillH = 10;
    const pillX = halfW - pillW - 6;
    const pillY = -halfH + 3;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 2);
    ctx.fillStyle = `${geom.statusColor}22`;
    ctx.fill();
    ctx.strokeStyle = geom.statusColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = 'bold 7px "Fira Code", monospace';
    ctx.fillStyle = isLightMode && geom.statusColor === '#10b981' ? '#047857' : isLightMode && geom.statusColor === '#f59e0b' ? '#b45309' : geom.statusColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(geom.statusText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);

    // 3. Inset OLED Screen Display Window
    const screenX = -halfW + 5;
    const screenY = -halfH + headerH;
    const screenW = w - 10;
    const screenH = h - headerH - 5;

    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, 3);
    ctx.fillStyle = isLightMode ? '#ffffff' : '#05070d';
    ctx.fill();
    ctx.strokeStyle = isLightMode ? '#cbd5e1' : '#1a2230';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Matrix Rows Rendering
    const numRows = geom.matrixRows.length;
    const rowH = screenH / numRows;

    geom.matrixRows.forEach((row, idx) => {
      const ry = screenY + idx * rowH;

      // Row separator line (except top)
      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(screenX + 2, ry);
        ctx.lineTo(screenX + screenW - 2, ry);
        ctx.strokeStyle = isLightMode ? '#e2e8f0' : '#0d131c';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Quantity Tag Label (Left)
      ctx.font = isHovered || isSelected ? 'bold 7.5px "Fira Code", monospace' : '7.5px "Fira Code", monospace';
      ctx.fillStyle = isLightMode ? '#334155' : '#64748b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(row.tag, screenX + 5, ry + rowH / 2);

      // Glowing Numeric Value (Right)
      const effectiveRowColor = resolveWaveformColor(row.color, !isLightMode);
      ctx.font = numRows <= 2 ? 'bold 11px "Fira Code", monospace' : 'bold 8.5px "Fira Code", monospace';
      ctx.fillStyle = effectiveRowColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ctx.save();
      if (!isLightMode) {
        ctx.shadowColor = `${row.color}66`;
        ctx.shadowBlur = 4;
      }
      ctx.fillText(row.valueText, screenX + screenW - 5, ry + rowH / 2);
      ctx.restore();
    });

    // 5. Control Domain Input Pin Marker
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.rect(-halfW - 3, -3, 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw floating on-schematic live digital readout badge attached to standard meters (Voltmeter, Ammeter, Multimeter)
   */
  static drawOnSchematicMeterBadge(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    state: any = {}
  ): void {
    const signalsMap = state.signalsMap || new Map();
    const metrics = SchematicMetersManager.computeMetrics(comp, signalsMap, state);

    // Only render live badge if simulation has generated signals or state has valid values
    if (metrics.rmsVal === 0 && metrics.instantVal === 0 && signalsMap.size === 0) return;

    ctx.save();
    const isLightMode = colors && colors.isDark === false;
    const isVoltmeter = comp.type.includes('volt');
    const isAmmeter = comp.type.includes('am');

    const badgeText = isVoltmeter
      ? SchematicMetersManager.formatMetricValue(metrics.rmsVal, 'V')
      : isAmmeter
        ? SchematicMetersManager.formatMetricValue(metrics.rmsVal, 'A')
        : `${SchematicMetersManager.formatMetricValue(metrics.rmsVal, 'V')} | ${SchematicMetersManager.formatMetricValue(metrics.activePowerP, 'W')}`;

    ctx.font = 'bold 8px "Fira Code", monospace';
    const textW = ctx.measureText(badgeText).width;
    const badgeW = textW + 8;
    const badgeH = 13;
    const badgeX = -badgeW / 2;
    const badgeY = 22; // Offset below component body

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 2.5);
    ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.96)' : 'rgba(7, 10, 16, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isVoltmeter ? '#0284c7' : isAmmeter ? '#059669' : '#d97706';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isLightMode
      ? (isVoltmeter ? '#0369a1' : isAmmeter ? '#047857' : '#b45309')
      : (isVoltmeter ? '#38bdf8' : isAmmeter ? '#34d399' : '#fbbf24');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, badgeY + badgeH / 2 + 0.5);

    ctx.restore();
  }
}
