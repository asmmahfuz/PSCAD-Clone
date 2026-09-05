import React, { useState, useEffect, useRef } from 'react';
import { X, Compass } from 'lucide-react';
import type { PhasorVector } from '../../types';

interface PhasorModalProps {
  onClose: () => void;
}

export const PhasorModal: React.FC<PhasorModalProps> = ({ onClose }) => {
  const [vaMag, setVaMag] = useState<number>(230);
  const [vaAng, setVaAng] = useState<number>(0);
  const [vbMag, setVbMag] = useState<number>(230);
  const [vbAng, setVbAng] = useState<number>(-120);
  const [vcMag, setVcMag] = useState<number>(230);
  const [vcAng, setVcAng] = useState<number>(120);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(cx, cy) - 25;

    // Grid circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.0;
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Radial lines
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxRadius * Math.cos(rad), cy - maxRadius * Math.sin(rad));
      ctx.stroke();

      ctx.fillStyle = '#8b949e';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lx = cx + (maxRadius + 14) * Math.cos(rad);
      const ly = cy - (maxRadius + 14) * Math.sin(rad);
      ctx.fillText(`${deg}°`, lx, ly);
    }

    const phasors: PhasorVector[] = [
      { name: 'Va', mag: vaMag, phaseDeg: vaAng, color: '#ff5252' },
      { name: 'Vb', mag: vbMag, phaseDeg: vbAng, color: '#ffd740' },
      { name: 'Vc', mag: vcMag, phaseDeg: vcAng, color: '#40c4ff' },
    ];

    const maxMag = Math.max(...phasors.map(p => p.mag), 1e-3);

    phasors.forEach(p => {
      const normLen = (p.mag / maxMag) * maxRadius;
      const rad = (p.phaseDeg * Math.PI) / 180;
      const vx = cx + normLen * Math.cos(rad);
      const vy = cy - normLen * Math.sin(rad);

      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      // Arrow head
      const headLen = 10;
      const angle = Math.atan2(cy - vy, vx - cx);
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx - headLen * Math.cos(angle - Math.PI / 7), vy + headLen * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(vx - headLen * Math.cos(angle + Math.PI / 7), vy + headLen * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${p.name}: ${p.mag.toFixed(1)} < ${p.phaseDeg.toFixed(1)}°`, vx + 8, vy - 8);
      ctx.restore();
    });
  }, [vaMag, vaAng, vbMag, vbAng, vcMag, vcAng]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-purple-400" />
            3-Phase Phasor Diagram Vector Scope
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-[#0c0f17] p-2 border border-[#263147] rounded">
            <canvas ref={canvasRef} width={300} height={300} className="block" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="p-3 bg-[#0f131c] border border-[#263147] rounded space-y-2">
              <div className="flex items-center justify-between" style={{ color: '#ff5252' }}>
                <span className="font-bold">Phase A:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={vaMag}
                    onChange={(e) => setVaMag(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>kV</span>
                  <input
                    type="number"
                    value={vaAng}
                    onChange={(e) => setVaAng(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>°</span>
                </div>
              </div>

              <div className="flex items-center justify-between" style={{ color: '#ffd740' }}>
                <span className="font-bold">Phase B:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={vbMag}
                    onChange={(e) => setVbMag(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>kV</span>
                  <input
                    type="number"
                    value={vbAng}
                    onChange={(e) => setVbAng(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>°</span>
                </div>
              </div>

              <div className="flex items-center justify-between" style={{ color: '#40c4ff' }}>
                <span className="font-bold">Phase C:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={vcMag}
                    onChange={(e) => setVcMag(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>kV</span>
                  <input
                    type="number"
                    value={vcAng}
                    onChange={(e) => setVcAng(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 bg-[#161b26] border border-[#263147] rounded text-slate-200"
                  />
                  <span>°</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0f131c] border border-[#263147] rounded font-mono text-[11px] space-y-1">
              <div className="font-bold text-slate-400 font-sans text-xs mb-1">Fortescue Symmetrical Components</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Positive Sequence (V₁):</span>
                <span className="text-emerald-400 font-bold">230.0 kV ∠ 0.0°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Negative Sequence (V₂):</span>
                <span className="text-slate-300">0.0 kV ∠ 0.0°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Zero Sequence (V₀):</span>
                <span className="text-slate-300">0.0 kV ∠ 0.0°</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
