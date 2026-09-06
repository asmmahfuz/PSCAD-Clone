import React, { useState, useMemo } from 'react';
import {
  Search,
  Radio,
  Share2,
  ExternalLink,
  Layers,
  Gauge,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';
import type {
  CircuitComponentData,
  WireData,
  CircuitSheet,
  DiagnosticSeverity,
  DiagnosticItem,
  SignalNetwork,
  SignalEndpoint,
  SignalRole,
  SignalNetworkStatus,
} from '../../types';
import { formatSignalTracingReportText } from '../../types';
import { COMPONENT_TYPES } from '../../constants';

export interface SignalSearchTabProps {
  sheets?: CircuitSheet[];
  components?: CircuitComponentData[];
  wires?: WireData[];
  activeSheetId?: string;
  onNavigateSheet?: (sheetId: string) => void;
  onSelectComponent?: (compId: string) => void;
  onJumpToComponent?: (
    componentId: string,
    sheetId?: string,
    severity?: DiagnosticSeverity,
    diag?: DiagnosticItem
  ) => void;
  externalSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  projectName?: string;
}

/**
 * Normalizes signal names by removing enclosing brackets < >, [ ], and extra spaces
 */
export function normalizeSignalName(raw: string): string {
  if (!raw) return '';
  return raw.replace(/^[<\[\s]+|[>\]\s]+$/g, '').trim();
}

/**
 * Extracts and categorizes all signal networks and endpoints across all hierarchical sheets
 */
export function extractSignalNetworks(
  sheets: CircuitSheet[] = [],
  fallbackComponents: CircuitComponentData[] = [],
  activeSheetId: string = 'root'
): SignalNetwork[] {
  const allSheets = sheets.length > 0
    ? sheets
    : [{ id: activeSheetId, name: 'Main Schematic', components: fallbackComponents, wires: [] }];

  const networksMap = new Map<string, SignalEndpoint[]>();

  // Helper to append endpoint
  const addEndpoint = (
    rawSignalName: string,
    role: SignalRole,
    comp: CircuitComponentData,
    sheet: CircuitSheet,
    details: string,
    paramKey?: string
  ) => {
    const sigName = normalizeSignalName(rawSignalName);
    if (!sigName) return;

    if (!networksMap.has(sigName)) {
      networksMap.set(sigName, []);
    }

    networksMap.get(sigName)!.push({
      id: `ep_${comp.id}_${role}_${sheet.id}`,
      role,
      signalName: sigName,
      componentId: comp.id,
      componentName: comp.name || comp.id,
      componentType: comp.type,
      sheetId: sheet.id,
      sheetName: sheet.name || 'Main Schematic',
      x: comp.x,
      y: comp.y,
      details,
      paramKey,
    });
  };

  allSheets.forEach((sheet) => {
    (sheet.components || []).forEach((comp) => {
      const type = comp.type;
      const params = comp.params || {};

      // 1. Wireless Transmitter <Tag>
      if (type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER) {
        const rawName = params.signalName || comp.name || 'TRANSMITTER';
        addEndpoint(
          rawName,
          'transmitter',
          comp,
          sheet,
          `Wireless Transmitter broadcasting global signal <${normalizeSignalName(rawName)}>`,
          'signalName'
        );
      }
      // 2. Wireless Receiver [Tag]
      else if (type === COMPONENT_TYPES.DATA_LABEL_RECEIVER) {
        const rawName = params.signalName || comp.name || 'RECEIVER';
        addEndpoint(
          rawName,
          'receiver',
          comp,
          sheet,
          `Wireless Receiver listening to global signal [${normalizeSignalName(rawName)}]`,
          'signalName'
        );
      }
      // 3. Probes & Measurement Meters
      else if (
        type === COMPONENT_TYPES.VOLTMETER ||
        type === COMPONENT_TYPES.AMMETER ||
        type === COMPONENT_TYPES.MULTIMETER ||
        type === COMPONENT_TYPES.SIGNAL_PROBE
      ) {
        const rawName = params.signalName || params.probeSignalName || comp.name;
        if (rawName) {
          addEndpoint(
            rawName,
            'probe',
            comp,
            sheet,
            `${type.replace(/_/g, ' ')} monitoring signal '${normalizeSignalName(rawName)}'`,
            'signalName'
          );
        }
      }
      // 4. Runtime Controls & Switches
      else if (
        type === COMPONENT_TYPES.RUNTIME_SLIDER ||
        type === COMPONENT_TYPES.RUNTIME_DIAL ||
        type === COMPONENT_TYPES.RUNTIME_SWITCH ||
        type === COMPONENT_TYPES.RUNTIME_BUTTON ||
        type === COMPONENT_TYPES.TIMED_SWITCH ||
        type === COMPONENT_TYPES.BREAKER_1PH ||
        type === COMPONENT_TYPES.BREAKER_3PH
      ) {
        const target = params.targetParam || params.signalName || params.controlSignal;
        if (target) {
          addEndpoint(
            target,
            'control_input',
            comp,
            sheet,
            `Interactive control element manipulating variable '${normalizeSignalName(target)}'`,
            params.targetParam ? 'targetParam' : 'signalName'
          );
        }
      }
      // 5. CSMF Control Blocks & Internal Probes
      else if (
        type.startsWith('csmf_') ||
        params.signalName ||
        params.monitored
      ) {
        if (params.signalName) {
          addEndpoint(
            params.signalName,
            type.startsWith('csmf_') ? 'control_input' : 'monitored_source',
            comp,
            sheet,
            `Component [${type}] configured with internal signal '${normalizeSignalName(params.signalName)}'`,
            'signalName'
          );
        }
      }
      // 6. Busbars with named tag
      else if (type === COMPONENT_TYPES.BUSBAR_1PH || type === COMPONENT_TYPES.POLYPHASE_BUS_3PH) {
        if (comp.name && !comp.name.startsWith('Bus_')) {
          addEndpoint(
            comp.name,
            'bus',
            comp,
            sheet,
            `Node Busbar labeled '${comp.name}'`,
            'name'
          );
        }
      }
    });
  });

  // Build structured networks
  const networks: SignalNetwork[] = [];

  networksMap.forEach((endpoints, signalName) => {
    let transmitters = 0;
    let receivers = 0;
    let probes = 0;
    let controls = 0;
    const sheetSet = new Set<string>();

    endpoints.forEach((ep) => {
      if (ep.role === 'transmitter') transmitters++;
      else if (ep.role === 'receiver') receivers++;
      else if (ep.role === 'probe') probes++;
      else if (ep.role === 'control_input') controls++;
      sheetSet.add(ep.sheetName);
    });

    // Determine status & flag orphaned receivers
    let status: SignalNetworkStatus = 'healthy';
    if (receivers > 0 && transmitters === 0) {
      status = 'orphaned_receiver';
      endpoints.forEach((ep) => {
        if (ep.role === 'receiver') ep.isOrphaned = true;
      });
    } else if (transmitters > 0 && receivers === 0) {
      status = 'floating_transmitter';
    } else if (controls > 0 && transmitters === 0 && receivers === 0) {
      status = 'control_linked';
    } else if (transmitters === 0 && receivers === 0 && probes > 0) {
      status = 'monitored_only';
    }

    networks.push({
      signalName,
      status,
      endpoints,
      stats: {
        transmitters,
        receivers,
        probes,
        controls,
        total: endpoints.length,
        sheetCount: sheetSet.size,
      },
      sheetNames: Array.from(sheetSet),
    });
  });

  // Sort alphabetically by signalName
  networks.sort((a, b) => a.signalName.localeCompare(b.signalName));
  return networks;
}

export const SignalSearchTab: React.FC<SignalSearchTabProps> = ({
  sheets = [],
  components = [],
  wires: _wires = [],
  activeSheetId = 'root',
  onNavigateSheet,
  onSelectComponent,
  onJumpToComponent,
  externalSearchQuery = '',
  onSearchQueryChange,
  projectName = 'Active Project',
}) => {
  const [internalQuery, setInternalQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'transmitter' | 'receiver' | 'probe' | 'control' | 'orphaned'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [expandedSignalNames, setExpandedSignalNames] = useState<Set<string>>(new Set());
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const query = onSearchQueryChange !== undefined ? externalSearchQuery : internalQuery;
  const setQuery = (val: string) => {
    if (onSearchQueryChange) onSearchQueryChange(val);
    else setInternalQuery(val);
  };

  // Extract all signal networks across sheets
  const allNetworks = useMemo(() => {
    return extractSignalNetworks(sheets, components, activeSheetId);
  }, [sheets, components, activeSheetId]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalEndpoints = 0;
    let totalTransmitters = 0;
    let totalReceivers = 0;
    let totalOrphaned = 0;
    let totalFloating = 0;

    allNetworks.forEach((net) => {
      totalEndpoints += net.stats.total;
      totalTransmitters += net.stats.transmitters;
      totalReceivers += net.stats.receivers;
      if (net.status === 'orphaned_receiver') totalOrphaned++;
      if (net.status === 'floating_transmitter') totalFloating++;
    });

    return {
      totalNetworks: allNetworks.length,
      totalEndpoints,
      totalTransmitters,
      totalReceivers,
      totalOrphaned,
      totalFloating,
    };
  }, [allNetworks]);

  // Filtered networks based on search query and role filter
  const filteredNetworks = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allNetworks.filter((net) => {
      // 1. Role / Status Filter
      if (roleFilter === 'transmitter' && net.stats.transmitters === 0) return false;
      if (roleFilter === 'receiver' && net.stats.receivers === 0) return false;
      if (roleFilter === 'probe' && net.stats.probes === 0) return false;
      if (roleFilter === 'control' && net.stats.controls === 0) return false;
      if (roleFilter === 'orphaned' && net.status !== 'orphaned_receiver' && net.status !== 'floating_transmitter') {
        return false;
      }

      // 2. Query filter
      if (q) {
        const matchesSignal = net.signalName.toLowerCase().includes(q);
        const matchesEndpoints = net.endpoints.some(
          (ep) =>
            ep.componentName.toLowerCase().includes(q) ||
            ep.componentId.toLowerCase().includes(q) ||
            ep.sheetName.toLowerCase().includes(q) ||
            ep.details.toLowerCase().includes(q)
        );
        return matchesSignal || matchesEndpoints;
      }

      return true;
    });
  }, [allNetworks, roleFilter, query]);

  // Flat endpoints list for table mode
  const filteredEndpoints = useMemo(() => {
    const list: SignalEndpoint[] = [];
    filteredNetworks.forEach((net) => {
      net.endpoints.forEach((ep) => {
        if (roleFilter === 'transmitter' && ep.role !== 'transmitter') return;
        if (roleFilter === 'receiver' && ep.role !== 'receiver') return;
        if (roleFilter === 'probe' && ep.role !== 'probe') return;
        if (roleFilter === 'control' && ep.role !== 'control_input') return;
        if (roleFilter === 'orphaned' && !ep.isOrphaned && net.status !== 'floating_transmitter') return;
        list.push(ep);
      });
    });
    return list;
  }, [filteredNetworks, roleFilter]);

  // Toggle card expansion
  const toggleSignalExpand = (sigName: string) => {
    setExpandedSignalNames((prev) => {
      const next = new Set(prev);
      if (next.has(sigName)) next.delete(sigName);
      else next.add(sigName);
      return next;
    });
  };

  // Jump dispatcher
  const triggerJump = (ep: SignalEndpoint) => {
    const severity: DiagnosticSeverity = ep.isOrphaned ? 'warning' : 'info';
    const diag: DiagnosticItem = {
      id: `diag_${ep.id}`,
      timestamp: new Date().toLocaleTimeString(),
      category: 'compiler',
      severity,
      code: ep.role === 'transmitter' ? 'TAG-TX' : ep.role === 'receiver' ? 'TAG-RX' : 'SIG-101',
      message: `${ep.role.toUpperCase()}: Signal '${ep.signalName}' on component '${ep.componentName}'`,
      componentId: ep.componentId,
      componentName: ep.componentName,
      sheetId: ep.sheetId,
      sheetName: ep.sheetName,
      details: ep.details,
      remedy: ep.isOrphaned ? `Place a matching <${ep.signalName}> transmitter on the schematic.` : undefined,
    };

    if (onJumpToComponent) {
      onJumpToComponent(ep.componentId, ep.sheetId, severity, diag);
    } else {
      if (ep.sheetId && onNavigateSheet) onNavigateSheet(ep.sheetId);
      if (ep.componentId && onSelectComponent) onSelectComponent(ep.componentId);
    }
  };

  // Copy full signal report
  const handleCopyReport = () => {
    const text = formatSignalTracingReportText(allNetworks, projectName);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    });
  };

  // Copy single endpoint row
  const handleCopyEndpoint = (ep: SignalEndpoint) => {
    const line = `[SIGNAL] ${ep.signalName} (${ep.role.toUpperCase()}) -> ${ep.componentName} [${ep.componentId}] on Sheet '${ep.sheetName}' at (${ep.x}, ${ep.y})`;
    navigator.clipboard.writeText(line).then(() => {
      setCopiedRowId(ep.id);
      setTimeout(() => setCopiedRowId(null), 2000);
    });
  };

  // Top suggestions for chips
  const suggestedSignals = useMemo(() => {
    return allNetworks.slice(0, 6).map((n) => n.signalName);
  }, [allNetworks]);

  return (
    <div className="flex flex-col h-full bg-[#0c0f17] text-xs font-sans select-none">
      {/* 1. Header Controls & Filter Bar */}
      <div className="p-2.5 bg-[#161b26] border-b border-[#263147] flex flex-wrap items-center justify-between gap-2">
        {/* Left: Search input & Preset Chips */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Signal (e.g. Fault_Sig, Grid_Theta)..."
              className="w-full bg-[#10141f] text-slate-200 text-[11px] pl-8 pr-6 py-1 rounded border border-[#263147] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Suggestion Pills */}
          {suggestedSignals.length > 0 && !query && (
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto text-[10px]">
              <span className="text-slate-500 font-mono">Presets:</span>
              {suggestedSignals.map((sig) => (
                <button
                  key={sig}
                  onClick={() => setQuery(sig)}
                  className="px-2 py-0.5 rounded-full bg-[#1c2333] hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-[#263147] hover:border-sky-500/40 transition-colors font-mono"
                >
                  {sig}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: View Mode & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#10141f] rounded border border-[#263147] p-0.5">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                viewMode === 'grouped' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grouped by Signal Network"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Networks</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                viewMode === 'table' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Flat CAD Table"
            >
              <List className="w-3 h-3" />
              <span>Table</span>
            </button>
          </div>

          {/* Copy Full Signal Tracing Report */}
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#10141f] hover:bg-[#1f6feb]/20 text-slate-300 hover:text-sky-300 border border-[#263147] hover:border-sky-500/40 text-[10px] transition-colors"
            title="Copy formatted PSCAD Signal Cross-Reference Report to Clipboard"
          >
            {copiedState ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedState ? 'Copied!' : 'Copy Report'}</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Filter Bar with Role Pills */}
      <div className="px-3 py-1.5 bg-[#121620] border-b border-[#263147] flex items-center justify-between text-[10px] overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold text-slate-400">Filter Role:</span>

          <button
            onClick={() => setRoleFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors ${
              roleFilter === 'all'
                ? 'bg-[#1f6feb] text-white font-medium'
                : 'bg-[#161b26] text-slate-400 hover:text-slate-200 border border-[#263147]'
            }`}
          >
            All ({allNetworks.length})
          </button>

          <button
            onClick={() => setRoleFilter('transmitter')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              roleFilter === 'transmitter'
                ? 'bg-purple-600 text-white font-medium'
                : 'bg-[#161b26] text-purple-300 hover:text-white border border-[#263147]'
            }`}
          >
            <Radio className="w-2.5 h-2.5" />
            <span>Transmitters ({stats.totalTransmitters})</span>
          </button>

          <button
            onClick={() => setRoleFilter('receiver')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              roleFilter === 'receiver'
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-[#161b26] text-indigo-300 hover:text-white border border-[#263147]'
            }`}
          >
            <Share2 className="w-2.5 h-2.5" />
            <span>Receivers ({stats.totalReceivers})</span>
          </button>

          <button
            onClick={() => setRoleFilter('probe')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              roleFilter === 'probe'
                ? 'bg-sky-600 text-white font-medium'
                : 'bg-[#161b26] text-sky-300 hover:text-white border border-[#263147]'
            }`}
          >
            <Gauge className="w-2.5 h-2.5" />
            <span>Meters &amp; Probes</span>
          </button>

          <button
            onClick={() => setRoleFilter('control')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              roleFilter === 'control'
                ? 'bg-amber-600 text-white font-medium'
                : 'bg-[#161b26] text-amber-300 hover:text-white border border-[#263147]'
            }`}
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>Control Inputs</span>
          </button>

          {(stats.totalOrphaned > 0 || stats.totalFloating > 0) && (
            <button
              onClick={() => setRoleFilter('orphaned')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                roleFilter === 'orphaned'
                  ? 'bg-red-600 text-white font-medium'
                  : 'bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-500/40'
              }`}
              title="Filter to signals with missing transmitter or missing receiver"
            >
              <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
              <span>Unpaired / Broken ({stats.totalOrphaned + stats.totalFloating})</span>
            </button>
          )}
        </div>

        {/* Quick summary metrics */}
        <div className="text-slate-500 font-mono hidden sm:flex items-center gap-3 shrink-0">
          <span>
            Networks: <strong className="text-slate-200">{filteredNetworks.length}</strong>
          </span>
          <span>
            Endpoints: <strong className="text-slate-300">{filteredEndpoints.length}</strong>
          </span>
        </div>
      </div>

      {/* 3. Main Body Content Viewport */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
        {filteredNetworks.length === 0 ? (
          <div className="p-8 text-center font-sans">
            <Search className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-slate-300 font-semibold text-sm">No Signal Networks Found</div>
            <div className="text-slate-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
              {query
                ? `No signals matching "${query}". Try searching for 'Fault_Sig', 'Grid_Theta', or clear your search.`
                : 'No wireless tags, meters, or signal probes are currently placed on active schematic sheets.'}
            </div>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="mt-3 px-3 py-1 bg-[#1f6feb] text-white rounded text-xs hover:bg-[#1a5ecc] transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          /* ========================================================= */
          /* VIEW MODE: GROUPED SIGNAL NETWORK CARDS                   */
          /* ========================================================= */
          filteredNetworks.map((net) => {
            const isExpanded = expandedSignalNames.has(net.signalName) || !!query;
            const hasOrphan = net.status === 'orphaned_receiver';
            const isFloating = net.status === 'floating_transmitter';

            return (
              <div
                key={net.signalName}
                className={`bg-[#121620] border rounded-md overflow-hidden transition-colors ${
                  hasOrphan
                    ? 'border-red-500/50 bg-red-950/10'
                    : isFloating
                    ? 'border-amber-500/50 bg-amber-950/10'
                    : 'border-[#263147] hover:border-sky-500/40'
                }`}
              >
                {/* Network Card Header */}
                <div
                  onClick={() => toggleSignalExpand(net.signalName)}
                  className="p-2.5 bg-[#161b26] cursor-pointer flex flex-wrap items-center justify-between gap-2 border-b border-[#263147]/60 select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="p-0.5 text-slate-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Signal Tag */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1f6feb]/20 text-sky-300 border border-sky-500/40 tracking-wide">
                      {net.stats.transmitters > 0 ? `<${net.signalName}>` : `[${net.signalName}]`}
                    </span>

                    {/* Status Badge */}
                    {hasOrphan && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/50">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                        <span>ORPHANED RECEIVER</span>
                      </span>
                    )}
                    {isFloating && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                        <span>FLOATING TRANSMITTER</span>
                      </span>
                    )}
                    {net.status === 'healthy' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>PAIRED ({net.stats.transmitters} Tx &rarr; {net.stats.receivers} Rx)</span>
                      </span>
                    )}

                    {/* Sheet Breadcrumb */}
                    <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-sans">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>{net.sheetNames.join(', ')}</span>
                    </span>
                  </div>

                  {/* Right Endpoints Count Summary */}
                  <div className="flex items-center gap-2 text-[10px] font-sans">
                    <span className="px-1.5 py-0.2 rounded bg-[#10141f] text-slate-400 border border-[#263147]">
                      {net.endpoints.length} Node{net.endpoints.length !== 1 ? 's' : ''}
                    </span>
                    {net.stats.probes > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-950/50 text-sky-300 border border-sky-800/40">
                        {net.stats.probes} Probe{net.stats.probes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {net.stats.controls > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40">
                        {net.stats.controls} Control
                      </span>
                    )}
                  </div>
                </div>

                {/* Network Breadcrumb Flow Trail */}
                <div className="px-3 py-1.5 bg-[#0e121a] border-b border-[#263147]/40 text-[10px] flex items-center gap-1.5 text-slate-400 overflow-x-auto">
                  <span className="text-slate-500 shrink-0 font-sans">Signal Lineage:</span>
                  {net.endpoints
                    .filter((e) => e.role === 'transmitter')
                    .map((tx) => (
                      <span
                        key={tx.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerJump(tx);
                        }}
                        className="px-1.5 py-0.2 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-800/50 cursor-pointer border border-purple-600/30 shrink-0"
                        title={`Click to jump to Transmitter on sheet '${tx.sheetName}'`}
                      >
                        &lt;{tx.componentName}&gt; @ {tx.sheetName}
                      </span>
                    ))}
                  {net.stats.transmitters > 0 && net.stats.receivers > 0 && (
                    <span className="text-sky-400 font-bold shrink-0">&rarr;</span>
                  )}
                  {net.endpoints
                    .filter((e) => e.role === 'receiver')
                    .map((rx) => (
                      <span
                        key={rx.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerJump(rx);
                        }}
                        className={`px-1.5 py-0.2 rounded cursor-pointer shrink-0 border ${
                          rx.isOrphaned
                            ? 'bg-red-900/30 text-red-300 border-red-600/40 hover:bg-red-800/50'
                            : 'bg-indigo-900/30 text-indigo-300 border-indigo-600/30 hover:bg-indigo-800/50'
                        }`}
                        title={`Click to jump to Receiver on sheet '${rx.sheetName}'`}
                      >
                        [{rx.componentName}] @ {rx.sheetName}
                      </span>
                    ))}
                </div>

                {/* Expandable Endpoints Table */}
                {isExpanded && (
                  <div className="divide-y divide-[#263147]/50 font-sans">
                    {net.endpoints.map((ep) => (
                      <div
                        key={ep.id}
                        onDoubleClick={() => triggerJump(ep)}
                        className={`p-2 flex items-center justify-between gap-3 hover:bg-[#181f2c] transition-colors cursor-pointer select-none text-[11px] ${
                          ep.isOrphaned ? 'bg-red-950/20' : ''
                        }`}
                        title="Double-click to center viewport and pulse radar beacon on canvas"
                      >
                        {/* Role & Component */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Role Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 uppercase font-bold ${
                              ep.role === 'transmitter'
                                ? 'bg-purple-900/40 text-purple-300 border border-purple-500/50'
                                : ep.role === 'receiver'
                                ? ep.isOrphaned
                                  ? 'bg-red-900/40 text-red-300 border border-red-500/50'
                                  : 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/50'
                                : ep.role === 'probe'
                                ? 'bg-sky-900/40 text-sky-300 border border-sky-500/50'
                                : ep.role === 'control_input'
                                ? 'bg-amber-900/40 text-amber-300 border border-amber-500/50'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {ep.role === 'transmitter' && <Radio className="w-2.5 h-2.5" />}
                            {ep.role === 'receiver' && <Share2 className="w-2.5 h-2.5" />}
                            {ep.role === 'probe' && <Gauge className="w-2.5 h-2.5" />}
                            {ep.role === 'control_input' && <Sliders className="w-2.5 h-2.5" />}
                            <span>{ep.role.replace(/_/g, ' ')}</span>
                          </span>

                          {/* Component name & ID */}
                          <div className="truncate">
                            <span className="font-semibold text-slate-200 font-mono">{ep.componentName}</span>
                            {ep.componentId !== ep.componentName && (
                              <span className="text-slate-500 text-[10px] font-mono ml-1.5">[{ep.componentId}]</span>
                            )}
                          </div>

                          {/* Sheet Location */}
                          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                            <Layers className="w-3 h-3 text-slate-500" />
                            <span>{ep.sheetName}</span>
                          </div>

                          {/* Coordinates */}
                          <span className="hidden md:inline text-slate-500 text-[10px] font-mono shrink-0">
                            ({ep.x}, {ep.y})
                          </span>

                          {/* Details */}
                          <span className="hidden lg:inline text-slate-400 text-[10px] truncate">{ep.details}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Copy endpoint info */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyEndpoint(ep);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
                            title="Copy Endpoint info"
                          >
                            {copiedRowId === ep.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>

                          {/* Jump to Canvas */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerJump(ep);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f6feb]/20 hover:bg-[#1f6feb] text-sky-300 hover:text-white text-[10px] font-medium transition-colors border border-sky-500/30"
                            title="Jump to component on schematic sheet &amp; pulse radar beacon"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* ========================================================= */
          /* VIEW MODE: FLAT CAD TABLE                                 */
          /* ========================================================= */
          <div className="border border-[#263147] rounded overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#1c2333] border-b border-[#263147] text-slate-400 font-semibold text-[10px]">
                  <th className="py-1.5 px-3">Signal Tag</th>
                  <th className="py-1.5 px-3">Role</th>
                  <th className="py-1.5 px-3">Component</th>
                  <th className="py-1.5 px-3">Sheet / Module</th>
                  <th className="py-1.5 px-3">Coordinates</th>
                  <th className="py-1.5 px-3">Status</th>
                  <th className="py-1.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263147]/50 bg-[#0c0f17]">
                {filteredEndpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onDoubleClick={() => triggerJump(ep)}
                    className={`hover:bg-[#161b26] transition-colors cursor-pointer select-none ${
                      ep.isOrphaned ? 'bg-red-950/15' : ''
                    }`}
                    title="Double-click to center viewport and pulse radar beacon"
                  >
                    {/* Signal Tag */}
                    <td className="py-1.5 px-3 font-mono font-bold text-sky-300 whitespace-nowrap">
                      {ep.role === 'transmitter' ? `<${ep.signalName}>` : `[${ep.signalName}]`}
                    </td>

                    {/* Role */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                          ep.role === 'transmitter'
                            ? 'bg-purple-900/40 text-purple-300 border border-purple-500/50'
                            : ep.role === 'receiver'
                            ? ep.isOrphaned
                              ? 'bg-red-900/40 text-red-300 border border-red-500/50'
                              : 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/50'
                            : ep.role === 'probe'
                            ? 'bg-sky-900/40 text-sky-300 border border-sky-500/50'
                            : ep.role === 'control_input'
                            ? 'bg-amber-900/40 text-amber-300 border border-amber-500/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ep.role.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Component */}
                    <td className="py-1.5 px-3 font-mono text-slate-200 whitespace-nowrap">
                      <span className="font-semibold">{ep.componentName}</span>
                      {ep.componentId !== ep.componentName && (
                        <span className="text-slate-500 text-[10px] ml-1">[{ep.componentId}]</span>
                      )}
                    </td>

                    {/* Sheet */}
                    <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>{ep.sheetName}</span>
                      </span>
                    </td>

                    {/* Coordinates */}
                    <td className="py-1.5 px-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                      ({ep.x}, {ep.y})
                    </td>

                    {/* Status */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      {ep.isOrphaned ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Orphaned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Connected</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerJump(ep);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f6feb]/20 hover:bg-[#1f6feb] text-sky-300 hover:text-white text-[10px] transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
