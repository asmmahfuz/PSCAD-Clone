import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Cpu,
  Zap,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Copy,
  Check,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wrench,
  FileText,
} from 'lucide-react';
import type {
  LogEntry,
  OutputTabId,
  DiagnosticItem,
  DiagnosticSeverity,
  BuildReport,
  EMTDCEvent,
  CircuitComponentData,
  WireData,
  CircuitSheet,
  SimulationState,
  DiagnosticSortField,
  SortDirection,
  SeverityFiltersState,
} from '../../types';
import {
  formatDiagnosticReportText,
  formatDiagnosticReportJson,
  formatSignalTracingReportText,
} from '../../types';
import { SignalSearchTab, extractSignalNetworks } from './SignalSearchTab';

export interface OutputDockProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  diagnostics?: DiagnosticItem[];
  buildReport?: BuildReport | null;
  onRebuild?: () => void;
  emtdcEvents?: EMTDCEvent[];
  onClearEmtdcEvents?: () => void;
  components?: CircuitComponentData[];
  wires?: WireData[];
  sheets?: CircuitSheet[];
  activeSheetId?: string;
  onNavigateSheet?: (sheetId: string) => void;
  onSelectComponent?: (compId: string) => void;
  onJumpToComponent?: (
    componentId: string,
    sheetId?: string,
    severity?: DiagnosticSeverity,
    diag?: DiagnosticItem
  ) => void;
  simState?: SimulationState;
  activeTab?: OutputTabId;
  onTabChange?: (tab: OutputTabId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  projectName?: string;
}

export const OutputDock: React.FC<OutputDockProps> = ({
  logs,
  onClearLogs,
  diagnostics = [],
  buildReport,
  onRebuild,
  emtdcEvents = [],
  onClearEmtdcEvents,
  components = [],
  wires = [],
  sheets = [],
  activeSheetId = 'root',
  onNavigateSheet,
  onSelectComponent,
  onJumpToComponent,
  simState,
  activeTab: controlledTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  projectName = '3Ph_Transmission_Fault_Study',
}) => {
  const [internalTab, setInternalTab] = useState<OutputTabId>('build');
  const activeTab = controlledTab ?? internalTab;

  // Step 22.3: Jump to component on schematic canvas with viewport centering and beacon pulse
  const triggerJump = (
    componentId?: string,
    sheetId?: string,
    severity?: DiagnosticSeverity,
    diag?: DiagnosticItem
  ) => {
    if (!componentId && !sheetId) return;
    if (onJumpToComponent) {
      onJumpToComponent(componentId || '', sheetId, severity, diag);
    } else {
      if (sheetId && onNavigateSheet) onNavigateSheet(sheetId);
      if (componentId && onSelectComponent) onSelectComponent(componentId);
    }
  };


  const handleTabChange = (tab: OutputTabId) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Filters & State
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [emtdcTypeFilter, setEmtdcTypeFilter] = useState<'all' | 'switch' | 'cda' | 'fault' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Step 22.2: Structured Diagnostic Error & Warning Table State
  const [severityFilters, setSeverityFilters] = useState<SeverityFiltersState>({
    error: true,
    warning: true,
    info: true,
  });
  const [diagnosticsCategory, setDiagnosticsCategory] = useState<
    'all' | 'build' | 'compiler' | 'emtdc' | 'numerical'
  >('all');
  const [sortField, setSortField] = useState<DiagnosticSortField>('severity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);
  const emtdcEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new entries if enabled
  useEffect(() => {
    if (!autoScroll) return;
    if (activeTab === 'build') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'emtdc') {
      emtdcEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, emtdcEvents.length, activeTab, autoScroll]);

  // Derive consolidated diagnostics list from both netlist diagnostics and logs with severity
  const consolidatedDiagnostics: DiagnosticItem[] = useMemo(() => {
    const list: DiagnosticItem[] = [...diagnostics];

    // Also import warning/error logs that aren't already represented
    logs.forEach((log) => {
      if (log.type === 'error' || log.type === 'warning') {
        const alreadyExists = list.some((d) => d.id === log.id || d.message === log.text);
        if (!alreadyExists) {
          list.push({
            id: log.id,
            timestamp: log.time,
            simTime: log.simTime,
            category: log.category || (log.text.toLowerCase().includes('cda') ? 'emtdc' : 'compiler'),
            severity: log.type,
            code: log.code || (log.type === 'error' ? 'ERR-001' : 'WRN-001'),
            message: log.text,
            componentId: log.componentId,
            componentName: log.componentName,
            sheetId: log.sheetId,
            sheetName: log.sheetName,
            details: log.details,
          });
        }
      }
    });

    return list;
  }, [diagnostics, logs]);

  const errorCount = consolidatedDiagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = consolidatedDiagnostics.filter((d) => d.severity === 'warning').length;

  // Build Tab: Filtered compiler logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (severityFilter !== 'all' && l.type !== severityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return l.text.toLowerCase().includes(query) || l.time.toLowerCase().includes(query);
      }
      return true;
    });
  }, [logs, severityFilter, searchQuery]);

  // EMTDC Tab: Filtered events
  const filteredEmtdcEvents = useMemo(() => {
    return emtdcEvents.filter((evt) => {
      if (emtdcTypeFilter !== 'all') {
        if (emtdcTypeFilter === 'switch' && evt.type !== 'switch') return false;
        if (emtdcTypeFilter === 'cda' && evt.type !== 'cda') return false;
        if (emtdcTypeFilter === 'fault' && evt.type !== 'fault') return false;
        if (emtdcTypeFilter === 'system' && !['step_size', 'refactor', 'info', 'warning'].includes(evt.type)) {
          return false;
        }
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          evt.message.toLowerCase().includes(query) ||
          evt.code.toLowerCase().includes(query) ||
          (evt.componentName && evt.componentName.toLowerCase().includes(query)) ||
          (evt.componentId && evt.componentId.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [emtdcEvents, emtdcTypeFilter, searchQuery]);

  // Step 22.4: Signal Tracing & Cross-Reference Networks
  const signalNetworks = useMemo(() => {
    return extractSignalNetworks(sheets, components, activeSheetId);
  }, [sheets, components, activeSheetId]);

  // Step 22.2: Structured Errors & Warnings: Filtered, Sorted, and Expanded diagnostics
  const sortedAndFilteredDiagnostics = useMemo(() => {
    const list = consolidatedDiagnostics.filter((d) => {
      // 1. Severity filter toggles
      if (d.severity === 'error' && !severityFilters.error) return false;
      if (d.severity === 'warning' && !severityFilters.warning) return false;
      if (d.severity === 'info' && !severityFilters.info) return false;

      // 2. Category filter
      if (diagnosticsCategory !== 'all' && d.category !== diagnosticsCategory) return false;

      // 3. Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          d.message.toLowerCase().includes(query) ||
          d.code.toLowerCase().includes(query) ||
          (d.componentName && d.componentName.toLowerCase().includes(query)) ||
          (d.componentId && d.componentId.toLowerCase().includes(query)) ||
          (d.sheetName && d.sheetName.toLowerCase().includes(query)) ||
          (d.details && d.details.toLowerCase().includes(query)) ||
          (d.remedy && d.remedy.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // 4. Structured column sorting
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'severity': {
          const rank = { error: 0, warning: 1, info: 2 };
          cmp = rank[a.severity] - rank[b.severity];
          break;
        }
        case 'code':
          cmp = (a.code || '').localeCompare(b.code || '');
          break;
        case 'message':
          cmp = (a.message || '').localeCompare(b.message || '');
          break;
        case 'component': {
          const compA = a.componentName || a.componentId || '';
          const compB = b.componentName || b.componentId || '';
          cmp = compA.localeCompare(compB);
          break;
        }
        case 'sheet': {
          const sheetA = a.sheetName || '';
          const sheetB = b.sheetName || '';
          cmp = sheetA.localeCompare(sheetB);
          break;
        }
        case 'simTime': {
          const tA = a.simTime ?? -1;
          const tB = b.simTime ?? -1;
          cmp = tA - tB;
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [consolidatedDiagnostics, severityFilters, diagnosticsCategory, searchQuery, sortField, sortDirection]);

  const handleSort = (field: DiagnosticSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopySingleRow = (diag: DiagnosticItem) => {
    const line = `[${diag.severity.toUpperCase()}] ${diag.code}: ${diag.message} | Component: ${
      diag.componentName || diag.componentId || '—'
    } | Sheet: ${diag.sheetName || 'Main'} | SimTime: ${
      diag.simTime !== undefined ? `t=${diag.simTime.toFixed(4)}s` : 'Static'
    }${diag.remedy ? ` | Remedy: ${diag.remedy}` : ''}`;

    navigator.clipboard.writeText(line).then(() => {
      setCopiedRowId(diag.id);
      setTimeout(() => setCopiedRowId(null), 2000);
    });
  };

  const handleCopyJson = () => {
    const jsonText = formatDiagnosticReportJson(sortedAndFilteredDiagnostics, projectName);
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    });
  };

  // Clipboard copy handler
  const handleCopy = () => {
    let textToCopy = '';
    if (activeTab === 'build') {
      textToCopy = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    } else if (activeTab === 'emtdc') {
      textToCopy = emtdcEvents
        .map(
          (e) =>
            `[t=${e.simTime.toFixed(4)}s] [${e.code}] [${e.type.toUpperCase()}] ${e.message}${
              e.componentId ? ` (Component: ${e.componentId})` : ''
            }`
        )
        .join('\n');
    } else if (activeTab === 'search') {
      textToCopy = formatSignalTracingReportText(signalNetworks, projectName);
    } else if (activeTab === 'errors') {
      textToCopy = formatDiagnosticReportText(sortedAndFilteredDiagnostics, projectName);
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
      });
    }
  };

  const renderSortIndicator = (field: DiagnosticSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-60 ml-0.5" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-sky-400 font-bold ml-0.5" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-sky-400 font-bold ml-0.5" />
    );
  };

  // Clear current tab handler
  const handleClearCurrent = () => {
    if (activeTab === 'build' || activeTab === 'errors') {
      onClearLogs();
    } else if (activeTab === 'emtdc' && onClearEmtdcEvents) {
      onClearEmtdcEvents();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161b26] border-t border-[#263147] select-none text-xs font-sans">
      {/* 1. Main Navigation Tab Bar */}
      <div className="h-8 px-2 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between gap-2">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Tab 1: Build */}
          <button
            onClick={() => handleTabChange('build')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'build'
                ? 'cad-tab-active bg-[#202c42] text-sky-200 border-b-2 border-b-sky-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#263147]/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Build</span>
            {buildReport && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
                {buildReport.electricalNodes} N
              </span>
            )}
          </button>

          {/* Tab 2: EMTDC Messages */}
          <button
            onClick={() => handleTabChange('emtdc')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'emtdc'
                ? 'cad-tab-active bg-[#202c42] text-sky-200 border-b-2 border-b-sky-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#263147]/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>EMTDC Messages</span>
            {simState?.isRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="EMTDC Kernel Active" />
            )}
            {emtdcEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
                {emtdcEvents.length}
              </span>
            )}
          </button>

          {/* Tab 3: Search & Cross-References */}
          <button
            onClick={() => handleTabChange('search')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'search'
                ? 'cad-tab-active bg-[#202c42] text-sky-200 border-b-2 border-b-sky-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#263147]/60'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>Search &amp; Cross-Refs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-700/60 text-slate-300 font-mono border border-slate-600/40">
              {signalNetworks.length}
            </span>
          </button>

          {/* Tab 4: Errors & Warnings */}
          <button
            onClick={() => handleTabChange('errors')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'errors'
                ? 'cad-tab-active bg-[#202c42] text-sky-200 border-b-2 border-b-sky-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#263147]/60'
            }`}
          >
            <ShieldAlert
              className={`w-3.5 h-3.5 ${
                errorCount > 0 ? 'text-red-400' : warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            />
            <span>Errors &amp; Warnings</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  errorCount > 0
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {errorCount > 0 ? `${errorCount}E` : `${warningCount}W`}
              </span>
            )}
          </button>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Filter Input */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter Output..."
              className="bg-[#121620] text-slate-200 text-[10px] pl-6 pr-5 py-0.5 rounded border border-[#263147] focus:outline-none focus:border-sky-500 w-32 md:w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 text-slate-400 hover:text-white text-[10px]"
              >
                &times;
              </button>
            )}
          </div>

          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
            className={`p-1 rounded text-[10px] transition-colors ${
              autoScroll ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopy}
            title="Copy Report to Clipboard"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
          >
            {copiedState ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copiedState ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Rebuild Project */}
          {onRebuild && (
            <button
              onClick={onRebuild}
              title="Recompile Circuit & Regenerate Diagnostics"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-sky-400 hover:text-sky-200 hover:bg-sky-500/10 border border-sky-500/30 transition-colors"
            >
              <Cpu className="w-3 h-3" />
              <span className="hidden sm:inline">Rebuild</span>
            </button>
          )}

          {/* Clear Button */}
          <button
            onClick={handleClearCurrent}
            title="Clear Messages"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-red-400 hover:bg-[#263147] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Collapse / Expand Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Dock' : 'Minimize Dock'}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#263147] transition-colors ml-1"
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-Toolbar per Active Tab */}
      <div className="h-6 px-3 bg-[#181f2c] border-b border-[#263147] flex items-center justify-between text-[10px]">
        {/* Left: Tab-Specific Filters */}
        <div className="flex items-center gap-1">
          {activeTab === 'build' && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Compiler Filter:</span>
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  severityFilter === 'all'
                    ? 'chip-filter-active bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setSeverityFilter('info')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  severityFilter === 'info'
                    ? 'chip-filter-active bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Info
              </button>
              <button
                onClick={() => setSeverityFilter('warning')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  severityFilter === 'warning'
                    ? 'chip-filter-active bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Warnings ({warningCount})
              </button>
              <button
                onClick={() => setSeverityFilter('error')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  severityFilter === 'error'
                    ? 'chip-filter-active bg-red-500/20 text-red-300 border border-red-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Errors ({errorCount})
              </button>
            </div>
          )}

          {activeTab === 'emtdc' && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Event Type:</span>
              <button
                onClick={() => setEmtdcTypeFilter('all')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  emtdcTypeFilter === 'all'
                    ? 'chip-filter-active bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setEmtdcTypeFilter('switch')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  emtdcTypeFilter === 'switch'
                    ? 'chip-filter-active bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Switching
              </button>
              <button
                onClick={() => setEmtdcTypeFilter('cda')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  emtdcTypeFilter === 'cda'
                    ? 'chip-filter-active bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                CDA Chatter
              </button>
              <button
                onClick={() => setEmtdcTypeFilter('fault')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  emtdcTypeFilter === 'fault'
                    ? 'chip-filter-active bg-red-500/20 text-red-300 border border-red-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Faults
              </button>
              <button
                onClick={() => setEmtdcTypeFilter('system')}
                className={`px-1.5 py-0.2 rounded font-medium transition-colors ${
                  emtdcTypeFilter === 'system'
                    ? 'chip-filter-active bg-slate-500/20 text-slate-300 border border-slate-400/50 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                System &amp; Step
              </button>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Signal Cross-Reference &amp; Tracing:</span>
              <span className="text-slate-400 font-mono text-[10px]">
                {signalNetworks.length} Networks | {signalNetworks.reduce((acc, n) => acc + n.endpoints.length, 0)} Endpoints
              </span>
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="flex items-center gap-2 text-slate-400 overflow-x-auto">
              <span className="font-semibold text-slate-300 shrink-0">Severity:</span>

              {/* Toggle: Errors */}
              <button
                onClick={() => setSeverityFilters((prev) => ({ ...prev, error: !prev.error }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  severityFilters.error
                    ? 'bg-red-500/20 text-red-300 border border-red-500/60 shadow-sm shadow-red-950/40'
                    : 'bg-[#121620] text-slate-500 border border-slate-700/50 hover:text-slate-300 opacity-60'
                }`}
                title={severityFilters.error ? 'Click to hide Errors' : 'Click to show Errors'}
              >
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span>Errors ({errorCount})</span>
              </button>

              {/* Toggle: Warnings */}
              <button
                onClick={() => setSeverityFilters((prev) => ({ ...prev, warning: !prev.warning }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  severityFilters.warning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm shadow-amber-950/40'
                    : 'bg-[#121620] text-slate-500 border border-slate-700/50 hover:text-slate-300 opacity-60'
                }`}
                title={severityFilters.warning ? 'Click to hide Warnings' : 'Click to show Warnings'}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Warnings ({warningCount})</span>
              </button>

              {/* Toggle: Info */}
              <button
                onClick={() => setSeverityFilters((prev) => ({ ...prev, info: !prev.info }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  severityFilters.info
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-sm shadow-sky-950/40'
                    : 'bg-[#121620] text-slate-500 border border-slate-700/50 hover:text-slate-300 opacity-60'
                }`}
                title={severityFilters.info ? 'Click to hide Info notices' : 'Click to show Info notices'}
              >
                <Info className="w-3 h-3 text-sky-400" />
                <span>Info ({consolidatedDiagnostics.filter((d) => d.severity === 'info').length})</span>
              </button>

              {/* Quick: Show All */}
              <button
                onClick={() => setSeverityFilters({ error: true, warning: true, info: true })}
                className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-[#263147] transition-colors shrink-0"
                title="Reset all severity filters"
              >
                All
              </button>

              <div className="w-px h-3 bg-[#263147] mx-1" />

              {/* Category Filter */}
              <span className="font-semibold text-slate-300 shrink-0">Category:</span>
              <select
                value={diagnosticsCategory}
                onChange={(e) => setDiagnosticsCategory(e.target.value as any)}
                className="bg-[#121620] text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-[#263147] focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Categories</option>
                <option value="compiler">Compiler &amp; Domain</option>
                <option value="emtdc">EMTDC &amp; Runtime</option>
                <option value="build">Build &amp; Topology</option>
                <option value="numerical">Numerical &amp; Matrix</option>
              </select>

              <div className="w-px h-3 bg-[#263147] mx-1" />

              {/* Export Report Actions */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-300 hover:text-white hover:bg-[#263147] transition-colors shrink-0 border border-slate-700/60"
                title="Copy formatted PSCAD ASCII Diagnostic Report to Clipboard"
              >
                <FileText className="w-3 h-3 text-sky-400" />
                <span>Copy Report</span>
              </button>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-300 hover:text-white hover:bg-[#263147] transition-colors shrink-0 border border-slate-700/60"
                title="Copy Diagnostics as JSON"
              >
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Stats */}
        <div className="text-slate-500 font-mono hidden md:flex items-center gap-3">
          {activeTab === 'errors' && (
            <span>
              Showing <strong className="text-slate-200">{sortedAndFilteredDiagnostics.length}</strong> of{' '}
              <strong className="text-slate-400">{consolidatedDiagnostics.length}</strong>
            </span>
          )}
          {simState && (
            <span>
              t: <strong className="text-slate-300">{simState.t.toFixed(4)}s</strong> / {simState.tMax.toFixed(2)}s
            </span>
          )}
          {activeTab === 'build' && buildReport && (
            <span>
              Sparsity: <strong className="text-amber-400">{buildReport.sparsityPercent.toFixed(1)}%</strong>
            </span>
          )}
        </div>
      </div>

      {/* 3. Main Body Content Viewport */}
      <div className="flex-1 overflow-y-auto bg-[#0c0f17] font-mono text-[11px] p-2">
        {/* ========================================================= */}
        {/* TAB 1: BUILD                                              */}
        {/* ========================================================= */}
        {activeTab === 'build' && (
          <div className="space-y-3">
            {/* Build Stats Summary Card */}
            {buildReport && (
              <div className="bg-[#161b26] border border-[#263147] rounded p-2.5 font-sans">
                <div className="flex items-center justify-between border-b border-[#263147]/80 pb-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      PSCAD EMTDC Compiler - Circuit Netlist &amp; Sparse Matrix Allocation
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{buildReport.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[10px] font-mono">
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">Nodes (N)</div>
                    <div className="text-emerald-400 font-bold text-xs">{buildReport.electricalNodes}</div>
                  </div>
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">Matrix [G]</div>
                    <div className="text-slate-200 font-bold text-xs">
                      {buildReport.conductanceMatrixDim}&times;{buildReport.conductanceMatrixDim}
                    </div>
                  </div>
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">Non-Zeros (NNZ)</div>
                    <div className="text-cyan-400 font-bold text-xs">{buildReport.nonZeroElements}</div>
                  </div>
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">Sparsity Ratio</div>
                    <div className="text-amber-400 font-bold text-xs">{buildReport.sparsityPercent.toFixed(1)}%</div>
                  </div>
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">Markowitz Fill-Ins</div>
                    <div className="text-purple-400 font-bold text-xs">{buildReport.markowitzFillIns}</div>
                  </div>
                  <div className="bg-[#121620] p-1.5 rounded border border-[#263147]/60">
                    <div className="text-slate-500">LU Factor Time</div>
                    <div className="text-sky-400 font-bold text-xs">{buildReport.luFactorizationTimeMs.toFixed(2)} ms</div>
                  </div>
                </div>

                {/* 6 Compilation Phases Breakdown */}
                {buildReport.phases && buildReport.phases.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#263147]/80">
                    <div className="text-[10px] text-slate-400 font-semibold mb-1.5">Compilation Pipeline Phases:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-[10px]">
                      {buildReport.phases.map((ph) => (
                        <div
                          key={ph.phase}
                          className="flex items-center justify-between bg-[#121620] px-2 py-1 rounded border border-[#263147]/50"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-slate-300 truncate">
                              P{ph.phase}: {ph.name}
                            </span>
                          </div>
                          <span className="text-slate-500 font-mono shrink-0 ml-1">{ph.durationMs.toFixed(1)}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Monospace Chronological Compiler Log Stream */}
            <div className="space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 italic p-2">No compiler messages matching filter.</div>
              ) : (
                filteredLogs.map((l) => (
                  <div
                    key={l.id}
                    onDoubleClick={() =>
                      l.componentId &&
                      triggerJump(
                        l.componentId,
                        l.sheetId,
                        l.type === 'error' ? 'error' : l.type === 'warning' ? 'warning' : 'info'
                      )
                    }
                    className={`flex items-start gap-2 leading-tight select-none ${
                      l.componentId ? 'cursor-pointer hover:bg-[#161b26]/70 rounded px-1' : ''
                    } ${
                      l.type === 'error'
                        ? 'text-red-400'
                        : l.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                    title={l.componentId ? 'Double-click to jump to component on canvas' : undefined}
                  >
                    <span className="text-slate-500 shrink-0 font-mono">[{l.time}]</span>
                    <span className="shrink-0 mt-0.5">
                      {l.type === 'error' ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : l.type === 'warning' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Info className="w-3 h-3 text-sky-400" />
                      )}
                    </span>
                    <span className="break-all flex-1">{l.text}</span>
                    {l.componentId && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerJump(
                            l.componentId,
                            l.sheetId,
                            l.type === 'error' ? 'error' : l.type === 'warning' ? 'warning' : 'info'
                          );
                        }}
                        className="text-slate-400 hover:text-sky-300 cursor-pointer font-mono text-[10px] px-1 py-0.2 rounded bg-[#161b26] border border-[#263147] shrink-0"
                        title="Click to jump to component"
                      >
                        [{l.componentName || l.componentId}]
                      </span>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: EMTDC MESSAGES                                     */}
        {/* ========================================================= */}
        {activeTab === 'emtdc' && (
          <div className="space-y-1">
            {filteredEmtdcEvents.length === 0 ? (
              <div className="p-4 text-center font-sans">
                <Zap className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <div className="text-slate-400 font-medium">No EMTDC runtime events logged yet.</div>
                <div className="text-slate-600 text-[10px] mt-1">
                  Start or step the simulation to capture switching operations, breaker trips, CDA chatter damping
                  adjustments, and step size alerts.
                </div>
              </div>
            ) : (
              filteredEmtdcEvents.map((evt) => (
                <div
                  key={evt.id}
                  onDoubleClick={() =>
                    evt.componentId &&
                    triggerJump(
                      evt.componentId,
                      undefined,
                      evt.type === 'fault' ? 'error' : evt.type === 'cda' ? 'warning' : 'info'
                    )
                  }
                  className={`flex items-start gap-2 py-1 px-1.5 rounded hover:bg-[#161b26] transition-colors border-b border-[#263147]/30 select-none ${
                    evt.componentId ? 'cursor-pointer' : ''
                  }`}
                  title={evt.componentId ? 'Double-click to jump to component on canvas' : undefined}
                >
                  {/* Sim Time Badge */}
                  <span className="px-1.5 py-0.2 rounded bg-[#121620] border border-[#263147] text-cyan-400 font-mono text-[10px] shrink-0">
                    t={evt.simTime.toFixed(4)}s
                  </span>

                  {/* Event Code & Type */}
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      evt.type === 'cda'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : evt.type === 'switch'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : evt.type === 'fault'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {evt.code}
                  </span>

                  {/* Message content */}
                  <span className="text-slate-300 flex-1">{evt.message}</span>

                  {/* Optional Component Tag */}
                  {evt.componentId && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerJump(
                          evt.componentId,
                          undefined,
                          evt.type === 'fault' ? 'error' : evt.type === 'cda' ? 'warning' : 'info'
                        );
                      }}
                      className="text-slate-400 hover:text-sky-300 cursor-pointer font-mono text-[10px] shrink-0 px-1 py-0.2 rounded bg-[#161b26] border border-[#263147]"
                      title="Click or double-click to jump to component"
                    >
                      [{evt.componentName || evt.componentId}]
                    </span>
                  )}

                  {/* Wall clock timestamp */}
                  <span className="text-slate-600 text-[10px] shrink-0 font-mono">[{evt.timestamp}]</span>
                </div>
              ))
            )}
            <div ref={emtdcEndRef} />
          </div>
        )}


        {/* ========================================================= */}
        {/* TAB 3: SEARCH & CROSS-REFERENCES (Step 22.4 SignalSearch)  */}
        {/* ========================================================= */}
        {activeTab === 'search' && (
          <SignalSearchTab
            sheets={sheets}
            components={components}
            wires={wires}
            activeSheetId={activeSheetId}
            onNavigateSheet={onNavigateSheet}
            onSelectComponent={onSelectComponent}
            onJumpToComponent={triggerJump}
            externalSearchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            projectName={projectName}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 4: ERRORS & WARNINGS (Step 22.2 Structured Table)      */}
        {/* ========================================================= */}
        {activeTab === 'errors' && (
          <div className="font-sans">
            {sortedAndFilteredDiagnostics.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                <div className="text-slate-300 font-medium">No diagnostics found matching filter.</div>
                <div className="text-slate-500 text-[10px] mt-1">
                  All active category and severity checks passed with zero errors or warnings.
                </div>
              </div>
            ) : (
              <div className="border border-[#263147] rounded overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#1c2333] border-b border-[#263147] text-slate-400 font-semibold text-[10px]">
                      {/* Column 1: Severity */}
                      <th
                        onClick={() => handleSort('severity')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Severity ranking"
                      >
                        <div className="flex items-center gap-1">
                          <span>Severity</span>
                          {renderSortIndicator('severity')}
                        </div>
                      </th>

                      {/* Column 2: Code */}
                      <th
                        onClick={() => handleSort('code')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Diagnostic Code"
                      >
                        <div className="flex items-center gap-1">
                          <span>Code</span>
                          {renderSortIndicator('code')}
                        </div>
                      </th>

                      {/* Column 3: Message Summary */}
                      <th
                        onClick={() => handleSort('message')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Message Summary"
                      >
                        <div className="flex items-center gap-1">
                          <span>Message Summary</span>
                          {renderSortIndicator('message')}
                        </div>
                      </th>

                      {/* Column 4: Component */}
                      <th
                        onClick={() => handleSort('component')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Component"
                      >
                        <div className="flex items-center gap-1">
                          <span>Component</span>
                          {renderSortIndicator('component')}
                        </div>
                      </th>

                      {/* Column 5: Sheet */}
                      <th
                        onClick={() => handleSort('sheet')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Sheet Location"
                      >
                        <div className="flex items-center gap-1">
                          <span>Sheet / Module</span>
                          {renderSortIndicator('sheet')}
                        </div>
                      </th>

                      {/* Column 6: Sim Time */}
                      <th
                        onClick={() => handleSort('simTime')}
                        className="py-1.5 px-3 cursor-pointer hover:text-white transition-colors select-none"
                        title="Sort by Simulation Time"
                      >
                        <div className="flex items-center gap-1">
                          <span>Sim Time</span>
                          {renderSortIndicator('simTime')}
                        </div>
                      </th>

                      {/* Column 7: Actions */}
                      <th className="py-1.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263147]/50 bg-[#0c0f17]">
                    {sortedAndFilteredDiagnostics.map((diag) => {
                      const isExpanded = expandedRowIds.has(diag.id);
                      const hasExpandableContent = !!(diag.details || diag.remedy);
                      const isRowCopied = copiedRowId === diag.id;

                      return (
                        <React.Fragment key={diag.id}>
                          <tr
                            onClick={() => hasExpandableContent && toggleRowExpand(diag.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              triggerJump(diag.componentId, diag.sheetId, diag.severity, diag);
                            }}
                            className={`transition-colors group select-none ${
                              hasExpandableContent ? 'cursor-pointer' : ''
                            } ${
                              diag.severity === 'error'
                                ? 'border-l-4 border-l-red-500 hover:bg-red-950/20 bg-red-950/10'
                                : diag.severity === 'warning'
                                ? 'border-l-4 border-l-amber-500 hover:bg-amber-950/20 bg-amber-950/10'
                                : 'border-l-4 border-l-sky-500 hover:bg-sky-950/20 bg-sky-950/10'
                            }`}
                            title="Double-click to jump to component on schematic canvas"
                          >
                            {/* Column 1: Severity (Icon) */}
                            <td className="py-1.5 px-3 shrink-0 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                                  diag.severity === 'error'
                                    ? 'bg-red-500/25 text-red-300 border border-red-500/50 shadow-sm shadow-red-950/50'
                                    : diag.severity === 'warning'
                                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/50'
                                    : 'bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-sm shadow-sky-950/50'
                                }`}
                              >
                                {diag.severity === 'error' ? (
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                ) : diag.severity === 'warning' ? (
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                ) : (
                                  <Info className="w-3 h-3 text-sky-400" />
                                )}
                                <span>{diag.severity}</span>
                              </span>
                            </td>

                            {/* Column 2: Code (e.g. ERR-201) */}
                            <td className="py-1.5 px-3 font-mono font-bold whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                  diag.severity === 'error'
                                    ? 'bg-red-950/50 text-red-300 border-red-700/60'
                                    : diag.severity === 'warning'
                                    ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'
                                    : 'bg-sky-950/50 text-sky-300 border-sky-700/60'
                                }`}
                              >
                                {diag.code || (diag.severity === 'error' ? 'ERR-001' : 'WRN-001')}
                              </span>
                            </td>

                            {/* Column 3: Message Summary */}
                            <td className="py-1.5 px-3 text-slate-200">
                              <div className="flex items-center gap-1.5">
                                {hasExpandableContent && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRowExpand(diag.id);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-white transition-colors"
                                    title={isExpanded ? 'Collapse Details' : 'Expand Details & Remedy'}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3 text-sky-400" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                                <span className="font-medium leading-relaxed">{diag.message}</span>
                              </div>
                            </td>

                            {/* Column 4: Component Name / ID */}
                            <td className="py-1.5 px-3 font-mono text-[10px] text-slate-300 whitespace-nowrap">
                              {diag.componentId ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerJump(diag.componentId, diag.sheetId, diag.severity, diag);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    triggerJump(diag.componentId, diag.sheetId, diag.severity, diag);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#161b26] hover:bg-[#1f6feb]/30 border border-[#263147] hover:border-sky-500/50 text-slate-200 hover:text-sky-300 transition-colors"
                                  title={`Click or double-click to jump to component: ${diag.componentName || diag.componentId}`}
                                >
                                  <span className="font-semibold text-slate-100">
                                    {diag.componentName || diag.componentId}
                                  </span>
                                  {diag.componentName && diag.componentId !== diag.componentName && (
                                    <span className="text-slate-500 text-[9px]">[{diag.componentId}]</span>
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-600 font-sans">&mdash;</span>
                              )}
                            </td>

                            {/* Column 5: Sheet / Module */}
                            <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap text-[10px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (diag.sheetId && onNavigateSheet) onNavigateSheet(diag.sheetId);
                                }}
                                className="inline-flex items-center gap-1 hover:text-sky-300 transition-colors"
                                title={`Jump to sheet: ${diag.sheetName || 'Main Schematic'}`}
                              >
                                <Layers className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{diag.sheetName || 'Main Schematic'}</span>
                              </button>
                            </td>

                            {/* Column 6: Sim Time (s) */}
                            <td className="py-1.5 px-3 font-mono text-[10px] whitespace-nowrap">
                              {diag.simTime !== undefined ? (
                                <span className="px-1.5 py-0.2 rounded bg-[#121620] border border-[#263147] text-cyan-300 font-bold">
                                  {diag.simTime.toFixed(4)} s
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Static (Build)</span>
                              )}
                            </td>

                            {/* Column 7: Actions */}
                            <td className="py-1.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopySingleRow(diag);
                                  }}
                                  title="Copy this Diagnostic row"
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
                                >
                                  {isRowCopied ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>

                                {diag.componentId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerJump(diag.componentId, diag.sheetId, diag.severity, diag);
                                    }}
                                    title="Jump to &amp; Highlight Component on Canvas (Double-click row also jumps)"
                                    className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-[#263147] transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Diagnostic Drawer (Details & Remedy) */}
                          {isExpanded && hasExpandableContent && (
                            <tr className="bg-[#10141f] border-b border-[#263147]/80 text-[11px]">
                              <td colSpan={7} className="px-6 py-2.5 space-y-2 border-l-4 border-l-sky-500/50">
                                {diag.details && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-slate-400 font-semibold shrink-0">Analysis:</span>
                                    <span className="text-slate-300 leading-relaxed">{diag.details}</span>
                                  </div>
                                )}
                                {diag.remedy && (
                                  <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/30 rounded p-2 text-emerald-300">
                                    <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-emerald-400">Recommended Remedy: </span>
                                      <span className="leading-relaxed">{diag.remedy}</span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1 border-t border-[#263147]/40 font-mono">
                                  <span>ID: {diag.id}</span>
                                  <span>Category: {diag.category}</span>
                                  <span>Timestamp: {diag.timestamp || 'Compile-Time'}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
