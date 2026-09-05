import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Download, TrendingUp, AlertTriangle, Layers, Activity, Cpu } from 'lucide-react';
import {
  ParallelSweepCoordinator,
  type ParallelSweepOptions,
  type ParallelSweepSummary,
  type ParallelRunResultItem,
  type ParallelSweepMode,
  type HardwareAccelerationTarget,
} from '../../analysis/parallelSweep';
import type { CircuitComponentData, WireData } from '../../types';
import { COMPONENT_TYPES } from '../../constants';

interface MultiRunModalProps {
  components: CircuitComponentData[];
  wires: WireData[];
  onClose: () => void;
}

export const MultiRunModal: React.FC<MultiRunModalProps> = ({
  components,
  wires,
  onClose,
}) => {
  // Config state
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [paramKey, setParamKey] = useState<string>('startTime');
  const [sweepType, setSweepType] = useState<ParallelSweepMode>('point_on_wave');
  const [hardwareTarget, setHardwareTarget] = useState<HardwareAccelerationTarget>('cpu_multicore');
  const [numRuns, setNumRuns] = useState<number>(16);
  const [numThreads, setNumThreads] = useState<number>(8);
  const [startVal, setStartVal] = useState<number>(10);
  const [endVal, setEndVal] = useState<number>(200);
  const [meanVal, setMeanVal] = useState<number>(50);
  const [stdDevVal, setStdDevVal] = useState<number>(10);

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number; runsPerSec: number }>({
    current: 0,
    total: 16,
    percent: 0,
    runsPerSec: 0,
  });
  const [report, setReport] = useState<ParallelSweepSummary | null>(null);
  const [selectedRun, setSelectedRun] = useState<ParallelRunResultItem | null>(null);

  const trendCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const trendContainerRef = useRef<HTMLDivElement>(null);
  const waveContainerRef = useRef<HTMLDivElement>(null);

  // Initialize target component
  useEffect(() => {
    const faultComp = components.find((c) => c.type === COMPONENT_TYPES.FAULT_BLOCK);
    if (faultComp) {
      setSelectedCompId(faultComp.id);
      setSweepType('point_on_wave');
      setParamKey('startTime');
    } else if (components.length > 0) {
      setSelectedCompId(components[0].id);
      setSweepType('linear_range');
      setParamKey('resistance');
    }
  }, [components]);

  const handleStartSweep = async () => {
    setIsRunning(true);
    setProgress({ current: 0, total: numRuns, percent: 0, runsPerSec: 0 });
    setSelectedRun(null);

    const options: ParallelSweepOptions = {
      name: `Sweep_${selectedCompId}_${paramKey}`,
      sweepMode: sweepType,
      targetComponentId: selectedCompId,
      targetParamKey: paramKey,
      hardwareTarget,
      numThreads,
      numRuns,
      startValue: startVal,
      endValue: endVal,
      mean: meanVal,
      stdDev: stdDevVal,
      baseFaultTime: 0.05,
      systemFreq: 60,
      dt: 50e-6,
      tMax: 0.2,
      nominalVoltageBase: 230e3,
    };

    try {
      const summary = await ParallelSweepCoordinator.runParallelSweep(components, wires, options, (prog) => {
        setProgress({
          current: prog.currentRun,
          total: prog.totalRuns,
          percent: prog.percent,
          runsPerSec: prog.runsPerSec,
        });
      });
      setReport(summary);
      setSelectedRun(summary.worstCaseRun);
    } catch (err: any) {
      alert(`Multi-run sweep failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Render Trend Scatter Chart
  const renderTrendChart = useCallback(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas || !report || report.runs.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const left = 55;
    const right = width - 20;
    const top = 20;
    const bottom = height - 30;
    const plotW = right - left;
    const plotH = bottom - top;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(left, top, plotW, plotH);

    const runs = report.runs;
    const vals = runs.map((r) => r.peakVoltage);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (minV === maxV) {
      minV *= 0.8;
      maxV *= 1.2;
    }
    const margin = Math.max(1.0, (maxV - minV) * 0.15);
    const yMin = Math.max(0, minV - margin);
    const yMax = maxV + margin;

    const xToScreen = (idx: number) => left + (idx / Math.max(1, runs.length - 1)) * plotW;
    const yToScreen = (v: number) => bottom - ((v - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

    // Grid lines
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';

    // Y Grid
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = top + (i / 4) * plotH;
      const v = yMax - (i / 4) * (yMax - yMin);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(formatVoltage(v), left - 6, y);
    }

    // Mean Line (Dashed)
    const meanY = yToScreen(report.stats.meanPeakVoltage);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(left, meanY);
    ctx.lineTo(right, meanY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Mean: ${formatVoltage(report.stats.meanPeakVoltage)}`, right - 5, meanY - 8);

    // Trend Line
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < runs.length; i++) {
      const sx = xToScreen(i);
      const sy = yToScreen(runs[i].peakVoltage);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Data Points
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      const sx = xToScreen(i);
      const sy = yToScreen(r.peakVoltage);
      const isWorst = r.runIndex === report.worstCaseRun.runIndex;
      const isSelected = selectedRun && selectedRun.runIndex === r.runIndex;

      ctx.fillStyle = isWorst ? '#ff1744' : isSelected ? '#00e5ff' : '#ffd740';
      ctx.beginPath();
      ctx.arc(sx, sy, isWorst || isSelected ? 5.5 : 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // X-tick label
      if (runs.length <= 16 || i % Math.ceil(runs.length / 12) === 0) {
        ctx.fillStyle = '#8b949e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(r.paramLabel, sx, bottom + 5);
      }
    }

    // Border
    ctx.strokeStyle = '#263147';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(left, top, plotW, plotH);
  }, [report, selectedRun]);

  // Render Waveform Overlay
  const renderWaveformOverlay = useCallback(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas || !report || report.runs.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const left = 55;
    const right = width - 20;
    const top = 15;
    const bottom = height - 25;
    const plotW = right - left;
    const plotH = bottom - top;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(left, top, plotW, plotH);

    // Get time span
    const sample = report.runs[0].signalsSample;
    if (!sample || sample.time.length < 2) return;
    const tMin = sample.time[0];
    const tMax = sample.time[sample.time.length - 1];

    let gMin = Infinity, gMax = -Infinity;
    report.runs.forEach((r) => {
      if (r.signalsSample) {
        r.signalsSample.values.forEach((v) => {
          if (v < gMin) gMin = v;
          if (v > gMax) gMax = v;
        });
      }
    });
    if (gMin === Infinity) { gMin = -100; gMax = 100; }
    const margin = Math.max(1.0, (gMax - gMin) * 0.15);
    const yMin = gMin - margin;
    const yMax = gMax + margin;

    const timeToX = (t: number) => left + ((t - tMin) / Math.max(1e-6, tMax - tMin)) * plotW;
    const valToY = (v: number) => bottom - ((v - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

    // Grid
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillStyle = '#8b949e';
    ctx.font = '9px monospace';

    for (let i = 0; i <= 3; i++) {
      const y = top + (i / 3) * plotH;
      const v = yMax - (i / 3) * (yMax - yMin);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(formatVoltage(v), left - 6, y);
    }

    // Overlay all runs (dimmed)
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, plotW, plotH);
    ctx.clip();

    report.runs.forEach((r) => {
      if (r.signalsSample && r.runIndex !== selectedRun?.runIndex) {
        ctx.strokeStyle = 'rgba(255, 215, 64, 0.15)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        const s = r.signalsSample;
        for (let i = 0; i < s.time.length; i++) {
          const sx = timeToX(s.time[i]);
          const sy = valToY(s.values[i]);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    });

    // Highlight selected run (Bold)
    if (selectedRun && selectedRun.signalsSample) {
      const isWorst = selectedRun.runIndex === report.worstCaseRun.runIndex;
      ctx.strokeStyle = isWorst ? '#ff1744' : '#00e5ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const s = selectedRun.signalsSample;
      for (let i = 0; i < s.time.length; i++) {
        const sx = timeToX(s.time[i]);
        const sy = valToY(s.values[i]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    ctx.restore();
    ctx.strokeStyle = '#263147';
    ctx.strokeRect(left, top, plotW, plotH);
  }, [report, selectedRun]);

  // Canvas resizes
  useEffect(() => {
    const handleResize = () => {
      if (trendCanvasRef.current && trendContainerRef.current) {
        trendCanvasRef.current.width = trendContainerRef.current.clientWidth;
        trendCanvasRef.current.height = trendContainerRef.current.clientHeight;
        renderTrendChart();
      }
      if (waveCanvasRef.current && waveContainerRef.current) {
        waveCanvasRef.current.width = waveContainerRef.current.clientWidth;
        waveCanvasRef.current.height = waveContainerRef.current.clientHeight;
        renderWaveformOverlay();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderTrendChart, renderWaveformOverlay]);

  useEffect(() => {
    renderTrendChart();
    renderWaveformOverlay();
  }, [renderTrendChart, renderWaveformOverlay]);

  const handleExportCSV = () => {
    if (!report || report.runs.length === 0) return;
    let csv = 'Run,Parameter_Value,Parameter_Label,Peak_Voltage_V,Peak_Current_A,Overvoltage_pu,Energy_J\n';
    report.runs.forEach((r) => {
      csv += `${r.runIndex},${r.paramValue},${r.paramLabel},${r.peakVoltage.toFixed(2)},${r.peakCurrent.toFixed(2)},${r.overvoltagePu.toFixed(3)},${r.energyJoules.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_run_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-[#121620] border border-[#263147] rounded-lg shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-11 px-4 bg-[#161b26] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Automated Parametric Multi-Run Studio
                <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-700/50 rounded">
                  Monte-Carlo &amp; Statistical Sweep Engine
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Multi-Run Modal"
            className="p-1 rounded hover:bg-[#202738] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Config */}
        <div className="px-4 py-2.5 bg-[#161b26]/70 border-b border-[#263147] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Target Component */}
            <label className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span>Target:</span>
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono text-xs"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </label>

            {/* Hardware Accelerator Target */}
            <label className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compute:</span>
              <select
                value={hardwareTarget}
                onChange={(e) => setHardwareTarget(e.target.value as HardwareAccelerationTarget)}
                className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-cyan-300 font-medium text-xs"
              >
                <option value="cpu_multicore">⚡ Multi-Core CPU (Rayon/Workers)</option>
                <option value="gpu_webgpu">🚀 WebGPU Compute Shader</option>
                <option value="cpu_single">🖥️ Single-Core Serial</option>
              </select>
            </label>

            {/* Sweep Mode */}
            <div className="flex items-center rounded bg-[#0a0d14] border border-[#263147] p-0.5 font-medium text-[11px]">
              <button
                onClick={() => setSweepType('point_on_wave')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sweepType === 'point_on_wave' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Point-on-Wave
              </button>
              <button
                onClick={() => setSweepType('linear_range')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sweepType === 'linear_range' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Linear Sweep
              </button>
              <button
                onClick={() => setSweepType('monte_carlo')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sweepType === 'monte_carlo' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monte-Carlo
              </button>
            </div>

            {/* Number of Runs */}
            <label className="flex items-center gap-1 font-mono">
              <span className="text-slate-400 font-sans">Runs:</span>
              <select
                value={numRuns}
                onChange={(e) => setNumRuns(parseInt(e.target.value) || 16)}
                className="px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono"
              >
                <option value={8}>8 runs</option>
                <option value={16}>16 runs</option>
                <option value={32}>32 runs</option>
                <option value={64}>64 runs</option>
                <option value={128}>128 runs</option>
                <option value={500}>500 runs (GPU)</option>
              </select>
            </label>

            {/* Threads Selector */}
            {hardwareTarget === 'cpu_multicore' && (
              <label className="flex items-center gap-1 font-mono">
                <span className="text-slate-400 font-sans">Cores:</span>
                <select
                  value={numThreads}
                  onChange={(e) => setNumThreads(parseInt(e.target.value) || 8)}
                  className="px-1.5 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-cyan-300 font-mono"
                >
                  <option value={4}>4 Threads</option>
                  <option value={8}>8 Threads</option>
                  <option value={16}>16 Threads</option>
                  <option value={32}>32 Threads</option>
                </select>
              </label>
            )}

            {/* Range Span Inputs (for Linear Sweep) */}
            {sweepType === 'linear_range' && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400 font-sans">Span:</span>
                <input
                  type="number"
                  value={startVal}
                  onChange={(e) => setStartVal(parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="number"
                  value={endVal}
                  onChange={(e) => setEndVal(parseFloat(e.target.value) || 100)}
                  className="w-14 px-1 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
                />
              </div>
            )}

            {/* Monte Carlo Inputs */}
            {sweepType === 'monte_carlo' && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400 font-sans">μ:</span>
                <input
                  type="number"
                  value={meanVal}
                  onChange={(e) => setMeanVal(parseFloat(e.target.value) || 50)}
                  className="w-12 px-1 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
                />
                <span className="text-slate-400 font-sans">σ:</span>
                <input
                  type="number"
                  value={stdDevVal}
                  onChange={(e) => setStdDevVal(parseFloat(e.target.value) || 10)}
                  className="w-12 px-1 py-0.5 bg-[#0a0d14] border border-[#263147] rounded text-center text-slate-100"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartSweep}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded font-bold hover:from-amber-500 hover:to-orange-500 shadow-md transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? `Running (${progress.current}/${progress.total} @ ${progress.runsPerSec} r/s)...` : 'Start Parallel Sweep'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!report}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e293b] text-slate-200 rounded hover:bg-slate-700 transition-colors border border-[#263147] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Report</span>
            </button>
          </div>
        </div>

        {/* Progress Bar (Visible while running) */}
        {isRunning && (
          <div className="w-full bg-[#0a0d14] h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-150"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left / Center Plots */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0d14]">
            {/* Top: Parametric Trend Scatter Plot */}
            <div className="flex-1 flex flex-col border-b border-[#263147] overflow-hidden">
              <div className="h-7 px-3 bg-[#161b26] border-b border-[#263147] flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Peak Overvoltage vs Parameter Distribution</span>
                </span>
                {report && (
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[10px]">
                    <span className="text-cyan-400 font-bold">{report.hardwareUsed}</span>
                    <span>⚡ {report.stats.runsPerSecond} runs/s</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold">
                      {report.stats.speedupFactor}x Speedup
                    </span>
                    <span>{report.totalRuns} Runs in {report.executionTimeMs.toFixed(0)} ms</span>
                  </div>
                )}
              </div>
              <div ref={trendContainerRef} className="flex-1 relative overflow-hidden">
                <canvas ref={trendCanvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Bottom: Waveform Envelope Overlay */}
            <div className="h-44 flex flex-col overflow-hidden">
              <div className="h-6 px-3 bg-[#161b26] border-b border-[#263147] flex items-center justify-between text-[10px] text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>
                    Waveform Envelope Overlay{' '}
                    {selectedRun && (
                      <span className="font-mono text-cyan-400">
                        (Active: Run #{selectedRun.runIndex} @ {selectedRun.paramLabel})
                      </span>
                    )}
                  </span>
                </span>
              </div>
              <div ref={waveContainerRef} className="flex-1 relative overflow-hidden">
                <canvas ref={waveCanvasRef} className="w-full h-full block" />
              </div>
            </div>
          </div>

          {/* Right Sidebar: Statistics & Comparison Table */}
          <div className="w-80 bg-[#161b26] border-l border-[#263147] flex flex-col shrink-0 text-xs overflow-y-auto">
            {/* Statistical KPI Cards */}
            <div className="p-3 border-b border-[#263147] space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Statistical Summary
              </span>

              {report ? (
                <>
                  <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50">
                    <div className="flex items-center justify-between text-rose-300 font-bold">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Worst-Case Overvoltage</span>
                      </span>
                      <span className="font-mono">Run #{report.worstCaseRun.runIndex}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-200 flex justify-between font-mono">
                      <span>Peak Voltage:</span>
                      <span className="font-bold text-rose-200">{formatVoltage(report.stats.maxPeakVoltage)}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex justify-between font-mono">
                      <span>Overvoltage Factor:</span>
                      <span className="font-bold text-rose-300">{report.stats.maxOvervoltagePu} pu</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-[#0a0d14] border border-[#263147]">
                      <span className="text-[10px] text-slate-400 font-sans block">Mean Peak</span>
                      <span className="font-bold text-slate-200">{formatVoltage(report.stats.meanPeakVoltage)}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0a0d14] border border-[#263147]">
                      <span className="text-[10px] text-slate-400 font-sans block">Std Dev (σ)</span>
                      <span className="font-bold text-slate-200">{formatVoltage(report.stats.stdDevVoltage)}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0a0d14] border border-[#263147]">
                      <span className="text-[10px] text-slate-400 font-sans block">95th Percentile</span>
                      <span className="font-bold text-amber-300">{formatVoltage(report.stats.p95Voltage)}</span>
                    </div>
                    <div className="p-2 rounded bg-[#0a0d14] border border-[#263147]">
                      <span className="text-[10px] text-slate-400 font-sans block">Min Peak</span>
                      <span className="font-bold text-emerald-300">{formatVoltage(report.stats.minPeakVoltage)}</span>
                    </div>
                  </div>

                  {/* Hardware acceleration badge */}
                  <div className="p-2 rounded bg-[#0a0d14] border border-[#263147] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 font-sans">Speedup:</span>
                    <span className="font-bold text-emerald-400">
                      ⚡ {report.stats.speedupFactor}x ({report.stats.runsPerSecond} runs/s)
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded bg-[#0a0d14] text-slate-400 text-center">
                  Click 'Start Parallel Sweep' to run batch simulations.
                </div>
              )}
            </div>

            {/* Run comparison table */}
            <div className="p-3 flex-1 flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Batch Runs Breakdown ({report?.runs.length || 0})
              </span>

              <div className="flex-1 overflow-y-auto space-y-1">
                {report &&
                  report.runs.map((r) => {
                    const isWorst = r.runIndex === report.worstCaseRun.runIndex;
                    const isSelected = selectedRun && selectedRun.runIndex === r.runIndex;

                    return (
                      <div
                        key={r.runIndex}
                        onClick={() => setSelectedRun(r)}
                        className={`p-2 rounded border text-[11px] font-mono cursor-pointer transition-colors ${
                          isWorst
                            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                            : isSelected
                            ? 'bg-[#1f6feb]/25 border-[#1f6feb] text-sky-200'
                            : 'bg-[#0a0d14] border-[#263147] text-slate-300 hover:bg-[#161b26]'
                        }`}
                      >
                        <div className="flex justify-between font-bold">
                          <span>
                            #{r.runIndex}: {r.paramLabel}
                          </span>
                          <span>{formatVoltage(r.peakVoltage)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between font-sans">
                          <span>{r.overvoltagePu} pu</span>
                          {r.peakCurrent > 0 && <span>I = {formatCurrent(r.peakCurrent)}</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatVoltage(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return (val / 1e6).toFixed(2) + ' MV';
  if (abs >= 1e3) return (val / 1e3).toFixed(1) + ' kV';
  if (abs >= 1) return val.toFixed(1) + ' V';
  return val.toFixed(2) + ' V';
}

function formatCurrent(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e3) return (val / 1e3).toFixed(2) + ' kA';
  if (abs >= 1) return val.toFixed(1) + ' A';
  return val.toFixed(2) + ' A';
}
