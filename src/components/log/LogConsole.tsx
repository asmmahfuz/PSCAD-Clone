import React, { useState } from 'react';
import { Terminal, Trash2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import type { LogEntry } from '../../types';

interface LogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogConsole: React.FC<LogProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');

  const filtered = logs.filter(l => filter === 'all' || l.type === filter);

  return (
    <div className="flex flex-col h-full bg-[#161b26] border-t border-[#263147] select-none text-xs font-mono">
      {/* Header toolbar */}
      <div className="h-7 px-3 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200 font-sans">Build & Simulation Messages</span>

          <div className="flex items-center gap-1 ml-4 font-sans text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'all' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'info' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'warning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Warnings
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'error' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        <button
          onClick={onClear}
          title="Clear Log"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Log entries list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0c0f17]">
        {filtered.length === 0 ? (
          <div className="text-slate-600 italic text-[11px] p-2">No messages recorded.</div>
        ) : (
          filtered.map(l => (
            <div
              key={l.id}
              className={`flex items-start gap-2 leading-tight text-[11px] ${
                l.type === 'error' ? 'text-red-400' : l.type === 'warning' ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              <span className="text-slate-500 shrink-0 font-mono">[{l.time}]</span>
              <span className="shrink-0 mt-0.5">
                {l.type === 'error' ? <AlertCircle className="w-3 h-3" /> : l.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3 text-sky-400" />}
              </span>
              <span className="break-all">{l.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
