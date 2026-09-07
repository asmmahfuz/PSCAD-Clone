import React, { useState, useEffect } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Pin,
  PinOff,
  Maximize,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Layers,
} from 'lucide-react';
import { tauriBridge } from '../../services/tauriBridge';
import { sessionManager } from '../../services/sessionManager';
import { nativeFileSystem } from '../../services/nativeFileSystem';
import { QuickAccessToolbar } from '../ribbon/QuickAccessToolbar';

export interface DesktopTitleBarProps {
  projectName: string;
  activeSheetName: string;
  isSimRunning: boolean;
  isSimPaused?: boolean;
  onOpenRecentProjects: () => void;
  onOpenStartPage?: () => void;
  // QAT Actions
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onStop: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSnapshot: () => void;
  onZoomFit: () => void;
  showKeytips?: boolean;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  projectName,
  activeSheetName,
  isSimRunning,
  isSimPaused = false,
  onOpenRecentProjects,
  onOpenStartPage,
  onSave,
  onUndo,
  onRedo,
  onRun,
  onStep,
  onPause,
  onStop,
  onNew,
  onOpen,
  onSnapshot,
  onZoomFit,
  showKeytips = false,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(false);

  useEffect(() => {
    setIsTauriEnv(tauriBridge.isTauri());

    const unsubDirty = sessionManager.onDirtyChange((dirty) => {
      setIsDirty(dirty);
    });

    const unsubAutoSave = sessionManager.onAutoSave((time) => {
      setLastAutoSaveTime(time);
      setIsDirty(false);
    });

    const checkMax = async () => {
      try {
        const max = await tauriBridge.getWindowControls().isMaximized();
        setIsMaximized(max);
      } catch (e) {}
    };
    checkMax();

    const handleResize = () => checkMax();
    window.addEventListener('resize', handleResize);

    return () => {
      unsubDirty();
      unsubAutoSave();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const windowControls = tauriBridge.getWindowControls();

  const handleMinimize = async () => {
    await windowControls.minimize();
  };

  const handleToggleMaximize = async () => {
    await windowControls.toggleMaximize();
    const max = await windowControls.isMaximized();
    setIsMaximized(max);
  };

  const handleClose = async () => {
    await windowControls.close();
  };

  const handleToggleAlwaysOnTop = async () => {
    const next = !isAlwaysOnTop;
    setIsAlwaysOnTop(next);
    await windowControls.setAlwaysOnTop(next);
  };

  const handleToggleFullscreen = async () => {
    await windowControls.setFullscreen(true);
  };

  const currentFilePath = nativeFileSystem.getCurrentFilePath();

  return (
    <header
      className="h-8 bg-[#10141e]/95 backdrop-blur-md border-b border-[#212c3f] flex items-center justify-between px-2 select-none shrink-0 z-50 text-xs font-sans"
    >
      {/* Left: App Branding & Quick Access Toolbar (QAT) */}
      <div className="flex items-center gap-2 min-w-0">
        <div 
          className="flex items-center gap-1 cursor-pointer pr-1" 
          onClick={(e) => { e.stopPropagation(); if (onOpenStartPage) onOpenStartPage(); else onOpenRecentProjects(); }}
          title="Open PSCAD Start Page"
        >
          <span className="text-sm">⚡</span>
          <span className="font-extrabold text-[11px] tracking-wider bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
            PSCAD
          </span>
        </div>

        <div className="h-3.5 w-px bg-[#26334a]" />

        {/* Quick Access Toolbar (QAT) */}
        <QuickAccessToolbar
          onSave={onSave}
          onUndo={onUndo}
          onRedo={onRedo}
          onRun={onRun}
          onStep={onStep}
          onPause={onPause}
          onStop={onStop}
          onNew={onNew}
          onOpen={onOpen}
          onSnapshot={onSnapshot}
          onZoomFit={onZoomFit}
          isRunning={isSimRunning}
          isPaused={isSimPaused}
          showKeytips={showKeytips}
        />

        <div className="h-3.5 w-px bg-[#26334a]" />

        {/* Project & Sheet Identity Breadcrumbs */}
        <div
          onClick={(e) => { e.stopPropagation(); onOpenRecentProjects(); }}
          title={currentFilePath ? `File: ${currentFilePath}` : 'In-memory project. Click to open Project Hub'}
          className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161e2c]/80 hover:bg-[#1d273a] border border-[#26344a] text-slate-300 hover:text-white cursor-pointer transition-all max-w-[340px] truncate"
        >
          <HardDrive className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="font-medium truncate">{projectName}</span>
          {isDirty && (
            <span className="text-amber-400 font-bold" title="Unsaved changes">
              *
            </span>
          )}
          <span className="text-slate-500 font-mono text-[10px]">&gt;</span>
          <span className="text-slate-400 text-[10.5px] truncate flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-slate-500" />
            {activeSheetName || 'Main Schematic'}
          </span>
        </div>

        {/* Simulation Status Badge */}
        {isSimRunning ? (
          <span className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE RUN
          </span>
        ) : isSimPaused ? (
          <span className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9.5px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            PAUSED
          </span>
        ) : (
          <span className="hidden md:inline-block px-1.5 py-0.5 rounded bg-[#182130] text-slate-400 text-[9.5px] font-medium border border-[#243044]">
            CAD READY
          </span>
        )}

        {/* Auto-Save indicator */}
        <div
          title={lastAutoSaveTime ? `Last auto-saved at ${new Date(lastAutoSaveTime).toLocaleTimeString()}` : 'Auto-save ready'}
          className="hidden xl:flex items-center gap-1 text-[10px] text-slate-400"
        >
          {isDirty ? (
            <span className="flex items-center gap-1 text-amber-400/80">
              <AlertCircle className="w-2.5 h-2.5" />
              Modified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Auto-Saved
            </span>
          )}
        </div>
      </div>

      {/* Middle: Drag Region Spacer (Window Drag & Double-Click Maximize) */}
      <div 
        className="flex-1 h-full mx-2 cursor-default" 
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
      />

      {/* Right: Window Controls */}
      <div className="flex items-center gap-0.5 z-10 shrink-0">
        {/* Environment Tag */}
        <span className="hidden lg:inline-block px-1.5 py-0.5 rounded text-[8.5px] font-mono font-semibold bg-[#161d2b] text-slate-400 border border-[#273448] mr-1">
          {isTauriEnv ? 'TAURI 2.0 NATIVE' : 'DEV BROWSER'}
        </span>

        {/* Pin / Always-On-Top */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleAlwaysOnTop(); }}
          title={isAlwaysOnTop ? 'Unpin window' : 'Keep window always on top'}
          aria-label="Toggle always on top"
          className={`p-1.5 rounded hover:bg-[#202b3e] transition-colors cursor-pointer ${
            isAlwaysOnTop ? 'text-blue-400 bg-[#1a2436]' : 'text-slate-400 hover:text-white'
          }`}
        >
          {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
          title="Toggle Fullscreen Mode"
          aria-label="Toggle Fullscreen"
          className="p-1.5 rounded hover:bg-[#202b3e] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        {/* Minimize */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
          title="Minimize Window"
          aria-label="Minimize Window"
          className="p-1.5 rounded hover:bg-[#202b3e] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleMaximize(); }}
          title={isMaximized ? 'Restore Window' : 'Maximize Window'}
          aria-label="Maximize or Restore Window"
          className="p-1.5 rounded hover:bg-[#202b3e] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          title="Close PSCAD CLONE"
          aria-label="Close Application"
          className="p-1.5 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors ml-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
