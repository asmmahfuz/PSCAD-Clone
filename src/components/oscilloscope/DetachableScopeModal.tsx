/**
 * PSCAD CLONE - Floating Draggable & Resizable In-App Oscilloscope Modal
 * Phase 20 - Step 20.1: Native Pop-Out Detachable Window Architecture
 */

import React, { useState, useRef } from 'react';
import {
  Activity,
  Maximize2,
  Minimize2,
  Minus,
  X,
  ExternalLink,
  ArrowDownLeft,
  ChevronUp,
} from 'lucide-react';
import { OscilloscopeView } from './OscilloscopeView';
import { telemetryStreamer } from '../../services/telemetryStreamer';
import type { ThemeType, SimulationState } from '../../types';

export interface DetachableScopeModalProps {
  isOpen: boolean;
  theme: ThemeType;
  signals: Map<string, number[]>;
  simState: SimulationState;
  tMax: number;
  frameId?: string | null;
  onClose: () => void;
  onDockBack?: () => void;
  onOpenComtradeModal?: () => void;
}

export const DetachableScopeModal: React.FC<DetachableScopeModalProps> = ({
  isOpen,
  theme,
  signals,
  simState,
  tMax,
  frameId,
  onClose,
  onDockBack,
  onOpenComtradeModal,
}) => {
  // Window geometry state
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      x: Math.max(40, screenW - 780),
      y: Math.max(50, screenH - 540),
    };
  });

  const [size, setSize] = useState<{ w: number; h: number }>({ w: 720, h: 480 });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [prevBounds, setPrevBounds] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 100,
    y: 80,
    w: 720,
    h: 480,
  });

  const draggingRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizingRef = useRef<{ handle: string; startX: number; startY: number; startW: number; startH: number; startPosX: number; startPosY: number } | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Header Drag Handlers
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (isMaximized) return;

    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };

    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = moveEvent.clientX - draggingRef.current.startX;
      const dy = moveEvent.clientY - draggingRef.current.startY;

      const maxX = Math.max(0, window.innerWidth - 100);
      const maxY = Math.max(0, window.innerHeight - 50);

      setPos({
        x: Math.max(0, Math.min(maxX, draggingRef.current.startPosX + dx)),
        y: Math.max(30, Math.min(maxY, draggingRef.current.startPosY + dy)),
      });
    };

    const onMouseUp = () => {
      draggingRef.current = null;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Resize Handlers
  const handleResizeStart = (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized) return;

    resizingRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
      startPosX: pos.x,
      startPosY: pos.y,
    };

    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = moveEvent.clientX - resizingRef.current.startX;
      const dy = moveEvent.clientY - resizingRef.current.startY;
      const { handle: h, startW, startH, startPosX, startPosY } = resizingRef.current;

      let newW = startW;
      let newH = startH;
      let newX = startPosX;
      let newY = startPosY;

      if (h.includes('e')) newW = Math.max(460, startW + dx);
      if (h.includes('s')) newH = Math.max(300, startH + dy);
      if (h.includes('w')) {
        const potentialW = Math.max(460, startW - dx);
        newX = startPosX + (startW - potentialW);
        newW = potentialW;
      }
      if (h.includes('n')) {
        const potentialH = Math.max(300, startH - dy);
        newY = startPosY + (startH - potentialH);
        newH = potentialH;
      }

      setSize({ w: newW, h: newH });
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleToggleMaximize = () => {
    if (!isMaximized) {
      setPrevBounds({ x: pos.x, y: pos.y, w: size.w, h: size.h });
      setPos({ x: 20, y: 40 });
      setSize({
        w: Math.max(500, window.innerWidth - 40),
        h: Math.max(350, window.innerHeight - 80),
      });
      setIsMaximized(true);
    } else {
      setPos({ x: prevBounds.x, y: prevBounds.y });
      setSize({ w: prevBounds.w, h: prevBounds.h });
      setIsMaximized(false);
    }
  };

  const handlePopoutToOSWindow = () => {
    // Open dedicated standalone OS window
    telemetryStreamer.openPopoutWindow({
      frameId: frameId || undefined,
      width: 1100,
      height: 720,
    });
    // Close in-app floating modal
    onClose();
  };

  // Minimized Compact Floating Pill Mode
  if (isMinimized) {
    return (
      <div
        style={{ right: 24, bottom: 48 }}
        className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-[#121824] border border-[#2b3a54] rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 select-none font-sans"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-100">Oscilloscope (Floating)</span>
          <span className="text-[10px] font-mono text-cyan-400">t = {simState.t.toFixed(3)}s</span>
        </div>

        <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
          <button
            onClick={() => setIsMinimized(false)}
            title="Restore Floating Scope Window"
            className="p-1 rounded bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePopoutToOSWindow}
            title="Pop-Out to Native OS Window"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Floating Scope"
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalContainerRef}
      style={{
        left: isMaximized ? 20 : pos.x,
        top: isMaximized ? 40 : pos.y,
        width: isMaximized ? 'calc(100vw - 40px)' : size.w,
        height: isMaximized ? 'calc(100vh - 80px)' : size.h,
      }}
      className="fixed z-40 flex flex-col bg-[#0c1017] border border-[#26354d] rounded-lg shadow-2xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. Draggable Modal Titlebar Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="h-9 px-3 bg-[#162032] border-b border-[#26354d] flex items-center justify-between cursor-move shrink-0"
      >
        {/* Left Info */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-slate-100">
            {frameId ? `Floating Graph Frame [${frameId}]` : 'Floating Live Oscilloscope'}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
            PIP FLOAT
          </span>
          <span className="text-[10px] font-mono text-cyan-400">
            t = {simState.t.toFixed(4)}s
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
          {/* Pop out to OS Window */}
          <button
            onClick={handlePopoutToOSWindow}
            title="Pop-Out to Native Standalone OS Multi-Monitor Window"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f172a] hover:bg-slate-700 text-sky-300 border border-[#26334a] text-[10px] font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Pop-Out OS</span>
          </button>

          {/* Dock Back to Main App */}
          {onDockBack && (
            <button
              onClick={onDockBack}
              title="Dock back to main workspace split/dock"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[10px] font-medium transition-colors shadow-sm"
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>Dock</span>
            </button>
          )}

          {/* Minimize to Pill */}
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize to floating pill"
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleToggleMaximize}
            title={isMaximized ? 'Restore window size' : 'Maximize window'}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Close floating oscilloscope"
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Embedded Oscilloscope Viewport */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0d14]">
        <OscilloscopeView
          theme={theme}
          signals={signals}
          tMax={tMax}
          onOpenComtradeModal={onOpenComtradeModal}
        />
      </div>

      {/* 3. Resize Corner & Border Handles */}
      {!isMaximized && (
        <>
          <div
            onMouseDown={(e) => handleResizeStart('nw', e)}
            className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('n', e)}
            className="absolute top-0 left-3 right-3 h-2 cursor-ns-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('ne', e)}
            className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('e', e)}
            className="absolute top-3 bottom-3 right-0 w-2 cursor-ew-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('se', e)}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('s', e)}
            className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('sw', e)}
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-50"
          />
          <div
            onMouseDown={(e) => handleResizeStart('w', e)}
            className="absolute top-3 bottom-3 left-0 w-2 cursor-ew-resize z-50"
          />
        </>
      )}
    </div>
  );
};

export default DetachableScopeModal;
