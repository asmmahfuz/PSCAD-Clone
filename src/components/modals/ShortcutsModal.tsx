import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            PSCAD Modern Keyboard Accelerators & Shortcuts
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-bold text-sky-400 text-xs uppercase tracking-wider">Project & Editing</h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">New Project</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">Ctrl+N</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Open Project</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">Ctrl+O</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Save Project</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Undo / Redo</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">Ctrl+Z / Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Rotate Component</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">R</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Delete Element</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">Del</kbd>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Simulation Controls</h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Start / Run Simulation</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-emerald-400 rounded">F5</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Pause Simulation</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-amber-400 rounded">F6</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Single Step Execution</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-blue-400 rounded">F10</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Stop & Reset</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-red-400 rounded">Shift+F5</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Compile Netlist</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-purple-400 rounded">F7</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0f131c] p-1.5 rounded">
                <span className="text-slate-300">Toggle Wire Mode</span>
                <kbd className="px-1.5 py-0.5 bg-[#263147] text-white rounded">W</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
