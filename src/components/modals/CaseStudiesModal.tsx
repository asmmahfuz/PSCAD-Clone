import React, { useState, useMemo } from 'react';
import { X, Layers, Play, Search, Zap, Cpu, ShieldCheck, Activity, Gauge } from 'lucide-react';
import { CASE_STUDIES } from '../../examples/caseStudies';

interface CaseStudiesModalProps {
  onLoadCase: (caseKey: string) => void;
  onClose: () => void;
  theme?: string;
}

const FLAGSHIP_KEYS = new Set([
  'IEEE_9BUS_WSCC_GRID',
  'CIGRE_B4_DC_SUPERGRID',
  'INDUSTRIAL_MICROGRID_ISLANDING',
  'SUBSTATION_ANSI_PROTECTION'
]);

export const CaseStudiesModal: React.FC<CaseStudiesModalProps> = ({ onLoadCase, onClose, theme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const isLight = theme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

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
    <div
      className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans text-xs ${
        isLight ? 'bg-slate-900/40' : 'bg-black/75'
      }`}
    >
      <div
        className={`border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#121722] border-[#242f44]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171f30] border-[#242f44]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-500/10 border-sky-500/30'
              }`}
            >
              <Layers className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            </div>
            <div>
              <span className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Industrial Power System Benchmark Suite
                <span
                  className={`text-[10px] font-normal px-2 py-0.5 rounded-full border ${
                    isLight ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {Object.keys(CASE_STUDIES).length} Models
                </span>
              </span>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Real-world grid architectures, transmission networks, multi-terminal HVDC supergrids, and microgrids
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Category Filter Pills */}
        <div
          className={`px-5 py-3 border-b flex flex-col sm:flex-row gap-3 items-center justify-between ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#141b29] border-[#242f44]'
          }`}
        >
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search benchmarks, equipment, or faults..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs transition-colors focus:outline-none focus:border-sky-500 ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-[#0b0e14] border border-[#242f44] text-slate-200 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
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
                  : isLight
                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
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
                    ? 'bg-sky-600 text-white shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                    : 'bg-[#0f141f] text-slate-400 hover:text-slate-200 border border-[#242f44]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmarks Grid */}
        <div
          className={`p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(90vh-140px)] ${
            isLight ? 'bg-slate-50/40' : ''
          }`}
        >
          {filteredStudies.map(([key, study]) => {
            const isFlagship = FLAGSHIP_KEYS.has(key);
            const compCount = study.components?.length || 0;
            const wireCount = study.wires?.length || 0;

            const cardClasses = isFlagship
              ? isLight
                ? 'bg-white border-2 border-amber-400/90 hover:border-amber-500 shadow-md ring-1 ring-amber-400/20'
                : 'bg-gradient-to-b from-[#181f2f] to-[#0f1420] border-2 border-sky-500/40 hover:border-sky-400 shadow-lg shadow-sky-950/30'
              : isLight
                ? 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm'
                : 'bg-[#0f141f] border border-[#242f44] hover:border-[#384869]';

            return (
              <div
                key={key}
                className={`rounded-xl p-4 flex flex-col justify-between transition-all duration-200 relative group ${cardClasses}`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}
                    >
                      {study.category}
                    </span>

                    {isFlagship && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide ${
                          isLight
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        <Zap className={`w-3 h-3 fill-current ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                        FLAGSHIP BENCHMARK
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-sm font-bold transition-colors mb-2 ${
                      isLight
                        ? 'text-slate-900 group-hover:text-blue-600'
                        : 'text-slate-100 group-hover:text-sky-300'
                    }`}
                  >
                    {study.name.replace(/_/g, ' ')}
                  </h3>

                  {/* Description */}
                  <p
                    className={`leading-relaxed text-[11px] mb-4 line-clamp-3 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {study.description}
                  </p>

                  {/* Topology / Scale Metrics */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-700'
                          : 'bg-[#161d2a] border border-[#242f44] text-slate-300'
                      }`}
                    >
                      <Cpu className={`w-3 h-3 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                      <span>{compCount} components</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-700'
                          : 'bg-[#161d2a] border border-[#242f44] text-slate-300'
                      }`}
                    >
                      <Activity className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span>{wireCount} conductors</span>
                    </div>
                    {isFlagship && (
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          isLight
                            ? 'bg-sky-50 border border-sky-200 text-sky-800'
                            : 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
                        }`}
                      >
                        <ShieldCheck className={`w-3 h-3 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                        <span>High-Fidelity EMTDC</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions & Execution Specs */}
                <div
                  className={`flex items-center justify-between border-t pt-3 mt-auto ${
                    isLight ? 'border-slate-200' : 'border-[#242f44]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 text-[10px] font-mono ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Gauge className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
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
                        ? isLight
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/20'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-sky-500/20'
                        : isLight
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              No benchmark circuits match your search
            </p>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              Try clearing your search query or selecting "All".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
