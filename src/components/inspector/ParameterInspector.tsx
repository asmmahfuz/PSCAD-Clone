import React, { useEffect, useState } from 'react';
import { Sliders, Activity, Tag, Trash2, RotateCw, TowerControl as Tower } from 'lucide-react';
import type { CircuitComponentData } from '../../types';
import { simulationEngine } from '../../engine/solver';
import { COMPONENT_TYPES } from '../../constants';

interface InspectorProps {
  component: CircuitComponentData | null;
  onUpdateComponent: (comp: CircuitComponentData) => void;
  onDeleteComponent: (id: string) => void;
  onRotateComponent: (deg: number) => void;
  onOpenLCP?: () => void;
}

export const ParameterInspector: React.FC<InspectorProps> = ({
  component,
  onUpdateComponent,
  onDeleteComponent,
  onRotateComponent,
  onOpenLCP,
}) => {
  const [liveV, setLiveV] = useState<number>(0);
  const [liveI, setLiveI] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (component) {
        const state = simulationEngine.componentStates.get(component.id);
        if (state) {
          setLiveV(state.prevV || 0);
          setLiveI(state.prevI || 0);
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [component]);

  if (!component) {
    return (
      <div className="flex flex-col h-full bg-[#161b26] border-l border-[#263147] select-none text-xs font-sans">
        <div className="h-7 px-2.5 bg-[#1c2333] border-b border-[#263147] font-semibold text-slate-100 flex items-center gap-1.5 shrink-0">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Parameter Inspector</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <Sliders className="w-8 h-8 mb-2 opacity-30" />
          <p className="font-medium text-slate-400">No Component Selected</p>
          <p className="text-[11px] mt-1 text-slate-500">Click any component on the schematic canvas to adjust parameters and monitor live signals.</p>
        </div>
      </div>
    );
  }

  const params = component.params || {};

  const handleParamChange = (key: string, value: any) => {
    const updated: CircuitComponentData = {
      ...component,
      params: {
        ...component.params,
        [key]: value,
      },
    };
    onUpdateComponent(updated);
  };

  const handleNameChange = (name: string) => {
    onUpdateComponent({ ...component, name });
  };

  return (
    <div className="flex flex-col h-full bg-[#161b26] border-l border-[#263147] select-none text-xs font-sans overflow-y-auto">
      {/* Header - Row 4 */}
      <div className="h-7 px-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between shrink-0">
        <span className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
          <Tag className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate">Properties: {component.name}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={() => onRotateComponent(90)}
            title="Rotate Component 90° (R)"
            aria-label="Rotate Component"
            className="p-1 rounded hover:bg-[#263147] text-slate-300 hover:text-white transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteComponent(component.id)}
            title="Delete Component (Del)"
            aria-label="Delete Component"
            className="p-1 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Section 1: General Info */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-[#263147]">
            General
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">Tag / Name:</label>
              <input
                type="text"
                value={component.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
              />
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Type:</span>
              <span className="font-mono text-slate-300">{component.type}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Rotation:</span>
              <span className="font-mono text-slate-300">{component.rotation}°</span>
            </div>
          </div>
        </div>

        {/* Section 2: Electrical Parameters */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-[#263147] flex items-center justify-between">
            <span>Electrical Parameters</span>
            {(component.type === COMPONENT_TYPES.PI_LINE ||
              component.type === COMPONENT_TYPES.BERGERON_LINE_1PH ||
              component.type === COMPONENT_TYPES.BERGERON_LINE_3PH ||
              component.type === COMPONENT_TYPES.FD_PHASE_LINE) && onOpenLCP && (
              <button
                onClick={onOpenLCP}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <Tower className="w-3 h-3" />
                LCP Studio
              </button>
            )}
          </div>
          <div className="space-y-2">
            {Object.entries(params).map(([key, val]) => {
              if (key === 'signalName' || key === 'monitored' || key === 'unit') return null;

              const isBool = typeof val === 'boolean';
              const label = formatLabel(key);

              return (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-slate-300 truncate max-w-[120px]" title={key}>{label}:</label>
                  {isBool ? (
                    <input
                      type="checkbox"
                      checked={val as boolean}
                      onChange={(e) => handleParamChange(key, e.target.checked)}
                      className="rounded bg-[#0f131c] border-[#263147] text-[#1f6feb] focus:ring-0"
                    />
                  ) : key === 'mathOp' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="sin">sin(u)</option>
                      <option value="cos">cos(u)</option>
                      <option value="tan">tan(u)</option>
                      <option value="asin">asin(u)</option>
                      <option value="acos">acos(u)</option>
                      <option value="atan2">atan2(u1, u2)</option>
                      <option value="ln">ln(u)</option>
                      <option value="log10">log10(u)</option>
                      <option value="exp">exp(u)</option>
                      <option value="sqrt">sqrt(u)</option>
                      <option value="abs">abs(u)</option>
                      <option value="square">u²</option>
                      <option value="inv">1/u</option>
                    </select>
                  ) : key === 'logicOp' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                      <option value="XOR">XOR</option>
                      <option value="NOT">NOT</option>
                      <option value="NAND">NAND</option>
                      <option value="NOR">NOR</option>
                    </select>
                  ) : key === 'minMaxMode' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  ) : key === 'edgeType' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="rising">Rising Edge (0 ➔ 1)</option>
                      <option value="falling">Falling Edge (1 ➔ 0)</option>
                      <option value="both">Both Edges</option>
                    </select>
                  ) : key === 'flipFlopType' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="RS">RS Latch</option>
                      <option value="D">D Flip-Flop</option>
                      <option value="JK">JK Flip-Flop</option>
                      <option value="T">T Flip-Flop</option>
                    </select>
                  ) : key === 'compOp' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="GT">u1 &gt; u2</option>
                      <option value="GTE">u1 ≥ u2</option>
                      <option value="LT">u1 &lt; u2</option>
                      <option value="LTE">u1 ≤ u2</option>
                      <option value="EQ">u1 == u2</option>
                      <option value="NEQ">u1 ≠ u2</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={val as number}
                      onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Telemetry & Monitoring */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-[#263147] flex items-center justify-between">
            <span>Signal Telemetry</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">Signal Tag / Name:</label>
              <input
                type="text"
                placeholder="e.g. V_bus_1"
                value={params.signalName || ''}
                onChange={(e) => handleParamChange('signalName', e.target.value)}
                className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-slate-400">Monitor in Scope:</label>
              <input
                type="checkbox"
                checked={params.monitored || false}
                onChange={(e) => handleParamChange('monitored', e.target.checked)}
                className="rounded bg-[#0f131c] border-[#263147] text-[#1f6feb] focus:ring-0"
              />
            </div>
            <div className="mt-2 p-2 bg-[#0c0f17] border border-[#263147] rounded font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Voltage (Instant):</span>
                <span className="text-sky-400 font-bold">{liveV.toFixed(2)} V</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current (Instant):</span>
                <span className="text-emerald-400 font-bold">{liveI.toFixed(2)} A</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatLabel(key: string): string {
  const map: Record<string, string> = {
    resistance: 'Resistance (Ω)',
    inductance: 'Inductance (H)',
    capacitance: 'Capacitance (F)',
    voltage: 'Nominal V (V)',
    freq: 'Frequency (Hz)',
    phaseDeg: 'Phase Angle (°)',
    rampTime: 'Ramp Time (s)',
    internalRs: 'Internal Rs (Ω)',
    initClosed: 'Initially Closed',
    openTime: 'Trip Time (s)',
    closeTime: 'Reclose Time (s)',
    Ron: 'Ron (Ω)',
    Roff: 'Roff (Ω)',
    lengthKm: 'Length (km)',
    R_per_km: 'R (Ω/km)',
    L_per_km: 'L (H/km)',
    C_per_km: 'C (F/km)',
    R_self_per_km: 'R self (Ω/km)',
    R_mutual_per_km: 'R mutual (Ω/km)',
    L_self_per_km: 'L self (H/km)',
    L_mutual_per_km: 'L mutual (H/km)',
    C_self_per_km: 'C self (F/km)',
    C_mutual_per_km: 'C mutual (F/km)',
    Zc_aerial: 'Zc Aerial (Ω)',
    Zc_ground: 'Zc Ground (Ω)',
    v_aerial: 'v Aerial (km/s)',
    v_ground: 'v Ground (km/s)',
    V1_nom: 'V1 Primary (V)',
    V2_nom: 'V2 Secondary (V)',
    MVA_rating: 'Rating (MVA)',
    enableSaturation: 'Core Saturation',
    kneeFluxPu: 'Knee Flux (pu)',
    faultType: 'Fault Type',
    startTime: 'Start Time (s)',
    duration: 'Duration (s)',
    faultResistance: 'Fault Res (Ω)',
    Xd: 'Xd Sync Reactance (pu)',
    Xq: 'Xq Reactance (pu)',
    Xd_prime: "Xd' Transient (pu)",
    Xq_prime: "Xq' Transient (pu)",
    Xd_pp: "Xd'' Subtransient (pu)",
    Xq_pp: "Xq'' Subtransient (pu)",
    Td0_prime: "Td0' Time Const (s)",
    Td0_pp: "Td0'' Time Const (s)",
    H: 'Inertia Constant H (s)',
    D: 'Damping Factor D',
    AVR_gain: 'AVR Gain',
    H_hp: 'H HP Turbine (s)',
    H_ip: 'H IP Turbine (s)',
    H_lp: 'H LP Turbine (s)',
    H_gen: 'H Generator (s)',
    K_hp_ip: 'K HP-IP (pu/rad)',
    K_ip_lp: 'K IP-LP (pu/rad)',
    K_lp_gen: 'K LP-GEN (pu/rad)',
    coreType: 'Core Geometry',
    primaryConn: 'Pri Connection',
    secondaryConn: 'Sec Connection',
    satSlopeRatio: 'Sat Slope Ratio',
    zeroSeqReluctance: 'Zero-Seq Reluctance',
    windSpeed: 'Wind Speed (m/s)',
    Pref_pu: 'P Ref (pu)',
    Qref_pu: 'Q Ref (pu)',
    // Phase 5 CSMF
    gain: 'Gain (K)',
    offset: 'Offset (b)',
    mathOp: 'Function f(u)',
    logicOp: 'Gate Type',
    threshold: 'Threshold',
    minMaxMode: 'Mode',
    edgeType: 'Edge Type',
    flipFlopType: 'Flip-Flop Type',
    compOp: 'Comparison',
    hysteresisWidth: 'Hysteresis Band',
    limitMin: 'Min Limit',
    limitMax: 'Max Limit',
    rateUp: 'Max Rise (dy/dt)',
    rateDown: 'Max Fall (dy/dt)',
    deadbandWidth: 'Deadband Width',
    backlashGap: 'Backlash Gap',
    pidKp: 'Kp Proportional',
    pidKi: 'Ki Integral',
    pidKd: 'Kd Derivative',
    pidTf: 'Tf Filter (s)',
    pidMin: 'PID Min Limit',
    pidMax: 'PID Max Limit',
    pllFreq: 'Nominal Freq (Hz)',
    pllKp: 'PLL Kp',
    pllKi: 'PLL Ki',
    carrierFreq: 'Carrier Freq (Hz)',
    deadTimeSec: 'Deadtime (s)',
    Cdc_F: 'DC Capacitor (F)',
    V_ref: 'Knee Voltage Vref (V)',
    I_ref: 'Ref Current Iref (A)',
    alpha1: 'Alpha 1 (Leakage)',
    alpha2: 'Alpha 2 (Clamping)',
    alpha3: 'Alpha 3 (Upturn)',
    energyRatingKJ: 'Energy Rating (kJ)',
    Vf: 'Forward Drop Vf (V)',
    Qrr: 'Reverse Recovery Qrr (C)',
    trr: 'Recovery Time trr (s)',
    I_holding: 'Holding Current (A)',
    firingAngleDeg: 'Firing Angle α (°)',
    alphaDeg: 'Alpha Firing Angle (°)',
    gammaMinDeg: 'Min Extinction Gamma (°)',
    numSubmodules: 'Submodules / Arm (N)',
    C_submodule: 'SM Capacitor (F)',
    Vdc_nom: 'Nominal Vdc (V)',
    Pac_ref: 'Active Power P (MW)',
    Qac_ref: 'Reactive Power Q (MVAR)',
    L_arm: 'Arm Inductance (H)',
    R_arm: 'Arm Resistance (Ω)',
    modulationIndex: 'Modulation Index (m)',
    Q_rating_MVAR: 'Reactive Capability (MVAR)',
    V_ac_nom: 'Nominal Vac (V)',
    num_tsc_banks: 'Number of TSC Banks',
    L_tcr: 'TCR Inductance (H)',
    C_tsc: 'TSC Capacitance (F)',
    // Phase 6
    minValue: 'Min Value',
    maxValue: 'Max Value',
    value: 'Current Value',
    step: 'Step Size',
    label: 'Display Label',
    unitLabel: 'Unit Label',
    buttonState: 'Button Pressed',
    switchState: 'Switch Position (ON/OFF)',
    gaugeMin: 'Gauge Min Limit',
    gaugeMax: 'Gauge Max Limit',
    gaugeLowAlarm: 'Gauge Low Alarm',
    gaugeHighAlarm: 'Gauge High Alarm',
    displayFormat: 'Display Format',
    childSheetId: 'Child Sheet ID',
    portDomain: 'Port Domain',
    portDirection: 'Port Direction',
    portDataType: 'Port Signal Type',
  };
  return map[key] || key;
}
