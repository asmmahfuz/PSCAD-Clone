import React, { useState } from 'react';
import { X, Cpu, Grid, Layers, Zap } from 'lucide-react';
import { simulationEngine } from '../../engine/solver';

interface MatrixModalProps {
  onClose: () => void;
}

export const MatrixModal: React.FC<MatrixModalProps> = ({ onClose }) => {
  const [viewMode, setViewMode] = useState<'dense' | 'sparse'>('dense');
  const netlist = simulationEngine.netlist;
  const n = netlist ? netlist.nodeCount : 0;
  const mat = simulationEngine.conductanceMatrix;
  const csr = simulationEngine.sparseCSR;
  const sparseSolver = simulationEngine.sparseLUSolver;

  const sparsityPercent = csr ? (csr.sparsityRatio * 100).toFixed(1) : '0.0';
  const nnzCount = csr ? csr.nnz : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            EMTDC Nodal Conductance Matrix [G] & Sparse LU Inspector
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Controls & Metrics */}
        <div className="p-3 bg-[#121620] border-b border-[#263147] flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div>Nodes: <strong className="text-emerald-400">{n}</strong> ({n}&times;{n})</div>
            <div>Non-Zeros (NNZ): <strong className="text-cyan-400">{nnzCount}</strong></div>
            <div>Sparsity: <strong className="text-amber-400">{sparsityPercent}%</strong></div>
            <div>Markowitz Fill-Ins: <strong className="text-purple-400">{sparseSolver?.fillInCount || 0}</strong></div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#161b26] p-0.5 rounded border border-[#263147]">
            <button
              onClick={() => setViewMode('dense')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'dense' ? 'bg-[#1f6feb] text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Dense Grid
            </button>
            <button
              onClick={() => setViewMode('sparse')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'sparse' ? 'bg-[#1f6feb] text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sparse CSR / Pivoting
            </button>
          </div>
        </div>

        {/* Matrix Display */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {n > 0 ? (
            viewMode === 'dense' && mat ? (
              <div className="overflow-x-auto border border-[#263147] rounded">
                <table className="w-full text-right font-mono text-[11px]">
                  <thead className="bg-[#1c2333] text-slate-400">
                    <tr>
                      <th className="p-2 text-left border-b border-[#263147]">Node</th>
                      {Array.from({ length: n }).map((_, j) => (
                        <th key={j} className="p-2 border-b border-[#263147]">N{j + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263147] text-slate-300">
                    {Array.from({ length: n }).map((_, i) => (
                      <tr key={i} className="hover:bg-[#1c2333]">
                        <td className="p-2 text-left font-bold text-slate-400">Node {i + 1}</td>
                        {Array.from({ length: n }).map((_, j) => {
                          const val = mat.get(i, j);
                          const isNonZero = Math.abs(val) > 1e-8;
                          const formatted = isNonZero ? val.toExponential(2) : '0';
                          return (
                            <td
                              key={j}
                              className={`p-2 font-mono ${
                                i === j
                                  ? 'bg-emerald-950/20 text-emerald-300 font-semibold'
                                  : isNonZero
                                  ? 'text-cyan-300'
                                  : 'text-slate-600'
                              }`}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : csr ? (
              <div className="space-y-4">
                {/* CSR Arrays */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#121620] border border-[#263147] rounded font-mono text-[11px]">
                    <div className="font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Row Pointers (rowPtr [{csr.rowPtr.length}])
                    </div>
                    <div className="text-slate-300 break-all max-h-32 overflow-y-auto">
                      [{Array.from(csr.rowPtr).join(', ')}]
                    </div>
                  </div>

                  <div className="p-3 bg-[#121620] border border-[#263147] rounded font-mono text-[11px]">
                    <div className="font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      Column Indices (colIndices [{csr.colIndices.length}])
                    </div>
                    <div className="text-slate-300 break-all max-h-32 overflow-y-auto">
                      [{Array.from(csr.colIndices).map(c => `N${c + 1}`).join(', ')}]
                    </div>
                  </div>

                  <div className="p-3 bg-[#121620] border border-[#263147] rounded font-mono text-[11px]">
                    <div className="font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-400" />
                      Non-Zero Values [{csr.values.length}]
                    </div>
                    <div className="text-slate-300 break-all max-h-32 overflow-y-auto">
                      [{Array.from(csr.values).map(v => v.toExponential(2)).join(', ')}]
                    </div>
                  </div>
                </div>

                {/* Markowitz Pivoting Vectors */}
                {sparseSolver && (
                  <div className="p-3 bg-[#121620] border border-[#263147] rounded font-mono text-[11px] space-y-2">
                    <div className="font-bold text-slate-300">Markowitz Minimum-Degree Optimal Permutations:</div>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>Row Permutation (P): <span className="text-emerald-400">[{Array.from(sparseSolver.rowPerm).map(r => `N${r + 1}`).join(' \u2192 ')}]</span></div>
                      <div>Col Permutation (Q): <span className="text-cyan-400">[{Array.from(sparseSolver.colPerm).map(c => `N${c + 1}`).join(' \u2192 ')}]</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : null
          ) : (
            <div className="p-8 text-center text-slate-500 italic">
              Matrix not initialized. Place components and compile the circuit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
