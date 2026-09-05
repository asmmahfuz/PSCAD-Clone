import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  RotateCw,
  MousePointer,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Square,
  StepForward,
  BarChart2,
  Compass,
  Sun,
  Moon,
  Camera,
  ShieldCheck,
  Cpu,
  Sparkles,
  HardDrive,
  Layers,
  TrendingUp,
  Shield,
  Cable,
  FileCode,
  Server,
  Radio,
  Box,
  Grid,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Keyboard,
  Info,
  Activity,
  Columns,
  ExternalLink,
  BookmarkCheck,
  RotateCcw,
  PanelRight,
  AppWindow,
} from 'lucide-react';
import { sessionManager, type InspectorMode } from '../../services/sessionManager';
import { COMPONENT_TYPES } from '../../constants';
import type { ThemeType } from '../../types';
import type { SolverType } from '../../engine/solver';
import { RibbonGroup } from './RibbonGroup';
import { RibbonButton } from './RibbonButton';
import { FileBackstageDrawer } from './FileBackstageDrawer';

export interface CadRibbonProps {
  toolMode: 'select' | 'wire';
  setToolMode: (m: 'select' | 'wire') => void;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent?: () => void;
  onSave: () => void;
  onSaveAs?: () => void;
  onExportJSON?: () => void;
  onExportPNG?: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onRotate: () => void;
  onAlign?: (type: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onToggleGrid?: () => void;
  onAddComp: (type: string) => void;
  isRunning: boolean;
  isPaused: boolean;
  onStartSim: () => void;
  onPauseSim: () => void;
  onStopSim: () => void;
  onStepSim: () => void;
  dtMicro: number;
  setDtMicro: (v: number) => void;
  tMax: number;
  setTMax: (v: number) => void;
  onOpenFFT: () => void;
  onOpenPhasor: () => void;
  onOpenMatrix?: () => void;
  onOpenSnapshot: () => void;
  onTakeSnapshot: () => void;
  cdaEnabled: boolean;
  setCDAEnabled: (v: boolean) => void;
  solverType: SolverType;
  setSolverType: (s: SolverType) => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  // Phase 6 props
  onOpenWorkshop?: () => void;
  onToggleTitleBlock?: () => void;
  showTitleBlock?: boolean;
  // Phase 7 props
  onOpenFrequencyScan?: () => void;
  onOpenComtrade?: () => void;
  onOpenMultiRun?: () => void;
  onOpenGallery?: () => void;
  onOpenLCP?: () => void;
  onOpenShortcuts?: () => void;
  onOpenHelp?: () => void;
  // Phase 11 props
  onOpenProtectionStudio?: () => void;
  // Phase 13 props
  onOpenCableConstants?: () => void;
  onOpenPscxInterop?: () => void;
  // Phase 14 props
  onOpenMagneticsSubstation?: () => void;
  // Phase 15 props
  onOpenAutomationServer?: () => void;
  onOpenPmuStreamer?: () => void;
  onOpenFmiCoSim?: () => void;
  // Phase 17 props
  onOpenMasterLibrary?: () => void;
  onCreateSubmoduleFromSelection?: () => void;
  // Phase 20 props
  onDetachScope?: () => void;
  onOpenFloatingScope?: () => void;
  // View Switcher
  activeView?: 'schematic' | 'oscilloscope' | 'split';
  setActiveView?: (view: 'schematic' | 'oscilloscope' | 'split') => void;
  // Inspector Mode Switcher (Step 21.4)
  inspectorMode?: InspectorMode;
  setInspectorMode?: (mode: InspectorMode) => void;
  projectName?: string;
  compCount?: number;
  wireCount?: number;
  showKeytips?: boolean;
  activeKeytip?: string | null;
}

export type RibbonTab = 'home' | 'components' | 'view' | 'tools' | 'help';

export const CadRibbon: React.FC<CadRibbonProps> = (props) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pscad_ribbon_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [isFileBackstageOpen, setIsFileBackstageOpen] = useState<boolean>(false);

  // Step 20.4: Multi-Monitor Layout Persistence State
  const [isAutoRestoreScope, setIsAutoRestoreScope] = useState<boolean>(true);

  useEffect(() => {
    sessionManager.getScopeLayout().then((l) => setIsAutoRestoreScope(l.autoRestore));
  }, []);

  const handleToggleAutoRestore = () => {
    const nextVal = !isAutoRestoreScope;
    setIsAutoRestoreScope(nextVal);
    sessionManager.saveScopeLayout({ autoRestore: nextVal }).catch(() => {});
  };

  const handleResetScopeLayout = () => {
    sessionManager.saveScopeLayout({
      x: 100,
      y: 100,
      width: 1100,
      height: 740,
      isDetached: false,
      autoRestore: true,
    }).catch(() => {});
  };

  const ribbonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('pscad_ribbon_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {}
  }, [isCollapsed]);

  // Click outside flyout to auto-close when ribbon is collapsed
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isCollapsed &&
        isFlyoutOpen &&
        ribbonContainerRef.current &&
        !ribbonContainerRef.current.contains(e.target as Node)
      ) {
        setIsFlyoutOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, isFlyoutOpen]);

  // Keyboard shortcut Ctrl+F1 to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F1') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
        setIsFlyoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabClick = (tab: RibbonTab) => {
    setActiveTab(tab);
    if (isCollapsed) {
      setIsFlyoutOpen(true);
    }
  };

  const handleTabDoubleClick = (tab: RibbonTab) => {
    setActiveTab(tab);
    setIsCollapsed((prev) => !prev);
    setIsFlyoutOpen(false);
  };

  const showRibbonBody = !isCollapsed || isFlyoutOpen;

  return (
    <div
      ref={ribbonContainerRef}
      className={`bg-[#141924] border-b border-[#212c3f] flex flex-col select-none font-sans text-xs shrink-0 z-40 transition-all ${
        isCollapsed && isFlyoutOpen ? 'relative' : ''
      }`}
    >
      {/* 1. Ribbon Tab Headers Navigation Bar */}
      <div className="h-7.5 bg-[#121622] border-b border-[#1f283b] flex items-center px-1.5 justify-between">
        <div className="flex items-center gap-0.5">
          {/* File Tab (Office Backstage Trigger) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFileBackstageOpen(true)}
              className="px-3 py-1 rounded bg-[#1f6feb] hover:bg-[#2b7af3] text-white font-bold text-[11px] transition-colors cursor-pointer mr-1 shadow-sm flex items-center gap-1"
            >
              <span>File</span>
            </button>
            {props.showKeytips && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow border border-black/50 pointer-events-none">
                F
              </div>
            )}
          </div>

          {/* Standard Ribbon Tabs */}
          <RibbonTabHeader
            label="Home"
            tabKey="H"
            active={activeTab === 'home'}
            showKeytip={props.showKeytips}
            onClick={() => handleTabClick('home')}
            onDoubleClick={() => handleTabDoubleClick('home')}
          />
          <RibbonTabHeader
            label="Components"
            tabKey="C"
            active={activeTab === 'components'}
            showKeytip={props.showKeytips}
            onClick={() => handleTabClick('components')}
            onDoubleClick={() => handleTabDoubleClick('components')}
          />
          <RibbonTabHeader
            label="View"
            tabKey="V"
            active={activeTab === 'view'}
            showKeytip={props.showKeytips}
            onClick={() => handleTabClick('view')}
            onDoubleClick={() => handleTabDoubleClick('view')}
          />
          <RibbonTabHeader
            label="Tools"
            tabKey="T"
            active={activeTab === 'tools'}
            showKeytip={props.showKeytips}
            onClick={() => handleTabClick('tools')}
            onDoubleClick={() => handleTabDoubleClick('tools')}
          />
          <RibbonTabHeader
            label="Help"
            tabKey="E"
            active={activeTab === 'help'}
            showKeytip={props.showKeytips}
            onClick={() => handleTabClick('help')}
            onDoubleClick={() => handleTabDoubleClick('help')}
          />
        </div>

        {/* Right Header Controls: Collapse Ribbon Toggle & Quick Shortcuts */}
        <div className="flex items-center gap-1">
          {props.activeView && props.setActiveView && (
            <div className="hidden md:flex items-center gap-0.5 bg-[#182030] p-0.5 rounded border border-[#26334a] mr-1">
              <button
                type="button"
                onClick={() => props.setActiveView!('schematic')}
                title="Schematic Canvas View"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  props.activeView === 'schematic'
                    ? 'bg-[#1f6feb] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Schematic
              </button>
              <button
                type="button"
                onClick={() => props.setActiveView!('oscilloscope')}
                title="Oscilloscope Scope View"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  props.activeView === 'oscilloscope'
                    ? 'bg-[#1f6feb] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scope
              </button>
              <button
                type="button"
                onClick={() => props.setActiveView!('split')}
                title="Split View (Schematic + Scope)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  props.activeView === 'split'
                    ? 'bg-[#1f6feb] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Split
              </button>
            </div>
          )}

          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={() => props.setTheme(props.theme === 'dark' ? 'light' : 'dark')}
            title={`Current theme: ${props.theme}. Click to switch theme.`}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f293d] transition-colors cursor-pointer"
          >
            {props.theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>

          {/* Collapse Ribbon Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand Ribbon (Ctrl+F1)' : 'Collapse Ribbon (Ctrl+F1)'}
            aria-label="Collapse or Expand Ribbon"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f293d] transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Ribbon Content Groups Body */}
      {showRibbonBody && (
        <div
          className={`h-[88px] bg-[#141924] border-b border-[#212c3f] flex items-center px-1.5 overflow-x-auto overflow-y-hidden select-none font-sans z-40 ${
            isCollapsed && isFlyoutOpen
              ? 'absolute top-full left-0 right-0 shadow-2xl bg-[#141924]/95 backdrop-blur-md animate-in slide-in-from-top-1 duration-150'
              : ''
          }`}
        >
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="flex items-center h-full">
              {/* Group 1: Project Operations */}
              <RibbonGroup title="Project" onLaunchDialog={props.onOpenRecent} dialogTitle="Open Project Hub">
                <RibbonButton
                  size="large"
                  icon={<FileText className="w-6 h-6 text-blue-400" />}
                  label="New"
                  sublabel="Project"
                  shortcut="Ctrl+N"
                  keytip="N"
                  showKeytip={props.showKeytips}
                  onClick={props.onNew}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={<FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
                    label="Open..."
                    shortcut="Ctrl+O"
                    keytip="O"
                    showKeytip={props.showKeytips}
                    onClick={props.onOpen}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Save className="w-3.5 h-3.5 text-emerald-400" />}
                    label="Save"
                    shortcut="Ctrl+S"
                    keytip="S"
                    showKeytip={props.showKeytips}
                    onClick={props.onSave}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
                    label="Gallery"
                    keytip="G"
                    showKeytip={props.showKeytips}
                    onClick={props.onOpenGallery || (() => {})}
                  />
                </div>
              </RibbonGroup>

              {/* Group 2: Simulation Controls */}
              <RibbonGroup title="Simulation Controls">
                <RibbonButton
                  size="large"
                  variant="primary"
                  icon={<Play className="w-6 h-6 text-emerald-400 fill-current" />}
                  label="Run EMTDC"
                  sublabel={props.isRunning ? 'Active' : 'Ready'}
                  active={props.isRunning}
                  shortcut="F5"
                  keytip="R"
                  showKeytip={props.showKeytips}
                  onClick={props.onStartSim}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={<StepForward className="w-3.5 h-3.5 text-blue-400" />}
                    label="Step Cycle"
                    shortcut="F10"
                    keytip="P"
                    showKeytip={props.showKeytips}
                    onClick={props.onStepSim}
                  />
                  <RibbonButton
                    size="small"
                    variant="warning"
                    icon={<Pause className="w-3.5 h-3.5 text-amber-400" />}
                    label="Pause"
                    active={props.isPaused}
                    shortcut="F6"
                    keytip="A"
                    showKeytip={props.showKeytips}
                    onClick={props.onPauseSim}
                  />
                  <RibbonButton
                    size="small"
                    variant="danger"
                    icon={<Square className="w-3.5 h-3.5 text-rose-400" />}
                    label="Stop & Reset"
                    shortcut="Shift+F5"
                    keytip="X"
                    showKeytip={props.showKeytips}
                    onClick={props.onStopSim}
                  />
                </div>

                {/* Timings Configuration */}
                <div className="flex flex-col justify-center gap-1 px-1.5 py-0.5 bg-[#0f141f] rounded border border-[#202c40] ml-0.5 text-[10.5px]">
                  <label className="flex items-center justify-between gap-1 text-slate-300 font-mono">
                    <span className="text-slate-400">Δt:</span>
                    <input
                      type="number"
                      value={props.dtMicro}
                      onChange={(e) => props.setDtMicro(parseFloat(e.target.value) || 50)}
                      className="w-12 px-1 py-0 bg-[#080b11] border border-[#2a374e] rounded text-slate-100 text-center font-mono text-[10px] h-4.5"
                    />
                    <span className="text-slate-400 text-[9px]">µs</span>
                  </label>
                  <label className="flex items-center justify-between gap-1 text-slate-300 font-mono">
                    <span className="text-slate-400">Tmax:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={props.tMax}
                      onChange={(e) => props.setTMax(parseFloat(e.target.value) || 0.5)}
                      className="w-12 px-1 py-0 bg-[#080b11] border border-[#2a374e] rounded text-slate-100 text-center font-mono text-[10px] h-4.5"
                    />
                    <span className="text-slate-400 text-[9px]">s</span>
                  </label>
                </div>
              </RibbonGroup>

              {/* Group 3: Clipboard */}
              <RibbonGroup title="Clipboard">
                <RibbonButton
                  size="large"
                  icon={<ClipboardPaste className="w-6 h-6 text-slate-200" />}
                  label="Paste"
                  shortcut="Ctrl+V"
                  keytip="V"
                  showKeytip={props.showKeytips}
                  onClick={props.onPaste}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={<Scissors className="w-3.5 h-3.5 text-slate-300" />}
                    label="Cut"
                    shortcut="Ctrl+X"
                    keytip="X"
                    showKeytip={props.showKeytips}
                    onClick={props.onCut}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Copy className="w-3.5 h-3.5 text-slate-300" />}
                    label="Copy"
                    shortcut="Ctrl+C"
                    keytip="C"
                    showKeytip={props.showKeytips}
                    onClick={props.onCopy}
                  />
                  {props.onDelete && (
                    <RibbonButton
                      size="small"
                      variant="danger"
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                      label="Delete"
                      shortcut="Del"
                      keytip="D"
                      showKeytip={props.showKeytips}
                      onClick={props.onDelete}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 4: CAD & Drawing Tools */}
              <RibbonGroup title="Draw & Select">
                <RibbonButton
                  size="large"
                  variant="primary"
                  active={props.toolMode === 'select'}
                  icon={<MousePointer className="w-6 h-6 text-blue-400" />}
                  label="Select"
                  shortcut="S"
                  keytip="M"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setToolMode('select')}
                />
                <RibbonButton
                  size="large"
                  variant="accent"
                  active={props.toolMode === 'wire'}
                  icon={<Zap className="w-6 h-6 text-amber-400" />}
                  label="Wire"
                  shortcut="W"
                  keytip="W"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setToolMode('wire')}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={<RotateCw className="w-3.5 h-3.5 text-amber-400" />}
                    label="Rotate 90°"
                    shortcut="R"
                    keytip="T"
                    showKeytip={props.showKeytips}
                    onClick={props.onRotate}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Undo2 className="w-3.5 h-3.5 text-slate-300" />}
                    label="Undo"
                    shortcut="Ctrl+Z"
                    keytip="U"
                    showKeytip={props.showKeytips}
                    onClick={props.onUndo}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Redo2 className="w-3.5 h-3.5 text-slate-300" />}
                    label="Redo"
                    shortcut="Ctrl+Y"
                    keytip="Y"
                    showKeytip={props.showKeytips}
                    onClick={props.onRedo}
                  />
                </div>
              </RibbonGroup>

              {/* Group 5: Solvers & CDA */}
              <RibbonGroup title="Solvers & Stability">
                <RibbonButton
                  size="large"
                  icon={<Camera className="w-6 h-6 text-emerald-400" />}
                  label="Snapshots"
                  sublabel="Hot-Start"
                  shortcut="F9"
                  keytip="K"
                  showKeytip={props.showKeytips}
                  onClick={props.onOpenSnapshot}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    variant="success"
                    active={props.cdaEnabled}
                    icon={<ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    label={`CDA: ${props.cdaEnabled ? 'ON' : 'OFF'}`}
                    title="Toggle Critical Damping Adjustment (CDA) Chatter Suppression"
                    keytip="D"
                    showKeytip={props.showKeytips}
                    onClick={() => props.setCDAEnabled(!props.cdaEnabled)}
                  />
                  <RibbonButton
                    size="small"
                    variant="accent"
                    icon={<Cpu className="w-3.5 h-3.5 text-purple-400" />}
                    label={`Solver: ${props.solverType.toUpperCase()}`}
                    title="Switch Sparse Markowitz LU / Dense LU Conductance Solver"
                    keytip="L"
                    showKeytip={props.showKeytips}
                    onClick={() => props.setSolverType(props.solverType === 'sparse' ? 'dense' : 'sparse')}
                  />
                </div>
              </RibbonGroup>
            </div>
          )}

          {/* TAB 2: COMPONENTS */}
          {activeTab === 'components' && (
            <div className="flex items-center h-full">
              {/* Group 0: Master Library */}
              <RibbonGroup title="Master Library">
                <RibbonButton
                  size="large"
                  variant="primary"
                  icon={<Box className="w-6 h-6 text-sky-400" />}
                  label="Master Library"
                  sublabel="master.pslx"
                  keytip="L"
                  showKeytip={props.showKeytips}
                  onClick={props.onOpenMasterLibrary || (() => {})}
                />
              </RibbonGroup>

              {/* Group 1: Passive Elements */}
              <RibbonGroup title="Passive RLC">
                <div className="grid grid-cols-2 gap-0.5">
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-amber-400" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v6M3 8h10M5 11h6M7 14h2" />
                      </svg>
                    }
                    label="Ground (0V)"
                    keytip="G"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.GROUND)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-emerald-400" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 8h2.5l2-4 3 8 3-8 2 4H15" />
                      </svg>
                    }
                    label="Resistor"
                    keytip="R"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.RESISTOR)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-cyan-400" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 9h1.5a2 2 0 0 1 3.8-1 2 2 0 0 1 3.8 0 2 2 0 0 1 3.8 0H15" />
                      </svg>
                    }
                    label="Inductor"
                    keytip="L"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.INDUCTOR)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-sky-400" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 8h5M6 3v10M10 3v10M10 8h5" />
                      </svg>
                    }
                    label="Capacitor"
                    keytip="C"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.CAPACITOR)}
                  />
                </div>
              </RibbonGroup>

              {/* Group 2: Sources & Transmission */}
              <RibbonGroup title="Sources & Lines">
                <div className="grid grid-cols-2 gap-0.5">
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-amber-300" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M5 8c1-3 2-3 3 0s2 3 3 0" />
                      </svg>
                    }
                    label="AC Source 1-Ph"
                    keytip="1"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.AC_SOURCE_1PH)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-purple-400" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M5 6.5c.7-1.5 1.3-1.5 2 0s1.3 1.5 2 0M5 9.5c.7-1.5 1.3-1.5 2 0s1.3 1.5 2 0" />
                      </svg>
                    }
                    label="3-Phase AC"
                    keytip="3"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.AC_SOURCE_3PH)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-emerald-400" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v12M4 5h8M3 8h10M5 11h6M5 14l3-12 3 12" />
                      </svg>
                    }
                    label="Pi-Line (Overhead)"
                    keytip="P"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.PI_LINE)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-sky-400" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="8" r="4" />
                        <circle cx="10" cy="8" r="4" />
                      </svg>
                    }
                    label="Transformer"
                    keytip="T"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.TRANSFORMER_1PH)}
                  />
                </div>
              </RibbonGroup>

              {/* Group 3: Breakers & Faults */}
              <RibbonGroup title="Switches & Faults">
                <div className="grid grid-cols-2 gap-0.5">
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-rose-400" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="3.5" cy="11.5" r="1.5" />
                        <circle cx="12.5" cy="11.5" r="1.5" />
                        <path d="M1 11.5h1M14 11.5h1M4.5 10.5l6-7" />
                      </svg>
                    }
                    label="Breaker 1-Ph"
                    keytip="B"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.BREAKER_1PH)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-rose-300" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="3.5" cy="11.5" r="1.5" />
                        <circle cx="12.5" cy="11.5" r="1.5" />
                        <path d="M1 11.5h1M14 11.5h1M4.5 10.5l6-7" />
                      </svg>
                    }
                    label="3-Ph Breaker"
                    keytip="K"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.BREAKER_3PH)}
                  />
                  <RibbonButton
                    size="small"
                    variant="danger"
                    icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                    label="Timed Fault"
                    keytip="F"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.FAULT_BLOCK)}
                  />
                </div>
              </RibbonGroup>

              {/* Group 4: Meters & Probes */}
              <RibbonGroup title="Meters & Probes">
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-yellow-300" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M5.5 6l2.5 5 2.5-5" />
                      </svg>
                    }
                    label="Voltmeter Probe"
                    keytip="V"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.VOLTMETER)}
                  />
                  <RibbonButton
                    size="small"
                    icon={
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 stroke-current fill-none stroke-[1.8] text-emerald-300" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M5.5 11l2.5-6 2.5 6M6.5 9.5h3" />
                      </svg>
                    }
                    label="Ammeter Sensor"
                    keytip="A"
                    showKeytip={props.showKeytips}
                    onClick={() => props.onAddComp(COMPONENT_TYPES.AMMETER)}
                  />
                </div>
              </RibbonGroup>

              {/* Group 5: Custom Workshop & Modules */}
              <RibbonGroup title="Custom & Modules">
                {props.onOpenWorkshop && (
                  <RibbonButton
                    size="large"
                    icon={<Sparkles className="w-6 h-6 text-purple-400" />}
                    label="Component"
                    sublabel="Workshop"
                    keytip="W"
                    showKeytip={props.showKeytips}
                    onClick={props.onOpenWorkshop}
                  />
                )}
                {props.onCreateSubmoduleFromSelection && (
                  <RibbonButton
                    size="small"
                    icon={<Box className="w-3.5 h-3.5 text-purple-300" />}
                    label="Create Submodule"
                    keytip="M"
                    showKeytip={props.showKeytips}
                    onClick={props.onCreateSubmoduleFromSelection}
                  />
                )}
              </RibbonGroup>
            </div>
          )}

          {/* TAB 3: VIEW */}
          {activeTab === 'view' && (
            <div className="flex items-center h-full">
              {/* Group 1: Workspace Views */}
              <RibbonGroup title="Workspace Views">
                <RibbonButton
                  size="large"
                  active={props.activeView === 'schematic'}
                  icon={<Layers className="w-6 h-6 text-blue-400" />}
                  label="Schematic"
                  sublabel="Canvas"
                  keytip="S"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setActiveView && props.setActiveView('schematic')}
                />
                <RibbonButton
                  size="large"
                  active={props.activeView === 'oscilloscope'}
                  icon={<Activity className="w-6 h-6 text-cyan-400" />}
                  label="Scope"
                  sublabel="Telemetry"
                  keytip="O"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setActiveView && props.setActiveView('oscilloscope')}
                />
                <RibbonButton
                  size="large"
                  active={props.activeView === 'split'}
                  icon={<Columns className="w-6 h-6 text-purple-400" />}
                  label="Split View"
                  sublabel="Dual Dock"
                  keytip="P"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setActiveView && props.setActiveView('split')}
                />
                <RibbonButton
                  size="large"
                  icon={<ExternalLink className="w-6 h-6 text-sky-400" />}
                  label="Detach Scope"
                  sublabel="Pop-Out"
                  keytip="D"
                  showKeytip={props.showKeytips}
                  onClick={props.onDetachScope || (() => {})}
                />
                <div className="flex flex-col gap-0.5 justify-center pl-1 border-l border-[#222d42]">
                  <RibbonButton
                    size="small"
                    icon={<BookmarkCheck className={`w-3.5 h-3.5 ${isAutoRestoreScope ? 'text-emerald-400' : 'text-slate-400'}`} />}
                    label={isAutoRestoreScope ? 'Auto-Restore: ON' : 'Auto-Restore: OFF'}
                    title="Toggle auto-restoring detached oscilloscope on secondary display when starting PSCAD"
                    onClick={handleToggleAutoRestore}
                  />
                  <RibbonButton
                    size="small"
                    icon={<RotateCcw className="w-3.5 h-3.5 text-slate-300" />}
                    label="Reset Scope Pos"
                    title="Reset detached oscilloscope window coordinates to default position"
                    onClick={handleResetScopeLayout}
                  />
                </div>
              </RibbonGroup>

              {/* Group: Inspector Mode (Step 21.4 Dual Inspector Mode) */}
              <RibbonGroup title="Inspector Mode">
                <RibbonButton
                  size="large"
                  active={props.inspectorMode === 'docked' || !props.inspectorMode}
                  icon={<PanelRight className="w-6 h-6 text-sky-400" />}
                  label="Modern Docked"
                  sublabel="Single-Click"
                  keytip="K"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setInspectorMode?.('docked')}
                />
                <RibbonButton
                  size="large"
                  active={props.inspectorMode === 'modal'}
                  icon={<AppWindow className="w-6 h-6 text-amber-400" />}
                  label="Classic Modal"
                  sublabel="Double-Click"
                  keytip="M"
                  showKeytip={props.showKeytips}
                  onClick={() => props.setInspectorMode?.('modal')}
                />
                <div className="flex flex-col gap-0.5 justify-center pl-1 border-l border-[#222d42]">
                  <RibbonButton
                    size="small"
                    icon={props.inspectorMode === 'modal' ? <AppWindow className="w-3.5 h-3.5 text-amber-400" /> : <PanelRight className="w-3.5 h-3.5 text-sky-400" />}
                    label={props.inspectorMode === 'modal' ? 'Mode: Modal' : 'Mode: Docked'}
                    shortcut="Ctrl+I"
                    title="Toggle parameter editing workflow between Modern Docked and Classic Modal (Ctrl+I)"
                    onClick={() => props.setInspectorMode?.(props.inspectorMode === 'modal' ? 'docked' : 'modal')}
                  />
                </div>
              </RibbonGroup>

              {/* Group 2: Zoom Navigation */}
              <RibbonGroup title="Zoom & Pan">
                <RibbonButton
                  size="large"
                  icon={<Maximize2 className="w-6 h-6 text-indigo-300" />}
                  label="Zoom Fit"
                  shortcut="Ctrl+0"
                  keytip="F"
                  showKeytip={props.showKeytips}
                  onClick={props.onZoomFit}
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    icon={<ZoomIn className="w-3.5 h-3.5 text-slate-200" />}
                    label="Zoom In"
                    shortcut="Ctrl++"
                    keytip="I"
                    showKeytip={props.showKeytips}
                    onClick={props.onZoomIn}
                  />
                  <RibbonButton
                    size="small"
                    icon={<ZoomOut className="w-3.5 h-3.5 text-slate-200" />}
                    label="Zoom Out"
                    shortcut="Ctrl+-"
                    keytip="U"
                    showKeytip={props.showKeytips}
                    onClick={props.onZoomOut}
                  />
                </div>
              </RibbonGroup>

              {/* Group 3: Canvas Layout Options */}
              <RibbonGroup title="Canvas Overlays">
                <div className="flex flex-col gap-0.5 justify-center">
                  {props.onToggleGrid && (
                    <RibbonButton
                      size="small"
                      icon={<Grid className="w-3.5 h-3.5 text-slate-300" />}
                      label="Toggle Grid"
                      keytip="G"
                      showKeytip={props.showKeytips}
                      onClick={props.onToggleGrid}
                    />
                  )}
                  {props.onToggleTitleBlock && (
                    <RibbonButton
                      size="small"
                      active={props.showTitleBlock}
                      icon={<FileText className="w-3.5 h-3.5 text-blue-300" />}
                      label={`Title Block: ${props.showTitleBlock ? 'ON' : 'OFF'}`}
                      keytip="B"
                      showKeytip={props.showKeytips}
                      onClick={props.onToggleTitleBlock}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 4: Color Themes */}
              <RibbonGroup title="Color Themes">
                <div className="flex flex-col gap-0.5 justify-center">
                  <RibbonButton
                    size="small"
                    active={props.theme === 'dark'}
                    icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />}
                    label="PSCAD Dark IDE"
                    keytip="D"
                    showKeytip={props.showKeytips}
                    onClick={() => props.setTheme('dark')}
                  />
                  <RibbonButton
                    size="small"
                    active={props.theme === 'light'}
                    icon={<Sun className="w-3.5 h-3.5 text-amber-300" />}
                    label="PSCAD Classic Light"
                    keytip="L"
                    showKeytip={props.showKeytips}
                    onClick={() => props.setTheme('light')}
                  />
                  <RibbonButton
                    size="small"
                    active={props.theme === 'blueprint'}
                    icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
                    label="Blueprint CAD"
                    keytip="P"
                    showKeytip={props.showKeytips}
                    onClick={() => props.setTheme('blueprint')}
                  />
                </div>
              </RibbonGroup>
            </div>
          )}

          {/* TAB 4: TOOLS (Advanced Engineering Studios) */}
          {activeTab === 'tools' && (
            <div className="flex items-center h-full">
              {/* Group 1: Lines & Magnetics */}
              <RibbonGroup title="Transmission & Magnetics">
                <div className="grid grid-cols-2 gap-0.5">
                  {props.onOpenLCP && (
                    <RibbonButton
                      size="small"
                      icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
                      label="LCP Overhead"
                      title="Line Constants Program (LCP) Studio"
                      keytip="L"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenLCP}
                    />
                  )}
                  {props.onOpenCableConstants && (
                    <RibbonButton
                      size="small"
                      icon={<Cable className="w-3.5 h-3.5 text-emerald-400" />}
                      label="Cable Studio"
                      title="Underground & Submarine Cable Constants Studio"
                      keytip="C"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenCableConstants}
                    />
                  )}
                  {props.onOpenMagneticsSubstation && (
                    <RibbonButton
                      size="small"
                      icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                      label="Magnetics/OLTC"
                      title="Advanced Magnetics, Hysteresis, OLTC & SFRA Studio"
                      keytip="M"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenMagneticsSubstation}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 2: Interoperability & Standards */}
              <RibbonGroup title="Interop & Standards">
                <div className="grid grid-cols-2 gap-0.5">
                  {props.onOpenPscxInterop && (
                    <RibbonButton
                      size="small"
                      icon={<FileCode className="w-3.5 h-3.5 text-sky-400" />}
                      label="PSCAD .pscx"
                      title="Official PSCAD .pscx XML Interoperability Studio"
                      keytip="P"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenPscxInterop}
                    />
                  )}
                  {props.onOpenComtrade && (
                    <RibbonButton
                      size="small"
                      icon={<HardDrive className="w-3.5 h-3.5 text-emerald-400" />}
                      label="COMTRADE"
                      title="IEEE C37.111 COMTRADE File Studio"
                      keytip="R"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenComtrade}
                    />
                  )}
                  {props.onOpenFmiCoSim && (
                    <RibbonButton
                      size="small"
                      icon={<Box className="w-3.5 h-3.5 text-amber-400" />}
                      label="FMI / FMU"
                      title="FMI 2.0 / 3.0 Co-Simulation Workshop"
                      keytip="F"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenFmiCoSim}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 3: Automation & Telemetry */}
              <RibbonGroup title="Automation & PMU">
                <div className="grid grid-cols-2 gap-0.5">
                  {props.onOpenAutomationServer && (
                    <RibbonButton
                      size="small"
                      icon={<Server className="w-3.5 h-3.5 text-sky-400" />}
                      label="RPC Server"
                      title="Headless Automation CLI & RPC Server Hub"
                      keytip="A"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenAutomationServer}
                    />
                  )}
                  {props.onOpenPmuStreamer && (
                    <RibbonButton
                      size="small"
                      icon={<Radio className="w-3.5 h-3.5 text-cyan-400" />}
                      label="PMU Streamer"
                      title="IEEE C37.118 Synchrophasor PMU Streamer"
                      keytip="U"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenPmuStreamer}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 4: Power Systems Analysis */}
              <RibbonGroup title="Power Systems Analysis">
                <div className="grid grid-cols-3 gap-0.5">
                  {props.onOpenProtectionStudio && (
                    <RibbonButton
                      size="small"
                      icon={<Shield className="w-3.5 h-3.5 text-sky-400" />}
                      label="Protection Studio"
                      title="Protection Studio & ANSI Relays Suite"
                      keytip="E"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenProtectionStudio}
                    />
                  )}
                  {props.onOpenFrequencyScan && (
                    <RibbonButton
                      size="small"
                      icon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                      label="Z(f) Scan"
                      title="Harmonic Impedance Scan Studio"
                      keytip="Z"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenFrequencyScan}
                    />
                  )}
                  {props.onOpenMultiRun && (
                    <RibbonButton
                      size="small"
                      icon={<Layers className="w-3.5 h-3.5 text-amber-400" />}
                      label="Multi-Run"
                      title="Parametric Multi-Run Sensitivity Sweep"
                      keytip="M"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenMultiRun}
                    />
                  )}
                  <RibbonButton
                    size="small"
                    icon={<BarChart2 className="w-3.5 h-3.5 text-cyan-400" />}
                    label="FFT Analyzer"
                    title="FFT Harmonic Spectrum Analyzer"
                    keytip="H"
                    showKeytip={props.showKeytips}
                    onClick={props.onOpenFFT}
                  />
                  <RibbonButton
                    size="small"
                    icon={<Compass className="w-3.5 h-3.5 text-purple-400" />}
                    label="Phasor Scope"
                    title="3-Phase Phasor Vector Scope"
                    keytip="P"
                    showKeytip={props.showKeytips}
                    onClick={props.onOpenPhasor}
                  />
                  {props.onOpenMatrix && (
                    <RibbonButton
                      size="small"
                      icon={<Cpu className="w-3.5 h-3.5 text-slate-300" />}
                      label="Matrix [G]"
                      title="Conductance Matrix [G] Inspector"
                      keytip="X"
                      showKeytip={props.showKeytips}
                      onClick={props.onOpenMatrix}
                    />
                  )}
                </div>
              </RibbonGroup>
            </div>
          )}

          {/* TAB 5: HELP */}
          {activeTab === 'help' && (
            <div className="flex items-center h-full">
              <RibbonGroup title="Documentation & Help">
                <RibbonButton
                  size="large"
                  icon={<HelpCircle className="w-6 h-6 text-blue-400" />}
                  label="User Guide"
                  sublabel="& Theory"
                  keytip="H"
                  showKeytip={props.showKeytips}
                  onClick={props.onOpenHelp || (() => {})}
                />
                <RibbonButton
                  size="large"
                  icon={<Keyboard className="w-6 h-6 text-amber-400" />}
                  label="Shortcuts"
                  sublabel="Quick Map"
                  shortcut="F1"
                  keytip="K"
                  showKeytip={props.showKeytips}
                  onClick={props.onOpenShortcuts || (() => {})}
                />
                <RibbonButton
                  size="large"
                  icon={<Info className="w-6 h-6 text-emerald-400" />}
                  label="About"
                  sublabel="PSCAD v5"
                  keytip="A"
                  showKeytip={props.showKeytips}
                  onClick={props.onOpenHelp || (() => {})}
                />
              </RibbonGroup>
            </div>
          )}
        </div>
      )}

      {/* File Backstage Drawer Overlay */}
      <FileBackstageDrawer
        isOpen={isFileBackstageOpen}
        onClose={() => setIsFileBackstageOpen(false)}
        projectName={props.projectName || 'PSCAD CLONE Project'}
        compCount={props.compCount || 0}
        wireCount={props.wireCount || 0}
        dtMicro={props.dtMicro}
        tMax={props.tMax}
        solverType={props.solverType}
        cdaEnabled={props.cdaEnabled}
        onNew={props.onNew}
        onOpen={props.onOpen}
        onOpenRecent={props.onOpenRecent}
        onSave={props.onSave}
        onSaveAs={props.onSaveAs || props.onSave}
        onOpenGallery={props.onOpenGallery || (() => {})}
        onOpenPscxInterop={props.onOpenPscxInterop}
        onExportJSON={props.onExportJSON || props.onSave}
        onExportPNG={props.onExportPNG || (() => {})}
        onExportCSV={props.onExportCSV || (() => {})}
        onExportComtrade={props.onOpenComtrade}
        onPrint={props.onPrint || (() => window.print())}
      />
    </div>
  );
};

function RibbonTabHeader({
  label,
  tabKey,
  active,
  showKeytip,
  onClick,
  onDoubleClick,
}: {
  label: string;
  tabKey: string;
  active: boolean;
  showKeytip?: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={`px-3 py-1 rounded-t text-xs font-semibold transition-all cursor-pointer select-none ${
          active
            ? 'bg-[#141924] text-white border-t-2 border-t-[#1f6feb] border-x border-[#212c3f] shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2233]'
        }`}
      >
        {label}
      </button>

      {showKeytip && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow border border-black/50 pointer-events-none">
          {tabKey}
        </div>
      )}
    </div>
  );
}
