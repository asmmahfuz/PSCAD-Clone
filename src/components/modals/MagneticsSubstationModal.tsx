import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Activity,
  Zap,
  Sliders,
  TrendingUp,
  Shield,
  Radio,
  CheckCircle,
} from 'lucide-react';
import {
  JilesAthertonCore,
  DEFAULT_JA_SILICON_STEEL,
  type JilesAthertonParams,
} from '../../engine/transformers/jilesAtherton';
import {
  OltcTransformer,
  DEFAULT_OLTC_PARAMS,
  type OltcParams,
} from '../../engine/transformers/oltcTransformer';
import {
  TransformerStrayCapacitance,
  DEFAULT_STRAY_PARAMS,
  type StrayCapacitanceParams,
} from '../../engine/transformers/strayCapacitance';
import {
  ZigZagTransformer,
  DEFAULT_ZIGZAG_PARAMS,
  type ZigZagParams,
} from '../../engine/transformers/zigzagTransformer';
import {
  PhaseShiftingTransformer,
  DEFAULT_PST_PARAMS,
  type PhaseShifterParams,
} from '../../engine/transformers/phaseShifter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MagneticsSubstationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'hysteresis' | 'oltc' | 'sfra' | 'substation'>('hysteresis');

  // Tab 1: Jiles-Atherton Hysteresis State
  const [jaParams, setJaParams] = useState<JilesAthertonParams>({ ...DEFAULT_JA_SILICON_STEEL });
  const [hMax, setHMax] = useState<number>(3000);
  const [initialBr] = useState<number>(1.1);



  // Tab 2: OLTC State
  const [oltcParams, setOltcParams] = useState<OltcParams>({ ...DEFAULT_OLTC_PARAMS });
  const [oltcManualTap, setOltcManualTap] = useState<number>(0);

  // Tab 3: SFRA State
  const [strayParams] = useState<StrayCapacitanceParams>({ ...DEFAULT_STRAY_PARAMS });
  const [sfraFaultType, setSfraFaultType] = useState<'healthy' | 'core_displacement' | 'winding_deformation' | 'bushing_degradation'>('healthy');

  // Tab 4: Substation State
  const [zigzagParams, setZigzagParams] = useState<ZigZagParams>({ ...DEFAULT_ZIGZAG_PARAMS });
  const [pstParams] = useState<PhaseShifterParams>({ ...DEFAULT_PST_PARAMS });
  const [pstTap, setPstTap] = useState<number>(8); // +8 tap = ~+15 deg


  // --- Compute Tab 1: B-H Loop ---
  const { bhLoop, bhLoss, inrushWaveforms } = useMemo(() => {
    const core = new JilesAthertonCore('UI_JA', jaParams);
    const loop = core.generateHysteresisLoop(hMax, 300);
    const loss = core.calculateCycleLoss(loop);

    // Compute inrush comparison
    const stateRem = core.initState(initialBr);
    const stateDemag = core.initState(0.0);
    const dt = 50e-6;
    const time: number[] = [];
    const iRemArr: number[] = [];
    const iDemArr: number[] = [];

    for (let step = 0; step < 400; step++) {
      const t = step * dt;
      const vAc = 3200.0 * Math.sin(2 * Math.PI * 60 * t);
      const iR = core.updateEMTStep(vAc, dt, stateRem);
      const iD = core.updateEMTStep(vAc, dt, stateDemag);
      time.push(t * 1000); // ms
      iRemArr.push(iR);
      iDemArr.push(iD);
    }

    return {
      bhLoop: loop,
      bhLoss: loss,
      inrushWaveforms: { time, iRemArr, iDemArr },
    };
  }, [jaParams, hMax, initialBr]);

  // --- Compute Tab 2: OLTC & AVR ---
  const { oltcCurrentRatio, oltcVoltageSec, oltcStepResponse } = useMemo(() => {
    const oltc = new OltcTransformer('UI_OLTC', oltcParams);
    const state = oltc.initState();
    state.currentTap = oltcManualTap;
    const ratioFactor = 1.0 + (oltcManualTap * oltcParams.stepPercent) / 100.0;
    const currentRatio = oltc.baseRatio / ratioFactor;
    const secV = (oltcParams.V1_nom / currentRatio);

    // Step load voltage regulation trace
    const time: number[] = [];
    const vTrace: number[] = [];
    const tapTrace: number[] = [];
    const simOltc = new OltcTransformer('UI_AVR_SIM', { ...oltcParams, delayTime: 1.5, t_mechDelay: 1.0 });
    const simState = simOltc.initState();

    for (let i = 0; i < 400; i++) {
      const t = i * 0.02; // 8 seconds total
      let loadV = oltcParams.V2_nom;
      if (t > 1.0 && t < 7.0) {
        loadV *= 0.93; // 7% voltage sag from load step
      }
      simOltc.stepController(0.02, simState, loadV, 400);
      time.push(t);
      vTrace.push(simState.V_meas_pu * (1.0 + (simState.currentTap * oltcParams.stepPercent) / 100.0));
      tapTrace.push(simState.currentTap);
    }

    return {
      oltcCurrentRatio: currentRatio,
      oltcVoltageSec: secV,
      oltcStepResponse: { time, vTrace, tapTrace },
    };
  }, [oltcParams, oltcManualTap]);

  // --- Compute Tab 3: SFRA Curves ---
  const { sfraBenchmark, sfraActive } = useMemo(() => {
    const stray = new TransformerStrayCapacitance('UI_SFRA', strayParams);
    const benchmark = stray.computeSFRA(20, 2e6, 250, 'healthy');
    const active = stray.computeSFRA(20, 2e6, 250, sfraFaultType);
    return {
      sfraBenchmark: benchmark,
      sfraActive: active,
    };
  }, [strayParams, sfraFaultType]);


  // --- Compute Tab 4: Zig-Zag & PST ---
  const { zigzagSeq, pstAngle, pstPowerFlow } = useMemo(() => {
    const zz = new ZigZagTransformer('UI_ZZ', zigzagParams);
    const seq = zz.getSequenceImpedances();

    const pst = new PhaseShiftingTransformer('UI_PST', pstParams);
    const pstState = pst.initState();
    pst.setTap(pstState, pstTap);

    const deltaDeg = 6.0;
    const P_flow = pst.calculateTheoreticalPowerFlow(
      pstParams.V_nom_kV * 1e3,
      pstParams.V_nom_kV * 1e3,
      35.0,
      deltaDeg,
      pstState
    );

    // Power sweep curve vs angle
    const angleArr: number[] = [];
    const pArr: number[] = [];
    for (let a = -30; a <= 30; a += 2) {
      const tempState = pst.initState();
      tempState.phaseAngleDeg = a;
      const p = pst.calculateTheoreticalPowerFlow(pstParams.V_nom_kV * 1e3, pstParams.V_nom_kV * 1e3, 35.0, deltaDeg, tempState);
      angleArr.push(a);
      pArr.push(p);
    }

    return {
      zigzagSeq: seq,
      pstAngle: pstState.phaseAngleDeg,
      pstPowerFlow: { P_flow, angleArr, pArr },
    };
  }, [zigzagParams, pstParams, pstTap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#1e222b] border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60 bg-[#161920]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                Advanced Magnetics, Hysteresis & Substation Studio
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Phase 14
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Jiles-Atherton $B-H$ Hysteresis • Motorized OLTC & AVR • Stray Capacitance SFRA • Zig-Zag & Phase Shifters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700/60 bg-[#191d26] px-6">
          <button
            onClick={() => setActiveTab('hysteresis')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'hysteresis'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Jiles-Atherton $B-H$ Hysteresis
          </button>
          <button
            onClick={() => setActiveTab('oltc')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'oltc'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Motorized OLTC & AVR Regulators
          </button>
          <button
            onClick={() => setActiveTab('sfra')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'sfra'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            HF Stray Capacitance & SFRA (20Hz - 2MHz)
          </button>
          <button
            onClick={() => setActiveTab('substation')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'substation'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Zig-Zag & Phase Shifters (PST)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#161820] space-y-6">
          {/* TAB 1: JILES-ATHERTON HYSTERESIS */}
          {activeTab === 'hysteresis' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Parameter Sliders */}
              <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  J-A Core Physical Parameters
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Saturation Magnetization (Ms):</span>
                      <span className="font-mono text-amber-300">{(jaParams.Ms * 1e-6).toFixed(2)} MA/m</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.2"
                      step="0.05"
                      value={jaParams.Ms * 1e-6}
                      onChange={(e) => setJaParams({ ...jaParams, Ms: parseFloat(e.target.value) * 1e6 })}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Domain Density Parameter (a):</span>
                      <span className="font-mono text-amber-300">{jaParams.a} A/m</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="2500"
                      step="50"
                      value={jaParams.a}
                      onChange={(e) => setJaParams({ ...jaParams, a: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Pinning Energy (k):</span>
                      <span className="font-mono text-amber-300">{jaParams.k} A/m</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1200"
                      step="25"
                      value={jaParams.k}
                      onChange={(e) => setJaParams({ ...jaParams, k: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Interdomain Coupling (α):</span>
                      <span className="font-mono text-amber-300">{(jaParams.alpha * 1e3).toFixed(2)} ×10⁻³</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={jaParams.alpha * 1e3}
                      onChange={(e) => setJaParams({ ...jaParams, alpha: parseFloat(e.target.value) * 1e-3 })}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Reversible Coefficient (c):</span>
                      <span className="font-mono text-amber-300">{jaParams.c.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.60"
                      step="0.01"
                      value={jaParams.c}
                      onChange={(e) => setJaParams({ ...jaParams, c: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Excitation Peak Field (Hmax):</span>
                      <span className="font-mono text-amber-300">{hMax} A/m</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="6000"
                      step="100"
                      value={hMax}
                      onChange={(e) => setHMax(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Metric Summary */}
                <div className="pt-3 border-t border-gray-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#171a22] p-2 rounded-lg border border-gray-700/40">
                    <div className="text-gray-400">Cycle Loss ∮HdB</div>
                    <div className="text-sm font-bold text-amber-400 font-mono">
                      {bhLoss.toFixed(1)} <span className="text-[10px] text-gray-400">J/m³</span>
                    </div>
                  </div>
                  <div className="bg-[#171a22] p-2 rounded-lg border border-gray-700/40">
                    <div className="text-gray-400">Core Remanence</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {initialBr.toFixed(2)} <span className="text-[10px] text-gray-400">Tesla</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center & Right Column: B-H Loop & Inrush Plots */}
              <div className="lg:col-span-2 space-y-6">
                {/* B-H Curve Canvas */}
                <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      Dynamic B-H Ferromagnetic Hysteresis Loop
                    </h4>
                    <span className="text-[11px] text-gray-400 font-mono">
                      B_max: {Math.max(...bhLoop.B).toFixed(2)} T | H_max: {hMax} A/m
                    </span>
                  </div>

                  <div className="h-64 w-full bg-[#14161d] rounded-lg p-2 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                    <svg viewBox="-3500 -2.5 7000 5.0" className="w-full h-full transform scale-y-[-1]">
                      {/* Grid Lines */}
                      <line x1="-3500" y1="0" x2="3500" y2="0" stroke="#374151" strokeWidth="20" />
                      <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#374151" strokeWidth="20" />

                      {/* B-H Hysteresis Path */}
                      <path
                        d={bhLoop.H.map((h, i) => `${i === 0 ? 'M' : 'L'} ${h} ${bhLoop.B[i]}`).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="45"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {/* Labels */}
                    <div className="absolute top-2 right-4 text-[10px] text-gray-400 font-mono">+B (Tesla)</div>
                    <div className="absolute bottom-2 right-4 text-[10px] text-gray-400 font-mono">+H (A/m)</div>
                    <div className="absolute top-2 left-4 text-[10px] text-amber-400 font-mono">
                      Silicon Steel Core (Grain-Oriented)
                    </div>
                  </div>
                </div>

                {/* Inrush Current Waveform */}
                <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-400" />
                      Transformer Energization Inrush Current Waveform (With Trapped Residual Flux)
                    </h4>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-orange-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                        Trapped Br ({initialBr} T)
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                        Demagnetized
                      </span>
                    </div>
                  </div>

                  <div className="h-44 w-full bg-[#14161d] rounded-lg p-2 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                    <svg viewBox="0 -80 20 160" className="w-full h-full transform scale-y-[-1]" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="20" y2="0" stroke="#374151" strokeWidth="0.5" />
                      {/* Demag trace */}
                      <path
                        d={inrushWaveforms.time.map((t, i) => `${i === 0 ? 'M' : 'L'} ${t} ${inrushWaveforms.iDemArr[i] * 0.1}`).join(' ')}
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="0.8"
                        strokeDasharray="1,1"
                      />
                      {/* Remanent Inrush trace */}
                      <path
                        d={inrushWaveforms.time.map((t, i) => `${i === 0 ? 'M' : 'L'} ${t} ${inrushWaveforms.iRemArr[i] * 0.1}`).join(' ')}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOTORIZED OLTC & AVR */}
          {activeTab === 'oltc' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: OLTC Controls */}
              <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  OLTC Mechanism & AVR Settings
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Current Active Tap Position:</span>
                      <span className="font-mono text-cyan-300 font-bold">{oltcManualTap > 0 ? `+${oltcManualTap}` : oltcManualTap}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOltcManualTap(Math.max(oltcParams.minTap, oltcManualTap - 1))}
                        className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 font-bold"
                      >
                        LOWER (-)
                      </button>
                      <button
                        onClick={() => setOltcManualTap(0)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400"
                      >
                        0
                      </button>
                      <button
                        onClick={() => setOltcManualTap(Math.min(oltcParams.maxTap, oltcManualTap + 1))}
                        className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold"
                      >
                        RAISE (+)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Step Size per Tap (%):</span>
                      <span className="font-mono text-cyan-300">{oltcParams.stepPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.125"
                      value={oltcParams.stepPercent}
                      onChange={(e) => setOltcParams({ ...oltcParams, stepPercent: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>AVR Regulating Deadband (±%):</span>
                      <span className="font-mono text-cyan-300">{(oltcParams.deadband_pu * 100).toFixed(2)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.25"
                      value={oltcParams.deadband_pu * 100}
                      onChange={(e) => setOltcParams({ ...oltcParams, deadband_pu: parseFloat(e.target.value) / 100 })}
                      className="w-full accent-cyan-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Motor Mechanical Transit Delay:</span>
                      <span className="font-mono text-cyan-300">{oltcParams.t_mechDelay} s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.5"
                      value={oltcParams.t_mechDelay}
                      onChange={(e) => setOltcParams({ ...oltcParams, t_mechDelay: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* State Card */}
                <div className="pt-3 border-t border-gray-700/60 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Effective Turns Ratio:</span>
                    <span className="font-mono text-cyan-300 font-bold">{oltcCurrentRatio.toFixed(4)} : 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Secondary Output Voltage:</span>
                    <span className="font-mono text-emerald-400 font-bold">{(oltcVoltageSec / 1e3).toFixed(2)} kV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transition Resistor (R_trans):</span>
                    <span className="font-mono text-gray-300">{oltcParams.R_trans} Ω (50ms Bridging)</span>
                  </div>
                </div>
              </div>

              {/* Right: Step Load Regulation Waveform */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      Closed-Loop Automatic Voltage Regulation (AVR) Step Response
                    </h4>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      ANSI 90 Regulating Relay Loop
                    </span>
                  </div>

                  <div className="h-64 w-full bg-[#14161d] rounded-lg p-2 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                    <svg viewBox="0 0.85 8 0.25" className="w-full h-full transform scale-y-[-1]" preserveAspectRatio="none">
                      {/* Deadband envelope */}
                      <rect x="0" y={1.0 - oltcParams.deadband_pu} width="8" height={2 * oltcParams.deadband_pu} fill="#06b6d4" opacity="0.1" />
                      <line x1="0" y1="1.0" x2="8" y2="1.0" stroke="#06b6d4" strokeWidth="0.002" strokeDasharray="0.1,0.1" />

                      {/* Regulated Voltage Trace */}
                      <path
                        d={oltcStepResponse.time.map((t, i) => `${i === 0 ? 'M' : 'L'} ${t} ${oltcStepResponse.vTrace[i]}`).join(' ')}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="0.005"
                      />
                    </svg>

                    <div className="absolute top-2 left-4 text-[10px] text-cyan-400 font-mono">
                      Secondary Voltage (pu) with Automatic Tap Raising
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>t = 0.0 s (Nominal 1.0 pu)</span>
                    <span className="text-amber-400">t = 1.0 s (Step Load Sag → AVR Timer Integrates)</span>
                    <span className="text-emerald-400">t = 2.5 s (Tap Raised → Voltage Restored)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SFRA ANALYZER */}
          {activeTab === 'sfra' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: SFRA Controls & Fault Injection */}
              <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  SFRA Diagnostic Diagnostics
                </h3>

                <div className="space-y-2 text-xs">
                  <label className="text-gray-300 font-semibold">Diagnostic Condition Mode:</label>
                  {[
                    { id: 'healthy', label: 'Healthy Benchmark Base', color: 'text-emerald-400' },
                    { id: 'core_displacement', label: 'Core Grounding / Shift (< 2 kHz)', color: 'text-amber-400' },
                    { id: 'winding_deformation', label: 'Radial Winding Deformation (2-100 kHz)', color: 'text-rose-400' },
                    { id: 'bushing_degradation', label: 'Bushing / Lead Degradation (> 100 kHz)', color: 'text-purple-400' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSfraFaultType(item.id as any)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        sfraFaultType === item.id
                          ? 'bg-purple-500/20 border-purple-500/50 text-white font-medium'
                          : 'bg-[#171a22] border-gray-700/40 text-gray-400 hover:bg-gray-700/30'
                      }`}
                    >
                      <div className={item.color}>{item.label}</div>
                    </button>
                  ))}
                </div>

                {/* Bushing Details */}
                <div className="pt-3 border-t border-gray-700/60 space-y-2 text-xs">
                  <div className="text-gray-300 font-semibold">Condenser Bushing Parameters:</div>
                  <div className="flex justify-between text-gray-400">
                    <span>Main Core (C1):</span>
                    <span className="font-mono text-purple-300">{(strayParams.C1_bushing * 1e12).toFixed(0)} pF</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Test Tap (C2):</span>
                    <span className="font-mono text-purple-300">{(strayParams.C2_bushing * 1e12).toFixed(0)} pF</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Dissipation Factor (tan δ):</span>
                    <span className="font-mono text-purple-300">{(strayParams.tanDelta * 100).toFixed(2)} %</span>
                  </div>
                </div>
              </div>

              {/* Right: SFRA Bode Plot */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      Swept Frequency Response Analysis (SFRA) Transfer Function H(jω) [dB]
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Healthy
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Active Trace
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full bg-[#14161d] rounded-lg p-2 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                    <svg viewBox="1.3 -70 5.0 80" className="w-full h-full transform scale-y-[-1]" preserveAspectRatio="none">
                      {/* Grid bands */}
                      <rect x="1.3" y="-70" width="2.0" height="80" fill="#f59e0b" opacity="0.05" />
                      <rect x="3.3" y="-70" width="1.7" height="80" fill="#ec4899" opacity="0.05" />
                      <rect x="5.0" y="-70" width="1.3" height="80" fill="#a855f7" opacity="0.05" />

                      {/* Healthy Benchmark trace */}
                      <path
                        d={sfraBenchmark.frequencies.map((f, i) => `${i === 0 ? 'M' : 'L'} ${Math.log10(f)} ${sfraBenchmark.magnitudeDb[i]}`).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="0.06"
                        strokeDasharray="0.1,0.1"
                      />
                      {/* Active trace */}
                      <path
                        d={sfraActive.frequencies.map((f, i) => `${i === 0 ? 'M' : 'L'} ${Math.log10(f)} ${sfraActive.magnitudeDb[i]}`).join(' ')}
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="0.09"
                      />
                    </svg>

                    <div className="absolute top-2 left-4 text-[10px] text-amber-400 font-mono">Core Band (&lt;2 kHz)</div>
                    <div className="absolute top-2 left-1/3 text-[10px] text-pink-400 font-mono">Winding Band (2-100 kHz)</div>
                    <div className="absolute top-2 right-4 text-[10px] text-purple-400 font-mono">Bushing/Lead Band (&gt;100 kHz)</div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-400">
                    <div className="bg-[#171a22] p-2 rounded border border-gray-700/40">
                      <div className="text-amber-400 font-semibold">Low Frequency Band</div>
                      <div>Detects core deformation, residual magnetics, and open coils.</div>
                    </div>
                    <div className="bg-[#171a22] p-2 rounded border border-gray-700/40">
                      <div className="text-pink-400 font-semibold">Mid Frequency Band</div>
                      <div>Detects axial/radial winding displacement and hoop buckling.</div>
                    </div>
                    <div className="bg-[#171a22] p-2 rounded border border-gray-700/40">
                      <div className="text-purple-400 font-semibold">High Frequency Band</div>
                      <div>Detects bushing moisture, tap faults, and stray capacitance shifts.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ZIG-ZAG & PHASE SHIFTERS */}
          {activeTab === 'substation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Zig-Zag Grounding Card */}
              <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Zig-Zag (Zn) Grounding Transformer Unit
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Neutral Grounding Resistor (NGR):</span>
                      <span className="font-mono text-emerald-300">{zigzagParams.R_neutral} Ω</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="2"
                      value={zigzagParams.R_neutral}
                      onChange={(e) => setZigzagParams({ ...zigzagParams, R_neutral: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="bg-[#171a22] p-3 rounded-lg border border-gray-700/40 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Positive-Sequence Impedance (Z1):</span>
                      <span className="font-mono text-emerald-300 font-bold">{zigzagSeq.Z1_mag.toFixed(1)} Ω</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Zero-Sequence Impedance (Z0):</span>
                      <span className="font-mono text-cyan-300 font-bold">{zigzagSeq.Z0_mag.toFixed(1)} Ω</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sequence Ratio (Z1 / Z0):</span>
                      <span className="font-mono text-amber-400 font-bold">{zigzagSeq.ratio_Z1_over_Z0.toFixed(1)}x</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    The Zig-Zag winding cancels zero-sequence flux on each limb, providing a low-impedance ground return path for SLG faults while presenting high magnetizing impedance to normal 3-phase voltages.
                  </p>
                </div>
              </div>

              {/* Quadrature Booster PST Card */}
              <div className="bg-[#1f232d] border border-gray-700/60 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Quadrature Booster Phase Shifting Transformer (PST)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Phase Shift Angle (α):</span>
                      <span className="font-mono text-orange-300 font-bold">{pstAngle.toFixed(2)}° (Tap {pstTap})</span>
                    </div>
                    <input
                      type="range"
                      min="-16"
                      max="16"
                      step="1"
                      value={pstTap}
                      onChange={(e) => setPstTap(parseInt(e.target.value))}
                      className="w-full accent-orange-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="bg-[#171a22] p-3 rounded-lg border border-gray-700/40 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Power Flow (P_12):</span>
                      <span className="font-mono text-orange-300 font-bold">{pstPowerFlow.P_flow.toFixed(1)} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Throughput Rating:</span>
                      <span className="font-mono text-gray-300">{pstParams.MVA_rating} MVA @ {pstParams.V_nom_kV} kV</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    By injecting a quadrature voltage vector orthogonal to the bus voltage, the PST adjusts transmission power flow across parallel corridors without requiring line reconductoring.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700/60 bg-[#161920] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>EMTDC Companion Stamping & Analytical Standards Verified</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
