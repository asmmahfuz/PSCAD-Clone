/**
 * PSCAD CLONE - Canvas-Embedded Graph Frame Waveform Export Engine (TypeScript)
 * Phase 18 - Step 18.4: Graph Frame Context Menu & Waveform Export
 *
 * Implements high-performance export toolsets:
 * - Time-series tabular CSV generation matching IEEE COMTRADE / PSCAD table structure
 * - Metadata header comments (Title, Date, Samples, Channels, Units)
 * - Gain and offset scaling with visibility filtering
 * - High-resolution offscreen PNG image rasterization (2x / 3x scale)
 * - Clipboard image copy via Async Clipboard API & direct image download
 */

import type { CircuitComponentData } from '../types';
import { GraphBindingManager, type BoundTrace } from '../components/canvas/GraphBinding';
import { GraphFrameRenderer } from '../components/canvas/GraphFrame';
import { PolyGraphManager } from '../components/canvas/PolyGraphView';

export interface CSVExportOptions {
  /** Optional custom filename */
  filename?: string;
  /** Include comment header lines starting with '#' */
  includeHeaders?: boolean;
  /** COMTRADE microsecond time format flag */
  comtradeFormat?: boolean;
  /** Sub-sampling step (1 = all samples) */
  step?: number;
}

export class WaveformExportManager {
  /**
   * Generate IEEE COMTRADE / PSCAD compatible CSV string from a Graph Frame or PolyGraph
   */
  static generateGraphCSV(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = [],
    options: CSVExportOptions = {}
  ): string {
    const includeHeaders = options.includeHeaders !== false;
    const isPolyGraph = PolyGraphManager.isPolyGraphMode(comp);
    const title = comp.params?.graphTitle || comp.name || 'Graph_Frame';
    const traces: BoundTrace[] = GraphBindingManager.resolveTracesForFrame(comp, allComponents, signalsMap);
    const visibleTraces = traces.filter((t) => t.visible);

    const timeData = signalsMap.get('Time') || [];
    let maxSamples = timeData.length;

    // Find max sample count across all visible signals if time array is missing
    if (maxSamples === 0) {
      for (const tr of visibleTraces) {
        const d = signalsMap.get(tr.signalName);
        if (d && d.length > maxSamples) maxSamples = d.length;
      }
    }

    if (maxSamples === 0) {
      // Return empty template if no simulation data exists yet
      const headerLine = `Time (s),${visibleTraces.map((t) => `${t.label}${t.unit ? ` (${t.unit})` : ''}`).join(',')}`;
      if (!includeHeaders) return headerLine;
      return [
        `# PSCAD CLONE EMT Simulation Waveform Export`,
        `# Frame Title: ${title}`,
        `# Export Date: ${new Date().toISOString()}`,
        `# Mode: ${isPolyGraph ? 'PolyGraph (Stacked)' : 'Overlay'}`,
        `# Total Samples: 0`,
        `# Active Channels: ${visibleTraces.length}`,
        headerLine,
      ].join('\r\n');
    }

    const lines: string[] = [];

    // 1. Header Metadata Comments (PSCAD / COMTRADE Style)
    if (includeHeaders) {
      lines.push('# PSCAD CLONE EMT Simulation Waveform Export');
      lines.push(`# Frame Title: ${title}`);
      lines.push(`# Export Date: ${new Date().toISOString()}`);
      lines.push(`# Mode: ${isPolyGraph ? 'PolyGraph (Stacked)' : 'Overlay'}`);
      lines.push(`# Total Samples: ${maxSamples}`);
      lines.push(`# Channels (${visibleTraces.length}): ${visibleTraces.map((t) => `${t.label} [${t.unit || 'p.u.'}]`).join(', ')}`);
    }

    // 2. Column Headers
    if (options.comtradeFormat) {
      const chHeaders = visibleTraces.map((t) => `${t.signalName}_${t.unit || 'pu'}`).join(',');
      lines.push(`Sample,Time_us,${chHeaders}`);
    } else {
      const colHeaders = ['Time (s)'];
      for (const tr of visibleTraces) {
        const unitStr = tr.unit ? ` (${tr.unit})` : '';
        colHeaders.push(`${tr.label}${unitStr}`);
      }
      lines.push(colHeaders.join(','));
    }

    // 3. Tabular Data Rows
    const step = Math.max(1, options.step || 1);
    const dtFallback = 5e-5; // 50 microseconds default EMTDC step

    for (let i = 0; i < maxSamples; i += step) {
      const t = timeData.length > i ? timeData[i] : i * dtFallback;
      const row: string[] = [];

      if (options.comtradeFormat) {
        row.push(String(i + 1));
        row.push((t * 1e6).toFixed(2));
      } else {
        row.push(t.toFixed(8));
      }

      for (const tr of visibleTraces) {
        const data = signalsMap.get(tr.signalName);
        if (data && i < data.length) {
          const raw = data[i];
          if (Number.isFinite(raw)) {
            const gain = tr.gain ?? 1.0;
            const offset = tr.offset ?? 0.0;
            const val = (raw * gain) + offset;
            row.push(val.toFixed(6));
          } else {
            row.push('0.000000');
          }
        } else {
          row.push('0.000000');
        }
      }

      lines.push(row.join(','));
    }

    return lines.join('\r\n');
  }

  /**
   * Browser Blob CSV File Downloader
   */
  static downloadCSV(csvContent: string, defaultFilename = 'waveform_data.csv'): void {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', defaultFilename.endsWith('.csv') ? defaultFilename : `${defaultFilename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to trigger CSV download:', err);
    }
  }

  /**
   * Render Graph Frame onto High-Resolution Offscreen Canvas
   */
  static renderOffscreenCanvas(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = [],
    scaleMultiplier = 2.0
  ): HTMLCanvasElement {
    const bounds = GraphFrameRenderer.getBounds(comp);
    const scale = Math.max(1.0, Math.min(4.0, scaleMultiplier));

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bounds.w * scale);
    canvas.height = Math.ceil(bounds.h * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to obtain 2D rendering context for offscreen canvas');
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-bounds.x, -bounds.y);

    // Render frame in non-selected mode with crosshairs
    GraphFrameRenderer.render(
      ctx,
      comp,
      {},
      signalsMap,
      false, // isSelected = false for clean export
      allComponents,
      null
    );

    ctx.restore();
    return canvas;
  }

  /**
   * Copy High-Resolution PNG directly to Operating System Clipboard
   */
  static async copyGraphToClipboardPNG(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = [],
    scaleMultiplier = 2.0
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (typeof window === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
        return {
          success: false,
          message: 'Clipboard image copy is not supported in this browser environment.',
        };
      }

      const canvas = WaveformExportManager.renderOffscreenCanvas(comp, signalsMap, allComponents, scaleMultiplier);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
      });

      if (!blob) {
        return { success: false, message: 'Failed to generate PNG image blob.' };
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      return {
        success: true,
        message: `High-Res Image (${canvas.width}x${canvas.height}) copied to clipboard!`,
      };
    } catch (err: any) {
      console.warn('Clipboard write failed:', err);
      return {
        success: false,
        message: `Clipboard copy error: ${err.message || 'Permission denied'}`,
      };
    }
  }

  /**
   * Direct High-Resolution PNG Image File Downloader
   */
  static downloadGraphPNG(
    comp: CircuitComponentData,
    signalsMap: Map<string, number[]> = new Map(),
    allComponents: CircuitComponentData[] = [],
    scaleMultiplier = 2.0,
    defaultFilename?: string
  ): void {
    try {
      const canvas = WaveformExportManager.renderOffscreenCanvas(comp, signalsMap, allComponents, scaleMultiplier);
      const title = comp.params?.graphTitle || comp.name || 'graph_frame';
      const cleanName = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = defaultFilename || `${cleanName}_${Date.now()}.png`;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.setAttribute('href', dataUrl);
      link.setAttribute('download', filename.endsWith('.png') ? filename : `${filename}.png`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download graph PNG:', err);
    }
  }
}
