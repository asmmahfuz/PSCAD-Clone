/**
 * PSCAD CLONE - Schematic Parameter Illustration Diagrams
 * Phase 21 - Step 21.3: Visual Winding Configurations, Park d-q Conventions,
 * Sequence Equivalent Circuits, and Parameter Callout Tags.
 */

import React, { useState, useMemo } from 'react';
import { Layers, Compass, Zap, GitBranch, Cpu, Eye } from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import type { CircuitComponentData } from '../../types';

export interface ParameterDiagramPreviewProps {
  component: CircuitComponentData;
  params: Record<string, any>;
  onSelectParam?: (paramKey: string) => void;
  className?: string;
  defaultView?: string;
  compact?: boolean;
}

export type DiagramViewType =
  | 'winding_vector'
  | 'core_magnetic'
  | 'sequence_t'
  | 'park_dq'
  | 'machine_subtransient'
  | 'torsional_shaft'
  | 'bergeron_wave'
  | 'pi_section'
  | 'sequence_lines'
  | 'breaker_mechanism'
  | 'norton_companion'
  | 'power_electronic_bridge';

interface DiagramViewOption {
  id: DiagramViewType;
  label: string;
  icon: React.ReactNode;
}

/**
 * Computes the vector group notation and secondary phase displacement for a 3-phase transformer.
 */
export function calculateTransformerVectorGroup(primaryConn: string = 'Y', secondaryConn: string = 'Delta'): {
  vectorGroup: string;
  clockHour: number;
  phaseShiftDeg: number;
  priNotation: string;
  secNotation: string;
} {
  const pri = primaryConn.toLowerCase();
  const sec = secondaryConn.toLowerCase();

  let priNotation = 'Y';
  if (pri === 'yg') priNotation = 'YN';
  else if (pri === 'delta') priNotation = 'D';

  let secNotation = 'y';
  if (sec === 'yg') secNotation = 'yn';
  else if (sec === 'delta') secNotation = 'd';

  let clockHour = 0;
  let phaseShiftDeg = 0;

  if (priNotation.startsWith('Y') && secNotation.startsWith('d')) {
    clockHour = 11;
    phaseShiftDeg = -30; // Sec lags Pri by 30°
  } else if (priNotation.startsWith('D') && secNotation.startsWith('y')) {
    clockHour = 11;
    phaseShiftDeg = -30;
  } else if (priNotation.startsWith('Y') && secNotation.startsWith('y')) {
    clockHour = 0;
    phaseShiftDeg = 0;
  } else if (priNotation.startsWith('D') && secNotation.startsWith('d')) {
    clockHour = 0;
    phaseShiftDeg = 0;
  }

  const vectorGroup = `${priNotation}${secNotation}${clockHour}`;
  return { vectorGroup, clockHour, phaseShiftDeg, priNotation, secNotation };
}

/**
 * Computes Bergeron transmission line transit delay and surge impedance.
 */
export function calculateBergeronLineParameters(params: Record<string, any>): {
  tauSec: number;
  tauMs: number;
  zc: number;
  vAerialKmS: number;
  lengthKm: number;
} {
  const lengthKm = Math.max(0.1, Number(params.lengthKm ?? 50));
  const vAerialKmS = Math.max(1000, Number(params.v_aerial ?? 295000));
  const zc = Math.max(1, Number(params.Zc_aerial ?? 350));
  const tauSec = lengthKm / vAerialKmS;
  const tauMs = tauSec * 1000;
  return { tauSec, tauMs, zc, vAerialKmS, lengthKm };
}

/**
 * Computes Park d-q transformation frame angles and phasor coordinates.
 */
export function calculateParkFrameGeometry(deltaDeg: number = 28): {
  deltaDeg: number;
  deltaRad: number;
  dAxisDeg: number;
  qAxisDeg: number;
  vPhasorDeg: number;
} {
  const deltaRad = (deltaDeg * Math.PI) / 180;
  const qAxisDeg = 90 + deltaDeg; // q-axis leads d-axis by 90°
  const dAxisDeg = deltaDeg;
  const vPhasorDeg = 90; // Reference terminal voltage along vertical
  return { deltaDeg, deltaRad, dAxisDeg, qAxisDeg, vPhasorDeg };
}

export const ParameterDiagramPreview: React.FC<ParameterDiagramPreviewProps> = ({
  component,
  params,
  onSelectParam,
  className = '',
  defaultView,
  compact = false,
}) => {
  const compType = component.type;

  // Determine available views based on component type
  const availableViews: DiagramViewOption[] = useMemo(() => {
    switch (compType) {
      case COMPONENT_TYPES.TRANSFORMER_3PH:
      case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH:
      case COMPONENT_TYPES.OLTC_TRANSFORMER_3PH:
        return [
          { id: 'winding_vector', label: 'Winding & Vector Group', icon: <Compass className="w-3.5 h-3.5" /> },
          { id: 'core_magnetic', label: 'Core Magnetic Structure', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'sequence_t', label: 'Sequence T-Equivalent', icon: <GitBranch className="w-3.5 h-3.5" /> },
        ];

      case COMPONENT_TYPES.TRANSFORMER_1PH:
        return [
          { id: 'winding_vector', label: '1-Phase Coupled Winding', icon: <Compass className="w-3.5 h-3.5" /> },
          { id: 'core_magnetic', label: 'Core Saturation & Knee', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'sequence_t', label: 'T-Equivalent Circuit', icon: <GitBranch className="w-3.5 h-3.5" /> },
        ];

      case COMPONENT_TYPES.SYNC_GENERATOR:
      case COMPONENT_TYPES.SYNC_MACHINE_DQ:
        return [
          { id: 'park_dq', label: 'Park d-q Axes & Phasors', icon: <Compass className="w-3.5 h-3.5" /> },
          { id: 'machine_subtransient', label: 'Subtransient Companion', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'torsional_shaft', label: 'Multi-Mass Shaft Train', icon: <Layers className="w-3.5 h-3.5" /> },
        ];

      case COMPONENT_TYPES.PI_LINE:
      case COMPONENT_TYPES.BERGERON_LINE_1PH:
      case COMPONENT_TYPES.BERGERON_LINE_3PH:
      case COMPONENT_TYPES.FD_PHASE_LINE:
        return [
          { id: 'bergeron_wave', label: 'Wave Travel (d\'Alembert)', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'pi_section', label: 'Nominal π-Section Circuit', icon: <GitBranch className="w-3.5 h-3.5" /> },
          { id: 'sequence_lines', label: 'Sequence Network (0, 1, 2)', icon: <Layers className="w-3.5 h-3.5" /> },
        ];

      case COMPONENT_TYPES.BREAKER_1PH:
      case COMPONENT_TYPES.BREAKER_3PH:
      case COMPONENT_TYPES.TIMED_SWITCH:
        return [
          { id: 'breaker_mechanism', label: 'Contact Blade & Arc', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'norton_companion', label: 'CDA Switching Model', icon: <Cpu className="w-3.5 h-3.5" /> },
        ];

      case COMPONENT_TYPES.MMC_CONVERTER_3PH:
      case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
      case COMPONENT_TYPES.STATCOM:
      case COMPONENT_TYPES.SVC:
        return [
          { id: 'power_electronic_bridge', label: 'Converter Bridge Topology', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'norton_companion', label: 'Norton Companion Model', icon: <Zap className="w-3.5 h-3.5" /> },
        ];

      default:
        return [
          { id: 'norton_companion', label: 'Dommel Companion Model', icon: <Zap className="w-3.5 h-3.5" /> },
        ];
    }
  }, [compType]);

  const [activeView, setActiveView] = useState<DiagramViewType>(() => {
    if (defaultView && availableViews.some((v) => v.id === defaultView)) {
      return defaultView as DiagramViewType;
    }
    return availableViews[0]?.id || 'norton_companion';
  });

  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Helper to render interactive parameter callout chip
  const renderCalloutChip = (
    paramKey: string,
    label: string,
    valueStr: string,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    align: 'left' | 'right' | 'center' = 'center',
    color: string = '#388bfd'
  ) => {
    const isHovered = hoveredTag === paramKey;
    return (
      <g
        key={paramKey}
        className="cursor-pointer transition-all duration-150"
        onMouseEnter={() => setHoveredTag(paramKey)}
        onMouseLeave={() => setHoveredTag(null)}
        onClick={() => onSelectParam?.(paramKey)}
      >
        {/* Leader Pointer Line */}
        <path
          d={`M ${targetX} ${targetY} L ${x} ${y}`}
          stroke={isHovered ? '#ffffff' : color}
          strokeWidth={isHovered ? 1.5 : 1}
          strokeDasharray={isHovered ? 'none' : '2,2'}
          opacity={isHovered ? 1 : 0.75}
        />
        {/* Terminal Anchor Circle */}
        <circle
          cx={targetX}
          cy={targetY}
          r={isHovered ? 4 : 2.5}
          fill={isHovered ? '#ffffff' : color}
        />
        {/* Badge Background */}
        <g transform={`translate(${align === 'right' ? x - 70 : align === 'left' ? x : x - 35}, ${y - 12})`}>
          <rect
            width={70}
            height={22}
            rx={4}
            fill={isHovered ? '#1c2333' : '#0c0f17'}
            stroke={isHovered ? '#58a6ff' : color}
            strokeWidth={isHovered ? 1.5 : 1}
            className="shadow-sm"
          />
          <text
            x={35}
            y={8}
            fill={isHovered ? '#93c5fd' : '#94a3b8'}
            fontSize={7.5}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {label}
          </text>
          <text
            x={35}
            y={18}
            fill={isHovered ? '#ffffff' : '#e2e8f0'}
            fontSize={8.5}
            fontWeight="600"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {valueStr}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className={`flex flex-col bg-[#0c0f17] border border-[#263147] rounded-lg overflow-hidden ${className}`}>
      {/* Top Diagram Toolbar / Tab Switcher */}
      {compact ? (
        <div className="p-1.5 bg-[#161b26] border-b border-[#263147] flex items-center gap-1.5 select-none">
          <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value as DiagramViewType)}
            className="flex-1 bg-[#0f131c] text-[11px] text-slate-200 border border-[#263147] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#388bfd]"
          >
            {availableViews.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="h-8 px-2.5 bg-[#161b26] border-b border-[#263147] flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {availableViews.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeView === v.id
                    ? 'bg-[#1f6feb] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
                }`}
              >
                {v.icon}
                <span>{v.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Interactive CAD Preview</span>
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div className={`relative w-full ${compact ? 'h-[145px]' : 'h-[220px]'} bg-[#090d14] flex items-center justify-center overflow-hidden p-1.5`}>
        {/* Subtle Background CAD Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="diagram-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#263147" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagram-grid)" />
        </svg>

        {/* 1. TRANSFORMER - WINDING & VECTOR GROUP */}
        {activeView === 'winding_vector' && (
          <TransformerWindingDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 2. TRANSFORMER - CORE MAGNETIC STRUCTURE */}
        {activeView === 'core_magnetic' && (
          <TransformerCoreDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 3. TRANSFORMER - SEQUENCE T-EQUIVALENT */}
        {activeView === 'sequence_t' && (
          <TransformerSequenceDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 4. SYNCHRONOUS MACHINE - PARK D-Q AXES & PHASORS */}
        {activeView === 'park_dq' && (
          <MachineParkDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 5. SYNCHRONOUS MACHINE - SUBTRANSIENT COMPANION */}
        {activeView === 'machine_subtransient' && (
          <MachineSubtransientDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 6. SYNCHRONOUS MACHINE - MULTI-MASS SHAFT */}
        {activeView === 'torsional_shaft' && (
          <MachineTorsionalShaftDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 7. TRANSMISSION LINE - BERGERON WAVE TRAVEL */}
        {activeView === 'bergeron_wave' && (
          <BergeronWaveDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 8. TRANSMISSION LINE - NOMINAL PI SECTION */}
        {activeView === 'pi_section' && (
          <LinePiSectionDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 9. TRANSMISSION LINE - SEQUENCE PARAMETERS */}
        {activeView === 'sequence_lines' && (
          <LineSequenceDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 10. BREAKER - CONTACT MECHANISM & ARC */}
        {activeView === 'breaker_mechanism' && (
          <BreakerContactDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 11. POWER ELECTRONIC BRIDGE TOPOLOGY */}
        {activeView === 'power_electronic_bridge' && (
          <PowerElectronicsDiagram
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}

        {/* 12. DOMMEL NORTON COMPANION (RLC & GENERAL) */}
        {activeView === 'norton_companion' && (
          <DommelNortonDiagram
            component={component}
            params={params}
            renderCalloutChip={renderCalloutChip}
          />
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   INDIVIDUAL SVG DIAGRAM VIEW IMPLEMENTATIONS
   ========================================================================= */

/**
 * Transformer Winding & Vector Group SVG
 */
const TransformerWindingDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const priConn = String(params.primaryConn || 'Y');
  const secConn = String(params.secondaryConn || 'Delta');
  const v1 = Number(params.V1_nom ?? 230000);
  const v2 = Number(params.V2_nom ?? 69000);
  const mva = Number(params.MVA_rating ?? 100);

  const { vectorGroup, clockHour, phaseShiftDeg } = calculateTransformerVectorGroup(priConn, secConn);

  const v1Str = v1 >= 1000 ? `${(v1 / 1000).toFixed(0)} kV` : `${v1} V`;
  const v2Str = v2 >= 1000 ? `${(v2 / 1000).toFixed(0)} kV` : `${v2} V`;
  const ratio = (v1 / Math.max(1, v2)).toFixed(2);

  // Clock angle on phasor dial (12 o'clock = 90°, each hour is -30°)
  const clockAngleDeg = 90 - clockHour * 30;
  const clockRad = (clockAngleDeg * Math.PI) / 180;
  const clockX = 350 + 26 * Math.cos(clockRad);
  const clockY = 100 - 26 * Math.sin(clockRad);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      {/* Title & Vector Group Badge */}
      <g transform="translate(10, 18)">
        <rect width={110} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          VECTOR: {vectorGroup}
        </text>
      </g>

      <g transform="translate(125, 18)">
        <rect width={90} height={20} rx={4} fill="#161b26" stroke="#263147" strokeWidth={1} />
        <text x={8} y={14} fill="#cbd5e1" fontSize={9} fontFamily="monospace">
          Shift: {phaseShiftDeg > 0 ? `+${phaseShiftDeg}` : phaseShiftDeg}°
        </text>
      </g>

      {/* Primary Winding Box (Left) */}
      <g transform="translate(25, 45)">
        <rect width={100} height={120} rx={6} fill="#0d1424" stroke="#388bfd" strokeWidth={1.5} />
        <text x={50} y={18} fill="#60a5fa" fontSize={11} fontWeight="bold" textAnchor="middle">
          Primary ({priConn})
        </text>
        <text x={50} y={32} fill="#94a3b8" fontSize={9} textAnchor="middle" fontFamily="monospace">
          {v1Str}
        </text>

        {/* Dynamic primary coil schematic based on connection */}
        {priConn.toLowerCase().startsWith('y') ? (
          <g transform="translate(50, 75)">
            {/* Wye Star Connection */}
            <line x1={0} y1={0} x2={0} y2={-25} stroke="#f59e0b" strokeWidth={2.5} />
            <line x1={0} y1={0} x2={-20} y2={18} stroke="#10b981" strokeWidth={2.5} />
            <line x1={0} y1={0} x2={20} y2={18} stroke="#388bfd" strokeWidth={2.5} />
            <circle cx={0} cy={0} r={3} fill="#ffffff" />
            <text x={0} y={-28} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight="bold">H1 (A)</text>
            <text x={-24} y={26} fill="#10b981" fontSize={8} textAnchor="middle" fontWeight="bold">H2 (B)</text>
            <text x={24} y={26} fill="#388bfd" fontSize={8} textAnchor="middle" fontWeight="bold">H3 (C)</text>
            {priConn.toLowerCase() === 'yg' && (
              <g transform="translate(0, 5)">
                <line x1={0} y1={0} x2={0} y2={12} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="1,1" />
                <line x1={-6} y1={12} x2={6} y2={12} stroke="#22c55e" strokeWidth={1.5} />
                <line x1={-4} y1={15} x2={4} y2={15} stroke="#22c55e" strokeWidth={1.5} />
                <line x1={-2} y1={18} x2={2} y2={18} stroke="#22c55e" strokeWidth={1.5} />
              </g>
            )}
          </g>
        ) : (
          /* Delta Mesh Connection */
          <g transform="translate(50, 75)">
            <polygon points="0,-22 -20,18 20,18" fill="none" stroke="#388bfd" strokeWidth={2.5} />
            <text x={0} y={-26} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight="bold">H1</text>
            <text x={-26} y={22} fill="#10b981" fontSize={8} textAnchor="middle" fontWeight="bold">H2</text>
            <text x={26} y={22} fill="#388bfd" fontSize={8} textAnchor="middle" fontWeight="bold">H3</text>
          </g>
        )}
      </g>

      {/* Magnetic Core Limbs (Center) */}
      <g transform="translate(140, 55)">
        <line x1={0} y1={10} x2={0} y2={95} stroke="#64748b" strokeWidth={3} strokeDasharray="6,3" />
        <line x1={10} y1={10} x2={10} y2={95} stroke="#64748b" strokeWidth={3} strokeDasharray="6,3" />
        <text x={5} y={112} fill="#64748b" fontSize={8} textAnchor="middle" fontFamily="monospace">
          CORE
        </text>
      </g>

      {/* Secondary Winding Box (Right Center) */}
      <g transform="translate(165, 45)">
        <rect width={100} height={120} rx={6} fill="#0d1424" stroke="#10b981" strokeWidth={1.5} />
        <text x={50} y={18} fill="#34d399" fontSize={11} fontWeight="bold" textAnchor="middle">
          Secondary ({secConn})
        </text>
        <text x={50} y={32} fill="#94a3b8" fontSize={9} textAnchor="middle" fontFamily="monospace">
          {v2Str}
        </text>

        {/* Dynamic secondary coil schematic */}
        {secConn.toLowerCase().startsWith('y') ? (
          <g transform="translate(50, 75)">
            <line x1={0} y1={0} x2={0} y2={-25} stroke="#f59e0b" strokeWidth={2.5} />
            <line x1={0} y1={0} x2={-20} y2={18} stroke="#10b981" strokeWidth={2.5} />
            <line x1={0} y1={0} x2={20} y2={18} stroke="#388bfd" strokeWidth={2.5} />
            <circle cx={0} cy={0} r={3} fill="#ffffff" />
            <text x={0} y={-28} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight="bold">X1 (a)</text>
            <text x={-24} y={26} fill="#10b981" fontSize={8} textAnchor="middle" fontWeight="bold">X2 (b)</text>
            <text x={24} y={26} fill="#388bfd" fontSize={8} textAnchor="middle" fontWeight="bold">X3 (c)</text>
            {secConn.toLowerCase() === 'yg' && (
              <g transform="translate(0, 5)">
                <line x1={0} y1={0} x2={0} y2={12} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="1,1" />
                <line x1={-6} y1={12} x2={6} y2={12} stroke="#22c55e" strokeWidth={1.5} />
                <line x1={-4} y1={15} x2={4} y2={15} stroke="#22c55e" strokeWidth={1.5} />
                <line x1={-2} y1={18} x2={2} y2={18} stroke="#22c55e" strokeWidth={1.5} />
              </g>
            )}
          </g>
        ) : (
          <g transform="translate(50, 75)">
            <polygon points="0,-22 -20,18 20,18" fill="none" stroke="#10b981" strokeWidth={2.5} />
            <text x={0} y={-26} fill="#f59e0b" fontSize={8} textAnchor="middle" fontWeight="bold">X1</text>
            <text x={-26} y={22} fill="#10b981" fontSize={8} textAnchor="middle" fontWeight="bold">X2</text>
            <text x={26} y={22} fill="#388bfd" fontSize={8} textAnchor="middle" fontWeight="bold">X3</text>
          </g>
        )}
      </g>

      {/* Phasor Clock Dial (Right) */}
      <g transform="translate(350, 100)">
        <circle cx={0} cy={0} r={40} fill="#101522" stroke="#263147" strokeWidth={1.5} />
        {/* Hour tick marks */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
          const a = (90 - h * 30) * (Math.PI / 180);
          const x1 = 34 * Math.cos(a);
          const y1 = -34 * Math.sin(a);
          const x2 = 38 * Math.cos(a);
          const y2 = -38 * Math.sin(a);
          return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth={1} />;
        })}
        {/* Primary Reference Phasor (12 o'clock / Top) */}
        <line x1={0} y1={0} x2={0} y2={-32} stroke="#388bfd" strokeWidth={2.5} />
        <polygon points="0,-35 -3,-28 3,-28" fill="#388bfd" />
        <text x={0} y={-44} fill="#60a5fa" fontSize={8} fontWeight="bold" textAnchor="middle">
          V1 (12h)
        </text>

        {/* Secondary Hand indicating vector group clock hour */}
        <line x1={0} y1={0} x2={clockX - 350} y2={clockY - 100} stroke="#10b981" strokeWidth={2.5} />
        <circle cx={clockX - 350} cy={clockY - 100} r={3} fill="#10b981" />
        <text
          x={clockX - 350 + (clockHour === 11 ? -12 : clockHour === 1 ? 12 : 0)}
          y={clockY - 100 + (clockHour === 6 ? 12 : -6)}
          fill="#34d399"
          fontSize={8}
          fontWeight="bold"
          textAnchor="middle"
        >
          V2 ({clockHour}h)
        </text>
        <circle cx={0} cy={0} r={2.5} fill="#ffffff" />
        <text x={0} y={52} fill="#94a3b8" fontSize={7.5} textAnchor="middle">
          Clock Dial ({vectorGroup})
        </text>
      </g>

      {/* Interactive Parameter Callouts */}
      {renderCalloutChip('V1_nom', 'V1 Pri', v1Str, 75, 182, 75, 165, 'center', '#388bfd')}
      {renderCalloutChip('V2_nom', 'V2 Sec', v2Str, 215, 182, 215, 165, 'center', '#10b981')}
      {renderCalloutChip('MVA_rating', 'Capacity', `${mva} MVA`, 145, 28, 145, 55, 'center', '#f59e0b')}
      {renderCalloutChip('turnsRatio', 'Ratio a', `${ratio}:1`, 280, 28, 265, 45, 'center', '#8b5cf6')}
    </svg>
  );
};

/**
 * Transformer Core Magnetic Structure SVG
 */
const TransformerCoreDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const coreType = String(params.coreType || '3limb');
  const satEnabled = Boolean(params.enableSaturation);
  const kneeFlux = Number(params.kneeFluxPu ?? 1.2);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={130} height={20} rx={4} fill="#161b26" stroke="#f59e0b" strokeWidth={1} />
        <text x={8} y={14} fill="#fcd34d" fontSize={10} fontWeight="bold" fontFamily="monospace">
          CORE: {coreType.toUpperCase()}
        </text>
      </g>

      <g transform="translate(150, 18)">
        <rect width={130} height={20} rx={4} fill="#161b26" stroke="#263147" strokeWidth={1} />
        <text x={8} y={14} fill={satEnabled ? '#34d399' : '#94a3b8'} fontSize={9} fontFamily="monospace">
          Saturation: {satEnabled ? `ACTIVE (${kneeFlux} pu)` : 'Linear'}
        </text>
      </g>

      {/* 3-Limb / 5-Limb Core Steel Yoke & Limbs */}
      <g transform="translate(40, 50)">
        {/* Outer Yoke Frame */}
        <rect x={0} y={0} width={260} height={110} rx={4} fill="none" stroke="#475569" strokeWidth={12} />
        {/* Core Limbs (3-phase vertical legs) */}
        <rect x={40} y={10} width={16} height={90} fill="#334155" stroke="#64748b" strokeWidth={1} />
        <rect x={122} y={10} width={16} height={90} fill="#334155" stroke="#64748b" strokeWidth={1} />
        <rect x={204} y={10} width={16} height={90} fill="#334155" stroke="#64748b" strokeWidth={1} />

        {/* Phase Windings around limbs */}
        <rect x={34} y={30} width={28} height={50} rx={3} fill="#f59e0b" opacity={0.8} />
        <text x={48} y={58} fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle">Φ A</text>

        <rect x={116} y={30} width={28} height={50} rx={3} fill="#10b981" opacity={0.8} />
        <text x={130} y={58} fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle">Φ B</text>

        <rect x={198} y={30} width={28} height={50} rx={3} fill="#388bfd" opacity={0.8} />
        <text x={212} y={58} fill="#ffffff" fontSize={9} fontWeight="bold" textAnchor="middle">Φ C</text>

        {/* Flux return arrows */}
        <path d="M 48 20 L 130 20 L 212 20" stroke="#fcd34d" strokeWidth={1.5} strokeDasharray="3,3" />
        <polygon points="135,20 128,17 128,23" fill="#fcd34d" />
      </g>

      {/* B-H Saturation Curve Preview (Right) */}
      <g transform="translate(320, 50)">
        <rect width={120} height={110} rx={4} fill="#101522" stroke="#263147" strokeWidth={1} />
        <text x={60} y={16} fill="#94a3b8" fontSize={8.5} fontWeight="bold" textAnchor="middle">
          B-H Iron Saturation
        </text>

        {/* Axes */}
        <line x1={20} y1={95} x2={105} y2={95} stroke="#475569" strokeWidth={1} />
        <line x1={20} y1={95} x2={20} y2={25} stroke="#475569" strokeWidth={1} />
        <text x={108} y={98} fill="#64748b" fontSize={7}>i</text>
        <text x={17} y={22} fill="#64748b" fontSize={7}>λ</text>

        {/* Non-linear Saturation Curve */}
        <path
          d="M 20 95 Q 50 40 70 36 T 100 32"
          fill="none"
          stroke={satEnabled ? '#f59e0b' : '#388bfd'}
          strokeWidth={2}
        />
        {/* Knee point circle */}
        {satEnabled && (
          <g>
            <circle cx={70} cy={36} r={3.5} fill="#ef4444" />
            <text x={72} y={28} fill="#fca5a5" fontSize={7.5} fontWeight="bold">
              Knee ({kneeFlux} pu)
            </text>
          </g>
        )}
      </g>

      {renderCalloutChip('coreType', 'Geometry', coreType, 90, 180, 90, 155, 'center', '#f59e0b')}
      {renderCalloutChip('kneeFluxPu', 'Knee Flux', `${kneeFlux} pu`, 380, 180, 380, 155, 'center', '#ef4444')}
    </svg>
  );
};

/**
 * Transformer Sequence T-Equivalent Circuit SVG
 */
const TransformerSequenceDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ renderCalloutChip }) => {
  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={180} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          POSITIVE-SEQUENCE T-MODEL
        </text>
      </g>

      {/* T-Circuit Branches */}
      <g transform="translate(40, 75)">
        {/* Primary Leakage Branch: R1 + jX1 */}
        <line x1={0} y1={25} x2={40} y2={25} stroke="#388bfd" strokeWidth={2} />
        <rect x={40} y={17} width={30} height={16} fill="#161b26" stroke="#388bfd" strokeWidth={1.5} />
        <text x={55} y={28} fill="#93c5fd" fontSize={8} textAnchor="middle">R1</text>
        <line x1={70} y1={25} x2={85} y2={25} stroke="#388bfd" strokeWidth={2} />
        {/* Inductor coils */}
        <path d="M 85 25 Q 92 12 100 25 Q 108 12 115 25 Q 122 12 130 25" fill="none" stroke="#388bfd" strokeWidth={2} />
        <line x1={130} y1={25} x2={165} y2={25} stroke="#388bfd" strokeWidth={2} />

        {/* Central Node */}
        <circle cx={165} cy={25} r={3.5} fill="#ffffff" />

        {/* Magnetizing Shunt Branch: Rc || jXm */}
        <line x1={165} y1={25} x2={165} y2={50} stroke="#f59e0b" strokeWidth={2} />
        <rect x={152} y={50} width={26} height={20} fill="#161b26" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={165} y={63} fill="#fcd34d" fontSize={7.5} textAnchor="middle">Rc || Xm</text>
        <line x1={165} y1={70} x2={165} y2={90} stroke="#f59e0b" strokeWidth={2} />
        {/* Ground */}
        <line x1={155} y1={90} x2={175} y2={90} stroke="#64748b" strokeWidth={1.5} />
        <line x1={158} y1={93} x2={172} y2={93} stroke="#64748b" strokeWidth={1.5} />
        <line x1={161} y1={96} x2={169} y2={96} stroke="#64748b" strokeWidth={1.5} />

        {/* Secondary Leakage Branch: R2' + jX2' */}
        <line x1={165} y1={25} x2={205} y2={25} stroke="#10b981" strokeWidth={2} />
        <rect x={205} y={17} width={30} height={16} fill="#161b26" stroke="#10b981" strokeWidth={1.5} />
        <text x={220} y={28} fill="#a7f3d0" fontSize={8} textAnchor="middle">R2'</text>
        <line x1={235} y1={25} x2={250} y2={25} stroke="#10b981" strokeWidth={2} />
        <path d="M 250 25 Q 257 12 265 25 Q 272 12 280 25 Q 287 12 295 25" fill="none" stroke="#10b981" strokeWidth={2} />
        <line x1={295} y1={25} x2={340} y2={25} stroke="#10b981" strokeWidth={2} />

        {/* Terminals */}
        <circle cx={0} cy={25} r={3} fill="#388bfd" />
        <text x={-6} y={18} fill="#60a5fa" fontSize={8} fontWeight="bold">H (Pri)</text>

        <circle cx={340} cy={25} r={3} fill="#10b981" />
        <text x={342} y={18} fill="#34d399" fontSize={8} fontWeight="bold">X (Sec)</text>
      </g>

      {renderCalloutChip('Z_pri', 'Z1 Leakage', 'R1 + jX1', 110, 175, 110, 100, 'center', '#388bfd')}
      {renderCalloutChip('Z_mag', 'Zm Core', 'Rc || Xm', 205, 175, 205, 135, 'center', '#f59e0b')}
      {renderCalloutChip('Z_sec', 'Z2 Leakage', "R2' + jX2'", 310, 175, 310, 100, 'center', '#10b981')}
    </svg>
  );
};

/**
 * Synchronous Machine Park d-q Axes & Phasor Diagram SVG
 */
const MachineParkDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const Xd = Number(params.Xd ?? 1.8);
  const Xq = Number(params.Xq ?? 1.6);
  const Xd_pp = Number(params.Xd_pp ?? 0.18);
  const H = Number(params.H ?? 3.5);

  const { deltaDeg, dAxisDeg, qAxisDeg } = calculateParkFrameGeometry(28);

  const dRad = (dAxisDeg * Math.PI) / 180;
  const qRad = (qAxisDeg * Math.PI) / 180;

  // Stator 3-Phase Stationary Axes (0°, 120°, 240°)
  const cx = 230;
  const cy = 105;
  const r = 70;

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          PARK d-q ROTATING FRAME (δ = {deltaDeg}°)
        </text>
      </g>

      {/* Stator Bore Circle */}
      <circle cx={cx} cy={cy} r={r} fill="#101522" stroke="#263147" strokeWidth={1.5} />

      {/* 3-Phase Stator Fixed Axes (a, b, c) */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#475569" strokeWidth={1} strokeDasharray="3,3" />
      <text x={cx + r + 6} y={cy + 3} fill="#64748b" fontSize={8}>Axis a (0°)</text>

      <line x1={cx} y1={cy} x2={cx - r * 0.5} y2={cy - r * 0.866} stroke="#475569" strokeWidth={1} strokeDasharray="3,3" />
      <text x={cx - r * 0.5 - 28} y={cy - r * 0.866} fill="#64748b" fontSize={8}>Axis b (120°)</text>

      <line x1={cx} y1={cy} x2={cx - r * 0.5} y2={cy + r * 0.866} stroke="#475569" strokeWidth={1} strokeDasharray="3,3" />
      <text x={cx - r * 0.5 - 28} y={cy + r * 0.866 + 6} fill="#64748b" fontSize={8}>Axis c (240°)</text>

      {/* Direct Axis (d-axis aligned with rotor field flux) */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (r + 15) * Math.cos(dRad)}
        y2={cy - (r + 15) * Math.sin(dRad)}
        stroke="#f59e0b"
        strokeWidth={2.5}
      />
      <polygon
        points={`${cx + (r + 18) * Math.cos(dRad)},${cy - (r + 18) * Math.sin(dRad)} ${cx + (r + 10) * Math.cos(dRad) - 4},${cy - (r + 10) * Math.sin(dRad) - 4} ${cx + (r + 10) * Math.cos(dRad) + 4},${cy - (r + 10) * Math.sin(dRad) + 4}`}
        fill="#f59e0b"
      />
      <text
        x={cx + (r + 25) * Math.cos(dRad)}
        y={cy - (r + 25) * Math.sin(dRad) + 4}
        fill="#fbbf24"
        fontSize={9}
        fontWeight="bold"
      >
        d-axis (Φf)
      </text>

      {/* Quadrature Axis (q-axis leading d by 90°) */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (r + 15) * Math.cos(qRad)}
        y2={cy - (r + 15) * Math.sin(qRad)}
        stroke="#10b981"
        strokeWidth={2.5}
      />
      <text
        x={cx + (r + 20) * Math.cos(qRad) - 10}
        y={cy - (r + 20) * Math.sin(qRad) - 4}
        fill="#34d399"
        fontSize={9}
        fontWeight="bold"
      >
        q-axis (+90°)
      </text>

      {/* Rotor Elliptical Salient Pole Visual Inset */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={32}
        ry={18}
        fill="#1e293b"
        stroke="#f59e0b"
        strokeWidth={1.5}
        transform={`rotate(${-dAxisDeg}, ${cx}, ${cy})`}
      />
      <text x={cx} y={cy + 3} fill="#ffffff" fontSize={8} fontWeight="bold" textAnchor="middle">
        ROTOR
      </text>

      {/* Angle delta arc */}
      <path
        d={`M ${cx + 35} ${cy} A 35 35 0 0 0 ${cx + 35 * Math.cos(dRad)} ${cy - 35 * Math.sin(dRad)}`}
        fill="none"
        stroke="#388bfd"
        strokeWidth={1.5}
      />
      <text x={cx + 42} y={cy - 8} fill="#60a5fa" fontSize={8} fontWeight="bold">
        δ={deltaDeg}°
      </text>

      {/* Parameter Callouts */}
      {renderCalloutChip('Xd', 'Xd Sync', `${Xd.toFixed(2)} pu`, 70, 75, 110, 85, 'center', '#f59e0b')}
      {renderCalloutChip('Xq', 'Xq Trans', `${Xq.toFixed(2)} pu`, 70, 140, 110, 125, 'center', '#10b981')}
      {renderCalloutChip('Xd_pp', "Xd'' Sub", `${Xd_pp.toFixed(2)} pu`, 390, 75, 340, 85, 'center', '#ef4444')}
      {renderCalloutChip('H', 'Inertia H', `${H.toFixed(1)} s`, 390, 140, 340, 125, 'center', '#8b5cf6')}
    </svg>
  );
};

/**
 * Synchronous Machine Subtransient Companion Model SVG
 */
const MachineSubtransientDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const Xd_pp = Number(params.Xd_pp ?? 0.18);
  const dtSec = 50e-6;
  const Geq = (dtSec / (2 * (Xd_pp * 0.05))).toExponential(2);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#ef4444" strokeWidth={1} />
        <text x={8} y={14} fill="#fca5a5" fontSize={10} fontWeight="bold" fontFamily="monospace">
          SUBTRANSIENT VOLTAGE BEHIND Xd''
        </text>
      </g>

      <g transform="translate(60, 85)">
        {/* Subtransient Voltage Source E'' */}
        <circle cx={40} cy={20} r={18} fill="#161b26" stroke="#ef4444" strokeWidth={2} />
        <text x={40} y={23} fill="#fca5a5" fontSize={10} fontWeight="bold" textAnchor="middle">E''</text>

        {/* Series Subtransient Inductance Ld'' */}
        <line x1={58} y1={20} x2={90} y2={20} stroke="#388bfd" strokeWidth={2} />
        <path d="M 90 20 Q 98 6 106 20 Q 114 6 122 20 Q 130 6 138 20" fill="none" stroke="#388bfd" strokeWidth={2.5} />
        <line x1={138} y1={20} x2={180} y2={20} stroke="#388bfd" strokeWidth={2} />

        {/* Stator Terminal */}
        <circle cx={180} cy={20} r={4} fill="#388bfd" />
        <text x={186} y={15} fill="#60a5fa" fontSize={9} fontWeight="bold">Vt (Stator Bus)</text>

        {/* Norton Equivalent Box (Right) */}
        <g transform="translate(220, -15)">
          <rect width={130} height={70} rx={6} fill="#101522" stroke="#263147" strokeWidth={1} />
          <text x={65} y={16} fill="#94a3b8" fontSize={8} fontWeight="bold" textAnchor="middle">
            Norton Stamped Matrix
          </text>
          <text x={65} y={34} fill="#388bfd" fontSize={9} fontFamily="monospace" textAnchor="middle">
            Geq = Δt / (2 Ld'')
          </text>
          <text x={65} y={48} fill="#34d399" fontSize={8} fontFamily="monospace" textAnchor="middle">
            Ihist = i(t-Δt) + Geq·e''
          </text>
        </g>
      </g>

      {renderCalloutChip('Xd_pp', "Xd'' Reactance", `${Xd_pp} pu`, 175, 175, 175, 105, 'center', '#ef4444')}
      {renderCalloutChip('Geq', 'Geq Dommel', `${Geq} S`, 345, 175, 345, 140, 'center', '#388bfd')}
    </svg>
  );
};

/**
 * Synchronous Machine Multi-Mass Shaft Train SVG
 */
const MachineTorsionalShaftDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const H_hp = Number(params.H_hp ?? 0.8);
  const H_ip = Number(params.H_ip ?? 1.2);
  const H_lp = Number(params.H_lp ?? 2.5);
  const H_gen = Number(params.H_gen ?? 3.5);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#8b5cf6" strokeWidth={1} />
        <text x={8} y={14} fill="#c4b5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          MULTI-MASS TORSIONAL SHAFT TRAIN
        </text>
      </g>

      {/* Shaft Centerline */}
      <line x1={30} y1={95} x2={430} y2={95} stroke="#64748b" strokeWidth={4} />

      {/* Masses */}
      {/* 1. HP Turbine */}
      <g transform="translate(45, 60)">
        <rect width={50} height={70} rx={4} fill="#1e293b" stroke="#8b5cf6" strokeWidth={2} />
        <text x={25} y={32} fill="#c4b5fd" fontSize={8.5} fontWeight="bold" textAnchor="middle">HP TURB</text>
        <text x={25} y={48} fill="#94a3b8" fontSize={7.5} textAnchor="middle">H={H_hp}s</text>
      </g>

      {/* Spring K1 */}
      <path d="M 95 95 Q 105 85 115 95 Q 125 105 135 95" fill="none" stroke="#f59e0b" strokeWidth={2} />

      {/* 2. IP Turbine */}
      <g transform="translate(135, 52)">
        <rect width={55} height={86} rx={4} fill="#1e293b" stroke="#8b5cf6" strokeWidth={2} />
        <text x={27} y={40} fill="#c4b5fd" fontSize={8.5} fontWeight="bold" textAnchor="middle">IP TURB</text>
        <text x={27} y={56} fill="#94a3b8" fontSize={7.5} textAnchor="middle">H={H_ip}s</text>
      </g>

      {/* Spring K2 */}
      <path d="M 190 95 Q 200 85 210 95 Q 220 105 230 95" fill="none" stroke="#f59e0b" strokeWidth={2} />

      {/* 3. LP Turbine */}
      <g transform="translate(230, 42)">
        <rect width={65} height={106} rx={4} fill="#1e293b" stroke="#8b5cf6" strokeWidth={2} />
        <text x={32} y={50} fill="#c4b5fd" fontSize={8.5} fontWeight="bold" textAnchor="middle">LP TURB</text>
        <text x={32} y={66} fill="#94a3b8" fontSize={7.5} textAnchor="middle">H={H_lp}s</text>
      </g>

      {/* Spring K3 */}
      <path d="M 295 95 Q 305 85 315 95 Q 325 105 335 95" fill="none" stroke="#f59e0b" strokeWidth={2} />

      {/* 4. Generator Rotor */}
      <g transform="translate(335, 48)">
        <rect width={75} height={94} rx={4} fill="#0f2b1d" stroke="#10b981" strokeWidth={2} />
        <text x={37} y={44} fill="#34d399" fontSize={9} fontWeight="bold" textAnchor="middle">GENERATOR</text>
        <text x={37} y={60} fill="#a7f3d0" fontSize={7.5} textAnchor="middle">H={H_gen}s</text>
      </g>

      {renderCalloutChip('H_hp', 'H HP', `${H_hp} s`, 70, 175, 70, 130, 'center', '#8b5cf6')}
      {renderCalloutChip('H_lp', 'H LP', `${H_lp} s`, 260, 175, 260, 148, 'center', '#8b5cf6')}
      {renderCalloutChip('H_gen', 'H Gen', `${H_gen} s`, 370, 175, 370, 142, 'center', '#10b981')}
    </svg>
  );
};

/**
 * Bergeron Wave Travel Transmission Line SVG
 */
const BergeronWaveDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const { tauMs, zc, lengthKm } = calculateBergeronLineParameters(params);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          BERGERON TRAVELING WAVE (d'Alembert)
        </text>
      </g>

      {/* Sending End Bus (k) */}
      <g transform="translate(45, 60)">
        <line x1={0} y1={0} x2={0} y2={80} stroke="#388bfd" strokeWidth={4} />
        <circle cx={0} cy={40} r={4} fill="#388bfd" />
        <text x={-6} y={-8} fill="#60a5fa" fontSize={9} fontWeight="bold">Bus k (Send)</text>
        <text x={-6} y={92} fill="#94a3b8" fontSize={7.5}>vk(t), ik(t)</text>
      </g>

      {/* Distributed Wave Corridor */}
      <g transform="translate(60, 75)">
        <rect width={310} height={50} rx={6} fill="#0d1424" stroke="#263147" strokeWidth={1.5} />

        {/* Forward Wave Arrow (Right) */}
        <path d="M 40 18 Q 100 8 160 18 T 260 18" fill="none" stroke="#f59e0b" strokeWidth={2} />
        <polygon points="268,18 260,14 260,22" fill="#f59e0b" />
        <text x={155} y={14} fill="#fbbf24" fontSize={8} fontWeight="bold" textAnchor="middle">
          Forward Wave F(t - x/ν)
        </text>

        {/* Backward Wave Arrow (Left) */}
        <path d="M 260 36 Q 200 46 140 36 T 40 36" fill="none" stroke="#10b981" strokeWidth={2} />
        <polygon points="32,36 40,32 40,40" fill="#10b981" />
        <text x={155} y={46} fill="#34d399" fontSize={8} fontWeight="bold" textAnchor="middle">
          Backward Wave B(t + x/ν)
        </text>
      </g>

      {/* Receiving End Bus (m) */}
      <g transform="translate(385, 60)">
        <line x1={0} y1={0} x2={0} y2={80} stroke="#10b981" strokeWidth={4} />
        <circle cx={0} cy={40} r={4} fill="#10b981" />
        <text x={-6} y={-8} fill="#34d399" fontSize={9} fontWeight="bold">Bus m (Rec)</text>
        <text x={-6} y={92} fill="#94a3b8" fontSize={7.5}>vm(t), im(t)</text>
      </g>

      {/* Parameter Callouts */}
      {renderCalloutChip('lengthKm', 'Length d', `${lengthKm} km`, 90, 175, 90, 125, 'center', '#388bfd')}
      {renderCalloutChip('tau', 'Delay τ', `${tauMs.toFixed(3)} ms`, 215, 175, 215, 125, 'center', '#f59e0b')}
      {renderCalloutChip('Zc_aerial', 'Surge Zc', `${zc} Ω`, 340, 175, 340, 125, 'center', '#10b981')}
    </svg>
  );
};

/**
 * Nominal Pi Section Transmission Line SVG
 */
const LinePiSectionDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const lengthKm = Number(params.lengthKm ?? 50);
  const R_per_km = Number(params.R_per_km ?? 0.032);
  const L_per_km = Number(params.L_per_km ?? 0.001);

  const totalR = (R_per_km * lengthKm).toFixed(2);
  const totalL = (L_per_km * lengthKm * 1000).toFixed(1);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={170} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          NOMINAL π-SECTION MODEL
        </text>
      </g>

      <g transform="translate(45, 65)">
        {/* Terminal Bus k */}
        <line x1={0} y1={0} x2={0} y2={60} stroke="#388bfd" strokeWidth={3} />
        <text x={-6} y={-6} fill="#60a5fa" fontSize={8.5} fontWeight="bold">Port k</text>

        {/* Shunt capacitor C/2 at sending end */}
        <line x1={0} y1={30} x2={40} y2={30} stroke="#388bfd" strokeWidth={1.5} />
        <line x1={40} y1={30} x2={40} y2={50} stroke="#f59e0b" strokeWidth={1.5} />
        {/* Capacitor plates */}
        <line x1={32} y1={50} x2={48} y2={50} stroke="#f59e0b" strokeWidth={2} />
        <line x1={32} y1={55} x2={48} y2={55} stroke="#f59e0b" strokeWidth={2} />
        <line x1={40} y1={55} x2={40} y2={75} stroke="#f59e0b" strokeWidth={1.5} />
        {/* Ground */}
        <line x1={34} y1={75} x2={46} y2={75} stroke="#64748b" strokeWidth={1.5} />
        <text x={52} y={55} fill="#fcd34d" fontSize={7.5}>C/2</text>

        {/* Series Branch R + jwL */}
        <line x1={0} y1={30} x2={100} y2={30} stroke="#388bfd" strokeWidth={2} />
        <rect x={100} y={22} width={36} height={16} fill="#161b26" stroke="#388bfd" strokeWidth={1.5} />
        <text x={118} y={33} fill="#93c5fd" fontSize={8} textAnchor="middle">R ({totalR}Ω)</text>
        <line x1={136} y1={30} x2={160} y2={30} stroke="#388bfd" strokeWidth={2} />
        <path d="M 160 30 Q 168 16 176 30 Q 184 16 192 30 Q 200 16 208 30" fill="none" stroke="#388bfd" strokeWidth={2} />
        <text x={184} y={12} fill="#93c5fd" fontSize={8} textAnchor="middle">L ({totalL}mH)</text>
        <line x1={208} y1={30} x2={290} y2={30} stroke="#388bfd" strokeWidth={2} />

        {/* Shunt capacitor C/2 at receiving end */}
        <line x1={290} y1={30} x2={290} y2={50} stroke="#f59e0b" strokeWidth={1.5} />
        <line x1={282} y1={50} x2={298} y2={50} stroke="#f59e0b" strokeWidth={2} />
        <line x1={282} y1={55} x2={298} y2={55} stroke="#f59e0b" strokeWidth={2} />
        <line x1={290} y1={55} x2={290} y2={75} stroke="#f59e0b" strokeWidth={1.5} />
        <line x1={284} y1={75} x2={296} y2={75} stroke="#64748b" strokeWidth={1.5} />
        <text x={302} y={55} fill="#fcd34d" fontSize={7.5}>C/2</text>

        {/* Terminal Bus m */}
        <line x1={330} y1={0} x2={330} y2={60} stroke="#10b981" strokeWidth={3} />
        <line x1={290} y1={30} x2={330} y2={30} stroke="#10b981" strokeWidth={2} />
        <text x={324} y={-6} fill="#34d399" fontSize={8.5} fontWeight="bold">Port m</text>
      </g>

      {renderCalloutChip('R_per_km', 'Series R', `${R_per_km} Ω/km`, 120, 175, 120, 105, 'center', '#388bfd')}
      {renderCalloutChip('L_per_km', 'Series L', `${(L_per_km * 1000).toFixed(2)} mH/km`, 220, 175, 220, 105, 'center', '#388bfd')}
      {renderCalloutChip('lengthKm', 'Length', `${lengthKm} km`, 330, 175, 330, 105, 'center', '#10b981')}
    </svg>
  );
};

/**
 * Transmission Line Sequence Parameters SVG
 */
const LineSequenceDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const Zc1 = Number(params.Zc_aerial ?? 350);
  const Zc0 = Number(params.Zc_ground ?? 550);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#10b981" strokeWidth={1} />
        <text x={8} y={14} fill="#a7f3d0" fontSize={10} fontWeight="bold" fontFamily="monospace">
          SYMMETRICAL SEQUENCE NETWORKS (0, 1, 2)
        </text>
      </g>

      {/* Positive / Negative Sequence (Aerial Mode) */}
      <g transform="translate(45, 55)">
        <rect width={370} height={40} rx={5} fill="#0d1424" stroke="#388bfd" strokeWidth={1.5} />
        <text x={15} y={24} fill="#60a5fa" fontSize={9} fontWeight="bold">
          Positive Sequence (Aerial Mode - Mode 1 & 2):
        </text>
        <text x={240} y={24} fill="#93c5fd" fontSize={8.5} fontFamily="monospace">
          Zc1 = {Zc1} Ω, v1 ≈ 295,000 km/s
        </text>
      </g>

      {/* Zero Sequence (Ground Mode) */}
      <g transform="translate(45, 105)">
        <rect width={370} height={40} rx={5} fill="#140f0a" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={15} y={24} fill="#fbbf24" fontSize={9} fontWeight="bold">
          Zero Sequence (Earth Return Mode - Mode 0):
        </text>
        <text x={240} y={24} fill="#fcd34d" fontSize={8.5} fontFamily="monospace">
          Zc0 = {Zc0} Ω, v0 ≈ 210,000 km/s
        </text>
      </g>

      {renderCalloutChip('Zc_aerial', 'Positive Zc1', `${Zc1} Ω`, 140, 175, 140, 95, 'center', '#388bfd')}
      {renderCalloutChip('Zc_ground', 'Zero Zc0', `${Zc0} Ω`, 300, 175, 300, 145, 'center', '#f59e0b')}
    </svg>
  );
};

/**
 * Breaker Contact Blade & Arc Extinction Mechanism SVG
 */
const BreakerContactDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const isClosed = Boolean(params.initClosed);
  const Ron = Number(params.Ron ?? 0.001);
  const Roff = Number(params.Roff ?? 1000000);
  const openTime = Number(params.openTime ?? 0.1);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={190} height={20} rx={4} fill="#161b26" stroke={isClosed ? '#10b981' : '#ef4444'} strokeWidth={1} />
        <text x={8} y={14} fill={isClosed ? '#34d399' : '#fca5a5'} fontSize={10} fontWeight="bold" fontFamily="monospace">
          BREAKER: {isClosed ? 'CLOSED (Energized)' : 'OPEN (Interrupted)'}
        </text>
      </g>

      <g transform="translate(60, 75)">
        {/* Stationary Contact Terminal 1 */}
        <line x1={0} y1={25} x2={50} y2={25} stroke="#388bfd" strokeWidth={3} />
        <circle cx={50} cy={25} r={5} fill="#388bfd" />
        <text x={-10} y={18} fill="#60a5fa" fontSize={9} fontWeight="bold">Pole 1</text>

        {/* Dynamic Moving Blade */}
        {isClosed ? (
          /* Closed Contact Blade */
          <g>
            <line x1={50} y1={25} x2={160} y2={25} stroke="#10b981" strokeWidth={4} />
            <circle cx={160} cy={25} r={5} fill="#10b981" />
            <text x={105} y={16} fill="#34d399" fontSize={8} fontWeight="bold" textAnchor="middle">
              CLOSED (Ron={Ron * 1000}mΩ)
            </text>
          </g>
        ) : (
          /* Open Contact Blade */
          <g>
            <line x1={50} y1={25} x2={140} y2={-5} stroke="#ef4444" strokeWidth={4} />
            <circle cx={140} cy={-5} r={4} fill="#ef4444" />
            <text x={105} y={-10} fill="#fca5a5" fontSize={8} fontWeight="bold" textAnchor="middle">
              OPEN (Gap Extinguished)
            </text>
            {/* Plasma Arc Discharge indication */}
            <path d="M 54 23 L 80 15 L 100 28 L 125 18 L 155 24" fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />
          </g>
        )}

        {/* Stationary Contact Terminal 2 */}
        <line x1={160} y1={25} x2={220} y2={25} stroke="#388bfd" strokeWidth={3} />
        <circle cx={160} cy={25} r={5} fill="#388bfd" />
        <text x={226} y={18} fill="#60a5fa" fontSize={9} fontWeight="bold">Pole 2</text>

        {/* De-ionizing arc extinction splitter plates */}
        <g transform="translate(85, 38)">
          <rect width={45} height={35} rx={3} fill="#101522" stroke="#475569" strokeWidth={1} />
          <line x1={5} y1={8} x2={40} y2={8} stroke="#94a3b8" strokeWidth={1} />
          <line x1={5} y1={17} x2={40} y2={17} stroke="#94a3b8" strokeWidth={1} />
          <line x1={5} y1={26} x2={40} y2={26} stroke="#94a3b8" strokeWidth={1} />
          <text x={22} y={32} fill="#64748b" fontSize={6.5} textAnchor="middle">Arc Chute</text>
        </g>
      </g>

      {renderCalloutChip('Ron', 'Closed Ron', `${Ron * 1000} mΩ`, 100, 175, 100, 105, 'center', '#10b981')}
      {renderCalloutChip('Roff', 'Open Roff', `${(Roff / 1000000).toFixed(1)} MΩ`, 220, 175, 220, 105, 'center', '#ef4444')}
      {renderCalloutChip('openTime', 'Trip Instant', `${openTime} s`, 340, 175, 340, 105, 'center', '#f59e0b')}
    </svg>
  );
};

/**
 * Power Electronics Bridge Topology SVG (MMC / Converter)
 */
const PowerElectronicsDiagram: React.FC<{
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ params, renderCalloutChip }) => {
  const numSm = Number(params.numSubmodules ?? 20);
  const Vdc = Number(params.Vdc_nom ?? 400000);

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          MMC PHASE LEG & SUBMODULE STACK
        </text>
      </g>

      <g transform="translate(80, 50)">
        {/* DC + Bus */}
        <line x1={0} y1={0} x2={180} y2={0} stroke="#ef4444" strokeWidth={3} />
        <text x={190} y={4} fill="#fca5a5" fontSize={8.5} fontWeight="bold">+Vdc/2 ({(Vdc / 2000).toFixed(0)} kV)</text>

        {/* Upper Arm Submodules Stack */}
        <g transform="translate(70, 10)">
          <rect width={40} height={35} rx={3} fill="#1e293b" stroke="#388bfd" strokeWidth={1.5} />
          <text x={20} y={16} fill="#93c5fd" fontSize={7.5} fontWeight="bold" textAnchor="middle">UPPER ARM</text>
          <text x={20} y={28} fill="#ffffff" fontSize={8} textAnchor="middle">N = {numSm}</text>
        </g>

        {/* AC Phase Terminal (Center) */}
        <line x1={90} y1={45} x2={90} y2={75} stroke="#f59e0b" strokeWidth={2.5} />
        <circle cx={90} cy={60} r={4} fill="#f59e0b" />
        <line x1={90} y1={60} x2={160} y2={60} stroke="#f59e0b" strokeWidth={2} />
        <text x={166} y={64} fill="#fcd34d" fontSize={8.5} fontWeight="bold">AC Terminal (Grid)</text>

        {/* Lower Arm Submodules Stack */}
        <g transform="translate(70, 75)">
          <rect width={40} height={35} rx={3} fill="#1e293b" stroke="#388bfd" strokeWidth={1.5} />
          <text x={20} y={16} fill="#93c5fd" fontSize={7.5} fontWeight="bold" textAnchor="middle">LOWER ARM</text>
          <text x={20} y={28} fill="#ffffff" fontSize={8} textAnchor="middle">N = {numSm}</text>
        </g>

        {/* DC - Bus */}
        <line x1={0} y1={120} x2={180} y2={120} stroke="#388bfd" strokeWidth={3} />
        <text x={190} y={124} fill="#93c5fd" fontSize={8.5} fontWeight="bold">-Vdc/2 (-{(Vdc / 2000).toFixed(0)} kV)</text>
      </g>

      {renderCalloutChip('numSubmodules', 'SM / Arm', `${numSm}`, 120, 175, 120, 140, 'center', '#388bfd')}
      {renderCalloutChip('Vdc_nom', 'Nominal Vdc', `${(Vdc / 1000).toFixed(0)} kV`, 320, 175, 320, 140, 'center', '#ef4444')}
    </svg>
  );
};

/**
 * Dommel Norton Companion Model SVG (General / RLC branches)
 */
const DommelNortonDiagram: React.FC<{
  component: CircuitComponentData;
  params: Record<string, any>;
  renderCalloutChip: any;
}> = ({ component, renderCalloutChip }) => {
  const compType = component.type;
  let compName = 'Passive Element';
  let geqFormula = 'Geq = 1 / R';
  let ihistFormula = 'Ihist(t) = 0';

  if (compType === COMPONENT_TYPES.INDUCTOR) {
    compName = 'Dommel Inductor Companion';
    geqFormula = 'Geq = Δt / (2L)';
    ihistFormula = 'Ihist(t) = i(t-Δt) + Geq·v(t-Δt)';
  } else if (compType === COMPONENT_TYPES.CAPACITOR) {
    compName = 'Dommel Capacitor Companion';
    geqFormula = 'Geq = 2C / Δt';
    ihistFormula = 'Ihist(t) = -i(t-Δt) - Geq·v(t-Δt)';
  } else if (compType === COMPONENT_TYPES.RESISTOR) {
    compName = 'Dommel Resistor Companion';
    geqFormula = 'Geq = 1 / R';
    ihistFormula = 'Ihist(t) = 0';
  }

  return (
    <svg viewBox="0 0 460 200" className="w-full h-full max-w-[460px] select-none">
      <g transform="translate(10, 18)">
        <rect width={210} height={20} rx={4} fill="#161b26" stroke="#388bfd" strokeWidth={1} />
        <text x={8} y={14} fill="#93c5fd" fontSize={10} fontWeight="bold" fontFamily="monospace">
          {compName.toUpperCase()}
        </text>
      </g>

      <g transform="translate(90, 60)">
        {/* Node k */}
        <circle cx={0} cy={35} r={4} fill="#388bfd" />
        <text x={-6} y={20} fill="#60a5fa" fontSize={9} fontWeight="bold">Node k</text>
        <line x1={0} y1={35} x2={50} y2={35} stroke="#388bfd" strokeWidth={2} />

        {/* Norton Equivalent Conductance Geq (Top Branch) */}
        <line x1={50} y1={35} x2={50} y2={10} stroke="#388bfd" strokeWidth={1.5} />
        <line x1={50} y1={10} x2={90} y2={10} stroke="#388bfd" strokeWidth={1.5} />
        <rect x={90} y={2} width={40} height={16} fill="#161b26" stroke="#388bfd" strokeWidth={1.5} />
        <text x={110} y={13} fill="#93c5fd" fontSize={8} fontWeight="bold" textAnchor="middle">Geq</text>
        <line x1={130} y1={10} x2={170} y2={10} stroke="#388bfd" strokeWidth={1.5} />
        <line x1={170} y1={10} x2={170} y2={35} stroke="#388bfd" strokeWidth={1.5} />

        {/* History Current Source Ihist (Bottom Branch) */}
        <line x1={50} y1={35} x2={50} y2={60} stroke="#10b981" strokeWidth={1.5} />
        <line x1={50} y1={60} x2={95} y2={60} stroke="#10b981" strokeWidth={1.5} />
        <circle cx={110} cy={60} r={14} fill="#161b26" stroke="#10b981" strokeWidth={1.5} />
        <polygon points="106,64 114,64 110,55" fill="#10b981" />
        <line x1={125} y1={60} x2={170} y2={60} stroke="#10b981" strokeWidth={1.5} />
        <line x1={170} y1={60} x2={170} y2={35} stroke="#10b981" strokeWidth={1.5} />

        {/* Node m */}
        <line x1={170} y1={35} x2={220} y2={35} stroke="#10b981" strokeWidth={2} />
        <circle cx={220} cy={35} r={4} fill="#10b981" />
        <text x={226} y={20} fill="#34d399" fontSize={9} fontWeight="bold">Node m</text>
      </g>

      {renderCalloutChip('geqFormula', 'Conductance', geqFormula, 140, 175, 140, 75, 'center', '#388bfd')}
      {renderCalloutChip('ihistFormula', 'History Current', ihistFormula, 280, 175, 280, 125, 'center', '#10b981')}
    </svg>
  );
};
