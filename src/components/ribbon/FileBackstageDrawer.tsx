import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  History,
  Save,
  Download,
  Printer,
  Layers,
  FileCode,
  HardDrive,
  Zap,
  Activity,
} from 'lucide-react';
import { nativeFileSystem } from '../../services/nativeFileSystem';

interface FileBackstageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  compCount: number;
  wireCount: number;
  dtMicro: number;
  tMax: number;
  solverType: string;
  cdaEnabled: boolean;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenGallery: () => void;
  onOpenPscxInterop?: () => void;
  onExportJSON: () => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
  onExportComtrade?: () => void;
  onPrint: () => void;
}

export const FileBackstageDrawer: React.FC<FileBackstageDrawerProps> = ({
  isOpen,
  onClose,
  projectName,
  compCount,
  wireCount,
  dtMicro,
  tMax,
  solverType,
  cdaEnabled,
  onNew,
  onOpen,
  onOpenRecent,
  onSave,
  onSaveAs,
  onOpenGallery,
  onOpenPscxInterop,
  onExportJSON,
  onExportPNG,
  onExportCSV,
  onExportComtrade,
  onPrint,
}) => {
  const [activeSection, setActiveSection] = useState<'info' | 'export'>('info');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentFilePath = nativeFileSystem.getCurrentFilePath();

  const handleAction = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0c1018]/95 backdrop-blur-md animate-in fade-in duration-150 select-none font-sans text-slate-200">
      {/* Left Backstage Navigation Pane (Office Blue/Dark themed) */}
      <div className="w-64 bg-[#121724] border-r border-[#202c42] flex flex-col justify-between p-3 shrink-0">
        <div>
          {/* Back Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 w-full rounded bg-[#1c2438] hover:bg-[#25324d] text-slate-100 hover:text-white font-semibold text-xs transition-colors mb-4 border border-[#2b3a56] cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Back to Schematic</span>
            <span className="text-[10px] text-slate-400 font-mono ml-auto">Esc</span>
          </button>

          {/* Navigation Section Items */}
          <div className="space-y-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('info')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors cursor-pointer ${
                activeSection === 'info'
                  ? 'bg-[#1f6feb] text-white font-bold shadow'
                  : 'hover:bg-[#1a2233] text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Project Info</span>
            </button>

            <div className="h-px bg-[#202c42] my-2" />

            <button
              type="button"
              onClick={() => handleAction(onNew)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>New Project</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+N</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Open Project...</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+O</span>
            </button>

            {onOpenRecent && (
              <button
                type="button"
                onClick={() => handleAction(onOpenRecent)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Recent Projects Hub...</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+O</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction(onSave)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Project</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+S</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onSaveAs)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Project As...</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+S</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpenGallery)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Benchmark Case Studies...</span>
            </button>

            <div className="h-px bg-[#202c42] my-2" />

            {onOpenPscxInterop && (
              <button
                type="button"
                onClick={() => handleAction(onOpenPscxInterop)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>PSCAD Interop (.pscx XML)...</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('export')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors cursor-pointer ${
                activeSection === 'export'
                  ? 'bg-[#1f6feb] text-white font-bold shadow'
                  : 'hover:bg-[#1a2233] text-slate-300'
              }`}
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export & Records</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onPrint)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-[#1a2233] text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Schematic...</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+P</span>
            </button>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div className="p-2 rounded bg-[#0d121c] border border-[#1e273a] text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>PSCAD CLONE v5.1</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">EMTDC Engineering Suite</p>
        </div>
      </div>

      {/* Right Content View Pane */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeSection === 'info' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <span className="text-blue-400">⚡</span>
                <span>{projectName}</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {currentFilePath ? `Saved location: ${currentFilePath}` : 'Unsaved in-memory session (ready to save)'}
              </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d]">
                <div className="text-xs text-slate-400 font-medium">Circuit Topology</div>
                <div className="text-xl font-bold text-white mt-1">
                  {compCount} <span className="text-xs font-normal text-slate-400">Components</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{wireCount} Interconnect Wires</div>
              </div>

              <div className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d]">
                <div className="text-xs text-slate-400 font-medium">Numerical Step Size</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {dtMicro} <span className="text-xs font-normal text-slate-400">µs</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Duration Tmax: {tMax} s</div>
              </div>

              <div className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d]">
                <div className="text-xs text-slate-400 font-medium">Simulation Kernel</div>
                <div className="text-xl font-bold text-purple-400 mt-1 uppercase">
                  {solverType} LU
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  CDA Chatter Suppression: {cdaEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-5 rounded-lg bg-[#141b2b] border border-[#23314d] space-y-3">
              <h2 className="text-sm font-bold text-white">Project Operations</h2>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAction(onSave)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(onSaveAs)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#202b40] hover:bg-[#2c3b57] text-slate-200 text-xs font-semibold border border-[#304160] transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Copy As...</span>
                </button>

                {onOpenPscxInterop && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenPscxInterop)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#202b40] hover:bg-[#2c3b57] text-slate-200 text-xs font-semibold border border-[#304160] transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Official PSCAD .pscx XML Studio</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'export' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Export & Engineering Records</h1>
              <p className="text-sm text-slate-400 mt-1">
                Save simulation results, vector schematics, or industry-standard COMTRADE records to disk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => handleAction(onExportJSON)}
                className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d] hover:border-blue-500/60 cursor-pointer transition-all hover:bg-[#182136]"
              >
                <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Export Project Schema (JSON)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Complete portable JSON representation of components, parameters, and netlist wiring.
                </p>
              </div>

              {onExportComtrade && (
                <div
                  onClick={() => handleAction(onExportComtrade)}
                  className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d] hover:border-emerald-500/60 cursor-pointer transition-all hover:bg-[#182136]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>COMTRADE IEEE C37.111 Record</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Industry standard `.cfg` and `.dat` files for relay test sets and digital fault recorders.
                  </p>
                </div>
              )}

              <div
                onClick={() => handleAction(onExportCSV)}
                className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d] hover:border-cyan-500/60 cursor-pointer transition-all hover:bg-[#182136]"
              >
                <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Simulation Waveforms (CSV)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Raw numerical time-series arrays for MATLAB, Python NumPy, or Excel analysis.
                </p>
              </div>

              <div
                onClick={() => handleAction(onExportPNG)}
                className="p-4 rounded-lg bg-[#141b2b] border border-[#23314d] hover:border-purple-500/60 cursor-pointer transition-all hover:bg-[#182136]"
              >
                <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Schematic Vector Print (PNG)</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  High-resolution raster snapshot of the current schematic canvas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
