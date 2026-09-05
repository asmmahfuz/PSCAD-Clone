import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Download, Camera, Layers, Activity, BarChart2, Zap, HardDrive,
  GitCompare, ExternalLink
} from 'lucide-react';
import { WAVEFORM_COLORS } from '../../constants';
import { EmtdcOutputReader, type EmtdcDataset, type WaveformComparisonMetric } from '../../interop/outReader';
import { telemetryStreamer } from '../../services/telemetryStreamer';
import { FftEngine, type DetailedFftResult, type WindowType } from '../../analysis/fftEngine';

import { XYPlotter } from './XYPlotter';
import { GpuWaveformRenderer } from './GpuWaveformRenderer';
import type { ThemeType } from '../../types';

interface OscilloscopeProps {
  theme: ThemeType;
  signals: Map<string, number[]>;
  tMax: number;
  onOpenComtradeModal?: () => void;
  onDetachWindow?: () => void;
  externalCrosshairTime?: number | null;
  onCursorChange?: (cursorData: {
    c1?: { enabled: boolean; t: number };
    c2?: { enabled: boolean; t: number };
    crosshairTime?: number | null;
  }) => void;
}

export type ScopeViewMode = 'single' | 'multitrack' | 'xy' | 'harmonic' | 'webgpu' | 'emtdc_compare';

export const OscilloscopeView: React.FC<OscilloscopeProps> = ({
  theme,
  signals,
  tMax,
  onOpenComtradeModal,
  onDetachWindow,
  externalCrosshairTime,
  onCursorChange,
}) => {
  const [viewMode, setViewMode] = useState<ScopeViewMode>('single');
  const [numTracks, setNumTracks] = useState<number>(3);
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());
  const [fftChannel, setFftChannel] = useState<string>('');

  // FFT Analysis State
  const [fftWindow, setFftWindow] = useState<WindowType>('hanning');
  const [fftTargetF0, setFftTargetF0] = useState<number | 'auto'>('auto');
  const [fftDbScale, setFftDbScale] = useState<boolean>(false);
  const [hoverHarmonicOrder, setHoverHarmonicOrder] = useState<number | null>(null);

  // Dual Cursors
  const [c1, setC1] = useState<{ enabled: boolean; t: number }>({ enabled: false, t: 0.1 });
  const [c2, setC2] = useState<{ enabled: boolean; t: number }>({ enabled: false, t: 0.2 });
  const [draggingCursor, setDraggingCursor] = useState<'c1' | 'c2' | null>(null);
  const [internalHoverT, setInternalHoverT] = useState<number | null>(null);

  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [timeZoom, setTimeZoom] = useState<{ tStart: number; tEnd: number }>({ tStart: 0, tEnd: tMax });

  // EMTDC Reference Comparison state
  const [emtdcDataset, setEmtdcDataset] = useState<EmtdcDataset | null>(null);
  const [compareChannel, setCompareChannel] = useState<string>('');
  const [comparisonMetric, setComparisonMetric] = useState<WaveformComparisonMetric | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync available channels and zoom
  useEffect(() => {
    const names = Array.from(signals.keys()).filter((k) => k !== 'Time');
    if (activeChannels.size === 0 && names.length > 0) {
      setActiveChannels(new Set(names));
    }
    if (!fftChannel && names.length > 0) {
      setFftChannel(names[0]);
    }
    if (!compareChannel && names.length > 0) {
      setCompareChannel(names[0]);
    }
  }, [signals, activeChannels.size, fftChannel, compareChannel]);

  useEffect(() => {
    setTimeZoom((prev) => ({ tStart: 0, tEnd: Math.max(prev.tEnd, tMax) }));
  }, [tMax]);

  // Compute live EMTDC comparison metrics
  useEffect(() => {
    if (!emtdcDataset || !compareChannel) return;
    const simTimes = signals.get('Time') || [];
    const simVals = signals.get(compareChannel) || [];
    const refTimes = emtdcDataset.time;
    const refVals =
      emtdcDataset.signals.get(compareChannel) ||
      (emtdcDataset.channels[1] ? emtdcDataset.signals.get(emtdcDataset.channels[1].name) : undefined) ||
      [];

    if (simTimes.length > 0 && refTimes.length > 0 && simVals.length > 0 && refVals.length > 0) {
      const metric = EmtdcOutputReader.compare(simTimes, simVals, refTimes, refVals, compareChannel);
      setComparisonMetric(metric);
    }
  }, [emtdcDataset, compareChannel, signals]);

  const toggleChannel = (name: string) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleLoadBenchmarkRef = (type: 'TRANSMISSION_FAULT' | 'XFMR_INRUSH') => {
    const benchmark = EmtdcOutputReader.generateBenchmarkStream(type);
    const parsed = EmtdcOutputReader.parse(benchmark.inf, benchmark.out, `EMTDC_${type}_Reference`);
    setEmtdcDataset(parsed);
    setViewMode('emtdc_compare');
  };

  // Compute live FFT result
  const fftResult: DetailedFftResult | null = useMemo(() => {
    if (viewMode !== 'harmonic' || !fftChannel) return null;
    const times = signals.get('Time') || [];
    const vals = signals.get(fftChannel) || [];
    if (times.length < 32 || vals.length < 32) return null;

    return FftEngine.analyze(times, vals, {
      targetF0: fftTargetF0,
      windowType: fftWindow,
      maxOrder: 35,
    });
  }, [viewMode, fftChannel, signals, fftTargetF0, fftWindow]);

  // Compute live Differential Delta Cursors data
  const deltaData = useMemo(() => {
    if (!c1.enabled || !c2.enabled) return null;
    const times = signals.get('Time') || [];
    if (times.length < 2) return null;

    const dtVal = Math.abs(c2.t - c1.t);
    const dtMs = dtVal * 1000;
    const dtFormatted = dtMs < 1 ? `${(dtMs * 1000).toFixed(1)} µs` : `${dtMs.toFixed(3)} ms`;
    const freqHz = dtVal > 1e-9 ? 1.0 / dtVal : 0;
    const freqFormatted = freqHz >= 1000 ? `${(freqHz / 1000).toFixed(2)} kHz` : `${freqHz.toFixed(1)} Hz`;

    const getValAtT = (vals: number[], t: number) => {
      if (vals.length === 0) return 0;
      let low = 0;
      let high = times.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (times[mid] < t) low = mid + 1;
        else high = mid - 1;
      }
      const i0 = Math.max(0, low - 1);
      const i1 = Math.min(times.length - 1, low);
      if (i0 === i1 || times[i1] === times[i0]) return vals[i0] ?? 0;
      const frac = (t - times[i0]) / (times[i1] - times[i0]);
      return (vals[i0] ?? 0) + frac * ((vals[i1] ?? 0) - (vals[i0] ?? 0));
    };

    const channelDeltas: {
      name: string;
      v1: number;
      v2: number;
      dv: number;
      slewRate: number;
    }[] = [];

    for (const ch of activeChannels) {
      const vals = signals.get(ch) || [];
      if (vals.length > 0) {
        const v1 = getValAtT(vals, c1.t);
        const v2 = getValAtT(vals, c2.t);
        const dv = v2 - v1;
        const slewRate = dtVal > 1e-9 ? (c2.t >= c1.t ? dv / dtVal : -dv / dtVal) : 0;
        channelDeltas.push({ name: ch, v1, v2, dv, slewRate });
      }
    }

    return {
      dtVal,
      dtFormatted,
      freqFormatted,
      channelDeltas,
    };
  }, [c1, c2, signals, activeChannels]);

  // Cursor Snapping utilities
  const snapToZeroCrossing = (targetCursor: 'c1' | 'c2') => {
    const times = signals.get('Time') || [];
    const primaryChannel =
      Array.from(activeChannels)[0] ||
      fftChannel ||
      Array.from(signals.keys()).find((k) => k !== 'Time');
    if (!primaryChannel) return;
    const vals = signals.get(primaryChannel) || [];
    if (times.length < 2 || vals.length < 2) return;

    const currentT = targetCursor === 'c1' ? c1.t : c2.t;
    let bestT = currentT;
    let minDiff = Infinity;

    for (let i = 1; i < vals.length; i++) {
      if ((vals[i - 1] <= 0 && vals[i] >= 0) || (vals[i - 1] >= 0 && vals[i] <= 0)) {
        const t0 = times[i - 1];
        const t1 = times[i];
        const v0 = vals[i - 1];
        const v1 = vals[i];
        const tZero = v1 !== v0 ? t0 - (v0 * (t1 - t0)) / (v1 - v0) : t0;
        const diff = Math.abs(tZero - currentT);
        if (diff < minDiff) {
          minDiff = diff;
          bestT = tZero;
        }
      }
    }

    if (targetCursor === 'c1') {
      setC1((prev) => {
        const next = { ...prev, t: bestT };
        onCursorChange?.({ c1: next, c2, crosshairTime: bestT });
        return next;
      });
    } else {
      setC2((prev) => {
        const next = { ...prev, t: bestT };
        onCursorChange?.({ c1, c2: next, crosshairTime: bestT });
        return next;
      });
    }
  };

  const snapToPeak = (targetCursor: 'c1' | 'c2') => {
    const times = signals.get('Time') || [];
    const primaryChannel =
      Array.from(activeChannels)[0] ||
      fftChannel ||
      Array.from(signals.keys()).find((k) => k !== 'Time');
    if (!primaryChannel) return;
    const vals = signals.get(primaryChannel) || [];
    if (times.length < 3 || vals.length < 3) return;

    const currentT = targetCursor === 'c1' ? c1.t : c2.t;
    let bestT = currentT;
    let minDiff = Infinity;

    for (let i = 1; i < vals.length - 1; i++) {
      const isPeak =
        (vals[i] > vals[i - 1] && vals[i] > vals[i + 1]) ||
        (vals[i] < vals[i - 1] && vals[i] < vals[i + 1]);
      if (isPeak) {
        const diff = Math.abs(times[i] - currentT);
        if (diff < minDiff) {
          minDiff = diff;
          bestT = times[i];
        }
      }
    }

    if (targetCursor === 'c1') {
      setC1((prev) => {
        const next = { ...prev, t: bestT };
        onCursorChange?.({ c1, c2, crosshairTime: bestT });
        return next;
      });
    } else {
      setC2((prev) => {
        const next = { ...prev, t: bestT };
        onCursorChange?.({ c1, c2: next, crosshairTime: bestT });
        return next;
      });
    }
  };

  const snapCyclePeriod = (f0: number = 60) => {
    const period = 1.0 / f0;
    const nextT2 = Math.min(timeZoom.tEnd, c1.t + period);
    setC2(() => {
      const next = { enabled: true, t: nextT2 };
      onCursorChange?.({ c1, c2: next, crosshairTime: nextT2 });
      return next;
    });
  };

  // Render waveforms and HUD
  const render = useCallback(() => {
    if (viewMode === 'xy') return; // Handled by XYPlotter

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isDark = theme !== 'light';

    ctx.clearRect(0, 0, width, height);

    const left = 75;
    const right = width - (viewMode === 'harmonic' ? 270 : viewMode === 'emtdc_compare' ? 240 : 20);
    const top = 25;
    const bottom = height - 35;
    const plotW = Math.max(50, right - left);
    const plotH = Math.max(50, bottom - top);

    // Background
    ctx.fillStyle = isDark ? '#0a0d14' : '#ffffff';
    ctx.fillRect(left, top, plotW, plotH);

    const times = signals.get('Time') || [];
    const tSpan = Math.max(1e-6, timeZoom.tEnd - timeZoom.tStart);
    const timeToScreen = (t: number) => left + ((t - timeZoom.tStart) / tSpan) * plotW;

    const channelNames = Array.from(signals.keys()).filter((k) => k !== 'Time' && activeChannels.has(k));

    // -------------------------------------------------------------
    // Shaded Delta Cursor Span
    // -------------------------------------------------------------
    if (c1.enabled && c2.enabled) {
      const sx1 = timeToScreen(c1.t);
      const sx2 = timeToScreen(c2.t);
      const minSx = Math.max(left, Math.min(sx1, sx2));
      const maxSx = Math.min(right, Math.max(sx1, sx2));
      if (maxSx > minSx) {
        ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(minSx, top, maxSx - minSx, plotH);

        // Top dimension line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        const dimY = top + 14;
        ctx.beginPath();
        ctx.moveTo(minSx, dimY);
        ctx.lineTo(maxSx, dimY);
        ctx.stroke();

        // Arrowheads
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(minSx, dimY);
        ctx.lineTo(minSx + 5, dimY - 3);
        ctx.lineTo(minSx + 5, dimY + 3);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(maxSx, dimY);
        ctx.lineTo(maxSx - 5, dimY - 3);
        ctx.lineTo(maxSx - 5, dimY + 3);
        ctx.closePath();
        ctx.fill();

        // Label on dimension line
        if (deltaData && maxSx - minSx > 60) {
          ctx.font = 'bold 9px monospace';
          const dimLabel = `Δt = ${deltaData.dtFormatted} (${deltaData.freqFormatted})`;
          const textW = ctx.measureText(dimLabel).width + 8;
          const textX = (minSx + maxSx) / 2;
          ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
          ctx.fillRect(textX - textW / 2, dimY - 7, textW, 14);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(textX - textW / 2, dimY - 7, textW, 14);
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dimLabel, textX, dimY);
        }
      }
    }

    if (viewMode === 'emtdc_compare' && comparisonMetric && comparisonMetric.time.length > 0) {
      // -------------------------------------------------------------
      // EMTDC Reference Comparison Split Render
      // -------------------------------------------------------------
      const splitTopH = Math.floor(plotH * 0.65);
      const splitBotTop = top + splitTopH + 20;
      const splitBotH = plotH - splitTopH - 20;

      const simVals = signals.get(compareChannel) || [];
      const refVals =
        emtdcDataset?.signals.get(compareChannel) ||
        (emtdcDataset?.channels[1] ? emtdcDataset.signals.get(emtdcDataset.channels[1].name) : []) ||
        [];

      let yMin = Infinity, yMax = -Infinity;
      for (const v of simVals) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
      for (const v of refVals) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
      if (yMin === Infinity) {
        yMin = -100;
        yMax = 100;
      }
      const margin = Math.max(1, (yMax - yMin) * 0.12);
      yMin -= margin;
      yMax += margin;

      const valToScreenTop = (v: number) =>
        top + splitTopH - ((v - yMin) / Math.max(1e-6, yMax - yMin)) * splitTopH;

      // Grid
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      for (let i = 0; i <= 4; i++) {
        const y = top + (i / 4) * splitTopH;
        const v = yMax - (i / 4) * (yMax - yMin);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#8b949e' : '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(formatEng(v), left - 6, y + 3);
      }

      // Simulation Trace (Solid Cyan)
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, plotW, splitTopH);
      ctx.clip();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let i = 0; i < times.length; i++) {
        const sx = timeToScreen(times[i]);
        const sy = valToScreenTop(simVals[i] || 0);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // EMTDC Reference Trace (Dashed Amber)
      if (emtdcDataset) {
        const refTimes = emtdcDataset.time;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        for (let i = 0; i < refTimes.length; i++) {
          const sx = timeToScreen(refTimes[i]);
          const sy = valToScreenTop(refVals[i] || 0);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Labels
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Simulated: ${compareChannel}`, left + 10, top + 15);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('EMTDC Reference (Dashed)', left + 180, top + 15);

      // Bottom Pane: Difference Residual Delta(t)
      let dMin = -comparisonMetric.maxAbsoluteError * 1.2;
      let dMax = comparisonMetric.maxAbsoluteError * 1.2;
      if (dMax === 0) {
        dMin = -1;
        dMax = 1;
      }
      const valToScreenBot = (v: number) =>
        splitBotTop + splitBotH - ((v - dMin) / Math.max(1e-6, dMax - dMin)) * splitBotH;

      ctx.fillStyle = isDark ? '#141824' : '#f8fafc';
      ctx.fillRect(left, splitBotTop, plotW, splitBotH);

      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      const zeroY = valToScreenBot(0);
      ctx.moveTo(left, zeroY);
      ctx.lineTo(right, zeroY);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.rect(left, splitBotTop, plotW, splitBotH);
      ctx.clip();

      ctx.strokeStyle = '#ff4081';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < comparisonMetric.time.length; i++) {
        const sx = timeToScreen(comparisonMetric.time[i]);
        const sy = valToScreenBot(comparisonMetric.deltaSignal[i] || 0);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ff4081';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(
        `Instantaneous Error Residual Δ(t) = y_sim(t) - y_emtdc(t) (Max: ${formatEng(comparisonMetric.maxAbsoluteError)})`,
        left + 10,
        splitBotTop + 14
      );

      ctx.strokeStyle = isDark ? '#263147' : '#cbd5e1';
      ctx.strokeRect(left, top, plotW, splitTopH);
      ctx.strokeRect(left, splitBotTop, plotW, splitBotH);

      // Right Comparison HUD
      ctx.fillStyle = isDark ? '#141924' : '#f1f5f9';
      ctx.fillRect(right + 10, top, 220, plotH);
      ctx.strokeStyle = isDark ? '#263147' : '#cbd5e1';
      ctx.strokeRect(right + 10, top, 220, plotH);

      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('EMTDC Delta Telemetry', right + 20, top + 25);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.fillText(`Station: ${emtdcDataset?.stationName || 'Benchmark'}`, right + 20, top + 48);

      ctx.fillText('Max Dev:', right + 20, top + 80);
      ctx.fillStyle = '#ff4081';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${formatEng(comparisonMetric.maxAbsoluteError)}`, right + 100, top + 80);

      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText('RMSE:', right + 20, top + 105);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${formatEng(comparisonMetric.rmse)}`, right + 100, top + 105);

      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText('NRMSE Error:', right + 20, top + 130);
      ctx.fillStyle = comparisonMetric.nrmsePercent < 1.0 ? '#4ade80' : '#facc15';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${comparisonMetric.nrmsePercent.toFixed(3)} %`, right + 100, top + 130);

      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText('R² Correlation:', right + 20, top + 155);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${comparisonMetric.rSquared.toFixed(5)}`, right + 100, top + 155);

      ctx.fillStyle = comparisonMetric.nrmsePercent < 2.0 ? '#10b981' : '#f59e0b';
      ctx.fillRect(right + 20, top + 180, 180, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        comparisonMetric.nrmsePercent < 2.0 ? '✓ HIGH EMTDC FIDELITY' : '⚠ MINOR COMMUTATION DELTA',
        right + 110,
        top + 196
      );
    } else if (viewMode === 'multitrack' && channelNames.length > 0) {
      // -------------------------------------------------------------
      // Multi-Track Stacked Render
      // -------------------------------------------------------------
      const trackH = plotH / numTracks;
      for (let tIdx = 0; tIdx < numTracks; tIdx++) {
        const trTop = top + tIdx * trackH;
        const trBot = trTop + trackH;
        const chIdxs: number[] = [];
        for (let i = 0; i < channelNames.length; i++) {
          if (i % numTracks === tIdx) chIdxs.push(i);
        }

        let curYMin = -350000;
        let curYMax = 350000;
        if (autoScale) {
          let minVal = Infinity, maxVal = -Infinity;
          for (const cIdx of chIdxs) {
            const vals = signals.get(channelNames[cIdx]) || [];
            for (let i = 0; i < vals.length; i++) {
              if (vals[i] < minVal) minVal = vals[i];
              if (vals[i] > maxVal) maxVal = vals[i];
            }
          }
          if (minVal !== Infinity && maxVal !== -Infinity) {
            const margin = Math.max(1.0, (maxVal - minVal) * 0.15);
            curYMin = minVal - margin;
            curYMax = maxVal + margin;
          }
        }

        const valToScreen = (v: number) =>
          trBot - ((v - curYMin) / Math.max(1e-6, curYMax - curYMin)) * trackH;

        ctx.lineWidth = 1.0;
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
        ctx.fillStyle = isDark ? '#8b949e' : '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';

        for (let i = 0; i <= 2; i++) {
          const y = trTop + (i / 2) * trackH;
          const val = curYMax - (i / 2) * (curYMax - curYMin);
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
          ctx.stroke();
          ctx.fillText(formatEng(val), left - 6, y + 3);
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, trTop, plotW, trackH);
        ctx.clip();

        for (const cIdx of chIdxs) {
          const chName = channelNames[cIdx];
          const vals = signals.get(chName) || [];
          const color = WAVEFORM_COLORS[cIdx % WAVEFORM_COLORS.length];
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const len = Math.min(times.length, vals.length);
          for (let i = 0; i < len; i++) {
            const sx = timeToScreen(times[i]);
            const sy = valToScreen(vals[i]);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = isDark ? '#263147' : '#cbd5e1';
        ctx.strokeRect(left, trTop, plotW, trackH);
      }
    } else {
      // -------------------------------------------------------------
      // Single Combined Trace Render
      // -------------------------------------------------------------
      let curYMin = -350000;
      let curYMax = 350000;
      if (autoScale) {
        let minVal = Infinity, maxVal = -Infinity;
        for (const ch of activeChannels) {
          const vals = signals.get(ch);
          if (vals && vals.length > 0) {
            for (let i = 0; i < vals.length; i++) {
              if (vals[i] < minVal) minVal = vals[i];
              if (vals[i] > maxVal) maxVal = vals[i];
            }
          }
        }
        if (minVal !== Infinity && maxVal !== -Infinity) {
          const margin = Math.max(1.0, (maxVal - minVal) * 0.12);
          curYMin = minVal - margin;
          curYMax = maxVal + margin;
        }
      }

      const valToScreen = (v: number) =>
        bottom - ((v - curYMin) / Math.max(1e-6, curYMax - curYMin)) * plotH;

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
      ctx.fillStyle = isDark ? '#8b949e' : '#64748b';
      ctx.font = '10px monospace';

      // Horizontal Y divisions
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 5; i++) {
        const y = top + (i / 5) * plotH;
        const val = curYMax - (i / 5) * (curYMax - curYMin);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillText(formatEng(val), left - 8, y);
      }

      // Vertical Time divisions
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= 5; i++) {
        const x = left + (i / 5) * plotW;
        const t = timeZoom.tStart + (i / 5) * tSpan;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        ctx.fillText(`${(t * 1000).toFixed(1)} ms`, x, bottom + 8);
      }

      // Render Waveforms
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, plotW, plotH);
      ctx.clip();

      let colorIdx = 0;
      for (const [name, vals] of signals) {
        if (name !== 'Time' && activeChannels.has(name) && vals.length > 1 && times.length > 1) {
          const color = WAVEFORM_COLORS[colorIdx % WAVEFORM_COLORS.length];
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const len = Math.min(times.length, vals.length);
          for (let i = 0; i < len; i++) {
            const sx = timeToScreen(times[i]);
            const sy = valToScreen(vals[i]);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
        if (name !== 'Time') colorIdx++;
      }
      ctx.restore();

      ctx.strokeStyle = isDark ? '#263147' : '#cbd5e1';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(left, top, plotW, plotH);
    }

    // -------------------------------------------------------------
    // Harmonic FFT Spectrum Right HUD & Bar Chart
    // -------------------------------------------------------------
    if (viewMode === 'harmonic' && fftResult) {
      const hudLeft = right + 10;
      const hudW = 250;

      ctx.fillStyle = isDark ? '#111722' : '#f8fafc';
      ctx.fillRect(hudLeft, top, hudW, plotH);
      ctx.strokeStyle = isDark ? '#222d42' : '#cbd5e1';
      ctx.strokeRect(hudLeft, top, hudW, plotH);

      // HUD Header
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Harmonic Spectrum HUD', hudLeft + 12, top + 10);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`Channel: ${fftChannel}`, hudLeft + 12, top + 27);

      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.fillText(`f0: ${fftResult.actualF0.toFixed(1)} Hz | Win: ${fftWindow}`, hudLeft + 12, top + 42);

      // KPI Card: THD & Fundamental
      ctx.fillStyle = isDark ? '#0a0d14' : '#ffffff';
      ctx.fillRect(hudLeft + 10, top + 60, hudW - 20, 52);
      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
      ctx.strokeRect(hudLeft + 10, top + 60, hudW - 20, 52);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.fillText('THD-F (%):', hudLeft + 16, top + 68);
      ctx.fillText('V1 RMS:', hudLeft + 125, top + 68);

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = fftResult.thdPercent > 8 ? '#f43f5e' : fftResult.thdPercent > 5 ? '#f59e0b' : '#10b981';
      ctx.fillText(`${fftResult.thdPercent.toFixed(2)}%`, hudLeft + 16, top + 83);

      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`${formatEng(fftResult.fundamentalMag / Math.SQRT2)}`, hudLeft + 125, top + 83);

      // IEEE 519 Status Badge
      const statusBg =
        fftResult.ieee519Compliance === 'PASS'
          ? '#065f46'
          : fftResult.ieee519Compliance === 'WARN'
          ? '#854d0e'
          : '#881337';
      ctx.fillStyle = statusBg;
      ctx.fillRect(hudLeft + 10, top + 120, hudW - 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        fftResult.ieee519Compliance === 'PASS'
          ? '✓ IEEE 519 COMPLIANT (THD < 5%)'
          : fftResult.ieee519Compliance === 'WARN'
          ? '⚠ IEEE 519 WARNING (5% - 8%)'
          : '✕ NON-COMPLIANT (THD > 8%)',
        hudLeft + hudW / 2,
        top + 134
      );

      // Harmonic Bar Chart
      const chartTop = top + 150;
      const chartBot = bottom - 45;
      const chartLeft = hudLeft + 12;
      const chartW = hudW - 24;
      const chartH = chartBot - chartTop;

      ctx.fillStyle = isDark ? '#080c14' : '#f1f5f9';
      ctx.fillRect(chartLeft, chartTop, chartW, chartH);
      ctx.strokeStyle = isDark ? '#1e293b' : '#cbd5e1';
      ctx.strokeRect(chartLeft, chartTop, chartW, chartH);

      // Y Grid (0%, 25%, 50%, 75%, 100% or dB)
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';

      for (let g = 0; g <= 4; g++) {
        const gy = chartBot - (g / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(chartLeft, gy);
        ctx.lineTo(chartLeft + chartW, gy);
        ctx.stroke();
        const gLabel = fftDbScale ? `${-(4 - g) * 15}dB` : `${g * 25}%`;
        ctx.fillText(gLabel, chartLeft - 3, gy + 3);
      }

      // IEEE 519 Limit Guideline (5% or -26 dB)
      const limitY = fftDbScale ? chartTop + (26 / 60) * chartH : chartBot - (5 / 100) * chartH;
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(chartLeft, limitY);
      ctx.lineTo(chartLeft + chartW, limitY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('5% Limit', chartLeft + 4, limitY - 2);

      // Render Harmonic Bars
      const visibleHarmonics = fftResult.harmonics.slice(0, 25);
      const numBars = visibleHarmonics.length;
      if (numBars > 0) {
        const barSlotW = chartW / numBars;
        const barW = Math.max(2, barSlotW * 0.75);

        for (let i = 0; i < numBars; i++) {
          const h = visibleHarmonics[i];
          const bx = chartLeft + i * barSlotW + (barSlotW - barW) / 2;

          let barH = 0;
          if (fftDbScale) {
            // -60 dB to 0 dB range
            const dbClamped = Math.max(-60, Math.min(0, h.dbMag));
            barH = ((dbClamped + 60) / 60) * chartH;
          } else {
            barH = (Math.min(100, Math.max(0, h.percent)) / 100) * chartH;
          }

          const by = chartBot - barH;

          // Color-coding: h=1 cyan, odd amber, even purple
          const barColor =
            h.order === 1
              ? '#00e5ff'
              : h.order % 2 === 1
              ? '#f59e0b'
              : '#a855f7';

          ctx.fillStyle = barColor;
          ctx.fillRect(bx, by, barW, barH);

          // Highlight hovered bar
          if (hoverHarmonicOrder === h.order) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
          }

          // X Order label below chart
          if (h.order === 1 || h.order % 2 === 1 || h.order <= 5) {
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${h.order}`, bx + barW / 2, chartBot + 10);
          }
        }
      }

      // Footer Metrics inside HUD
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `True RMS: ${formatEng(fftResult.trueRms)} | Crest: ${fftResult.crestFactor.toFixed(2)}`,
        hudLeft + 12,
        bottom - 26
      );
      if (fftResult.dominantHarmonic) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(
          `Dominant: ${fftResult.dominantHarmonic.order}th (${fftResult.dominantHarmonic.freq}Hz, ${fftResult.dominantHarmonic.percent.toFixed(1)}%)`,
          hudLeft + 12,
          bottom - 12
        );
      }
    }

    // -------------------------------------------------------------
    // Render Time Cursors Flags & Crosshair
    // -------------------------------------------------------------
    if (c1.enabled) {
      const sx = timeToScreen(c1.t);
      if (sx >= left && sx <= right) {
        ctx.strokeStyle = '#ffd740';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(sx, top);
        ctx.lineTo(sx, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Handle Flag
        ctx.fillStyle = '#ffd740';
        ctx.beginPath();
        ctx.roundRect(sx - 16, top - 20, 32, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T1', sx, top - 11);
      }
    }

    if (c2.enabled) {
      const sx = timeToScreen(c2.t);
      if (sx >= left && sx <= right) {
        ctx.strokeStyle = '#ff4081';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(sx, top);
        ctx.lineTo(sx, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Handle Flag
        ctx.fillStyle = '#ff4081';
        ctx.beginPath();
        ctx.roundRect(sx - 16, top - 20, 32, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T2', sx, top - 11);
      }
    }

    // Synchronized Crosshair Telemetry Guideline
    const effectiveCrosshairTime =
      externalCrosshairTime !== undefined && externalCrosshairTime !== null
        ? externalCrosshairTime
        : internalHoverT;

    if (effectiveCrosshairTime !== null && effectiveCrosshairTime !== undefined) {
      const sx = timeToScreen(effectiveCrosshairTime);
      if (sx >= left && sx <= right) {
        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(sx, top);
        ctx.lineTo(sx, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeStr = `t = ${(effectiveCrosshairTime * 1000).toFixed(2)} ms`;
        ctx.font = 'bold 9px monospace';
        const bWidth = ctx.measureText(badgeStr).width + 8;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.roundRect(sx - bWidth / 2, top - 18, bWidth, 15, 3);
        ctx.fill();
        ctx.fillStyle = '#0a0d14';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeStr, sx, top - 10);
        ctx.restore();
      }
    }
  }, [
    viewMode,
    numTracks,
    activeChannels,
    autoScale,
    timeZoom,
    signals,
    theme,
    c1,
    c2,
    externalCrosshairTime,
    internalHoverT,
    emtdcDataset,
    compareChannel,
    comparisonMetric,
    fftResult,
    fftChannel,
    fftWindow,
    fftDbScale,
    hoverHarmonicOrder,
    deltaData,
  ]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const left = 75;
    const right = canvas.width - (viewMode === 'harmonic' ? 270 : viewMode === 'emtdc_compare' ? 240 : 20);
    const plotW = right - left;
    const tSpan = Math.max(1e-6, timeZoom.tEnd - timeZoom.tStart);

    const clickT = timeZoom.tStart + ((x - left) / plotW) * tSpan;

    if (c1.enabled && Math.abs(clickT - c1.t) < tSpan * 0.04) {
      setDraggingCursor('c1');
    } else if (c2.enabled && Math.abs(clickT - c2.t) < tSpan * 0.04) {
      setDraggingCursor('c2');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const left = 75;
    const right = canvas.width - (viewMode === 'harmonic' ? 270 : viewMode === 'emtdc_compare' ? 240 : 20);
    const plotW = right - left;
    const tSpan = Math.max(1e-6, timeZoom.tEnd - timeZoom.tStart);

    // Check harmonic bar hover
    if (viewMode === 'harmonic' && fftResult) {
      const hudLeft = right + 10;
      const hudW = 250;
      const chartTop = 25 + 150;
      const chartBot = canvas.height - 35 - 45;
      const chartLeft = hudLeft + 12;
      const chartW = hudW - 24;

      if (x >= chartLeft && x <= chartLeft + chartW && y >= chartTop && y <= chartBot) {
        const visibleHarmonics = fftResult.harmonics.slice(0, 25);
        if (visibleHarmonics.length > 0) {
          const barSlotW = chartW / visibleHarmonics.length;
          const idx = Math.floor((x - chartLeft) / barSlotW);
          if (idx >= 0 && idx < visibleHarmonics.length) {
            setHoverHarmonicOrder(visibleHarmonics[idx].order);
          }
        }
      } else {
        if (hoverHarmonicOrder !== null) setHoverHarmonicOrder(null);
      }
    }

    if (x >= left && x <= right) {
      const curT = Math.max(
        timeZoom.tStart,
        Math.min(timeZoom.tEnd, timeZoom.tStart + ((x - left) / plotW) * tSpan)
      );
      setInternalHoverT(curT);

      if (draggingCursor === 'c1') {
        setC1((prev) => {
          const next = { ...prev, t: curT };
          onCursorChange?.({ c1: next, c2, crosshairTime: curT });
          return next;
        });
      } else if (draggingCursor === 'c2') {
        setC2((prev) => {
          const next = { ...prev, t: curT };
          onCursorChange?.({ c1, c2: next, crosshairTime: curT });
          return next;
        });
      } else {
        onCursorChange?.({ c1, c2, crosshairTime: curT });
      }
    } else {
      if (internalHoverT !== null) {
        setInternalHoverT(null);
        onCursorChange?.({ c1, c2, crosshairTime: null });
      }
    }
  };

  const handleMouseLeave = () => {
    setDraggingCursor(null);
    setHoverHarmonicOrder(null);
    if (internalHoverT !== null) {
      setInternalHoverT(null);
      onCursorChange?.({ c1, c2, crosshairTime: null });
    }
  };

  const exportCSV = () => {
    const times = signals.get('Time') || [];
    if (times.length === 0) return;

    const channels = Array.from(signals.keys()).filter((k) => k !== 'Time');
    let csv = 'Time,' + channels.join(',') + '\n';

    for (let i = 0; i < times.length; i++) {
      const row = [times[i].toFixed(6)];
      for (const ch of channels) {
        const vals = signals.get(ch);
        row.push(vals && vals[i] !== undefined ? vals[i].toFixed(4) : '0');
      }
      csv += row.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pscad_transient_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pscad_waveform_${Date.now()}.png`;
    a.click();
  };

  let colorIdx = 0;

  return (
    <div className="flex flex-col h-full bg-[#0c0f17] select-none text-xs font-sans">
      {/* Oscilloscope Toolbar */}
      <div className="h-9 px-3 bg-[#161b26] border-b border-[#263147] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded bg-[#0f131c] border border-[#263147] p-0.5 font-medium text-[10px]">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'single' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Combined</span>
            </button>
            <button
              onClick={() => setViewMode('multitrack')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'multitrack' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Multi-Track</span>
            </button>
            <button
              onClick={() => setViewMode('xy')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'xy' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>X-Y Orbit</span>
            </button>
            <button
              onClick={() => setViewMode('harmonic')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'harmonic' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>FFT Spectrum</span>
            </button>
            <button
              onClick={() => setViewMode('emtdc_compare')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'emtdc_compare'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>EMTDC Compare</span>
            </button>
            <button
              onClick={() => setViewMode('webgpu')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                viewMode === 'webgpu'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>WebGPU 144Hz</span>
            </button>
          </div>

          {/* FFT Toolbar Controls */}
          {viewMode === 'harmonic' && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#263147]">
              <span className="text-cyan-400 font-bold text-[10px]">Signal:</span>
              <select
                value={fftChannel}
                onChange={(e) => setFftChannel(e.target.value)}
                className="px-1.5 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-slate-100 font-mono text-[10px]"
              >
                {Array.from(signals.keys())
                  .filter((k) => k !== 'Time')
                  .map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
              </select>

              <select
                value={fftWindow}
                onChange={(e) => setFftWindow(e.target.value as WindowType)}
                className="px-1.5 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-slate-100 text-[10px]"
              >
                <option value="hanning">Hann</option>
                <option value="hamming">Hamming</option>
                <option value="blackmanHarris">Blackman-Harris</option>
                <option value="flatTop">Flat-Top</option>
                <option value="rectangular">Rectangular</option>
              </select>

              <select
                value={typeof fftTargetF0 === 'number' ? String(fftTargetF0) : fftTargetF0}
                onChange={(e) => setFftTargetF0(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                className="px-1.5 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-cyan-300 text-[10px]"
              >
                <option value="auto">Auto f0</option>
                <option value="60">60 Hz</option>
                <option value="50">50 Hz</option>
              </select>

              <button
                onClick={() => setFftDbScale(!fftDbScale)}
                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                  fftDbScale
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                    : 'bg-[#0f131c] text-slate-400 border-[#263147]'
                }`}
              >
                {fftDbScale ? 'dB' : '%'}
              </button>
            </div>
          )}

          {/* EMTDC Compare Channel Selector */}
          {viewMode === 'emtdc_compare' && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#263147]">
              <span className="text-amber-400 font-bold text-[10px]">Compare:</span>
              <select
                value={compareChannel}
                onChange={(e) => setCompareChannel(e.target.value)}
                className="px-1.5 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-slate-100 font-mono text-[10px]"
              >
                {Array.from(signals.keys())
                  .filter((k) => k !== 'Time')
                  .map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => handleLoadBenchmarkRef('TRANSMISSION_FAULT')}
                className="px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded border border-amber-500/30 text-[10px]"
              >
                Load Fault Ref
              </button>
            </div>
          )}

          {/* Multi-track Count */}
          {viewMode === 'multitrack' && (
            <div className="flex items-center gap-1 font-mono text-[10px] pl-2 border-l border-[#263147]">
              <span className="text-slate-400 font-sans">Tracks:</span>
              <select
                value={numTracks}
                onChange={(e) => setNumTracks(parseInt(e.target.value) || 2)}
                className="px-1 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-slate-100 font-mono"
              >
                <option value={2}>2 Tracks</option>
                <option value={3}>3 Tracks</option>
                <option value={4}>4 Tracks</option>
              </select>
            </div>
          )}

          {/* Differential Dual Cursor Toggles & Snapping */}
          <div className="flex items-center gap-1.5 border-l border-[#263147] pl-2">
            <button
              onClick={() => setC1((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                c1.enabled
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400 font-bold'
                  : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
              }`}
            >
              Cursor T1
            </button>
            <button
              onClick={() => setC2((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                c2.enabled
                  ? 'bg-pink-400/20 text-pink-300 border border-pink-400 font-bold'
                  : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
              }`}
            >
              Cursor T2
            </button>

            {(c1.enabled || c2.enabled) && (
              <div className="flex items-center gap-1 pl-1 border-l border-[#263147]">
                <button
                  onClick={() => snapToZeroCrossing(c2.enabled ? 'c2' : 'c1')}
                  title="Snap active cursor to nearest signal zero crossing"
                  className="px-1.5 py-0.5 bg-[#0f131c] hover:bg-[#1a2333] text-slate-300 border border-[#263147] rounded text-[10px]"
                >
                  Snap 0
                </button>
                <button
                  onClick={() => snapToPeak(c2.enabled ? 'c2' : 'c1')}
                  title="Snap active cursor to local peak or crest"
                  className="px-1.5 py-0.5 bg-[#0f131c] hover:bg-[#1a2333] text-slate-300 border border-[#263147] rounded text-[10px]"
                >
                  Snap Pk
                </button>
                <button
                  onClick={() => snapCyclePeriod(60)}
                  title="Set Δt to 1 full 60 Hz cycle (16.67 ms)"
                  className="px-1.5 py-0.5 bg-[#0f131c] hover:bg-[#1a2333] text-sky-300 border border-[#263147] rounded text-[10px]"
                >
                  1-Cycle
                </button>
              </div>
            )}
          </div>

          {/* AutoScale Toggle */}
          <button
            onClick={() => setAutoScale(!autoScale)}
            className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${
              autoScale
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400'
                : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
            }`}
          >
            Auto-Scale Y
          </button>
        </div>

        {/* Export & Window Detach Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDetachWindow || (() => telemetryStreamer.openPopoutWindow())}
            title="Pop-Out Oscilloscope into a standalone secondary OS / multi-monitor window"
            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-600/50 hover:to-indigo-600/50 text-sky-200 border border-sky-500/40 rounded transition-all shadow-sm active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-semibold">Detach</span>
          </button>
          <button
            onClick={onOpenComtradeModal}
            title="Export IEEE C37.111 COMTRADE Data Pair"
            className="flex items-center gap-1 px-2 py-1 bg-emerald-700/80 text-white rounded hover:bg-emerald-600 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">COMTRADE</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-2 py-1 bg-[#1f6feb] text-white rounded hover:bg-[#388bfd] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportPNG}
            className="flex items-center gap-1 px-2 py-1 bg-[#263147] text-slate-200 rounded hover:bg-slate-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0d14]">
        {/* Floating Differential Delta Cursors Banner */}
        {c1.enabled && c2.enabled && deltaData && (
          <div className="absolute top-2 left-20 z-10 bg-[#0f141f]/95 border border-[#38bdf8]/40 rounded px-3 py-1 shadow-xl backdrop-blur-sm text-[10px] font-mono flex items-center gap-3 text-slate-200 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400 font-bold">Δt:</span>
              <span className="text-white font-bold">{deltaData.dtFormatted}</span>
              <span className="text-slate-400 text-[9px]">({deltaData.freqFormatted})</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-2.5 overflow-hidden">
              {deltaData.channelDeltas.slice(0, 3).map((cd) => (
                <div key={cd.name} className="flex items-center gap-1">
                  <span className="text-slate-400">{cd.name}:</span>
                  <span className="text-amber-300">T1={formatEng(cd.v1)}</span>
                  <span className="text-pink-300">T2={formatEng(cd.v2)}</span>
                  <span className="text-emerald-400 font-bold">ΔV={formatEng(cd.dv)}</span>
                  <span className="text-slate-500 text-[9px]">({formatEng(cd.slewRate)}/s)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'xy' ? (
          <XYPlotter theme={theme} signals={signals} />
        ) : viewMode === 'webgpu' ? (
          <GpuWaveformRenderer
            signals={signals}
            activeChannels={activeChannels}
            timeZoom={timeZoom}
            onTimeZoomChange={setTimeZoom}
            isDark={theme !== 'light'}
          />
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDraggingCursor(null)}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full block"
          />
        )}
      </div>

      {/* Channel Badges Footer */}
      {viewMode !== 'xy' && (
        <div className="h-8 px-3 bg-[#161b26] border-t border-[#263147] flex items-center gap-3 overflow-x-auto">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Channels:</span>
          {Array.from(signals.keys())
            .filter((k) => k !== 'Time')
            .map((name) => {
              const color = WAVEFORM_COLORS[colorIdx++ % WAVEFORM_COLORS.length];
              const isAct = activeChannels.has(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleChannel(name)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-opacity ${
                    isAct ? 'opacity-100 bg-[#0f131c] border border-[#263147]' : 'opacity-40 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-200">{name}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
};

function formatEng(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val / 1e6).toFixed(2) + ' M';
  if (abs >= 1e3) return (val / 1e3).toFixed(2) + ' k';
  if (abs >= 1) return val.toFixed(1);
  if (abs >= 1e-3) return (val * 1e3).toFixed(1) + ' m';
  if (abs >= 1e-6) return (val * 1e6).toFixed(1) + ' µ';
  return val.toFixed(2);
}
