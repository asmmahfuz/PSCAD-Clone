import React, { useState, useEffect, useMemo } from 'react';
import {
  FilePlus,
  FolderOpen,
  Search,
  Pin,
  Trash2,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Activity,
  FileCode,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sessionManager, type RecentProject } from '../../services/sessionManager';

interface StartPageProps {
  theme?: string;
  onOpenProject: (caseStudyKey: string) => void;
  onNewProject: () => void;
  onOpenFromFile: () => void;
  onOpenMasterLibrary: () => void;
  onShowModal?: (modalId: any) => void;
}

export const StartPage: React.FC<StartPageProps> = ({
  theme,
  onOpenProject,
  onNewProject,
  onOpenFromFile,
  onOpenMasterLibrary,
  onShowModal,
}) => {
  const isDark = theme === 'dark';
  const isBlueprint = theme === 'blueprint';

  // Startup checkbox preference
  const [showOnStartup, setShowOnStartup] = useState<boolean>(() => {
    try {
      const pref = localStorage.getItem('pscad_show_start_page_on_startup');
      return pref === null ? true : pref === 'true';
    } catch (e) {
      return true;
    }
  });

  const handleToggleShowOnStartup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    setShowOnStartup(nextVal);
    try {
      localStorage.setItem('pscad_show_start_page_on_startup', String(nextVal));
    } catch (err) {}
  };

  // Recent Projects state
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('pscad_pinned_projects');
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {}
    return new Set(['proj_3ph_fault']);
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    let list = await sessionManager.getRecentProjects();
    if (!list || list.length === 0) {
      // Seed default authentic PSCAD benchmark projects in recent list
      list = [
        {
          id: 'proj_3ph_fault',
          name: '3Ph_Transmission_Fault_Study.pscx',
          path: 'C:\\PSCAD\\Projects\\Transmission\\3Ph_Line_Fault_Study.pscx',
          lastOpened: Date.now() - 3600000 * 2,
          componentCount: 15,
          wireCount: 16,
        },
        {
          id: 'proj_ieee_9bus',
          name: 'IEEE_9_Bus_System.pscx',
          path: 'C:\\PSCAD\\Projects\\IEEE_Benchmarks\\IEEE_9_Bus_System.pscx',
          lastOpened: Date.now() - 3600000 * 24,
          componentCount: 42,
          wireCount: 38,
        },
        {
          id: 'proj_cigre_b4',
          name: 'CIGRE_B4_MultiTerminal_HVDC_Supergrid.pscx',
          path: 'C:\\PSCAD\\Projects\\HVDC\\CIGRE_B4_DC_Supergrid.pscx',
          lastOpened: Date.now() - 3600000 * 48,
          componentCount: 35,
          wireCount: 32,
        },
        {
          id: 'proj_xfmr_inrush',
          name: 'Transformer_Inrush_Study.pscx',
          path: 'C:\\PSCAD\\Projects\\Magnetics\\Transformer_Inrush_Study.pscx',
          lastOpened: Date.now() - 3600000 * 72,
          componentCount: 18,
          wireCount: 14,
        },
      ];
    }
    setRecentProjects(list);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('pscad_pinned_projects', JSON.stringify(Array.from(next)));
      } catch (err) {}
      return next;
    });
  };

  const handleRemoveRecent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await sessionManager.removeRecentProject(id);
    setRecentProjects(updated.length > 0 ? updated : recentProjects.filter((p) => p.id !== id));
  };

  // Case study examples catalog
  const benchmarkExamples = [
    {
      key: 'TRANSMISSION_FAULT',
      title: '3-Phase Line Fault & Protection Study',
      fileName: '3Ph_Line_Fault_Study.pscx',
      category: 'Transmission & Protection',
      catKey: 'TRANSMISSION',
      badge: 'Flagship Benchmark',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
      description:
        '230 kV 3-phase grid feeding a 100 km Bergeron transmission line. A single line-to-ground (SLG-A) fault occurs at t=0.10s. The 3-phase breaker trips at t=0.15s, clearing the fault, and attempts auto-reclosure at t=0.35s.',
      highlights: ['230 kV Grid', '100 km Bergeron Line', 'SLG-A Fault at 0.10s', 'Auto-Reclose at 0.35s'],
      icon: '⚡',
    },
    {
      key: 'IEEE_9_BUS',
      title: 'IEEE 9-Bus Industrial Benchmark Network',
      fileName: 'IEEE_9_Bus_System.pscx',
      category: 'Transmission & Grids',
      catKey: 'TRANSMISSION',
      badge: 'IEEE Benchmark',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
      description:
        'Western System Coordinating Council (WSCC) 3-machine 9-bus benchmark system. Features hydro, thermal, and gas generation stations, 125 MW load centers, and multi-line transmission grid.',
      highlights: ['3 Gen Stations', '9 Substation Buses', '125 MW Load Center', 'Transient Stability'],
      icon: '🌐',
    },
    {
      key: 'CIGRE_B4_DC_SUPERGRID',
      title: 'CIGRÉ B4 Multi-Terminal HVDC Supergrid',
      fileName: 'CIGRE_B4_DC_Supergrid.pscx',
      category: 'Power Electronics & FACTS',
      catKey: 'POWER_ELECTRONICS',
      badge: 'CIGRÉ Standard',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
      description:
        'CIGRÉ B4 benchmark ±320 kV DC / 230 kV AC Multi-Terminal HVDC Supergrid. Integrates an offshore wind collection hub (400 MW MMC Rectifier) transmitting bulk energy via 120 km subsea DC cables into onshore receiving grids.',
      highlights: ['±320 kV DC', '400 MW MMC Rectifier', '120 km Subsea Cable', 'Low THD < 0.8%'],
      icon: '🌊',
    },
    {
      key: 'TRANSFORMER_INRUSH',
      title: 'UMEC 3-Phase Transformer Inrush & Saturation',
      fileName: 'Transformer_Inrush_Study.pscx',
      category: 'Transformers & Magnetics',
      catKey: 'TRANSFORMERS',
      badge: 'Magnetic Saturation',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
      description:
        'Unified Magnetic Equivalent Circuit (UMEC) 3-limb transformer model demonstrating core flux saturation, remanent magnetization, and high-order harmonic inrush currents.',
      highlights: ['250 MVA UMEC Core', '3-Limb Non-Linear', '230/16.5 kV Dyn1', 'Harmonic Spectrum'],
      icon: '🧲',
    },
    {
      key: 'CIGRE_HVDC_12PULSE',
      title: 'CIGRE Benchmark 12-Pulse HVDC Link',
      fileName: 'CIGRE_HVDC_12Pulse.pscx',
      category: 'Power Electronics & FACTS',
      catKey: 'POWER_ELECTRONICS',
      badge: '12-Pulse Graetz',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800',
      description:
        'Standard 500 kV, 1000 MW monopolar 12-pulse line-commutated converter (LCC) HVDC transmission system connecting two asynchronous 50 Hz and 60 Hz AC grids.',
      highlights: ['500 kV / 1000 MW', '12-Pulse Converter', 'Asynchronous Link', 'Harmonic Filters'],
      icon: '🔌',
    },
    {
      key: 'MICROGRID_PV_BESS',
      title: 'Grid-Forming Inverter & BESS Microgrid',
      fileName: 'Microgrid_PV_BESS.pscx',
      category: 'Renewables & Microgrids',
      catKey: 'RENEWABLES',
      badge: 'Grid-Forming',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
      description:
        'Autonomous microgrid featuring a 500 kW photovoltaic array and 1 MWh battery energy storage system operating with virtual synchronous generator (VSG) droop control.',
      highlights: ['500 kW Solar PV', '1 MWh BESS', 'Virtual Synchronous', 'Islanding Operation'],
      icon: '☀️',
    },
  ];

  // Filtering recent projects
  const filteredRecent = useMemo(() => {
    return recentProjects
      .filter((p) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.path && p.path.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.has(a.id) ? 1 : 0;
        const bPinned = pinnedIds.has(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return (b.lastOpened || 0) - (a.lastOpened || 0);
      });
  }, [recentProjects, pinnedIds, searchQuery]);

  // Filtering example benchmarks
  const filteredBenchmarks = useMemo(() => {
    return benchmarkExamples.filter((b) => {
      const matchesCat = activeCategory === 'ALL' || b.catKey === activeCategory;
      if (!matchesCat) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleOpenRecent = (item: RecentProject) => {
    if (item.id === 'proj_3ph_fault' || item.name.includes('3Ph')) {
      onOpenProject('TRANSMISSION_FAULT');
    } else if (item.name.includes('IEEE_9')) {
      onOpenProject('IEEE_9_BUS');
    } else if (item.name.includes('CIGRE_B4') || item.name.includes('HVDC')) {
      onOpenProject('CIGRE_B4_DC_SUPERGRID');
    } else if (item.name.includes('Transformer') || item.name.includes('Inrush')) {
      onOpenProject('TRANSFORMER_INRUSH');
    } else {
      onOpenProject('TRANSMISSION_FAULT');
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col overflow-y-auto select-none font-sans transition-colors ${
        isDark ? 'bg-[#0f172a] text-slate-100' : isBlueprint ? 'bg-[#091b36] text-sky-100' : 'bg-[#f8fafc] text-slate-800'
      }`}
    >
      {/* Top Banner / Header (PSCAD v5 1:1 Aesthetic) */}
      <header
        className={`px-8 py-5 border-b shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
          isDark
            ? 'bg-[#1e293b] border-slate-700/80'
            : isBlueprint
            ? 'bg-[#0c2347] border-sky-800/80'
            : 'bg-white border-[#cbd5e1]'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Authentic PSCAD Emblem */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center shadow-md shrink-0 border border-blue-400/40">
            <span className="text-white font-black text-xl tracking-tighter drop-shadow-xs">P5</span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-blue-900 dark:text-blue-200">
                PSCAD™ <span className="text-blue-600 dark:text-sky-400 font-bold">EMTDC™</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                v5.1.0 Professional
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                EMTDC Engine Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Electromagnetic Transient CAD & Numerical Simulation Suite — Manitoba Hydro International
            </p>
          </div>
        </div>

        {/* Global Search & Master Library link */}
        <div className="flex items-center gap-3">
          <div className="relative w-72 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, benchmarks, topics..."
              className={`w-full pl-9 pr-4 py-1.5 rounded-md text-xs border transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500'
                  : isBlueprint
                  ? 'bg-sky-950 border-sky-800 text-sky-200 placeholder-sky-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={onOpenMasterLibrary}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400 shadow-2xs'
            }`}
            title="Open PSCAD Master Component Library (master.pslx)"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Master Library</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Content Layout (Authentic PSCAD v5 Start Page) */}
      <main className="flex-1 p-6 lg:p-8 max-w-[1680px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* COLUMN 1: Workspaces & Projects (4 Cols) */}
        {/* ========================================================================= */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          {/* Quick Actions Card */}
          <div
            className={`p-4 rounded-xl border shadow-xs ${
              isDark
                ? 'bg-slate-800/80 border-slate-700'
                : isBlueprint
                ? 'bg-sky-900/60 border-sky-800'
                : 'bg-white border-[#cbd5e1]'
            }`}
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Get Started</span>
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onNewProject}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all group ${
                  isDark
                    ? 'bg-slate-900/80 hover:bg-blue-950/40 border-slate-700 hover:border-blue-600 text-slate-200'
                    : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200 hover:border-blue-400 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FilePlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">New Project</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Blank *.pscx</div>
                </div>
              </button>

              <button
                onClick={onOpenFromFile}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all group ${
                  isDark
                    ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Open File...</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Browse disk</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Projects List */}
          <div
            className={`flex-1 flex flex-col p-4 rounded-xl border shadow-xs min-h-[340px] ${
              isDark
                ? 'bg-slate-800/80 border-slate-700'
                : isBlueprint
                ? 'bg-sky-900/60 border-sky-800'
                : 'bg-white border-[#cbd5e1]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Recent Projects</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {filteredRecent.length}
                </span>
              </h2>

              {onShowModal && (
                <button
                  onClick={() => onShowModal('recentProjects')}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[460px]">
              {filteredRecent.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span>No recent projects found matching your search.</span>
                </div>
              ) : (
                filteredRecent.map((proj) => {
                  const isPinned = pinnedIds.has(proj.id);
                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenRecent(proj)}
                      className={`group relative flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isDark
                          ? 'bg-slate-900/60 hover:bg-slate-800/90 border-slate-700/60 hover:border-blue-500/50'
                          : 'bg-slate-50/80 hover:bg-blue-50/40 border-slate-200/80 hover:border-blue-300 shadow-2xs'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                        <FileCode className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-12">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {proj.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {proj.path || 'Workspace root'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>{formatRelativeTime(proj.lastOpened)}</span>
                          {proj.componentCount !== undefined && (
                            <span>{proj.componentCount} components</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Pin, Delete) */}
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleTogglePin(proj.id, e)}
                          title={isPinned ? 'Unpin project' : 'Pin to top'}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                            isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleRemoveRecent(proj.id, e)}
                          title="Remove from recent list"
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: Examples & Case Studies (5 Cols) */}
        {/* ========================================================================= */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div
            className={`flex-1 p-5 rounded-xl border shadow-xs flex flex-col ${
              isDark
                ? 'bg-slate-800/80 border-slate-700'
                : isBlueprint
                ? 'bg-sky-900/60 border-sky-800'
                : 'bg-white border-[#cbd5e1]'
            }`}
          >
            {/* Section Header & Categories */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Example Projects & Benchmarks</span>
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700/80">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'TRANSMISSION', label: 'Transmission & Grids' },
                { key: 'POWER_ELECTRONICS', label: 'Power Electronics' },
                { key: 'TRANSFORMERS', label: 'Transformers' },
                { key: 'RENEWABLES', label: 'Renewables' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    activeCategory === cat.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark
                      ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Example Project Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[560px]">
              {filteredBenchmarks.map((bm) => (
                <div
                  key={bm.key}
                  onClick={() => onOpenProject(bm.key)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                    isDark
                      ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-700 hover:border-blue-500 shadow-sm'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{bm.icon}</span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {bm.title}
                      </h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${bm.badgeColor}`}>
                      {bm.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {bm.description}
                  </p>

                  {/* Feature Highlights Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {bm.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Action Link Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {bm.fileName}
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Open Model</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: Resources, Documentation & Support (3 Cols) */}
        {/* ========================================================================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <div
            className={`p-5 rounded-xl border shadow-xs ${
              isDark
                ? 'bg-slate-800/80 border-slate-700'
                : isBlueprint
                ? 'bg-sky-900/60 border-sky-800'
                : 'bg-white border-[#cbd5e1]'
            }`}
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>Resources & Support</span>
            </h2>

            <div className="space-y-2.5">
              {[
                {
                  title: 'PSCAD Knowledge Base',
                  desc: 'Technical application notes, FAQs, and modeling guides.',
                  icon: BookOpen,
                  action: () => window.open('https://www.pscad.com/knowledge-base', '_blank'),
                },
                {
                  title: 'EMTDC Reference & Theory',
                  desc: 'Dommel algorithm, companion circuits, and CDA equations.',
                  icon: Activity,
                  action: () => onShowModal?.('help'),
                },
                {
                  title: 'Python Scripting Guide',
                  desc: 'Automated parametric sweeps & batch simulation runs.',
                  icon: FileCode,
                  action: () => onShowModal?.('automationServer'),
                },
                {
                  title: 'What’s New in PSCAD v5',
                  desc: 'Bergeron lines, multi-monitor scopes, & 6-phase compiler.',
                  icon: Sparkles,
                  action: () => onShowModal?.('help'),
                },
              ].map((res, i) => {
                const IconComponent = res.icon;
                return (
                  <button
                    key={i}
                    onClick={res.action}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all group ${
                      isDark
                        ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
                        : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200/80 hover:border-blue-300 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
                        <span>{res.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {res.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Licensing & System Status Badge */}
          <div
            className={`p-4 rounded-xl border shadow-xs ${
              isDark
                ? 'bg-slate-800/80 border-slate-700'
                : isBlueprint
                ? 'bg-sky-900/60 border-sky-800'
                : 'bg-white border-[#cbd5e1]'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                License & Environment
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">License:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  PSCAD Professional (Active)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Numerical Kernel:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">EMTDC 64-Bit</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sparsity Engine:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">LU Markowitz Factor</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Footer (Authentic PSCAD v5 Start Page Setting) */}
      <footer
        className={`px-8 py-3 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isDark
            ? 'bg-[#1e293b] border-slate-700 text-slate-400'
            : isBlueprint
            ? 'bg-[#0c2347] border-sky-800 text-sky-300'
            : 'bg-white border-[#cbd5e1] text-slate-500'
        }`}
      >
        {/* "Show Start Page on startup" checkbox */}
        <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <input
            type="checkbox"
            checked={showOnStartup}
            onChange={handleToggleShowOnStartup}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
          />
          <span>Show Start Page on application startup</span>
        </label>

        {/* MHI Copyright notice */}
        <div className="text-[11px] text-center sm:text-right">
          <span>PSCAD™ v5.1.0 Professional &bull; EMTDC™ &bull; © Manitoba Hydro International Ltd.</span>
        </div>
      </footer>
    </div>
  );
};
