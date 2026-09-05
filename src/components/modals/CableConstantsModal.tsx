import React, { useState, useMemo } from 'react';
import {
  X, Cable, CheckCircle2, Activity, Zap, Layers,
  ShieldCheck, Info
} from 'lucide-react';

import {
  CableConstantsSolver,
  CABLE_PRESETS,
  type CableLayerGeometry,
  type CablePlacement,
  type CableConstantsResult
} from '../../engine/lines/cableConstantsSolver';
import { PipeCableSolver, PIPE_CABLE_PRESETS, type PipeCableGeometry } from '../../engine/lines/pipeCableSolver';
import { CrossBondingEngine, type CrossBondingConfig, type CrossBondingResult } from '../../engine/lines/crossBonding';
import type { CircuitComponentData } from '../../types';

interface CableConstantsModalProps {
  selectedComponent?: CircuitComponentData | null;
  onApplyParams?: (params: Record<string, number>) => void;
  onClose: () => void;
}

export const CableConstantsModal: React.FC<CableConstantsModalProps> = ({
  onApplyParams,
  onClose,
}) => {

  const [activePresetKey, setActivePresetKey] = useState<string>('CIGRE_TB_531_132KV_SC');
  const [cableMode, setCableMode] = useState<'coaxial' | 'pipe'>('coaxial');
  
  // Coaxial geometry & layout state
  const [geom, setGeom] = useState<CableLayerGeometry>(
    CABLE_PRESETS['CIGRE_TB_531_132KV_SC'].cableGeometry
  );
  const [cables, setCables] = useState<CablePlacement[]>(
    CABLE_PRESETS['CIGRE_TB_531_132KV_SC'].cables
  );
  const [frequencyHz, setFrequencyHz] = useState<number>(50);
  const [soilResistivity, setSoilResistivity] = useState<number>(100);
  const [sheathBonding, setSheathBonding] = useState<'solid' | 'single_point' | 'cross_bonded'>('solid');

  // Pipe cable state
  const [pipeGeom, setPipeGeom] = useState<PipeCableGeometry>(
    PIPE_CABLE_PRESETS['HPPT_230KV_STEEL'].geom
  );

  // Cross-Bonding parameters state
  const [cbLoadCurrent, setCbLoadCurrent] = useState<number>(800); // A
  const [cbLengths, setCbLengths] = useState<[number, number, number]>([1.0, 1.0, 1.0]); // km

  const [activeTab, setActiveTab] = useState<'visual' | 'matrices' | 'sequence' | 'crossbonding'>('visual');
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  // Real-time calculation of cable constants
  const result: CableConstantsResult = useMemo(() => {
    return CableConstantsSolver.solve(geom, cables, frequencyHz, soilResistivity, sheathBonding);
  }, [geom, cables, frequencyHz, soilResistivity, sheathBonding]);

  // Pipe cable calculation
  const pipeResult = useMemo(() => {
    return PipeCableSolver.solve(pipeGeom, frequencyHz);
  }, [pipeGeom, frequencyHz]);

  // Cross-bonding calculation
  const cbResult: CrossBondingResult = useMemo(() => {
    const config: CrossBondingConfig = {
      cableSystemVoltageKv: 132,
      routeLengthKm: cbLengths[0] + cbLengths[1] + cbLengths[2],
      minorSectionLengthsKm: cbLengths,
      loadCurrentA: cbLoadCurrent,
      loadPowerFactor: 0.95,
      phaseSpacingM: cables.length >= 2 ? Math.abs(cables[1].x_m - cables[0].x_m) : 0.3,
      layoutType: 'flat',
      sheathRadiusMm: result.r4_sheath_in_mm,
      sheathResistancePerKm: result.Z_sheath_internal_in.re,
      groundingResistanceOhm: 2.0,
      svlRatedVoltageKv: 6.0,
      svlRefCurrentA: 1000,
      svlNonLinearExponentAlpha: 30,
      svlMaxEnergyRatingKj: 150,
    };
    return CrossBondingEngine.evaluate(config, frequencyHz);
  }, [cbLengths, cbLoadCurrent, cables, result, frequencyHz]);

  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    if (key.startsWith('HPPT_')) {
      setCableMode('pipe');
      const preset = PIPE_CABLE_PRESETS[key];
      if (preset) {
        setPipeGeom(JSON.parse(JSON.stringify(preset.geom)));
        setSoilResistivity(preset.geom.soilResistivity_Ohm_m);
      }
    } else {
      setCableMode('coaxial');
      const preset = CABLE_PRESETS[key];
      if (preset) {
        setGeom(JSON.parse(JSON.stringify(preset.cableGeometry)));
        setCables(JSON.parse(JSON.stringify(preset.cables)));
        setFrequencyHz(preset.frequencyHz);
        setSoilResistivity(preset.soilResistivity_Ohm_m);
        setSheathBonding(preset.sheathBonding);
      }
    }
  };

  const handleApplyToComponent = () => {
    if (!onApplyParams) return;
    const activeRes = cableMode === 'coaxial' ? result : pipeResult;
    const paramsToApply = {
      R_per_km: activeRes.R1,
      L_per_km: activeRes.L1,
      C_per_km: activeRes.C1,
      R_self_per_km: activeRes.R_matrix[0][0],
      R_mutual_per_km: activeRes.R_matrix[0][1] || 0.03,
      L_self_per_km: activeRes.L_matrix[0][0],
      L_mutual_per_km: activeRes.L_matrix[0][1] || 0.0004,
      C_self_per_km: activeRes.C_matrix[0][0],
      C_mutual_per_km: activeRes.C_matrix[0][1] || 0.0,
      Zc_aerial: activeRes.Zc1,
      Zc_ground: activeRes.Zc0,
      v_aerial: activeRes.v1_km_s,
      v_ground: activeRes.v0_km_s,
    };
    onApplyParams(paramsToApply);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-sans text-xs animate-in fade-in duration-200">
      <div className="bg-[#121620] border border-[#263147] rounded-xl w-[1120px] max-w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#161b26] border-b border-[#263147] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Underground & Submarine Cable Constants Studio
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  CIGRE TB 531 & IEEE 575 Parity
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Multi-layer coaxial skin-effect (Bessel $I_0, I_1, K_0, K_1$), Wedepohl earth return, cross-bonding & SVL
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToComponent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {appliedNotification ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Applied to Cable!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Apply to Schematic</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#202738] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector & Quick Controls */}
        <div className="px-5 py-2.5 bg-[#141923] border-b border-[#212c3f] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Standard Preset:</span>
            <select
              value={activePresetKey}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 font-medium"
            >
              <optgroup label="Coaxial Single-Core & Subsea Cables">
                <option value="CIGRE_TB_531_132KV_SC">132 kV Single-Core XLPE (CIGRE TB 531 Benchmark)</option>
                <option value="PRESET_230KV_TREFOIL">230 kV Single-Core XLPE (Trefoil Formation)</option>
                <option value="PRESET_400KV_SUBSEA">400 kV Submarine Armored 3-Core Export Cable</option>
                <option value="PRESET_33KV_BELTED">33 kV 3-Core Distribution Feeder</option>
              </optgroup>
              <optgroup label="High-Pressure Pipe-Type (HPPT) Cables">
                <option value="HPPT_230KV_STEEL">230 kV High-Pressure Fluid-Filled (HPFF) Steel Pipe</option>
                <option value="HPPT_345KV_EXTRA_HIGH_VOLTAGE">345 kV High-Pressure Gas-Filled (HPGF) Steel Pipe</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Freq:</span>
              <input
                type="number"
                value={frequencyHz}
                onChange={(e) => setFrequencyHz(Math.max(1, parseFloat(e.target.value) || 50))}
                className="w-14 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-center"
              />
              <span className="text-slate-400">Hz</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Soil $\rho_e$:</span>
              <input
                type="number"
                value={soilResistivity}
                onChange={(e) => setSoilResistivity(Math.max(0.1, parseFloat(e.target.value) || 100))}
                className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-center"
              />
              <span className="text-slate-400">Ω·m</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Sheath:</span>
              <select
                value={sheathBonding}
                onChange={(e) => setSheathBonding(e.target.value as any)}
                className="bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2 py-0.5"
              >
                <option value="solid">Solidly Bonded</option>
                <option value="single_point">Single-Point Bonded</option>
                <option value="cross_bonded">Cross-Bonded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-[#212c3f] bg-[#121620]">
          <TabButton
            active={activeTab === 'visual'}
            label="Visual Cross-Section & Trench"
            icon={<Layers className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('visual')}
          />
          <TabButton
            active={activeTab === 'matrices'}
            label="Phase Matrices [Z], [Y]"
            icon={<Activity className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('matrices')}
          />
          <TabButton
            active={activeTab === 'sequence'}
            label="Sequence Parameters & Surges"
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('sequence')}
          />
          <TabButton
            active={activeTab === 'crossbonding'}
            label="Cross-Bonding & SVL Studio"
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('crossbonding')}
          />
        </div>

        {/* Main Content Body */}
        <div className="p-5 flex-1 overflow-y-auto bg-[#0d1017]">
          {activeTab === 'visual' && (
            <div className="grid grid-cols-12 gap-5">
              {/* Left: Cable Cross-Section Graphic & Trench Diagram */}
              <div className="col-span-7 flex flex-col gap-4">
                <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                  <div className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
                    <span>Cable Layer Geometry & Coaxial Radii</span>
                    <span className="text-[10px] text-slate-400">Outer Diam: {(result.r_outermost_mm * 2).toFixed(1)} mm</span>
                  </div>
                  
                  {/* SVG Coaxial Visualizer */}
                  <div className="flex items-center justify-center bg-[#0a0d14] rounded border border-[#1f2838] p-3">
                    <svg viewBox="-120 -120 240 240" className="w-[280px] h-[260px]">
                      {/* Outer Jacket */}
                      <circle cx="0" cy="0" r="100" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                      {/* Armor (if enabled) */}
                      {geom.hasArmor && (
                        <circle cx="0" cy="0" r="88" fill="#334155" stroke="#94a3b8" strokeWidth="3" strokeDasharray="3,3" />
                      )}
                      {/* Bedding */}
                      <circle cx="0" cy="0" r="80" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                      {/* Metallic Sheath */}
                      <circle cx="0" cy="0" r="70" fill="#64748b" stroke="#cbd5e1" strokeWidth="1.5" />
                      {/* Outer Semicon */}
                      <circle cx="0" cy="0" r="62" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                      {/* Main Insulation (XLPE) */}
                      <circle cx="0" cy="0" r="58" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
                      {/* Inner Semicon */}
                      <circle cx="0" cy="0" r="30" fill="#020617" stroke="#1e293b" strokeWidth="1" />
                      {/* Core Conductor (Copper) */}
                      <circle cx="0" cy="0" r="26" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" />

                      {/* Dimension lines and labels */}
                      <line x1="0" y1="0" x2="26" y2="0" stroke="#fcd34d" strokeWidth="1" strokeDasharray="2,2" />
                      <text x="13" y="-3" fill="#fef08a" fontSize="8" textAnchor="middle">r_core</text>

                      <line x1="0" y1="0" x2="0" y2="70" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                      <text x="3" y="45" fill="#cbd5e1" fontSize="8">r_sheath</text>
                    </svg>

                    {/* Legend */}
                    <div className="ml-4 flex flex-col gap-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
                        <span className="text-slate-200">Core Conductor ({geom.coreRadius_mm} mm)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-sky-500/40 border border-sky-400 inline-block shrink-0" />
                        <span className="text-slate-200">XLPE Insulation ({geom.insulationThick_mm} mm)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-400 inline-block shrink-0" />
                        <span className="text-slate-200">Metallic Sheath ({geom.sheathThick_mm} mm)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-700 border border-dashed border-slate-300 inline-block shrink-0" />
                        <span className="text-slate-200">Steel Armor ({geom.hasArmor ? `${geom.armorThick_mm} mm` : 'None'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600 inline-block shrink-0" />
                        <span className="text-slate-200">Serving Jacket ({geom.outerJacketThick_mm} mm)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trench Diagram */}
                <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                  <div className="font-semibold text-slate-200 mb-2">Trench Installation & Soil Depth</div>
                  <div className="bg-[#0a0d14] rounded border border-[#1f2838] p-3 flex items-center justify-center">
                    <svg viewBox="-200 0 400 160" className="w-full h-[140px]">
                      {/* Ground Surface */}
                      <line x1="-180" y1="20" x2="180" y2="20" stroke="#10b981" strokeWidth="2" />
                      <text x="-170" y="15" fill="#34d399" fontSize="9">Ground Surface (Soil Resistivity: {soilResistivity} Ω·m)</text>

                      {/* Cables in Trench */}
                      {cables.map((c) => {
                        const px = c.x_m * 200;

                        const py = 20 + c.depth_m * 80;
                        return (
                          <g key={c.id}>
                            {/* Cable body */}
                            <circle cx={px} cy={py} r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                            <circle cx={px} cy={py} r="5" fill="#f59e0b" />
                            <text x={px} y={py + 24} fill="#e2e8f0" fontSize="9" textAnchor="middle" fontWeight="bold">
                              Phase {c.phase}
                            </text>
                            {/* Depth dimension */}
                            <line x1={px} y1="20" x2={px} y2={py} stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right: Layer Dimensions & Parameters Editor */}
              <div className="col-span-5 flex flex-col gap-4">
                <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                  <div className="font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-sky-400" />
                    <span>Layer Specifications & Materials</span>
                  </div>

                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Core Conductor Radius:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={geom.coreRadius_mm}
                          onChange={(e) => setGeom({ ...geom, coreRadius_mm: Math.max(1, parseFloat(e.target.value) || 15) })}
                          className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-right"
                        />
                        <span className="text-slate-500">mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">XLPE Insulation Thickness:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={geom.insulationThick_mm}
                          onChange={(e) => setGeom({ ...geom, insulationThick_mm: Math.max(1, parseFloat(e.target.value) || 16) })}
                          className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-right"
                        />
                        <span className="text-slate-500">mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Insulation Permittivity (eps_r):</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={geom.insulationEps_r}
                          onChange={(e) => setGeom({ ...geom, insulationEps_r: Math.max(1, parseFloat(e.target.value) || 2.3) })}
                          className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-right"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Metallic Sheath Thickness:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={geom.sheathThick_mm}
                          onChange={(e) => setGeom({ ...geom, sheathThick_mm: Math.max(0.1, parseFloat(e.target.value) || 2.2) })}
                          className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-right"
                        />
                        <span className="text-slate-500">mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Steel Armor Enabled:</span>
                      <input
                        type="checkbox"
                        checked={geom.hasArmor}
                        onChange={(e) => setGeom({ ...geom, hasArmor: e.target.checked })}
                        className="rounded bg-[#1b2230] border-[#2b3952] text-emerald-500 focus:ring-0"
                      />
                    </div>

                    {geom.hasArmor && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Armor Wire Diameter:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={geom.armorThick_mm}
                            onChange={(e) => setGeom({ ...geom, armorThick_mm: Math.max(0.5, parseFloat(e.target.value) || 5) })}
                            className="w-16 bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-1.5 py-0.5 text-right"
                          />
                          <span className="text-slate-500">mm</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Summary Card */}
                <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                  <div className="font-semibold text-slate-200 mb-2.5">Real-Time Sequence Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#0f131d] p-2 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Pos Seq R1:</div>
                      <div className="text-slate-100 font-mono font-bold text-xs">{result.R1.toFixed(4)} Ω/km</div>
                    </div>
                    <div className="bg-[#0f131d] p-2 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Pos Seq X1:</div>
                      <div className="text-slate-100 font-mono font-bold text-xs">{result.X1.toFixed(4)} Ω/km</div>
                    </div>
                    <div className="bg-[#0f131d] p-2 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Pos Seq C1:</div>
                      <div className="text-slate-100 font-mono font-bold text-xs">{(result.C1 * 1e6).toFixed(4)} µF/km</div>
                    </div>
                    <div className="bg-[#0f131d] p-2 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Surge Zc1:</div>
                      <div className="text-slate-100 font-mono font-bold text-xs">{result.Zc1.toFixed(1)} Ω</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matrices' && (
            <div className="space-y-5">
              <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                <div className="font-semibold text-slate-200 mb-2">3x3 Phase Resistance Matrix [R] (Ω/km)</div>
                <MatrixTable matrix={result.R_matrix} decimals={4} unit="Ω/km" />
              </div>

              <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                <div className="font-semibold text-slate-200 mb-2">3x3 Phase Inductance Matrix [L] (mH/km)</div>
                <MatrixTable matrix={result.L_matrix.map(row => row.map(v => v * 1000))} decimals={4} unit="mH/km" />
              </div>

              <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                <div className="font-semibold text-slate-200 mb-2">3x3 Shunt Capacitance Matrix [C] (µF/km)</div>
                <MatrixTable matrix={result.C_matrix.map(row => row.map(v => v * 1e6))} decimals={4} unit="µF/km" />
              </div>
            </div>
          )}

          {activeTab === 'sequence' && (
            <div className="bg-[#141924] border border-[#263147] rounded-lg p-5 space-y-4">
              <div className="font-semibold text-sm text-slate-200">Symmetrical Sequence & Wave Propagation Parameters</div>

              <div className="grid grid-cols-2 gap-4">
                {/* Positive Sequence Card */}
                <div className="bg-[#0f131d] border border-sky-500/30 rounded-lg p-4">
                  <div className="font-bold text-sky-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>Positive Sequence (Z1, C1)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Resistance R1:</span>
                      <span className="font-mono text-slate-200">{result.R1.toFixed(5)} Ω/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Reactance X1:</span>
                      <span className="font-mono text-slate-200">{result.X1.toFixed(5)} Ω/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Inductance L1:</span>
                      <span className="font-mono text-slate-200">{(result.L1 * 1000).toFixed(4)} mH/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Capacitance C1:</span>
                      <span className="font-mono text-slate-200">{(result.C1 * 1e6).toFixed(4)} µF/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Surge Impedance Zc1:</span>
                      <span className="font-mono text-slate-200">{result.Zc1.toFixed(2)} Ω</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Propagation Speed v1:</span>
                      <span className="font-mono text-slate-200">{result.v1_km_s.toFixed(1)} km/s ({((result.v1_km_s / 300000) * 100).toFixed(1)}% c)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Travel Delay tau1 (100km):</span>
                      <span className="font-mono text-slate-200">{result.tau1_ms_per_100km.toFixed(3)} ms</span>
                    </div>
                  </div>
                </div>

                {/* Zero Sequence Card */}
                <div className="bg-[#0f131d] border border-amber-500/30 rounded-lg p-4">
                  <div className="font-bold text-amber-400 mb-3 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>Zero Sequence (Z0, C0)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Resistance R0:</span>
                      <span className="font-mono text-slate-200">{result.R0.toFixed(5)} Ω/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Reactance X0:</span>
                      <span className="font-mono text-slate-200">{result.X0.toFixed(5)} Ω/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Inductance L0:</span>
                      <span className="font-mono text-slate-200">{(result.L0 * 1000).toFixed(4)} mH/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Capacitance C0:</span>
                      <span className="font-mono text-slate-200">{(result.C0 * 1e6).toFixed(4)} µF/km</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Surge Impedance Zc0:</span>
                      <span className="font-mono text-slate-200">{result.Zc0.toFixed(2)} Ω</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#212c3f]">
                      <span className="text-slate-400">Propagation Speed v0:</span>
                      <span className="font-mono text-slate-200">{result.v0_km_s.toFixed(1)} km/s</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Travel Delay tau0 (100km):</span>
                      <span className="font-mono text-slate-200">{result.tau0_ms_per_100km.toFixed(3)} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crossbonding' && (
            <div className="space-y-4">
              <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                <div className="font-semibold text-slate-200 mb-3 flex items-center justify-between">
                  <span>Major Cross-Bonded Section (3 Minor Transposed Sections)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cbResult.isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {cbResult.isBalanced ? 'Balanced Transposition' : `Imbalance: ${cbResult.lengthImbalancePercent}%`}
                  </span>
                </div>

                {/* Section Length Controls */}
                <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Section 1 Length:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cbLengths[0]}
                      onChange={(e) => setCbLengths([parseFloat(e.target.value) || 1.0, cbLengths[1], cbLengths[2]])}
                      className="w-full bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Section 2 Length:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cbLengths[1]}
                      onChange={(e) => setCbLengths([cbLengths[0], parseFloat(e.target.value) || 1.0, cbLengths[2]])}
                      className="w-full bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Section 3 Length:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cbLengths[2]}
                      onChange={(e) => setCbLengths([cbLengths[0], cbLengths[1], parseFloat(e.target.value) || 1.0])}
                      className="w-full bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Load Current (A):</label>
                    <input
                      type="number"
                      value={cbLoadCurrent}
                      onChange={(e) => setCbLoadCurrent(parseFloat(e.target.value) || 800)}
                      className="w-full bg-[#1b2230] border border-[#2b3952] text-slate-200 rounded px-2 py-1"
                    />
                  </div>
                </div>

                {/* Standing Voltage Profile Graph */}
                <div className="bg-[#0a0d14] rounded border border-[#1f2838] p-3">
                  <div className="text-[11px] text-slate-400 mb-2 flex justify-between">
                    <span>Sheath Standing Voltage Profile Vs(x) along route</span>
                    <span className="font-bold text-amber-400">Peak Vs: {cbResult.maxStandingVoltageV} V</span>
                  </div>
                  <svg viewBox="0 0 500 120" className="w-full h-[120px]">
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#1f293d" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#1f293d" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#334155" strokeWidth="1" />

                    {/* Voltage Polyline */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      points={cbResult.standingVoltageProfile.map(pt => {
                        const totalL = cbLengths[0] + cbLengths[1] + cbLengths[2];
                        const px = 40 + (pt.xKm / totalL) * 440;
                        const py = 100 - (pt.phaseA_V / Math.max(1, cbResult.maxStandingVoltageV * 1.15)) * 80;
                        return `${px},${py}`;
                      }).join(' ')}
                    />

                    {/* Joint markers */}
                    <circle cx={40 + (cbLengths[0] / (cbLengths[0] + cbLengths[1] + cbLengths[2])) * 440} cy="100" r="3" fill="#38bdf8" />
                    <circle cx={40 + ((cbLengths[0] + cbLengths[1]) / (cbLengths[0] + cbLengths[1] + cbLengths[2])) * 440} cy="100" r="3" fill="#38bdf8" />
                  </svg>
                </div>

                {/* Sheath Performance Metrics */}
                <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                    <div className="text-slate-400">Circulating Current:</div>
                    <div className="text-emerald-400 font-bold text-sm">{cbResult.sheathCirculatingCurrentA} A</div>
                  </div>
                  <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                    <div className="text-slate-400">Sheath Loss Reduction:</div>
                    <div className="text-emerald-400 font-bold text-sm">{cbResult.sheathLossReductionPercent}% vs Solid</div>
                  </div>
                  <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                    <div className="text-slate-400">SVL Surge Clamping:</div>
                    <div className="text-sky-400 font-bold text-sm">{cbResult.svlClampingVoltageAt10kA_V} V @ 10kA</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium text-xs border-b-2 transition-colors cursor-pointer ${
        active
          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161d2b]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MatrixTable({ matrix, decimals = 4, unit }: { matrix: number[][]; decimals?: number; unit?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className="border-b border-[#1f2838] last:border-0">
              <td className="py-1.5 px-2 text-slate-500 font-sans font-bold w-12">
                Phase {String.fromCharCode(65 + i)}
              </td>
              {row.map((val, k) => (
                <td key={k} className="py-1.5 px-3 text-slate-200 text-right">
                  {val.toFixed(decimals)} {unit && <span className="text-[10px] text-slate-500">{unit}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
