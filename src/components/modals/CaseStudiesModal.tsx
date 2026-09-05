import React, { useState, useMemo } from 'react';
import { X, Layers, Play, Search, Zap, Cpu, ShieldCheck, Activity, Gauge } from 'lucide-react';
import { CASE_STUDIES } from '../../examples/caseStudies';

interface CaseStudiesModalProps {
  onLoadCase: (caseKey: string) => void;
  onClose: () => void;
}

const FLAGSHIP_KEYS = new Set([
  'IEEE_9BUS_WSCC_GRID',
  'CIGRE_B4_DC_SUPERGRID',
  'INDUSTRIAL_MICROGRID_ISLANDING',
  'SUBSTATION_ANSI_PROTECTION'
]);

export const CaseStudiesModal: React.FC<CaseStudiesModalProps> = ({ onLoadCase, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    Object.values(CASE_STUDIES).forEach(study => {
      if (study.category) cats.add(study.category);
    });
    return Array.from(cats);
  }, []);

  // Filtered case studies
  const filteredStudies = useMemo(() => {
    return Object.entries(CASE_STUDIES).filter(([key, study]) => {
      // Category filter
      if (selectedCategory === 'FLAGSHIP') {
        if (!FLAGSHIP_KEYS.has(key)) return false;
      } else if (selectedCategory !== 'ALL' && study.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = study.name.toLowerCase().includes(q);
        const catMatch = study.category.toLowerCase().includes(q);
        const descMatch = study.description.toLowerCase().includes(q);
        const keyMatch = key.toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !descMatch && !keyMatch) return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#121722] border border-[#242f44] rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#171f30] border-b border-[#242f44] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Industrial Power System Benchmark Suite
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {Object.keys(CASE_STUDIES).length} Models
                </span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-world grid architectures, transmission networks, multi-terminal HVDC supergrids, and microgrids
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Category Filter Pills */}
        <div className="px-5 py-3 bg-[#141b29] border-b border-[#242f44] flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search benchmarks, equipment, or faults..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0b0e14] border border-[#242f44] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-[#0f141f] text-slate-400 hover:text-slate-200 border border-[#242f44]'
              }`}
            >
              All ({Object.keys(CASE_STUDIES).length})
            </button>

            <button
              onClick={() => setSelectedCategory('FLAGSHIP')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 whitespace-nowrap ${
                selectedCategory === 'FLAGSHIP'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-[#1a170f] text-amber-400 hover:text-amber-300 border border-amber-500/30'
              }`}
            >
              <Zap className="w-3 h-3 fill-current" />
              Flagship Benchmarks (4)
            </button>

            {categories.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-[#0f141f] text-slate-400 hover:text-slate-200 border border-[#242f44]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmarks Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {filteredStudies.map(([key, study]) => {
            const isFlagship = FLAGSHIP_KEYS.has(key);
            const compCount = study.components?.length || 0;
            const wireCount = study.wires?.length || 0;

            return (
              <div
                key={key}
                className={`rounded-xl p-4 flex flex-col justify-between transition-all duration-200 relative group ${
                  isFlagship
                    ? 'bg-gradient-to-b from-[#181f2f] to-[#0f1420] border-2 border-sky-500/40 hover:border-sky-400 shadow-lg shadow-sky-950/30'
                    : 'bg-[#0f141f] border border-[#242f44] hover:border-[#384869]'
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                      {study.category}
                    </span>

                    {isFlagship && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 tracking-wide">
                        <Zap className="w-3 h-3 fill-current text-amber-400" />
                        FLAGSHIP BENCHMARK
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors mb-2">
                    {study.name.replace(/_/g, ' ')}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 leading-relaxed text-[11px] mb-4 line-clamp-3">
                    {study.description}
                  </p>

                  {/* Topology / Scale Metrics */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161d2a] border border-[#242f44] text-[10px] text-slate-300">
                      <Cpu className="w-3 h-3 text-sky-400" />
                      <span>{compCount} components</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161d2a] border border-[#242f44] text-[10px] text-slate-300">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      <span>{wireCount} conductors</span>
                    </div>
                    {isFlagship && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-300 font-medium">
                        <ShieldCheck className="w-3 h-3 text-sky-400" />
                        <span>High-Fidelity EMTDC</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions & Execution Specs */}
                <div className="flex items-center justify-between border-t border-[#242f44] pt-3 mt-auto">
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-500" />
                      Δt: {(study.dt * 1e6).toFixed(0)} µs
                    </span>
                    <span>•</span>
                    <span>Tmax: {study.tMax} s</span>
                  </div>

                  <button
                    onClick={() => {
                      onLoadCase(key);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-md active:scale-95 ${
                      isFlagship
                        ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-sky-500/20'
                        : 'bg-[#1f6feb] hover:bg-[#388bfd] text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Load Circuit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredStudies.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No benchmark circuits match your search</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting "All".</p>
          </div>
        )}
      </div>
    </div>
  );
};
