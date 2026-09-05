import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Zap,
  RotateCw,
  RotateCcw,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Maximize2,
  Grid,
  Layers,
  Settings2,
  FlipHorizontal,
  FlipVertical,
  Ban,
  CheckCircle2,
  Box,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronRight,
  Activity,
  Sliders,
} from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import type { CircuitComponentData, WireData, AlignAction } from '../../types';
import { GraphBindingManager, type ProbeChannelInfo } from './GraphBinding';
import { GraphFrameContextMenuContent } from './GraphFrameContextMenu';

export type ContextMenuType = 'canvas' | 'component' | 'multi' | 'wire';

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  type: ContextMenuType;
  targetComponent?: CircuitComponentData | null;
  targetWire?: WireData | null;
  selectedCount?: number;
  hasClipboard?: boolean;
  allComponents?: CircuitComponentData[];
  signalsMap?: Map<string, number[]>;
  onClose: () => void;
  onAddComponent: (type: string) => void;
  onAddWire: () => void;
  onEditParameters: (comp: CircuitComponentData) => void;
  onViewDefinition?: (comp: CircuitComponentData) => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onToggleBypass: () => void;
  onCreateSubmoduleFromSelection: () => void;
  onBindProbeToFrame?: (frameId: string, probe: CircuitComponentData | ProbeChannelInfo) => void;
  onToggleTraceVisibility?: (frameId: string, signalName: string) => void;
  onUnbindTraceFromFrame?: (frameId: string, signalName: string) => void;
  onUpdateComponent?: (comp: CircuitComponentData) => void;
  onOpenAxisLimitsModal?: (comp: CircuitComponentData) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onPopOutDetached?: (frame: CircuitComponentData) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onZoomFit: () => void;
  onToggleGrid?: () => void;
  onAlign?: (type: AlignAction) => void;
  onWirePhaseChange?: (phase: 'normal' | 'phaseA' | 'phaseB' | 'phaseC' | 'neutral') => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  type,
  targetComponent,
  targetWire,
  selectedCount = 0,
  hasClipboard = false,
  allComponents = [],
  signalsMap,
  onClose,
  onAddComponent,
  onAddWire,
  onEditParameters,
  onViewDefinition,
  onRotateCW,
  onRotateCCW,
  onFlipH,
  onFlipV,
  onToggleBypass,
  onCreateSubmoduleFromSelection,
  onBindProbeToFrame,
  onToggleTraceVisibility: _onToggleTraceVisibility,
  onUnbindTraceFromFrame: _onUnbindTraceFromFrame,
  onUpdateComponent,
  onOpenAxisLimitsModal,
  onPopOutDetached,
  onShowToast,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onSelectAll,
  onZoomFit,
  onToggleGrid,
  onAlign,
  onWirePhaseChange,
}) => {

  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number }>({ x, y });

  // Reposition inside viewport if overflowing
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 10;
      const maxY = window.innerHeight - rect.height - 10;
      setAdjustedPos({
        x: Math.max(10, Math.min(x, maxX)),
        y: Math.max(10, Math.min(y, maxY)),
      });
    }
  }, [x, y]);

  // Click outside listener
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    hasSubmenu?: boolean;
    submenuKey?: string;
    onClick?: () => void;
  }> = ({ icon, label, shortcut, danger, disabled, hasSubmenu, submenuKey, onClick }) => {
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
            if (onClick) {
              onClick();
              onClose();
            }
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
            {shortcut && <span className="text-[10px] text-slate-400 font-mono">{shortcut}</span>}
            {hasSubmenu && <ChevronRight className="w-3 h-3 text-slate-400" />}
          </div>
        </button>
      </div>
    );
  };

  const SubmenuContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="absolute left-full top-0 ml-1 w-52 bg-[#161d2b] border border-[#2c3b54] rounded-md shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5 backdrop-blur-md">
      {children}
    </div>
  );

  const Divider = () => <div className="h-px bg-[#26334a] my-1 mx-1" />;

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      className="fixed z-50 w-56 bg-[#131924]/95 border border-[#2b3a52] rounded-md shadow-2xl p-1 text-slate-200 select-none font-sans text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. EMPTY CANVAS CONTEXT MENU */}
      {type === 'canvas' && (
        <>
          <div className="relative" onMouseEnter={() => setActiveSubmenu('addComp')}>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
                activeSubmenu === 'addComp' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Component</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {activeSubmenu === 'addComp' && (
              <SubmenuContainer>
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passive RLC</div>
                <MenuItem icon={<span className="text-amber-400">〰️</span>} label="Resistor" onClick={() => onAddComponent(COMPONENT_TYPES.RESISTOR)} />
                <MenuItem icon={<span className="text-cyan-400">➰</span>} label="Inductor" onClick={() => onAddComponent(COMPONENT_TYPES.INDUCTOR)} />
                <MenuItem icon={<span className="text-emerald-400">⫣⫤</span>} label="Capacitor" onClick={() => onAddComponent(COMPONENT_TYPES.CAPACITOR)} />
                <MenuItem icon={<span className="text-slate-400">⏚</span>} label="Ground (0V)" onClick={() => onAddComponent(COMPONENT_TYPES.GROUND)} />
                <Divider />
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sources & Grid</div>
                <MenuItem icon={<span className="text-sky-400">∿</span>} label="1-Ph AC Source" onClick={() => onAddComponent(COMPONENT_TYPES.AC_SOURCE_1PH)} />
                <MenuItem icon={<span className="text-sky-300">3~</span>} label="3-Ph AC Source" onClick={() => onAddComponent(COMPONENT_TYPES.AC_SOURCE_3PH)} />
                <MenuItem icon={<span className="text-yellow-400">⎓</span>} label="DC Source" onClick={() => onAddComponent(COMPONENT_TYPES.DC_SOURCE)} />
                <Divider />
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switches & Lines</div>
                <MenuItem icon={<span className="text-rose-400">⏻</span>} label="1-Ph Breaker" onClick={() => onAddComponent(COMPONENT_TYPES.BREAKER_1PH)} />
                <MenuItem icon={<span className="text-rose-300">⏻</span>} label="3-Ph Breaker" onClick={() => onAddComponent(COMPONENT_TYPES.BREAKER_3PH)} />
                <MenuItem icon={<span className="text-amber-400">🧲</span>} label="Transformer" onClick={() => onAddComponent(COMPONENT_TYPES.TRANSFORMER_1PH)} />
                <MenuItem icon={<span className="text-sky-400">🗼</span>} label="Bergeron Line" onClick={() => onAddComponent(COMPONENT_TYPES.BERGERON_LINE_3PH)} />
                <Divider />
                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meters & Controls</div>
                <MenuItem icon={<Activity className="w-3.5 h-3.5 text-yellow-300" />} label="Voltmeter" onClick={() => onAddComponent(COMPONENT_TYPES.VOLTMETER)} />
                <MenuItem icon={<span className="text-sky-300">📈</span>} label="Graph Frame" onClick={() => onAddComponent(COMPONENT_TYPES.GRAPH_FRAME)} />
                <MenuItem icon={<Sliders className="w-3.5 h-3.5 text-emerald-300" />} label="Runtime Slider" onClick={() => onAddComponent(COMPONENT_TYPES.RUNTIME_SLIDER)} />
              </SubmenuContainer>
            )}
          </div>

          <MenuItem icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} label="Add Wire" shortcut="W" onClick={onAddWire} />
          <Divider />
          <MenuItem
            icon={<ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />}
            label="Paste"
            shortcut="Ctrl+V"
            disabled={!hasClipboard}
            onClick={onPaste}
          />
          <MenuItem icon={<Layers className="w-3.5 h-3.5 text-slate-300" />} label="Select All" shortcut="Ctrl+A" onClick={onSelectAll} />
          <Divider />
          <MenuItem icon={<Maximize2 className="w-3.5 h-3.5 text-blue-400" />} label="Zoom to Fit" onClick={onZoomFit} />
          {onToggleGrid && <MenuItem icon={<Grid className="w-3.5 h-3.5 text-slate-400" />} label="Toggle Grid" onClick={onToggleGrid} />}
        </>
      )}

      {/* 2. COMPONENT CONTEXT MENU */}
      {type === 'component' && targetComponent && (
        <>
          {targetComponent.type === COMPONENT_TYPES.GRAPH_FRAME ? (
            <GraphFrameContextMenuContent
              frame={targetComponent}
              allComponents={allComponents}
              signalsMap={signalsMap}
              onClose={onClose}
              onUpdateFrame={(updated) => onUpdateComponent?.(updated)}
              onOpenParametersModal={onEditParameters}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onShowToast={onShowToast}
              onOpenAxisLimitsModal={onOpenAxisLimitsModal}
              onPopOutDetached={onPopOutDetached}
            />
          ) : (
            <>
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#26334a] mb-1 flex items-center justify-between">
                <span className="truncate">{targetComponent.name}</span>
                <span className="text-slate-500 font-mono text-[9px]">R:{targetComponent.rotation}°</span>
              </div>

              <MenuItem
                icon={<Settings2 className="w-3.5 h-3.5 text-sky-400" />}
                label="Edit Parameters..."
                shortcut="Enter"
                onClick={() => onEditParameters(targetComponent)}
              />

              {(targetComponent.type === COMPONENT_TYPES.SUBMODULE || targetComponent.definitionId || targetComponent.params?.customDefId) && onViewDefinition && (
                <MenuItem
                  icon={<Box className="w-3.5 h-3.5 text-purple-400" />}
                  label="View / Edit Definition"
                  onClick={() => onViewDefinition(targetComponent)}
                />
              )}

              <Divider />

              <MenuItem icon={<RotateCw className="w-3.5 h-3.5 text-amber-400" />} label="Rotate 90° CW" shortcut="R" onClick={onRotateCW} />
              <MenuItem icon={<RotateCcw className="w-3.5 h-3.5 text-amber-300" />} label="Rotate 90° CCW" shortcut="Shift+R" onClick={onRotateCCW} />
              <MenuItem icon={<FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />} label="Flip Horizontal" shortcut="H" onClick={onFlipH} />
              <MenuItem icon={<FlipVertical className="w-3.5 h-3.5 text-cyan-300" />} label="Flip Vertical" shortcut="V" onClick={onFlipV} />

              <Divider />

              <MenuItem
                icon={targetComponent.bypassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Ban className="w-3.5 h-3.5 text-amber-400" />}
                label={targetComponent.bypassed ? 'Enable Component' : 'Bypass / Disable'}
                onClick={onToggleBypass}
              />

              <MenuItem
                icon={<Box className="w-3.5 h-3.5 text-indigo-400" />}
                label="Create Submodule..."
                onClick={onCreateSubmoduleFromSelection}
              />

              {/* Phase 18 Step 18.2: Bind Probe / Meter to Existing Graph Frame */}
              {GraphBindingManager.isProbeComponent(targetComponent.type) && onBindProbeToFrame && (
                <>
                  <Divider />
                  <div className="relative" onMouseEnter={() => setActiveSubmenu('bindToFrame')}>
                    <button
                      type="button"
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
                        activeSubmenu === 'bindToFrame' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sky-400">📈</span>
                        <span>Bind to Graph Frame</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </button>

                    {activeSubmenu === 'bindToFrame' && (
                      <SubmenuContainer>
                        <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Graph Frame</div>
                        {allComponents.filter((c) => c.type === COMPONENT_TYPES.GRAPH_FRAME).length === 0 ? (
                          <div className="px-2 py-1 text-xs text-slate-500 italic">No Graph Frames on sheet</div>
                        ) : (
                          allComponents
                            .filter((c) => c.type === COMPONENT_TYPES.GRAPH_FRAME)
                            .map((frame) => (
                              <MenuItem
                                key={frame.id}
                                icon={<span className="text-sky-400">📈</span>}
                                label={frame.params?.graphTitle || frame.name || 'Graph Frame'}
                                onClick={() => {
                                  onBindProbeToFrame(frame.id, targetComponent);
                                  onClose();
                                }}
                              />
                            ))
                        )}
                      </SubmenuContainer>
                    )}
                  </div>
                </>
              )}

              <Divider />

              <MenuItem icon={<Copy className="w-3.5 h-3.5 text-slate-300" />} label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />
              <MenuItem icon={<Copy className="w-3.5 h-3.5 text-slate-300" />} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
              <MenuItem icon={<Scissors className="w-3.5 h-3.5 text-slate-300" />} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
              <MenuItem icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />} label="Delete" shortcut="Del" danger onClick={onDelete} />
            </>
          )}
        </>
      )}


      {/* 3. MULTI-SELECTION CONTEXT MENU */}
      {type === 'multi' && (
        <>
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#26334a] mb-1">
            {selectedCount} Selected Items
          </div>

          <MenuItem
            icon={<Box className="w-3.5 h-3.5 text-purple-400" />}
            label="Create Submodule from Selection"
            onClick={onCreateSubmoduleFromSelection}
          />

          <Divider />

          <div className="relative" onMouseEnter={() => setActiveSubmenu('align')}>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
                activeSubmenu === 'align' ? 'bg-[#1f6feb] text-white' : 'text-slate-200 hover:bg-[#1f6feb] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlignCenter className="w-3.5 h-3.5 text-blue-400" />
                <span>Align Selection</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>

            {activeSubmenu === 'align' && onAlign && (
              <SubmenuContainer>
                <MenuItem icon={<AlignLeft className="w-3.5 h-3.5" />} label="Align Left" onClick={() => onAlign('alignLeft')} />
                <MenuItem icon={<AlignCenter className="w-3.5 h-3.5" />} label="Align Center" onClick={() => onAlign('alignCenter')} />
                <MenuItem icon={<AlignRight className="w-3.5 h-3.5" />} label="Align Right" onClick={() => onAlign('alignRight')} />
                <Divider />
                <MenuItem icon={<AlignLeft className="w-3.5 h-3.5 rotate-90" />} label="Align Top" onClick={() => onAlign('alignTop')} />
                <MenuItem icon={<AlignCenter className="w-3.5 h-3.5 rotate-90" />} label="Align Middle" onClick={() => onAlign('alignMiddle')} />
                <MenuItem icon={<AlignRight className="w-3.5 h-3.5 rotate-90" />} label="Align Bottom" onClick={() => onAlign('alignBottom')} />
              </SubmenuContainer>
            )}
          </div>

          <MenuItem icon={<RotateCw className="w-3.5 h-3.5 text-amber-400" />} label="Rotate 90°" shortcut="R" onClick={onRotateCW} />
          <MenuItem icon={<Copy className="w-3.5 h-3.5 text-slate-300" />} label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />
          <MenuItem icon={<Copy className="w-3.5 h-3.5 text-slate-300" />} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
          <MenuItem icon={<Scissors className="w-3.5 h-3.5 text-slate-300" />} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
          <Divider />
          <MenuItem icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />} label="Delete Selected" shortcut="Del" danger onClick={onDelete} />
        </>
      )}

      {/* 4. WIRE CONTEXT MENU */}
      {type === 'wire' && targetWire && (
        <>
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#26334a] mb-1">
            Conductor / Wire Properties
          </div>

          {onWirePhaseChange && (
            <>
              <MenuItem
                icon={<span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />}
                label="Standard (Normal)"
                onClick={() => onWirePhaseChange('normal')}
              />
              <MenuItem
                icon={<span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />}
                label="Phase A (Red)"
                onClick={() => onWirePhaseChange('phaseA')}
              />
              <MenuItem
                icon={<span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />}
                label="Phase B (Yellow)"
                onClick={() => onWirePhaseChange('phaseB')}
              />
              <MenuItem
                icon={<span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />}
                label="Phase C (Blue)"
                onClick={() => onWirePhaseChange('phaseC')}
              />
              <MenuItem
                icon={<span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />}
                label="Neutral (Black)"
                onClick={() => onWirePhaseChange('neutral')}
              />
              <Divider />
            </>
          )}

          <MenuItem icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />} label="Delete Wire" shortcut="Del" danger onClick={onDelete} />
        </>
      )}
    </div>
  );
};
