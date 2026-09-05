/**
 * PSCAD CLONE - Dedicated Multi-Tab Component Parameter Modal
 * Phase 21 - Step 21.1: Multi-Tab Component Parameter Dialogs & Units Engine
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sliders,
  Settings,
  Activity,
  BookOpen,
  Check,
  RotateCw,
  Trash2,
  TowerControl as Tower,
  Zap,
  Info,
  RotateCcw,
  Search,
  AlertTriangle,
  AlertCircle,
  Compass,
  GitBranch,
  PanelRight,
} from 'lucide-react';
import type { CircuitComponentData, Pin } from '../../types';
import { COMPONENT_TYPES } from '../../constants';
import { getDefaultComponentParams } from '../../utils/componentDefaults';
import { simulationEngine } from '../../engine/solver';
import { getComponentPins } from '../../engine/netlist';
import { getCompanionModelTheory, type CompanionModelTheory } from './companionTheory';
import { ParameterDiagramPreview } from './ParameterDiagramPreview';
import {
  ENGINEERING_UNITS,
  PARAM_CATEGORY_MAP,
  parseEngineeringInput,
  getBestUnit,
  formatDisplayValue,
  validateParameter,
  type ValidationResult,
} from '../../utils/engineeringUnits';

export interface ComponentParameterModalProps {
  isOpen: boolean;
  component: CircuitComponentData | null;
  onClose: () => void;
  onSave: (updated: CircuitComponentData) => void;
  onApply?: (updated: CircuitComponentData) => void;
  onDelete?: (id: string) => void;
  onRotate?: (deg: number) => void;
  onOpenLCP?: () => void;
  onDockToSidebar?: (updated: CircuitComponentData) => void;
}

type ModalTab = 'config' | 'params' | 'monitoring' | 'theory';

export const ComponentParameterModal: React.FC<ComponentParameterModalProps> = ({
  isOpen,
  component,
  onClose,
  onSave,
  onApply,
  onDelete,
  onRotate,
  onOpenLCP,
  onDockToSidebar,
}) => {
  if (!isOpen || !component) return null;

  const [activeTab, setActiveTab] = useState<ModalTab>('config');
  const [draftName, setDraftName] = useState<string>(component.name);
  const [draftParams, setDraftParams] = useState<Record<string, any>>(() => ({
    ...getDefaultComponentParams(component.type),
    ...(component.params || {}),
  }));
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [paramFilter, setParamFilter] = useState<string>('');
  const [showDiagramInParams, setShowDiagramInParams] = useState<boolean>(false);

  // Engineering units & input state
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>({});
  const [inputTexts, setInputTexts] = useState<Record<string, string>>({});

  // Live simulation telemetry state
  const [liveV, setLiveV] = useState<number>(0);
  const [liveI, setLiveI] = useState<number>(0);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(simulationEngine.isRunning);

  // Sync display units and input texts from parameters
  const syncDisplayState = useCallback((params: Record<string, any>) => {
    const units: Record<string, string> = {};
    const texts: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      const category = PARAM_CATEGORY_MAP[key] || 'none';
      if (category !== 'none' && typeof val === 'number') {
        const best = getBestUnit(val, category);
        units[key] = best.symbol;
        texts[key] = formatDisplayValue(val, best.multiplier);
      } else if (typeof val === 'number') {
        texts[key] = String(val);
      }
    }
    setDisplayUnits(units);
    setInputTexts(texts);
  }, []);

  // Sync draft state whenever a different component is loaded
  useEffect(() => {
    if (component) {
      setDraftName(component.name);
      const p = {
        ...getDefaultComponentParams(component.type),
        ...(component.params || {}),
      };
      setDraftParams(p);
      syncDisplayState(p);
      setIsDirty(false);
    }
  }, [component.id, syncDisplayState]);

  // Real-time physical validation of draft parameters
  const validationIssues = useMemo(() => {
    const issues: Record<string, ValidationResult> = {};
    for (const [key, val] of Object.entries(draftParams)) {
      if (typeof val === 'number') {
        const res = validateParameter(key, val, component?.type);
        if (res.severity !== 'none') {
          issues[key] = res;
        }
      }
    }
    return issues;
  }, [draftParams, component?.type]);

  const errorCount = useMemo(() => {
    return Object.values(validationIssues).filter((i) => i.severity === 'error').length;
  }, [validationIssues]);

  const warningCount = useMemo(() => {
    return Object.values(validationIssues).filter((i) => i.severity === 'warning').length;
  }, [validationIssues]);

  const hasFatalErrors = errorCount > 0;

  // Numeric text change with instant engineering suffix & scientific notation parsing
  const handleNumericTextChange = (key: string, rawText: string) => {
    setInputTexts((prev) => ({ ...prev, [key]: rawText }));
    setIsDirty(true);

    const category = PARAM_CATEGORY_MAP[key] || 'none';
    const currentSymbol = displayUnits[key];
    const unitOptions = ENGINEERING_UNITS[category] || [];
    const currentOpt = unitOptions.find((o) => o.symbol === currentSymbol) || unitOptions[0];
    const activeMultiplier = currentOpt ? currentOpt.multiplier : 1;

    const parseResult = parseEngineeringInput(rawText, category, activeMultiplier);
    if (parseResult.success) {
      if (parseResult.matchedUnit && parseResult.matchedUnit !== currentSymbol) {
        setDisplayUnits((prev) => ({ ...prev, [key]: parseResult.matchedUnit! }));
      }
      setDraftParams((prev) => ({ ...prev, [key]: parseResult.value }));
    }
  };

  const handleNumericBlur = (key: string) => {
    const category = PARAM_CATEGORY_MAP[key] || 'none';
    const val = draftParams[key];
    if (typeof val === 'number' && !isNaN(val)) {
      const currentSymbol = displayUnits[key];
      const unitOptions = ENGINEERING_UNITS[category] || [];
      const currentOpt = unitOptions.find((o) => o.symbol === currentSymbol) || unitOptions[0];
      const multiplier = currentOpt ? currentOpt.multiplier : 1;
      setInputTexts((prev) => ({ ...prev, [key]: formatDisplayValue(val, multiplier) }));
    }
  };

  const handleUnitChange = (key: string, newSymbol: string) => {
    const category = PARAM_CATEGORY_MAP[key] || 'none';
    const unitOptions = ENGINEERING_UNITS[category] || [];
    const newOpt = unitOptions.find((o) => o.symbol === newSymbol);
    if (!newOpt) return;

    setDisplayUnits((prev) => ({ ...prev, [key]: newSymbol }));
    setIsDirty(true);

    const currentBaseVal = draftParams[key];
    if (typeof currentBaseVal === 'number' && !isNaN(currentBaseVal)) {
      setInputTexts((prev) => ({
        ...prev,
        [key]: formatDisplayValue(currentBaseVal, newOpt.multiplier),
      }));
    }
  };

  // Subscribe to live telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSimRunning(simulationEngine.isRunning);
      if (component) {
        const state = simulationEngine.componentStates.get(component.id);
        if (state) {
          setLiveV(state.prevV || 0);
          setLiveI(state.prevI || 0);
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [component.id]);

  // Keyboard shortcut listener (Escape to close, Ctrl+Enter / Enter to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!hasFatalErrors) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftName, draftParams, component, hasFatalErrors]);

  // Get EMTDC companion model theory and equations
  const theory: CompanionModelTheory = useMemo(() => {
    return getCompanionModelTheory(component, 50e-6);
  }, [component]);

  // Get component pins
  const pins: Pin[] = useMemo(() => {
    return getComponentPins(component);
  }, [component]);

  // Active probes set in draft
  const activeProbes: Set<string> = useMemo(() => {
    const p = draftParams.activeProbes;
    if (Array.isArray(p)) return new Set(p);
    return new Set();
  }, [draftParams.activeProbes]);

  const handleParamChange = (key: string, value: any) => {
    setDraftParams((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsDirty(true);
  };

  const handleProbeToggle = (probeId: string, defaultName: string) => {
    const nextSet = new Set(activeProbes);
    if (nextSet.has(probeId)) {
      nextSet.delete(probeId);
    } else {
      nextSet.add(probeId);
      // Auto-populate signal name if blank
      if (!draftParams.signalName) {
        setDraftParams((prev) => ({ ...prev, signalName: defaultName }));
      }
    }
    setDraftParams((prev) => ({
      ...prev,
      activeProbes: Array.from(nextSet),
    }));
    setIsDirty(true);
  };

  const buildUpdatedComponent = useCallback((): CircuitComponentData => {
    return {
      ...component,
      name: draftName.trim() || component.name,
      params: {
        ...draftParams,
      },
    };
  }, [component, draftName, draftParams]);

  const handleApply = () => {
    const updated = buildUpdatedComponent();
    onApply?.(updated);
    setIsDirty(false);
  };

  const handleSave = () => {
    const updated = buildUpdatedComponent();
    onSave(updated);
    setIsDirty(false);
    onClose();
  };

  const handleResetDefaults = () => {
    setDraftName(component.name);
    const p = {
      ...getDefaultComponentParams(component.type),
      ...(component.params || {}),
    };
    setDraftParams(p);
    syncDisplayState(p);
    setIsDirty(false);
  };

  // Live Power calculations
  const liveP = liveV * liveI;
  const liveS = Math.abs(liveV * liveI);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div
        className="flex flex-col w-[850px] max-w-full max-h-[90vh] bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl overflow-hidden font-sans text-xs text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parameter-modal-title"
      >
        {/* Titlebar Header */}
        <div className="h-10 px-4 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1 rounded bg-sky-950/60 border border-sky-600/40 text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span id="parameter-modal-title" className="font-semibold text-sm text-slate-100 truncate">
                Component Properties: {draftName}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0f131c] border border-[#263147] text-sky-400">
                {component.type}
              </span>
              {isDirty && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onRotate && (
              <button
                onClick={() => onRotate(90)}
                title="Rotate Component 90° (R)"
                className="p-1.5 rounded hover:bg-[#263147] text-slate-400 hover:text-white transition-colors"
                aria-label="Rotate component"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(component.id);
                  onClose();
                }}
                title="Delete Component (Del)"
                className="p-1.5 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
                aria-label="Delete component"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {onDockToSidebar && (
              <button
                onClick={() => {
                  const updated: CircuitComponentData = {
                    ...component,
                    name: draftName,
                    params: draftParams,
                  };
                  onDockToSidebar(updated);
                }}
                title="Dock to Sidebar Inspector (Switch to Modern Docked Mode)"
                className="p-1.5 rounded hover:bg-[#263147] text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 text-[11px]"
                aria-label="Dock to sidebar inspector"
              >
                <PanelRight className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Dock</span>
              </button>
            )}
            <div className="h-4 w-[1px] bg-[#263147] mx-1" />
            <button
              onClick={onClose}
              title="Close Dialog (Esc)"
              className="p-1.5 rounded hover:bg-[#263147] text-slate-400 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="h-9 px-3 bg-[#131722] border-b border-[#263147] flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'config'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'params'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameters</span>
            {errorCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-red-400 border border-red-500/50 text-[9px] font-bold">
                {errorCount}
              </span>
            ) : warningCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 border border-amber-500/50 text-[9px] font-bold">
                {warningCount}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'monitoring'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monitoring & Signals</span>
            {draftParams.monitored && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === 'theory'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Help & Theory</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#11151f] space-y-4 min-h-[380px]">
          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* General Metadata */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>General Identification</span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {component.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Component Tag / Name:</label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-100 focus:outline-none focus:border-[#388bfd]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Rotation / Orientation:</label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-300 px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded flex-1">
                        {component.rotation}°
                      </span>
                      {onRotate && (
                        <button
                          type="button"
                          onClick={() => onRotate(90)}
                          className="px-2 py-1 bg-[#1c2333] hover:bg-[#263147] border border-[#263147] rounded text-slate-300 hover:text-white"
                        >
                          +90°
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="comp-enabled"
                      checked={draftParams.enabled !== false}
                      onChange={(e) => handleParamChange('enabled', e.target.checked)}
                      className="rounded bg-[#0c0f17] border-[#263147] text-[#1f6feb] focus:ring-0"
                    />
                    <label htmlFor="comp-enabled" className="text-slate-300 cursor-pointer">
                      In-Service (Active in EMTDC Conductance Matrix)
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Pos: ({component.x}, {component.y})
                  </span>
                </div>
              </div>

              {/* Schematic Parameter Illustration & Vector Diagram */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    <span>Schematic Parameter Illustration & Vector Diagram</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Dynamic Model & Pinouts</span>
                </div>
                <ParameterDiagramPreview
                  component={component}
                  params={draftParams}
                  onSelectParam={(key) => {
                    setActiveTab('params');
                    setParamFilter(key);
                  }}
                />
              </div>

              {/* Component-Specific Architecture Configuration */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>Architecture & Operational Model</span>
                  <span className="text-[10px] text-sky-400">{theory.category}</span>
                </div>

                {/* Transformer Configuration */}
                {(component.type === COMPONENT_TYPES.TRANSFORMER_3PH ||
                  component.type === COMPONENT_TYPES.UMEC_TRANSFORMER_3PH ||
                  component.type === COMPONENT_TYPES.TRANSFORMER_1PH) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Primary Winding Connection:</label>
                        <select
                          value={draftParams.primaryConn || 'Y'}
                          onChange={(e) => handleParamChange('primaryConn', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                        >
                          <option value="Y">Y (Wye - Floating Neutral)</option>
                          <option value="Yg">Yg (Wye - Solidly Grounded)</option>
                          <option value="Delta">Delta (Δ - Closed Mesh)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Secondary Winding Connection:</label>
                        <select
                          value={draftParams.secondaryConn || 'Delta'}
                          onChange={(e) => handleParamChange('secondaryConn', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                        >
                          <option value="Delta">Delta (Δ - Closed Mesh)</option>
                          <option value="Y">Y (Wye - Floating Neutral)</option>
                          <option value="Yg">Yg (Wye - Solidly Grounded)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Core Magnetic Geometry:</label>
                        <select
                          value={draftParams.coreType || '3limb'}
                          onChange={(e) => handleParamChange('coreType', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                        >
                          <option value="3limb">3-Limb Core (Zero-sequence path via tank)</option>
                          <option value="5limb">5-Limb Core Form (Low zero-seq reluctance)</option>
                          <option value="shell">Shell Type</option>
                          <option value="bank">Bank of 3 Single-Phase Units</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Core Saturation Modeling:</label>
                        <div className="flex items-center gap-2 h-8">
                          <input
                            type="checkbox"
                            id="enable-sat"
                            checked={draftParams.enableSaturation || false}
                            onChange={(e) => handleParamChange('enableSaturation', e.target.checked)}
                            className="rounded bg-[#0c0f17] border-[#263147] text-[#1f6feb] focus:ring-0"
                          />
                          <label htmlFor="enable-sat" className="text-slate-300 cursor-pointer">
                            Enable Non-Linear Core Saturation
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transmission Line Configuration */}
                {(component.type === COMPONENT_TYPES.PI_LINE ||
                  component.type === COMPONENT_TYPES.BERGERON_LINE_1PH ||
                  component.type === COMPONENT_TYPES.BERGERON_LINE_3PH ||
                  component.type === COMPONENT_TYPES.FD_PHASE_LINE) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Formulation Model:</label>
                        <span className="block px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded font-mono text-sky-400">
                          {theory.companionType === 'TravelingWave'
                            ? "Bergeron Traveling Wave (d'Alembert)"
                            : 'Nominal π-Section (Lumped RLC)'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Line Constants Calculator:</label>
                        {onOpenLCP ? (
                          <button
                            type="button"
                            onClick={onOpenLCP}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 rounded transition-colors font-medium w-full justify-center"
                          >
                            <Tower className="w-3.5 h-3.5" />
                            <span>Launch LCP Line Constants Studio</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 italic">LCP Studio integrated</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Breakers & Switches Configuration */}
                {(component.type === COMPONENT_TYPES.BREAKER_1PH ||
                  component.type === COMPONENT_TYPES.BREAKER_3PH ||
                  component.type === COMPONENT_TYPES.TIMED_SWITCH) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Initial Contact State:</label>
                      <select
                        value={draftParams.initClosed ? 'closed' : 'open'}
                        onChange={(e) => handleParamChange('initClosed', e.target.value === 'closed')}
                        className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                      >
                        <option value="closed">Closed (Energized Contact)</option>
                        <option value="open">Open (Tripped / De-energized)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Current Zero Arc Extinction:</label>
                      <span className="block px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-400">
                        Automatic (Next AC Current Zero)
                      </span>
                    </div>
                  </div>
                )}

                {/* General Component Notice */}
                {!['transformer_3ph', 'transformer_1ph', 'umec_transformer_3ph', 'pi_line', 'bergeron_line_1ph', 'bergeron_line_3ph', 'breaker_1ph', 'breaker_3ph', 'timed_switch'].includes(
                  component.type
                ) && (
                  <div className="p-2.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-300">{theory.title}:</span>{' '}
                      {theory.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETERS */}
          {activeTab === 'params' && (
            <div className="space-y-3">
              {/* Search / Filter bar */}
              <div className="flex items-center justify-between bg-[#161b26] p-2 border border-[#263147] rounded-lg">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search parameter names..."
                    value={paramFilter}
                    onChange={(e) => setParamFilter(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/40">
                      <AlertCircle className="w-3 h-3" />
                      {errorCount} Error{errorCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                      <AlertTriangle className="w-3 h-3" />
                      {warningCount} Warning{warningCount > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {Object.keys(draftParams).filter((k) => k !== 'signalName' && k !== 'monitored' && k !== 'activeProbes').length} parameters
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDiagramInParams((p) => !p)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-colors ${
                      showDiagramInParams
                        ? 'bg-sky-950 border-sky-500/50 text-sky-300'
                        : 'bg-[#0c0f17] border-[#263147] text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle Schematic Parameter Diagram"
                  >
                    <Compass className="w-3 h-3" />
                    <span>{showDiagramInParams ? 'Hide Diagram' : 'Show Diagram'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Schematic Diagram Preview Inset in Parameters Tab */}
              {showDiagramInParams && (
                <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>Schematic Parameter Diagram</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Click callout to jump to parameter</span>
                  </div>
                  <ParameterDiagramPreview
                    component={component}
                    params={draftParams}
                    onSelectParam={(key) => {
                      setParamFilter(key);
                    }}
                  />
                </div>
              )}

              {/* Parameter Inputs Grid */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {Object.entries(draftParams)
                    .filter(([key]) => {
                      if (key === 'signalName' || key === 'monitored' || key === 'activeProbes' || key === 'enabled') {
                        return false;
                      }
                      if (paramFilter) {
                        const label = formatParamLabel(key);
                        return (
                          key.toLowerCase().includes(paramFilter.toLowerCase()) ||
                          label.toLowerCase().includes(paramFilter.toLowerCase())
                        );
                      }
                      return true;
                    })
                    .map(([key, val]) => {
                      const isBool = typeof val === 'boolean';
                      const label = formatParamLabel(key);
                      const category = PARAM_CATEGORY_MAP[key] || 'none';
                      const unitOptions = ENGINEERING_UNITS[category] || [];
                      const hasUnits = unitOptions.length > 0;
                      const currentUnitSymbol = displayUnits[key] || (unitOptions[0] ? unitOptions[0].symbol : '');
                      const activeUnitOpt = unitOptions.find((o) => o.symbol === currentUnitSymbol) || unitOptions[0];
                      const validation = validationIssues[key];
                      const isError = validation?.severity === 'error';
                      const isWarning = validation?.severity === 'warning';
                      const currentDisplayStr =
                        inputTexts[key] ??
                        (typeof val === 'number' && activeUnitOpt
                          ? formatDisplayValue(val, activeUnitOpt.multiplier)
                          : String(val ?? ''));

                      if (isBool) {
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded bg-[#0c0f17] border border-[#263147]">
                            <label className="text-slate-300 truncate max-w-[200px]" title={key}>
                              {label}:
                            </label>
                            <input
                              type="checkbox"
                              checked={val as boolean}
                              onChange={(e) => handleParamChange(key, e.target.checked)}
                              className="rounded bg-[#161b26] border-[#263147] text-[#1f6feb] focus:ring-0"
                            />
                          </div>
                        );
                      }

                      if (key === 'mathOp') {
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded bg-[#0c0f17] border border-[#263147]">
                            <label className="text-slate-300 truncate max-w-[150px]" title={key}>
                              {label}:
                            </label>
                            <select
                              value={val as string}
                              onChange={(e) => handleParamChange(key, e.target.value)}
                              className="w-40 px-2 py-1 bg-[#161b26] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
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
                          </div>
                        );
                      }

                      if (key === 'logicOp') {
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded bg-[#0c0f17] border border-[#263147]">
                            <label className="text-slate-300 truncate max-w-[150px]" title={key}>
                              {label}:
                            </label>
                            <select
                              value={val as string}
                              onChange={(e) => handleParamChange(key, e.target.value)}
                              className="w-40 px-2 py-1 bg-[#161b26] border border-[#263147] rounded text-slate-200 focus:outline-none focus:border-[#388bfd]"
                            >
                              <option value="AND">AND</option>
                              <option value="OR">OR</option>
                              <option value="XOR">XOR</option>
                              <option value="NOT">NOT</option>
                              <option value="NAND">NAND</option>
                              <option value="NOR">NOR</option>
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={key}
                          className={`p-2 rounded border transition-colors flex flex-col justify-between ${
                            isError
                              ? 'bg-red-950/20 border-red-500/50'
                              : isWarning
                              ? 'bg-amber-950/20 border-amber-500/40'
                              : 'bg-[#0c0f17] border-[#263147] hover:border-[#388bfd]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <label className="text-slate-300 font-medium truncate" title={key}>
                                {label}:
                              </label>
                              {isError && (
                                <span title={validation.message} className="text-red-400 shrink-0">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {isWarning && (
                                <span title={validation.message} className="text-amber-400 shrink-0">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {hasUnits ? (
                                <>
                                  <input
                                    type="text"
                                    value={currentDisplayStr}
                                    onChange={(e) => handleNumericTextChange(key, e.target.value)}
                                    onBlur={() => handleNumericBlur(key)}
                                    placeholder="e.g. 100u, 5m"
                                    className={`w-28 px-2 py-1 bg-[#161b26] border rounded text-slate-100 focus:outline-none font-mono text-right text-xs transition-colors ${
                                      isError
                                        ? 'border-red-500 focus:border-red-400 text-red-200'
                                        : isWarning
                                        ? 'border-amber-500 focus:border-amber-400 text-amber-100'
                                        : 'border-[#263147] focus:border-[#388bfd]'
                                    }`}
                                  />
                                  <select
                                    value={currentUnitSymbol}
                                    onChange={(e) => handleUnitChange(key, e.target.value)}
                                    className="w-20 px-1 py-1 bg-[#161b26] border border-[#263147] rounded text-sky-400 font-mono text-xs focus:outline-none focus:border-[#388bfd] cursor-pointer"
                                  >
                                    {unitOptions.map((opt) => (
                                      <option key={opt.symbol} value={opt.symbol}>
                                        {opt.symbol}
                                      </option>
                                    ))}
                                  </select>
                                </>
                              ) : (
                                <input
                                  type="text"
                                  value={currentDisplayStr}
                                  onChange={(e) => handleNumericTextChange(key, e.target.value)}
                                  onBlur={() => handleNumericBlur(key)}
                                  className={`w-36 px-2 py-1 bg-[#161b26] border rounded text-slate-100 focus:outline-none font-mono text-right text-xs transition-colors ${
                                    isError
                                      ? 'border-red-500 focus:border-red-400'
                                      : 'border-[#263147] focus:border-[#388bfd]'
                                  }`}
                                />
                              )}
                            </div>
                          </div>

                          {validation ? (
                            <div
                              className={`text-[10px] mt-1 flex items-start gap-1 font-sans ${
                                isError ? 'text-red-400' : 'text-amber-400'
                              }`}
                            >
                              <span>{validation.message}</span>
                            </div>
                          ) : hasUnits && activeUnitOpt && activeUnitOpt.multiplier !== 1 && typeof val === 'number' ? (
                            <div className="text-[10px] text-slate-500 font-mono text-right mt-0.5">
                              = {val < 0.001 || val > 10000 ? val.toExponential(3) : val} {activeUnitOpt.baseUnit}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MONITORING & SIGNALS */}
          {activeTab === 'monitoring' && (
            <div className="space-y-4">
              {/* Telemetry Configuration */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>Oscilloscope Signal Binding</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Signal Export Tag Name:</label>
                    <input
                      type="text"
                      placeholder={`e.g. ${component.name}_V`}
                      value={draftParams.signalName || ''}
                      onChange={(e) => handleParamChange('signalName', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-100 focus:outline-none focus:border-[#388bfd]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center gap-2 h-9">
                      <input
                        type="checkbox"
                        id="monitored-toggle"
                        checked={draftParams.monitored || false}
                        onChange={(e) => handleParamChange('monitored', e.target.checked)}
                        className="rounded bg-[#0c0f17] border-[#263147] text-[#1f6feb] focus:ring-0"
                      />
                      <label htmlFor="monitored-toggle" className="text-slate-300 cursor-pointer font-medium">
                        Plot in Oscilloscope / PolyGraph
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Probes Enablement Matrix */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>Available Internal Probes & Measurements</span>
                  <span className="text-[10px] text-slate-400">Direct EMTDC State Extraction</span>
                </div>

                <div className="space-y-2">
                  {theory.availableProbes.map((probe) => {
                    const isChecked = activeProbes.has(probe.id);
                    return (
                      <div
                        key={probe.id}
                        onClick={() => handleProbeToggle(probe.id, probe.defaultSignalName)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-sky-950/40 border-sky-600/50 text-white'
                            : 'bg-[#0c0f17] border-[#263147] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded bg-[#0c0f17] border-[#263147] text-[#1f6feb] focus:ring-0"
                          />
                          <div>
                            <span className="font-semibold text-slate-200">{probe.name}</span>
                            <span className="text-[10px] ml-2 text-slate-500 font-mono">[{probe.unit}]</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{probe.description}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b26] border border-[#263147] text-sky-300">
                          {probe.defaultSignalName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Instantaneous Simulation Telemetry */}
              <div className="p-3 bg-[#0c0f17] border border-[#263147] rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Live Instantaneous Telemetry (EMTDC Kernel)</span>
                  </div>
                  {isSimRunning ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      SIMULATION RUNNING
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Simulation Paused</span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                  <div className="p-2 bg-[#161b26] border border-[#263147] rounded">
                    <span className="block text-[10px] text-slate-500">Voltage</span>
                    <span className="text-sky-400 font-bold text-sm">{liveV.toFixed(2)} V</span>
                  </div>
                  <div className="p-2 bg-[#161b26] border border-[#263147] rounded">
                    <span className="block text-[10px] text-slate-500">Current</span>
                    <span className="text-emerald-400 font-bold text-sm">{liveI.toFixed(2)} A</span>
                  </div>
                  <div className="p-2 bg-[#161b26] border border-[#263147] rounded">
                    <span className="block text-[10px] text-slate-500">Active Power P</span>
                    <span className="text-amber-400 font-bold text-sm">{liveP.toFixed(2)} W</span>
                  </div>
                  <div className="p-2 bg-[#161b26] border border-[#263147] rounded">
                    <span className="block text-[10px] text-slate-500">Apparent Power S</span>
                    <span className="text-purple-400 font-bold text-sm">{liveS.toFixed(2)} VA</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HELP & THEORY */}
          {activeTab === 'theory' && (
            <div className="space-y-4">
              {/* Equivalent Discretized Schematic Preview */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                    <span>Equivalent Discretized Schematic Model</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{theory.companionType} Companion</span>
                </div>
                <ParameterDiagramPreview
                  component={component}
                  params={draftParams}
                  defaultView={
                    component.type === COMPONENT_TYPES.TRANSFORMER_3PH || component.type === COMPONENT_TYPES.UMEC_TRANSFORMER_3PH
                      ? 'sequence_t'
                      : component.type === COMPONENT_TYPES.SYNC_GENERATOR || component.type === COMPONENT_TYPES.SYNC_MACHINE_DQ
                      ? 'machine_subtransient'
                      : component.type === COMPONENT_TYPES.PI_LINE || component.type === COMPONENT_TYPES.BERGERON_LINE_3PH
                      ? 'pi_section'
                      : 'norton_companion'
                  }
                  onSelectParam={(key) => {
                    setActiveTab('params');
                    setParamFilter(key);
                  }}
                />
              </div>

              {/* Dommel Companion Model Explanation */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>EMTDC Companion Model Discretization</span>
                  <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-600/40 text-sky-400 text-[10px] font-mono">
                    {theory.companionType} Equivalent
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">{theory.description}</p>

                {/* Mathematical Formulation Cards */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 bg-[#0c0f17] border border-[#263147] rounded space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Norton Conductance (Geq)
                    </span>
                    <div className="font-mono text-sm text-sky-300 py-1">{theory.geqFormula}</div>
                    {theory.calculatedGeq !== undefined && (
                      <span className="text-[11px] text-slate-400 block">
                        Numerical value (Δt=50μs):{' '}
                        <strong className="text-slate-200 font-mono">
                          {theory.calculatedGeq < 0.001
                            ? theory.calculatedGeq.toExponential(3)
                            : theory.calculatedGeq.toFixed(4)}{' '}
                          {theory.calculatedGeqUnit}
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-[#0c0f17] border border-[#263147] rounded space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      History Current Source (Ihist)
                    </span>
                    <div className="font-mono text-sm text-emerald-300 py-1">{theory.ihistFormula}</div>
                    <span className="text-[11px] text-slate-500 block">
                      Updated at each time step based on previous state vector.
                    </span>
                  </div>
                </div>

                {/* Companion Equations list */}
                {theory.equations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#263147]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Core Governing Equations
                    </span>
                    {theory.equations.map((eq, i) => (
                      <div key={i} className="p-2 bg-[#0c0f17] border border-[#263147] rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-300 text-[11px]">{eq.label}</span>
                        </div>
                        <div className="font-mono text-slate-100 text-xs py-1 px-2 bg-[#161b26] rounded border border-[#263147]">
                          {eq.formula}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{eq.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Terminal Pinouts */}
              <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147] flex items-center justify-between">
                  <span>Terminal Pinouts & Connections</span>
                  <span className="text-[10px] text-slate-400">{pins.length} Terminals Defined</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-[#263147]">
                        <th className="pb-1">Pin ID</th>
                        <th className="pb-1">Terminal Name</th>
                        <th className="pb-1">Coordinates (X, Y)</th>
                        <th className="pb-1">Domain</th>
                        <th className="pb-1">Direction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#263147]/50 text-slate-300">
                      {pins.map((pin) => (
                        <tr key={pin.id} className="hover:bg-[#1c2333]/50">
                          <td className="py-1 text-sky-400">{pin.id}</td>
                          <td className="py-1 text-slate-200">{pin.name}</td>
                          <td className="py-1 text-slate-400">
                            ({pin.localX}, {pin.localY})
                          </td>
                          <td className="py-1 text-emerald-400">{pin.domain || 'electrical'}</td>
                          <td className="py-1 text-amber-400">{pin.direction || 'bidirectional'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Typical Engineering Ranges */}
              {theory.typicalRanges.length > 0 && (
                <div className="p-3 bg-[#161b26] border border-[#263147] rounded-lg space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-[#263147]">
                    Typical Engineering Parameter Ranges
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#263147]">
                          <th className="pb-1">Parameter</th>
                          <th className="pb-1">Practical Range</th>
                          <th className="pb-1">Typical Value</th>
                          <th className="pb-1">Engineering Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#263147]/50 text-slate-300">
                        {theory.typicalRanges.map((tr) => (
                          <tr key={tr.param} className="hover:bg-[#1c2333]/50">
                            <td className="py-1 font-semibold text-slate-200">{tr.name}</td>
                            <td className="py-1 font-mono text-sky-400">{tr.range}</td>
                            <td className="py-1 font-mono text-emerald-400">{tr.typical}</td>
                            <td className="py-1 text-slate-400 text-[10px]">{tr.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="h-12 px-4 bg-[#1c2333] border-t border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161b26] hover:bg-[#263147] border border-[#263147] text-slate-300 hover:text-white transition-colors"
              title="Reset form fields to original component values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Validation Status Center Banner */}
          {hasFatalErrors ? (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-950/40 px-3 py-1 rounded border border-red-500/40">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Resolve {errorCount} non-physical validation error{errorCount > 1 ? 's' : ''} to save</span>
            </div>
          ) : warningCount > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-950/40 px-3 py-1 rounded border border-amber-500/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{warningCount} physical parameter warning{warningCount > 1 ? 's' : ''}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#161b26] hover:bg-[#263147] border border-[#263147] text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isDirty || hasFatalErrors}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded border transition-colors ${
                isDirty && !hasFatalErrors
                  ? 'bg-[#1c2333] hover:bg-[#263147] border-[#388bfd] text-sky-300 hover:text-sky-200'
                  : 'bg-[#161b26] border-[#263147] text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={hasFatalErrors}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded text-white font-medium shadow-sm transition-colors ${
                hasFatalErrors
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1f6feb] hover:bg-[#388bfd]'
              }`}
            >
              <span>OK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatParamLabel(key: string): string {
  const map: Record<string, string> = {
    resistance: 'Resistance',
    inductance: 'Inductance',
    capacitance: 'Capacitance',
    voltage: 'Nominal Voltage',
    freq: 'Frequency',
    phaseDeg: 'Phase Angle',
    rampTime: 'Ramp Time',
    internalRs: 'Internal Rs',
    initClosed: 'Initially Closed',
    openTime: 'Trip Time',
    closeTime: 'Reclose Time',
    Ron: 'Ron',
    Roff: 'Roff',
    lengthKm: 'Length',
    R_per_km: 'R per km',
    L_per_km: 'L per km',
    C_per_km: 'C per km',
    R_self_per_km: 'R self',
    R_mutual_per_km: 'R mutual',
    L_self_per_km: 'L self',
    L_mutual_per_km: 'L mutual',
    C_self_per_km: 'C self',
    C_mutual_per_km: 'C mutual',
    Zc_aerial: 'Zc Aerial',
    Zc_ground: 'Zc Ground',
    v_aerial: 'v Aerial (km/s)',
    v_ground: 'v Ground (km/s)',
    V1_nom: 'V1 Primary',
    V2_nom: 'V2 Secondary',
    MVA_rating: 'Rated Capacity',
    enableSaturation: 'Core Saturation',
    kneeFluxPu: 'Knee Flux (pu)',
    faultType: 'Fault Type',
    startTime: 'Start Time',
    duration: 'Duration',
    faultResistance: 'Fault Res',
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
