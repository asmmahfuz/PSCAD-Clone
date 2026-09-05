import React, { useState, useMemo } from 'react';
import {
  X, TowerControl as Tower, CheckCircle2,
  RefreshCw, Activity, Zap
} from 'lucide-react';
import {
  LineConstantsSolver,
  TOWER_PRESETS,
  type ConductorGeometry,
  type LCPResult
} from '../../engine/lines/lineConstantsSolver';
import type { CircuitComponentData } from '../../types';

interface LineConstantsModalProps {
  selectedComponent?: CircuitComponentData | null;
  onApplyParams?: (params: Record<string, number>) => void;
  onClose: () => void;
}

export const LineConstantsModal: React.FC<LineConstantsModalProps> = ({
  selectedComponent,
  onApplyParams,
  onClose,
}) => {
  const [activePresetKey, setActivePresetKey] = useState<string>('PRESET_230KV_H_FRAME');
  const [conductors, setConductors] = useState<ConductorGeometry[]>(
    TOWER_PRESETS['PRESET_230KV_H_FRAME'].conductors
  );
  const [frequencyHz, setFrequencyHz] = useState<number>(60);
  const [soilResistivity, setSoilResistivity] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'visual' | 'matrices' | 'sequence'>('visual');
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  // Compute LCP Results in real time whenever geometry or parameters change
  const lcpResult: LCPResult = useMemo(() => {
    return LineConstantsSolver.solve(conductors, frequencyHz, soilResistivity);
  }, [conductors, frequencyHz, soilResistivity]);

  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    const preset = TOWER_PRESETS[key];
    if (preset) {
      setConductors(JSON.parse(JSON.stringify(preset.conductors)));
      setSoilResistivity(preset.groundResistivity);
      setFrequencyHz(preset.frequencyHz);
    }
  };

  const handleUpdateConductor = (index: number, field: keyof ConductorGeometry, value: any) => {
    setConductors(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: typeof value === 'number' ? Math.max(0, value) : value,
      };
      return updated;
    });
  };

  const handleApplyToComponent = () => {
    if (!onApplyParams) return;
    const paramsToApply = {
      R_per_km: lcpResult.R1,
      L_per_km: lcpResult.L1,
      C_per_km: lcpResult.C1,
      R_self_per_km: lcpResult.R_matrix[0][0],
      R_mutual_per_km: lcpResult.R_matrix[0][1] || 0.02,
      L_self_per_km: lcpResult.L_matrix[0][0],
      L_mutual_per_km: lcpResult.L_matrix[0][1] || 0.0005,
      C_self_per_km: lcpResult.C_matrix[0][0],
      C_mutual_per_km: lcpResult.C_matrix[0][1] || 3e-9,
      Zc_aerial: lcpResult.Zc1,
      Zc_ground: lcpResult.Zc0,
      v_aerial: lcpResult.v1_km_s,
      v_ground: lcpResult.v0_km_s,
    };
    onApplyParams(paramsToApply);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 2500);
  };

  // SVG Dimension Calculations
  const svgWidth = 460;
  const svgHeight = 320;
  const scale = 5.5; // pixels per meter
  const originX = svgWidth / 2;
  const groundY = svgHeight - 40;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-sans text-xs animate-in fade-in duration-200">
      <div className="bg-[#121620] border border-[#263147] rounded-xl w-[1080px] max-w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#161b26] border-b border-[#263147] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Tower className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Line Constants Program (LCP) Studio
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Carson Earth Return + Maxwell Matrices
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Solve frequency-dependent transmission line matrices and modal parameters from physical tower geometry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector Bar */}
        <div className="px-5 py-2.5 bg-[#181f2f] border-b border-[#263147] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Tower Preset:</span>
            <div className="flex items-center gap-1.5">
              {Object.entries(TOWER_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                    activePresetKey === key
                      ? 'bg-[#1f6feb] text-white shadow'
                      : 'bg-[#121620] text-slate-300 hover:bg-[#263147]'
                  }`}
                >
                  {preset.name.split(' ')[0]} {preset.voltageRatingKv} kV
                </button>
              ))}
            </div>
          </div>

          {/* Quick Frequency & Soil Resistivity */}
          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400">Freq:</span>
              <input
                type="number"
                value={frequencyHz}
                onChange={(e) => setFrequencyHz(parseFloat(e.target.value) || 60)}
                className="w-14 px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
              />
              <span>Hz</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-400">Soil ρ:</span>
              <input
                type="number"
                value={soilResistivity}
                onChange={(e) => setSoilResistivity(parseFloat(e.target.value) || 100)}
                className="w-16 px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
              />
              <span>Ω·m</span>
            </label>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Conductor Geometry Table */}
          <div className="w-[540px] border-r border-[#263147] flex flex-col bg-[#141924] p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                Conductor & Tower Layout ({conductors.length} Elements)
              </span>
              <button
                onClick={() => handleSelectPreset(activePresetKey)}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Preset
              </button>
            </div>

            <div className="space-y-2.5">
              {conductors.map((c, idx) => (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    c.isGroundWire
                      ? 'bg-amber-950/15 border-amber-800/40 text-amber-200'
                      : 'bg-[#1a2130] border-[#263147] text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.isGroundWire ? 'bg-amber-400' : 'bg-sky-400'}`} />
                      <span className="font-bold text-xs">{c.name}</span>
                      {c.isGroundWire && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                          SHIELD WIRE
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.isGroundWire}
                        onChange={(e) => handleUpdateConductor(idx, 'isGroundWire', e.target.checked)}
                        className="rounded bg-[#0e121a] border-[#263147] text-amber-500 focus:ring-0"
                      />
                      <span>Ground Wire</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400 block">X (m):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={c.x}
                        onChange={(e) => handleUpdateConductor(idx, 'x', parseFloat(e.target.value))}
                        className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Height Y (m):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={c.y}
                        onChange={(e) => handleUpdateConductor(idx, 'y', parseFloat(e.target.value))}
                        className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sag (m):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={c.sag}
                        onChange={(e) => handleUpdateConductor(idx, 'sag', parseFloat(e.target.value))}
                        className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">R_dc (Ω/km):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={c.r_dc_per_km}
                        onChange={(e) => handleUpdateConductor(idx, 'r_dc_per_km', parseFloat(e.target.value))}
                        className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                      />
                    </div>
                  </div>

                  {!c.isGroundWire && (
                    <div className="grid grid-cols-3 gap-2 mt-1.5 text-[10px] font-mono pt-1.5 border-t border-[#263147]/50">
                      <div>
                        <span className="text-slate-400 block">Subconductors:</span>
                        <select
                          value={c.numSubconductors}
                          onChange={(e) => handleUpdateConductor(idx, 'numSubconductors', parseInt(e.target.value))}
                          className="w-full px-1 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                        >
                          <option value={1}>1 (Single)</option>
                          <option value={2}>2 (Twin)</option>
                          <option value={3}>3 (Tri)</option>
                          <option value={4}>4 (Quad)</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Bundle Spacing (cm):</span>
                        <input
                          type="number"
                          step="1"
                          value={c.bundleSpacing_cm}
                          onChange={(e) => handleUpdateConductor(idx, 'bundleSpacing_cm', parseFloat(e.target.value))}
                          className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block">GMR (cm):</span>
                        <input
                          type="number"
                          step="0.1"
                          value={c.gmr_cm}
                          onChange={(e) => handleUpdateConductor(idx, 'gmr_cm', parseFloat(e.target.value))}
                          className="w-full px-1.5 py-0.5 bg-[#0e121a] border border-[#263147] rounded text-slate-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Tower SVG Visualizer & Matrix/Sequence Tabs */}
          <div className="flex-1 flex flex-col bg-[#0f131c] overflow-hidden">
            {/* View Tabs */}
            <div className="px-4 py-2 bg-[#161b26] border-b border-[#263147] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
                    activeTab === 'visual' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tower Geometry View
                </button>
                <button
                  onClick={() => setActiveTab('sequence')}
                  className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
                    activeTab === 'sequence' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Modal / Sequence Parameters
                </button>
                <button
                  onClick={() => setActiveTab('matrices')}
                  className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
                    activeTab === 'matrices' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Phase Matrices [R], [L], [C]
                </button>
              </div>

              {selectedComponent && (
                <button
                  onClick={handleApplyToComponent}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/30"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Apply to '{selectedComponent.name}'
                </button>
              )}
            </div>

            {/* Notification Banner */}
            {appliedNotification && (
              <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-1.5 flex items-center gap-2 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Parameters successfully transferred into selected line model!
              </div>
            )}

            {/* Tab 1: Visual SVG Tower Diagram */}
            {activeTab === 'visual' && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                <svg
                  width={svgWidth}
                  height={svgHeight}
                  className="bg-[#090c12] rounded-xl border border-[#263147] shadow-inner"
                >
                  {/* Ground Plane */}
                  <line
                    x1={0}
                    y1={groundY}
                    x2={svgWidth}
                    y2={groundY}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                  <text x={10} y={groundY + 18} fill="#10b981" fontSize={10} fontFamily="monospace">
                    Ground Plane (0 m) | Earth Return Skin Depth: {lcpResult.penetrationDepth_m.toFixed(1)} m
                  </text>

                  {/* Center Tower Axis */}
                  <line
                    x1={originX}
                    y1={20}
                    x2={originX}
                    y2={groundY}
                    stroke="#263147"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />

                  {/* Tower Lattice Structure Skeleton (Stylized) */}
                  <polygon
                    points={`${originX - 18},${groundY} ${originX + 18},${groundY} ${originX + 4},${40} ${originX - 4},${40}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={1.5}
                  />

                  {/* Conductors & Dimension Lines */}
                  {conductors.map((c) => {
                    const cx = originX + c.x * scale;
                    const cy = groundY - c.y * scale;
                    const color = c.isGroundWire ? '#fbbf24' : '#38bdf8';

                    return (
                      <g key={c.id}>
                        {/* Height line to ground */}
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx}
                          y2={groundY}
                          stroke="#1e293b"
                          strokeWidth={1}
                          strokeDasharray="1 3"
                        />

                        {/* Conductor Node */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={c.isGroundWire ? 4 : Math.min(8, 3 + c.numSubconductors * 1.2)}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          className="transition-all hover:scale-125"
                        />

                        {/* Conductor Tag */}
                        <text
                          x={cx + 8}
                          y={cy - 4}
                          fill="#e2e8f0"
                          fontSize={10}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {c.name} ({c.numSubconductors > 1 ? `${c.numSubconductors}x Bundle` : 'Single'})
                        </text>
                        <text
                          x={cx + 8}
                          y={cy + 8}
                          fill="#94a3b8"
                          fontSize={9}
                          fontFamily="monospace"
                        >
                          ({c.x > 0 ? `+${c.x}` : c.x}m, {c.y}m)
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Quick Diagnostics Strip */}
                <div className="w-full max-w-[460px] grid grid-cols-2 gap-2 mt-3 text-slate-300 font-mono text-[11px]">
                  <div className="p-2 rounded bg-[#161b26] border border-[#263147]">
                    <span className="text-slate-400 block text-[10px]">Aerial Surge Impedance (Zc1):</span>
                    <span className="text-sky-400 font-bold text-sm">{lcpResult.Zc1.toFixed(2)} Ω</span>
                    <span className="text-slate-500 block text-[9px] mt-0.5">Velocity: {lcpResult.v1_km_s.toFixed(0)} km/s (~0.98c)</span>
                  </div>
                  <div className="p-2 rounded bg-[#161b26] border border-[#263147]">
                    <span className="text-slate-400 block text-[10px]">Ground Surge Impedance (Zc0):</span>
                    <span className="text-amber-400 font-bold text-sm">{lcpResult.Zc0.toFixed(2)} Ω</span>
                    <span className="text-slate-500 block text-[9px] mt-0.5">Velocity: {lcpResult.v0_km_s.toFixed(0)} km/s (retarded)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Sequence & Modal Parameters */}
            {activeTab === 'sequence' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Positive Sequence (Aerial Mode) Card */}
                <div className="p-3.5 rounded-xl bg-[#161b26] border border-sky-500/30 shadow">
                  <div className="font-bold text-sky-400 flex items-center gap-1.5 mb-2.5">
                    <Activity className="w-4 h-4" />
                    Positive / Negative Sequence (Aerial Mode 1, 2)
                  </div>
                  <div className="grid grid-cols-4 gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Resistance R1:</span>
                      <span className="font-bold text-slate-200">{lcpResult.R1.toFixed(4)} Ω/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reactance X1:</span>
                      <span className="font-bold text-slate-200">{lcpResult.X1.toFixed(4)} Ω/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Inductance L1:</span>
                      <span className="font-bold text-slate-200">{(lcpResult.L1 * 1000).toFixed(4)} mH/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Capacitance C1:</span>
                      <span className="font-bold text-slate-200">{(lcpResult.C1 * 1e6).toFixed(4)} µF/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Surge Impedance Zc1:</span>
                      <span className="font-bold text-emerald-400">{lcpResult.Zc1.toFixed(2)} Ω</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Velocity v1:</span>
                      <span className="font-bold text-slate-200">{lcpResult.v1_km_s.toFixed(0)} km/s</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Transit Delay (100km):</span>
                      <span className="font-bold text-slate-200">{lcpResult.tau1_ms_per_100km.toFixed(4)} ms</span>
                    </div>
                  </div>
                </div>

                {/* Zero Sequence (Ground Mode) Card */}
                <div className="p-3.5 rounded-xl bg-[#161b26] border border-amber-500/30 shadow">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-2.5">
                    <Activity className="w-4 h-4" />
                    Zero Sequence (Ground Mode 0)
                  </div>
                  <div className="grid grid-cols-4 gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Resistance R0:</span>
                      <span className="font-bold text-slate-200">{lcpResult.R0.toFixed(4)} Ω/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Reactance X0:</span>
                      <span className="font-bold text-slate-200">{lcpResult.X0.toFixed(4)} Ω/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Inductance L0:</span>
                      <span className="font-bold text-slate-200">{(lcpResult.L0 * 1000).toFixed(4)} mH/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Capacitance C0:</span>
                      <span className="font-bold text-slate-200">{(lcpResult.C0 * 1e6).toFixed(4)} µF/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Surge Impedance Zc0:</span>
                      <span className="font-bold text-amber-400">{lcpResult.Zc0.toFixed(2)} Ω</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Velocity v0:</span>
                      <span className="font-bold text-slate-200">{lcpResult.v0_km_s.toFixed(0)} km/s</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Transit Delay (100km):</span>
                      <span className="font-bold text-slate-200">{lcpResult.tau0_ms_per_100km.toFixed(4)} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Phase Domain 3x3 Matrices */}
            {activeTab === 'matrices' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-[11px]">
                {/* [R] Matrix */}
                <div className="p-3 bg-[#161b26] rounded-lg border border-[#263147]">
                  <span className="text-slate-300 font-bold block mb-2">[R] Series Resistance Matrix (Ω/km)</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {lcpResult.R_matrix.slice(0, 3).map((row, r) =>
                      row.slice(0, 3).map((val, c) => (
                        <div key={`r_${r}_${c}`} className="p-1.5 bg-[#0f131c] rounded border border-[#263147]">
                          <span className="text-sky-300 font-bold">{val.toFixed(5)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* [L] Matrix */}
                <div className="p-3 bg-[#161b26] rounded-lg border border-[#263147]">
                  <span className="text-slate-300 font-bold block mb-2">[L] Series Inductance Matrix (mH/km)</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {lcpResult.L_matrix.slice(0, 3).map((row, r) =>
                      row.slice(0, 3).map((val, c) => (
                        <div key={`l_${r}_${c}`} className="p-1.5 bg-[#0f131c] rounded border border-[#263147]">
                          <span className="text-emerald-300 font-bold">{(val * 1000).toFixed(5)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* [C] Matrix */}
                <div className="p-3 bg-[#161b26] rounded-lg border border-[#263147]">
                  <span className="text-slate-300 font-bold block mb-2">[C] Shunt Capacitance Matrix (nF/km)</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {lcpResult.C_matrix.slice(0, 3).map((row, r) =>
                      row.slice(0, 3).map((val, c) => (
                        <div key={`c_${r}_${c}`} className="p-1.5 bg-[#0f131c] rounded border border-[#263147]">
                          <span className="text-amber-300 font-bold">{(val * 1e9).toFixed(4)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#161b26] border-t border-[#263147] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {selectedComponent ? (
              <span>Target schematic line: <strong className="text-sky-400">{selectedComponent.name}</strong> ({selectedComponent.type})</span>
            ) : (
              <span>Select any transmission line on the schematic canvas to apply calculated parameters directly.</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#263147] hover:bg-[#334155] text-slate-200 font-semibold transition-colors"
          >
            Close LCP Studio
          </button>
        </div>
      </div>
    </div>
  );
};
