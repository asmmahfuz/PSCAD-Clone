import React from 'react';
import { Cpu, Activity } from 'lucide-react';
import type { SimulationState } from '../../types';

interface StatusBarProps {
  simState: SimulationState;
  coords: { x: number; y: number; zoom: number };
}

export const StatusBar: React.FC<StatusBarProps> = ({ simState, coords }) => {
  const isRunning = simState.isRunning;
  const isPaused = simState.isPaused;

  const statusText = isRunning ? 'RUNNING' : (isPaused ? 'PAUSED' : 'READY');
  const statusColor = isRunning ? 'text-emerald-400' : (isPaused ? 'text-amber-400' : 'text-slate-400');

  return (
    <div className="h-6 px-3 bg-[#1c2333] border-t border-[#263147] flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : (isPaused ? 'bg-amber-400' : 'bg-slate-500')}`} />
          <span className={statusColor}>{statusText}</span>
        </div>

        {/* Sim Progress */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>t = {(simState.t * 1000).toFixed(2)} ms / {(simState.tMax * 1000).toFixed(0)} ms</span>
          <span className="text-slate-500">({((simState.t / Math.max(1e-6, simState.tMax)) * 100).toFixed(0)}%)</span>
        </div>

        {/* Nodes & Solver */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Nodes: {simState.nodeCount}</span>
          <span className="text-slate-600">|</span>
          <span>Δt: {(simState.dt * 1e6).toFixed(1)} µs</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Coordinates */}
        <div>
          X: <span className="text-slate-200">{coords.x}</span>, Y: <span className="text-slate-200">{coords.y}</span>
        </div>

        {/* Zoom */}
        <div>
          Zoom: <span className="text-slate-200">{coords.zoom}%</span>
        </div>
      </div>
    </div>
  );
};
