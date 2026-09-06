/**
 * PSCAD CLONE - Canvas-Embedded Graph Frame Renderer & Handle Math (TypeScript)
 * Phase 18 - Step 18.2: Output Channel / Probe Curve Binding & Overlay Legend
 */

import type { CircuitComponentData, Point } from '../../types';
import { WAVEFORM_COLORS, resolveWaveformColor } from '../../constants';
import { GraphBindingManager, type BoundTrace, type LegendItemGeometry } from './GraphBinding';
import { PolyGraphManager, PolyGraphRenderer } from './PolyGraphView';

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

export interface HandleInfo {
  type: ResizeHandle;
  x: number;
  y: number;
  cursor: string;
}

export class GraphFrameRenderer {
  public static readonly DEFAULT_WIDTH = 360;
  public static readonly DEFAULT_HEIGHT = 200;
  public static readonly HEADER_HEIGHT = 26;
  public static readonly MARGIN_LEFT = 52;
  public static readonly MARGIN_RIGHT = 14;
  public static readonly MARGIN_BOTTOM = 22;
  public static readonly MARGIN_TOP = 26;

  /**
   * Get bounding box in world coordinates
   */
  static getBounds(comp: CircuitComponentData): { x: number; y: number; w: number; h: number } {
    const w = comp.params?.graphWidth || GraphFrameRenderer.DEFAULT_WIDTH;
    const h = comp.params?.graphHeight || GraphFrameRenderer.DEFAULT_HEIGHT;
    return {
      x: comp.x,
      y: comp.y,
      w,
      h,
    };
  }

  /**
   * Get 8 resize handles for the graph frame in world coordinates
   */
  static getResizeHandles(comp: CircuitComponentData): HandleInfo[] {
    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const halfW = w / 2;
    const halfH = h / 2;

    return [
      { type: 'nw', x, y, cursor: 'nwse-resize' },
      { type: 'n', x: x + halfW, y, cursor: 'ns-resize' },
      { type: 'ne', x: x + w, y, cursor: 'nesw-resize' },
      { type: 'e', x: x + w, y: y + halfH, cursor: 'ew-resize' },
      { type: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
      { type: 's', x: x + halfW, y: y + h, cursor: 'ns-resize' },
      { type: 'sw', x, y: y + h, cursor: 'nesw-resize' },
      { type: 'w', x, y: y + halfH, cursor: 'ew-resize' },
    ];
  }

  /**
   * Hit test for resize handles
   */
  static getResizeHandleAt(
    comp: CircuitComponentData,
    wx: number,
    wy: number,
    hitRadius = 8
  ): HandleInfo | null {
    const handles = GraphFrameRenderer.getResizeHandles(comp);
    for (const handle of handles) {
      if (Math.hypot(handle.x - wx, handle.y - wy) <= hitRadius) {
        return handle;
      }
    }
    return null;
  }

  /**
   * Calculate bounding geometry and status for all interactive legend items
   */
  static getLegendItems(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = []
  ): LegendItemGeometry[] {
    if (PolyGraphManager.isPolyGraphMode(comp)) {
      return PolyGraphManager.getPolyGraphLegendItems(comp, signalsMap, allComponents);
    }

    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const plotX = x + GraphFrameRenderer.MARGIN_LEFT;
    const plotY = y + GraphFrameRenderer.MARGIN_TOP;
    const plotW = Math.max(10, w - GraphFrameRenderer.MARGIN_LEFT - GraphFrameRenderer.MARGIN_RIGHT);
    const plotH = Math.max(10, h - GraphFrameRenderer.MARGIN_TOP - GraphFrameRenderer.MARGIN_BOTTOM);

    const traces = GraphBindingManager.resolveTracesForFrame(comp, allComponents, signalsMap);
    if (traces.length === 0) return [];

    const itemW = Math.min(150, Math.max(110, plotW - 16));
    const itemH = 15;
    const gap = 3;
    const items: LegendItemGeometry[] = [];

    // Max number of visible legend items before vertical clipping
    const maxItems = Math.max(1, Math.floor((plotH - 12) / (itemH + gap)));
    const renderTraces = traces.slice(0, maxItems);

    let currY = plotY + 6;
    const itemX = plotX + plotW - itemW - 6;

    for (let i = 0; i < renderTraces.length; i++) {
      const trace = renderTraces[i];
      const data = signalsMap.get(trace.signalName);
      const lastVal = data && data.length > 0 ? data[data.length - 1] : undefined;

      let valueStr = '--';
      if (lastVal !== undefined && Number.isFinite(lastVal)) {
        const scaledVal = (lastVal * (trace.gain ?? 1.0)) + (trace.offset ?? 0.0);
        valueStr = GraphFrameRenderer.formatEngValue(scaledVal);
      }

      const unitStr = trace.unit || '';

      items.push({
        trace,
        x: itemX,
        y: currY,
        w: itemW,
        h: itemH,
        valueStr,
        unitStr,
        color: trace.color,
        visible: trace.visible,
      });

      currY += itemH + gap;
    }

    return items;
  }

  /**
   * Hit test for interactive legend item clicks
   */
  static getLegendItemAt(
    comp: CircuitComponentData,
    wx: number,
    wy: number,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = []
  ): LegendItemGeometry | null {
    if (comp.params?.graphShowLegend === false) return null;
    const items = GraphFrameRenderer.getLegendItems(comp, signalsMap, allComponents);
    for (const it of items) {
      if (wx >= it.x && wx <= it.x + it.w && wy >= it.y && wy <= it.y + it.h) {
        return it;
      }
    }
    return null;
  }

  /**
   * Format numerical engineering values with SI suffixes
   */
  public static formatEngValue(val: number): string {
    if (!Number.isFinite(val)) return '--';
    if (Math.abs(val) < 1e-9) return '0.00';
    const abs = Math.abs(val);
    if (abs >= 1e9) return `${(val / 1e9).toFixed(2)}G`;
    if (abs >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(val / 1e3).toFixed(2)}k`;
    if (abs >= 1) return val.toFixed(2);
    if (abs >= 1e-3) return `${(val * 1e3).toFixed(2)}m`;
    if (abs >= 1e-6) return `${(val * 1e6).toFixed(2)}u`;
    if (abs >= 1e-9) return `${(val * 1e9).toFixed(2)}n`;
    return val.toExponential(2);
  }

  /**
   * Render the embedded Graph Frame onto the canvas context
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
    // Delegate to PolyGraph Renderer if in stacked / polygraph mode
    if (PolyGraphManager.isPolyGraphMode(comp)) {
      PolyGraphRenderer.render(ctx, comp, colors, signalsMap, isSelected, allComponents, hoverWorldPos, syncCrosshairTime);
      return;
    }

    const { x, y, w, h } = GraphFrameRenderer.getBounds(comp);
    const headerH = GraphFrameRenderer.HEADER_HEIGHT;
    const title = comp.params?.graphTitle || comp.name || 'Graph Frame';
    const showGrid = comp.params?.graphShowGrid !== false;
    const showLegend = comp.params?.graphShowLegend !== false;

    // Resolve traces
    const traces: BoundTrace[] = GraphBindingManager.resolveTracesForFrame(comp, allComponents, signalsMap);
    const visibleTraces = traces.filter((t) => t.visible);

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

    // Mini Scope Icon
    ctx.fillStyle = isLightMode ? '#0284c7' : '#38bdf8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📈', x + 8, y + headerH / 2);

    // Title Text
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isLightMode ? '#0f172a' : '#f1f5f9';
    ctx.fillText(title, x + 28, y + headerH / 2);

    // Active Channel Count Badge
    let badgeText = 'No Signal';
    if (traces.length > 0) {
      if (visibleTraces.length === traces.length) {
        badgeText = `${traces.length} Trace${traces.length > 1 ? 's' : ''}`;
      } else {
        badgeText = `${visibleTraces.length}/${traces.length} Traces`;
      }
    }

    ctx.font = '9px monospace';
    ctx.fillStyle = visibleTraces.length > 0 ? (isLightMode ? '#0284c7' : '#38bdf8') : '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(badgeText, x + w - 10, y + headerH / 2);

    // 3. Inner Plot Area Geometry
    const plotX = x + GraphFrameRenderer.MARGIN_LEFT;
    const plotY = y + GraphFrameRenderer.MARGIN_TOP;
    const plotW = Math.max(10, w - GraphFrameRenderer.MARGIN_LEFT - GraphFrameRenderer.MARGIN_RIGHT);
    const plotH = Math.max(10, h - GraphFrameRenderer.MARGIN_TOP - GraphFrameRenderer.MARGIN_BOTTOM);

    // Plot Background
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.fillStyle = isLightMode ? '#f8fafc' : '#05070c';
    ctx.fill();
    ctx.strokeStyle = isLightMode ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Grid Subdivisions & Axes
    const numDivX = 5;
    const numDivY = 4;

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = isLightMode ? 'rgba(203, 213, 225, 0.8)' : 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);

      // Vertical Grid Lines
      for (let i = 1; i < numDivX; i++) {
        const gx = plotX + (plotW / numDivX) * i;
        ctx.beginPath();
        ctx.moveTo(gx, plotY);
        ctx.lineTo(gx, plotY + plotH);
        ctx.stroke();
      }

      // Horizontal Grid Lines
      for (let i = 1; i < numDivY; i++) {
        const gy = plotY + (plotH / numDivY) * i;
        ctx.beginPath();
        ctx.moveTo(plotX, gy);
        ctx.lineTo(plotX + plotW, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Data Extraction & Scaling (across VISIBLE traces only)
    const timeData = signalsMap.get('Time') || [];
    let tMin = 0;
    let tMax = timeData.length > 0 ? timeData[timeData.length - 1] : 0.5;
    if (tMax <= tMin) tMax = 0.5;

    let yMin = -1.0;
    let yMax = 1.0;

    if (comp.params?.graphYRange && comp.params.graphYRange[0] < comp.params.graphYRange[1]) {
      [yMin, yMax] = comp.params.graphYRange;
    } else {
      // Auto-scale from visible active signals
      let hasData = false;
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (const trace of visibleTraces) {
        const data = signalsMap.get(trace.signalName);
        if (data && data.length > 0) {
          hasData = true;
          const gain = trace.gain ?? 1.0;
          const offset = trace.offset ?? 0.0;
          for (let i = 0; i < data.length; i++) {
            const rawV = data[i];
            if (Number.isFinite(rawV)) {
              const v = (rawV * gain) + offset;
              if (v < minVal) minVal = v;
              if (v > maxVal) maxVal = v;
            }
          }
        }
      }

      if (hasData && minVal < maxVal) {
        const span = maxVal - minVal;
        const pad = span * 0.1 || 1.0;
        yMin = minVal - pad;
        yMax = maxVal + pad;
      }
    }

    // Zero-Axis Line if zero is in range
    if (yMin < 0 && yMax > 0) {
      const zeroY = plotY + plotH - ((0 - yMin) / (yMax - yMin)) * plotH;
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotX, zeroY);
      ctx.lineTo(plotX + plotW, zeroY);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Y-Axis Numbers (Left)
    ctx.font = '8.5px monospace';
    ctx.fillStyle = isLightMode ? '#1e293b' : '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numDivY; i++) {
      const gy = plotY + (plotH / numDivY) * i;
      const v = yMax - (i / numDivY) * (yMax - yMin);
      ctx.fillText(GraphFrameRenderer.formatEngValue(v), plotX - 4, gy);
    }

    // 7. X-Axis Numbers (Bottom)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isLightMode ? '#1e293b' : '#94a3b8';
    for (let i = 0; i <= numDivX; i++) {
      const gx = plotX + (plotW / numDivX) * i;
      const t = tMin + (i / numDivX) * (tMax - tMin);
      ctx.fillText(`${t.toFixed(2)}s`, gx, plotY + plotH + 4);
    }

    // 8. Waveform Curves Rendering (Clipped to Plot Box)
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    visibleTraces.forEach((trace) => {
      const data = signalsMap.get(trace.signalName);
      if (!data || data.length === 0 || timeData.length === 0) return;

      const rawColor = trace.color || WAVEFORM_COLORS[0];
      const curveColor = resolveWaveformColor(rawColor, !isLightMode);
      const count = Math.min(timeData.length, data.length);
      const step = Math.max(1, Math.floor(count / plotW / 2)); // Subsample for 60fps performance
      const gain = trace.gain ?? 1.0;
      const offset = trace.offset ?? 0.0;

      ctx.beginPath();
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';

      let started = false;
      for (let i = 0; i < count; i += step) {
        const t = timeData[i];
        const rawV = data[i];
        if (!Number.isFinite(rawV)) continue;

        const v = (rawV * gain) + offset;
        const px = plotX + ((t - tMin) / (tMax - tMin)) * plotW;
        const py = plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

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

    // 9. Interactive Legend Badges (Top-Right inside Plot Area)
    if (showLegend && traces.length > 0) {
      const legendItems = GraphFrameRenderer.getLegendItems(comp, signalsMap, allComponents);

      for (const item of legendItems) {
        const { trace, x: lx, y: ly, w: lw, h: lh, valueStr, unitStr, color, visible } = item;
        const effectiveColor = resolveWaveformColor(color, !isLightMode);

        // Container background pill
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, 3);
        ctx.fillStyle = visible
          ? (isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.88)')
          : (isLightMode ? 'rgba(241, 245, 249, 0.55)' : 'rgba(15, 23, 42, 0.45)');
        ctx.fill();
        ctx.strokeStyle = visible ? effectiveColor : (isLightMode ? '#cbd5e1' : 'rgba(71, 85, 105, 0.4)');
        ctx.lineWidth = visible ? 1.0 : 0.8;
        ctx.stroke();

        // Color indicator swatch
        ctx.beginPath();
        ctx.rect(lx + 4, ly + 3.5, 7, 8);
        ctx.fillStyle = visible ? effectiveColor : 'rgba(71, 85, 105, 0.5)';
        ctx.fill();
        if (visible) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // Trace Label + Unit Tag
        ctx.font = 'bold 8.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = visible ? (isLightMode ? '#0f172a' : '#f8fafc') : '#64748b';

        const unitTag = unitStr ? ` [${unitStr}]` : '';
        const maxLabelChars = lw < 130 ? 9 : 14;
        const truncatedLabel = trace.label.length > maxLabelChars ? `${trace.label.substring(0, maxLabelChars)}…` : trace.label;
        const displayLabel = `${truncatedLabel}${unitTag}`;
        ctx.fillText(displayLabel, lx + 15, ly + lh / 2);

        // Real-time Value Readout (Right-aligned)
        ctx.font = '8.5px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = visible ? effectiveColor : '#64748b';
        ctx.fillText(`[${valueStr}]`, lx + lw - 4, ly + lh / 2);
      }
    }

    // 10. Synchronized Crosshair Cursor for Overlay Mode
    const effectiveCrosshairTime = (syncCrosshairTime !== undefined && syncCrosshairTime !== null)
      ? syncCrosshairTime
      : (typeof comp.params?.crosshairTime === 'number' ? comp.params.crosshairTime : null);

    const hwX = hoverWorldPos ? hoverWorldPos.x : 0;
    const hwY = hoverWorldPos ? hoverWorldPos.y : 0;
    const inBounds = hwX >= plotX && hwX <= plotX + plotW && hwY >= plotY && hwY <= plotY + plotH;

    if (inBounds || effectiveCrosshairTime !== null) {
      let targetTime = 0;
      let cursorX = plotX;

      if (effectiveCrosshairTime !== null) {
        targetTime = Math.max(tMin, Math.min(tMax, effectiveCrosshairTime));
        cursorX = plotX + ((targetTime - tMin) / Math.max(1e-6, tMax - tMin)) * plotW;
      } else {
        cursorX = Math.max(plotX, Math.min(plotX + plotW, hwX));
        targetTime = tMin + ((cursorX - plotX) / Math.max(1e-6, plotW)) * (tMax - tMin);
      }

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.moveTo(cursorX, plotY);
      ctx.lineTo(cursorX, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marker Dots & Badges
      visibleTraces.forEach((trace) => {
        const data = signalsMap.get(trace.signalName);
        if (!data || data.length === 0 || timeData.length === 0) return;

        const count = Math.min(timeData.length, data.length);
        let interpVal = data[0];

        if (targetTime <= timeData[0]) {
          interpVal = data[0];
        } else if (targetTime >= timeData[count - 1]) {
          interpVal = data[count - 1];
        } else {
          let low = 0;
          let high = count - 1;
          while (low <= high) {
            const mid = (low + high) >> 1;
            if (timeData[mid] < targetTime) low = mid + 1;
            else high = mid - 1;
          }
          const i0 = Math.max(0, low - 1);
          const i1 = Math.min(count - 1, low);
          const frac = i0 === i1 || timeData[i1] === timeData[i0] ? 0 : (targetTime - timeData[i0]) / (timeData[i1] - timeData[i0]);
          interpVal = data[i0] + frac * (data[i1] - data[i0]);
        }

        const gain = trace.gain ?? 1.0;
        const offset = trace.offset ?? 0.0;
        const scaledVal = (interpVal * gain) + offset;
        const py = plotY + plotH - ((scaledVal - yMin) / (yMax - yMin)) * plotH;
        const clampedY = Math.max(plotY, Math.min(plotY + plotH, py));

        // Dot
        ctx.beginPath();
        ctx.arc(cursorX, clampedY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = trace.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      });

      // Bottom Time Tag
      const timeTag = `t = ${targetTime.toFixed(4)}s`;
      ctx.font = 'bold 8.5px monospace';
      const ttW = ctx.measureText(timeTag).width + 8;
      const ttH = 14;
      const ttX = Math.max(x + 4, Math.min(x + w - ttW - 4, cursorX - ttW / 2));
      const ttY = plotY + plotH + 3;

      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttW, ttH, 3);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeTag, ttX + ttW / 2, ttY + ttH / 2);

      ctx.restore();
    }

    // 11. Selected CAD Resize Handles
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

  /**
   * Set custom Y-axis min/max limits on a Graph Frame
   */
  static setAxisLimits(comp: CircuitComponentData, yMin: number, yMax: number): CircuitComponentData {
    if (yMin >= yMax) return comp;
    return {
      ...comp,
      params: {
        ...comp.params,
        graphYRange: [yMin, yMax],
        autoScale: false,
      },
    };
  }

  /**
   * Reset Graph Frame to dynamic Y-axis auto-scaling
   */
  static setAutoScaleY(comp: CircuitComponentData): CircuitComponentData {
    const nextParams = { ...comp.params };
    delete nextParams.graphYRange;
    nextParams.autoScale = true;
    return {
      ...comp,
      params: nextParams,
    };
  }

  /**
   * Clear all bound traces and signals from Graph Frame
   */
  static clearWaveforms(comp: CircuitComponentData): CircuitComponentData {
    return {
      ...comp,
      params: {
        ...comp.params,
        traces: [],
        graphSignals: [],
        graphHiddenSignals: [],
      },
    };
  }

  /**
   * Convert Graph Frame to Stacked PolyGraph mode
   */
  static convertToPolyGraph(comp: CircuitComponentData, numSubGrids = 2): CircuitComponentData {
    const targetGrids = Math.max(2, Math.min(4, numSubGrids));
    return {
      ...comp,
      params: {
        ...comp.params,
        graphMode: 'polygraph',
        isPolyGraph: true,
        numSubGrids: targetGrids,
        graphHeight: Math.max(260, (comp.params?.graphHeight || 200) * 1.3),
      },
    };
  }

  /**
   * Convert PolyGraph back to Single Overlay Graph mode
   */
  static convertToOverlayGraph(comp: CircuitComponentData): CircuitComponentData {
    const nextParams = { ...comp.params };
    delete nextParams.graphMode;
    delete nextParams.isPolyGraph;
    delete nextParams.numSubGrids;
    delete nextParams.subGrids;
    return {
      ...comp,
      params: nextParams,
    };
  }

  /**
   * Toggle coordinate grid visibility
   */
  static toggleGrid(comp: CircuitComponentData): CircuitComponentData {
    const current = comp.params?.graphShowGrid !== false;
    return {
      ...comp,
      params: {
        ...comp.params,
        graphShowGrid: !current,
      },
    };
  }

  /**
   * Toggle interactive legend visibility
   */
  static toggleLegend(comp: CircuitComponentData): CircuitComponentData {
    const current = comp.params?.graphShowLegend !== false;
    return {
      ...comp,
      params: {
        ...comp.params,
        graphShowLegend: !current,
      },
    };
  }
}

