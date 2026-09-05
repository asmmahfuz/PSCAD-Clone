import React, { useState } from 'react';
import {
  Activity,
  Sliders,
  Maximize2,
  Grid,
  Eye,
  FileSpreadsheet,
  Copy,
  Download,
  Trash2,
  Settings2,
  ChevronRight,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { CircuitComponentData } from '../../types';
import { GraphBindingManager, type ProbeChannelInfo } from './GraphBinding';
import { PolyGraphManager } from './PolyGraphView';
import { WaveformExportManager } from '../../utils/waveformExport';
import { telemetryStreamer } from '../../services/telemetryStreamer';

export interface GraphFrameContextMenuProps {
  frame: CircuitComponentData;
  allComponents: CircuitComponentData[];
  signalsMap?: Map<string, number[]>;
  onClose: () => void;
  onUpdateFrame: (updatedFrame: CircuitComponentData) => void;
  onOpenParametersModal?: (frame: CircuitComponentData) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAxisLimitsModal?: (frame: CircuitComponentData) => void;
  onPopOutDetached?: (frame: CircuitComponentData) => void;
}

export interface AxisLimitsModalProps {
  frame: CircuitComponentData;
  isOpen: boolean;
  onClose: () => void;
  onApply: (yMin: number, yMax: number, autoScale: boolean) => void;
}

/**
 * Modal Dialog for configuring Graph Frame Axis Limits
 */
export const AxisLimitsModal: React.FC<AxisLimitsModalProps> = ({
  frame,
  isOpen,
  onClose,
  onApply,
}) => {
  const currentRange = frame.params?.graphYRange;
  const isAuto = frame.params?.autoScale !== false && (!currentRange || currentRange.length < 2);

  const [autoScale, setAutoScale] = useState<boolean>(isAuto);
  const [yMinStr, setYMinStr] = useState<string>(currentRange ? String(currentRange[0]) : '-100.0');
  const [yMaxStr, setYMaxStr] = useState<string>(currentRange ? String(currentRange[1]) : '100.0');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (autoScale) {
      onApply(0, 0, true);
      onClose();
      return;
    }

    const min = parseFloat(yMinStr);
    const max = parseFloat(yMaxStr);

    if (isNaN(min) || isNaN(max)) {
      setError('Please enter valid numeric limits.');
      return;
    }

    if (min >= max) {
      setError('Y Minimum must be strictly less than Y Maximum.');
      return;
    }

    onApply(min, max, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className="w-[360px] bg-[#111827] border border-[#2b3a52] rounded-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-[#162032] border-b border-[#26354d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold text-slate-100">Set Axis Limits</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-[#0f172a] rounded border border-[#26334a]">
            {frame.params?.graphTitle || frame.name || 'Graph Frame'}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="px-2.5 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          {/* Auto Scale Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScale}
              onChange={(e) => {
                setAutoScale(e.target.checked);
                setError(null);
              }}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/30"
            />
            <span className="text-slate-200 font-medium">Auto-Scale Y Axis (Dynamic Range)</span>
          </label>

          {/* Manual Range Inputs */}
          <div className={`space-y-2.5 transition-opacity ${autoScale ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Y Maximum (Upper Bound)</label>
              <input
                type="number"
                step="any"
                value={yMaxStr}
                onChange={(e) => {
                  setYMaxStr(e.target.value);
                  setError(null);
                }}
                disabled={autoScale}
                placeholder="e.g. 230000"
                className="w-full px-2.5 py-1.5 bg-[#0c1017] border border-[#26354d] rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Y Minimum (Lower Bound)</label>
              <input
                type="number"
                step="any"
                value={yMinStr}
                onChange={(e) => {
                  setYMinStr(e.target.value);
                  setError(null);
                }}
                disabled={autoScale}
                placeholder="e.g. -230000"
                className="w-full px-2.5 py-1.5 bg-[#0c1017] border border-[#26354d] rounded text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#162032]/80 border-t border-[#26354d] flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors shadow-sm"
          >
            Apply Limits
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Dedicated Context Menu for Graph Frames and PolyGraphs
 */
export const GraphFrameContextMenuContent: React.FC<GraphFrameContextMenuProps> = ({
  frame,
  allComponents,
  signalsMap = new Map(),
  onClose,
  onUpdateFrame,
  onOpenParametersModal,
  onDuplicate,
  onDelete,
  onShowToast,
  onOpenAxisLimitsModal,
  onPopOutDetached,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const isPolyGraph = PolyGraphManager.isPolyGraphMode(frame);
  const title = frame.params?.graphTitle || frame.name || 'Graph Frame';
  const showGrid = frame.params?.graphShowGrid !== false;
  const showLegend = frame.params?.graphShowLegend !== false;

  const traces = GraphBindingManager.resolveTracesForFrame(frame, allComponents, signalsMap);
  const availableProbes = GraphBindingManager.getAvailableProbes(allComponents);

  const handleBindProbe = (probe: CircuitComponentData | ProbeChannelInfo) => {
    const updated = GraphBindingManager.bindProbeToFrame(frame, probe, allComponents);
    onUpdateFrame(updated);
    onClose();
    const probeLabel = 'label' in probe ? probe.label : (probe as CircuitComponentData).name || probe.id;
    onShowToast?.(`Signal '${probeLabel}' added to Graph Frame`, 'success');
  };

  const handleToggleTrace = (sigName: string) => {
    const updated = GraphBindingManager.toggleTraceVisibility(frame, sigName, allComponents);
    onUpdateFrame(updated);
    onClose();
  };

  const handleUnbindTrace = (sigName: string) => {
    const updated = GraphBindingManager.unbindTraceFromFrame(frame, sigName, allComponents);
    onUpdateFrame(updated);
    onClose();
    onShowToast?.(`Removed signal '${sigName}' from Frame`, 'info');
  };

  const handleAutoScale = () => {
    const nextParams = { ...frame.params };
    delete nextParams.graphYRange;
    nextParams.autoScale = true;
    onUpdateFrame({ ...frame, params: nextParams });
    onClose();
    onShowToast?.('Auto-Scale Y axis enabled', 'success');
  };

  const handleToggleGrid = () => {
    onUpdateFrame({
      ...frame,
      params: {
        ...frame.params,
        graphShowGrid: !showGrid,
      },
    });
    onClose();
  };

  const handleToggleLegend = () => {
    onUpdateFrame({
      ...frame,
      params: {
        ...frame.params,
        graphShowLegend: !showLegend,
      },
    });
    onClose();
  };

  const handleConvertPolyGraph = (numTracks: number) => {
    const nextHeight = Math.max(260, (frame.params?.graphHeight || 200) * 1.35);
    onUpdateFrame({
      ...frame,
      params: {
        ...frame.params,
        graphMode: 'polygraph',
        isPolyGraph: true,
        numSubGrids: numTracks,
        graphHeight: nextHeight,
      },
    });
    onClose();
    onShowToast?.(`Converted to PolyGraph (${numTracks} Tracks)`, 'success');
  };

  const handleConvertOverlay = () => {
    const nextParams = { ...frame.params };
    delete nextParams.graphMode;
    delete nextParams.isPolyGraph;
    delete nextParams.numSubGrids;
    delete nextParams.subGrids;
    onUpdateFrame({
      ...frame,
      params: nextParams,
    });
    onClose();
    onShowToast?.('Converted to Single Overlay Graph', 'success');
  };

  const handleClearData = () => {
    onUpdateFrame({
      ...frame,
      params: {
        ...frame.params,
        traces: [],
        graphSignals: [],
        graphHiddenSignals: [],
      },
    });
    onClose();
    onShowToast?.('Waveform signals cleared from Graph Frame', 'info');
  };

  const handleExportCSV = () => {
    const csv = WaveformExportManager.generateGraphCSV(frame, signalsMap, allComponents);
    const cleanTitle = (frame.params?.graphTitle || frame.name || 'waveform_data')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    WaveformExportManager.downloadCSV(csv, `${cleanTitle}_${Date.now()}.csv`);
    onClose();
    onShowToast?.('Exported waveform data to CSV successfully', 'success');
  };

  const handleCopyPNG = async () => {
    onClose();
    const res = await WaveformExportManager.copyGraphToClipboardPNG(frame, signalsMap, allComponents, 2.0);
    onShowToast?.(res.message, res.success ? 'success' : 'error');
  };

  const handleDownloadPNG = () => {
    WaveformExportManager.downloadGraphPNG(frame, signalsMap, allComponents, 2.0);
    onClose();
    onShowToast?.('Saved high-resolution PNG image', 'success');
  };

  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    hasSubmenu?: boolean;
    submenuKey?: string;
    checked?: boolean;
    onClick?: () => void;
  }> = ({ icon, label, shortcut, danger, disabled, hasSubmenu, submenuKey, checked, onClick }) => {
    const isSubActive = submenuKey && activeSubmenu === submenuKey;

    return (
      <div
        className="relative"
        onMouseEnter={() => {
          if (hasSubmenu && submenuKey) setActiveSubmenu(submenuKey);
          else setActiveSubmenu(null);
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            if (onClick) onClick();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors rounded ${
            disabled
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : danger
              ? 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-200'
              : isSubActive
              ? 'bg-[#1f6feb] text-white font-medium'
              : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">{icon}</span>
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-4">
            {checked !== undefined && checked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            {shortcut && <span className="text-[10px] text-slate-400 font-mono">{shortcut}</span>}
            {hasSubmenu && <ChevronRight className="w-3 h-3 text-slate-400" />}
          </div>
        </button>
      </div>
    );
  };

  const SubmenuContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="absolute left-full top-0 ml-1 w-56 bg-[#161d2b] border border-[#2c3b54] rounded-md shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5 backdrop-blur-md">
      {children}
    </div>
  );

  const Divider = () => <div className="h-px bg-[#26334a] my-1 mx-1" />;

  return (
    <>
      {/* 1. Header with Mode Badge */}
      <div className="px-2.5 py-1.5 border-b border-[#26334a] mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sky-400 font-bold text-xs">{isPolyGraph ? '📊' : '📈'}</span>
          <span className="font-semibold text-slate-100 truncate text-[11px]">{title}</span>
        </div>
        <span
          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
            isPolyGraph ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
          }`}
        >
          {isPolyGraph ? 'PolyGraph' : 'Overlay'}
        </span>
      </div>

      {/* 2. Signal Binding & Trace Management */}
      <div className="relative" onMouseEnter={() => setActiveSubmenu('addProbe')}>
        <button
          type="button"
          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
            activeSubmenu === 'addProbe' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Probe / Signal</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>

        {activeSubmenu === 'addProbe' && (
          <SubmenuContainer>
            <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Probes</div>
            {availableProbes.length === 0 ? (
              <div className="px-2 py-1 text-xs text-slate-500 italic">No probes placed on canvas</div>
            ) : (
              availableProbes.map((probe) => (
                <MenuItem
                  key={probe.id}
                  icon={<span className="text-amber-400">⚡</span>}
                  label={`${probe.label} [${probe.unit}]`}
                  onClick={() => handleBindProbe(probe)}
                />
              ))
            )}
          </SubmenuContainer>
        )}
      </div>

      {traces.length > 0 && (
        <div className="relative" onMouseEnter={() => setActiveSubmenu('manageTraces')}>
          <button
            type="button"
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
              activeSubmenu === 'manageTraces' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manage Traces ({traces.length})</span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>

          {activeSubmenu === 'manageTraces' && (
            <SubmenuContainer>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toggle Visibility</div>
              {traces.map((trace) => (
                <MenuItem
                  key={`toggle_${trace.id}`}
                  icon={<span style={{ color: trace.color }}>●</span>}
                  label={`${trace.label} (${trace.visible ? 'Visible' : 'Hidden'})`}
                  checked={trace.visible}
                  onClick={() => handleToggleTrace(trace.signalName)}
                />
              ))}
              <Divider />
              <div className="px-2 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">Remove Trace</div>
              {traces.map((trace) => (
                <MenuItem
                  key={`remove_${trace.id}`}
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                  label={`Remove ${trace.label}`}
                  danger
                  onClick={() => handleUnbindTrace(trace.signalName)}
                />
              ))}
            </SubmenuContainer>
          )}
        </div>
      )}

      <Divider />

      {/* 3. Scaling & Display Controls */}
      <MenuItem
        icon={<Maximize2 className="w-3.5 h-3.5 text-sky-400" />}
        label="Auto-Scale Y Axis"
        onClick={handleAutoScale}
      />
      <MenuItem
        icon={<Settings2 className="w-3.5 h-3.5 text-indigo-400" />}
        label="Set Axis Limits..."
        onClick={() => {
          onClose();
          onOpenAxisLimitsModal?.(frame);
        }}
      />
      <MenuItem
        icon={<Grid className="w-3.5 h-3.5 text-slate-400" />}
        label="Show Grid"
        checked={showGrid}
        onClick={handleToggleGrid}
      />
      <MenuItem
        icon={<Eye className="w-3.5 h-3.5 text-slate-400" />}
        label="Show Legend"
        checked={showLegend}
        onClick={handleToggleLegend}
      />

      <Divider />

      {/* 4. Mode Conversion (Overlay vs PolyGraph) */}
      {!isPolyGraph ? (
        <div className="relative" onMouseEnter={() => setActiveSubmenu('polyMode')}>
          <button
            type="button"
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
              activeSubmenu === 'polyMode' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Convert to PolyGraph</span>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>

          {activeSubmenu === 'polyMode' && (
            <SubmenuContainer>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Grid Tracks</div>
              <MenuItem icon={<span className="text-purple-400 font-bold">2</span>} label="2 Stacked Tracks" onClick={() => handleConvertPolyGraph(2)} />
              <MenuItem icon={<span className="text-purple-400 font-bold">3</span>} label="3 Stacked Tracks" onClick={() => handleConvertPolyGraph(3)} />
              <MenuItem icon={<span className="text-purple-400 font-bold">4</span>} label="4 Stacked Tracks" onClick={() => handleConvertPolyGraph(4)} />
            </SubmenuContainer>
          )}
        </div>
      ) : (
        <MenuItem
          icon={<Sparkles className="w-3.5 h-3.5 text-sky-400" />}
          label="Convert to Overlay Graph"
          onClick={handleConvertOverlay}
        />
      )}

      <Divider />

      {/* 5. Pop-Out to Secondary Detached OS Window */}
      <MenuItem
        icon={<ExternalLink className="w-3.5 h-3.5 text-sky-400" />}
        label="Pop Out to Standalone Window..."
        onClick={() => {
          onClose();
          if (onPopOutDetached) {
            onPopOutDetached(frame);
          } else {
            telemetryStreamer.openPopoutWindow({
              frameId: frame.id,
              title: `PSCAD Modern - ${frame.params?.graphTitle || frame.name || 'Graph Frame'}`,
            });
          }
        }}
      />

      <Divider />

      {/* 6. Waveform Data Export & High-Res Image Copy */}
      <MenuItem
        icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
        label="Export Data to CSV (.csv)"
        onClick={handleExportCSV}
      />
      <MenuItem
        icon={<Copy className="w-3.5 h-3.5 text-cyan-400" />}
        label="Copy High-Res PNG (2x)"
        onClick={handleCopyPNG}
      />
      <MenuItem
        icon={<Download className="w-3.5 h-3.5 text-blue-400" />}
        label="Save Image as PNG..."
        onClick={handleDownloadPNG}
      />
      <MenuItem
        icon={<Trash2 className="w-3.5 h-3.5 text-amber-400" />}
        label="Clear Waveform Traces"
        onClick={handleClearData}
      />

      <Divider />

      {/* 6. Standard CAD Operations */}
      {onOpenParametersModal && (
        <MenuItem
          icon={<Settings2 className="w-3.5 h-3.5 text-sky-400" />}
          label="Edit Parameters..."
          shortcut="Enter"
          onClick={() => {
            onClose();
            onOpenParametersModal(frame);
          }}
        />
      )}
      {onDuplicate && (
        <MenuItem
          icon={<Copy className="w-3.5 h-3.5 text-slate-300" />}
          label="Duplicate"
          shortcut="Ctrl+D"
          onClick={() => {
            onClose();
            onDuplicate();
          }}
        />
      )}
      {onDelete && (
        <MenuItem
          icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
          label="Delete Frame"
          shortcut="Del"
          danger
          onClick={() => {
            onClose();
            onDelete();
          }}
        />
      )}
    </>
  );
};
