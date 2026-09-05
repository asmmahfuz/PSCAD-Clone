import React from 'react';
import { X, Layers, Play } from 'lucide-react';
import { CASE_STUDIES } from '../../examples/caseStudies';

interface CaseStudiesModalProps {
  onLoadCase: (caseKey: string) => void;
  onClose: () => void;
}

export const CaseStudiesModal: React.FC<CaseStudiesModalProps> = ({ onLoadCase, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Industrial Power System Benchmark Case Studies
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {Object.entries(CASE_STUDIES).map(([key, study]) => (
            <div
              key={key}
              className="bg-[#0f131c] border border-[#263147] rounded-lg p-4 flex flex-col justify-between hover:border-[#1f6feb] transition-colors"
            >
              <div>
                <span className="text-[9px] font-bold text-[#1f6feb] uppercase tracking-wider block mb-1">
                  {study.category}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mb-2">{study.name.replace(/_/g, ' ')}</h3>
                <p className="text-slate-400 leading-relaxed mb-4">{study.description}</p>
              </div>

              <div className="flex items-center justify-between border-t border-[#263147] pt-3">
                <div className="flex gap-3 text-[10px] text-slate-500 font-mono">
                  <span>Δt: {(study.dt * 1e6).toFixed(0)} µs</span>
                  <span>Tmax: {study.tMax} s</span>
                </div>

                <button
                  onClick={() => {
                    onLoadCase(key);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1f6feb] text-white rounded hover:bg-[#388bfd] font-semibold transition-colors shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load Circuit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
