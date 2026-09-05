import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Square,
  Settings,
  FileCode,
  Compass,
  Copy,
  Check,
} from 'lucide-react';
import { pmuStreamer, type PmuFrameData } from '../../analysis/pmuStreamer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PmuStreamerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'frame' | 'config'>('radar');
  const [latestFrame, setLatestFrame] = useState<PmuFrameData | null>(null);
  const [freqHistory, setFreqHistory] = useState<number[]>([]);
  const [rocofHistory, setRocofHistory] = useState<number[]>([]);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);

  // Config state
  const [stationName, setStationName] = useState<string>('SUBSTATION_NORTH_400KV');
  const [pmuId, setPmuId] = useState<number>(101);
  const [nominalFreq, setNominalFreq] = useState<number>(60);
  const [reportingRate, setReportingRate] = useState<number>(60);

  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = pmuStreamer.getConfig();
      setStationName(cfg.stationName);
      setPmuId(cfg.pmuId);
      setNominalFreq(cfg.nominalFreq);
      setReportingRate(cfg.reportingRate);

      // Auto start stream preview in modal
      pmuStreamer.startStreaming((frame) => {
        setLatestFrame(frame);
        setFreqHistory((prev) => [...prev.slice(-40), frame.frequency]);
        setRocofHistory((prev) => [...prev.slice(-40), frame.rocof]);
      });
      setIsStreaming(true);

      return () => {
        pmuStreamer.stopStreaming();
        setIsStreaming(false);
      };
    }
  }, [isOpen]);

  // Render Polar Phasor Radar Scope
  useEffect(() => {
    if (!radarCanvasRef.current || !latestFrame) return;
    const canvas = radarCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 25;

    // Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    // Draw Polar Grid Rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw Radial Spoke Lines (every 30 deg)
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(rad), centerY + radius * Math.sin(rad));
      ctx.stroke();
    }

    // Draw Angle Labels (0, 90, 180, 270)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0°', centerX + radius + 14, centerY);
    ctx.fillText('90°', centerX, centerY - radius - 12);
    ctx.fillText('180°', centerX - radius - 16, centerY);
    ctx.fillText('270°', centerX, centerY + radius + 12);

    // Draw Phasor Vectors
    const phasors = latestFrame.phasors;
    const maxVoltageMag = 300.0;
    const maxCurrentMag = 2.0;

    const drawVector = (mag: number, angleDeg: number, maxMag: number, color: string, label: string) => {
      const rad = (angleDeg * Math.PI) / 180;
      const length = Math.min(radius, (mag / maxMag) * radius);
      const endX = centerX + length * Math.cos(rad);
      const endY = centerY - length * Math.sin(rad); // SVG/Canvas Y is downward

      // Vector line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      const headLength = 8;
      const headAngle = Math.PI / 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(rad - headAngle),
        endY + headLength * Math.sin(rad - headAngle)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(rad + headAngle),
        endY + headLength * Math.sin(rad + headAngle)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(label, endX + 12 * Math.cos(rad), endY - 12 * Math.sin(rad));
    };

    if (phasors['VA']) drawVector(phasors['VA'].magnitude, phasors['VA'].angleDeg, maxVoltageMag, '#ef4444', 'VA');
    if (phasors['VB']) drawVector(phasors['VB'].magnitude, phasors['VB'].angleDeg, maxVoltageMag, '#22c55e', 'VB');
    if (phasors['VC']) drawVector(phasors['VC'].magnitude, phasors['VC'].angleDeg, maxVoltageMag, '#3b82f6', 'VC');

    if (phasors['IA']) drawVector(phasors['IA'].magnitude, phasors['IA'].angleDeg, maxCurrentMag, '#f59e0b', 'IA');
    if (phasors['IB']) drawVector(phasors['IB'].magnitude, phasors['IB'].angleDeg, maxCurrentMag, '#a855f7', 'IB');
    if (phasors['IC']) drawVector(phasors['IC'].magnitude, phasors['IC'].angleDeg, maxCurrentMag, '#06b6d4', 'IC');
  }, [latestFrame]);

  const toggleStreaming = () => {
    if (isStreaming) {
      pmuStreamer.stopStreaming();
      setIsStreaming(false);
    } else {
      pmuStreamer.startStreaming((frame) => {
        setLatestFrame(frame);
        setFreqHistory((prev) => [...prev.slice(-40), frame.frequency]);
        setRocofHistory((prev) => [...prev.slice(-40), frame.rocof]);
      });
      setIsStreaming(true);
    }
  };

  const handleApplyConfig = () => {
    pmuStreamer.setConfig({
      stationName,
      pmuId,
      nominalFreq,
      reportingRate,
    });
    if (isStreaming) {
      pmuStreamer.stopStreaming();
      pmuStreamer.startStreaming((frame) => {
        setLatestFrame(frame);
      });
    }
  };

  const copyHex = () => {
    if (latestFrame) {
      navigator.clipboard.writeText(latestFrame.rawHexFrame);
      setCopiedHex(true);
      setTimeout(() => setCopiedHex(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#10141e] border border-cyan-500/30 w-[1100px] max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#161b28] border-b border-[#222d42] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                IEEE C37.118 Synchrophasor PMU Streamer
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  IEEE Std C37.118.2-2011
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time Phasor Measurement Unit (PMU) synchrophasor estimation, binary protocol streaming, and PDC vector telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleStreaming}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isStreaming
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isStreaming ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop Stream
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Start PMU Stream
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center px-6 bg-[#131824] border-b border-[#222d42] gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'radar'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" /> Polar Phasor Radar & Gauges
          </button>

          <button
            onClick={() => setActiveTab('frame')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'frame'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" /> IEEE C37.118 Binary Frame Inspector
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" /> PMU Station Configuration
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0d111a]">
          {activeTab === 'radar' && (
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Left Column: Radar Dial */}
              <div className="col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-[#161c2a] border border-[#232f48]">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between w-full">
                  <span>3-Phase Synchrophasor Polar Vector Dial</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {reportingRate} fps ({nominalFreq} Hz)
                  </span>
                </div>

                <canvas
                  ref={radarCanvasRef}
                  width={340}
                  height={340}
                  className="rounded-full shadow-inner border border-slate-800"
                />

                <div className="flex items-center justify-center gap-4 mt-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-red-400">● VA</span>
                  <span className="flex items-center gap-1 text-green-400">● VB</span>
                  <span className="flex items-center gap-1 text-blue-400">● VC</span>
                  <span className="flex items-center gap-1 text-amber-400">● IA</span>
                  <span className="flex items-center gap-1 text-purple-400">● IB</span>
                  <span className="flex items-center gap-1 text-cyan-400">● IC</span>
                </div>
              </div>

              {/* Right Column: Phasor Table & Frequency Gauges */}
              <div className="col-span-7 space-y-4 flex flex-col justify-between">
                {/* Frequency & ROCOF Gauges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48]">
                    <div className="text-xs text-slate-400">Grid Frequency (f)</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold font-mono text-cyan-400">
                        {latestFrame ? latestFrame.frequency.toFixed(4) : '60.0000'}
                      </span>
                      <span className="text-xs text-slate-400">Hz</span>
                      <span className="text-xs text-slate-500 font-mono ml-auto">
                        Δf: {latestFrame ? (latestFrame.freqDevHz * 1000).toFixed(1) : '0.0'} mHz
                      </span>
                    </div>
                    {/* Mini Sparkline */}
                    <div className="h-8 flex items-end gap-1 mt-2 pt-1 border-t border-[#1e273a]">
                      {freqHistory.map((val, i) => {
                        const h = Math.max(4, Math.min(28, ((val - (nominalFreq - 0.1)) / 0.2) * 28));
                        return (
                          <div
                            key={i}
                            style={{ height: `${h}px` }}
                            className="flex-1 bg-cyan-500/60 rounded-t-sm"
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48]">
                    <div className="text-xs text-slate-400">Rate of Change of Frequency (ROCOF)</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold font-mono text-amber-400">
                        {latestFrame ? latestFrame.rocof.toFixed(4) : '0.0000'}
                      </span>
                      <span className="text-xs text-slate-400">Hz/s</span>
                      <span className="text-xs text-emerald-400 font-mono ml-auto">
                        TVE: {latestFrame ? latestFrame.tvePercent.toFixed(2) : '0.10'}%
                      </span>
                    </div>
                    {/* Mini Sparkline */}
                    <div className="h-8 flex items-end gap-1 mt-2 pt-1 border-t border-[#1e273a]">
                      {rocofHistory.map((val, i) => {
                        const h = Math.max(4, Math.min(28, Math.abs(val * 100) + 4));
                        return (
                          <div
                            key={i}
                            style={{ height: `${h}px` }}
                            className="flex-1 bg-amber-500/60 rounded-t-sm"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Synchrophasor Measurement Table */}
                <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] flex-1">
                  <div className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
                    <span>Synchronized Phasor Channel Metrics</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      SOC: {latestFrame?.soc || 0} | FRAC: {latestFrame?.fracSec || 0} μs
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-[#202b3e]">
                          <th className="pb-2">Channel</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Magnitude (RMS)</th>
                          <th className="pb-2">Angle (deg)</th>
                          <th className="pb-2">Real Part</th>
                          <th className="pb-2">Imag Part</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1b2436]">
                        {latestFrame &&
                          Object.entries(latestFrame.phasors).map(([ch, val]) => (
                            <tr key={ch} className="hover:bg-slate-800/30">
                              <td className="py-1.5 font-bold text-slate-200">{ch}</td>
                              <td className="py-1.5 text-slate-400">
                                {ch.startsWith('V') ? 'Voltage' : 'Current'}
                              </td>
                              <td className="py-1.5 text-cyan-300 font-semibold">
                                {val.magnitude.toFixed(2)} {ch.startsWith('V') ? 'kV' : 'kA'}
                              </td>
                              <td className="py-1.5 text-amber-300">{val.angleDeg.toFixed(2)}°</td>
                              <td className="py-1.5 text-slate-400">{val.real.toFixed(2)}</td>
                              <td className="py-1.5 text-slate-400">{val.imag.toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frame' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" /> IEEE C37.118-2011 Binary Frame Hex Stream
                  </h3>
                  <button
                    onClick={copyHex}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Raw Hex
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#090c12] border border-[#1e273a] text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed select-all">
                  {latestFrame?.rawHexFrame || 'No frame received yet.'}
                </pre>
              </div>

              {/* Protocol Decomposition */}
              <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Frame Field Decomposition</h4>
                <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-[#0e131d] border border-[#222d42]">
                    <div className="text-[10px] text-slate-400">SYNC Word</div>
                    <div className="text-emerald-400 font-bold">0xAA01 (DATA)</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0e131d] border border-[#222d42]">
                    <div className="text-[10px] text-slate-400">IDCODE (PMU ID)</div>
                    <div className="text-cyan-400 font-bold">{latestFrame?.pmuId || 101}</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0e131d] border border-[#222d42]">
                    <div className="text-[10px] text-slate-400">STAT Word</div>
                    <div className="text-slate-200 font-bold">0x0000 (VALID)</div>
                  </div>
                  <div className="p-2.5 rounded bg-[#0e131d] border border-[#222d42]">
                    <div className="text-[10px] text-slate-400">CRC-16-CCITT Check</div>
                    <div className="text-emerald-400 font-bold">PASSED (VALID)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="max-w-xl mx-auto p-6 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" /> PMU Station & Data Stream Settings
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Station Name</label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">PMU ID (IDCODE)</label>
                    <input
                      type="number"
                      value={pmuId}
                      onChange={(e) => setPmuId(parseInt(e.target.value) || 101)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nominal Frequency</label>
                    <select
                      value={nominalFreq}
                      onChange={(e) => setNominalFreq(parseInt(e.target.value) || 60)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    >
                      <option value={60}>60 Hz (North America / Japan 60Hz)</option>
                      <option value={50}>50 Hz (Europe / Asia / International)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Synchrophasor Reporting Rate</label>
                  <select
                    value={reportingRate}
                    onChange={(e) => setReportingRate(parseInt(e.target.value) || 60)}
                    className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                  >
                    <option value={10}>10 frames / second</option>
                    <option value={25}>25 frames / second</option>
                    <option value={50}>50 frames / second</option>
                    <option value={60}>60 frames / second (Standard)</option>
                    <option value={100}>100 frames / second</option>
                    <option value={120}>120 frames / second (High-Speed)</option>
                  </select>
                </div>

                <button
                  onClick={handleApplyConfig}
                  className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors mt-2"
                >
                  Apply PMU Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
