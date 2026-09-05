import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Camera, Zap, ArrowRight } from 'lucide-react';
import { LissajousEngine, type LissajousMetrics } from '../../analysis/lissajousEngine';
import type { ThemeType } from '../../types';

interface XYPlotterProps {
  theme: ThemeType;
  signals: Map<string, number[]>;
}

export const XYPlotter: React.FC<XYPlotterProps> = ({
  theme,
  signals,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableChannels = Array.from(signals.keys()).filter((k) => k !== 'Time');
  const [xChannel, setXChannel] = useState<string>(availableChannels[0] || '');
  const [yChannel, setYChannel] = useState<string>(availableChannels[1] || availableChannels[0] || '');
  const [trailFade, setTrailFade] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(false);
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const [syntheticFlux, setSyntheticFlux] = useState<boolean>(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sync available channels if selection became invalid
  useEffect(() => {
    if (!signals.has(xChannel) && availableChannels.length > 0) {
      setXChannel(availableChannels[0]);
    }
    if (!signals.has(yChannel) && availableChannels.length > 1) {
      setYChannel(availableChannels[1]);
    }
  }, [signals, availableChannels, xChannel, yChannel]);

  // Extract raw and transformed signal arrays
  const { xVals, yVals, times, yLabel } = useMemo(() => {
    const rawX = signals.get(xChannel) || [];
    const rawY = signals.get(yChannel) || [];
    const t = signals.get('Time') || [];

    if (syntheticFlux && rawY.length > 1 && t.length > 1) {
      const integratedFlux = LissajousEngine.integrateFlux(rawY, t);
      return {
        xVals: rawX,
        yVals: integratedFlux,
        times: t,
        yLabel: `Flux λ = ∫${yChannel} dt (Wb·t)`,
      };
    }

    return {
      xVals: rawX,
      yVals: rawY,
      times: t,
      yLabel: yChannel,
    };
  }, [signals, xChannel, yChannel, syntheticFlux]);

  // Compute live Lissajous telemetry metrics
  const metrics: LissajousMetrics = useMemo(() => {
    return LissajousEngine.analyze(xVals, yVals, times);
  }, [xVals, yVals, times]);

  const renderPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || Math.round(canvas.width / dpr);
    const height = canvas.clientHeight || Math.round(canvas.height / dpr);
    const isDark = theme !== 'light';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const left = 65;
    const right = width - 240; // Leave 240px for Lissajous Laboratory HUD
    const top = 25;
    const bottom = height - 40;
    const plotW = Math.max(50, right - left);
    const plotH = Math.max(50, bottom - top);

    // Background
    ctx.fillStyle = isDark ? '#0a0d14' : '#ffffff';
    ctx.fillRect(left, top, plotW, plotH);

    const len = Math.min(xVals.length, yVals.length);

    if (len === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select channels with active waveform data to plot X-Y trajectory', left + plotW / 2, height / 2);
      return;
    }

    // Compute Min / Max for X and Y
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < len; i++) {
      if (xVals[i] < minX) minX = xVals[i];
      if (xVals[i] > maxX) maxX = xVals[i];
      if (yVals[i] < minY) minY = yVals[i];
      if (yVals[i] > maxY) maxY = yVals[i];
    }

    if (minX === maxX) { minX -= 1; maxX += 1; }
    if (minY === maxY) { minY -= 1; maxY += 1; }

    const marginX = Math.max(0.1, (maxX - minX) * 0.12);
    const marginY = Math.max(0.1, (maxY - minY) * 0.12);
    const xMin = minX - marginX;
    const xMax = maxX + marginX;
    const yMin = minY - marginY;
    const yMax = maxY + marginY;

    const xToScreen = (v: number) => left + ((v - xMin) / Math.max(1e-6, xMax - xMin)) * plotW;
    const yToScreen = (v: number) => bottom - ((v - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

    // Grid lines
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    ctx.fillStyle = isDark ? '#8b949e' : '#64748b';
    ctx.font = '10px monospace';

    // Horizontal Y Grid
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = top + (i / 4) * plotH;
      const v = yMax - (i / 4) * (yMax - yMin);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(formatVal(v), left - 8, y);
    }

    // Vertical X Grid
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const x = left + (i / 4) * plotW;
      const v = xMin + (i / 4) * (xMax - xMin);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillText(formatVal(v), x, bottom + 8);
    }

    // Zero axes if in view
    if (xMin < 0 && xMax > 0) {
      const zeroX = xToScreen(0);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(zeroX, top);
      ctx.lineTo(zeroX, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (yMin < 0 && yMax > 0) {
      const zeroY = yToScreen(0);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(left, zeroY);
      ctx.lineTo(right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Render 2D Trajectory
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, plotW, plotH);
    ctx.clip();

    if (trailFade) {
      // Segmented rendering with temporal fading alpha
      for (let i = 1; i < len; i++) {
        const alpha = Math.max(0.2, i / len);
        ctx.strokeStyle = syntheticFlux
          ? `rgba(236, 72, 153, ${alpha.toFixed(3)})`
          : `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(xToScreen(xVals[i - 1]), yToScreen(yVals[i - 1]));
        ctx.lineTo(xToScreen(xVals[i]), yToScreen(yVals[i]));
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = syntheticFlux ? '#ec4899' : '#00e5ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const sx = xToScreen(xVals[i]);
        const sy = yToScreen(yVals[i]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Directional Arrowheads along the orbit
    if (showArrows && len >= 16) {
      const arrows = LissajousEngine.computeTrajectoryArrows(xVals, yVals, 6);
      ctx.fillStyle = syntheticFlux ? '#f472b6' : '#38bdf8';
      ctx.strokeStyle = isDark ? '#0a0d14' : '#ffffff';
      ctx.lineWidth = 1.0;

      for (const arrow of arrows) {
        const ax = xToScreen(arrow.x);
        // Note: Canvas y axis is inverted compared to Cartesian
        const ay = yToScreen(arrow.y);
        const screenAngle = -arrow.angle; // Invert angle for canvas Y-down

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(screenAngle);

        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }

    // Optional discrete points
    if (showPoints) {
      ctx.fillStyle = '#ffd740';
      for (let i = 0; i < len; i += Math.max(1, Math.floor(len / 80))) {
        ctx.beginPath();
        ctx.arc(xToScreen(xVals[i]), yToScreen(yVals[i]), 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Start & End Point Markers
    if (len > 0) {
      // Start point (Green)
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(xToScreen(xVals[0]), yToScreen(yVals[0]), 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Current/End point (Red pulsing)
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.arc(xToScreen(xVals[len - 1]), yToScreen(yVals[len - 1]), 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.restore();

    // Plot Border
    ctx.strokeStyle = isDark ? '#263147' : '#cbd5e1';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(left, top, plotW, plotH);

    // Axis Labels
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`X-Axis: ${xChannel}`, left + plotW / 2, bottom + 28);

    ctx.save();
    ctx.translate(left - 42, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Y-Axis: ${yLabel}`, 0, 0);
    ctx.restore();

    // -------------------------------------------------------------
    // Right Lissajous Laboratory HUD
    // -------------------------------------------------------------
    const hudLeft = right + 10;
    const hudW = 220;

    ctx.fillStyle = isDark ? '#121722' : '#f8fafc';
    ctx.fillRect(hudLeft, top, hudW, plotH);
    ctx.strokeStyle = isDark ? '#222d42' : '#cbd5e1';
    ctx.strokeRect(hudLeft, top, hudW, plotH);

    // HUD Header
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Lissajous Laboratory', hudLeft + 12, top + 22);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Ratio: ${metrics.frequencyRatio}`, hudLeft + 12, top + 38);

    // Metric 1: Phase Difference Δφ
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Phase Shift (Δφ):', hudLeft + 12, top + 65);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${metrics.phaseDiffDeg > 0 ? `+${metrics.phaseDiffDeg}` : metrics.phaseDiffDeg}°`, hudLeft + 120, top + 65);

    // Metric 2: Power Factor cos(Δφ)
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Power Factor:', hudLeft + 12, top + 92);
    ctx.fillStyle = metrics.powerFactorType === 'Leading' ? '#38bdf8' : metrics.powerFactorType === 'Lagging' ? '#f59e0b' : '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${metrics.powerFactor.toFixed(3)} ${metrics.powerFactorType === 'Unity' ? '' : metrics.powerFactorType}`, hudLeft + 105, top + 92);

    // Metric 3: Circulation Direction
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Circulation:', hudLeft + 12, top + 119);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 11px sans-serif';
    const circLabel = metrics.circulation === 'CounterClockwise' ? '↺ CCW (Lead)' : metrics.circulation === 'Clockwise' ? '↻ CW (Lag)' : '― Linear';
    ctx.fillText(circLabel, hudLeft + 95, top + 119);

    // Metric 4: Enclosed Area / Cycle Energy ∮ y dx
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(syntheticFlux ? 'Hysteresis Loss:' : 'Loop Area (∮ y dx):', hudLeft + 12, top + 146);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${formatEng(metrics.cycleEnergy)} ${syntheticFlux ? 'J/cycle' : ''}`, hudLeft + 12, top + 162);

    // Metric 5: Ellipse Eccentricity & Axial Ratio
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Eccentricity e: ${metrics.eccentricity.toFixed(3)}`, hudLeft + 12, top + 190);
    ctx.fillText(`Axial Ratio b/a: ${metrics.axialRatio.toFixed(3)}`, hudLeft + 12, top + 208);
    ctx.fillText(`Tilt Angle: ${metrics.tiltAngleDeg}°`, hudLeft + 12, top + 226);

    // Metric 6: Signal Levels
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(hudLeft + 10, top + 240);
    ctx.lineTo(hudLeft + hudW - 10, top + 240);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`X RMS: ${formatEng(metrics.xRms)} | Pk: ${formatEng(metrics.xPeak)}`, hudLeft + 12, top + 256);
    ctx.fillText(`Y RMS: ${formatEng(metrics.yRms)} | Pk: ${formatEng(metrics.yPeak)}`, hudLeft + 12, top + 272);

    // Status Pill
    ctx.fillStyle = metrics.powerFactor > 0.95 ? '#065f46' : '#854d0e';
    ctx.fillRect(hudLeft + 12, top + 295, hudW - 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    const statusText = syntheticFlux
      ? '✓ MAGNETIZING B-H LOOP'
      : metrics.powerFactor > 0.95
      ? '✓ NEAR-UNITY POWER FACTOR'
      : `⚠ ${metrics.powerFactorType.toUpperCase()} PHASE SHIFT`;
    ctx.fillText(statusText, hudLeft + hudW / 2, top + 311);

    // Hover tooltip
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < len) {
      const hx = xToScreen(xVals[hoverIndex]);
      const hy = yToScreen(yVals[hoverIndex]);
      const t = times[hoverIndex] !== undefined ? times[hoverIndex] : 0;

      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
      ctx.fill();

      const tipText = `t: ${(t * 1000).toFixed(2)} ms | X: ${xVals[hoverIndex].toFixed(3)} | Y: ${yVals[hoverIndex].toFixed(3)}`;
      ctx.font = 'bold 10px monospace';
      const tipW = ctx.measureText(tipText).width + 16;
      const tipX = Math.min(right - tipW, Math.max(left, hx - tipW / 2));
      const tipY = Math.max(top + 5, hy - 25);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.0;
      ctx.fillRect(tipX, tipY, tipW, 20);
      ctx.strokeRect(tipX, tipY, tipW, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tipText, tipX + 8, tipY + 10);
    }
  }, [
    theme,
    xVals,
    yVals,
    times,
    xChannel,
    yChannel,
    yLabel,
    trailFade,
    showPoints,
    showArrows,
    syntheticFlux,
    metrics,
    hoverIndex,
  ]);

  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        renderPlot();
      }
    };
    updateSize();

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(container);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [renderPlot]);

  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const len = Math.min(xVals.length, yVals.length);
    if (len === 0) return;

    let minX = Math.min(...xVals), maxX = Math.max(...xVals);
    let minY = Math.min(...yVals), maxY = Math.max(...yVals);
    const marginX = Math.max(0.1, (maxX - minX) * 0.12);
    const marginY = Math.max(0.1, (maxY - minY) * 0.12);
    const xMin = minX - marginX, xMax = maxX + marginX;
    const yMin = minY - marginY, yMax = maxY + marginY;

    const width = canvas.clientWidth || (canvas.width / (window.devicePixelRatio || 1));
    const height = canvas.clientHeight || (canvas.height / (window.devicePixelRatio || 1));
    const left = 65, right = width - 240, top = 25, bottom = height - 40;
    const plotW = Math.max(50, right - left);
    const plotH = Math.max(50, bottom - top);

    let closestIdx = 0;
    let minDistanceSq = Infinity;

    for (let i = 0; i < len; i++) {
      const sx = left + ((xVals[i] - xMin) / Math.max(1e-6, xMax - xMin)) * plotW;
      const sy = bottom - ((yVals[i] - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;
      const dSq = (sx - mx) * (sx - mx) + (sy - my) * (sy - my);
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestIdx = i;
      }
    }

    if (minDistanceSq < 900) {
      setHoverIndex(closestIdx);
    } else {
      setHoverIndex(null);
    }
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pscad_lissajous_${xChannel}_vs_${yChannel}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0f17] select-none text-xs font-sans">
      {/* Toolbar */}
      <div className="h-9 px-3 bg-[#161b26] border-b border-[#263147] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lissajous X-Y Suite</span>
          </span>

          {/* Channel Selectors */}
          <div className="flex items-center gap-2 border-l border-[#263147] pl-2.5 font-mono">
            <label className="flex items-center gap-1">
              <span className="text-slate-400 font-sans text-[10px]">X:</span>
              <select
                value={xChannel}
                onChange={(e) => setXChannel(e.target.value)}
                className="px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-cyan-300 font-mono text-[10px]"
              >
                {availableChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1">
              <span className="text-slate-400 font-sans text-[10px]">Y:</span>
              <select
                value={yChannel}
                onChange={(e) => setYChannel(e.target.value)}
                className="px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-pink-300 font-mono text-[10px]"
              >
                {availableChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1 border-l border-[#263147] pl-2.5">
            <button
              onClick={() => {
                setSyntheticFlux(false);
                const viX = availableChannels.find(
                  (c) => c.toLowerCase().includes('v') || c.toLowerCase().includes('volt')
                );
                const viY = availableChannels.find(
                  (c) => c.toLowerCase().includes('i') || c.toLowerCase().includes('curr')
                );
                if (viX && viY) {
                  setXChannel(viX);
                  setYChannel(viY);
                }
              }}
              className="px-1.5 py-0.5 rounded bg-[#0a0d14] border border-[#263147] hover:border-cyan-500 text-slate-300 text-[10px]"
            >
              V-I Orbit
            </button>
            <button
              onClick={() => {
                setSyntheticFlux(true);
                const viX = availableChannels.find(
                  (c) => c.toLowerCase().includes('i') || c.toLowerCase().includes('curr')
                );
                const viY = availableChannels.find(
                  (c) => c.toLowerCase().includes('v') || c.toLowerCase().includes('volt')
                );
                if (viX && viY) {
                  setXChannel(viX);
                  setYChannel(viY);
                }
              }}
              title="Integrate Voltage into synthetic flux linkage: λ = ∫V dt vs I"
              className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                syntheticFlux
                  ? 'bg-pink-600/30 text-pink-300 border-pink-500'
                  : 'bg-[#0a0d14] border-[#263147] hover:border-pink-500 text-slate-300'
              }`}
            >
              λ-i Hysteresis
            </button>
            <button
              onClick={() => {
                setSyntheticFlux(false);
                const va = availableChannels.find((c) => c.toLowerCase().includes('a') || c.toLowerCase().includes('1'));
                const vb = availableChannels.find((c) => c.toLowerCase().includes('b') || c.toLowerCase().includes('2'));
                if (va && vb) {
                  setXChannel(va);
                  setYChannel(vb);
                }
              }}
              className="px-1.5 py-0.5 rounded bg-[#0a0d14] border border-[#263147] hover:border-cyan-500 text-slate-300 text-[10px]"
            >
              Phase A-B
            </button>
            <button
              onClick={() => {
                setSyntheticFlux(false);
                const p = availableChannels.find((c) => c.toLowerCase().includes('p'));
                const q = availableChannels.find((c) => c.toLowerCase().includes('q'));
                if (p && q) {
                  setXChannel(p);
                  setYChannel(q);
                }
              }}
              className="px-1.5 py-0.5 rounded bg-[#0a0d14] border border-[#263147] hover:border-cyan-500 text-slate-300 text-[10px]"
            >
              P-Q Plane
            </button>
          </div>

          {/* Style Toggles */}
          <div className="flex items-center gap-1 border-l border-[#263147] pl-2.5">
            <button
              onClick={() => setShowArrows(!showArrows)}
              className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                showArrows
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500'
                  : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
              }`}
            >
              <ArrowRight className="w-2.5 h-2.5" />
              <span>Arrows</span>
            </button>
            <button
              onClick={() => setTrailFade(!trailFade)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                trailFade
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500'
                  : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
              }`}
            >
              Fade
            </button>
            <button
              onClick={() => setShowPoints(!showPoints)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                showPoints
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                  : 'bg-[#0f131c] text-slate-400 border border-[#263147]'
              }`}
            >
              Points
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPNG}
            className="flex items-center gap-1 px-2 py-1 bg-[#263147] text-slate-200 rounded hover:bg-slate-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0d14]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          className="w-full h-full block cursor-crosshair"
        />
      </div>

      {/* Footer Info */}
      <div className="h-7 px-3 bg-[#161b26] border-t border-[#263147] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e676]" />
            <span>Start Point</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff3d00]" />
            <span>Instantaneous Tip</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono text-[10px]">
            Δφ = {metrics.phaseDiffDeg > 0 ? `+${metrics.phaseDiffDeg}` : metrics.phaseDiffDeg}° | PF = {metrics.powerFactor.toFixed(3)} ({metrics.powerFactorType})
          </span>
        </div>
        <span className="font-mono text-[10px]">
          {signals.get(xChannel)?.length || 0} samples
        </span>
      </div>
    </div>
  );
};

function formatVal(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (val / 1e3).toFixed(1) + 'k';
  if (abs >= 1) return val.toFixed(1);
  if (abs >= 1e-3) return (val * 1e3).toFixed(1) + 'm';
  return val.toFixed(2);
}

function formatEng(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val / 1e6).toFixed(2) + ' M';
  if (abs >= 1e3) return (val / 1e3).toFixed(2) + ' k';
  if (abs >= 1) return val.toFixed(2);
  if (abs >= 1e-3) return (val * 1e3).toFixed(2) + ' m';
  if (abs >= 1e-6) return (val * 1e6).toFixed(2) + ' µ';
  return val.toFixed(3);
}
