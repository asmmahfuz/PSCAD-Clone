import React, { useState, useEffect } from 'react';
import { X, Camera, Play, Download, Upload, Trash2, CheckCircle2, Clock, Cpu, HardDrive } from 'lucide-react';
import { simulationEngine } from '../../engine/solver';
import { snapshotEngine, type SimulationSnapshot } from '../../engine/snapshot';

interface SnapshotModalProps {
  onClose: () => void;
  onSnapshotRestored?: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ onClose, onSnapshotRestored }) => {
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SimulationSnapshot | null>(null);
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshList = () => {
    const list = snapshotEngine.getAllSnapshots();
    setSnapshots(list);
    if (list.length > 0 && !selectedSnapshot) {
      setSelectedSnapshot(list[0]);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleTakeSnapshot = () => {
    const name = snapshotName.trim() || undefined;
    const snap = snapshotEngine.takeSnapshot(
      simulationEngine,
      name,
      `Manual snapshot at simulation time ${(simulationEngine.t * 1000).toFixed(2)} ms`
    );
    setSnapshotName('');
    refreshList();
    setSelectedSnapshot(snap);
    setSuccessMessage(`Captured snapshot '${snap.name}' at t = ${snap.simTime.toFixed(4)} s`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRestore = (snap: SimulationSnapshot) => {
    const ok = snapshotEngine.restoreSnapshot(simulationEngine, snap);
    if (ok) {
      setSuccessMessage(`Hot-start simulation resumed from t = ${snap.simTime.toFixed(4)} s`);
      if (onSnapshotRestored) onSnapshotRestored();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    snapshotEngine.deleteSnapshot(id);
    if (selectedSnapshot?.id === id) {
      setSelectedSnapshot(null);
    }
    refreshList();
  };

  const handleExportJSON = (snap: SimulationSnapshot) => {
    const jsonStr = snapshotEngine.exportToJSON(snap);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PSCAD_Snapshot_${snap.name.replace(/\s+/g, '_')}_t${snap.simTime.toFixed(4)}s.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snap = snapshotEngine.importFromJSON(text);
        refreshList();
        setSelectedSnapshot(snap);
        setSuccessMessage(`Imported snapshot '${snap.name}'`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        alert(`Failed to import snapshot: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            PSCAD EMTDC State Snapshots & Hot-Start Manager
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-[#121620] border-b border-[#263147] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Snapshot label (e.g., Pre-Fault Steady State)"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="px-2.5 py-1 bg-[#161b26] border border-[#263147] rounded text-slate-200 text-xs flex-1 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleTakeSnapshot}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture State
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer border border-[#263147] transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Import Snapshot
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Alert message */}
        {successMessage && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/60 text-emerald-300 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#263147]">
          {/* Left Panel: Snapshot List */}
          <div className="p-3 overflow-y-auto max-h-[50vh] md:max-h-none space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Saved Snapshots ({snapshots.length})</span>
              <span className="text-[10px] text-slate-500">Current Sim Time: {(simulationEngine.t * 1000).toFixed(2)} ms</span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No snapshots captured yet.<br />
                Click &quot;Capture State&quot; to save the current simulation point.
              </div>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(snap)}
                  className={`p-2.5 rounded border cursor-pointer transition-all ${
                    selectedSnapshot?.id === snap.id
                      ? 'bg-[#1f293d] border-emerald-500 shadow-md'
                      : 'bg-[#121620] border-[#263147] hover:border-slate-500 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {snap.name}
                    </span>
                    <button
                      onClick={(e) => handleDelete(snap.id, e)}
                      title="Delete Snapshot"
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono mt-1">
                    <div>Time: <strong className="text-emerald-400">{(snap.simTime * 1000).toFixed(2)} ms</strong></div>
                    <div>Step: <strong className="text-slate-300">#{snap.stepCount}</strong></div>
                    <div>Nodes: <strong className="text-slate-300">{snap.nodeCount}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Panel: State Inspection & Hot Start */}
          <div className="p-4 overflow-y-auto space-y-3 bg-[#11141c]">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-[#263147]">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{selectedSnapshot.name}</h3>
                    <p className="text-[10px] text-slate-400">{selectedSnapshot.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportJSON(selectedSnapshot)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      JSON
                    </button>
                    <button
                      onClick={() => handleRestore(selectedSnapshot)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center gap-1 text-[11px] shadow-lg shadow-emerald-900/40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Hot-Start Restore
                    </button>
                  </div>
                </div>

                {/* State Details */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Serialized State Vector
                  </div>

                  {/* Nodal Voltages */}
                  <div className="p-2.5 bg-[#161b26] border border-[#263147] rounded">
                    <div className="text-[10px] text-slate-400 font-bold mb-1">Nodal Voltages [V]</div>
                    <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-slate-300 max-h-24 overflow-y-auto">
                      {selectedSnapshot.nodeVoltages.map((v, idx) => (
                        <div key={idx} className="bg-[#121620] px-1.5 py-0.5 rounded border border-[#1f293d]">
                          Node {idx + 1}: <span className="text-cyan-300 font-semibold">{v.toFixed(1)} V</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Component States Summary */}
                  <div className="p-2.5 bg-[#161b26] border border-[#263147] rounded">
                    <div className="text-[10px] text-slate-400 font-bold mb-1">Component Companion Variables ({Object.keys(selectedSnapshot.componentStates).length})</div>
                    <div className="space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto">
                      {Object.entries(selectedSnapshot.componentStates).map(([compId, st]) => (
                        <div key={compId} className="flex items-center justify-between bg-[#121620] px-2 py-1 rounded border border-[#1f293d] text-slate-300">
                          <span className="text-slate-400">{compId}:</span>
                          <span className="text-emerald-400">
                            {st.prevI !== undefined && `I=${st.prevI.toFixed(3)}A `}
                            {st.prevV !== undefined && `V=${st.prevV.toFixed(1)}V `}
                            {st.isClosed !== undefined && (st.isClosed ? 'CLOSED' : 'OPEN')}
                            {st.omega_pu !== undefined && `ω=${st.omega_pu.toFixed(4)}pu`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">
                Select a snapshot on the left to inspect variables and hot-start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
