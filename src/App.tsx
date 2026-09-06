import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DesktopTitleBar } from './components/menu/DesktopTitleBar';
import { CadRibbon } from './components/ribbon/CadRibbon';
import { useKeyTips } from './components/ribbon/KeyTipsEngine';
import { SchematicCanvas } from './components/canvas/SchematicCanvas';
import { ComponentLibrary } from './components/library/ComponentLibrary';
import { ParameterInspector } from './components/inspector/ParameterInspector';
import { ComponentParameterModal } from './components/inspector/ComponentParameterModal';
import { WorkspaceTree } from './components/project/WorkspaceTree';
import { MasterLibraryFlyout } from './components/library/MasterLibraryFlyout';
import { OscilloscopeView } from './components/oscilloscope/OscilloscopeView';
import { OutputDock } from './components/log/OutputDock';
import { StatusBar } from './components/statusbar/StatusBar';
import { FftModal } from './components/modals/FftModal';
import { PhasorModal } from './components/modals/PhasorModal';
import { MatrixModal } from './components/modals/MatrixModal';
import { SnapshotModal } from './components/modals/SnapshotModal';
import { CaseStudiesModal } from './components/modals/CaseStudiesModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { HelpModal } from './components/modals/HelpModal';
import { LineConstantsModal } from './components/modals/LineConstantsModal';
import { ComponentBuilderModal } from './components/modals/ComponentBuilderModal';
import { FrequencyScanModal } from './components/modals/FrequencyScanModal';
import { ComtradeModal } from './components/modals/ComtradeModal';
import { MultiRunModal } from './components/modals/MultiRunModal';
import { RecentProjectsModal } from './components/modals/RecentProjectsModal';
import { ProtectionStudioModal } from './components/modals/ProtectionStudioModal';
import { CableConstantsModal } from './components/modals/CableConstantsModal';
import { ProjectImportExportModal } from './components/modals/ProjectImportExportModal';
import { MagneticsSubstationModal } from './components/modals/MagneticsSubstationModal';
import { AutomationServerModal } from './components/modals/AutomationServerModal';
import { PmuStreamerModal } from './components/modals/PmuStreamerModal';
import { FmiModal } from './components/modals/FmiModal';
import { DetachableScopeModal } from './components/oscilloscope/DetachableScopeModal';
import { Grid, Activity, Columns, AlertTriangle, RefreshCw, XCircle, ExternalLink } from 'lucide-react';

import type {
  CircuitComponentData,
  WireData,
  ThemeType,
  SimulationState,
  LogEntry,
  TitleBlockData,
  AlignAction,
  CircuitSheet,
  ComponentDefinition,
  WorkspaceProject,
  BuildReport,
  EMTDCEvent,
  DiagnosticItem,
  BuildPhaseStats,
  JumpTarget,
  DiagnosticSeverity,
} from './types';
import { CircuitNetlist, getComponentPins } from './engine/netlist';
import { simulationEngine, type SolverType } from './engine/solver';
import { snapshotEngine } from './engine/snapshot';
import { hierarchyManager, type BreadcrumbItem } from './engine/hierarchy';
import { customComponentRegistry } from './engine/customComponents';
import { definitionRegistry } from './engine/definitions';
import { sessionManager, type SessionAutoSave, type InspectorMode } from './services/sessionManager';
import { nativeFileSystem } from './services/nativeFileSystem';
import { tauriBridge } from './services/tauriBridge';
import { simulationBridge } from './services/simulationBridge';
import { telemetryStreamer, type TelemetryPayload } from './services/telemetryStreamer';
import { CASE_STUDIES } from './examples/caseStudies';
import { COMPONENT_TYPES } from './constants';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    try {
      const saved = localStorage.getItem('pscad_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'blueprint') {
        return saved as ThemeType;
      }
    } catch (e) {}
    return 'dark';
  });
  const [projectName, setProjectName] = useState<string>('3Ph_Transmission_Fault_Study');
  const [activeView, setActiveView] = useState<'schematic' | 'oscilloscope' | 'split'>(() => {
    try {
      const pref = localStorage.getItem('pscad_preferred_view');
      if (pref === 'oscilloscope' || pref === 'split' || pref === 'schematic') {
        localStorage.removeItem('pscad_preferred_view');
        return pref;
      }
    } catch (e) {}
    return 'schematic';
  });

  const [components, setComponents] = useState<CircuitComponentData[]>([]);
  const [wires, setWires] = useState<WireData[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<CircuitComponentData | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedWireIds, setSelectedWireIds] = useState<Set<string>>(new Set());

  const [toolMode, setToolMode] = useState<'select' | 'wire'>('select');
  const [pendingCompType, setPendingCompType] = useState<string | null>(null);
  const [pendingCustomDefId, setPendingCustomDefId] = useState<string | undefined>(undefined);
  const [clipboardComponents, setClipboardComponents] = useState<CircuitComponentData[]>([]);

  // Phase 6: Multi-sheet hierarchy state
  const [activeSheetId, setActiveSheetId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Main Schematic', isRoot: true },
  ]);
  const [sheetsList, setSheetsList] = useState<CircuitSheet[]>([]);

  // Phase 6: Title Block & Engineering Borders
  const [showTitleBlock, setShowTitleBlock] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const handleToggleGrid = useCallback(() => setShowGrid((prev) => !prev), []);
  const [titleBlockData, setTitleBlockData] = useState<TitleBlockData>({
    title: '3Ph Transmission Fault Study',
    docNumber: 'DWG-EMTDC-001',
    rev: '1.0',
    author: 'Principal Power Systems Engineer',
    company: 'PSCAD CLONE CAD SUITE',
    date: '2026-08',
    sheetIndex: 1,
    sheetTotal: 1,
    showBorder: true,
    showTitleBlock: true,
    borderStandard: 'ANSI_B',
  });

  // Phase 8: Session auto-save & crash recovery
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState<boolean>(false);
  const [recoverableSession, setRecoverableSession] = useState<SessionAutoSave | null>(null);

  // Phase 20: Pop-Out Detachable Oscilloscope Window State
  const [isScopeFloatingModalOpen, setIsScopeFloatingModalOpen] = useState<boolean>(false);
  const [floatingScopeFrameId, setFloatingScopeFrameId] = useState<string | null>(null);

  // Phase 21: Dedicated Multi-Tab Component Parameter Modal State
  const [editingModalComponent, setEditingModalComponent] = useState<CircuitComponentData | null>(null);

  // Phase 17: Master Library Browser & Definitions State
  const [isMasterLibraryOpen, setIsMasterLibraryOpen] = useState<boolean>(false);
  const [definitionsList, setDefinitionsList] = useState<ComponentDefinition[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('proj_current');
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProject[]>([
    {
      id: 'proj_current',
      name: '3Ph_Transmission_Fault_Study',
      active: true,
      dt: 50e-6,
      tMax: 0.5,
      components: [],
      wires: [],
      sheets: {},
      rootSheetId: 'root',
      activeSheetId: 'root',
    },
  ]);

  // Subscribe to definition updates
  useEffect(() => {
    setDefinitionsList(definitionRegistry.getAllDefinitions());
    const unsub = definitionRegistry.subscribe(() => {
      setDefinitionsList(definitionRegistry.getAllDefinitions());
    });
    return unsub;
  }, []);

  // Undo / Redo History Stack
  interface HistorySnapshot {
    components: CircuitComponentData[];
    wires: WireData[];
    selectedComponentId: string | null;
  }
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryApplying = useRef<boolean>(false);

  const pushHistory = useCallback(
    (newComps: CircuitComponentData[], newWires: WireData[], selId: string | null = null) => {
      if (isHistoryApplying.current) return;
      sessionManager.setDirty(true);
      setHistory((prev) => {
        const current = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : [];
        const next = [
          ...current,
          {
            components: JSON.parse(JSON.stringify(newComps)),
            wires: JSON.parse(JSON.stringify(newWires)),
            selectedComponentId: selId,
          },
        ];
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prev) => (prev < 49 ? prev + 1 : 49));
    },
    [historyIndex]
  );

  const [dtMicro, setDtMicro] = useState<number>(50);
  const [tMax, setTMax] = useState<number>(0.5);

  const [cdaEnabled, setCdaEnabled] = useState<boolean>(true);
  const [solverType, setSolverType] = useState<SolverType>('sparse');

  const [simState, setSimState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    t: 0.0,
    tMax: 0.5,
    dt: 5e-5,
    stepCount: 0,
    speedMultiplier: 1.0,
    nodeCount: 0,
  });

  const [signalsMap, setSignalsMap] = useState<Map<string, number[]>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', type: 'info', text: 'PSCAD CLONE v5.1 EMTDC Engine online and ready.', time: new Date().toLocaleTimeString() },
  ]);
  const [buildReport, setBuildReport] = useState<BuildReport | null>(null);
  const [emtdcEvents, setEmtdcEvents] = useState<EMTDCEvent[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

  const [activeModal, setActiveModal] = useState<
    'fft' | 'phasor' | 'matrix' | 'snapshot' | 'gallery' | 'shortcuts' | 'help' | 'lcp' | 'workshop' | 'frequencyScan' | 'comtrade' | 'multiRun' | 'recentProjects' | 'protectionStudio' | 'cableConstants' | 'pscxInterop' | 'magneticsSubstation' | 'automationServer' | 'pmuStreamer' | 'fmiCoSim' | null
  >(null);


  const [coords, setCoords] = useState<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 100 });


  // Resizable Dock & Window Dimensions
  const [leftWidth, setLeftWidth] = useState<number>(260);
  const [leftTopHeight, setLeftTopHeight] = useState<number>(145);
  const [rightWidth, setRightWidth] = useState<number>(288);
  const [bottomHeight, setBottomHeight] = useState<number>(144);
  const [splitRatio, setSplitRatio] = useState<number>(50);

  // Phase 21 Step 21.4: Dual Inspector Mode State (Docked vs Modal)
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('docked');
  const [isRightDockCollapsed, setIsRightDockCollapsed] = useState<boolean>(false);
  const prevRightWidthRef = useRef<number>(288);

  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Resize Handlers
  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setLeftWidth(Math.max(160, Math.min(600, startWidth + deltaX)));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLeftTopResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = leftTopHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setLeftTopHeight(Math.max(80, Math.min(450, startHeight + deltaY)));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      setRightWidth(Math.max(180, Math.min(650, startWidth + deltaX)));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBottomResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setBottomHeight(Math.max(60, Math.min(550, startHeight + deltaY)));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSplitResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const relativeX = moveEvent.clientX - rect.left;
      const ratio = (relativeX / rect.width) * 100;
      setSplitRatio(Math.max(15, Math.min(85, ratio)));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const netlistRef = useRef<CircuitNetlist>(new CircuitNetlist());

  const addLog = useCallback((type: 'info' | 'warning' | 'error', text: string) => {
    setLogs((prev) => [
      ...prev.slice(-300),
      { id: `${Date.now()}_${Math.random()}`, type, text, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  // Phase 6 & Phase 22: Compile with flattened hierarchy support, 6-phase tracking, matrix stats & diagnostics
  const compileCircuit = useCallback(
    (customComps?: CircuitComponentData[], customWires?: WireData[]) => {
      const startTime = performance.now();
      const phases: BuildPhaseStats[] = [];
      const generatedDiagnostics: DiagnosticItem[] = [];
      const timestamp = new Date().toLocaleTimeString();

      // Phase 1: Sheet Validation & Submodule Flattening
      const p1Start = performance.now();
      hierarchyManager.updateSheet(activeSheetId, customComps || components, customWires || wires);
      const allSheets = hierarchyManager.getAllSheets();
      const flat = hierarchyManager.flattenHierarchy();
      const p1Duration = +(performance.now() - p1Start).toFixed(2);
      phases.push({
        phase: 1,
        name: 'Sheet Validation & Submodule Flattening',
        durationMs: p1Duration,
        status: 'success',
        details: `Resolved ${allSheets.length} sheet(s) into ${flat.components.length} components and ${flat.wires.length} wires.`,
      });

      // Phase 2: Netlist Node Generation & Connectivity Analysis
      const p2Start = performance.now();
      const netlist = netlistRef.current.compile(flat.components, flat.wires);
      const p2Duration = +(performance.now() - p2Start).toFixed(2);
      phases.push({
        phase: 2,
        name: 'Netlist Node Generation & Connectivity Analysis',
        durationMs: p2Duration,
        status: 'success',
        details: `Allocated ${netlist.nodeCount} electrical nodes across ${flat.wires.length} wire segments.`,
      });

      // Compiler diagnostics & cross-reference checks
      if (netlist.nodeCount === 0 && flat.components.length > 0) {
        generatedDiagnostics.push({
          id: `diag_${Date.now()}_zero_nodes`,
          timestamp,
          category: 'build',
          severity: 'warning',
          code: 'NET-101',
          message: 'Zero electrical nodes generated. Circuit may have no wired connections or ground reference.',
          details: 'Verify that components are connected by wire junctions and a ground reference exists.',
          remedy: 'Place wire segments between component terminals and connect at least one bus or pin to Ground (0V).',
        });
      }

      // Check wireless labels pairing across sheets (<Tag> vs [Tag])
      const tagTransmitters = new Map<string, { compId: string; sheetId: string }>();
      const tagReceivers: { name: string; compId: string; sheetId: string }[] = [];
      for (const sheet of allSheets) {
        for (const comp of sheet.components || []) {
          const compType = comp.type?.toLowerCase() || '';
          if (compType.includes('tag') || compType.includes('wireless') || compType.includes('label')) {
            const tagName = comp.params?.tagName || comp.name || '';
            const isRx = comp.params?.isReceiver || comp.name?.startsWith('[') || compType.includes('recv');
            if (isRx) {
              tagReceivers.push({ name: tagName, compId: comp.id, sheetId: sheet.id });
            } else {
              tagTransmitters.set(tagName, { compId: comp.id, sheetId: sheet.id });
            }
          }
        }
      }
      for (const rx of tagReceivers) {
        if (!tagTransmitters.has(rx.name)) {
          generatedDiagnostics.push({
            id: `diag_${Date.now()}_rx_${rx.compId}`,
            timestamp,
            category: 'compiler',
            severity: 'warning',
            code: 'TAG-202',
            message: `Wireless receiver '[${rx.name}]' has no matching transmitter '<${rx.name}>'`,
            componentId: rx.compId,
            componentName: rx.name,
            sheetId: rx.sheetId,
            details: 'PSCAD wireless receiver labels require a transmitter tag with the exact same identifier in the project.',
            remedy: `Place a Data Label Transmitter block with tag '<${rx.name}>' or edit this receiver's signal name.`,
          });
        }
      }

      // Import netlist compiler diagnostics (domain mismatches, control fan-in conflicts)
      const netlistDiags = netlistRef.current.getDiagnostics();
      for (const nd of netlistDiags) {
        generatedDiagnostics.push({
          id: nd.id || `diag_${Date.now()}_net_${Math.random().toString().slice(2, 6)}`,
          timestamp,
          category: 'compiler',
          severity: nd.level === 'error' ? 'error' : 'warning',
          code: nd.level === 'error' ? 'DOM-101' : 'FAN-102',
          message: nd.message,
          remedy: nd.level === 'error'
            ? 'Connect electrical power pins only to electrical domains, or use a Transducer/Voltmeter to convert to control.'
            : 'Insert a Summation / Adder block before joining multiple control outputs into a single net.',
        });
      }

      // Topology & Connectivity Check: Detect unconnected electrical pins & floating components
      const connectedPinIds = new Set<string>();
      for (const w of flat.wires) {
        if (w.startPin) connectedPinIds.add(w.startPin);
        if (w.endPin) connectedPinIds.add(w.endPin);
      }

      for (const sheet of allSheets) {
        for (const comp of sheet.components || []) {
          // Skip non-electrical annotative objects
          if (
            comp.type === COMPONENT_TYPES.GRAPH_FRAME ||
            comp.type === 'comment' ||
            comp.type === 'text' ||
            comp.type === 'sticky_note' ||
            comp.type === COMPONENT_TYPES.RUNTIME_SLIDER ||
            comp.type === COMPONENT_TYPES.RUNTIME_DIAL
          ) {
            continue;
          }

          const pins = getComponentPins(comp);
          if (pins.length === 0) continue;

          // Only check components with electrical or polyphase pins
          const electricalPins = pins.filter((p) => p.domain === 'electrical' || p.domain === 'polyphase');
          if (electricalPins.length === 0) continue;

          const unconnected = electricalPins.filter((p) => !connectedPinIds.has(p.id));
          if (unconnected.length > 0) {
            const isCompletelyFloating = unconnected.length === electricalPins.length;
            generatedDiagnostics.push({
              id: `diag_unconn_${comp.id}`,
              timestamp,
              category: 'build',
              severity: isCompletelyFloating ? 'error' : 'warning',
              code: isCompletelyFloating ? 'ERR-102' : 'WRN-102',
              message: isCompletelyFloating
                ? `Unconnected Pin: Floating component '${comp.name || comp.type}' has no circuit connections`
                : `Unconnected Pin: Terminal '${unconnected[0].name}' on '${comp.name || comp.type}' is unconnected`,
              componentId: comp.id,
              componentName: comp.name || comp.type,
              sheetId: sheet.id,
              sheetName: sheet.name,
              details: `Component has ${unconnected.length} unconnected pin(s): ${unconnected.map((p) => p.name).join(', ')}. Floating pins cause singularity in conductance matrix [G].`,
              remedy: 'Route a wire from the unconnected terminal to another component pin or busbar, or connect to Ground (0V).',
            });
          }
        }
      }


      // Phase 3: Conductance Matrix Pre-allocation & Topology Check
      const p3Start = performance.now();
      simulationEngine.setParameters(dtMicro * 1e-6, tMax);
      const p3Duration = +(performance.now() - p3Start).toFixed(2);
      phases.push({
        phase: 3,
        name: 'Conductance Matrix Pre-allocation & Topology Check',
        durationMs: p3Duration,
        status: 'success',
        details: `Grid dimension [${netlist.nodeCount} x ${netlist.nodeCount}] with simulation time step dt = ${dtMicro} µs.`,
      });

      // Phase 4: Sparse LU Symbolic Factorization
      const p4Start = performance.now();
      simulationEngine.initialize(netlist);
      const matrixStats = simulationEngine.getMatrixStats();
      const p4Duration = +(performance.now() - p4Start).toFixed(2);
      phases.push({
        phase: 4,
        name: 'Sparse LU Factorization & Reordering',
        durationMs: p4Duration,
        status: 'success',
        details: `NNZ = ${matrixStats.nnz}, Sparsity = ${matrixStats.sparsityPercent.toFixed(1)}%, Fill-ins = ${matrixStats.markowitzFillIns}.`,
      });

      // Phase 5: CDA State Initialization & Switch Profiling
      const p5Start = performance.now();
      const switchesCount = flat.components.filter(
        (c) =>
          c.type === 'switch' ||
          c.type === 'breaker' ||
          c.type === 'diode' ||
          c.type === 'thyristor' ||
          c.type === COMPONENT_TYPES.BREAKER_1PH ||
          c.type === COMPONENT_TYPES.BREAKER_3PH
      ).length;
      const p5Duration = +(performance.now() - p5Start).toFixed(2);
      phases.push({
        phase: 5,
        name: 'CDA State Initialization & Switch Profiling',
        durationMs: p5Duration,
        status: 'success',
        details: `Configured Critical Damping Adjustment for ${switchesCount} switching/non-linear device(s).`,
      });

      // Phase 6: EMTDC Engine Parameter Initialization
      const p6Start = performance.now();
      setSimState((prev) => ({ ...prev, nodeCount: netlist.nodeCount }));
      const p6Duration = +(performance.now() - p6Start).toFixed(2);
      phases.push({
        phase: 6,
        name: 'EMTDC Engine Parameter Initialization',
        durationMs: p6Duration,
        status: 'success',
        details: `Solver engine ready (tMax: ${tMax}s, dt: ${dtMicro}µs, Total Elements: ${flat.components.length}).`,
      });

      const totalBuildTime = +(performance.now() - startTime).toFixed(2);

      const report: BuildReport = {
        timestamp,
        projectName,
        sheetCount: allSheets.length,
        totalComponents: flat.components.length,
        totalWires: flat.wires.length,
        electricalNodes: netlist.nodeCount,
        conductanceMatrixDim: matrixStats.dim,
        nonZeroElements: matrixStats.nnz,
        sparsityPercent: matrixStats.sparsityPercent,
        markowitzFillIns: matrixStats.markowitzFillIns,
        luFactorizationTimeMs: matrixStats.factorTimeMs > 0 ? matrixStats.factorTimeMs : p4Duration,
        phases,
        success: true,
        warningsCount: generatedDiagnostics.filter((d) => d.severity === 'warning').length,
        errorsCount: generatedDiagnostics.filter((d) => d.severity === 'error').length,
        rawLogs: [
          `[${timestamp}] Compilation started for project '${projectName}'...`,
          `[${timestamp}] Phase 1: Flattened hierarchy resolved (${allSheets.length} sheet(s), ${flat.components.length} components, ${flat.wires.length} wires).`,
          `[${timestamp}] Phase 2: Netlist nodal analysis generated ${netlist.nodeCount} electrical nodes.`,
          `[${timestamp}] Phase 3: Conductance matrix pre-allocated [${matrixStats.dim}x${matrixStats.dim}], NNZ=${matrixStats.nnz}.`,
          `[${timestamp}] Phase 4: Sparse LU factorization completed in ${p4Duration}ms with ${matrixStats.markowitzFillIns} fill-ins (Sparsity: ${matrixStats.sparsityPercent.toFixed(1)}%).`,
          `[${timestamp}] Phase 5: CDA switch profiling initialized for ${switchesCount} dynamic devices.`,
          `[${timestamp}] Phase 6: EMTDC engine ready in ${totalBuildTime}ms with ${generatedDiagnostics.length} warning(s).`,
        ],
      };

      setBuildReport(report);
      setDiagnostics(generatedDiagnostics);

      addLog(
        'info',
        `Circuit compiled (Flattened Hierarchy). Total Nodes: ${netlist.nodeCount}, Total Elements: ${flat.components.length}, Matrix: [${matrixStats.dim}x${matrixStats.dim}] (NNZ: ${matrixStats.nnz})`
      );
    },
    [activeSheetId, components, wires, dtMicro, tMax, projectName, addLog]
  );

  // Phase 6: Multi-Sheet Navigation Handlers
  const handleNavigateSheet = useCallback(
    (targetSheetId: string) => {
      // 1. Save current active sheet
      hierarchyManager.updateSheet(activeSheetId, components, wires);

      // 2. Navigate in hierarchy
      if (hierarchyManager.navigateTo(targetSheetId)) {
        const nextSheet = hierarchyManager.getActiveSheet();
        setComponents(JSON.parse(JSON.stringify(nextSheet.components || [])));
        setWires(JSON.parse(JSON.stringify(nextSheet.wires || [])));
        setActiveSheetId(targetSheetId);
        setBreadcrumbs(hierarchyManager.getBreadcrumbs());
        setSheetsList(hierarchyManager.getAllSheets());
        setSelectedComponent(null);
        setSelectedComponentIds(new Set());
        setSelectedWireId(null);
        setSelectedWireIds(new Set());
        addLog('info', `Navigated to sheet: '${nextSheet.name}'`);
      }
    },
    [activeSheetId, components, wires, addLog]
  );

  // Step 22.3: Double-Click "Jump-to-Component" handler
  const handleJumpToComponent = useCallback(
    (
      componentId: string,
      sheetId?: string,
      severity: DiagnosticSeverity = 'error',
      diag?: DiagnosticItem
    ) => {
      // 1. Ensure schematic canvas is visible
      if (activeView === 'oscilloscope') {
        setActiveView('schematic');
      }

      // 2. Locate which sheet the component belongs to
      let targetSheetId = sheetId;
      let targetComp = components.find((c) => c.id === componentId);

      if (!targetComp) {
        const allSheets = hierarchyManager.getAllSheets();
        for (const sheet of allSheets) {
          const found = (sheet.components || []).find((c) => c.id === componentId);
          if (found) {
            targetSheetId = sheet.id;
            targetComp = found;
            break;
          }
        }
      } else {
        if (!targetSheetId) {
          targetSheetId = activeSheetId;
        }
      }

      // 3. Navigate sheet if component is located on another submodule sheet
      if (targetSheetId && targetSheetId !== activeSheetId) {
        handleNavigateSheet(targetSheetId);
      }

      // 4. Select the target component
      if (targetComp) {
        setSelectedComponent(targetComp);
        setSelectedComponentIds(new Set([targetComp.id]));
        setSelectedWireId(null);
        setSelectedWireIds(new Set());
      }

      // 5. Trigger canvas jump and pulsing beacon
      setJumpTarget({
        componentId,
        sheetId: targetSheetId,
        severity,
        timestamp: Date.now(),
        code: diag?.code,
        message: diag?.message,
      });

      addLog('info', `Located diagnostic target '${diag?.code || 'Component'}': ${diag?.message || componentId}`);
    },
    [activeView, activeSheetId, components, hierarchyManager, handleNavigateSheet, addLog]
  );

  const handleDrillDownSubmodule = useCallback(

    (comp: CircuitComponentData) => {
      let childSheetId = comp.params?.childSheetId;
      if (!childSheetId || !hierarchyManager.getSheet(childSheetId)) {
        // Create new child sheet for this submodule
        const newSheet = hierarchyManager.createSubmoduleSheet(activeSheetId, comp.id, `${comp.name}_Inner`);
        childSheetId = newSheet.id;
        const updated = components.map((c) => (c.id === comp.id ? { ...c, params: { ...c.params, childSheetId } } : c));
        setComponents(updated);
        hierarchyManager.updateSheet(activeSheetId, updated, wires);
      }
      handleNavigateSheet(childSheetId);
    },
    [activeSheetId, components, wires, handleNavigateSheet]
  );

  const handleAddSubmoduleSheet = useCallback(() => {
    const newSheet = hierarchyManager.createSubmoduleSheet(activeSheetId, 'manual_module', `Sheet_${Date.now().toString().slice(-4)}`);
    setSheetsList(hierarchyManager.getAllSheets());
    addLog('info', `Created new submodule sheet: '${newSheet.name}'`);
    handleNavigateSheet(newSheet.id);
  }, [activeSheetId, handleNavigateSheet, addLog]);

  const handleDuplicateSheet = useCallback(
    (sheetId: string) => {
      const duplicated = hierarchyManager.duplicateSheet(sheetId);
      if (duplicated) {
        setSheetsList(hierarchyManager.getAllSheets());
        addLog('info', `Duplicated sheet: '${duplicated.name}'`);
      }
    },
    [addLog]
  );

  const handleRenameSheet = useCallback(
    (sheetId: string, newName: string) => {
      hierarchyManager.renameSheet(sheetId, newName);
      setSheetsList(hierarchyManager.getAllSheets());
      setBreadcrumbs(hierarchyManager.getBreadcrumbs());
      addLog('info', `Renamed sheet to '${newName}'`);
    },
    [addLog]
  );

  const handleDeleteSheet = useCallback(
    (sheetId: string) => {
      hierarchyManager.deleteSheet(sheetId);
      setSheetsList(hierarchyManager.getAllSheets());
      setBreadcrumbs(hierarchyManager.getBreadcrumbs());
      const active = hierarchyManager.getActiveSheet();
      setComponents(JSON.parse(JSON.stringify(active.components || [])));
      setWires(JSON.parse(JSON.stringify(active.wires || [])));
      setActiveSheetId(active.id);
      addLog('info', `Deleted sheet '${sheetId}'`);
    },
    [addLog]
  );

  const handleFlipSelection = useCallback(
    (dir: 'H' | 'V') => {
      const compIdsToFlip =
        selectedComponentIds.size > 0
          ? selectedComponentIds
          : selectedComponent
          ? new Set([selectedComponent.id])
          : new Set<string>();

      if (compIdsToFlip.size === 0) return;

      const updated = components.map((c) => {
        if (compIdsToFlip.has(c.id)) {
          return {
            ...c,
            flippedH: dir === 'H' ? !c.flippedH : c.flippedH,
            flippedV: dir === 'V' ? !c.flippedV : c.flippedV,
          };
        }
        return c;
      });
      setComponents(updated);
      pushHistory(updated, wires, selectedComponent?.id || null);
      addLog('info', `Flipped ${compIdsToFlip.size} component(s) ${dir === 'H' ? 'Horizontally' : 'Vertically'}.`);
    },
    [selectedComponent, selectedComponentIds, components, wires, pushHistory, addLog]
  );

  const handleCreateSubmoduleFromSelection = useCallback(() => {
    const compIds =
      selectedComponentIds.size > 0
        ? selectedComponentIds
        : selectedComponent
        ? new Set([selectedComponent.id])
        : new Set<string>();

    if (compIds.size === 0) {
      addLog('warning', 'Please select one or more components on the canvas to create a submodule definition.');
      return;
    }

    const selectedComps = components.filter((c) => compIds.has(c.id));
    const defName = prompt('Enter a name for the new Submodule Definition:', `Submodule_${Date.now().toString().slice(-4)}`);
    if (!defName) return;

    const res = definitionRegistry.createDefinitionFromSelection(
      selectedComps,
      wires,
      defName,
      activeSheetId
    );

    // Add child sheet into hierarchy
    hierarchyManager.addSheet(res.childSheet);

    // Replace selected components on canvas with the new submodule block
    const nextComps = components.filter((c) => !compIds.has(c.id));
    nextComps.push(res.instance);

    setComponents(nextComps);
    setWires(res.remainingWires);
    setSelectedComponent(res.instance);
    setSelectedComponentIds(new Set([res.instance.id]));
    setSheetsList(hierarchyManager.getAllSheets());
    pushHistory(nextComps, res.remainingWires, res.instance.id);

    addLog('info', `Created Submodule Definition '${res.definition.name}' and encapsulated ${selectedComps.length} components.`);
  }, [components, wires, selectedComponent, selectedComponentIds, activeSheetId, pushHistory, addLog]);

  const handleSelectProject = useCallback(
    (projId: string) => {
      setActiveProjectId(projId);
      const proj = workspaceProjects.find((p) => p.id === projId);
      if (proj && proj.name !== projectName) {
        setProjectName(proj.name);
        addLog('info', `Switched active project to: '${proj.name}'`);
      }
    },
    [workspaceProjects, projectName, addLog]
  );

  const handleCloseProject = useCallback(
    (projId: string) => {
      if (workspaceProjects.length <= 1) {
        addLog('warning', 'Cannot close the only open project in workspace.');
        return;
      }
      const nextProjects = workspaceProjects.filter((p) => p.id !== projId);
      setWorkspaceProjects(nextProjects);
      if (activeProjectId === projId) {
        const nextActive = nextProjects[0];
        setActiveProjectId(nextActive.id);
        setProjectName(nextActive.name);
      }
      addLog('info', `Closed project '${projId}'`);
    },
    [workspaceProjects, activeProjectId, addLog]
  );

  // Load Benchmark Case Study
  const loadCase = useCallback(
    (caseKey: string) => {
      simulationEngine.stop();
      const study = CASE_STUDIES[caseKey];
      if (!study) return;

      setProjectName(study.name);
      setComponents(study.components);
      setWires(study.wires);
      setSelectedComponent(null);
      setSelectedComponentIds(new Set());
      setSelectedWireId(null);
      setSelectedWireIds(new Set());
      setPendingCompType(null);
      setPendingCustomDefId(undefined);
      setDtMicro(study.dt * 1e6);
      setTMax(study.tMax);

      // Initialize hierarchy
      if (study.sheets && Object.keys(study.sheets).length > 0) {
        const fullSheets = { ...study.sheets };
        if (fullSheets.root && (!fullSheets.root.components || fullSheets.root.components.length === 0)) {
          fullSheets.root = {
            ...fullSheets.root,
            components: study.components,
            wires: study.wires,
          };
        }
        hierarchyManager.loadSheets(fullSheets, study.rootSheetId || 'root');
      } else {
        hierarchyManager.initRoot(study.components, study.wires, study.name);
      }
      setActiveSheetId('root');
      setBreadcrumbs([{ id: 'root', name: study.name, isRoot: true }]);
      setSheetsList(hierarchyManager.getAllSheets());

      setTitleBlockData((prev) => ({
        ...prev,
        title: study.name,
      }));

      // Initialize history
      setHistory([
        {
          components: JSON.parse(JSON.stringify(study.components)),
          wires: JSON.parse(JSON.stringify(study.wires)),
          selectedComponentId: null,
        },
      ]);
      setHistoryIndex(0);

      compileCircuit(study.components, study.wires);
      addLog('info', `Loaded Benchmark Model: ${study.name}`);
    },
    [compileCircuit, addLog]
  );

  // Mount: Load initial default case study & restore layout
  useEffect(() => {
    (window as any).loadCase = loadCase;
    loadCase('TRANSMISSION_FAULT');

    // Step 20.4 & Step 21.4 & Step 23.4: Restore Workspace Dock Layout & Theme from Session Persistence
    sessionManager.getWorkspaceLayout().then((wl) => {
      if (wl) {
        if (wl.theme && (wl.theme === 'light' || wl.theme === 'dark' || wl.theme === 'blueprint')) {
          setTheme(wl.theme);
        }
        if (wl.leftWidth) setLeftWidth(wl.leftWidth);
        if (wl.leftTopHeight) setLeftTopHeight(wl.leftTopHeight);
        if (wl.rightWidth) {
          setRightWidth(wl.rightWidth);
          prevRightWidthRef.current = wl.rightWidth;
        }
        if (wl.bottomHeight) setBottomHeight(wl.bottomHeight);
        if (wl.splitRatio) setSplitRatio(wl.splitRatio);
        if (wl.inspectorMode) setInspectorMode(wl.inspectorMode);
        if (typeof wl.isRightDockCollapsed === 'boolean') {
          setIsRightDockCollapsed(wl.isRightDockCollapsed);
        }
      }
    });

    // Step 20.4: Auto-restore detached Oscilloscope on secondary monitor if enabled
    sessionManager.shouldAutoRestoreScope().then((shouldRestore) => {
      if (shouldRestore) {
        sessionManager.getScopeLayout().then((layout) => {
          if (layout.isDetached) {
            setTimeout(() => {
              handleDetachScope(layout.frameId || undefined);
              addLog('info', 'Auto-restored detached Oscilloscope layout on secondary display.');
            }, 600);
          }
        });
      }
    });
  }, []);

  // Persist workspace docking adjustments across sessions
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionManager.saveWorkspaceLayout({
        leftWidth,
        leftTopHeight,
        rightWidth,
        bottomHeight,
        splitRatio,
        activeView,
        inspectorMode,
        isRightDockCollapsed,
        theme,
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [leftWidth, leftTopHeight, rightWidth, bottomHeight, splitRatio, activeView, inspectorMode, isRightDockCollapsed, theme]);

  // Sync theme to document element, localStorage and broadcast to pop-out windows
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pscad_theme', theme);
    } catch (e) {}
    sessionManager.saveWorkspaceLayout({ theme }).catch(() => {});
    telemetryStreamer.broadcast({
      type: 'THEME_SYNC',
      theme,
    });
  }, [theme]);

  // Listen to remote theme sync (e.g. toggled from detached scope)
  useEffect(() => {
    const unsub = telemetryStreamer.subscribe((msg: TelemetryPayload) => {
      if (msg.type === 'THEME_SYNC' && msg.theme && (msg.theme === 'light' || msg.theme === 'dark' || msg.theme === 'blueprint')) {
        setTheme(msg.theme as ThemeType);
      }
    });
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pscad_theme' && e.newValue && (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'blueprint')) {
        setTheme(e.newValue as ThemeType);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Listen to simulation engine events & broadcast to detached pop-out window
  useEffect(() => {
    const unsubs = [
      simulationEngine.on('start', () => {
        setSimState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
        telemetryStreamer.broadcast({
          type: 'SYNC_STATE',
          simState: { ...simState, isRunning: true, isPaused: false },
          tMax,
          projectName,
        });
        const startEvt: EMTDCEvent = {
          id: `emtdc_${Date.now()}_start`,
          timestamp: new Date().toLocaleTimeString(),
          simTime: 0.0,
          stepNumber: 0,
          type: 'info',
          code: 'EMT-001',
          message: 'Simulation engine started. Transient solver loop active.',
        };
        setEmtdcEvents((prev) => [...prev.slice(-499), startEvt]);
      }),
      simulationEngine.on('pause', () => {
        setSimState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
        telemetryStreamer.broadcast({
          type: 'SYNC_STATE',
          simState: { ...simState, isRunning: false, isPaused: true },
          tMax,
          projectName,
        });
        const pauseEvt: EMTDCEvent = {
          id: `emtdc_${Date.now()}_pause`,
          timestamp: new Date().toLocaleTimeString(),
          simTime: simState.t,
          stepNumber: Math.round(simState.t / (dtMicro * 1e-6)),
          type: 'info',
          code: 'EMT-002',
          message: `Simulation paused at t = ${(simState.t * 1000).toFixed(3)} ms.`,
        };
        setEmtdcEvents((prev) => [...prev.slice(-499), pauseEvt]);
      }),
      simulationEngine.on('stop', () => {
        setSimState((prev) => ({ ...prev, isRunning: false, isPaused: false, t: 0.0 }));
        telemetryStreamer.broadcast({
          type: 'SYNC_STATE',
          simState: { ...simState, isRunning: false, isPaused: false, t: 0.0 },
          tMax,
          projectName,
        });
        const stopEvt: EMTDCEvent = {
          id: `emtdc_${Date.now()}_stop`,
          timestamp: new Date().toLocaleTimeString(),
          simTime: simState.t,
          stepNumber: Math.round(simState.t / (dtMicro * 1e-6)),
          type: 'info',
          code: 'EMT-003',
          message: 'Simulation terminated. Time reset to 0.0s.',
        };
        setEmtdcEvents((prev) => [...prev.slice(-499), stopEvt]);
      }),
      simulationEngine.on('time_update', ({ t }) => {
        setSimState((prev) => ({ ...prev, t }));
        const currentSignals = simulationEngine.getSignals();
        setSignalsMap(new Map(currentSignals));
        telemetryStreamer.broadcastSignals(currentSignals, { ...simState, t, isRunning: true }, tMax, projectName);
      }),
      simulationEngine.on('log', ({ type, text }) => {
        addLog(type, text);
      }),
      simulationEngine.on('emtdc_event', (event: EMTDCEvent) => {
        setEmtdcEvents((prev) => [...prev.slice(-499), event]);
        if (event.type === 'warning' || event.type === 'fault') {
          setDiagnostics((prev) => [
            ...prev,
            {
              id: event.id,
              timestamp: event.timestamp,
              simTime: event.simTime,
              category: 'emtdc',
              severity: event.type === 'fault' ? 'error' : 'warning',
              code: event.code,
              message: event.message,
              componentId: event.componentId,
              componentName: event.componentName,
              details: event.details,
            },
          ]);
        }
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [addLog, simState, tMax, projectName, dtMicro]);

  // Phase 20: Listen to incoming messages from detached pop-out window
  useEffect(() => {
    const unsub = telemetryStreamer.subscribe((payload: TelemetryPayload) => {
      if (payload.type === 'DOCK_BACK') {
        setIsScopeFloatingModalOpen(false);
        setActiveView('oscilloscope');
        sessionManager.saveScopeLayout({ isDetached: false });
        addLog('info', 'Detached Oscilloscope docked back into main workspace.');
      } else if (payload.type === 'REQUEST_SYNC' || payload.type === 'POPOUT_INIT') {
        // Send immediate signals chunk to sync newly opened detached window
        const currentSignals = simulationEngine.getSignals();
        telemetryStreamer.broadcastSignals(
          currentSignals.size > 0 ? currentSignals : signalsMap,
          simState,
          tMax,
          projectName
        );
      } else if (payload.type === 'LAYOUT_UPDATE' && payload.layout) {
        sessionManager.saveScopeLayout(payload.layout);
      }
    });
    return unsub;
  }, [addLog, signalsMap, simState, tMax, projectName]);

  const handleDetachScope = useCallback(
    async (frameId?: string) => {
      const layout = await sessionManager.getScopeLayout();
      const currentSignals = Array.from(signalsMap.keys()).filter((k) => k !== 'Time');
      telemetryStreamer.openPopoutWindow({
        frameId: frameId || layout.frameId || undefined,
        signals: currentSignals.length > 0 ? currentSignals : layout.signals,
        title: `PSCAD CLONE - Detached Oscilloscope${frameId ? ` [${frameId}]` : ''}`,
        width: layout.width,
        height: layout.height,
        left: layout.x,
        top: layout.y,
        viewMode: layout.viewMode,
      });
      addLog('info', 'Popped out Oscilloscope into standalone secondary window.');
    },
    [signalsMap, addLog]
  );

  const handleOpenFloatingScope = useCallback(
    (frameId?: string) => {
      setFloatingScopeFrameId(frameId || null);
      setIsScopeFloatingModalOpen(true);
      addLog('info', 'Opened floating Picture-in-Picture Oscilloscope window.');
    },
    [addLog]
  );

  const handleStartSim = useCallback(() => {
    compileCircuit();
    simulationBridge.start();
  }, [compileCircuit]);

  const handlePauseSim = useCallback(() => {
    simulationBridge.pause();
  }, []);

  const handleStopSim = useCallback(() => {
    simulationBridge.stop();
  }, []);

  const handleStepSim = useCallback(() => {
    simulationBridge.step();
  }, []);


  const handleAddComp = (type: string, customDefId?: string, definitionId?: string) => {
    setPendingCompType(type);
    setPendingCustomDefId(customDefId || definitionId);
    setSelectedComponent(null);
    setSelectedComponentIds(new Set());
    setSelectedWireId(null);
    setSelectedWireIds(new Set());
    addLog('info', `Placement mode: Click schematic canvas to place '${type}' (Press Esc or Right-click to cancel).`);
  };

  const handleSelectMultiple = useCallback(
    (compIds: string[], wireIds: string[]) => {
      setSelectedComponentIds(new Set(compIds));
      setSelectedWireIds(new Set(wireIds));
      if (compIds.length > 0) {
        const first = components.find((c) => c.id === compIds[0]) || null;
        setSelectedComponent(first);
      } else {
        setSelectedComponent(null);
      }
      if (wireIds.length > 0) {
        setSelectedWireId(wireIds[0]);
      } else {
        setSelectedWireId(null);
      }
    },
    [components]
  );

  const handleRotateSelection = useCallback(
    (deg = 90) => {
      const compIdsToRotate =
        selectedComponentIds.size > 0
          ? selectedComponentIds
          : selectedComponent
          ? new Set([selectedComponent.id])
          : new Set<string>();

      if (compIdsToRotate.size === 0) return;

      const updated = components.map((c) => {
        if (compIdsToRotate.has(c.id)) {
          return { ...c, rotation: (c.rotation + deg) % 360 };
        }
        return c;
      });
      setComponents(updated);
      if (selectedComponent && compIdsToRotate.has(selectedComponent.id)) {
        setSelectedComponent((prev) => (prev ? { ...prev, rotation: (prev.rotation + deg) % 360 } : null));
      }
      pushHistory(updated, wires, selectedComponent?.id || null);
      addLog('info', `Rotated ${compIdsToRotate.size} component(s) ${deg}°.`);
    },
    [selectedComponent, selectedComponentIds, components, wires, pushHistory, addLog]
  );

  const handleDeleteSelection = useCallback(() => {
    const compIdsToDelete =
      selectedComponentIds.size > 0
        ? selectedComponentIds
        : selectedComponent
        ? new Set([selectedComponent.id])
        : new Set<string>();

    const wireIdsToDelete =
      selectedWireIds.size > 0 ? selectedWireIds : selectedWireId ? new Set([selectedWireId]) : new Set<string>();

    if (compIdsToDelete.size === 0 && wireIdsToDelete.size === 0) return;

    const nextComps = components.filter((c) => !compIdsToDelete.has(c.id));
    const nextWires = wires.filter((w) => {
      if (wireIdsToDelete.has(w.id)) return false;
      const startConnected = w.startPin ? Array.from(compIdsToDelete).some((id) => w.startPin?.startsWith(id)) : false;
      const endConnected = w.endPin ? Array.from(compIdsToDelete).some((id) => w.endPin?.startsWith(id)) : false;
      return !startConnected && !endConnected;
    });

    setComponents(nextComps);
    setWires(nextWires);
    setSelectedComponent(null);
    setSelectedComponentIds(new Set());
    setSelectedWireId(null);
    setSelectedWireIds(new Set());
    pushHistory(nextComps, nextWires, null);
    addLog('info', `Deleted ${compIdsToDelete.size} components and ${wires.length - nextWires.length} wires.`);
  }, [
    selectedComponent,
    selectedComponentIds,
    selectedWireId,
    selectedWireIds,
    components,
    wires,
    pushHistory,
    addLog,
  ]);

  // Phase 6: Group Alignment Handler
  const handleAlign = useCallback(
    (action: AlignAction) => {
      const compIdsToAlign =
        selectedComponentIds.size > 0
          ? selectedComponentIds
          : selectedComponent
          ? new Set([selectedComponent.id])
          : new Set<string>();

      if (compIdsToAlign.size < 2) {
        addLog('warning', 'Select at least 2 components to align or distribute.');
        return;
      }

      const targetComps = components.filter((c) => compIdsToAlign.has(c.id));
      const minX = Math.min(...targetComps.map((c) => c.x));
      const maxX = Math.max(...targetComps.map((c) => c.x));
      const minY = Math.min(...targetComps.map((c) => c.y));
      const maxY = Math.max(...targetComps.map((c) => c.y));
      const avgX = targetComps.reduce((acc, c) => acc + c.x, 0) / targetComps.length;
      const avgY = targetComps.reduce((acc, c) => acc + c.y, 0) / targetComps.length;

      let updated = components.map((c) => {
        if (!compIdsToAlign.has(c.id)) return c;
        switch (action) {
          case 'alignLeft':
            return { ...c, x: minX };
          case 'alignRight':
            return { ...c, x: maxX };
          case 'alignCenter':
            return { ...c, x: Math.round(avgX / 20) * 20 };
          case 'alignTop':
            return { ...c, y: minY };
          case 'alignBottom':
            return { ...c, y: maxY };
          case 'alignMiddle':
            return { ...c, y: Math.round(avgY / 20) * 20 };
          default:
            return c;
        }
      });

      if (action === 'distributeHorizontally' || action === 'distributeVertically') {
        const sorted = [...targetComps].sort((a, b) => (action === 'distributeHorizontally' ? a.x - b.x : a.y - b.y));
        const totalSpan = action === 'distributeHorizontally' ? maxX - minX : maxY - minY;
        const step = totalSpan / (sorted.length - 1 || 1);

        const posMap = new Map<string, number>();
        sorted.forEach((c, idx) => {
          const pos = (action === 'distributeHorizontally' ? minX : minY) + idx * step;
          posMap.set(c.id, Math.round(pos / 20) * 20);
        });

        updated = components.map((c) => {
          if (posMap.has(c.id)) {
            return action === 'distributeHorizontally'
              ? { ...c, x: posMap.get(c.id)! }
              : { ...c, y: posMap.get(c.id)! };
          }
          return c;
        });
      }

      setComponents(updated);
      pushHistory(updated, wires, selectedComponent?.id || null);
      addLog('info', `Aligned ${targetComps.length} components (${action}).`);
    },
    [selectedComponent, selectedComponentIds, components, wires, pushHistory, addLog]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isHistoryApplying.current = true;
      const targetIdx = historyIndex - 1;
      const snap = history[targetIdx];
      if (snap) {
        setComponents(snap.components);
        setWires(snap.wires);
        const sel = snap.components.find((c) => c.id === snap.selectedComponentId) || null;
        setSelectedComponent(sel);
        setSelectedComponentIds(sel ? new Set([sel.id]) : new Set());
        setSelectedWireId(null);
        setSelectedWireIds(new Set());
        setHistoryIndex(targetIdx);
        addLog('info', `Undo action (Step ${targetIdx + 1}/${history.length})`);
      }
      setTimeout(() => {
        isHistoryApplying.current = false;
      }, 50);
    } else {
      addLog('warning', 'Nothing to undo.');
    }
  }, [history, historyIndex, addLog]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isHistoryApplying.current = true;
      const targetIdx = historyIndex + 1;
      const snap = history[targetIdx];
      if (snap) {
        setComponents(snap.components);
        setWires(snap.wires);
        const sel = snap.components.find((c) => c.id === snap.selectedComponentId) || null;
        setSelectedComponent(sel);
        setSelectedComponentIds(sel ? new Set([sel.id]) : new Set());
        setSelectedWireId(null);
        setSelectedWireIds(new Set());
        setHistoryIndex(targetIdx);
        addLog('info', `Redo action (Step ${targetIdx + 1}/${history.length})`);
      }
      setTimeout(() => {
        isHistoryApplying.current = false;
      }, 50);
    } else {
      addLog('warning', 'Nothing to redo.');
    }
  }, [history, historyIndex, addLog]);

  const handleCopy = useCallback(() => {
    const compIdsToCopy =
      selectedComponentIds.size > 0
        ? selectedComponentIds
        : selectedComponent
        ? new Set([selectedComponent.id])
        : new Set<string>();

    if (compIdsToCopy.size === 0) return;
    const compsToCopy = components.filter((c) => compIdsToCopy.has(c.id));
    setClipboardComponents(JSON.parse(JSON.stringify(compsToCopy)));
    addLog('info', `Copied ${compsToCopy.length} component(s) to clipboard.`);
  }, [selectedComponent, selectedComponentIds, components, addLog]);

  const handleCut = useCallback(() => {
    handleCopy();
    handleDeleteSelection();
  }, [handleCopy, handleDeleteSelection]);

  const handlePaste = useCallback(() => {
    if (clipboardComponents.length === 0) return;
    const newComps: CircuitComponentData[] = [];
    const newCompIds: string[] = [];

    clipboardComponents.forEach((c) => {
      const newId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newCompIds.push(newId);
      newComps.push({
        ...JSON.parse(JSON.stringify(c)),
        id: newId,
        name: `${c.name}_copy`,
        x: c.x + 40,
        y: c.y + 40,
      });
    });

    const nextComps = [...components, ...newComps];
    setComponents(nextComps);
    setSelectedComponentIds(new Set(newCompIds));
    setSelectedWireIds(new Set());
    if (newComps.length > 0) setSelectedComponent(newComps[0]);
    pushHistory(nextComps, wires, newCompIds[0]);
    addLog('info', `Pasted ${newComps.length} component(s).`);
  }, [clipboardComponents, components, wires, pushHistory, addLog]);

  const handleDuplicate = useCallback(() => {
    const compIdsToDup =
      selectedComponentIds.size > 0
        ? selectedComponentIds
        : selectedComponent
        ? new Set([selectedComponent.id])
        : new Set<string>();

    if (compIdsToDup.size === 0) return;
    const compsToDup = components.filter((c) => compIdsToDup.has(c.id));
    const newComps: CircuitComponentData[] = [];
    const newCompIds: string[] = [];

    compsToDup.forEach((c) => {
      const newId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newCompIds.push(newId);
      newComps.push({
        ...JSON.parse(JSON.stringify(c)),
        id: newId,
        name: `${c.name}_copy`,
        x: c.x + 40,
        y: c.y + 40,
      });
    });

    const nextComps = [...components, ...newComps];
    setComponents(nextComps);
    setSelectedComponentIds(new Set(newCompIds));
    setSelectedWireIds(new Set());
    if (newComps.length > 0) setSelectedComponent(newComps[0]);
    pushHistory(nextComps, wires, newCompIds[0]);
    addLog('info', `Duplicated ${newComps.length} component(s).`);
  }, [selectedComponent, selectedComponentIds, components, wires, pushHistory, addLog]);

  const handleSelectAll = useCallback(() => {
    if (components.length > 0) {
      const allCompIds = components.map((c) => c.id);
      const allWireIds = wires.map((w) => w.id);
      setSelectedComponentIds(new Set(allCompIds));
      setSelectedWireIds(new Set(allWireIds));
      setSelectedComponent(components[0]);
      addLog('info', `Selected all (${components.length} components, ${wires.length} wires).`);
    }
  }, [components, wires, addLog]);

  const serializeProjectData = useCallback(() => {
    hierarchyManager.updateSheet(activeSheetId, components, wires);
    const allSheets = hierarchyManager.exportSheets();

    return {
      name: projectName,
      version: '2.0',
      dt: dtMicro * 1e-6,
      tMax: tMax,
      components,
      wires,
      sheets: allSheets,
      rootSheetId: hierarchyManager.getRootSheetId(),
      customComponents: customComponentRegistry.getAllComponents(),
      titleBlock: titleBlockData,
    };
  }, [projectName, dtMicro, tMax, components, wires, activeSheetId, titleBlockData]);

  const loadProjectFromData = useCallback(
    (data: any, filePath?: string, fileName?: string) => {
      try {
        if (data.sheets) {
          hierarchyManager.loadSheets(data.sheets, data.rootSheetId || 'root');
          const active = hierarchyManager.getActiveSheet();
          setComponents(active.components || []);
          setWires(active.wires || []);
          setActiveSheetId(active.id);
          setBreadcrumbs(hierarchyManager.getBreadcrumbs());
          setSheetsList(hierarchyManager.getAllSheets());
        } else {
          const comps = data.components || [];
          const wrs = data.wires || [];
          setComponents(comps);
          setWires(wrs);
          hierarchyManager.initRoot(comps, wrs, data.name || fileName?.replace(/\.(json|pscx)$/i, '') || 'Project');
          setActiveSheetId('root');
          setBreadcrumbs([{ id: 'root', name: data.name || 'Main Schematic', isRoot: true }]);
          setSheetsList(hierarchyManager.getAllSheets());
        }

        if (data.customComponents && Array.isArray(data.customComponents)) {
          data.customComponents.forEach((c: any) => customComponentRegistry.registerComponent(c, true));
        }
        if (data.titleBlock) {
          setTitleBlockData(data.titleBlock);
        }

        const name = data.name || fileName?.replace(/\.(json|pscx)$/i, '') || 'Project';
        setProjectName(name);
        if (data.dt) setDtMicro(data.dt * 1e6);
        if (data.tMax) setTMax(data.tMax);

        setSelectedComponent(null);
        setSelectedComponentIds(new Set());
        setSelectedWireId(null);
        setSelectedWireIds(new Set());
        setPendingCompType(null);
        setPendingCustomDefId(undefined);

        setHistory([
          {
            components: JSON.parse(JSON.stringify(data.components || [])),
            wires: JSON.parse(JSON.stringify(data.wires || [])),
            selectedComponentId: null,
          },
        ]);
        setHistoryIndex(0);

        if (filePath) {
          nativeFileSystem.setCurrentFilePath(filePath);
        }

        sessionManager.setDirty(false);
        sessionManager.addRecentProject({
          name,
          path: filePath || name,
          componentCount: (data.components || []).length,
          wireCount: (data.wires || []).length,
        });

        addLog('info', `Opened project '${name}' (${(data.components || []).length} components).`);
      } catch (err: any) {
        addLog('error', `Failed to load project: ${err.message || err}`);
        alert('Invalid or corrupted project file format.');
      }
    },
    [addLog]
  );

  const handleNewProject = useCallback(() => {
    setComponents([]);
    setWires([]);
    setSelectedComponent(null);
    setSelectedComponentIds(new Set());
    setSelectedWireId(null);
    setSelectedWireIds(new Set());
    setPendingCompType(null);
    setPendingCustomDefId(undefined);
    hierarchyManager.initRoot([], [], 'Untitled_Project');
    setActiveSheetId('root');
    setBreadcrumbs([{ id: 'root', name: 'Untitled_Project', isRoot: true }]);
    setSheetsList(hierarchyManager.getAllSheets());
    setProjectName('Untitled_Project');
    nativeFileSystem.resetFilePath();
    setHistory([{ components: [], wires: [], selectedComponentId: null }]);
    setHistoryIndex(0);
    sessionManager.setDirty(false);
    addLog('info', 'Created new empty project workspace.');
  }, [addLog]);

  const handleSave = useCallback(
    async (forceSaveAs: boolean = false) => {
      const data = serializeProjectData();
      const jsonStr = JSON.stringify(data, null, 2);

      try {
        const res = await nativeFileSystem.saveProject(projectName, jsonStr, forceSaveAs);
        if (res.success && !res.cancelled) {
          sessionManager.setDirty(false);
          sessionManager.addRecentProject({
            name: projectName,
            path: res.filePath || projectName,
            componentCount: components.length,
            wireCount: wires.length,
          });
          addLog('info', `Project '${projectName}' saved (${res.filePath || 'local'}).`);
        }
      } catch (err: any) {
        addLog('error', `Save failed: ${err.message || err}`);
      }
    },
    [serializeProjectData, projectName, components.length, wires.length, addLog]
  );

  const handleOpenProject = useCallback(async () => {
    try {
      const res = await nativeFileSystem.openProject();
      if (res && res.content) {
        const parsed = JSON.parse(res.content);
        loadProjectFromData(parsed, res.filePath, res.fileName);
      }
    } catch (err: any) {
      addLog('error', `Failed to open project: ${err.message || err}`);
    }
  }, [loadProjectFromData, addLog]);

  // Check recoverable session on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const rec = await sessionManager.checkRecoverableSession();
      if (rec && rec.jsonContent) {
        setRecoverableSession(rec);
      }
    };
    checkRecovery();
  }, []);

  const handleRestoreRecoveredSession = (session: SessionAutoSave) => {
    try {
      const data = JSON.parse(session.jsonContent);
      loadProjectFromData(data, session.filePath, session.projectName);
      setRecoverableSession(null);
      addLog('info', `Restored auto-saved session from ${new Date(session.savedAt).toLocaleTimeString()}.`);
    } catch (e) {
      addLog('error', 'Failed to restore auto-saved session.');
      setRecoverableSession(null);
    }
  };

  const handleDismissRecovery = () => {
    setRecoverableSession(null);
    sessionManager.clearAutoSave();
    addLog('info', 'Dismissed auto-save recovery.');
  };

  // Auto-save and Tauri menu events
  useEffect(() => {
    const handleAutoSaveReq = () => {
      const data = serializeProjectData();
      sessionManager.performAutoSave(projectName, JSON.stringify(data, null, 2));
    };

    window.addEventListener('pscad_request_autosave', handleAutoSaveReq);

    let unlistenMenu: (() => void) | null = null;
    tauriBridge
      .listen('menu_action', ({ payload }: { payload: string }) => {
        switch (payload) {
          case 'file_new':
            handleNewProject();
            break;
          case 'file_open':
            handleOpenProject();
            break;
          case 'file_save':
            handleSave(false);
            break;
          case 'file_save_as':
            handleSave(true);
            break;
          case 'file_export_comtrade':
            setActiveModal('comtrade');
            break;
          case 'edit_undo':
            handleUndo();
            break;
          case 'edit_redo':
            handleRedo();
            break;
          case 'edit_cut':
            handleCut();
            break;
          case 'edit_copy':
            handleCopy();
            break;
          case 'edit_paste':
            handlePaste();
            break;
          case 'edit_select_all':
            handleSelectAll();
            break;
          case 'sim_run':
            handleStartSim();
            break;
          case 'sim_pause':
            simulationEngine.pause();
            break;
          case 'sim_stop':
            simulationEngine.stop();
            break;
          case 'sim_step':
            simulationEngine.step();
            break;
          case 'sim_snapshot':
            setActiveModal('snapshot');
            break;
          case 'tools_builder':
            setActiveModal('workshop');
            break;
          case 'tools_lcp':
            setActiveModal('lcp');
            break;
          case 'tools_freq_scan':
            setActiveModal('frequencyScan');
            break;
          case 'tools_comtrade':
            setActiveModal('comtrade');
            break;
          case 'tools_multirun':
            setActiveModal('multiRun');
            break;
          case 'help_shortcuts':
            setActiveModal('shortcuts');
            break;
          case 'help_about':
            setActiveModal('help');
            break;
        }
      })
      .then((unsub) => {
        unlistenMenu = unsub;
      });

    return () => {
      window.removeEventListener('pscad_request_autosave', handleAutoSaveReq);
      if (unlistenMenu) unlistenMenu();
    };
  }, [
    serializeProjectData,
    projectName,
    handleNewProject,
    handleOpenProject,
    handleSave,
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleSelectAll,
    handleStartSim,
  ]);


  // Phase 21 Step 21.4: Dual Inspector Mode Handlers (Docked Sidebar vs. Classic PSCAD Modal)
  const handleToggleInspectorMode = useCallback((targetMode?: InspectorMode) => {
    setInspectorMode((prevMode) => {
      const nextMode = targetMode || (prevMode === 'docked' ? 'modal' : 'docked');
      if (nextMode === 'modal') {
        setIsRightDockCollapsed(true);
        addLog('info', 'Switched to Classic PSCAD Modal Mode. Double-click components to open parameter dialogs.');
      } else {
        setIsRightDockCollapsed(false);
        if (editingModalComponent) {
          setSelectedComponent(editingModalComponent);
          setEditingModalComponent(null);
        }
        addLog('info', 'Switched to Modern Docked Inspector Mode. Single-click components to edit parameters in the dock.');
      }
      sessionManager.saveWorkspaceLayout({ inspectorMode: nextMode });
      return nextMode;
    });
  }, [editingModalComponent, addLog]);

  const handleToggleCollapseRightDock = useCallback(() => {
    setIsRightDockCollapsed((prev) => {
      const next = !prev;
      sessionManager.saveWorkspaceLayout({ isRightDockCollapsed: next });
      return next;
    });
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingCompType) {
          setPendingCompType(null);
          setPendingCustomDefId(undefined);
          setToolMode('select');
          addLog('info', 'Cancelled component placement.');
        } else if (toolMode === 'wire') {
          setToolMode('select');
          addLog('info', 'Exited wire mode.');
        } else if (selectedComponent || selectedWireId) {
          setSelectedComponent(null);
          setSelectedWireId(null);
        } else if (activeModal) {
          setActiveModal(null);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (e.key === 'Enter' && selectedComponent && !editingModalComponent) {
        e.preventDefault();
        setEditingModalComponent(selectedComponent);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'i') {
          e.preventDefault();
          handleToggleInspectorMode();
          return;
        }
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          handleRedo();
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          handleCopy();
          return;
        }
        if (key === 'x') {
          e.preventDefault();
          handleCut();
          return;
        }
        if (key === 'v') {
          e.preventDefault();
          handlePaste();
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          handleDuplicate();
          return;
        }
        if (key === 'a') {
          e.preventDefault();
          handleSelectAll();
          return;
        }
        if (key === 's') {
          e.preventDefault();
          if (e.shiftKey) handleSave(true);
          else handleSave(false);
          return;
        }
        if (key === 'o') {
          e.preventDefault();
          if (e.shiftKey) setIsRecentProjectsOpen(true);
          else handleOpenProject();
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          handleNewProject();
          return;
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateSelection(90);
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setToolMode((prev) => (prev === 'wire' ? 'select' : 'wire'));
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (selectedComponent) {
          if (
            simState.isRunning &&
            (selectedComponent.type === COMPONENT_TYPES.BREAKER_1PH ||
              selectedComponent.type === COMPONENT_TYPES.BREAKER_3PH)
          ) {
            simulationEngine.toggleBreaker(selectedComponent.id);
          } else {
            handleRotateSelection(90);
          }
        }
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModal('shortcuts');
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        handleStartSim();
        return;
      }
      if (e.key === 'F6') {
        e.preventDefault();
        simulationEngine.pause();
        return;
      }
      if (e.key === 'F7') {
        e.preventDefault();
        simulationEngine.stop();
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        simulationEngine.step();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setActiveModal('snapshot');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pendingCompType,
    toolMode,
    selectedComponent,
    selectedWireId,
    activeModal,
    handleDeleteSelection,
    handleUndo,
    handleRedo,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleSelectAll,
    handleRotateSelection,
    handleSave,
    handleOpenProject,
    handleNewProject,
    handleStartSim,
    simState.isRunning,
    addLog,
    handleToggleInspectorMode,
    editingModalComponent,
  ]);

  const keyTipActions = useMemo(
    () => ({
      '1': () => handleSave(false),
      '2': () => handleUndo(),
      '3': () => handleRedo(),
      '4': () => handleStartSim(),
      '5': () => handleStepSim(),
      '6': () => handlePauseSim(),
      '7': () => handleStopSim(),
      '8': () => handleNewProject(),
      '9': () => handleOpenProject(),
      '0': () => {
        const snap = snapshotEngine.takeSnapshot(simulationEngine);
        addLog('info', `State snapshot captured at t = ${snap.simTime.toFixed(4)} s`);
      },
    }),
    [handleSave, handleUndo, handleRedo, handleStartSim, handleStepSim, handlePauseSim, handleStopSim, handleNewProject, handleOpenProject, addLog]
  );

  const { showKeytips } = useKeyTips(keyTipActions);

  useEffect(() => {
    const handleAuxNav = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 3 || e.button === 4) {
        e.preventDefault();
      }
    };
    window.addEventListener('auxclick', handleAuxNav, { capture: true });
    return () => window.removeEventListener('auxclick', handleAuxNav, { capture: true });
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0f17] text-slate-200 select-none">
      {/* 1. Desktop Titlebar with Native Window Controls & Quick Access Toolbar (QAT) */}
      <DesktopTitleBar
        projectName={projectName}
        activeSheetName={hierarchyManager.getSheet(activeSheetId)?.name || 'Main Schematic'}
        isSimRunning={simState.isRunning}
        isSimPaused={simState.isPaused}
        onOpenRecentProjects={() => setIsRecentProjectsOpen(true)}
        onSave={() => handleSave(false)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRun={handleStartSim}
        onStep={handleStepSim}
        onPause={handlePauseSim}
        onStop={handleStopSim}
        onNew={handleNewProject}
        onOpen={handleOpenProject}
        onSnapshot={() => {
          const snap = snapshotEngine.takeSnapshot(simulationEngine);
          addLog('info', `State snapshot captured at t = ${snap.simTime.toFixed(4)} s`);
        }}
        onZoomFit={() => {}}
        showKeytips={showKeytips}
      />

      {/* 2. Crash Recovery Banner */}
      {recoverableSession && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0 animate-in fade-in z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Unsaved Session Recovered:</strong> PSCAD found an auto-saved session for <em>{recoverableSession.projectName}</em> from {new Date(recoverableSession.savedAt).toLocaleTimeString()}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRestoreRecoveredSession(recoverableSession)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors shadow"
            >
              <RefreshCw className="w-3 h-3" />
              Restore Session
            </button>
            <button
              onClick={handleDismissRecovery}
              className="p-1 rounded text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors"
              title="Dismiss auto-save recovery"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Consolidated Microsoft Fluent CAD Ribbon Toolbar */}
      <CadRibbon
        toolMode={toolMode}
        setToolMode={setToolMode}
        onNew={handleNewProject}
        onOpen={handleOpenProject}
        onOpenRecent={() => setIsRecentProjectsOpen(true)}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onExportJSON={() => handleSave(true)}
        onExportPNG={() => {}}
        onExportCSV={() => {}}
        onPrint={() => window.print()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={handleDeleteSelection}
        onSelectAll={handleSelectAll}
        onRotate={() => handleRotateSelection(90)}
        onAlign={(type) => handleAlign(type as AlignAction)}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onZoomFit={() => {}}
        onToggleGrid={handleToggleGrid}
        onAddComp={handleAddComp}
        isRunning={simState.isRunning}
        isPaused={simState.isPaused}
        onStartSim={handleStartSim}
        onPauseSim={handlePauseSim}
        onStopSim={handleStopSim}
        onStepSim={handleStepSim}
        dtMicro={dtMicro}
        setDtMicro={setDtMicro}
        tMax={tMax}
        setTMax={setTMax}
        onOpenFFT={() => setActiveModal('fft')}
        onOpenPhasor={() => setActiveModal('phasor')}
        onOpenMatrix={() => setActiveModal('matrix')}
        onOpenSnapshot={() => setActiveModal('snapshot')}
        onOpenGallery={() => setActiveModal('gallery')}
        onOpenLCP={() => setActiveModal('lcp')}
        onOpenShortcuts={() => setActiveModal('shortcuts')}
        onOpenHelp={() => setActiveModal('help')}
        onOpenWorkshop={() => setActiveModal('workshop')}
        onToggleTitleBlock={() => setShowTitleBlock((prev) => !prev)}
        showTitleBlock={showTitleBlock}
        onOpenFrequencyScan={() => setActiveModal('frequencyScan')}
        onOpenComtrade={() => setActiveModal('comtrade')}
        onOpenMultiRun={() => setActiveModal('multiRun')}
        onOpenProtectionStudio={() => setActiveModal('protectionStudio')}
        onOpenCableConstants={() => setActiveModal('cableConstants')}
        onOpenPscxInterop={() => setActiveModal('pscxInterop')}
        onOpenMagneticsSubstation={() => setActiveModal('magneticsSubstation')}
        onOpenAutomationServer={() => setActiveModal('automationServer')}
        onOpenPmuStreamer={() => setActiveModal('pmuStreamer')}
        onOpenFmiCoSim={() => setActiveModal('fmiCoSim')}
        onOpenMasterLibrary={() => setIsMasterLibraryOpen(true)}
        onCreateSubmoduleFromSelection={handleCreateSubmoduleFromSelection}
        onDetachScope={() => handleDetachScope()}
        onOpenFloatingScope={() => handleOpenFloatingScope()}
        activeView={activeView}
        setActiveView={setActiveView}
        inspectorMode={inspectorMode}
        setInspectorMode={handleToggleInspectorMode}
        projectName={projectName}
        compCount={components.length}
        wireCount={wires.length}
        showKeytips={showKeytips}
        onTakeSnapshot={() => {
          const snap = snapshotEngine.takeSnapshot(simulationEngine);
          addLog('info', `State snapshot captured at t = ${snap.simTime.toFixed(4)} s`);
        }}
        cdaEnabled={cdaEnabled}
        setCDAEnabled={(val) => {
          setCdaEnabled(val);
          simulationEngine.setCDAEnabled(val);
          addLog('info', `Critical Damping Adjustment (CDA) ${val ? 'ENABLED' : 'DISABLED'}`);
        }}
        solverType={solverType}
        setSolverType={(type) => {
          setSolverType(type);
          simulationEngine.setSolverType(type);
          addLog('info', `Linear Solver switched to: ${type.toUpperCase()}`);
        }}
        theme={theme}
        setTheme={setTheme}
      />

      {/* 4. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Dock: Workspace Tree (top) & Master Library (bottom) */}
        <aside style={{ width: leftWidth }} className="bg-[#161b26] flex flex-col shrink-0 relative select-none">
          <div style={{ height: leftTopHeight }} className="overflow-hidden flex flex-col shrink-0">
            <WorkspaceTree
              projectName={projectName}
              projects={workspaceProjects}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
              onNewProject={handleNewProject}
              onOpenProject={handleOpenProject}
              onCloseProject={handleCloseProject}
              onSaveProject={() => handleSave(false)}
              onCompileProject={() => compileCircuit()}
              compCount={components.length}
              wireCount={wires.length}
              activeView={activeView}
              setActiveView={setActiveView}
              sheets={sheetsList}
              activeSheetId={activeSheetId}
              onSelectSheet={handleNavigateSheet}
              onAddSubmoduleSheet={handleAddSubmoduleSheet}
              onDuplicateSheet={handleDuplicateSheet}
              onRenameSheet={handleRenameSheet}
              onDeleteSheet={handleDeleteSheet}
              definitions={definitionsList}
              onSelectDefinition={(def) => handleAddComp(def.baseType || COMPONENT_TYPES.SUBMODULE, undefined, def.id)}
              onInstantiateDefinition={(def) => handleAddComp(def.baseType || COMPONENT_TYPES.SUBMODULE, undefined, def.id)}
              onEditDefinition={(def) => {
                if (def.category === 'custom') setActiveModal('workshop');
                else addLog('info', `Selected definition '${def.name}'`);
              }}
              onCreateNewDefinition={() => setActiveModal('workshop')}
              onOpenLCP={() => setActiveModal('lcp')}
              onOpenCableConstants={() => setActiveModal('cableConstants')}
              onOpenSnapshot={() => setActiveModal('snapshot')}
              onOpenComtrade={() => setActiveModal('comtrade')}
              onOpenProtectionStudio={() => setActiveModal('protectionStudio')}
              onOpenWorkshop={() => setActiveModal('workshop')}
              onOpenMasterLibrary={() => setIsMasterLibraryOpen(true)}
            />
          </div>
          {/* Vertical divider */}
          <div
            onMouseDown={handleLeftTopResizeStart}
            className="h-1 bg-[#263147] hover:bg-[#1f6feb] active:bg-[#1f6feb] cursor-row-resize shrink-0 transition-colors"
            title="Drag to resize Project Explorer height"
          />
          <div className="flex-1 overflow-hidden flex flex-col">
            <ComponentLibrary
              onAddComp={handleAddComp}
              onOpenComponentBuilder={() => setActiveModal('workshop')}
              onOpenMasterLibrary={() => setIsMasterLibraryOpen(true)}
            />
          </div>
        </aside>

        {/* Horizontal divider */}
        <div
          onMouseDown={handleLeftResizeStart}
          className="w-1 bg-[#263147] hover:bg-[#1f6feb] active:bg-[#1f6feb] cursor-col-resize shrink-0 transition-colors z-10"
          title="Drag to resize Left Dock width"
        />

        {/* Center Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0c0f17]">
          {/* Workspace Tabs */}
          <div className="h-7 bg-[#1c2333] border-b border-[#263147] flex items-center px-1.5 gap-1 shrink-0 select-none text-xs font-sans">
            <button
              onClick={() => setActiveView('schematic')}
              title="View Schematic CAD Canvas (Alt+1)"
              aria-label="Schematic Canvas"
              className={`h-full flex items-center gap-1.5 px-3 font-semibold transition-colors ${
                activeView === 'schematic'
                  ? 'bg-[#161b26] text-slate-100 border-t-2 border-t-[#1f6feb] border-x border-[#263147]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b26]/50'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-sky-400" />
              <span>Schematic Canvas</span>
            </button>
            <button
              onClick={() => setActiveView('oscilloscope')}
              title="View Oscilloscope Time-Domain Telemetry (Alt+2)"
              aria-label="Oscilloscope Graphs"
              className={`h-full flex items-center gap-1.5 px-3 font-semibold transition-colors ${
                activeView === 'oscilloscope'
                  ? 'bg-[#161b26] text-slate-100 border-t-2 border-t-[#1f6feb] border-x border-[#263147]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b26]/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Oscilloscope Graphs</span>
            </button>
            <button
              onClick={() => setActiveView('split')}
              title="View Split Dual-Pane View (Alt+3)"
              aria-label="Split View"
              className={`h-full flex items-center gap-1.5 px-3 font-semibold transition-colors ${
                activeView === 'split'
                  ? 'bg-[#161b26] text-slate-100 border-t-2 border-t-[#1f6feb] border-x border-[#263147]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b26]/50'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-purple-400" />
              <span>Split View (Canvas + Graphs)</span>
            </button>

            {/* Phase 20: Pop-Out & Float Quick Actions */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => handleOpenFloatingScope()}
                title="Float Oscilloscope as Picture-in-Picture Floating Window"
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121722] hover:bg-[#1a2333] text-sky-300 border border-[#263147] text-[10px] font-semibold transition-colors shadow-xs"
              >
                <Activity className="w-3 h-3 text-sky-400" />
                <span>Float Scope</span>
              </button>
              <button
                onClick={() => handleDetachScope()}
                title="Pop-Out Oscilloscope into Standalone Multi-Monitor Window"
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#131d2e] hover:bg-[#1c2940] text-sky-300 border border-sky-500/40 text-[10px] font-semibold transition-all shadow-xs"
              >
                <ExternalLink className="w-3 h-3 text-sky-400" />
                <span>Detach Scope</span>
              </button>
            </div>
          </div>

          {/* Viewport Panels */}
          <div ref={splitContainerRef} className="flex-1 flex overflow-hidden relative">
            {activeView === 'schematic' && (
              <div className="w-full h-full relative">
                <SchematicCanvas
                  theme={theme}
                  components={components}
                  wires={wires}
                  toolMode={pendingCompType ? 'place' : toolMode}
                  pendingCompType={pendingCompType}
                  pendingCustomDefId={pendingCustomDefId}
                  onClearPendingComp={() => {
                    setPendingCompType(null);
                    setPendingCustomDefId(undefined);
                    setToolMode('select');
                  }}
                  onComponentsChange={setComponents}
                  onWiresChange={setWires}
                  onSelectComponent={(comp) => {
                    setSelectedComponent(comp);
                    if (comp && inspectorMode === 'docked' && isRightDockCollapsed) {
                      setIsRightDockCollapsed(false);
                    }
                  }}
                  inspectorMode={inspectorMode}
                  selectedComponent={selectedComponent}
                  selectedComponentIds={selectedComponentIds}
                  selectedWireId={selectedWireId}
                  selectedWireIds={selectedWireIds}
                  onSelectWire={setSelectedWireId}
                  onSelectMultiple={handleSelectMultiple}
                  setToolMode={setToolMode}
                  onCursorCoords={setCoords}
                  onHistoryPush={pushHistory}
                  activeSheetName={hierarchyManager.getSheet(activeSheetId)?.name || 'Main Schematic'}
                  breadcrumbs={breadcrumbs}
                  onNavigateBreadcrumb={handleNavigateSheet}
                  onDrillDownSubmodule={handleDrillDownSubmodule}
                  showTitleBlock={showTitleBlock}
                  titleBlockData={titleBlockData}
                  projectName={projectName}
                  onCreateSubmoduleFromSelection={handleCreateSubmoduleFromSelection}
                  onOpenParametersModal={(comp) => {
                    setSelectedComponent(comp);
                    setEditingModalComponent(comp);
                  }}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onDuplicate={handleDuplicate}
                  onDeleteSelection={handleDeleteSelection}
                  onRotateSelection={handleRotateSelection}
                  onFlipHorizontal={() => handleFlipSelection('H')}
                  onFlipVertical={() => handleFlipSelection('V')}
                  onSelectAll={handleSelectAll}
                  onAlign={handleAlign}
                  showGrid={showGrid}
                  onToggleGrid={handleToggleGrid}
                  onZoomFit={() => {}}
                  hasClipboard={clipboardComponents.length > 0}
                  onPopOutDetached={(frame) => handleDetachScope(frame.id)}
                  jumpTarget={jumpTarget}
                />
              </div>
            )}

            {activeView === 'oscilloscope' && (
              <div className="w-full h-full relative">
                <OscilloscopeView
                  theme={theme}
                  signals={signalsMap}
                  tMax={tMax}
                  onOpenComtradeModal={() => setActiveModal('comtrade')}
                  onDetachWindow={() => handleDetachScope()}
                />
              </div>
            )}

            {activeView === 'split' && (
              <>
                <div style={{ width: `${splitRatio}%` }} className="h-full relative overflow-hidden">
                  <SchematicCanvas
                    theme={theme}
                    components={components}
                    wires={wires}
                    toolMode={pendingCompType ? 'place' : toolMode}
                    pendingCompType={pendingCompType}
                    pendingCustomDefId={pendingCustomDefId}
                    onClearPendingComp={() => {
                      setPendingCompType(null);
                      setPendingCustomDefId(undefined);
                      setToolMode('select');
                    }}
                    onComponentsChange={setComponents}
                    onWiresChange={setWires}
                    onSelectComponent={(comp) => {
                      setSelectedComponent(comp);
                      if (comp && inspectorMode === 'docked' && isRightDockCollapsed) {
                        setIsRightDockCollapsed(false);
                      }
                    }}
                    inspectorMode={inspectorMode}
                    selectedComponent={selectedComponent}
                    selectedComponentIds={selectedComponentIds}
                    selectedWireId={selectedWireId}
                    selectedWireIds={selectedWireIds}
                    onSelectWire={setSelectedWireId}
                    onSelectMultiple={handleSelectMultiple}
                    setToolMode={setToolMode}
                    onCursorCoords={setCoords}
                    onHistoryPush={pushHistory}
                    activeSheetName={hierarchyManager.getSheet(activeSheetId)?.name || 'Main Schematic'}
                    breadcrumbs={breadcrumbs}
                    onNavigateBreadcrumb={handleNavigateSheet}
                    onDrillDownSubmodule={handleDrillDownSubmodule}
                    showTitleBlock={showTitleBlock}
                    titleBlockData={titleBlockData}
                    projectName={projectName}
                    onCreateSubmoduleFromSelection={handleCreateSubmoduleFromSelection}
                    onOpenParametersModal={(comp) => {
                      setSelectedComponent(comp);
                      setEditingModalComponent(comp);
                    }}
                    onCopy={handleCopy}
                    onCut={handleCut}
                    onPaste={handlePaste}
                    onDuplicate={handleDuplicate}
                    onDeleteSelection={handleDeleteSelection}
                    onRotateSelection={handleRotateSelection}
                    onFlipHorizontal={() => handleFlipSelection('H')}
                    onFlipVertical={() => handleFlipSelection('V')}
                    onSelectAll={handleSelectAll}
                    onAlign={handleAlign}
                    showGrid={showGrid}
                    onToggleGrid={handleToggleGrid}
                    onZoomFit={() => {}}
                    hasClipboard={clipboardComponents.length > 0}
                    onPopOutDetached={(frame) => handleDetachScope(frame.id)}
                    jumpTarget={jumpTarget}
                  />

                </div>
                <div
                  onMouseDown={handleSplitResizeStart}
                  className="w-1 bg-[#263147] hover:bg-[#1f6feb] active:bg-[#1f6feb] cursor-col-resize shrink-0 transition-colors z-10"
                  title="Drag to resize Canvas vs Oscilloscope split"
                />
                <div style={{ width: `${100 - splitRatio}%` }} className="h-full relative overflow-hidden">
                  <OscilloscopeView
                    theme={theme}
                    signals={signalsMap}
                    tMax={tMax}
                    onOpenComtradeModal={() => setActiveModal('comtrade')}
                    onDetachWindow={() => handleDetachScope()}
                  />
                </div>
              </>
            )}
          </div>
        </main>

        {/* Horizontal divider */}
        {!isRightDockCollapsed && (
          <div
            onMouseDown={handleRightResizeStart}
            className="w-1 bg-[#263147] hover:bg-[#1f6feb] active:bg-[#1f6feb] cursor-col-resize shrink-0 transition-colors z-10"
            title="Drag to resize Parameter Inspector width"
          />
        )}

        {/* Right Dock: Parameter Inspector (Dual Mode: Docked vs Collapsed Rail) */}
        <aside
          style={{ width: isRightDockCollapsed ? 28 : rightWidth }}
          className="bg-[#161b26] flex flex-col shrink-0 relative select-none transition-[width] duration-150"
        >
          <ParameterInspector
            component={selectedComponent}
            onUpdateComponent={(updated) => {
              setComponents(components.map((c) => (c.id === updated.id ? updated : c)));
              setSelectedComponent(updated);
            }}
            onDeleteComponent={handleDeleteSelection}
            onRotateComponent={handleRotateSelection}
            onOpenLCP={() => setActiveModal('lcp')}
            onOpenModal={(comp) => setEditingModalComponent(comp)}
            inspectorMode={inspectorMode}
            onToggleInspectorMode={handleToggleInspectorMode}
            isCollapsed={isRightDockCollapsed}
            onToggleCollapse={handleToggleCollapseRightDock}
          />
        </aside>
      </div>

      {/* Vertical divider */}
      <div
        onMouseDown={handleBottomResizeStart}
        className="h-1 bg-[#263147] hover:bg-[#1f6feb] active:bg-[#1f6feb] cursor-row-resize shrink-0 transition-colors z-10"
        title="Drag to resize Log Console height"
      />

      {/* 5. Bottom Dock: Build & Simulation Log Console (PSCad 4-Tab Output Window) */}
      <footer style={{ height: bottomHeight }} className="shrink-0 relative overflow-hidden">
        <OutputDock
          logs={logs}
          onClearLogs={() => setLogs([])}
          diagnostics={diagnostics}
          buildReport={buildReport}
          onRebuild={() => compileCircuit()}
          emtdcEvents={emtdcEvents}
          onClearEmtdcEvents={() => setEmtdcEvents([])}
          components={components}
          wires={wires}
          sheets={sheetsList}
          activeSheetId={activeSheetId}
          onNavigateSheet={handleNavigateSheet}
          onSelectComponent={(compId) => {
            const comp = components.find((c) => c.id === compId);
            if (comp) {
              setSelectedComponent(comp);
              setSelectedComponentIds(new Set([compId]));
            }
          }}
          simState={simState}
          projectName={projectName}
          onJumpToComponent={handleJumpToComponent}
        />
      </footer>

      {/* 6. Status Bar */}
      <StatusBar simState={simState} coords={coords} />

      {/* 7. Modals */}
      {activeModal === 'fft' && <FftModal signals={signalsMap} onClose={() => setActiveModal(null)} />}
      {activeModal === 'phasor' && <PhasorModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'matrix' && <MatrixModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'snapshot' && (
        <SnapshotModal
          onClose={() => setActiveModal(null)}
          onSnapshotRestored={() => setSignalsMap(new Map(simulationEngine.getSignals()))}
        />
      )}
      {activeModal === 'gallery' && <CaseStudiesModal theme={theme} onLoadCase={loadCase} onClose={() => setActiveModal(null)} />}
      {activeModal === 'shortcuts' && <ShortcutsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'help' && <HelpModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'workshop' && (
        <ComponentBuilderModal
          initialDef={null}
          onClose={() => setActiveModal(null)}
          onSave={(def) => {
            addLog('info', `Saved custom component '${def.name}' to user library.`);
            setActiveModal(null);
          }}
        />
      )}
      {activeModal === 'lcp' && (
        <LineConstantsModal
          selectedComponent={selectedComponent}
          onApplyParams={(newParams) => {
            if (selectedComponent) {
              const updated = {
                ...selectedComponent,
                params: {
                  ...selectedComponent.params,
                  ...newParams,
                },
              };
              setComponents(components.map((c) => (c.id === updated.id ? updated : c)));
              setSelectedComponent(updated);
              addLog('info', `Applied LCP parameters to transmission line '${selectedComponent.name}'.`);
            }
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'frequencyScan' && (
        <FrequencyScanModal
          components={components}
          wires={wires}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'comtrade' && (
        <ComtradeModal
          signals={signalsMap}
          onLoadImportedSignals={(imported) => {
            setSignalsMap(imported);
            setActiveView('oscilloscope');
            addLog('info', 'Loaded COMTRADE waveform record into active oscilloscope.');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'multiRun' && (
        <MultiRunModal
          components={components}
          wires={wires}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'protectionStudio' && (
        <ProtectionStudioModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'cableConstants' && (
        <CableConstantsModal
          selectedComponent={selectedComponent}
          onApplyParams={(newParams) => {
            if (selectedComponent) {
              const updated = {
                ...selectedComponent,
                params: {
                  ...selectedComponent.params,
                  ...newParams,
                },
              };
              setComponents(components.map((c) => (c.id === updated.id ? updated : c)));
              setSelectedComponent(updated);
              addLog('info', `Applied cable parameters to component '${selectedComponent.name}'.`);
            }
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'pscxInterop' && (
        <ProjectImportExportModal
          currentProject={{
            name: projectName,
            version: '1.0',
            dt: dtMicro * 1e-6,
            tMax,
            components,
            wires,
          }}
          onImportProject={(proj) => {
            loadProjectFromData(proj, undefined, `${proj.name}.pscx`);
            addLog('info', `Imported PSCAD project '${proj.name}' (${proj.components.length} components, ${proj.wires.length} wires).`);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'magneticsSubstation' && (
        <MagneticsSubstationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'automationServer' && (
        <AutomationServerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'pmuStreamer' && (
        <PmuStreamerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'fmiCoSim' && (
        <FmiModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          components={components}
          onImportFmuBlock={(comp) => {
            setComponents((prev) => [...prev, comp]);
            addLog('info', `Instantiated FMU Block '${comp.name}' on schematic.`);
          }}
        />
      )}

      {isRecentProjectsOpen && (

        <RecentProjectsModal
          theme={theme}
          isOpen={isRecentProjectsOpen}
          onClose={() => setIsRecentProjectsOpen(false)}
          onOpenProjectContent={(content, filePath, fileName) => {
            try {
              const data = JSON.parse(content);
              loadProjectFromData(data, filePath, fileName);
            } catch (e) {
              addLog('error', 'Failed to parse project file from Project Hub.');
            }
          }}
          onNewProject={handleNewProject}
        />
      )}

      {/* Phase 17: Master Library Browser Flyout */}
      {isMasterLibraryOpen && (
        <MasterLibraryFlyout
          isOpen={isMasterLibraryOpen}
          onClose={() => setIsMasterLibraryOpen(false)}
          onSelectComponent={(type, customDefId, defId) => {
            handleAddComp(type, customDefId, defId);
          }}
        />
      )}

      {/* Phase 20: Floating Detachable Oscilloscope Modal */}
      {isScopeFloatingModalOpen && (
        <DetachableScopeModal
          isOpen={isScopeFloatingModalOpen}
          theme={theme}
          signals={signalsMap}
          simState={simState}
          tMax={tMax}
          frameId={floatingScopeFrameId}
          onClose={() => setIsScopeFloatingModalOpen(false)}
          onDockBack={() => {
            setIsScopeFloatingModalOpen(false);
            setActiveView('oscilloscope');
          }}
          onOpenComtradeModal={() => setActiveModal('comtrade')}
        />
      )}

      {/* Phase 21 Step 21.1: Dedicated Multi-Tab Component Parameter Modal */}
      {editingModalComponent && (
        <ComponentParameterModal
          isOpen={!!editingModalComponent}
          component={editingModalComponent}
          onClose={() => setEditingModalComponent(null)}
          onSave={(updated) => {
            const nextComps = components.map((c) => (c.id === updated.id ? updated : c));
            setComponents(nextComps);
            setSelectedComponent(updated);
            setEditingModalComponent(null);
            pushHistory(nextComps, wires, updated.id);
            addLog('info', `Updated parameters for component '${updated.name}'.`);
          }}
          onApply={(updated) => {
            const nextComps = components.map((c) => (c.id === updated.id ? updated : c));
            setComponents(nextComps);
            setSelectedComponent(updated);
            setEditingModalComponent(updated);
            pushHistory(nextComps, wires, updated.id);
            addLog('info', `Applied parameters for component '${updated.name}'.`);
          }}
          onDockToSidebar={(updated) => {
            const nextComps = components.map((c) => (c.id === updated.id ? updated : c));
            setComponents(nextComps);
            setSelectedComponent(updated);
            setEditingModalComponent(null);
            setIsRightDockCollapsed(false);
            setInspectorMode('docked');
            sessionManager.saveWorkspaceLayout({ inspectorMode: 'docked', isRightDockCollapsed: false });
            pushHistory(nextComps, wires, updated.id);
            addLog('info', `Docked parameters for component '${updated.name}' to sidebar inspector.`);
          }}
          onDelete={() => {
            handleDeleteSelection();
            setEditingModalComponent(null);
          }}
          onRotate={(deg) => handleRotateSelection(deg)}
          onOpenLCP={() => setActiveModal('lcp')}
        />
      )}
    </div>
  );
};


export default App;
