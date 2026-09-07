import React, { useState } from 'react';
import { X, Layers, Check, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { IconViewScenario } from '../ribbon/PscadIcons';
import type { CircuitComponentData, WireData } from '../../types';

export interface ScenarioEntry {
  name: string;
  description: string;
  components: CircuitComponentData[];
  wires: WireData[];
  isBase?: boolean;
}

interface ScenarioModalProps {
  onClose: () => void;
  activeScenario: string;
  onSelectScenario: (name: string) => void;
  scenarios: string[];
  onSaveNewScenario: (name: string, description?: string) => void;
  onDeleteScenario: (name: string) => void;
  componentsCount: number;
  wiresCount: number;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  onClose,
  activeScenario,
  onSelectScenario,
  scenarios,
  onSaveNewScenario,
  onDeleteScenario,
  componentsCount,
  wiresCount,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>(activeScenario);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreateScenario = () => {
    const trimmed = newScenarioName.trim();
    if (!trimmed) return;
    if (scenarios.includes(trimmed)) {
      setFeedback(`Scenario '${trimmed}' already exists.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    onSaveNewScenario(trimmed, newDescription.trim() || undefined);
    setSelectedScenario(trimmed);
    setNewScenarioName('');
    setNewDescription('');
    setFeedback(`Created scenario '${trimmed}'!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (name: string) => {
    if (name === 'Base Case') {
      setFeedback('Cannot delete Base Case scenario.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    if (window.confirm(`Delete scenario '${name}'?`)) {
      onDeleteScenario(name);
      if (selectedScenario === name) {
        setSelectedScenario('Base Case');
      }
      setFeedback(`Deleted scenario '${name}'.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleApply = (name: string) => {
    onSelectScenario(name);
    setFeedback(`Applied active scenario: '${name}'`);
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e232d] border border-slate-300 dark:border-slate-700 rounded-md shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f3f8] dark:bg-[#181c24] border-b border-slate-200 dark:border-slate-700 select-none">
          <div className="flex items-center gap-2">
            <IconViewScenario size={20} />
            <span className="font-semibold text-sm tracking-wide text-slate-900 dark:text-slate-100">
              Scenario Manager & Hierarchy Inspector
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-4 py-1.5 text-xs font-medium border-b border-blue-200 dark:border-blue-900/60 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {feedback}
          </div>
        )}

        {/* Main Content: Left List + Right Details */}
        <div className="flex flex-1 min-h-[340px] max-h-[480px]">
          {/* Left Scenarios List */}
          <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-[#fcfdfe] dark:bg-[#191e27]">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span>Configured Scenarios</span>
              <span className="text-[10px] text-slate-400 font-mono">Total: {scenarios.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {scenarios.map((sc) => {
                const isActive = sc === activeScenario;
                const isSelected = sc === selectedScenario;
                return (
                  <div
                    key={sc}
                    onClick={() => setSelectedScenario(sc)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded cursor-pointer transition-colors text-xs select-none ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 font-medium border border-blue-300 dark:border-blue-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                      <span>{sc}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                      {sc === 'Base Case' && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          BASE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Scenario Form */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#161a22]">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Plus size={13} className="text-blue-600" />
                <span>Save Current as New Scenario</span>
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Scenario Name (e.g. 3Ph Fault at Bus 2)"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-[#10141c] border border-slate-300 dark:border-slate-600 focus:outline-hidden focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={!newScenarioName.trim()}
                  onClick={handleCreateScenario}
                  className="w-full py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={13} />
                  <span>Create Scenario</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Scenario Details & Inspector */}
          <div className="w-1/2 p-4 flex flex-col justify-between bg-white dark:bg-[#1e232d]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedScenario}</h3>
                  <span className="text-[11px] text-slate-500">
                    {selectedScenario === activeScenario ? 'Currently Active in Schematic Canvas' : 'Inactive Scenario'}
                  </span>
                </div>
                {selectedScenario === activeScenario && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10.5px] text-slate-500">Components</div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {componentsCount}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10.5px] text-slate-500">Wires & Routing</div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {wiresCount}
                  </div>
                </div>
              </div>

              {/* Scenario Properties */}
              <div className="text-xs space-y-1.5 p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400">Simulation Status</div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>State Storage:</span>
                  <span className="font-mono text-emerald-600 font-semibold">Ready (In-Memory)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Hierarchy Scope:</span>
                  <span>Root Schematic</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>EMTDC Solver:</span>
                  <span>Sparse Matrix / Trapezoidal</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              {selectedScenario !== 'Base Case' ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedScenario)}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              ) : (
                <span className="text-[10.5px] text-slate-400 italic">Base Case protected</span>
              )}

              <div className="flex items-center gap-2">
                {selectedScenario !== activeScenario && (
                  <button
                    type="button"
                    onClick={() => handleApply(selectedScenario)}
                    className="px-3 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Check size={13} />
                    <span>Apply Scenario</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
