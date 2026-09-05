import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Activity,
  Tag,
  Trash2,
  RotateCw,
  Maximize2,
  TowerControl as Tower,
  Compass,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelRight,
  AppWindow,
} from 'lucide-react';
import type { CircuitComponentData } from '../../types';
import { simulationEngine } from '../../engine/solver';
import { COMPONENT_TYPES } from '../../constants';
import { getDefaultComponentParams } from '../../utils/componentDefaults';
import { ParameterDiagramPreview } from './ParameterDiagramPreview';
import type { InspectorMode } from '../../services/sessionManager';

export interface InspectorProps {
  component: CircuitComponentData | null;
  onUpdateComponent: (comp: CircuitComponentData) => void;
  onDeleteComponent: (id: string) => void;
  onRotateComponent: (deg: number) => void;
  onOpenLCP?: () => void;
  onOpenModal?: (comp: CircuitComponentData) => void;
  inspectorMode?: InspectorMode;
  onToggleInspectorMode?: (mode?: InspectorMode) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ParameterInspector: React.FC<InspectorProps> = ({
  component,
  onUpdateComponent,
  onDeleteComponent,
  onRotateComponent,
  onOpenLCP,
  onOpenModal,
  inspectorMode = 'docked',
  onToggleInspectorMode,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [liveV, setLiveV] = useState<number>(0);
  const [liveI, setLiveI] = useState<number>(0);
  const [showDiagramPreview, setShowDiagramPreview] = useState<boolean>(true);

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

  // Collapsed Sidebar Rail state
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-[#161b26] border-l border-[#263147] items-center py-3 select-none text-xs font-sans w-full justify-between">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggleCollapse}
            title="Expand Parameter Inspector"
            aria-label="Expand Parameter Inspector"
            className="p-1.5 rounded hover:bg-[#263147] text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            onClick={onToggleCollapse}
            className="cursor-pointer writing-mode-vertical text-slate-400 hover:text-slate-200 font-semibold tracking-wider text-[11px] uppercase flex items-center gap-2 py-2"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400 rotate-90" />
            <span>Parameters {component ? `(${component.name})` : ''}</span>
          </div>
        </div>
        {onToggleInspectorMode && (
          <button
            onClick={() => onToggleInspectorMode()}
            title={`Switch to ${inspectorMode === 'docked' ? 'Classic Modal' : 'Modern Docked'} Mode`}
            className="p-1.5 rounded hover:bg-[#263147] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {inspectorMode === 'docked' ? (
              <PanelRight className="w-4 h-4 text-sky-400" />
            ) : (
              <AppWindow className="w-4 h-4 text-amber-400" />
            )}
          </button>
        )}
      </div>
    );
  }

  if (!component) {
    return (
      <div className="flex flex-col h-full bg-[#161b26] border-l border-[#263147] select-none text-xs font-sans">
        <div className="h-7 px-2.5 bg-[#1c2333] border-b border-[#263147] font-semibold text-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Parameter Inspector</span>
          </div>
          <div className="flex items-center gap-1">
            {onToggleInspectorMode && (
              <button
                onClick={() => onToggleInspectorMode()}
                title={`Current Mode: ${inspectorMode === 'docked' ? 'Modern Docked (Single-Click)' : 'Classic PSCAD (Double-Click)'}. Click to switch.`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#161b26] hover:bg-[#263147] border border-[#263147] text-[10px] text-slate-300 hover:text-white transition-colors"
              >
                {inspectorMode === 'docked' ? (
                  <>
                    <PanelRight className="w-3 h-3 text-sky-400" />
                    <span>Docked</span>
                  </>
                ) : (
                  <>
                    <AppWindow className="w-3 h-3 text-amber-400" />
                    <span>Modal</span>
                  </>
                )}
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Collapse Inspector to Rail"
                aria-label="Collapse Inspector"
                className="p-1 rounded hover:bg-[#263147] text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <Sliders className="w-8 h-8 mb-2 opacity-30" />
          <p className="font-medium text-slate-400">No Component Selected</p>
          <p className="text-[11px] mt-1 text-slate-500">
            {inspectorMode === 'docked'
              ? 'Click any component on the schematic canvas to adjust parameters in this dock.'
              : 'Classic PSCAD Mode: Double-click any component to launch the multi-tab parameter dialog.'}
          </p>
          {inspectorMode === 'modal' && onToggleInspectorMode && (
            <button
              onClick={() => onToggleInspectorMode('docked')}
              className="mt-3 px-2.5 py-1 bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 border border-[#1f6feb]/40 rounded text-sky-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <PanelRight className="w-3 h-3" />
              <span>Switch to Modern Docked</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const defaultParams = getDefaultComponentParams(component.type);
  const params = { ...defaultParams, ...(component.params || {}) };

  const handleParamChange = (key: string, value: any) => {
    const updated: CircuitComponentData = {
      ...component,
      params: {
        ...defaultParams,
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
    <div className="flex flex-col h-full bg-[#161b26] border-l border-[#263147] select-none text-xs font-sans overflow-hidden">
      {/* Header - Row 4 */}
      <div className="h-7 px-2.5 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between shrink-0">
        <span className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
          <Tag className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate">Properties: {component.name}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {onToggleInspectorMode && (
            <button
              onClick={() => onToggleInspectorMode()}
              title={`Mode: ${inspectorMode === 'docked' ? 'Modern Docked' : 'Classic PSCAD Modal'}. Click to toggle.`}
              aria-label="Toggle Inspector Mode"
              className="p-1 rounded hover:bg-[#263147] text-slate-300 hover:text-white transition-colors"
            >
              {inspectorMode === 'docked' ? (
                <PanelRight className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <AppWindow className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          )}
          {onOpenModal && (
            <button
              onClick={() => onOpenModal(component)}
              title="Open Full Parameter Modal (Double-Click)"
              aria-label="Open Parameter Modal"
              className="p-1 rounded hover:bg-[#263147] text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
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
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse Inspector to Rail"
              aria-label="Collapse Inspector"
              className="p-1 rounded hover:bg-[#263147] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Phase 21 Step 21.4: Classic PSCAD Modal Notification Banner */}
        {inspectorMode === 'modal' && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-start gap-2 text-amber-200/90 text-[11px]">
            <AppWindow className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span>Classic PSCAD Mode Active</span>
                <span className="text-[9px] px-1 py-0.5 bg-amber-400/20 rounded text-amber-300 font-mono uppercase">Modal</span>
              </div>
              <p className="text-[10.5px] text-amber-200/70 mt-0.5 leading-snug">
                Double-click on canvas or click below to launch the native multi-tab parameter dialog.
              </p>
              {onOpenModal && (
                <button
                  type="button"
                  onClick={() => onOpenModal(component)}
                  className="mt-2 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 font-medium flex items-center gap-1.5 transition-colors text-[11px]"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Open Floating Parameter Dialog</span>
                </button>
              )}
            </div>
          </div>
        )}
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

        {/* Section 1.5: Schematic Illustration Preview */}
        <div>
          <button
            type="button"
            onClick={() => setShowDiagramPreview((prev) => !prev)}
            className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-[#263147] flex items-center justify-between hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Schematic Illustration</span>
            </span>
            {showDiagramPreview ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {showDiagramPreview && (
            <ParameterDiagramPreview
              component={component}
              params={params}
              compact={true}
              className="border-slate-800 mb-2"
            />
          )}
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
              if (key === 'signalName' || key === 'monitored' || key === 'unit' || key === 'customDefId' || key === 'activeProbes') return null;

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
                  ) : key === 'primaryConn' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="Y">Y (Wye)</option>
                      <option value="Yg">Yg / YN (Grounded)</option>
                      <option value="Delta">Delta (Δ Mesh)</option>
                    </select>
                  ) : key === 'secondaryConn' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="Delta">Delta (Δ Mesh)</option>
                      <option value="Y">Y (Wye)</option>
                      <option value="Yg">Yg / yn (Grounded)</option>
                    </select>
                  ) : key === 'coreType' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="3limb">3-Limb Stacked</option>
                      <option value="5limb">5-Limb Return Yoke</option>
                      <option value="shell">Shell-Form Core</option>
                      <option value="bank">3 Single-Phase Units</option>
                    </select>
                  ) : key === 'faultType' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="3PH">3-Phase (A-B-C-G)</option>
                      <option value="1PH_A">Phase A to Ground</option>
                      <option value="1PH_B">Phase B to Ground</option>
                      <option value="1PH_C">Phase C to Ground</option>
                      <option value="2PH_AB">Phase A-B Fault</option>
                      <option value="2PH_BC">Phase B-C Fault</option>
                      <option value="2PH_CA">Phase C-A Fault</option>
                    </select>
                  ) : key === 'displayFormat' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="RMS">RMS</option>
                      <option value="PEAK">Peak</option>
                      <option value="INSTANT">Instantaneous</option>
                    </select>
                  ) : key === 'portDomain' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="electrical">Electrical</option>
                      <option value="control">Control (CSMF)</option>
                    </select>
                  ) : key === 'portDirection' ? (
                    <select
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    >
                      <option value="in">Input (➔)</option>
                      <option value="out">Output (➔)</option>
                      <option value="inout">Bidirectional (↔)</option>
                    </select>
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
                  ) : typeof val === 'string' ? (
                    <input
                      type="text"
                      value={val as string}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="w-36 px-2 py-1 bg-[#0f131c] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                    />
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={val as number}
                      onChange={(e) => handleParamChange(key, isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))}
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
