/**
 * PSCAD CLONE - Canvas-Embedded PolyGraph View & Stacked Sub-Trace Engine
 * Phase 18 - Step 18.3: PolyGraph Stacked Sub-Traces & Dynamic Y-Scaling
 *
 * Implements commercial-grade stacked multi-grid PolyGraph visualization:
 * - 2 to 4 vertically stacked sub-grids sharing a synchronized time (X) axis
 * - Independent Y-axis auto-scaling, min/max limits, and grid subdivisions per sub-trace / sub-grid
 * - Synchronized vertical crosshair cursor displaying exact numerical values across all stacked traces at time t
 * - Interactive per-subgrid legend pills and trace visibility controls
 */

import type { CircuitComponentData, Point } from '../../types';
import { WAVEFORM_COLORS, resolveWaveformColor } from '../../constants';
import { GraphBindingManager, type BoundTrace, type LegendItemGeometry } from './GraphBinding';
import { GraphFrameRenderer } from './GraphFrame';

export interface SubGridConfig {
  id: string;
  title?: string;
  unit?: string;
  yMin?: number;
  yMax?: number;
  autoScale?: boolean;
  traces?: string[];
}

export interface SubGridGeometry {
  index: number;
  id: string;
  title: string;
  unit: string;
  x: number;
  y: number;
  w: number;
  h: number;
  yMin: number;
  yMax: number;
  traces: BoundTrace[];
  visibleTraces: BoundTrace[];
}

export interface CrosshairMarker {
  trace: BoundTrace;
  subGridIndex: number;
  value: number;
  valueStr: string;
  unitStr: string;
  markerX: number;
  markerY: number;
  color: string;
}

export interface PolyGraphCrosshairData {
  time: number;
  cursorX: number;
  markers: CrosshairMarker[];
  topY: number;
  bottomY: number;
  inBounds: boolean;
}

export class PolyGraphManager {
  public static readonly MIN_SUBGRIDS = 2;
  public static readonly MAX_SUBGRIDS = 4;
  public static readonly SUBGRID_GAP = 6;
  public static readonly HEADER_HEIGHT = 26;
  public static readonly MARGIN_LEFT = 54;
  public static readonly MARGIN_RIGHT = 14;
  public static readonly MARGIN_BOTTOM = 22;
  public static readonly MARGIN_TOP = 26;

  /**
   * Determine if a Graph Frame is configured to render in PolyGraph / Stacked mode
   */
  static isPolyGraphMode(comp: CircuitComponentData): boolean {
    const params = comp.params || {};
    if (params.graphMode === 'polygraph' || params.graphMode === 'stacked' || params.isPolyGraph === true) {
      return true;
    }
    if (typeof params.numSubGrids === 'number' && params.numSubGrids > 1) {
      return true;
    }
    if (Array.isArray(params.subGrids) && params.subGrids.length > 1) {
      return true;
    }
    return false;
  }

  /**
   * Partition resolved traces into discrete sub-grids (0 to N-1)
   */
  static partitionTraces(
    comp: CircuitComponentData,
    traces: BoundTrace[]
  ): { numSubGrids: number; subGridTraces: Map<number, BoundTrace[]>; subGridConfigs: SubGridConfig[] } {
    const params = comp.params || {};
    const configuredSubGrids: SubGridConfig[] = Array.isArray(params.subGrids) ? params.subGrids : [];

    let targetCount = configuredSubGrids.length > 0 ? configuredSubGrids.length : params.numSubGrids || 2;
    targetCount = Math.max(PolyGraphManager.MIN_SUBGRIDS, Math.min(PolyGraphManager.MAX_SUBGRIDS, targetCount));

    const subGridTraces = new Map<number, BoundTrace[]>();
    for (let i = 0; i < targetCount; i++) {
      subGridTraces.set(i, []);
    }

    if (traces.length === 0) {
      return { numSubGrids: targetCount, subGridTraces, subGridConfigs: configuredSubGrids };
    }

    // Check if traces have explicit subGridIndex assigned
    const hasExplicitIndices = traces.some((t) => typeof t.subGridIndex === 'number');

    if (hasExplicitIndices) {
      traces.forEach((tr, idx) => {
        const gridIdx = typeof tr.subGridIndex === 'number'
          ? Math.max(0, Math.min(targetCount - 1, tr.subGridIndex))
          : idx % targetCount;
        subGridTraces.get(gridIdx)?.push(tr);
      });
    } else if (configuredSubGrids.length > 0) {
      // Assign based on configured subGrids signal list
      const assigned = new Set<string>();
      configuredSubGrids.forEach((sg, sgIdx) => {
        if (sgIdx < targetCount && Array.isArray(sg.traces)) {
          sg.traces.forEach((sigName) => {
            const tr = traces.find((t) => t.signalName === sigName || t.id === sigName);
            if (tr && !assigned.has(tr.id)) {
              subGridTraces.get(sgIdx)?.push(tr);
              assigned.add(tr.id);
            }
          });
        }
      });

      // Distribute remaining unassigned traces
      traces.forEach((tr, idx) => {
        if (!assigned.has(tr.id)) {
          const fallbackIdx = idx % targetCount;
          subGridTraces.get(fallbackIdx)?.push(tr);
        }
      });
    } else {
      // Group by Unit / Domain if voltage & current are mixed
      const hasVolts = traces.some((t) => (t.unit || '').toLowerCase().includes('v'));
      const hasAmps = traces.some((t) => (t.unit || '').toLowerCase().includes('a'));

      if (hasVolts && hasAmps && targetCount >= 2) {
        traces.forEach((tr) => {
          const u = (tr.unit || '').toLowerCase();
          if (u.includes('v') || (!u.includes('a') && tr.signalName.toLowerCase().startsWith('v'))) {
            subGridTraces.get(0)?.push(tr);
          } else if (u.includes('a') || tr.signalName.toLowerCase().startsWith('i')) {
            subGridTraces.get(1)?.push(tr);
          } else {
            const extraIdx = Math.min(targetCount - 1, 2);
            subGridTraces.get(extraIdx)?.push(tr);
          }
        });
      } else {
        // Uniform sequential / interleaved distribution
        traces.forEach((tr, idx) => {
          const gridIdx = Math.floor((idx * targetCount) / traces.length);
          subGridTraces.get(Math.min(targetCount - 1, gridIdx))?.push(tr);
        });
      }
    }

    return { numSubGrids: targetCount, subGridTraces, subGridConfigs: configuredSubGrids };
  }

  /**
   * Calculate complete geometric layouts and independent Y-scaling for all stacked sub-grids
   */
  static calculateSubGridGeometries(
    comp: CircuitComponentData,
    traces: BoundTrace[],
    signalsMap: Map<string, number[]> = new Map()
  ): SubGridGeometry[] {
    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const plotX = x + PolyGraphManager.MARGIN_LEFT;
    const plotY = y + PolyGraphManager.MARGIN_TOP;
    const plotW = Math.max(10, w - PolyGraphManager.MARGIN_LEFT - PolyGraphManager.MARGIN_RIGHT);
    const plotH = Math.max(10, h - PolyGraphManager.MARGIN_TOP - PolyGraphManager.MARGIN_BOTTOM);

    const { numSubGrids, subGridTraces, subGridConfigs } = PolyGraphManager.partitionTraces(comp, traces);

    const totalGaps = (numSubGrids - 1) * PolyGraphManager.SUBGRID_GAP;
    const availableHeight = Math.max(10 * numSubGrids, plotH - totalGaps);
    const subH = Math.max(10, availableHeight / numSubGrids);

    const geometries: SubGridGeometry[] = [];

    for (let k = 0; k < numSubGrids; k++) {
      const subY = plotY + k * (subH + PolyGraphManager.SUBGRID_GAP);
      const gridTraces = subGridTraces.get(k) || [];
      const visibleTraces = gridTraces.filter((t) => t.visible);
      const config = subGridConfigs[k] || {};

      // Determine sub-grid title and unit tag
      let defaultTitle = `Track ${k + 1}`;
      let commonUnit = config.unit || '';
      if (gridTraces.length > 0) {
        const units = Array.from(new Set(gridTraces.map((t) => t.unit).filter(Boolean)));
        if (units.length === 1) commonUnit = units[0]!;
        if (!config.title) {
          const names = gridTraces.map((t) => t.label).join(', ');
          defaultTitle = names.length > 18 ? `${names.substring(0, 16)}…` : names;
        }
      }
      const title = config.title || defaultTitle;

      // Independent Y-Axis Range Computation
      let yMin = -1.0;
      let yMax = 1.0;

      if (typeof config.yMin === 'number' && typeof config.yMax === 'number' && config.yMin < config.yMax) {
        yMin = config.yMin;
        yMax = config.yMax;
      } else {
        let hasData = false;
        let minVal = Infinity;
        let maxVal = -Infinity;

        for (const tr of visibleTraces) {
          const data = signalsMap.get(tr.signalName);
          if (data && data.length > 0) {
            hasData = true;
            const gain = tr.gain ?? 1.0;
            const offset = tr.offset ?? 0.0;
            for (let i = 0; i < data.length; i++) {
              const raw = data[i];
              if (Number.isFinite(raw)) {
                const val = (raw * gain) + offset;
                if (val < minVal) minVal = val;
                if (val > maxVal) maxVal = val;
              }
            }
          }
        }

        if (hasData && minVal < maxVal) {
          const span = maxVal - minVal;
          const pad = span * 0.1 || (Math.abs(maxVal) * 0.1 || 1.0);
          yMin = minVal - pad;
          yMax = maxVal + pad;
        } else if (hasData && minVal === maxVal) {
          const pad = Math.abs(minVal) * 0.1 || 1.0;
          yMin = minVal - pad;
          yMax = maxVal + pad;
        }
      }

      geometries.push({
        index: k,
        id: config.id || `subgrid_${k}`,
        title,
        unit: commonUnit,
        x: plotX,
        y: subY,
        w: plotW,
        h: subH,
        yMin,
        yMax,
        traces: gridTraces,
        visibleTraces,
      });
    }

    return geometries;
  }

  /**
   * Calculate synchronized vertical crosshair cursor tracking across all stacked sub-grids
   */
  static calculateCrosshairAt(
    comp: CircuitComponentData,
    worldX: number,
    worldY: number,
    traces: BoundTrace[],
    signalsMap: Map<string, number[]> = new Map(),
    syncCrosshairTime?: number | null
  ): PolyGraphCrosshairData | null {
    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const plotX = x + PolyGraphManager.MARGIN_LEFT;
    const plotY = y + PolyGraphManager.MARGIN_TOP;
    const plotW = Math.max(10, w - PolyGraphManager.MARGIN_LEFT - PolyGraphManager.MARGIN_RIGHT);
    const plotH = Math.max(10, h - PolyGraphManager.MARGIN_TOP - PolyGraphManager.MARGIN_BOTTOM);

    const effectiveCrosshairTime = (syncCrosshairTime !== undefined && syncCrosshairTime !== null)
      ? syncCrosshairTime
      : (typeof comp.params?.crosshairTime === 'number' ? comp.params.crosshairTime : null);

    const inBounds = worldX >= plotX && worldX <= plotX + plotW && worldY >= plotY && worldY <= plotY + plotH;
    if (!inBounds && effectiveCrosshairTime === null) {
      return null;
    }

    const timeData = signalsMap.get('Time') || [];
    let tMin = 0;
    let tMax = timeData.length > 0 ? timeData[timeData.length - 1] : 0.5;
    if (tMax <= tMin) tMax = 0.5;

    let targetTime: number;
    let cursorX: number;

    if (effectiveCrosshairTime !== null) {
      targetTime = Math.max(tMin, Math.min(tMax, effectiveCrosshairTime));
      cursorX = plotX + ((targetTime - tMin) / Math.max(1e-6, tMax - tMin)) * plotW;
    } else {
      const clampedX = Math.max(plotX, Math.min(plotX + plotW, worldX));
      cursorX = clampedX;
      targetTime = tMin + ((clampedX - plotX) / Math.max(1e-6, plotW)) * (tMax - tMin);
    }

    const subGrids = PolyGraphManager.calculateSubGridGeometries(comp, traces, signalsMap);
    const markers: CrosshairMarker[] = [];

    // Interpolate signal values at targetTime
    for (const sg of subGrids) {
      for (const tr of sg.visibleTraces) {
        const data = signalsMap.get(tr.signalName);
        if (!data || data.length === 0 || timeData.length === 0) continue;

        const count = Math.min(timeData.length, data.length);
        let interpVal = data[0];

        if (targetTime <= timeData[0]) {
          interpVal = data[0];
        } else if (targetTime >= timeData[count - 1]) {
          interpVal = data[count - 1];
        } else {
          // Binary search for exact time bracket
          let low = 0;
          let high = count - 1;
          while (low <= high) {
            const mid = (low + high) >> 1;
            if (timeData[mid] < targetTime) {
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          const i0 = Math.max(0, low - 1);
          const i1 = Math.min(count - 1, low);
          if (i0 === i1 || timeData[i1] === timeData[i0]) {
            interpVal = data[i0];
          } else {
            const frac = (targetTime - timeData[i0]) / (timeData[i1] - timeData[i0]);
            interpVal = data[i0] + frac * (data[i1] - data[i0]);
          }
        }

        const gain = tr.gain ?? 1.0;
        const offset = tr.offset ?? 0.0;
        const scaledVal = (interpVal * gain) + offset;

        // Calculate Y position on this specific sub-grid
        const span = sg.yMax - sg.yMin || 1.0;
        const normY = (scaledVal - sg.yMin) / span;
        const markerY = sg.y + sg.h - (normY * sg.h);

        markers.push({
          trace: tr,
          subGridIndex: sg.index,
          value: scaledVal,
          valueStr: GraphFrameRenderer.formatEngValue(scaledVal),
          unitStr: tr.unit || sg.unit || '',
          markerX: cursorX,
          markerY,
          color: tr.color || WAVEFORM_COLORS[0],
        });
      }
    }

    return {
      time: targetTime,
      cursorX,
      markers,
      topY: plotY,
      bottomY: plotY + plotH,
      inBounds,
    };
  }

  /**
   * Get interactive legend items for all sub-grids
   */
  static getPolyGraphLegendItems(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = []
  ): LegendItemGeometry[] {
    const traces = GraphBindingManager.resolveTracesForFrame(comp, allComponents, signalsMap);
    const subGrids = PolyGraphManager.calculateSubGridGeometries(comp, traces, signalsMap);
    const items: LegendItemGeometry[] = [];

    for (const sg of subGrids) {
      if (sg.traces.length === 0) continue;

      const itemW = Math.min(130, Math.max(85, (sg.w - 12) / sg.traces.length));
      const itemH = 14;
      let currX = sg.x + sg.w - (sg.traces.length * (itemW + 4));

      for (const tr of sg.traces) {
        const data = signalsMap.get(tr.signalName);
        const lastVal = data && data.length > 0 ? data[data.length - 1] : undefined;

        let valueStr = '--';
        if (lastVal !== undefined && Number.isFinite(lastVal)) {
          const scaled = (lastVal * (tr.gain ?? 1.0)) + (tr.offset ?? 0.0);
          valueStr = GraphFrameRenderer.formatEngValue(scaled);
        }

        items.push({
          trace: tr,
          x: currX,
          y: sg.y + 4,
          w: itemW,
          h: itemH,
          valueStr,
          unitStr: tr.unit || sg.unit || '',
          color: tr.color,
          visible: tr.visible,
        });

        currX += itemW + 4;
      }
    }

    return items;
  }
}

export class PolyGraphRenderer {
  /**
   * Render complete stacked multi-grid PolyGraph Frame onto canvas context
   */
  static render(
    ctx: CanvasRenderingContext2D,
    comp: CircuitComponentData,
    colors: any,
    signalsMap: Map<string, number[]>,
    isSelected: boolean,
    allComponents: CircuitComponentData[] = [],
    hoverWorldPos?: Point | null,
    syncCrosshairTime?: number | null
  ): void {
    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const headerH = PolyGraphManager.HEADER_HEIGHT;
    const title = comp.params?.graphTitle || comp.name || 'PolyGraph Frame';
    const showGrid = comp.params?.graphShowGrid !== false;
    const showLegend = comp.params?.graphShowLegend !== false;

    // Resolve traces & subgrid geometries
    const traces: BoundTrace[] = GraphBindingManager.resolveTracesForFrame(comp, allComponents, signalsMap);
    const subGrids: SubGridGeometry[] = PolyGraphManager.calculateSubGridGeometries(comp, traces, signalsMap);

    ctx.save();
    const isLightMode = colors && colors.isDark === false;

    // 1. Frame Container Background & Border
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fillStyle = isLightMode ? '#ffffff' : '#0a0e17';
    ctx.fill();
    ctx.strokeStyle = isSelected ? (isLightMode ? '#2563eb' : '#388bfd') : (isLightMode ? '#cbd5e1' : '#1e293b');
    ctx.lineWidth = isSelected ? 2.0 : 1.5;
    ctx.stroke();

    // 2. Header Bar
    ctx.beginPath();
    ctx.roundRect(x, y, w, headerH, [6, 6, 0, 0]);
    ctx.fillStyle = isSelected
      ? (isLightMode ? '#e0e7ff' : '#13233a')
      : (isLightMode ? '#f1f5f9' : '#111827');
    ctx.fill();
    ctx.strokeStyle = isSelected ? (isLightMode ? '#2563eb' : '#388bfd') : (isLightMode ? '#cbd5e1' : '#1f293d');
    ctx.lineWidth = 1;
    ctx.stroke();

    // PolyGraph Icon
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊', x + 8, y + headerH / 2);

    // Title Text
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isLightMode ? '#0f172a' : '#f1f5f9';
    ctx.fillText(title, x + 28, y + headerH / 2);

    // PolyGraph Track Count Badge
    const activeCount = traces.filter((t) => t.visible).length;
    const badgeText = `${subGrids.length} Tracks (${activeCount} Traces)`;
    ctx.font = '9px monospace';
    ctx.fillStyle = activeCount > 0 ? (isLightMode ? '#0284c7' : '#38bdf8') : '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(badgeText, x + w - 10, y + headerH / 2);

    // Time domain range
    const timeData = signalsMap.get('Time') || [];
    let tMin = 0;
    let tMax = timeData.length > 0 ? timeData[timeData.length - 1] : 0.5;
    if (tMax <= tMin) tMax = 0.5;

    // 3. Render Each Stacked Sub-Grid
    const numDivX = 5;
    const numDivY = 2; // Subdivisions per sub-grid

    subGrids.forEach((sg) => {
      const { x: sx, y: sy, w: sw, h: sh, yMin, yMax, visibleTraces } = sg;

      // Sub-grid Plot Box Background
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.fillStyle = isLightMode ? '#f8fafc' : '#05070c';
      ctx.fill();
      ctx.strokeStyle = isLightMode ? '#cbd5e1' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sub-grid Header Label (Top-Left inside sub-grid)
      ctx.font = 'bold 8.5px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isLightMode ? '#334155' : 'rgba(148, 163, 184, 0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const unitLabel = sg.unit ? ` [${sg.unit}]` : '';
      ctx.fillText(`${sg.title}${unitLabel}`, sx + 6, sy + 4);

      // Grid Subdivisions
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = isLightMode ? 'rgba(203, 213, 225, 0.8)' : 'rgba(51, 65, 85, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);

        // Vertical Grid Lines (synchronized across all tracks)
        for (let i = 1; i < numDivX; i++) {
          const gx = sx + (sw / numDivX) * i;
          ctx.beginPath();
          ctx.moveTo(gx, sy);
          ctx.lineTo(gx, sy + sh);
          ctx.stroke();
        }

        // Horizontal Grid Lines for this sub-grid
        for (let i = 1; i < numDivY; i++) {
          const gy = sy + (sh / numDivY) * i;
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.lineTo(sx + sw, gy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Zero-Axis Line if zero is in range for this subgrid
      if (yMin < 0 && yMax > 0) {
        const zeroY = sy + sh - ((0 - yMin) / (yMax - yMin)) * sh;
        ctx.save();
        ctx.strokeStyle = isLightMode ? 'rgba(100, 116, 139, 0.4)' : 'rgba(100, 116, 139, 0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, zeroY);
        ctx.lineTo(sx + sw, zeroY);
        ctx.stroke();
        ctx.restore();
      }

      // Independent Y-Axis Numbers (Left of this subgrid)
      ctx.font = '8px monospace';
      ctx.fillStyle = isLightMode ? '#1e293b' : '#94a3b8';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= numDivY; i++) {
        const gy = sy + (sh / numDivY) * i;
        const v = yMax - (i / numDivY) * (yMax - yMin);
        ctx.fillText(GraphFrameRenderer.formatEngValue(v), sx - 4, gy);
      }

      // Sub-grid Waveform Curves Rendering (Clipped to Sub-Grid Box)
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();

      visibleTraces.forEach((trace) => {
        const data = signalsMap.get(trace.signalName);
        if (!data || data.length === 0 || timeData.length === 0) return;

        const rawColor = trace.color || WAVEFORM_COLORS[0];
        const curveColor = resolveWaveformColor(rawColor, !isLightMode);
        const count = Math.min(timeData.length, data.length);
        const step = Math.max(1, Math.floor(count / sw / 2));
        const gain = trace.gain ?? 1.0;
        const offset = trace.offset ?? 0.0;

        ctx.beginPath();
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';

        let started = false;
        for (let i = 0; i < count; i += step) {
          const t = timeData[i];
          const rawV = data[i];
          if (!Number.isFinite(rawV)) continue;

          const v = (rawV * gain) + offset;
          const px = sx + ((t - tMin) / (tMax - tMin)) * sw;
          const py = sy + sh - ((v - yMin) / (yMax - yMin)) * sh;

          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      });

      ctx.restore();
    });

    // 4. Synchronized X-Axis Time Numbers (Bottom of Lowest Sub-Grid)
    const lowestGrid = subGrids[subGrids.length - 1];
    if (lowestGrid) {
      ctx.font = '8.5px monospace';
      ctx.fillStyle = isLightMode ? '#1e293b' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i <= numDivX; i++) {
        const gx = lowestGrid.x + (lowestGrid.w / numDivX) * i;
        const t = tMin + (i / numDivX) * (tMax - tMin);
        ctx.fillText(`${t.toFixed(2)}s`, gx, lowestGrid.y + lowestGrid.h + 4);
      }
    }

    // 5. Interactive Sub-Grid Legend Badges
    if (showLegend && traces.length > 0) {
      const legendItems = PolyGraphManager.getPolyGraphLegendItems(comp, signalsMap, allComponents);

      for (const item of legendItems) {
        const { trace, x: lx, y: ly, w: lw, h: lh, valueStr, color, visible } = item;
        const effectiveColor = resolveWaveformColor(color, !isLightMode);

        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, 3);
        ctx.fillStyle = visible
          ? (isLightMode ? 'rgba(241, 245, 249, 0.95)' : 'rgba(15, 23, 42, 0.88)')
          : (isLightMode ? 'rgba(241, 245, 249, 0.55)' : 'rgba(15, 23, 42, 0.4)');
        ctx.fill();
        ctx.strokeStyle = visible ? effectiveColor : (isLightMode ? '#cbd5e1' : 'rgba(71, 85, 105, 0.4)');
        ctx.lineWidth = visible ? 1.0 : 0.8;
        ctx.stroke();

        // Color Swatch
        ctx.beginPath();
        ctx.rect(lx + 3, ly + 3, 5, 8);
        ctx.fillStyle = visible ? effectiveColor : 'rgba(71, 85, 105, 0.5)';
        ctx.fill();

        // Label + Readout
        ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = visible ? (isLightMode ? '#0f172a' : '#f8fafc') : '#64748b';

        const labelStr = trace.label.length > 8 ? `${trace.label.substring(0, 7)}…` : trace.label;
        ctx.fillText(labelStr, lx + 11, ly + lh / 2);

        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = visible ? effectiveColor : '#64748b';
        ctx.fillText(valueStr, lx + lw - 3, ly + lh / 2);
      }
    }

    // 6. Synchronized Crosshair Cursor Rendering
    const effectiveCrosshairTime = (syncCrosshairTime !== undefined && syncCrosshairTime !== null)
      ? syncCrosshairTime
      : (typeof comp.params?.crosshairTime === 'number' ? comp.params.crosshairTime : null);

    if (hoverWorldPos || effectiveCrosshairTime !== null) {
      const hwX = hoverWorldPos ? hoverWorldPos.x : 0;
      const hwY = hoverWorldPos ? hoverWorldPos.y : 0;
      const crosshair = PolyGraphManager.calculateCrosshairAt(comp, hwX, hwY, traces, signalsMap, syncCrosshairTime);

      if (crosshair && (crosshair.inBounds || effectiveCrosshairTime !== null)) {
        ctx.save();

        // Vertical Synchronized Crosshair Guideline across all sub-grids
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.moveTo(crosshair.cursorX, crosshair.topY);
        ctx.lineTo(crosshair.cursorX, crosshair.bottomY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Render Marker Dots and Readout Tooltips for Each Active Trace
        crosshair.markers.forEach((m) => {
          const { markerX, markerY, color, valueStr, unitStr, trace } = m;
          const sg = subGrids[m.subGridIndex];
          if (!sg) return;

          // Clip marker to its sub-grid height
          const clampedY = Math.max(sg.y, Math.min(sg.y + sg.h, markerY));

          // Outer Glow Circle
          ctx.beginPath();
          ctx.arc(markerX, clampedY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fill();

          // Core Dot
          const effectiveColor = resolveWaveformColor(color, !isLightMode);
          ctx.beginPath();
          ctx.arc(markerX, clampedY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = effectiveColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Tooltip Tag next to marker
          const tooltipText = `${trace.label}: ${valueStr} ${unitStr}`.trim();
          ctx.font = 'bold 8.5px monospace';
          const textWidth = ctx.measureText(tooltipText).width;
          const pillW = textWidth + 8;
          const pillH = 14;

          const pillX = markerX + 8 + pillW > sg.x + sg.w ? markerX - pillW - 8 : markerX + 8;
          const pillY = Math.max(sg.y + 2, Math.min(sg.y + sg.h - pillH - 2, clampedY - pillH / 2));

          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 3);
          ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 14, 23, 0.92)';
          ctx.fill();
          ctx.strokeStyle = effectiveColor;
          ctx.lineWidth = 1.0;
          ctx.stroke();

          ctx.fillStyle = isLightMode ? '#0f172a' : '#f8fafc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(tooltipText, pillX + 4, pillY + pillH / 2);
        });

        // Time Footer Badge at Bottom of Crosshair
        const timeBadgeText = `t = ${crosshair.time.toFixed(4)}s`;
        ctx.font = 'bold 8.5px monospace';
        const tbW = ctx.measureText(timeBadgeText).width + 8;
        const tbH = 14;
        const tbX = Math.max(x + 4, Math.min(x + w - tbW - 4, crosshair.cursorX - tbW / 2));
        const tbY = crosshair.bottomY + 3;

        ctx.beginPath();
        ctx.roundRect(tbX, tbY, tbW, tbH, 3);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeBadgeText, tbX + tbW / 2, tbY + tbH / 2);

        ctx.restore();
      }
    }

    // 7. Selected CAD Resize Handles
    if (isSelected) {
      const handles = GraphFrameRenderer.getResizeHandles(comp);
      ctx.save();
      for (const hnd of handles) {
        ctx.beginPath();
        ctx.rect(hnd.x - 4, hnd.y - 4, 8, 8);
        ctx.fillStyle = '#388bfd';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
