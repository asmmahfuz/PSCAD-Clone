import React, { useRef, useEffect, useState, useCallback } from 'react';
import type {
  CircuitComponentData,
  WireData,
  Pin,
  ThemeType,
  Point,
  TitleBlockData,
  AlignAction,
} from '../../types';
import { COLOR_PALETTES, COMPONENT_TYPES } from '../../constants';
import { SymbolRenderer } from './symbols';
import { getComponentPins } from '../../engine/netlist';
import { simulationEngine } from '../../engine/solver';
import { WireRouter } from './wireRouter';
import { ChevronRight, Home, FolderTree } from 'lucide-react';
import { CanvasContextMenu, type ContextMenuType } from './CanvasContextMenu';
import { GraphFrameRenderer, type ResizeHandle } from './GraphFrame';
import { GraphBindingManager } from './GraphBinding';
import { AxisLimitsModal } from './GraphFrameContextMenu';
import { RuntimeControlsManager } from './RuntimeControls';
import { RuntimeSwitchesManager } from './RuntimeSwitches';
import { SchematicMetersManager } from './SchematicMeters';
import { telemetryStreamer, type CursorSyncPayload } from '../../services/telemetryStreamer';
import { getDefaultComponentParams } from '../../utils/componentDefaults';
import type { InspectorMode } from '../../services/sessionManager';

export interface BreadcrumbItem {
  id: string;
  name: string;
  isRoot: boolean;
}

interface CanvasProps {
  theme: ThemeType;
  components: CircuitComponentData[];
  wires: WireData[];
  toolMode: 'select' | 'wire' | 'place';
  pendingCompType: string | null;
  pendingCustomDefId?: string;
  onClearPendingComp?: () => void;
  onComponentsChange: (comps: CircuitComponentData[]) => void;
  onWiresChange: (wires: WireData[]) => void;
  onSelectComponent: (comp: CircuitComponentData | null) => void;
  selectedComponent: CircuitComponentData | null;
  selectedComponentIds?: Set<string>;
  selectedWireId?: string | null;
  selectedWireIds?: Set<string>;
  onSelectWire?: (wireId: string | null) => void;
  onSelectMultiple?: (compIds: string[], wireIds: string[]) => void;
  setToolMode: (m: 'select' | 'wire') => void;
  onCursorCoords: (coords: { x: number; y: number; zoom: number }) => void;
  onHistoryPush?: (comps: CircuitComponentData[], wires: WireData[], selId?: string | null) => void;

  // Phase 21 Step 21.4: Dual Inspector Mode
  inspectorMode?: InspectorMode;

  // Phase 6: Submodule & Hierarchy Props
  activeSheetName?: string;
  breadcrumbs?: BreadcrumbItem[];
  onNavigateBreadcrumb?: (sheetId: string) => void;
  onDrillDownSubmodule?: (comp: CircuitComponentData) => void;

  // Phase 6: Title Block & Engineering Borders
  showTitleBlock?: boolean;
  titleBlockData?: TitleBlockData;
  projectName?: string;

  // Phase 17: Context Menu & Operations
  onCreateSubmoduleFromSelection?: () => void;
  onOpenParametersModal?: (comp: CircuitComponentData) => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDeleteSelection?: () => void;
  onRotateSelection?: (deg: number) => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onSelectAll?: () => void;
  onAlign?: (type: AlignAction) => void;
  onToggleGrid?: () => void;
  onZoomFit?: () => void;
  hasClipboard?: boolean;
  onPopOutDetached?: (frame: CircuitComponentData) => void;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function applyRuntimeControlSync(
  components: CircuitComponentData[],
  controlCompId: string,
  updatedControlComp: CircuitComponentData,
  value: number | boolean
): CircuitComponentData[] {
  const targetCompId = updatedControlComp.params?.targetCompId;
  const targetParam = updatedControlComp.params?.targetParam;

  return components.map((c) => {
    if (c.id === controlCompId) return updatedControlComp;
    if (targetCompId && c.id === targetCompId) {
      const isBreaker =
        c.type === COMPONENT_TYPES.BREAKER_1PH ||
        c.type === COMPONENT_TYPES.BREAKER_3PH ||
        c.type === COMPONENT_TYPES.TIMED_SWITCH;
      const paramKey =
        targetParam ||
        (isBreaker ? 'isClosed' : c.type === COMPONENT_TYPES.RESISTOR ? 'resistance' : 'value');
      return {
        ...c,
        params: {
          ...c.params,
          [paramKey]: value,
        },
      };
    }
    return c;
  });
}

export const SchematicCanvas: React.FC<CanvasProps> = ({
  theme,
  components,
  wires,
  toolMode,
  pendingCompType,
  pendingCustomDefId,
  onClearPendingComp,
  onComponentsChange,
  onWiresChange,
  onSelectComponent,
  selectedComponent,
  selectedComponentIds = new Set(),
  selectedWireId,
  selectedWireIds = new Set(),
  onSelectWire,
  onSelectMultiple,
  setToolMode,
  onCursorCoords,
  onHistoryPush,
  inspectorMode = 'docked',
  activeSheetName = 'Main Schematic',
  breadcrumbs = [{ id: 'root', name: 'Main Schematic', isRoot: true }],
  onNavigateBreadcrumb,
  onDrillDownSubmodule,
  showTitleBlock = true,
  titleBlockData,
  projectName = 'PSCAD Project',
  onCreateSubmoduleFromSelection,
  onOpenParametersModal,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDeleteSelection,
  onRotateSelection,
  onFlipHorizontal,
  onFlipVertical,
  onSelectAll,
  onAlign,
  onToggleGrid,
  onZoomFit,
  hasClipboard = false,
  onPopOutDetached,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Point>({ x: 80, y: 80 });

  // Interactions
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [origGroupPositions, setOrigGroupPositions] = useState<Map<string, Point>>(new Map());
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // Runtime Controls Drag State
  const [activeControlDrag, setActiveControlDrag] = useState<{
    compId: string;
    type: 'slider' | 'dial' | 'button';
  } | null>(null);

  // Graph Frame Resize Handle Drag State
  const [activeResizeHandle, setActiveResizeHandle] = useState<{
    compId: string;
    handle: ResizeHandle;
    origBounds: { x: number; y: number; w: number; h: number };
    startWorld: Point;
  } | null>(null);

  // Marquee Drag Selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<Point>({ x: 0, y: 0 });
  const [selectEnd, setSelectEnd] = useState<Point>({ x: 0, y: 0 });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    type: ContextMenuType;
    targetComponent?: CircuitComponentData | null;
    targetWire?: WireData | null;
  } | null>(null);

  // Phase 18 Step 18.4: Axis Limits Modal & Toast State
  const [axisLimitsFrame, setAxisLimitsFrame] = useState<CircuitComponentData | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 3500);
  }, []);

  const [activeWire, setActiveWire] = useState<{ startPin: string; points: Point[] } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point>({ x: 0, y: 0 });
  const [syncedCrosshairTime, setSyncedCrosshairTime] = useState<number | null>(null);

  // Subscribe to telemetry cursor sync from popout detached window
  useEffect(() => {
    const unsubscribe = telemetryStreamer.subscribeCursor((cursorData: CursorSyncPayload) => {
      if (cursorData.sourceWindow === 'popout') {
        setSyncedCrosshairTime(cursorData.crosshairTime ?? null);
      }
    });
    return unsubscribe;
  }, []);

  const gridSize = 20;

  const colors = COLOR_PALETTES[theme.toUpperCase() as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.DARK;

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const snap = useCallback(
    (val: number) => {
      return Math.round(val / gridSize) * gridSize;
    },
    [gridSize]
  );

  // Find pin at world coords
  const findPinAt = useCallback(
    (wx: number, wy: number, radius = 12): Pin | null => {
      for (const comp of components) {
        const pins = getComponentPins(comp);
        for (const pin of pins) {
          if (Math.hypot(pin.x - wx, pin.y - wy) <= radius) {
            return pin;
          }
        }
      }
      return null;
    },
    [components]
  );

  // Find component at world coords
  const findCompAt = useCallback(
    (wx: number, wy: number): CircuitComponentData | null => {
      for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (c.type === COMPONENT_TYPES.GRAPH_FRAME) {
          const bounds = GraphFrameRenderer.getBounds(c);
          if (wx >= bounds.x && wx <= bounds.x + bounds.w && wy >= bounds.y && wy <= bounds.y + bounds.h) {
            return c;
          }
        } else if (c.type === COMPONENT_TYPES.RUNTIME_SLIDER) {
          if (RuntimeControlsManager.hitTestSlider(c, wx, wy)) {
            return c;
          }
        } else if (c.type === COMPONENT_TYPES.RUNTIME_DIAL) {
          if (RuntimeControlsManager.hitTestDial(c, wx, wy)) {
            return c;
          }
        } else if (c.type === COMPONENT_TYPES.RUNTIME_BUTTON) {
          if (RuntimeSwitchesManager.hitTestButton(c, wx, wy)) {
            return c;
          }
        } else if (c.type === COMPONENT_TYPES.RUNTIME_SWITCH) {
          if (RuntimeSwitchesManager.hitTestSwitch(c, wx, wy)) {
            return c;
          }
        } else {
          if (Math.abs(wx - c.x) <= 50 && Math.abs(wy - c.y) <= 50) {
            return c;
          }
        }
      }
      return null;
    },
    [components]
  );

  // Find wire at world coords
  const findWireAt = useCallback(
    (wx: number, wy: number, threshold = 8): WireData | null => {
      for (let i = wires.length - 1; i >= 0; i--) {
        const wire = wires[i];
        for (let j = 0; j < wire.points.length - 1; j++) {
          const p1 = wire.points[j];
          const p2 = wire.points[j + 1];
          if (distToSegment(wx, wy, p1.x, p1.y, p2.x, p2.y) <= threshold) {
            return wire;
          }
        }
      }
      return null;
    },
    [wires]
  );

  // Redraw Canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    try {
      ctx.clearRect(0, 0, width, height);

      // 1. Background
      ctx.fillStyle = colors.canvasBg;
      ctx.fillRect(0, 0, width, height);

      // 2. Grid dots
      const start = screenToWorld(0, 0);
      const end = screenToWorld(width, height);
      const startX = Math.floor(start.x / gridSize) * gridSize;
      const startY = Math.floor(start.y / gridSize) * gridSize;

      ctx.fillStyle = colors.gridDot;
      for (let x = startX; x < end.x; x += gridSize) {
        for (let y = startY; y < end.y; y += gridSize) {
          const sx = x * zoom + pan.x;
          const sy = y * zoom + pan.y;
          ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }
      }

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 2.5 Phase 6: Engineering Sheet Border & Title Block
      if (showTitleBlock) {
        const borderX = 20;
        const borderY = 20;
        const borderW = 1600;
        const borderH = 1000;

        // Outer margin border
        ctx.strokeStyle = 'rgba(56, 139, 253, 0.45)';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(borderX, borderY, borderW, borderH);

        // Inner margin border
        ctx.strokeStyle = 'rgba(56, 139, 253, 0.25)';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(borderX + 10, borderY + 10, borderW - 20, borderH - 20);

        // Zone Coordinate Grid Marks
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cols = ['1', '2', '3', '4', '5', '6', '7', '8'];
        cols.forEach((col, idx) => {
          const xPos = borderX + (idx + 0.5) * (borderW / cols.length);
          ctx.fillText(col, xPos, borderY + 5);
          ctx.fillText(col, xPos, borderY + borderH - 5);
        });

        const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
        rows.forEach((row, idx) => {
          const yPos = borderY + (idx + 0.5) * (borderH / rows.length);
          ctx.fillText(row, borderX + 5, yPos);
          ctx.fillText(row, borderX + borderW - 5, yPos);
        });

        // Title Block in Lower-Right Corner
        const tbW = 280;
        const tbH = 100;
        const tbX = borderX + borderW - 10 - tbW;
        const tbY = borderY + borderH - 10 - tbH;

        ctx.fillStyle = '#161b26';
        ctx.fillRect(tbX, tbY, tbW, tbH);
        ctx.strokeStyle = '#388bfd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tbX, tbY, tbW, tbH);

        // Grid lines inside title block
        ctx.strokeStyle = 'rgba(56, 139, 253, 0.3)';
        ctx.beginPath();
        ctx.moveTo(tbX, tbY + 28);
        ctx.lineTo(tbX + tbW, tbY + 28);
        ctx.moveTo(tbX, tbY + 64);
        ctx.lineTo(tbX + tbW, tbY + 64);
        ctx.moveTo(tbX + 140, tbY + 64);
        ctx.lineTo(tbX + 140, tbY + tbH);
        ctx.stroke();

        // Title block content
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#58a6ff';
        ctx.textAlign = 'left';
        ctx.fillText(titleBlockData?.company || 'PSCAD CLONE CAD SUITE', tbX + 8, tbY + 18);

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(titleBlockData?.title || projectName, tbX + 8, tbY + 44);

        ctx.font = '10px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Sheet: ${activeSheetName}`, tbX + 8, tbY + 58);
        ctx.fillText(`Doc: ${titleBlockData?.docNumber || 'DWG-001'}`, tbX + 8, tbY + 80);
        ctx.fillText(`Rev: ${titleBlockData?.rev || '1.0'} | ${titleBlockData?.date || '2026-08'}`, tbX + 8, tbY + 92);
        ctx.fillText(`By: ${titleBlockData?.author || 'Engineer'}`, tbX + 148, tbY + 80);

        // Status badge
        ctx.fillStyle = simulationEngine.isRunning ? '#238636' : '#1e293b';
        ctx.fillRect(tbX + 148, tbY + 85, 124, 12);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = simulationEngine.isRunning ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(simulationEngine.isRunning ? 'LIVE EMTDC SIMULATION' : 'CAD DESIGN MODE', tbX + 210, tbY + 94);
      }

      // 3. Render Wires
      const pinMap = new Map<string, Pin>();
      for (const comp of components) {
        for (const pin of getComponentPins(comp)) {
          pinMap.set(pin.id, pin);
        }
      }

      wires.forEach((wire) => {
        const isSelected = selectedWireIds.has(wire.id) || wire.id === selectedWireId || wire.selected;
        const startP = wire.startPin ? pinMap.get(wire.startPin) : null;
        const endP = wire.endPin ? pinMap.get(wire.endPin) : null;
        const isControl = wire.domain === 'control' || startP?.domain === 'control' || endP?.domain === 'control';
        const isPolyphase = wire.domain === 'polyphase' || startP?.domain === 'polyphase' || endP?.domain === 'polyphase';

        ctx.beginPath();
        if (isSelected) {
          ctx.strokeStyle = isControl ? '#34d399' : '#58a6ff';
          ctx.lineWidth = isPolyphase ? 5.0 : isControl ? 3.5 : 4.0;
        } else {
          ctx.strokeStyle = isControl
            ? colors.wireControl || '#10b981'
            : isPolyphase
              ? colors.wirePolyphase || '#38bdf8'
              : colors.wireNormal;
          ctx.lineWidth = isPolyphase ? 4.0 : isControl ? 2.0 : 2.2;
        }

        const pts = wire.points || [];
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        if (pts.length > 0) ctx.stroke();

        // Junction dots
        pts.forEach((p) => {
          ctx.beginPath();
          if (isControl) {
            ctx.rect(p.x - 2.5, p.y - 2.5, 5, 5);
          } else {
            ctx.arc(p.x, p.y, isPolyphase ? 3.5 : 2.5, 0, 2 * Math.PI);
          }
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        });
      });

      // 4. Render Active Wire Preview with Manhattan Auto-Routing
      if (activeWire && activeWire.points && activeWire.points.length >= 2) {
        const startP = pinMap.get(activeWire.startPin);
        const isControl = startP?.domain === 'control';
        const isPolyphase = startP?.domain === 'polyphase';

        ctx.save();
        ctx.strokeStyle = isControl ? '#10b981' : isPolyphase ? '#00e5ff' : colors.pinHover;
        ctx.lineWidth = isPolyphase ? 3.5 : 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        const p1 = activeWire.points[0];
        const p2 = activeWire.points[1];
        const routed = WireRouter.routeOrthogonal(p1, p2, components);

        for (let i = 0; i < routed.length; i++) {
          if (i === 0) ctx.moveTo(routed[i].x, routed[i].y);
          else ctx.lineTo(routed[i].x, routed[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Render Components
      components.forEach((comp) => {
        const compState = simulationEngine.componentStates.get(comp.id) || {};
        const isSelected = selectedComponentIds.has(comp.id) || selectedComponent?.id === comp.id;
        const isDraggingThis = activeControlDrag?.compId === comp.id;
        const isHoveredThis =
          hoveredPin === null &&
          mouseWorldPos !== null &&
          (comp.type === COMPONENT_TYPES.RUNTIME_SLIDER
            ? RuntimeControlsManager.hitTestSlider(comp, mouseWorldPos.x, mouseWorldPos.y)
            : comp.type === COMPONENT_TYPES.RUNTIME_DIAL
              ? RuntimeControlsManager.hitTestDial(comp, mouseWorldPos.x, mouseWorldPos.y)
              : comp.type === COMPONENT_TYPES.RUNTIME_BUTTON
                ? RuntimeSwitchesManager.hitTestButton(comp, mouseWorldPos.x, mouseWorldPos.y)
                : comp.type === COMPONENT_TYPES.RUNTIME_SWITCH
                  ? RuntimeSwitchesManager.hitTestSwitch(comp, mouseWorldPos.x, mouseWorldPos.y)
                  : comp.type === COMPONENT_TYPES.RUNTIME_GAUGE
                    ? SchematicMetersManager.hitTestGauge(comp, mouseWorldPos.x, mouseWorldPos.y)
                    : comp.type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY
                      ? SchematicMetersManager.hitTestDigitalDisplay(comp, mouseWorldPos.x, mouseWorldPos.y)
                      : false);

        const state = {
          ...compState,
          signalsMap: simulationEngine.getSignals(),
          isSelected,
          isDragging: isDraggingThis,
          isHovered: isHoveredThis,
        };

        if (comp.type === COMPONENT_TYPES.GRAPH_FRAME) {
          GraphFrameRenderer.render(ctx, comp, colors, simulationEngine.getSignals(), isSelected, components, mouseWorldPos, syncedCrosshairTime);
          return;
        }

        if (
          isSelected &&
          comp.type !== COMPONENT_TYPES.RUNTIME_SLIDER &&
          comp.type !== COMPONENT_TYPES.RUNTIME_DIAL &&
          comp.type !== COMPONENT_TYPES.RUNTIME_BUTTON &&
          comp.type !== COMPONENT_TYPES.RUNTIME_SWITCH &&
          comp.type !== COMPONENT_TYPES.RUNTIME_GAUGE &&
          comp.type !== COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY
        ) {
          ctx.save();
          ctx.fillStyle = 'rgba(56, 139, 253, 0.18)';
          ctx.strokeStyle = '#388bfd';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.roundRect(comp.x - 50, comp.y - 50, 100, 100, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        if (comp.bypassed) {
          ctx.save();
          ctx.globalAlpha = 0.45;
        }

        SymbolRenderer.render(ctx, comp, colors, state);

        if (comp.bypassed) {
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(comp.x - 22, comp.y - 22);
          ctx.lineTo(comp.x + 22, comp.y + 22);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('BYPASS', comp.x - 18, comp.y + 30);
          ctx.restore();
        }

        // In Wire or Select mode, draw domain pins
        const pins = getComponentPins(comp);
        pins.forEach((pin) => {
          ctx.save();
          if (pin.domain === 'control') {
            ctx.strokeStyle = colors.pinControl || '#10b981';
            ctx.fillStyle = colors.componentBody;
            ctx.lineWidth = 1.5;
            ctx.fillRect(pin.x - 3.5, pin.y - 3.5, 7, 7);
            ctx.strokeRect(pin.x - 3.5, pin.y - 3.5, 7, 7);
          } else if (pin.domain === 'polyphase') {
            ctx.strokeStyle = colors.pinPolyphase || '#00e5ff';
            ctx.fillStyle = colors.componentBody;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 4.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        });
      });

      // 6. Placement Mode Ghost Preview
      if (pendingCompType) {
        const ghostX = snap(mouseWorldPos.x);
        const ghostY = snap(mouseWorldPos.y);
        ctx.save();
        ctx.globalAlpha = 0.65;
        const ghostComp: CircuitComponentData = {
          id: 'ghost_preview',
          type: pendingCompType,
          name: pendingCompType,
          x: ghostX,
          y: ghostY,
          rotation: 0,
          params: {},
        };
        ctx.strokeStyle = '#388bfd';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(ghostX - 45, ghostY - 45, 90, 90);
        SymbolRenderer.render(ctx, ghostComp, colors, {});
        ctx.restore();
      }

      // 7. Marquee Drag-Selection Box
      if (isSelecting) {
        const minX = Math.min(selectStart.x, selectEnd.x);
        const maxX = Math.max(selectStart.x, selectEnd.x);
        const minY = Math.min(selectStart.y, selectEnd.y);
        const maxY = Math.max(selectStart.y, selectEnd.y);
        const w = maxX - minX;
        const h = maxY - minY;

        ctx.save();
        ctx.fillStyle = 'rgba(56, 139, 253, 0.15)';
        ctx.strokeStyle = '#388bfd';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(minX, minY, w, h);
        ctx.strokeRect(minX, minY, w, h);
        ctx.restore();
      }

      // 8. Pin Hover Indicator
      if (hoveredPin) {
        ctx.save();
        if (hoveredPin.domain === 'control') {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(hoveredPin.x - 5, hoveredPin.y - 5, 10, 10);
        } else if (hoveredPin.domain === 'polyphase') {
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(hoveredPin.x, hoveredPin.y, 6.5, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          ctx.strokeStyle = colors.pinHover;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(hoveredPin.x, hoveredPin.y, 6, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
    } catch (err) {
      console.error('SchematicCanvas render error:', err);
    }
  }, [
    colors,
    pan,
    zoom,
    components,
    wires,
    activeWire,
    hoveredPin,
    selectedComponent,
    selectedComponentIds,
    selectedWireId,
    selectedWireIds,
    pendingCompType,
    mouseWorldPos,
    isSelecting,
    selectStart,
    selectEnd,
    showTitleBlock,
    titleBlockData,
    projectName,
    activeSheetName,
    screenToWorld,
    gridSize,
    snap,
  ]);

  // Window Resize & AuxClick Prevention
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        render();
      }
    };
    const handleAux = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('auxclick', handleAux, { capture: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('auxclick', handleAux, { capture: true });
    };
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  // Mouse Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    // Middle click / side button click / Alt+Left: Pan canvas
    if (e.button === 1 || e.button === 3 || e.button === 4 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      setPanStart({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    // Right Click: Cancel current action / selection
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      if (activeWire) {
        setActiveWire(null);
        return;
      }
      if (pendingCompType && onClearPendingComp) {
        onClearPendingComp();
        setToolMode('select');
        return;
      }
      if (isSelecting) {
        setIsSelecting(false);
        return;
      }
      if (selectedComponent || selectedComponentIds.size > 0) {
        onSelectComponent(null);
        onSelectMultiple?.([], []);
        return;
      }
      if (selectedWireId && onSelectWire) {
        onSelectWire(null);
        return;
      }
      return;
    }

    if (e.button === 0) {
      // 0. Check interactive Legend item hit on any Graph Frame
      for (const comp of components) {
        if (comp.type === COMPONENT_TYPES.GRAPH_FRAME) {
          const legendItem = GraphFrameRenderer.getLegendItemAt(comp, world.x, world.y, simulationEngine.getSignals(), components);
          if (legendItem) {
            const updatedFrame = GraphBindingManager.toggleTraceVisibility(comp, legendItem.trace.signalName, components);
            const updated = components.map((c) => (c.id === comp.id ? updatedFrame : c));
            onComponentsChange(updated);
            onHistoryPush?.(updated, wires, comp.id);
            return;
          }
        }
      }

      // Check resize handle hit on selected Graph Frame
      if (selectedComponent && selectedComponent.type === COMPONENT_TYPES.GRAPH_FRAME) {
        const hnd = GraphFrameRenderer.getResizeHandleAt(selectedComponent, world.x, world.y, 10);
        if (hnd) {
          const bounds = GraphFrameRenderer.getBounds(selectedComponent);
          setActiveResizeHandle({
            compId: selectedComponent.id,
            handle: hnd.type,
            origBounds: bounds,
            startWorld: { x: world.x, y: world.y },
          });
          return;
        }
      }

      // 1. Placement Mode
      if (toolMode === 'place' && pendingCompType) {
        const snapX = snap(world.x);
        const snapY = snap(world.y);
        const newComp: CircuitComponentData = {
          id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: pendingCompType,
          name: `${pendingCompType.toUpperCase().substring(0, 4)}_${components.length + 1}`,
          x: snapX,
          y: snapY,
          rotation: 0,
          params: {
            ...getDefaultComponentParams(pendingCompType),
            ...(pendingCustomDefId ? { customDefId: pendingCustomDefId } : {}),
          },
        };
        const nextComps = [...components, newComp];
        onComponentsChange(nextComps);
        onSelectComponent(newComp);
        onSelectMultiple?.([newComp.id], []);
        onSelectWire?.(null);
        onHistoryPush?.(nextComps, wires, newComp.id);

        if (!e.shiftKey) {
          if (onClearPendingComp) onClearPendingComp();
          setToolMode('select');
        }
        return;
      }

      // 2. Interactive Runtime Controls on Canvas (Slider, Dial, Button, Switch)
      const hitComp = findCompAt(world.x, world.y);
      if (hitComp) {
        // Double Click Detection
        if (e.detail === 2) {
          if (hitComp.type === COMPONENT_TYPES.SUBMODULE) {
            onDrillDownSubmodule?.(hitComp);
            return;
          }
          if (hitComp.type === COMPONENT_TYPES.RUNTIME_GAUGE) {
            const updatedComp = SchematicMetersManager.resetPeakHold(hitComp);
            const updated = components.map((c) => (c.id === hitComp.id ? updatedComp : c));
            onComponentsChange(updated);
            onSelectComponent(updatedComp);
            onSelectMultiple?.([updatedComp.id], []);
            onHistoryPush?.(updated, wires, hitComp.id);
            return;
          }
          if (hitComp.type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY) {
            const updatedComp = SchematicMetersManager.toggleDisplayMode(hitComp);
            const updated = components.map((c) => (c.id === hitComp.id ? updatedComp : c));
            onComponentsChange(updated);
            onSelectComponent(updatedComp);
            onSelectMultiple?.([updatedComp.id], []);
            onHistoryPush?.(updated, wires, hitComp.id);
            return;
          }

          // Double Click on any component opens the dedicated Multi-Tab Parameter Modal
          onSelectComponent(hitComp);
          onSelectMultiple?.([hitComp.id], []);
          onOpenParametersModal?.(hitComp);
          return;
        }

        // Slider Knob Drag
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_SLIDER) {
          const val = RuntimeControlsManager.computeSliderValue(hitComp, world.x, world.y);
          const updatedComp = RuntimeControlsManager.setValue(hitComp, val);
          const updated = applyRuntimeControlSync(components, hitComp.id, updatedComp, val);
          onComponentsChange(updated);
          onSelectComponent(updatedComp);
          onSelectMultiple?.([updatedComp.id], []);
          simulationEngine.setRuntimeControlValue(hitComp.id, val);
          setActiveControlDrag({ compId: hitComp.id, type: 'slider' });
          return;
        }

        // Dial Knob Drag
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_DIAL) {
          const val = RuntimeControlsManager.computeDialValue(hitComp, world.x, world.y);
          const updatedComp = RuntimeControlsManager.setValue(hitComp, val);
          const updated = applyRuntimeControlSync(components, hitComp.id, updatedComp, val);
          onComponentsChange(updated);
          onSelectComponent(updatedComp);
          onSelectMultiple?.([updatedComp.id], []);
          simulationEngine.setRuntimeControlValue(hitComp.id, val);
          setActiveControlDrag({ compId: hitComp.id, type: 'dial' });
          return;
        }

        // Push Button
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_BUTTON) {
          const isToggleMode = hitComp.params?.mode === 'toggle';
          const nextState = isToggleMode ? !(hitComp.params?.buttonState || false) : true;
          const updatedComp = RuntimeSwitchesManager.setButtonState(hitComp, nextState);
          const updated = applyRuntimeControlSync(components, hitComp.id, updatedComp, nextState);
          onComponentsChange(updated);
          onSelectComponent(updatedComp);
          onSelectMultiple?.([updatedComp.id], []);
          simulationEngine.setRuntimeControlValue(hitComp.id, nextState);
          if (!isToggleMode) {
            setActiveControlDrag({ compId: hitComp.id, type: 'button' });
          } else {
            onHistoryPush?.(updated, wires, hitComp.id);
          }
          return;
        }

        // Toggle Switch
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_SWITCH) {
          const updatedComp = RuntimeSwitchesManager.toggleSwitch(hitComp);
          const nextState = Boolean(updatedComp.params?.switchState);
          const updated = applyRuntimeControlSync(components, hitComp.id, updatedComp, nextState);
          onComponentsChange(updated);
          onSelectComponent(updatedComp);
          onSelectMultiple?.([updatedComp.id], []);
          simulationEngine.setRuntimeControlValue(hitComp.id, nextState);
          onHistoryPush?.(updated, wires, hitComp.id);
          return;
        }

        // Analog Gauge - Peak Hold Reset
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_GAUGE) {
          if (e.detail === 2 || e.altKey) {
            const updatedComp = SchematicMetersManager.resetPeakHold(hitComp);
            const updated = components.map((c) => (c.id === hitComp.id ? updatedComp : c));
            onComponentsChange(updated);
            onSelectComponent(updatedComp);
            onSelectMultiple?.([updatedComp.id], []);
            onHistoryPush?.(updated, wires, hitComp.id);
            return;
          }
        }

        // Digital Display - Mode Toggle
        if (hitComp.type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY) {
          if (e.detail === 2 || e.altKey) {
            const updatedComp = SchematicMetersManager.toggleDisplayMode(hitComp);
            const updated = components.map((c) => (c.id === hitComp.id ? updatedComp : c));
            onComponentsChange(updated);
            onSelectComponent(updatedComp);
            onSelectMultiple?.([updatedComp.id], []);
            onHistoryPush?.(updated, wires, hitComp.id);
            return;
          }
        }

        // Breaker toggle
        if (
          hitComp.type === COMPONENT_TYPES.BREAKER_1PH ||
          hitComp.type === COMPONENT_TYPES.BREAKER_3PH ||
          hitComp.type === COMPONENT_TYPES.TIMED_SWITCH
        ) {
          if (simulationEngine.isRunning) {
            simulationEngine.toggleBreaker(hitComp.id);
            render();
            return;
          }
        }
      }

      // 3. Wire Mode or Click Pin
      const hitPin = findPinAt(world.x, world.y);
      if (hitPin || toolMode === 'wire') {
        if (hitPin && !activeWire) {
          setActiveWire({
            startPin: hitPin.id,
            points: [{ x: hitPin.x, y: hitPin.y }, { x: world.x, y: world.y }],
          });
          onSelectComponent(null);
          onSelectMultiple?.([], []);
          onSelectWire?.(null);
          return;
        } else if (activeWire) {
          const endPin = hitPin ? hitPin.id : null;
          const endPt = hitPin ? { x: hitPin.x, y: hitPin.y } : { x: snap(world.x), y: snap(world.y) };
          const p1 = activeWire.points[0];

          // Use Manhattan Orthogonal Router
          const routedPts = WireRouter.routeOrthogonal(p1, endPt, components);

          const newWire: WireData = {
            id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            startPin: activeWire.startPin,
            endPin: endPin,
            points: routedPts,
          };
          const nextWires = [...wires, newWire];
          onWiresChange(nextWires);
          onHistoryPush?.(components, nextWires, null);
          setActiveWire(null);
          return;
        }
      }

      // 4. Click Component Selection
      if (hitComp) {
        const isMultiMod = e.shiftKey || e.ctrlKey || e.metaKey;
        let newSelectedIds: Set<string>;

        if (isMultiMod) {
          newSelectedIds = new Set(selectedComponentIds);
          if (newSelectedIds.has(hitComp.id)) {
            newSelectedIds.delete(hitComp.id);
          } else {
            newSelectedIds.add(hitComp.id);
          }
        } else {
          if (selectedComponentIds.has(hitComp.id) && selectedComponentIds.size > 1) {
            newSelectedIds = new Set(selectedComponentIds);
          } else {
            newSelectedIds = new Set([hitComp.id]);
          }
        }

        onSelectComponent(hitComp);
        onSelectMultiple?.(Array.from(newSelectedIds), []);
        onSelectWire?.(null);

        const groupPositions = new Map<string, Point>();
        components.forEach((c) => {
          if (newSelectedIds.has(c.id)) {
            groupPositions.set(c.id, { x: c.x, y: c.y });
          }
        });
        setOrigGroupPositions(groupPositions);

        setIsDragging(true);
        setHasMovedDuringDrag(false);
        setDragStart({ x: world.x, y: world.y });
        return;
      }

      // 5. Click Wire Selection
      const hitWire = findWireAt(world.x, world.y);
      if (hitWire) {
        const isMultiMod = e.shiftKey || e.ctrlKey || e.metaKey;
        if (isMultiMod) {
          const nextWires = new Set(selectedWireIds);
          if (nextWires.has(hitWire.id)) nextWires.delete(hitWire.id);
          else nextWires.add(hitWire.id);
          onSelectMultiple?.(Array.from(selectedComponentIds), Array.from(nextWires));
        } else {
          onSelectWire?.(hitWire.id);
          onSelectMultiple?.([], [hitWire.id]);
          onSelectComponent(null);
        }
        return;
      }

      // 6. Click Empty Background: Start Marquee Drag Box Selection
      const isMultiMod = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isMultiMod) {
        onSelectComponent(null);
        onSelectMultiple?.([], []);
        onSelectWire?.(null);
      }
      setActiveWire(null);
      setIsSelecting(true);
      setSelectStart({ x: world.x, y: world.y });
      setSelectEnd({ x: world.x, y: world.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    setMouseWorldPos(world);

    onCursorCoords({
      x: Math.round(world.x),
      y: Math.round(world.y),
      zoom: Math.round(zoom * 100),
    });

    if (isPanning) {
      setPan({ x: sx - panStart.x, y: sy - panStart.y });
      return;
    }

    // Active Graph Frame Resizing
    if (activeResizeHandle) {
      const { compId, handle, origBounds, startWorld } = activeResizeHandle;
      const dx = snap(world.x - startWorld.x);
      const dy = snap(world.y - startWorld.y);
      let newX = origBounds.x;
      let newY = origBounds.y;
      let newW = origBounds.w;
      let newH = origBounds.h;
      const minW = 200;
      const minH = 120;

      if (handle.includes('e')) newW = Math.max(minW, origBounds.w + dx);
      if (handle.includes('s')) newH = Math.max(minH, origBounds.h + dy);
      if (handle.includes('w')) {
        const maxDx = origBounds.w - minW;
        const appliedDx = Math.min(maxDx, dx);
        newX = origBounds.x + appliedDx;
        newW = origBounds.w - appliedDx;
      }
      if (handle.includes('n')) {
        const maxDy = origBounds.h - minH;
        const appliedDy = Math.min(maxDy, dy);
        newY = origBounds.y + appliedDy;
        newH = origBounds.h - appliedDy;
      }

      const updated = components.map((c) =>
        c.id === compId
          ? {
            ...c,
            x: newX,
            y: newY,
            params: {
              ...c.params,
              graphWidth: newW,
              graphHeight: newH,
            },
          }
          : c
      );
      onComponentsChange(updated);
      return;
    }

    // Active Runtime Control Dragging (Continuous slider or dial modulation)
    if (activeControlDrag) {
      const comp = components.find((c) => c.id === activeControlDrag.compId);
      if (comp) {
        if (activeControlDrag.type === 'slider') {
          const val = RuntimeControlsManager.computeSliderValue(comp, world.x, world.y);
          const updatedComp = RuntimeControlsManager.setValue(comp, val);
          const updated = applyRuntimeControlSync(components, comp.id, updatedComp, val);
          onComponentsChange(updated);
          simulationEngine.setRuntimeControlValue(comp.id, val);
          return;
        } else if (activeControlDrag.type === 'dial') {
          const val = RuntimeControlsManager.computeDialValue(comp, world.x, world.y);
          const updatedComp = RuntimeControlsManager.setValue(comp, val);
          const updated = applyRuntimeControlSync(components, comp.id, updatedComp, val);
          onComponentsChange(updated);
          simulationEngine.setRuntimeControlValue(comp.id, val);
          return;
        }
      }
    }

    // Marquee Drag Selection Box Update
    if (isSelecting) {
      setSelectEnd({ x: world.x, y: world.y });
      return;
    }

    // Multi-Component Group Dragging
    if (isDragging && (selectedComponent || selectedComponentIds.size > 0)) {
      const dx = snap(world.x - dragStart.x);
      const dy = snap(world.y - dragStart.y);
      if (dx !== 0 || dy !== 0) {
        setHasMovedDuringDrag(true);
      }

      const activeIds =
        selectedComponentIds.size > 0
          ? selectedComponentIds
          : selectedComponent
            ? new Set([selectedComponent.id])
            : new Set<string>();

      const updated = components.map((c) => {
        if (activeIds.has(c.id)) {
          const orig = origGroupPositions.get(c.id) || { x: c.x, y: c.y };
          return { ...c, x: orig.x + dx, y: orig.y + dy };
        }
        return c;
      });
      onComponentsChange(updated);
      return;
    }

    if (activeWire) {
      setActiveWire({
        ...activeWire,
        points: [activeWire.points[0], { x: snap(world.x), y: snap(world.y) }],
      });
      return;
    }

    const pin = findPinAt(world.x, world.y);
    setHoveredPin(pin);

    // Update cursor for Graph Frame legend items or resize handles
    let customCursor = false;
    for (const comp of components) {
      if (comp.type === COMPONENT_TYPES.GRAPH_FRAME) {
        const legendItem = GraphFrameRenderer.getLegendItemAt(comp, world.x, world.y, simulationEngine.getSignals(), components);
        if (legendItem) {
          canvas.style.cursor = 'pointer';
          customCursor = true;
          break;
        }
      }
    }

    if (!customCursor && selectedComponent && selectedComponent.type === COMPONENT_TYPES.GRAPH_FRAME) {
      const hnd = GraphFrameRenderer.getResizeHandleAt(selectedComponent, world.x, world.y, 10);
      if (hnd) {
        canvas.style.cursor = hnd.cursor;
        customCursor = true;
      }
    }

    if (!customCursor) {
      for (const comp of components) {
        if (comp.type === COMPONENT_TYPES.RUNTIME_SLIDER) {
          if (RuntimeControlsManager.hitTestSlider(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        } else if (comp.type === COMPONENT_TYPES.RUNTIME_DIAL) {
          if (RuntimeControlsManager.hitTestDial(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        } else if (comp.type === COMPONENT_TYPES.RUNTIME_BUTTON) {
          if (RuntimeSwitchesManager.hitTestButton(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        } else if (comp.type === COMPONENT_TYPES.RUNTIME_SWITCH) {
          if (RuntimeSwitchesManager.hitTestSwitch(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        } else if (comp.type === COMPONENT_TYPES.RUNTIME_GAUGE) {
          if (SchematicMetersManager.hitTestGauge(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        } else if (comp.type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY) {
          if (SchematicMetersManager.hitTestDigitalDisplay(comp, world.x, world.y)) {
            canvas.style.cursor = 'pointer';
            customCursor = true;
            break;
          }
        }
      }
    }

    if (!customCursor && !isPanning && !isDragging && !activeWire) {
      canvas.style.cursor = '';
    }

    // Telemetry crosshair synchronization with detached scope window
    let isHoveringGraphPlot = false;
    for (const comp of components) {
      if (comp.type === COMPONENT_TYPES.GRAPH_FRAME) {
        const bounds = GraphFrameRenderer.getBounds(comp);
        const plotX = bounds.x + GraphFrameRenderer.MARGIN_LEFT;
        const plotY = bounds.y + GraphFrameRenderer.MARGIN_TOP;
        const plotW = Math.max(10, bounds.w - GraphFrameRenderer.MARGIN_LEFT - GraphFrameRenderer.MARGIN_RIGHT);
        const plotH = Math.max(10, bounds.h - GraphFrameRenderer.MARGIN_TOP - GraphFrameRenderer.MARGIN_BOTTOM);

        if (world.x >= plotX && world.x <= plotX + plotW && world.y >= plotY && world.y <= plotY + plotH) {
          isHoveringGraphPlot = true;
          const timeData = simulationEngine.getSignals().get('Time') || [];
          const tMin = 0;
          const tMax = timeData.length > 0 ? timeData[timeData.length - 1] : 0.5;
          const targetTime = tMin + ((world.x - plotX) / Math.max(1e-6, plotW)) * (tMax - tMin);
          setSyncedCrosshairTime(targetTime);
          telemetryStreamer.broadcastCursor({
            crosshairTime: targetTime,
            sourceWindow: 'main',
            frameId: comp.id,
          });
          break;
        }
      }
    }

    if (!isHoveringGraphPlot && syncedCrosshairTime !== null) {
      setSyncedCrosshairTime(null);
      telemetryStreamer.broadcastCursor({
        crosshairTime: null,
        sourceWindow: 'main',
      });
    }
  };

  const handlePointerLeave = () => {
    if (syncedCrosshairTime !== null) {
      setSyncedCrosshairTime(null);
      telemetryStreamer.broadcastCursor({
        crosshairTime: null,
        sourceWindow: 'main',
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : null;
    const world = rect ? screenToWorld(e.clientX - rect.left, e.clientY - rect.top) : { x: 0, y: 0 };

    // Finish Graph Frame Resize
    if (activeResizeHandle) {
      onHistoryPush?.(components, wires, activeResizeHandle.compId);
      setActiveResizeHandle(null);
    }

    // Release runtime control drag & push undo/redo checkpoint
    if (activeControlDrag) {
      if (activeControlDrag.type === 'slider' || activeControlDrag.type === 'dial') {
        onHistoryPush?.(components, wires, activeControlDrag.compId);
      }
      if (activeControlDrag.type === 'button') {
        const comp = components.find((c) => c.id === activeControlDrag.compId);
        if (comp && comp.params?.mode !== 'toggle') {
          const updatedComp = RuntimeSwitchesManager.setButtonState(comp, false);
          const updated = applyRuntimeControlSync(components, activeControlDrag.compId, updatedComp, false);
          onComponentsChange(updated);
          simulationEngine.setRuntimeControlValue(activeControlDrag.compId, false);
          onHistoryPush?.(updated, wires, activeControlDrag.compId);
        }
      }
      setActiveControlDrag(null);
    }

    if (e.button === 1 || e.button === 3 || e.button === 4) {
      e.stopPropagation();
      setIsPanning(false);
      return;
    }

    // Finish Marquee Box Selection
    if (isSelecting) {
      const minX = Math.min(selectStart.x, selectEnd.x);
      const maxX = Math.max(selectStart.x, selectEnd.x);
      const minY = Math.min(selectStart.y, selectEnd.y);
      const maxY = Math.max(selectStart.y, selectEnd.y);
      const dragDist = Math.hypot(selectEnd.x - selectStart.x, selectEnd.y - selectStart.y);

      if (dragDist > 6) {
        const isMultiMod = e.shiftKey || e.ctrlKey || e.metaKey;
        const newlySelectedComps: string[] = [];
        const newlySelectedWires: string[] = [];

        components.forEach((comp) => {
          if (comp.type === COMPONENT_TYPES.GRAPH_FRAME) {
            const bounds = GraphFrameRenderer.getBounds(comp);
            if (
              bounds.x < maxX &&
              bounds.x + bounds.w > minX &&
              bounds.y < maxY &&
              bounds.y + bounds.h > minY
            ) {
              newlySelectedComps.push(comp.id);
            }
          } else if (comp.type === COMPONENT_TYPES.RUNTIME_SLIDER) {
            const geom = RuntimeControlsManager.getSliderGeometry(comp);
            if (
              geom.bounds.x < maxX &&
              geom.bounds.x + geom.bounds.w > minX &&
              geom.bounds.y < maxY &&
              geom.bounds.y + geom.bounds.h > minY
            ) {
              newlySelectedComps.push(comp.id);
            }
          } else if (comp.type === COMPONENT_TYPES.RUNTIME_DIAL) {
            const geom = RuntimeControlsManager.getDialGeometry(comp);
            if (
              geom.bounds.x < maxX &&
              geom.bounds.x + geom.bounds.w > minX &&
              geom.bounds.y < maxY &&
              geom.bounds.y + geom.bounds.h > minY
            ) {
              newlySelectedComps.push(comp.id);
            }
          } else if (comp.type === COMPONENT_TYPES.RUNTIME_BUTTON) {
            const geom = RuntimeSwitchesManager.getButtonGeometry(comp);
            if (
              geom.bounds.x < maxX &&
              geom.bounds.x + geom.bounds.w > minX &&
              geom.bounds.y < maxY &&
              geom.bounds.y + geom.bounds.h > minY
            ) {
              newlySelectedComps.push(comp.id);
            }
          } else if (comp.type === COMPONENT_TYPES.RUNTIME_SWITCH) {
            const geom = RuntimeSwitchesManager.getSwitchGeometry(comp);
            if (
              geom.bounds.x < maxX &&
              geom.bounds.x + geom.bounds.w > minX &&
              geom.bounds.y < maxY &&
              geom.bounds.y + geom.bounds.h > minY
            ) {
              newlySelectedComps.push(comp.id);
            }
          } else if (comp.x >= minX - 45 && comp.x <= maxX + 45 && comp.y >= minY - 45 && comp.y <= maxY + 45) {
            newlySelectedComps.push(comp.id);
          }
        });

        wires.forEach((wire) => {
          const wireInside = wire.points.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
          if (wireInside) {
            newlySelectedWires.push(wire.id);
          }
        });

        const finalCompIds = isMultiMod
          ? Array.from(new Set([...Array.from(selectedComponentIds), ...newlySelectedComps]))
          : newlySelectedComps;

        const finalWireIds = isMultiMod
          ? Array.from(new Set([...Array.from(selectedWireIds), ...newlySelectedWires]))
          : newlySelectedWires;

        onSelectMultiple?.(finalCompIds, finalWireIds);

        if (finalCompIds.length > 0) {
          const primary = components.find((c) => c.id === finalCompIds[0]) || null;
          onSelectComponent(primary);
        } else {
          onSelectComponent(null);
        }
      }

      setIsSelecting(false);
    }

    // Finish Component Moving (with probe-to-GraphFrame drop binding)
    if (isDragging && hasMovedDuringDrag) {
      if (selectedComponent && GraphBindingManager.isProbeComponent(selectedComponent.type)) {
        const targetFrame = GraphBindingManager.findGraphFrameAt(components, world.x, world.y);
        if (targetFrame && targetFrame.id !== selectedComponent.id) {
          const updatedFrame = GraphBindingManager.bindProbeToFrame(targetFrame, selectedComponent, components);
          const nextComps = components.map((c) => (c.id === targetFrame.id ? updatedFrame : c));
          onComponentsChange(nextComps);
          onHistoryPush?.(nextComps, wires, targetFrame.id);
        }
      }
      onHistoryPush?.(components, wires, selectedComponent?.id || null);
    }

    setIsPanning(false);
    setIsDragging(false);
    setHasMovedDuringDrag(false);
  };

  const handleAuxClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(4.0, zoom * zoomFactor));

    setPan({
      x: sx - (sx - pan.x) * (newZoom / zoom),
      y: sy - (sy - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Phase 17: Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (activeWire) {
      setActiveWire(null);
      return;
    }
    if (pendingCompType && onClearPendingComp) {
      onClearPendingComp();
      setToolMode('select');
      return;
    }

    // 1. Check if hit component
    const hitComp = findCompAt(world.x, world.y);
    if (hitComp) {
      if (!selectedComponentIds.has(hitComp.id)) {
        onSelectComponent(hitComp);
        onSelectMultiple?.([hitComp.id], []);
        onSelectWire?.(null);
      }
      const isMulti = selectedComponentIds.size > 1 && selectedComponentIds.has(hitComp.id);
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: isMulti ? 'multi' : 'component',
        targetComponent: hitComp,
      });
      return;
    }

    // 2. Check if hit wire
    const hitWire = findWireAt(world.x, world.y);

    if (hitWire) {
      onSelectWire?.(hitWire.id);
      onSelectComponent(null);
      onSelectMultiple?.([], [hitWire.id]);
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: 'wire',
        targetWire: hitWire,
      });
      return;
    }

    // 3. Multi-selection right-click anywhere
    if (selectedComponentIds.size > 1) {
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: 'multi',
      });
      return;
    }

    // 4. Empty canvas right-click
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'canvas',
    });
  };

  // Phase 17: HTML5 Drag & Drop from Master Library or Sidebar
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const snapX = snap(world.x);
    const snapY = snap(world.y);

    let raw = e.dataTransfer.getData('application/pscad-component');
    if (!raw) raw = e.dataTransfer.getData('text/plain');

    if (raw) {
      try {
        const item = JSON.parse(raw);
        if (item && item.type) {
          const newComp: CircuitComponentData = {
            id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: item.type,
            name: `${(item.name || item.type).toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 4)}_${components.length + 1}`,
            x: snapX,
            y: snapY,
            rotation: 0,
            params: item.customDefId
              ? { customDefId: item.customDefId }
              : item.definitionId
                ? { definitionId: item.definitionId }
                : {},
            definitionId: item.definitionId,
          };
          const nextComps = [...components, newComp];
          onComponentsChange(nextComps);
          onSelectComponent(newComp);
          onSelectMultiple?.([newComp.id], []);
          onSelectWire?.(null);
          onHistoryPush?.(nextComps, wires, newComp.id);
        }
      } catch (err) {
        console.error('Failed to handle drop component:', err);
      }
    }
  };

  const handleToggleBypass = useCallback(() => {
    if (!selectedComponent && selectedComponentIds.size === 0) return;
    const targetIds = selectedComponentIds.size > 0 ? selectedComponentIds : new Set([selectedComponent!.id]);
    const nextComps = components.map((c) => (targetIds.has(c.id) ? { ...c, bypassed: !c.bypassed } : c));
    onComponentsChange(nextComps);
    onHistoryPush?.(nextComps, wires, selectedComponent?.id || null);
  }, [components, wires, selectedComponent, selectedComponentIds, onComponentsChange, onHistoryPush]);

  const handleWirePhaseChange = useCallback(
    (phase: 'normal' | 'phaseA' | 'phaseB' | 'phaseC' | 'neutral') => {
      if (!selectedWireId) return;
      const nextWires = wires.map((w) => (w.id === selectedWireId ? { ...w, phase } : w));
      onWiresChange(nextWires);
      onHistoryPush?.(components, nextWires, null);
    },
    [components, wires, selectedWireId, onWiresChange, onHistoryPush]
  );

  const handleUpdateComponent = useCallback(
    (updatedComp: CircuitComponentData) => {
      const nextComps = components.map((c) => (c.id === updatedComp.id ? updatedComp : c));
      onComponentsChange(nextComps);
      if (selectedComponent?.id === updatedComp.id) {
        onSelectComponent(updatedComp);
      }
      onHistoryPush?.(nextComps, wires, updatedComp.id);
    },
    [components, wires, selectedComponent, onComponentsChange, onSelectComponent, onHistoryPush]
  );

  const handleApplyAxisLimits = useCallback(
    (yMin: number, yMax: number, autoScale: boolean) => {
      if (!axisLimitsFrame) return;
      const nextParams = { ...axisLimitsFrame.params };
      if (autoScale) {
        delete nextParams.graphYRange;
        nextParams.autoScale = true;
      } else {
        nextParams.graphYRange = [yMin, yMax];
        nextParams.autoScale = false;
      }
      const updated = { ...axisLimitsFrame, params: nextParams };
      handleUpdateComponent(updated);
      showToast(`Axis limits applied for ${axisLimitsFrame.params?.graphTitle || axisLimitsFrame.name}`, 'success');
    },
    [axisLimitsFrame, handleUpdateComponent, showToast]
  );

  const handleContextMenuAddComp = (compType: string) => {
    const world = mouseWorldPos;
    const snapX = snap(world.x);
    const snapY = snap(world.y);
    const newComp: CircuitComponentData = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: compType,
      name: `${compType.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 4)}_${components.length + 1}`,
      x: snapX,
      y: snapY,
      rotation: 0,
      params: {},
    };
    const nextComps = [...components, newComp];
    onComponentsChange(nextComps);
    onSelectComponent(newComp);
    onSelectMultiple?.([newComp.id], []);
    onSelectWire?.(null);
    onHistoryPush?.(nextComps, wires, newComp.id);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const hitComp = findCompAt(world.x, world.y);
    if (hitComp) {
      if (hitComp.type === COMPONENT_TYPES.SUBMODULE) {
        onDrillDownSubmodule?.(hitComp);
        return;
      }
      if (hitComp.type !== COMPONENT_TYPES.RUNTIME_GAUGE && hitComp.type !== COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY) {
        onSelectComponent(hitComp);
        onSelectMultiple?.([hitComp.id], []);
        if (inspectorMode === 'modal' || onOpenParametersModal) {
          onOpenParametersModal?.(hitComp);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#0c0f17] flex flex-col">
      {/* Phase 6: Hierarchical Sheet Breadcrumb Header */}
      <div className="h-7 px-3 bg-[#161b26] border-b border-[#263147] flex items-center gap-1.5 text-xs text-slate-300 select-none shrink-0 z-10">
        <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-slate-400 font-medium">Sheet Path:</span>

        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
            <button
              onClick={() => onNavigateBreadcrumb?.(crumb.id)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${idx === breadcrumbs.length - 1
                ? 'bg-[#1f6feb] text-white font-bold'
                : 'text-slate-300 hover:bg-[#1c2333] hover:text-white'
                }`}
            >
              {crumb.isRoot && <Home className="w-3 h-3" />}
              <span>{crumb.name}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onAuxClick={handleAuxClick}
          className={`w-full h-full block ${isPanning
            ? 'cursor-grabbing'
            : pendingCompType
              ? 'cursor-copy'
              : toolMode === 'wire'
                ? 'cursor-cell'
                : isSelecting
                  ? 'cursor-crosshair'
                  : 'cursor-default'
            }`}
        />

        {/* Phase 17 & 18: Right-Click Context Menu */}
        {contextMenu?.isOpen && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            type={contextMenu.type}
            targetComponent={contextMenu.targetComponent}
            targetWire={contextMenu.targetWire}
            selectedCount={selectedComponentIds.size || (selectedComponent ? 1 : 0)}
            hasClipboard={hasClipboard}
            allComponents={components}
            signalsMap={simulationEngine.getSignals()}
            onClose={() => setContextMenu(null)}
            onAddComponent={handleContextMenuAddComp}
            onAddWire={() => setToolMode('wire')}
            onEditParameters={(comp) => onOpenParametersModal ? onOpenParametersModal(comp) : onSelectComponent(comp)}
            onViewDefinition={(comp) => {
              if (comp.type === COMPONENT_TYPES.SUBMODULE) {
                onDrillDownSubmodule?.(comp);
              }
            }}
            onRotateCW={() => onRotateSelection ? onRotateSelection(90) : undefined}
            onRotateCCW={() => onRotateSelection ? onRotateSelection(-90) : undefined}
            onFlipH={() => onFlipHorizontal ? onFlipHorizontal() : undefined}
            onFlipV={() => onFlipVertical ? onFlipVertical() : undefined}
            onToggleBypass={handleToggleBypass}
            onCreateSubmoduleFromSelection={() => onCreateSubmoduleFromSelection?.()}
            onBindProbeToFrame={(frameId, probe) => {
              const frame = components.find((c) => c.id === frameId);
              if (frame) {
                const updatedFrame = GraphBindingManager.bindProbeToFrame(frame, probe, components);
                const nextComps = components.map((c) => (c.id === frame.id ? updatedFrame : c));
                onComponentsChange(nextComps);
                onHistoryPush?.(nextComps, wires, frame.id);
              }
            }}
            onToggleTraceVisibility={(frameId, sigName) => {
              const frame = components.find((c) => c.id === frameId);
              if (frame) {
                const updatedFrame = GraphBindingManager.toggleTraceVisibility(frame, sigName, components);
                const nextComps = components.map((c) => (c.id === frame.id ? updatedFrame : c));
                onComponentsChange(nextComps);
                onHistoryPush?.(nextComps, wires, frame.id);
              }
            }}
            onUnbindTraceFromFrame={(frameId, sigName) => {
              const frame = components.find((c) => c.id === frameId);
              if (frame) {
                const updatedFrame = GraphBindingManager.unbindTraceFromFrame(frame, sigName, components);
                const nextComps = components.map((c) => (c.id === frame.id ? updatedFrame : c));
                onComponentsChange(nextComps);
                onHistoryPush?.(nextComps, wires, frame.id);
              }
            }}
            onUpdateComponent={handleUpdateComponent}
            onOpenAxisLimitsModal={(comp) => setAxisLimitsFrame(comp)}
            onPopOutDetached={onPopOutDetached}
            onShowToast={showToast}
            onCut={() => onCut?.()}
            onCopy={() => onCopy?.()}
            onPaste={() => onPaste?.()}
            onDuplicate={() => onDuplicate?.()}
            onDelete={() => onDeleteSelection ? onDeleteSelection() : undefined}
            onSelectAll={() => onSelectAll?.()}
            onZoomFit={() => onZoomFit ? onZoomFit() : undefined}
            onToggleGrid={onToggleGrid}
            onAlign={onAlign}
            onWirePhaseChange={handleWirePhaseChange}
          />
        )}

        {/* Phase 18 Step 18.4: Axis Limits Modal Dialog */}
        {axisLimitsFrame && (
          <AxisLimitsModal
            frame={axisLimitsFrame}
            isOpen={!!axisLimitsFrame}
            onClose={() => setAxisLimitsFrame(null)}
            onApply={handleApplyAxisLimits}
          />
        )}

        {/* Phase 18 Step 18.4: Toast Notification Alert */}
        {toastMessage && (
          <div className="absolute bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div
              className={`px-3.5 py-2 rounded-md shadow-2xl border text-xs font-medium flex items-center gap-2 backdrop-blur-md ${toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/50'
                : toastMessage.type === 'info'
                  ? 'bg-slate-900/90 text-slate-200 border-slate-700/50'
                  : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/50'
                }`}
            >
              <span>{toastMessage.type === 'error' ? '❌' : toastMessage.type === 'info' ? 'ℹ️' : '✓'}</span>
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

