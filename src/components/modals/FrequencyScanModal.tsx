import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Download, Camera, Info, RefreshCw, BarChart2 } from 'lucide-react';
import { FrequencyScanEngine, type FrequencyScanResult } from '../../analysis/frequencyScan';
import { CircuitNetlist } from '../../engine/netlist';
import type { CircuitComponentData, WireData } from '../../types';

interface FrequencyScanModalProps {
  components: CircuitComponentData[];
  wires: WireData[];
  onClose: () => void;
}

export const FrequencyScanModal: React.FC<FrequencyScanModalProps> = ({
  components,
  wires,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [netlist, setNetlist] = useState<CircuitNetlist | null>(null);
  const [selectedNode, setSelectedNode] = useState<number>(1);
  const [fMin, setFMin] = useState<number>(5);
  const [fMax, setFMax] = useState<number>(2500);
  const [numPoints, setNumPoints] = useState<number>(250);
  const [scale, setScale] = useState<'log' | 'linear'>('log');
  const [unitMode, setUnitMode] = useState<'ohm' | 'db'>('ohm');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [result, setResult] = useState<FrequencyScanResult | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compile netlist on mount
  useEffect(() => {
    const nl = new CircuitNetlist();
    nl.compile(components, wires);
    setNetlist(nl);
    if (nl.nodeCount > 0) {
      setSelectedNode(1);
    }
  }, [components, wires]);

  // Execute scan
  const handleRunScan = useCallback(() => {
    if (!netlist || netlist.nodeCount === 0) return;
    setIsScanning(true);
    setTimeout(() => {
      const res = FrequencyScanEngine.runScan(netlist, {
        targetNode: selectedNode,
        fMin,
        fMax,
        numPoints,
        scale,
        busName: `Bus / Node ${selectedNode}`,
      });
      setResult(res);
      setIsScanning(false);
    }, 50);
  }, [netlist, selectedNode, fMin, fMax, numPoints, scale]);

  // Run initial scan once netlist is compiled
  useEffect(() => {
    if (netlist && netlist.nodeCount > 0 && !result) {
      handleRunScan();
    }
  }, [netlist, result, handleRunScan]);

  // Canvas rendering of dual Bode plot
  const renderPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result || result.frequencies.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const left = 65;
    const right = width - 25;
    const topMargin = 20;
    const bottomMargin = 30;
    const gap = 30;
    const plotW = right - left;
    const totalPlotH = height - topMargin - bottomMargin - gap;
    const plotH1 = Math.floor(totalPlotH * 0.58); // Mag plot
    const plotH2 = Math.floor(totalPlotH * 0.42); // Phase plot
    const top1 = topMargin;
    const top2 = topMargin + plotH1 + gap;

    // Backgrounds
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(left, top1, plotW, plotH1);
    ctx.fillRect(left, top2, plotW, plotH2);

    const freqs = result.frequencies;
    const fStart = freqs[0];
    const fEnd = freqs[freqs.length - 1];

    const freqToX = (f: number) => {
      if (scale === 'log') {
        const logMin = Math.log10(fStart);
        const logMax = Math.log10(fEnd);
        return left + ((Math.log10(Math.max(1e-3, f)) - logMin) / (logMax - logMin)) * plotW;
      }
      return left + ((f - fStart) / (fEnd - fStart)) * plotW;
    };

    // Magnitude Bounds
    const mags = unitMode === 'ohm' ? result.magnitude : result.magnitudeDb;
    let minMag = Math.min(...mags);
    let maxMag = Math.max(...mags);
    if (minMag === maxMag) {
      minMag *= 0.8;
      maxMag *= 1.2;
    }
    const magMargin = Math.max(1.0, (maxMag - minMag) * 0.1);
    const yMin1 = unitMode === 'ohm' ? Math.max(0, minMag - magMargin) : minMag - magMargin;
    const yMax1 = maxMag + magMargin;

    const magToY = (m: number) => top1 + plotH1 - ((m - yMin1) / Math.max(1e-6, yMax1 - yMin1)) * plotH1;

    // Phase Bounds (-180° to +180°)
    const yMin2 = -180;
    const yMax2 = 180;
    const phaseToY = (p: number) => top2 + plotH2 - ((p - yMin2) / (yMax2 - yMin2)) * plotH2;

    // Grid & Axes styling
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';

    // 1. Magnitude Grid
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = top1 + (i / 4) * plotH1;
      const val = yMax1 - (i / 4) * (yMax1 - yMin1);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      const label = unitMode === 'ohm' ? formatOhm(val) : `${val.toFixed(1)} dB`;
      ctx.fillText(label, left - 8, y);
    }

    // 2. Phase Grid
    for (let i = 0; i <= 4; i++) {
      const y = top2 + (i / 4) * plotH2;
      const deg = 180 - i * 90;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(`${deg}°`, left - 8, y);
    }

    // Zero Phase Reference Line (Dashed)
    const zeroPhaseY = phaseToY(0);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(left, zeroPhaseY);
    ctx.lineTo(right, zeroPhaseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

    // Frequency Vertical Grid Lines
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const fTicks = scale === 'log' ? getLogTicks(fStart, fEnd) : getLinTicks(fStart, fEnd);
    for (const f of fTicks) {
      const x = freqToX(f);
      if (x >= left && x <= right) {
        ctx.beginPath();
        ctx.moveTo(x, top1);
        ctx.lineTo(x, top1 + plotH1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, top2);
        ctx.lineTo(x, top2 + plotH2);
        ctx.stroke();

        ctx.fillText(`${f >= 1000 ? (f / 1000).toFixed(1) + 'k' : f.toFixed(0)} Hz`, x, top2 + plotH2 + 6);
      }
    }

    // Render Magnitude Curve
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top1, plotW, plotH1);
    ctx.clip();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < freqs.length; i++) {
      const x = freqToX(freqs[i]);
      const y = magToY(mags[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(freqToX(freqs[freqs.length - 1]), top1 + plotH1);
    ctx.lineTo(freqToX(freqs[0]), top1 + plotH1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.07)';
    ctx.fill();

    // Peak & Notch Markers
    for (const r of result.resonances) {
      const rx = freqToX(r.freq);
      const val = unitMode === 'ohm' ? r.mag : 20 * Math.log10(Math.max(1e-6, r.mag));
      const ry = magToY(val);

      if (r.type === 'parallel') {
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(rx, ry, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#69f0ae';
        ctx.beginPath();
        ctx.arc(rx, ry, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.restore();

    // Render Phase Curve
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top2, plotW, plotH2);
    ctx.clip();

    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < freqs.length; i++) {
      const x = freqToX(freqs[i]);
      const y = phaseToY(result.phaseDeg[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Borders & Titles
    ctx.strokeStyle = '#263147';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(left, top1, plotW, plotH1);
    ctx.strokeRect(left, top2, plotW, plotH2);

    // Section Titles
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Magnitude |Z(f)| (${unitMode === 'ohm' ? 'Ω' : 'dBΩ'})`, left + 8, top1 + 15);

    ctx.fillStyle = '#ffd740';
    ctx.fillText('Phase ∠Z(f) (deg)', left + 8, top2 + 15);

    // Hover Crosshair
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < freqs.length) {
      const hf = freqs[hoverIndex];
      const hm = mags[hoverIndex];
      const hp = result.phaseDeg[hoverIndex];
      const hx = freqToX(hf);
      const hy1 = magToY(hm);
      const hy2 = phaseToY(hp);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([3, 2]);

      // Vertical line across both plots
      ctx.beginPath();
      ctx.moveTo(hx, top1);
      ctx.lineTo(hx, top1 + plotH1);
      ctx.moveTo(hx, top2);
      ctx.lineTo(hx, top2 + plotH2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point highlights
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(hx, hy1, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffd740';
      ctx.beginPath();
      ctx.arc(hx, hy2, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Tooltip box
      const tipText = `f: ${hf.toFixed(1)} Hz | |Z|: ${formatOhm(result.magnitude[hoverIndex])} (${result.magnitudeDb[hoverIndex].toFixed(1)} dB) | ∠: ${hp.toFixed(1)}°`;
      ctx.font = 'bold 10px monospace';
      const tipW = ctx.measureText(tipText).width + 16;
      const tipX = Math.min(right - tipW, Math.max(left, hx - tipW / 2));
      const tipY = top1 + 5;

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
  }, [result, scale, unitMode, hoverIndex]);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        renderPlot();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPlot]);

  useEffect(() => {
    renderPlot();
  }, [renderPlot]);

  // Mouse hover tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !result || result.frequencies.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const left = 65;
    const right = canvas.width - 25;

    if (x < left || x > right) {
      setHoverIndex(null);
      return;
    }

    const norm = (x - left) / (right - left);
    const freqs = result.frequencies;
    const fStart = freqs[0];
    const fEnd = freqs[freqs.length - 1];

    let targetF: number;
    if (scale === 'log') {
      const logMin = Math.log10(fStart);
      const logMax = Math.log10(fEnd);
      targetF = Math.pow(10, logMin + norm * (logMax - logMin));
    } else {
      targetF = fStart + norm * (fEnd - fStart);
    }

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < freqs.length; i++) {
      const diff = Math.abs(freqs[i] - targetF);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  const handleExportCSV = () => {
    if (!result || result.frequencies.length === 0) return;
    let csv = 'Frequency (Hz),Magnitude (Ohm),Magnitude (dB),Phase (deg),Real (Ohm),Imag (Ohm)\n';
    for (let i = 0; i < result.frequencies.length; i++) {
      csv += `${result.frequencies[i].toFixed(4)},${result.magnitude[i].toFixed(4)},${result.magnitudeDb[i].toFixed(2)},${result.phaseDeg[i].toFixed(2)},${result.real[i].toFixed(4)},${result.imag[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmonic_scan_node_${result.targetNode}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmonic_scan_bode_${Date.now()}.png`;
    a.click();
  };

  const maxPeak = result?.resonances.find(r => r.type === 'parallel');
  const minNotch = result?.resonances.find(r => r.type === 'series');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-[#121620] border border-[#263147] rounded-lg shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-11 px-4 bg-[#161b26] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Harmonic Impedance & Frequency Scan Studio
                <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 rounded">
                  Z(f) Bode Scope
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Frequency Scan"
            className="p-1 rounded hover:bg-[#202738] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Parameters */}
        <div className="px-4 py-2.5 bg-[#161b26]/70 border-b border-[#263147] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Target Node Selector */}
            <label className="flex items-center gap-1.5 font-medium text-slate-300">
              <span>Scan Injection Bus:</span>
              <select
                value={selectedNode}
                onChange={(e) => setSelectedNode(parseInt(e.target.value) || 1)}
                className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 text-xs font-mono focus:border-cyan-500 outline-none"
              >
                {netlist && Array.from({ length: netlist.nodeCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Bus / Node {n}
                  </option>
                ))}
              </select>
            </label>

            {/* Frequency Range */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-sans">Range:</span>
              <input
                type="number"
                value={fMin}
                onChange={(e) => setFMin(Math.max(1, parseFloat(e.target.value) || 5))}
                className="w-14 px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
              />
              <span className="text-slate-500">to</span>
              <input
                type="number"
                value={fMax}
                onChange={(e) => setFMax(Math.max(10, parseFloat(e.target.value) || 2500))}
                className="w-16 px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
              />
              <span className="text-slate-400 font-sans">Hz</span>
            </div>

            {/* Resolution Points */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-sans">Pts:</span>
              <select
                value={numPoints}
                onChange={(e) => setNumPoints(parseInt(e.target.value) || 200)}
                className="px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono"
              >
                <option value={100}>100 pts</option>
                <option value={250}>250 pts</option>
                <option value={500}>500 pts</option>
                <option value={1000}>1000 pts</option>
              </select>
            </div>

            {/* Scale Toggle */}
            <div className="flex items-center rounded bg-[#0a0d14] border border-[#263147] p-0.5 font-medium text-[11px]">
              <button
                onClick={() => setScale('log')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  scale === 'log' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log(f)
              </button>
              <button
                onClick={() => setScale('linear')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  scale === 'linear' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Linear(f)
              </button>
            </div>

            {/* Unit Toggle */}
            <div className="flex items-center rounded bg-[#0a0d14] border border-[#263147] p-0.5 font-medium text-[11px]">
              <button
                onClick={() => setUnitMode('ohm')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  unitMode === 'ohm' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ω
              </button>
              <button
                onClick={() => setUnitMode('db')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  unitMode === 'db' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                dBΩ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded font-semibold hover:from-cyan-500 hover:to-blue-500 shadow-md transition-all disabled:opacity-50"
            >
              {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isScanning ? 'Scanning...' : 'Run Z(f) Scan'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!result}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e293b] text-slate-200 rounded hover:bg-slate-700 transition-colors border border-[#263147] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportPNG}
              disabled={!result}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e293b] text-slate-200 rounded hover:bg-slate-700 transition-colors border border-[#263147] disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Plot Center */}
          <div ref={containerRef} className="flex-1 relative bg-[#0a0d14] overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
              className="w-full h-full block cursor-crosshair"
            />
          </div>

          {/* Right Insights Sidebar */}
          <div className="w-72 bg-[#161b26] border-l border-[#263147] flex flex-col shrink-0 text-xs overflow-y-auto">
            {/* KPI Cards */}
            <div className="p-3 border-b border-[#263147] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Network Resonance Insights
              </span>

              {maxPeak ? (
                <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span>Parallel Anti-Resonance</span>
                    <span className="font-mono text-sm">{maxPeak.freq.toFixed(1)} Hz</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300 flex justify-between">
                    <span>Peak Impedance:</span>
                    <span className="font-mono font-bold text-rose-200">{formatOhm(maxPeak.mag)}</span>
                  </div>
                  {maxPeak.qFactor && (
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Quality Factor Q:</span>
                      <span className="font-mono">{maxPeak.qFactor.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 rounded bg-[#0a0d14] text-slate-400 text-center">
                  No critical parallel peaks found in range.
                </div>
              )}

              {minNotch && (
                <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/50">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span>Series Filter Notch</span>
                    <span className="font-mono text-sm">{minNotch.freq.toFixed(1)} Hz</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300 flex justify-between">
                    <span>Min Impedance:</span>
                    <span className="font-mono font-bold text-emerald-200">{formatOhm(minNotch.mag)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Detected Resonances Table */}
            <div className="p-3 flex-1 flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Harmonic Modes ({result?.resonances.length || 0})
              </span>

              <div className="flex-1 overflow-y-auto space-y-1.5">
                {result && result.resonances.length > 0 ? (
                  result.resonances.map((r, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border text-[11px] font-mono ${
                        r.type === 'parallel'
                          ? 'bg-rose-950/25 border-rose-800/40 text-rose-200'
                          : 'bg-emerald-950/25 border-emerald-800/40 text-emerald-200'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>{r.type === 'parallel' ? '▲ Peak' : '▼ Notch'} @ {r.freq} Hz</span>
                        <span>{formatOhm(r.mag)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between font-sans">
                        <span>Phase: {r.phaseDeg}°</span>
                        {r.qFactor && <span>Q = {r.qFactor}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 font-mono text-[11px]">
                    No resonances detected.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Summary Info */}
            <div className="p-3 bg-[#0f131c] border-t border-[#263147] text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Computed in {result?.executionTimeMs.toFixed(1) || 0} ms</span>
              </span>
              <span className="font-mono text-slate-300">1.0 A AC Inject</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatOhm(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val / 1e6).toFixed(2) + ' MΩ';
  if (abs >= 1e3) return (val / 1e3).toFixed(2) + ' kΩ';
  if (abs >= 1) return val.toFixed(2) + ' Ω';
  if (abs >= 1e-3) return (val * 1e3).toFixed(2) + ' mΩ';
  return val.toFixed(3) + ' Ω';
}

function getLogTicks(fMin: number, fMax: number): number[] {
  const ticks: number[] = [];
  const logMin = Math.floor(Math.log10(fMin));
  const logMax = Math.ceil(Math.log10(fMax));

  for (let dec = logMin; dec <= logMax; dec++) {
    const base = Math.pow(10, dec);
    for (const mult of [1, 2, 5]) {
      const val = mult * base;
      if (val >= fMin && val <= fMax) {
        ticks.push(val);
      }
    }
  }
  return ticks;
}

function getLinTicks(fMin: number, fMax: number): number[] {
  const ticks: number[] = [];
  const span = fMax - fMin;
  const step = Math.pow(10, Math.floor(Math.log10(span))) * (span / Math.pow(10, Math.floor(Math.log10(span))) > 5 ? 1 : 0.5);
  const start = Math.ceil(fMin / step) * step;
  for (let f = start; f <= fMax; f += step) {
    ticks.push(f);
  }
  return ticks;
}
