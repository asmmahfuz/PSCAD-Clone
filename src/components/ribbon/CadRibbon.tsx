import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  BarChart2,
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
  HelpCircle,
  Keyboard,
  Info,
  Activity,
  Columns,
  ExternalLink,
  BookmarkCheck,
  PanelRight,
  AppWindow,
  Zap,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FileText,
  Compass,
} from 'lucide-react';
import { sessionManager, type InspectorMode } from '../../services/sessionManager';
import { COMPONENT_TYPES } from '../../constants';
import type { ThemeType } from '../../types';
import type { SolverType } from '../../engine/solver';
import { RibbonGroup } from './RibbonGroup';
import { RibbonButton } from './RibbonButton';
import { FileBackstageDrawer } from './FileBackstageDrawer';
import {
  IconPaste,
  IconCut,
  IconCopy,
  IconDelete,
  IconBuild,
  IconBuildModified,
  IconClean,
  IconRun,
  IconStop,
  IconPause,
  IconSkipRun,
  IconNextStep,
  IconSnapshot,
  IconSaveScenario,
  IconDeleteScenario,
  IconViewScenario,
  IconNavBack,
  IconNavUp,
  IconNavForward,
  IconUndo,
  IconRedo,
  IconSelectPointer,
  IconPanHand,
  IconSearchBinoculars,
  IconWireMode,
  IconZoomIn,
  IconZoomOut,
  IconZoomExtent,
  IconZoomRectangle,
  IconMiniMagnifier,
} from './PscadIcons';

export interface CadRibbonProps {
  toolMode: 'select' | 'wire' | 'pan';
  setToolMode: (m: 'select' | 'wire' | 'pan') => void;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent?: () => void;
  onOpenStartPage?: () => void;
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
  onZoomSet?: (ratio: number) => void;
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
  onBuild?: () => void;
  onBuildModified?: () => void;
  onClean?: () => void;
  onSearch?: () => void;
  activeScenario?: string;
  setActiveScenario?: (s: string) => void;
  onSaveScenario?: () => void;
  onSaveScenarioAsNew?: () => void;
  onDeleteScenario?: () => void;
  onViewScenario?: () => void;
  scenarios?: string[];
  onNavUp?: () => void;
  onNavBack?: () => void;
  onNavForward?: () => void;
  canNavUp?: boolean;
  canNavBack?: boolean;
  canNavForward?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  zoomPercent?: number;
  onZoomRectangle?: () => void;
  onSelectComponentsOnly?: () => void;
  onSelectWiresOnly?: () => void;
  onClearSelection?: () => void;
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
  const [isSaveScenarioDropdownOpen, setIsSaveScenarioDropdownOpen] = useState<boolean>(false);
  const saveScenarioDropdownRef = useRef<HTMLDivElement>(null);
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState<boolean>(false);
  const selectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (saveScenarioDropdownRef.current && !saveScenarioDropdownRef.current.contains(e.target as Node)) {
        setIsSaveScenarioDropdownOpen(false);
      }
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(e.target as Node)) {
        setIsSelectDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
      className={`bg-white dark:bg-[#141924] border-b border-[#cbd5e1] dark:border-[#212c3f] flex flex-col select-none font-sans text-xs shrink-0 z-40 transition-all ${
        isCollapsed && isFlyoutOpen ? 'relative' : ''
      }`}
    >
      {/* 1. Ribbon Tab Headers Navigation Bar */}
      <div className="h-7 bg-[#ebedf0] dark:bg-[#121622] border-b border-[#d8dce2] dark:border-[#1f283b] flex items-center px-1.5 justify-between">
        <div className="flex items-center gap-0.5">
          {/* File Tab (Office Backstage Trigger) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFileBackstageOpen(true)}
              className="cad-file-btn px-3.5 py-1 rounded-t-[3px] bg-[#1a4f9c] hover:bg-[#154180] text-white font-semibold text-[11px] transition-colors cursor-pointer mr-0.5 shadow-2xs flex items-center gap-1"
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
            <div className="hidden md:flex items-center gap-0.5 bg-[#182030] p-0.5 rounded border border-[#263147] mr-1">
              <button
                type="button"
                onClick={() => props.setActiveView!('schematic')}
                title="Schematic Canvas View"
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  props.activeView === 'schematic'
                    ? 'cad-tab-active bg-[#223049] text-sky-200 border border-sky-500/40 shadow-xs'
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
                    ? 'cad-tab-active bg-[#223049] text-sky-200 border border-sky-500/40 shadow-xs'
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
                    ? 'cad-tab-active bg-[#223049] text-sky-200 border border-sky-500/40 shadow-xs'
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
          className={`h-[94px] bg-[#f5f6f8] dark:bg-[#141924] border-b border-[#d8dce2] dark:border-[#212c3f] flex items-center px-1 overflow-visible select-none font-sans z-40 ${
            isCollapsed && isFlyoutOpen
              ? 'absolute top-full left-0 right-0 shadow-2xl bg-[#f5f6f8]/98 dark:bg-[#141924]/98 backdrop-blur-md animate-in slide-in-from-top-1 duration-150'
              : 'relative'
          }`}
        >
          {/* TAB 1: HOME (Authentic PSCAD Ribbon) */}
          {activeTab === 'home' && (
            <div className="flex items-center h-full overflow-visible">
              {/* Group 1: Clipboard */}
              <RibbonGroup title="Clipboard">
                <RibbonButton
                  size="large"
                  icon={<IconPaste size={30} />}
                  label="Paste"
                  shortcut="Ctrl+V"
                  keytip="V"
                  showKeytip={props.showKeytips}
                  onClick={props.onPaste}
                />
                <div className="flex flex-col justify-center">
                  <RibbonButton
                    size="small"
                    icon={<IconCut size={15} />}
                    label="Cut"
                    shortcut="Ctrl+X"
                    keytip="X"
                    showKeytip={props.showKeytips}
                    onClick={props.onCut}
                  />
                  <RibbonButton
                    size="small"
                    icon={<IconCopy size={15} />}
                    label="Copy"
                    shortcut="Ctrl+C"
                    keytip="C"
                    showKeytip={props.showKeytips}
                    onClick={props.onCopy}
                  />
                  {props.onDelete && (
                    <RibbonButton
                      size="small"
                      icon={<IconDelete size={15} />}
                      label="Delete"
                      shortcut="Del"
                      keytip="D"
                      showKeytip={props.showKeytips}
                      onClick={props.onDelete}
                    />
                  )}
                </div>
              </RibbonGroup>

              {/* Group 2: Compile And Run */}
              <RibbonGroup title="Compile And Run">
                <RibbonButton
                  size="large"
                  icon={<IconBuild size={28} />}
                  label="Build"
                  title="Build (Compile Circuit Netlist)"
                  onClick={props.onBuild}
                />
                <RibbonButton
                  size="large"
                  icon={<IconBuildModified size={28} />}
                  label={"Build\nModified"}
                  title="Build Modified Components"
                  onClick={props.onBuildModified || props.onBuild}
                />
                <RibbonButton
                  size="large"
                  icon={<IconClean size={28} />}
                  label="Clean"
                  title="Clean Build Output"
                  onClick={props.onClean}
                />
                <RibbonButton
                  size="large"
                  icon={<IconRun size={28} />}
                  label="Run"
                  hasDropdown={true}
                  shortcut="F5"
                  title="Run EMTDC Simulation (F5)"
                  onClick={props.onStartSim}
                />
                <RibbonButton
                  size="large"
                  icon={<IconStop size={28} />}
                  label="Stop"
                  shortcut="Shift+F5"
                  title="Stop & Reset Simulation (Shift+F5)"
                  onClick={props.onStopSim}
                />
                <RibbonButton
                  size="large"
                  icon={<IconPause size={28} />}
                  label="Pause"
                  shortcut="F6"
                  title="Pause Simulation (F6)"
                  onClick={props.onPauseSim}
                />
                <RibbonButton
                  size="large"
                  icon={<IconSkipRun size={28} />}
                  label={"Skip\nRun"}
                  title="Skip Run"
                  onClick={props.onStartSim}
                />
                <RibbonButton
                  size="large"
                  icon={<IconNextStep size={28} />}
                  label={"Next\nStep"}
                  shortcut="F8"
                  title="Next Step (F8)"
                  onClick={props.onStepSim}
                />
                <RibbonButton
                  size="large"
                  icon={<IconSnapshot size={28} />}
                  label="Snapshot"
                  title="Capture State Snapshot"
                  onClick={props.onTakeSnapshot}
                />

                {/* Plot Step (µs) Combobox */}
                <div className="flex flex-col justify-center ml-1 px-1 select-none">
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-sans mb-1 select-none">
                    Plot Step (µs)
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={props.dtMicro}
                      onChange={(e) => props.setDtMicro(parseFloat(e.target.value) || 50)}
                      className="w-[60px] h-[22px] px-1.5 py-0.5 bg-white dark:bg-[#111622] border border-[#a6b2c0] dark:border-[#334155] rounded-[2px] text-[11px] font-sans text-slate-900 dark:text-slate-100 text-left focus:outline-hidden focus:border-blue-500 shadow-2xs"
                    />
                    <div className="absolute right-1 pointer-events-none text-slate-500">
                      <svg viewBox="0 0 8 5" className="w-1.5 h-1 fill-current">
                        <path d="M0 0l4 4.5 4-4.5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </RibbonGroup>

              {/* Group 3: Scenarios */}
              <RibbonGroup title="Scenarios">
                <div className="relative" ref={saveScenarioDropdownRef}>
                  <RibbonButton
                    size="large"
                    icon={<IconSaveScenario size={28} />}
                    label={"Save\nScenario"}
                    hasDropdown={true}
                    title="Save Current Scenario (Click for options)"
                    onClick={() => setIsSaveScenarioDropdownOpen((prev) => !prev)}
                    onDropdownClick={(e) => {
                      e.stopPropagation();
                      setIsSaveScenarioDropdownOpen((prev) => !prev);
                    }}
                  />
                  {isSaveScenarioDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-white dark:bg-[#181c24] border border-slate-300 dark:border-slate-700 rounded shadow-xl py-1 text-xs select-none animate-in fade-in-50 zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSaveScenarioDropdownOpen(false);
                          props.onSaveScenario?.();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <IconSaveScenario size={16} />
                        <span>Save '{props.activeScenario || 'Base Case'}'</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSaveScenarioDropdownOpen(false);
                          if (props.onSaveScenarioAsNew) {
                            props.onSaveScenarioAsNew();
                          } else {
                            props.onSaveScenario?.();
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-4 text-center font-bold text-blue-600">+</span>
                        <span>Save As New Scenario...</span>
                      </button>
                      <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsSaveScenarioDropdownOpen(false);
                          props.onViewScenario?.();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <IconViewScenario size={16} />
                        <span>Scenario Manager...</span>
                      </button>
                    </div>
                  )}
                </div>

                <RibbonButton
                  size="large"
                  icon={<IconDeleteScenario size={28} />}
                  label={"Delete\nScenario"}
                  title={props.activeScenario === 'Base Case' ? "Base Case is protected and cannot be deleted" : `Delete scenario '${props.activeScenario}'`}
                  disabled={props.activeScenario === 'Base Case'}
                  onClick={props.onDeleteScenario}
                />
                <RibbonButton
                  size="large"
                  icon={<IconViewScenario size={28} />}
                  label={"View\nScenario"}
                  title="Open Scenario Manager & Hierarchy Inspector"
                  onClick={props.onViewScenario}
                />

                {/* Active Scenario Combobox */}
                <div className="flex flex-col justify-center ml-1 px-1 select-none">
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-sans mb-1 select-none">
                    Active Scenario
                  </span>
                  <div className="relative">
                    <select
                      value={props.activeScenario || 'Base Case'}
                      onChange={(e) => props.setActiveScenario?.(e.target.value)}
                      className="h-[22px] w-[96px] appearance-none pl-1.5 pr-5 bg-white dark:bg-[#111622] border border-[#a6b2c0] dark:border-[#334155] rounded-[2px] text-[11px] font-sans text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-hidden focus:border-blue-500 shadow-2xs"
                    >
                      {(props.scenarios && props.scenarios.length > 0
                        ? props.scenarios
                        : ['Base Case', 'Fault Case', 'Peak Load Case', 'Renewables Case']
                      ).map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg viewBox="0 0 8 5" className="w-1.5 h-1 fill-current">
                        <path d="M0 0l4 4.5 4-4.5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </RibbonGroup>

              {/* Group 4: Navigation */}
              <RibbonGroup title="Navigation">
                <RibbonButton
                  size="large"
                  icon={<IconNavBack size={26} />}
                  label="Back"
                  disabled={props.canNavBack === false}
                  title={props.canNavBack === false ? "No previous sheet in navigation history" : "Navigate Back (Previous Sheet)"}
                  onClick={props.onNavBack}
                />
                <RibbonButton
                  size="large"
                  icon={<IconNavUp size={26} />}
                  label="Up"
                  disabled={props.canNavUp === false}
                  title={props.canNavUp === false ? "Already at top root schematic level" : "Navigate Up Hierarchy (Parent Sheet)"}
                  onClick={props.onNavUp}
                />
                <RibbonButton
                  size="large"
                  icon={<IconNavForward size={26} />}
                  label="Forward"
                  disabled={props.canNavForward === false}
                  title={props.canNavForward === false ? "No forward sheet in navigation history" : "Navigate Forward"}
                  onClick={props.onNavForward}
                />
              </RibbonGroup>

              {/* Group 5: Editing */}
              <RibbonGroup title="Editing">
                <RibbonButton
                  size="large"
                  icon={<IconUndo size={26} />}
                  label="Undo"
                  shortcut="Ctrl+Z"
                  disabled={props.canUndo === false}
                  title="Undo Last Action (Ctrl+Z)"
                  onClick={props.onUndo}
                />
                <RibbonButton
                  size="large"
                  icon={<IconRedo size={26} />}
                  label="Redo"
                  shortcut="Ctrl+Y"
                  disabled={props.canRedo === false}
                  title="Redo (Ctrl+Y)"
                  onClick={props.onRedo}
                />
                <div className="flex flex-col justify-center">
                  <div className="relative" ref={selectDropdownRef}>
                    <RibbonButton
                      size="small"
                      icon={<IconSelectPointer size={14} />}
                      label="Select"
                      hasDropdown={true}
                      active={props.toolMode === 'select'}
                      title="Select Pointer Tool (Click arrow for options)"
                      onClick={() => props.setToolMode('select')}
                      onDropdownClick={(e) => {
                        e.stopPropagation();
                        setIsSelectDropdownOpen((prev) => !prev);
                      }}
                    />
                    {isSelectDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 w-48 bg-white dark:bg-[#181c24] border border-slate-300 dark:border-slate-700 rounded shadow-xl py-1 text-xs select-none animate-in fade-in-50 zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectDropdownOpen(false);
                            props.setToolMode('select');
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                        >
                          <IconSelectPointer size={14} />
                          <span>Pointer Tool</span>
                        </button>
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectDropdownOpen(false);
                            props.onSelectAll?.();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>Select All</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectDropdownOpen(false);
                            props.onSelectComponentsOnly?.();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <span>Select Components Only</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectDropdownOpen(false);
                            props.onSelectWiresOnly?.();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <span>Select Wires Only</span>
                        </button>
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectDropdownOpen(false);
                            props.onClearSelection?.();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>Clear Selection</span>
                          <span className="text-[10px] text-slate-400 font-mono">Esc</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <RibbonButton
                    size="small"
                    icon={<IconPanHand size={14} />}
                    label="Pan"
                    active={props.toolMode === 'pan'}
                    title="Pan Canvas Tool (Click & drag to pan canvas)"
                    onClick={() => props.setToolMode(props.toolMode === 'pan' ? 'select' : 'pan')}
                  />
                  <RibbonButton
                    size="small"
                    icon={<IconSearchBinoculars size={14} />}
                    label="Search"
                    shortcut="Ctrl+F"
                    title="Search Components & Signals (Ctrl+F)"
                    onClick={props.onSearch}
                  />
                </div>
              </RibbonGroup>

              {/* Group 6: Wires */}
              <RibbonGroup title="Wires">
                <RibbonButton
                  size="large"
                  variant="primary"
                  active={props.toolMode === 'wire'}
                  icon={<IconWireMode size={30} />}
                  label={"Wire\nMode"}
                  shortcut="W"
                  keytip="W"
                  showKeytip={props.showKeytips}
                  title="Wire Routing Mode (W)"
                  onClick={() => props.setToolMode(props.toolMode === 'wire' ? 'select' : 'wire')}
                />
              </RibbonGroup>

              {/* Group 7: Zoom */}
              <RibbonGroup title="Zoom">
                <RibbonButton
                  size="large"
                  icon={<IconZoomIn size={28} />}
                  label={"Zoom\nIn"}
                  title="Zoom In (Canvas)"
                  onClick={props.onZoomIn}
                />
                <RibbonButton
                  size="large"
                  icon={<IconZoomOut size={28} />}
                  label={"Zoom\nOut"}
                  title="Zoom Out (Canvas)"
                  onClick={props.onZoomOut}
                />
                <div className="flex flex-col justify-center">
                  {/* Zoom Percentage Dropdown */}
                  <div className="flex items-center gap-1 px-1.5 h-[21px]">
                    <IconMiniMagnifier size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
                    <div className="relative">
                      <select
                        value={props.zoomPercent ? `${props.zoomPercent}%` : '100%'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Fit') {
                            props.onZoomFit();
                          } else {
                            const ratio = parseFloat(val) / 100;
                            if (ratio && props.onZoomSet) {
                              props.onZoomSet(ratio);
                            } else {
                              props.onZoomFit();
                            }
                          }
                        }}
                        className="h-[19px] w-[58px] appearance-none pl-1 pr-4 bg-white dark:bg-[#111622] border border-[#a6b2c0] dark:border-[#334155] rounded-[2px] text-[10.5px] font-sans text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
                      >
                        {props.zoomPercent && ![50, 75, 100, 125, 150, 200].includes(props.zoomPercent) && (
                          <option value={`${props.zoomPercent}%`}>{props.zoomPercent}%</option>
                        )}
                        <option value="50%">50%</option>
                        <option value="75%">75%</option>
                        <option value="100%">100%</option>
                        <option value="125%">125%</option>
                        <option value="150%">150%</option>
                        <option value="200%">200%</option>
                        <option value="Fit">Fit</option>
                      </select>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg viewBox="0 0 8 5" className="w-1.5 h-1 fill-current">
                          <path d="M0 0l4 4.5 4-4.5z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <RibbonButton
                    size="small"
                    icon={<IconZoomExtent size={14} />}
                    label="Zoom Extent"
                    title="Zoom to Extent (Fit All Components)"
                    onClick={props.onZoomFit}
                  />
                  <RibbonButton
                    size="small"
                    icon={<IconZoomRectangle size={14} />}
                    label="Zoom Rectangle"
                    title="Zoom to Selected Rectangle Area or Zoom In"
                    onClick={props.onZoomRectangle || (() => {
                      window.dispatchEvent(new CustomEvent('pscad:canvas-zoom', { detail: { action: 'rectangle' } }));
                    })}
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
        theme={props.theme}
        onNew={props.onNew}
        onOpen={props.onOpen}
        onOpenRecent={props.onOpenRecent}
        onOpenStartPage={props.onOpenStartPage}
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
        className={`px-3 py-1 rounded-t-[3px] text-[11px] font-medium transition-colors cursor-pointer select-none border-t border-x ${
          active
            ? 'bg-[#f5f6f8] dark:bg-[#141924] text-slate-900 dark:text-white border-[#d8dce2] dark:border-[#212c3f] font-semibold -mb-px z-10'
            : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-[#e4e7ec] dark:hover:bg-[#1a2233] border-transparent'
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
