import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Upload, FileText, CheckCircle2, ShieldCheck, HardDrive, Eye } from 'lucide-react';
import { ComtradeEngine, type ComtradeRecord } from '../../analysis/comtrade';
import { WAVEFORM_COLORS } from '../../constants';

interface ComtradeModalProps {
  signals: Map<string, number[]>;
  onLoadImportedSignals?: (imported: Map<string, number[]>) => void;
  onClose: () => void;
}

export const ComtradeModal: React.FC<ComtradeModalProps> = ({
  signals,
  onLoadImportedSignals,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Export state
  const [stationName, setStationName] = useState<string>('SUBSTATION_ALPHA_230kV');
  const [recDevId, setRecDevId] = useState<string>('EMTDC_RELAY_01');
  const [standardYear, setStandardYear] = useState<'1999' | '2013'>('1999');
  const [format, setFormat] = useState<'ASCII' | 'BINARY'>('BINARY');
  const [nominalFreq, setNominalFreq] = useState<number>(60);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [exportPreviewCfg, setExportPreviewCfg] = useState<string>('');

  // Import state
  const [importedRecord, setImportedRecord] = useState<ComtradeRecord | null>(null);
  const [importCfgText, setImportCfgText] = useState<string>('');
  const [importDatBuffer, setImportDatBuffer] = useState<ArrayBuffer | string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize selected channels from current signals
  useEffect(() => {
    const all = Array.from(signals.keys()).filter((k) => k !== 'Time');
    setSelectedChannels(new Set(all));
  }, [signals]);

  // Update export preview
  useEffect(() => {
    try {
      const times = signals.get('Time') || [];
      if (times.length > 0 && selectedChannels.size > 0) {
        const exported = ComtradeEngine.exportComtrade(signals, {
          stationName,
          recDevId,
          standardYear,
          format,
          nominalFreq,
          selectedChannels: Array.from(selectedChannels),
        });
        setExportPreviewCfg(exported.cfg);
      } else {
        setExportPreviewCfg('No channels selected or simulation data empty.');
      }
    } catch (e: any) {
      setExportPreviewCfg(`Preview error: ${e.message}`);
    }
  }, [signals, stationName, recDevId, standardYear, format, nominalFreq, selectedChannels]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const handleExportDownload = () => {
    try {
      const exported = ComtradeEngine.exportComtrade(signals, {
        stationName,
        recDevId,
        standardYear,
        format,
        nominalFreq,
        selectedChannels: Array.from(selectedChannels),
      });
      ComtradeEngine.downloadFiles(exported.baseFileName, exported.cfg, exported.datAscii, exported.datBinary);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Handle file uploads for import
  const handleCfgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setImportCfgText(text);
      tryParseImport(text, importDatBuffer);
    };
    reader.readAsText(file);
  };

  const handleDatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      setImportDatBuffer(buffer);
      tryParseImport(importCfgText, buffer);
    };
    reader.readAsArrayBuffer(file);
  };

  const tryParseImport = (cfg: string, dat: string | ArrayBuffer | null) => {
    setImportError(null);
    if (!cfg || !dat) return;
    try {
      const rec = ComtradeEngine.importComtrade(cfg, dat);
      setImportedRecord(rec);
    } catch (err: any) {
      setImportError(`Parse error: ${err.message}`);
    }
  };

  // Render waveform preview for imported record
  const renderImportWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !importedRecord) return;
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

    const times = importedRecord.time;
    if (times.length < 2) return;
    const tMin = times[0];
    const tMax = times[times.length - 1];

    // Find global min and max across all channels
    let globalMin = Infinity;
    let globalMax = -Infinity;
    importedRecord.analogChannels.forEach((vals) => {
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] < globalMin) globalMin = vals[i];
        if (vals[i] > globalMax) globalMax = vals[i];
      }
    });

    if (globalMin === Infinity) {
      globalMin = -100;
      globalMax = 100;
    }
    const margin = Math.max(1.0, (globalMax - globalMin) * 0.1);
    const yMin = globalMin - margin;
    const yMax = globalMax + margin;

    const timeToX = (t: number) => left + ((t - tMin) / Math.max(1e-6, tMax - tMin)) * plotW;
    const valToY = (v: number) => bottom - ((v - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;

    // Grid lines
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';

    // Y divisions
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = top + (i / 4) * plotH;
      const v = yMax - (i / 4) * (yMax - yMin);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillText(v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : v.toFixed(1), left - 6, y);
    }

    // Time divisions
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 5; i++) {
      const x = left + (i / 5) * plotW;
      const t = tMin + (i / 5) * (tMax - tMin);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillText(`${(t * 1000).toFixed(1)} ms`, x, bottom + 5);
    }

    // Waveforms
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, plotW, plotH);
    ctx.clip();

    let colorIdx = 0;
    importedRecord.analogChannels.forEach((vals) => {
      const color = WAVEFORM_COLORS[colorIdx++ % WAVEFORM_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const len = Math.min(times.length, vals.length);
      for (let i = 0; i < len; i++) {
        const sx = timeToX(times[i]);
        const sy = valToY(vals[i]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    });
    ctx.restore();

    // Border
    ctx.strokeStyle = '#263147';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(left, top, plotW, plotH);
  }, [importedRecord]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        renderImportWaveform();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderImportWaveform]);

  useEffect(() => {
    renderImportWaveform();
  }, [renderImportWaveform]);

  const handleLoadImportedToOscilloscope = () => {
    if (!importedRecord || !onLoadImportedSignals) return;
    const sigMap = new Map<string, number[]>();
    sigMap.set('Time', importedRecord.time);
    importedRecord.analogChannels.forEach((v, k) => sigMap.set(k, v));
    onLoadImportedSignals(sigMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-[#121620] border border-[#263147] rounded-lg shadow-2xl w-full max-w-4xl h-[86vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-11 px-4 bg-[#161b26] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                COMTRADE File Format Manager
                <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 rounded">
                  IEEE Std C37.111
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close COMTRADE Modal"
            className="p-1 rounded hover:bg-[#202738] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="h-9 px-4 bg-[#161b26]/50 border-b border-[#263147] flex items-center gap-2 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded transition-colors ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2130]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export COMTRADE (.cfg + .dat)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded transition-colors ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2130]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import & View COMTRADE</span>
          </button>
        </div>

        {/* Tab 1: Export View */}
        {activeTab === 'export' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Options Column */}
            <div className="w-80 bg-[#161b26] border-r border-[#263147] p-4 flex flex-col gap-3 overflow-y-auto shrink-0 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                IEEE Standard Parameters
              </span>

              <label className="flex flex-col gap-1">
                <span className="text-slate-300">Station / Substation Name:</span>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-slate-300">Recording Device ID:</span>
                <input
                  type="text"
                  value={recDevId}
                  onChange={(e) => setRecDevId(e.target.value)}
                  className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-300">Standard Year:</span>
                  <select
                    value={standardYear}
                    onChange={(e) => setStandardYear(e.target.value as any)}
                    className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono"
                  >
                    <option value="1999">C37.111-1999</option>
                    <option value="2013">C37.111-2013</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-slate-300">Data Format:</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="px-2 py-1 bg-[#0a0d14] border border-[#263147] rounded text-slate-100 font-mono font-bold text-emerald-400"
                  >
                    <option value="BINARY">BINARY (16-bit)</option>
                    <option value="ASCII">ASCII (CSV)</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-slate-300">Nominal Frequency:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNominalFreq(60)}
                    className={`flex-1 py-1 rounded border font-mono ${
                      nominalFreq === 60 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#0a0d14] border-[#263147] text-slate-400'
                    }`}
                  >
                    60.0 Hz
                  </button>
                  <button
                    onClick={() => setNominalFreq(50)}
                    className={`flex-1 py-1 rounded border font-mono ${
                      nominalFreq === 50 ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#0a0d14] border-[#263147] text-slate-400'
                    }`}
                  >
                    50.0 Hz
                  </button>
                </div>
              </label>

              <div className="pt-2 border-t border-[#263147]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Select Export Channels ({selectedChannels.size})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-[#0a0d14] p-2 rounded border border-[#263147]">
                  {Array.from(signals.keys())
                    .filter((k) => k !== 'Time')
                    .map((ch) => (
                      <label key={ch} className="flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white">
                        <input
                          type="checkbox"
                          checked={selectedChannels.has(ch)}
                          onChange={() => toggleChannel(ch)}
                          className="accent-emerald-500"
                        />
                        <span className="font-mono text-[11px] truncate">{ch}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="mt-auto pt-3">
                <button
                  onClick={handleExportDownload}
                  disabled={selectedChannels.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded font-bold hover:from-emerald-500 hover:to-teal-500 shadow-lg transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .cfg &amp; .dat Files</span>
                </button>
              </div>
            </div>

            {/* Right Preview Column */}
            <div className="flex-1 bg-[#0a0d14] p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Configuration Header Preview (.cfg)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {standardYear === '1999' ? 'IEEE Std C37.111-1999' : 'IEEE Std C37.111-2013'}
                </span>
              </div>
              <pre className="flex-1 bg-[#121620] border border-[#263147] rounded p-3 text-[11px] font-mono text-emerald-300/90 overflow-auto whitespace-pre select-text">
                {exportPreviewCfg}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Import View */}
        {activeTab === 'import' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Upload Column */}
            <div className="w-80 bg-[#161b26] border-r border-[#263147] p-4 flex flex-col gap-3 shrink-0 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Upload COMTRADE Pair
              </span>

              <label className="flex flex-col gap-1.5 p-3 rounded bg-[#0a0d14] border border-[#263147] hover:border-emerald-500/50 cursor-pointer transition-colors">
                <span className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>1. Configuration File (.cfg)</span>
                  {importCfgText && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </span>
                <input type="file" accept=".cfg" onChange={handleCfgFileChange} className="text-[11px] text-slate-400" />
              </label>

              <label className="flex flex-col gap-1.5 p-3 rounded bg-[#0a0d14] border border-[#263147] hover:border-emerald-500/50 cursor-pointer transition-colors">
                <span className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>2. Data File (.dat)</span>
                  {importDatBuffer && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </span>
                <input type="file" accept=".dat" onChange={handleDatFileChange} className="text-[11px] text-slate-400" />
              </label>

              {importError && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                  {importError}
                </div>
              )}

              {importedRecord && (
                <div className="p-3 rounded bg-[#0a0d14] border border-emerald-900/50 space-y-1.5 font-mono text-[11px]">
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Parsed Record Info</span>
                  </div>
                  <div className="text-slate-300">Station: {importedRecord.stationName}</div>
                  <div className="text-slate-300">Device: {importedRecord.recDevId}</div>
                  <div className="text-slate-300">Standard: C37.111-{importedRecord.standardYear}</div>
                  <div className="text-slate-300">Format: {importedRecord.format}</div>
                  <div className="text-slate-300">Sample Rate: {importedRecord.sampleRate} Hz</div>
                  <div className="text-slate-300">Total Samples: {importedRecord.sampleCount}</div>
                  <div className="text-slate-300">Analog Chs: {importedRecord.analogDefinitions.length}</div>
                </div>
              )}

              {importedRecord && onLoadImportedSignals && (
                <button
                  onClick={handleLoadImportedToOscilloscope}
                  className="mt-auto py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded font-bold hover:from-emerald-500 hover:to-teal-500 shadow-lg transition-all"
                >
                  Load into Main Oscilloscope
                </button>
              )}
            </div>

            {/* Right Waveform Preview */}
            <div className="flex-1 bg-[#0a0d14] flex flex-col overflow-hidden">
              <div className="h-8 px-4 bg-[#161b26] border-b border-[#263147] flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imported Transient Waveforms</span>
                </span>
                {importedRecord && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    {importedRecord.analogChannels.size} Analog Traces
                  </span>
                )}
              </div>

              <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0d14]">
                {importedRecord ? (
                  <canvas ref={canvasRef} className="w-full h-full block" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                    <FileText className="w-10 h-10 stroke-1" />
                    <span>Upload a matching .cfg and .dat file to inspect waveforms</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
