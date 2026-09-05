import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Printer,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  RotateCw,
  AlignLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Moon,
  Sun,
  Play,
  Pause,
  Square,
  StepForward,
  Cpu,
  Camera,
  BarChart2,
  Compass,
  HelpCircle,
  Layers,
  Sparkles,
  HardDrive,
  TrendingUp,
  History,
  Shield,
  Server,
  Radio,
  Box,
  Zap,
} from 'lucide-react';
import type { ThemeType } from '../../types';
import { COMPONENT_TYPES } from '../../constants';

interface MenuBarProps {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onRotate: (deg: number) => void;
  onAlign: (type: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onToggleGrid: () => void;
  onCompile: () => void;
  onStartSim: () => void;
  onPauseSim: () => void;
  onStopSim: () => void;
  onStepSim: () => void;
  onAddComp: (type: string) => void;
  onOpenFFT: () => void;
  onOpenPhasor: () => void;
  onOpenMatrix: () => void;
  onOpenSnapshot: () => void;
  onOpenGallery: () => void;
  onOpenLCP?: () => void;
  onOpenShortcuts: () => void;
  onOpenHelp: () => void;
  onOpenWorkshop?: () => void;
  onToggleTitleBlock?: () => void;
  onOpenFrequencyScan?: () => void;
  onOpenComtrade?: () => void;
  onOpenMultiRun?: () => void;
  onOpenProtectionStudio?: () => void;
  onOpenCableConstants?: () => void;
  onOpenPscxInterop?: () => void;
  onOpenMagneticsSubstation?: () => void;
  // Phase 15 props
  onOpenAutomationServer?: () => void;
  onOpenPmuStreamer?: () => void;
  onOpenFmiCoSim?: () => void;
}



export const OfficeMenuBar: React.FC<MenuBarProps> = (props) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId);
  };

  const handleMenuHover = (menuId: string) => {
    if (activeMenu) {
      setActiveMenu(menuId);
    }
  };

  const runAndClose = (fn: () => void) => {
    setActiveMenu(null);
    fn();
  };

  return (
    <div
      ref={menuBarRef}
      className="h-7 bg-[#141924] dark:bg-[#141924] border-b border-[#212c3f] flex items-center px-1 select-none text-xs font-sans z-40"
    >
      {/* 1. File Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'file' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('file')}
          onMouseEnter={() => handleMenuHover('file')}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="absolute top-full left-0 min-w-[230px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <MenuItem
              icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
              label="New Project"
              shortcut="Ctrl+N"
              onClick={() => runAndClose(props.onNew)}
            />
            <MenuItem
              icon={<FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
              label="Open Project..."
              shortcut="Ctrl+O"
              onClick={() => runAndClose(props.onOpen)}
            />
            {props.onOpenRecent && (
              <MenuItem
                icon={<History className="w-3.5 h-3.5 text-purple-400" />}
                label="Recent Projects Hub..."
                shortcut="Ctrl+Shift+O"
                onClick={() => runAndClose(props.onOpenRecent!)}
              />
            )}
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Save className="w-3.5 h-3.5 text-emerald-400" />}
              label="Save Project"
              shortcut="Ctrl+S"
              onClick={() => runAndClose(props.onSave)}
            />
            <MenuItem
              label="Save Project As..."
              shortcut="Ctrl+Shift+S"
              onClick={() => runAndClose(props.onSaveAs)}
            />
            <MenuItem
              icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
              label="Benchmark Case Studies..."
              onClick={() => runAndClose(props.onOpenGallery)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            {props.onOpenPscxInterop && (
              <MenuItem
                icon={<FileText className="w-3.5 h-3.5 text-sky-400" />}
                label="PSCAD Interop (.pscx XML)..."
                onClick={() => runAndClose(props.onOpenPscxInterop!)}
              />
            )}
            <MenuItem
              icon={<Download className="w-3.5 h-3.5 text-slate-400" />}
              label="Export Project (JSON)"
              onClick={() => runAndClose(props.onExportJSON)}
            />
            {props.onOpenComtrade && (
              <MenuItem
                icon={<HardDrive className="w-3.5 h-3.5 text-emerald-400" />}
                label="Export COMTRADE (IEEE C37.111)..."
                onClick={() => runAndClose(props.onOpenComtrade!)}
              />
            )}
            <MenuItem
              label="Export Simulation Data (CSV)"
              onClick={() => runAndClose(props.onExportCSV)}
            />
            <MenuItem
              label="Export Schematic Image (PNG)"
              onClick={() => runAndClose(props.onExportPNG)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Printer className="w-3.5 h-3.5 text-slate-400" />}
              label="Print Schematic..."
              shortcut="Ctrl+P"
              onClick={() => runAndClose(props.onPrint)}
            />
          </div>
        )}
      </div>

      {/* 2. Edit Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'edit' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('edit')}
          onMouseEnter={() => handleMenuHover('edit')}
        >
          Edit
        </button>
        {activeMenu === 'edit' && (
          <div className="absolute top-full left-0 min-w-[220px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <MenuItem
              icon={<Undo2 className="w-3.5 h-3.5" />}
              label="Undo"
              shortcut="Ctrl+Z"
              onClick={() => runAndClose(props.onUndo)}
            />
            <MenuItem
              icon={<Redo2 className="w-3.5 h-3.5" />}
              label="Redo"
              shortcut="Ctrl+Y"
              onClick={() => runAndClose(props.onRedo)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Scissors className="w-3.5 h-3.5" />}
              label="Cut"
              shortcut="Ctrl+X"
              onClick={() => runAndClose(props.onCut)}
            />
            <MenuItem
              icon={<Copy className="w-3.5 h-3.5" />}
              label="Copy"
              shortcut="Ctrl+C"
              onClick={() => runAndClose(props.onCopy)}
            />
            <MenuItem
              icon={<ClipboardPaste className="w-3.5 h-3.5" />}
              label="Paste"
              shortcut="Ctrl+V"
              onClick={() => runAndClose(props.onPaste)}
            />
            <MenuItem
              icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
              label="Delete Selection"
              shortcut="Del"
              onClick={() => runAndClose(props.onDelete)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<RotateCw className="w-3.5 h-3.5" />}
              label="Rotate 90° CW"
              shortcut="R"
              onClick={() => runAndClose(() => props.onRotate(90))}
            />
            <MenuItem
              label="Select All"
              shortcut="Ctrl+A"
              onClick={() => runAndClose(props.onSelectAll)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<AlignLeft className="w-3.5 h-3.5" />}
              label="Align Left"
              onClick={() => runAndClose(() => props.onAlign('left'))}
            />
            <MenuItem
              label="Align Top"
              onClick={() => runAndClose(() => props.onAlign('top'))}
            />
          </div>
        )}
      </div>

      {/* 3. View Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'view' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('view')}
          onMouseEnter={() => handleMenuHover('view')}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="absolute top-full left-0 min-w-[220px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <MenuItem
              icon={<ZoomIn className="w-3.5 h-3.5" />}
              label="Zoom In"
              shortcut="Ctrl++"
              onClick={() => runAndClose(props.onZoomIn)}
            />
            <MenuItem
              icon={<ZoomOut className="w-3.5 h-3.5" />}
              label="Zoom Out"
              shortcut="Ctrl+-"
              onClick={() => runAndClose(props.onZoomOut)}
            />
            <MenuItem
              icon={<Maximize2 className="w-3.5 h-3.5" />}
              label="Zoom to Fit"
              shortcut="Ctrl+0"
              onClick={() => runAndClose(props.onZoomFit)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Grid className="w-3.5 h-3.5" />}
              label="Toggle Grid"
              onClick={() => runAndClose(props.onToggleGrid)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Moon className="w-3.5 h-3.5" />}
              label={`PSCAD CLONE Dark ${props.theme === 'dark' ? '✓' : ''}`}
              onClick={() => runAndClose(() => props.setTheme('dark'))}
            />
            <MenuItem
              icon={<Sun className="w-3.5 h-3.5" />}
              label={`PSCAD Classic Light ${props.theme === 'light' ? '✓' : ''}`}
              onClick={() => runAndClose(() => props.setTheme('light'))}
            />
            <MenuItem
              label={`Engineering Blueprint ${props.theme === 'blueprint' ? '✓' : ''}`}
              onClick={() => runAndClose(() => props.setTheme('blueprint'))}
            />
          </div>
        )}
      </div>

      {/* 4. Components Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'components' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('components')}
          onMouseEnter={() => handleMenuHover('components')}
        >
          Components
        </button>
        {activeMenu === 'components' && (
          <div className="absolute top-full left-0 min-w-[240px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Passive Elements
            </div>
            <MenuItem label="Ground (0V Reference)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.GROUND))} />
            <MenuItem label="Resistor (R)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.RESISTOR))} />
            <MenuItem label="Inductor (L)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.INDUCTOR))} />
            <MenuItem label="Capacitor (C)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.CAPACITOR))} />
            <MenuItem label="Series RLC Branch" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.SERIES_RLC))} />
            <div className="h-px bg-[#26334a] my-1" />
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sources & Lines
            </div>
            <MenuItem label="AC Voltage Source (1-Ph)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.AC_SOURCE_1PH))} />
            <MenuItem label="3-Phase AC Source" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.AC_SOURCE_3PH))} />
            <MenuItem label="DC Voltage Source" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.DC_SOURCE))} />
            <MenuItem label="Pi Transmission Line" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.PI_LINE))} />
            <MenuItem label="Transformer (2-Winding)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.TRANSFORMER_1PH))} />
            <div className="h-px bg-[#26334a] my-1" />
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Breakers & Meters
            </div>
            <MenuItem label="Circuit Breaker (1-Ph)" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.BREAKER_1PH))} />
            <MenuItem label="3-Phase Breaker" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.BREAKER_3PH))} />
            <MenuItem label="Timed Fault Block" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.FAULT_BLOCK))} />
            <MenuItem label="Voltmeter Probe" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.VOLTMETER))} />
            <MenuItem label="Ammeter Sensor" onClick={() => runAndClose(() => props.onAddComp(COMPONENT_TYPES.AMMETER))} />
          </div>
        )}
      </div>

      {/* 5. Simulation Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'simulation' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('simulation')}
          onMouseEnter={() => handleMenuHover('simulation')}
        >
          Simulation
        </button>
        {activeMenu === 'simulation' && (
          <div className="absolute top-full left-0 min-w-[220px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <MenuItem
              icon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
              label="Run Simulation"
              shortcut="F5"
              onClick={() => runAndClose(props.onStartSim)}
            />
            <MenuItem
              icon={<StepForward className="w-3.5 h-3.5 text-blue-400" />}
              label="Step One Cycle"
              shortcut="F8"
              onClick={() => runAndClose(props.onStepSim)}
            />
            <MenuItem
              icon={<Pause className="w-3.5 h-3.5 text-amber-400" />}
              label="Pause Simulation"
              shortcut="F6"
              onClick={() => runAndClose(props.onPauseSim)}
            />
            <MenuItem
              icon={<Square className="w-3.5 h-3.5 text-red-400" />}
              label="Stop & Reset"
              shortcut="F7"
              onClick={() => runAndClose(props.onStopSim)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
              label="State Snapshots & Hot-Start..."
              shortcut="F9"
              onClick={() => runAndClose(props.onOpenSnapshot)}
            />
            {props.onOpenMultiRun && (
              <MenuItem
                icon={<Layers className="w-3.5 h-3.5 text-amber-400" />}
                label="Parametric Multi-Run Sweep..."
                onClick={() => runAndClose(props.onOpenMultiRun!)}
              />
            )}
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Compile Netlist"
              shortcut="F7 (Stop/Compile)"
              onClick={() => runAndClose(props.onCompile)}
            />
          </div>
        )}
      </div>

      {/* 6. Tools Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'tools' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('tools')}
          onMouseEnter={() => handleMenuHover('tools')}
        >
          Tools
        </button>
        {activeMenu === 'tools' && (
          <div className="absolute top-full left-0 min-w-[250px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            {props.onOpenWorkshop && (
              <MenuItem
                icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                label="Custom Component Workshop & Script Editor..."
                onClick={() => runAndClose(props.onOpenWorkshop!)}
              />
            )}
            {props.onOpenLCP && (
              <MenuItem
                icon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
                label="Overhead Line Constants (LCP) Studio..."
                onClick={() => runAndClose(props.onOpenLCP!)}
              />
            )}
            {props.onOpenCableConstants && (
              <MenuItem
                icon={<Layers className="w-3.5 h-3.5 text-emerald-400" />}
                label="Underground Cable Constants Studio..."
                onClick={() => runAndClose(props.onOpenCableConstants!)}
              />
            )}
            {props.onOpenPscxInterop && (
              <MenuItem
                icon={<FileText className="w-3.5 h-3.5 text-sky-400" />}
                label="PSCAD .pscx Interoperability Studio..."
                onClick={() => runAndClose(props.onOpenPscxInterop!)}
              />
            )}
            {props.onOpenFrequencyScan && (
              <MenuItem
                icon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                label="Harmonic Impedance Scan Z(f)..."
                onClick={() => runAndClose(props.onOpenFrequencyScan!)}
              />
            )}
            {props.onOpenComtrade && (
              <MenuItem
                icon={<HardDrive className="w-3.5 h-3.5 text-emerald-400" />}
                label="COMTRADE File Manager (IEEE C37.111)..."
                onClick={() => runAndClose(props.onOpenComtrade!)}
              />
            )}
            {props.onOpenMultiRun && (
              <MenuItem
                icon={<Layers className="w-3.5 h-3.5 text-amber-400" />}
                label="Automated Parametric Multi-Run..."
                onClick={() => runAndClose(props.onOpenMultiRun!)}
              />
            )}
            {props.onOpenProtectionStudio && (
              <MenuItem
                icon={<Shield className="w-3.5 h-3.5 text-sky-400" />}
                label="Protection Studio & ANSI Relays..."
                onClick={() => runAndClose(props.onOpenProtectionStudio!)}
              />
            )}
            {props.onOpenMagneticsSubstation && (
              <MenuItem
                icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                label="Magnetics & Substation Studio (Hysteresis, OLTC, SFRA)..."
                onClick={() => runAndClose(props.onOpenMagneticsSubstation!)}
              />
            )}
            {props.onOpenAutomationServer && (
              <MenuItem
                icon={<Server className="w-3.5 h-3.5 text-sky-400" />}
                label="Headless Automation CLI & RPC Server..."
                onClick={() => runAndClose(props.onOpenAutomationServer!)}
              />
            )}
            {props.onOpenPmuStreamer && (
              <MenuItem
                icon={<Radio className="w-3.5 h-3.5 text-cyan-400" />}
                label="IEEE C37.118 Synchrophasor PMU Streamer..."
                onClick={() => runAndClose(props.onOpenPmuStreamer!)}
              />
            )}
            {props.onOpenFmiCoSim && (
              <MenuItem
                icon={<Box className="w-3.5 h-3.5 text-amber-400" />}
                label="FMI / FMU 2.0 & 3.0 Co-Simulation Workshop..."
                onClick={() => runAndClose(props.onOpenFmiCoSim!)}
              />
            )}


            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<BarChart2 className="w-3.5 h-3.5 text-cyan-400" />}
              label="FFT Harmonic Analyzer..."
              onClick={() => runAndClose(props.onOpenFFT)}
            />
            <MenuItem
              icon={<Compass className="w-3.5 h-3.5 text-purple-400" />}
              label="3-Phase Phasor Vector Scope..."
              onClick={() => runAndClose(props.onOpenPhasor)}
            />
            <MenuItem
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="Conductance Matrix [G] Inspector..."
              onClick={() => runAndClose(props.onOpenMatrix)}
            />
            <MenuItem
              icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
              label="Simulation State Snapshots..."
              onClick={() => runAndClose(props.onOpenSnapshot)}
            />
            <div className="h-px bg-[#26334a] my-1" />
            <MenuItem
              icon={<Layers className="w-3.5 h-3.5" />}
              label="Benchmark Power Systems Gallery..."
              onClick={() => runAndClose(props.onOpenGallery)}
            />
          </div>
        )}
      </div>

      {/* 7. Help Menu */}
      <div className="relative">
        <button
          className={`px-2.5 py-1 rounded hover:bg-[#1f6feb] hover:text-white transition-colors ${
            activeMenu === 'help' ? 'bg-[#1f6feb] text-white' : 'text-slate-300'
          }`}
          onClick={() => handleMenuClick('help')}
          onMouseEnter={() => handleMenuHover('help')}
        >
          Help
        </button>
        {activeMenu === 'help' && (
          <div className="absolute top-full left-0 min-w-[220px] bg-[#141924] border border-[#26334a] rounded shadow-2xl py-1 z-50 text-slate-200">
            <MenuItem
              icon={<HelpCircle className="w-3.5 h-3.5" />}
              label="PSCAD User Guide & Theory..."
              onClick={() => runAndClose(props.onOpenHelp)}
            />
            <MenuItem
              label="Keyboard Shortcuts..."
              shortcut="F1"
              onClick={() => runAndClose(props.onOpenShortcuts)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-3 py-1.5 hover:bg-[#1f6feb] hover:text-white cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="w-4 flex items-center justify-center text-slate-400 group-hover:text-white">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {shortcut && (
        <span className="text-[10px] text-slate-400 font-mono ml-4">{shortcut}</span>
      )}
    </div>
  );
}
