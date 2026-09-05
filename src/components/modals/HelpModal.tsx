import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            PSCAD CLONE Simulation Theory & Guide
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-sm font-bold text-white mb-1">Electromagnetic Transient (EMT) Engine</h3>
            <p>
              PSCAD solves non-linear differential and algebraic power network equations in the time domain using
              H.W. Dommel's Trapezoidal Companion Norton Method.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sky-400 mb-1">Companion Equivalents</h4>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] bg-[#0f131c] p-3 rounded border border-[#263147]">
              <li>Inductor (L): G_L = Δt / (2L), I_hist(t) = i(t-Δt) + G_L * v(t-Δt)</li>
              <li>Capacitor (C): G_C = 2C / Δt, I_hist(t) = -i(t-Δt) - G_C * v(t-Δt)</li>
              <li>Resistor (R): G_R = 1 / R, I_hist = 0</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-emerald-400 mb-1">Live Interactivity</h4>
            <p>
              During active simulation execution, clicking on any circuit breaker immediately modifies the system
              conductance matrix $[G]$ with zero pause, enabling real-time transient testing!
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
