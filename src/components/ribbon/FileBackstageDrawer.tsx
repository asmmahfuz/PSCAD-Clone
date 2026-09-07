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
  Sparkles,
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
  theme?: string;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent?: () => void;
  onOpenStartPage?: () => void;
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
  theme,
  onNew,
  onOpen,
  onOpenRecent,
  onOpenStartPage,
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

  const isLight = theme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

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
    <div
      className={`fixed top-8 inset-x-0 bottom-0 z-50 flex animate-in fade-in duration-150 select-none font-sans ${
        isLight
          ? 'bg-slate-900/40 backdrop-blur-sm text-slate-800'
          : 'bg-[#0c1018]/95 backdrop-blur-md text-slate-200'
      }`}
    >
      {/* Left Backstage Navigation Pane */}
      <div
        className={`w-64 flex flex-col justify-between p-3 shrink-0 overflow-y-auto ${
          isLight
            ? 'bg-slate-50 border-r border-slate-200 shadow-sm'
            : 'bg-[#121724] border-r border-[#202c42]'
        }`}
      >
        <div>
          {/* Back Button */}
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-2 w-full rounded font-semibold text-xs transition-colors mb-4 border cursor-pointer shadow-sm ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
                : 'bg-[#1c2438] hover:bg-[#25324d] text-slate-100 hover:text-white border-[#2b3a56]'
            }`}
          >
            <ArrowLeft className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <span>Back to Schematic</span>
            <span className={`text-[10px] font-mono ml-auto ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Esc</span>
          </button>

          {/* Navigation Section Items */}
          <div className="space-y-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('info')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors cursor-pointer ${
                activeSection === 'info'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : isLight
                  ? 'hover:bg-slate-200/80 text-slate-700'
                  : 'hover:bg-[#1a2233] text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Project Info</span>
            </button>

            <div className={`h-px my-2 ${isLight ? 'bg-slate-200' : 'bg-[#202c42]'}`} />

            <button
              type="button"
              onClick={() => handleAction(() => onOpenStartPage?.())}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Start Page</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onNew)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>New Project</span>
              </div>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+N</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpen)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Open Project...</span>
              </div>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+O</span>
            </button>

            {onOpenRecent && (
              <button
                type="button"
                onClick={() => handleAction(onOpenRecent)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                  isLight
                    ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                    : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-purple-500" />
                  <span>Recent Projects Hub...</span>
                </div>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+Shift+O</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction(onSave)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Save className="w-4 h-4 text-emerald-500" />
                <span>Save Project</span>
              </div>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+S</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onSaveAs)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Save className="w-4 h-4 text-emerald-500" />
                <span>Save Project As...</span>
              </div>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+Shift+S</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpenGallery)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Benchmark Case Studies...</span>
            </button>

            <div className={`h-px my-2 ${isLight ? 'bg-slate-200' : 'bg-[#202c42]'}`} />

            {onOpenPscxInterop && (
              <button
                type="button"
                onClick={() => handleAction(onOpenPscxInterop)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                  isLight
                    ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                    : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
                }`}
              >
                <FileCode className="w-4 h-4 text-sky-500" />
                <span>PSCAD Interop (.pscx XML)...</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('export')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors cursor-pointer ${
                activeSection === 'export'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : isLight
                  ? 'hover:bg-slate-200/80 text-slate-700'
                  : 'hover:bg-[#1a2233] text-slate-300'
              }`}
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>Export & Records</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onPrint)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                  : 'hover:bg-[#1a2233] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>Print Schematic...</span>
              </div>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Ctrl+P</span>
            </button>
          </div>
        </div>

        {/* Footer Brand Info */}
        <div
          className={`p-2 rounded text-[11px] ${
            isLight
              ? 'bg-white border border-slate-200 text-slate-600 shadow-sm'
              : 'bg-[#0d121c] border border-[#1e273a] text-slate-400'
          }`}
        >
          <div className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <span>PSCAD CLONE v5.1</span>
          </div>
          <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>EMTDC Engineering Suite</p>
        </div>
      </div>

      {/* Right Content View Pane */}
      <div className={`flex-1 p-8 overflow-y-auto ${isLight ? 'bg-white text-slate-800' : ''}`}>
        {activeSection === 'info' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className={`text-2xl font-bold flex items-center gap-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span className={isLight ? 'text-blue-600' : 'text-blue-400'}>⚡</span>
                <span>{projectName}</span>
              </h1>
              <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {currentFilePath ? `Saved location: ${currentFilePath}` : 'Unsaved in-memory session (ready to save)'}
              </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-lg ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d]'
                }`}
              >
                <div className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Circuit Topology</div>
                <div className={`text-xl font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {compCount} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Components</span>
                </div>
                <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{wireCount} Interconnect Wires</div>
              </div>

              <div
                className={`p-4 rounded-lg ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d]'
                }`}
              >
                <div className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Numerical Step Size</div>
                <div className={`text-xl font-bold mt-1 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>
                  {dtMicro} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>µs</span>
                </div>
                <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Duration Tmax: {tMax} s</div>
              </div>

              <div
                className={`p-4 rounded-lg ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d]'
                }`}
              >
                <div className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Simulation Kernel</div>
                <div className={`text-xl font-bold mt-1 uppercase ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                  {solverType} LU
                </div>
                <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  CDA Chatter Suppression: {cdaEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div
              className={`p-5 rounded-lg space-y-3 ${
                isLight
                  ? 'bg-slate-50 border border-slate-200 shadow-sm'
                  : 'bg-[#141b2b] border border-[#23314d]'
              }`}
            >
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Project Operations</h2>
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                      : 'bg-[#202b40] hover:bg-[#2c3b57] text-slate-200 border border-[#304160]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Save Copy As...</span>
                </button>

                {onOpenPscxInterop && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenPscxInterop)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                        : 'bg-[#202b40] hover:bg-[#2c3b57] text-slate-200 border border-[#304160]'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-500" />
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
              <h1 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Export & Engineering Records</h1>
              <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Save simulation results, vector schematics, or industry-standard COMTRADE records to disk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => handleAction(onExportJSON)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d] hover:border-blue-500/60 hover:bg-[#182136]'
                }`}
              >
                <div className={`flex items-center gap-2.5 font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Export Project Schema (JSON)</span>
                </div>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Complete portable JSON representation of components, parameters, and netlist wiring.
                </p>
              </div>

              {onExportComtrade && (
                <div
                  onClick={() => handleAction(onExportComtrade)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isLight
                      ? 'bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-sm'
                      : 'bg-[#141b2b] border border-[#23314d] hover:border-emerald-500/60 hover:bg-[#182136]'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                    <span>COMTRADE IEEE C37.111 Record</span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Industry standard `.cfg` and `.dat` files for relay test sets and digital fault recorders.
                  </p>
                </div>
              )}

              <div
                onClick={() => handleAction(onExportCSV)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d] hover:border-cyan-500/60 hover:bg-[#182136]'
                }`}
              >
                <div className={`flex items-center gap-2.5 font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span>Simulation Waveforms (CSV)</span>
                </div>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Raw numerical time-series arrays for MATLAB, Python NumPy, or Excel analysis.
                </p>
              </div>

              <div
                onClick={() => handleAction(onExportPNG)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isLight
                    ? 'bg-slate-50 border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 shadow-sm'
                    : 'bg-[#141b2b] border border-[#23314d] hover:border-purple-500/60 hover:bg-[#182136]'
                }`}
              >
                <div className={`flex items-center gap-2.5 font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Schematic Vector Print (PNG)</span>
                </div>
                <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
