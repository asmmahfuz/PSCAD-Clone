/**
 * PSCAD CLONE - Standalone Detached Oscilloscope Multi-Monitor Window
 * Phase 20 - Step 20.1: Native Pop-Out Detachable Window Architecture
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Maximize2,
  Minimize2,
  ArrowDownLeft,
  Sun,
  Moon,
  Shield,
  MonitorCheck,
  BookmarkCheck,
} from 'lucide-react';
import { OscilloscopeView } from './OscilloscopeView';
import {
  telemetryStreamer,
  type TelemetryPayload,
  type CursorSyncPayload,
  type StreamingMetrics,
} from '../../services/telemetryStreamer';
import {
  sessionManager,
  type ScopeWindowLayout,
  type MultiMonitorInfo,
} from '../../services/sessionManager';
import { simulationEngine } from '../../engine/solver';
import { tauriBridge } from '../../services/tauriBridge';
import type { ThemeType, SimulationState } from '../../types';

export interface DetachedScopeWindowProps {
  initialTheme?: ThemeType;
}

export const DetachedScopeWindow: React.FC<DetachedScopeWindowProps> = ({
  initialTheme = 'dark',
}) => {
  const [theme, setTheme] = useState<ThemeType>(initialTheme);
  const [signals, setSignals] = useState<Map<string, number[]>>(() => {
    // Try to initialize from local simulation engine if available, or cached streamer
    const local = simulationEngine.getSignals();
    if (local.size > 0) return new Map(local);
    return telemetryStreamer.getCachedSignals();
  });

  const [simState, setSimState] = useState<SimulationState>(() => {
    return (
      telemetryStreamer.getCachedSimState() || {
        isRunning: simulationEngine.isRunning,
        isPaused: simulationEngine.isPaused,
        t: simulationEngine.t,
        tMax: simulationEngine.tMax || 0.5,
        dt: simulationEngine.dt || 50e-6,
        stepCount: simulationEngine.stepCount || 0,
        speedMultiplier: 1.0,
        nodeCount: 0,
      }
    );
  });

  const [tMax, setTMax] = useState<number>(0.5);
  const [projectName, setProjectName] = useState<string>('PSCAD EMTDC Study');
  const [frameId, setFrameId] = useState<string | null>(null);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [syncedCrosshairTime, setSyncedCrosshairTime] = useState<number | null>(null);
  const [streamingMetrics, setStreamingMetrics] = useState<StreamingMetrics>(() => telemetryStreamer.getMetrics());

  // Step 20.4: Multi-Monitor Layout Persistence State
  const [monitorInfo] = useState<MultiMonitorInfo>(() => sessionManager.detectMultiMonitor());
  const [autoRestore, setAutoRestore] = useState<boolean>(true);
  const [isLayoutSaved, setIsLayoutSaved] = useState<boolean>(false);

  // Parse URL Parameters & load saved layout preferences
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fid = params.get('frameId');
    if (fid) setFrameId(fid);

    document.title = `PSCAD CLONE - Detached Oscilloscope [${fid ? `Frame ${fid}` : 'Master Telemetry'}]`;

    // Load autoRestore preference from sessionManager
    sessionManager.getScopeLayout().then((saved) => {
      setAutoRestore(saved.autoRestore);
    });

    // Request immediate telemetry synchronization from main CAD window
    telemetryStreamer.broadcast({
      type: 'REQUEST_SYNC',
      frameId: fid || undefined,
    });
  }, []);

  // Geometry tracking and layout persistence
  useEffect(() => {
    let saveDebounce: any = null;

    const recordWindowGeometry = () => {
      if (typeof window === 'undefined') return;
      const x = window.screenX;
      const y = window.screenY;
      const width = window.outerWidth || window.innerWidth;
      const height = window.outerHeight || window.innerHeight;
      const isMaximized = width >= window.screen.availWidth && height >= window.screen.availHeight;

      if (saveDebounce) clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => {
        const layoutUpdate: Partial<ScopeWindowLayout> = {
          isDetached: true,
          x,
          y,
          width,
          height,
          isMaximized,
          autoRestore,
          frameId: frameId || null,
        };
        telemetryStreamer.broadcastLayoutUpdate(layoutUpdate);
        setIsLayoutSaved(true);
        setTimeout(() => setIsLayoutSaved(false), 2000);
      }, 400);
    };

    window.addEventListener('resize', recordWindowGeometry);
    const posCheckInterval = setInterval(recordWindowGeometry, 3000);

    const onBeforeUnload = () => {
      sessionManager.saveScopeLayout({
        isDetached: true,
        x: window.screenX,
        y: window.screenY,
        width: window.outerWidth || window.innerWidth,
        height: window.outerHeight || window.innerHeight,
        autoRestore,
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('resize', recordWindowGeometry);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearInterval(posCheckInterval);
      if (saveDebounce) clearTimeout(saveDebounce);
    };
  }, [frameId, autoRestore]);

  const handleToggleAutoRestore = () => {
    const nextVal = !autoRestore;
    setAutoRestore(nextVal);
    sessionManager.saveScopeLayout({ autoRestore: nextVal }).catch(() => {});
    telemetryStreamer.broadcastLayoutUpdate({ autoRestore: nextVal });
  };

  // Listen to incoming telemetry stream from main window
  useEffect(() => {
    const unsubscribe = telemetryStreamer.subscribe((payload: TelemetryPayload) => {
      if (payload.type === 'SIGNALS_CHUNK' || payload.type === 'SYNC_STATE') {
        if (payload.signals) {
          const map = new Map<string, number[]>();
          if (payload.timeArray) {
            map.set('Time', payload.timeArray);
          }
          for (const s of payload.signals) {
            map.set(s.name, s.values);
          }
          setSignals(map);
        }

        if (payload.simState) {
          setSimState(payload.simState);
        }
        if (payload.tMax !== undefined) {
          setTMax(payload.tMax);
        }
        if (payload.projectName) {
          setProjectName(payload.projectName);
        }
      }

      if (payload.type === 'DOCK_BACK') {
        // Main window requested dock back; close this secondary window
        window.close();
      }
    });

    const unsubCursor = telemetryStreamer.subscribeCursor((cursorData: CursorSyncPayload) => {
      if (cursorData.sourceWindow === 'main') {
        setSyncedCrosshairTime(cursorData.crosshairTime ?? null);
      }
    });

    const unsubMetrics = telemetryStreamer.subscribeMetrics((metrics: StreamingMetrics) => {
      setStreamingMetrics(metrics);
    });

    // Also poll local simulationEngine if in same runtime process
    const interval = setInterval(() => {
      if (simulationEngine.isRunning || simulationEngine.getSignals().size > 0) {
        const localSignals = simulationEngine.getSignals();
        if (localSignals.size > 0) {
          setSignals(new Map(localSignals));
        }
        setSimState({
          isRunning: simulationEngine.isRunning,
          isPaused: simulationEngine.isPaused,
          t: simulationEngine.t,
          tMax: simulationEngine.tMax,
          dt: simulationEngine.dt,
          stepCount: simulationEngine.stepCount,
          speedMultiplier: simulationEngine.speedMultiplier,
          nodeCount: simulationEngine.conductanceMatrix?.rows || 0,
        });
        setTMax(simulationEngine.tMax);
      }
    }, 33); // ~30 fps poll for local shared state

    return () => {
      unsubscribe();
      unsubCursor();
      unsubMetrics();
      clearInterval(interval);
    };
  }, []);

  const handleDockBack = () => {
    // 1. Mark as docked in layout persistence
    sessionManager.saveScopeLayout({ isDetached: false }).catch(() => {});

    // 2. Notify main window to restore scope view
    telemetryStreamer.requestDockBack();

    // 2. If in Tauri native shell, close sub-window
    if (tauriBridge.isTauri()) {
      try {
        tauriBridge.getWindowControls().close();
        return;
      } catch (e) {}
    }

    // 3. Attempt script window.close()
    try {
      window.close();
    } catch (e) {}

    // 4. Fallback for direct browser tab navigation:
    // If window is not closed, navigate back to main CAD workspace immediately
    window.location.href = window.location.origin + window.location.pathname;
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleToggleAlwaysOnTop = () => {
    setIsAlwaysOnTop((prev) => !prev);
    // In Tauri, can invoke window_set_always_on_top
  };

  const activeChannelCount = useMemo(() => {
    let count = 0;
    signals.forEach((_, k) => {
      if (k !== 'Time') count++;
    });
    return count;
  }, [signals]);

  const timeSamplesCount = (signals.get('Time') || []).length;

  return (
    <div className={`w-screen h-screen flex flex-col select-none overflow-hidden font-sans ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0d14] text-slate-100'}`}>
      {/* 1. Detached Custom CAD Titlebar */}
      <header className="h-10 bg-[#121722] border-b border-[#222d42] px-3 flex items-center justify-between shrink-0 shadow-md">
        {/* Left: Branding & Status Badges */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-wide text-slate-100">PSCAD CLONE</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              DETACHED OSCILLOSCOPE
            </span>
            {frameId && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Frame: {frameId}
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-700/60 mx-1" />

          {/* Live Status Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0b1019] border border-[#1e293b]">
            <span className={`w-2 h-2 rounded-full ${simState.isRunning ? 'bg-emerald-400 animate-pulse' : simState.isPaused ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {streamingMetrics.fps > 0
                ? `● LIVE ${streamingMetrics.fps} FPS`
                : simState.isRunning
                ? '● LIVE 60 FPS'
                : simState.isPaused
                ? 'PAUSED'
                : 'READY'}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold pl-1 border-l border-slate-800">
              t = {simState.t.toFixed(4)}s
            </span>
            {syncedCrosshairTime !== null && (
              <span className="text-[9px] font-mono text-emerald-400 pl-1 border-l border-slate-800 font-semibold animate-pulse">
                SYNC t={syncedCrosshairTime.toFixed(4)}s
              </span>
            )}
          </div>
        </div>

        {/* Center: Project and Multi-Monitor Tag */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <MonitorCheck className={`w-3.5 h-3.5 ${monitorInfo.isMultiMonitor ? 'text-emerald-400' : 'text-sky-400'}`} />
          <span className="text-[11px] font-medium text-slate-300 truncate max-w-[240px]">
            {projectName}
          </span>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
            monitorInfo.isMultiMonitor
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {monitorInfo.isMultiMonitor ? 'MULTI-MONITOR 2' : 'SECONDARY VIEW'}
          </span>
          {isLayoutSaved && (
            <span className="text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
              ● Pos Saved
            </span>
          )}
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1.5">
          {/* Auto-Restore Toggle */}
          <button
            onClick={handleToggleAutoRestore}
            title={autoRestore ? 'Auto-Restore: ENABLED (Reopens on application launch)' : 'Auto-Restore: DISABLED'}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium border transition-colors ${
              autoRestore
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#161d2b] text-slate-400 border-[#26354d] hover:text-slate-200'
            }`}
          >
            <BookmarkCheck className={`w-3 h-3 ${autoRestore ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">Auto-Restore</span>
            <span className="font-bold">{autoRestore ? 'ON' : 'OFF'}</span>
          </button>
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Light / Dark Theme"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {/* Always on Top */}
          <button
            onClick={handleToggleAlwaysOnTop}
            title={isAlwaysOnTop ? 'Pin Always on Top: ON' : 'Pin Always on Top: OFF'}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
              isAlwaysOnTop
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#161d2b] text-slate-400 border-[#26354d] hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span className="hidden sm:inline">Pin Top</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded bg-[#161d2b] hover:bg-slate-700 text-slate-300 border border-[#26354d] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Dock Back to Main Window */}
          <button
            onClick={handleDockBack}
            title="Dock back to main PSCAD application window"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Dock Back</span>
          </button>
        </div>
      </header>

      {/* 2. Main Full-Screen Oscilloscope Viewport */}
      <main className="flex-1 relative overflow-hidden bg-[#0a0d14]">
        <OscilloscopeView
          theme={theme}
          signals={signals}
          tMax={tMax}
          externalCrosshairTime={syncedCrosshairTime}
          onCursorChange={(cursorData) => {
            telemetryStreamer.broadcastCursor({
              ...cursorData,
              sourceWindow: 'popout',
              frameId: frameId || undefined,
            });
          }}
          onOpenComtradeModal={() => {
            // Send request to main window or alert
            telemetryStreamer.broadcast({ type: 'POPOUT_INIT' });
          }}
        />
      </main>

      {/* 3. Bottom Telemetry Status Bar */}
      <footer className="h-6 bg-[#0f141f] border-t border-[#1e293b] px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Channels:</span>
            <span className="text-sky-400 font-bold">{activeChannelCount} Active</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Samples:</span>
            <span className="text-slate-300">{timeSamplesCount.toLocaleString()}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">dt:</span>
            <span className="text-emerald-400">{(simState.dt * 1e6).toFixed(1)} µs</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Latency:</span>
            <span className={streamingMetrics.latencyMs > 50 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {streamingMetrics.latencyMs <= 1 ? '< 1 ms' : `${streamingMetrics.latencyMs.toFixed(1)} ms`}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            Sync Pipe:{' '}
            <span className="text-cyan-300 font-bold">
              {streamingMetrics.transport === 'BroadcastChannel'
                ? 'BroadcastChannel (Zero-Copy)'
                : streamingMetrics.transport === 'TauriIPC'
                ? 'Tauri Native IPC'
                : 'Shared Memory / Local'}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">PSCAD™ EMTDC™ Telemetry Client</span>
        </div>
      </footer>
    </div>
  );
};

export default DetachedScopeWindow;
