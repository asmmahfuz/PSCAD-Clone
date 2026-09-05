import React, { useState, useEffect, useRef } from 'react';
import { X, BarChart2, Play } from 'lucide-react';
import { HarmonicAnalyzer } from '../../analysis/fft';
import type { FftResult } from '../../types';

interface FftModalProps {
  signals: Map<string, number[]>;
  onClose: () => void;
}

export const FftModal: React.FC<FftModalProps> = ({ signals, onClose }) => {
  const [selectedSig, setSelectedSig] = useState<string>('');
  const [f0, setF0] = useState<number>(60);
  const [fftRes, setFftRes] = useState<FftResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const signalNames = Array.from(signals.keys()).filter(k => k !== 'Time');

  useEffect(() => {
    if (signalNames.length > 0 && !selectedSig) {
      setSelectedSig(signalNames[0]);
    }
  }, [signalNames, selectedSig]);

  const computeFFT = () => {
    const times = signals.get('Time') || [];
    const vals = signals.get(selectedSig) || [];
    if (vals.length < 32 || times.length < 32) return;

    const res = HarmonicAnalyzer.analyze(times, vals, f0);
    setFftRes(res);
  };

  useEffect(() => {
    computeFFT();
  }, [selectedSig, f0]);

  // Render Bar Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fftRes) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const left = 45;
    const bottom = h - 25;
    const top = 20;
    const right = w - 15;
    const chartW = right - left;
    const chartH = bottom - top;

    const harmonics = fftRes.harmonics || [];
    if (harmonics.length === 0) return;

    const maxMag = Math.max(...harmonics.map(hm => hm.mag), 1e-3);
    const barWidth = chartW / harmonics.length;

    // Grid box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(left, top, chartW, chartH);

    // Bars
    harmonics.forEach((hm, idx) => {
      const barH = (hm.mag / maxMag) * chartH;
      const x = left + idx * barWidth + 2;
      const y = bottom - barH;

      ctx.fillStyle = idx === 0 ? '#00e5ff' : '#ff4081';
      ctx.fillRect(x, y, barWidth - 4, barH);

      ctx.fillStyle = '#8b949e';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      if (idx % 2 === 0) {
        ctx.fillText(`h${hm.order}`, x + (barWidth - 4) / 2, bottom + 14);
      }
    });
  }, [fftRes]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            FFT Harmonic Spectrum Analyzer (IEC 61000-4-7)
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-[#121620] border-b border-[#263147] flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-slate-300">
            <span>Signal Channel:</span>
            <select
              value={selectedSig}
              onChange={(e) => setSelectedSig(e.target.value)}
              className="px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none"
            >
              {signalNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-slate-300">
            <span>Fundamental (f₀):</span>
            <input
              type="number"
              value={f0}
              onChange={(e) => setF0(parseFloat(e.target.value) || 60)}
              className="w-16 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200"
            />
            <span>Hz</span>
          </label>

          <button
            onClick={computeFFT}
            className="flex items-center gap-1 px-3 py-1 bg-[#1f6feb] text-white rounded hover:bg-[#388bfd] font-semibold"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Compute FFT
          </button>
        </div>

        {/* Results Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
          {/* Chart */}
          <div className="flex flex-col bg-[#0c0f17] border border-[#263147] rounded p-2">
            <span className="text-[11px] font-semibold text-slate-400 mb-2">Harmonic Amplitude Spectrum (h1..h25)</span>
            <canvas ref={canvasRef} width={380} height={220} className="w-full h-[220px] block" />
          </div>

          {/* Stats & Table */}
          <div className="flex flex-col space-y-2">
            <div className="p-3 bg-[#0f131c] border border-[#263147] rounded font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Harmonic Distortion (THD):</span>
                <span className="text-cyan-400 font-bold text-sm">{fftRes?.thdPercent.toFixed(2)} %</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fundamental Amplitude (h1):</span>
                <span className="text-emerald-400 font-bold">{fftRes?.fundamentalMag.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DC Offset Component:</span>
                <span className="text-slate-300">{fftRes?.dcMag.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[160px] border border-[#263147] rounded">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#1c2333] text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-1.5 border-b border-[#263147]">Harmonic</th>
                    <th className="p-1.5 border-b border-[#263147]">Freq (Hz)</th>
                    <th className="p-1.5 border-b border-[#263147]">Mag</th>
                    <th className="p-1.5 border-b border-[#263147]">% Fund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263147] text-slate-300">
                  {fftRes?.harmonics.map(h => (
                    <tr key={h.order} className="hover:bg-[#1c2333]">
                      <td className="p-1.5">h{h.order}</td>
                      <td className="p-1.5">{h.freq.toFixed(1)}</td>
                      <td className="p-1.5">{h.mag.toFixed(2)}</td>
                      <td className="p-1.5 text-cyan-400">{h.percent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
