import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  GripHorizontal,
} from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import { definitionRegistry } from '../../engine/definitions';
import { normalizeMasterCategory } from './MasterLibraryFlyout';

export interface MasterCategorySubSheetProps {
  category: string;
  onBack: () => void;
  onSelectCategory: (category: string) => void;
  onAddComp: (type: string, customDefId?: string, definitionId?: string) => void;
  onSwitchToProjectTab?: () => void;
  onOpenFlyoutCategory?: (category: string) => void;
}

interface SubSheetItem {
  type: string;
  name: string;
  category: string;
  sublabel: string;
  ansiCode?: string;
  desc: string;
  symbol: React.ReactNode;
  customDefId?: string;
  definitionId?: string;
  tags: string[];
}

export const MasterCategorySubSheet: React.FC<MasterCategorySubSheetProps> = ({
  category,
  onBack,
  onSelectCategory,
  onAddComp,
  onSwitchToProjectTab,
  onOpenFlyoutCategory,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [search, setSearch] = useState<string>('');
  const [hoveredComp, setHoveredComp] = useState<string | null>(null);

  const customDefs = definitionRegistry.getAllDefinitions();

  const allItems: SubSheetItem[] = useMemo(() => {
    const items: SubSheetItem[] = [
      // -------------------------------------------------------------
      // 1. Passive RLC
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.RESISTOR,
        name: 'Linear Resistor (R)',
        category: 'Passive RLC',
        sublabel: '1.0 [ohm]',
        desc: 'Linear ohmic resistance companion branch with numerical damping.',
        tags: ['resistor', 'r', 'damping', 'passive'],
        symbol: (
          <svg width="90" height="34" viewBox="0 0 90 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="4" cy="17" r="2.5" className="fill-[#1d4ed8]" />
            <path d="M20 17 L25 8 L33 26 L41 8 L49 26 L57 8 L65 26 L70 17" />
            <line x1="70" y1="17" x2="86" y2="17" />
            <circle cx="86" cy="17" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.INDUCTOR,
        name: 'Linear Inductor (L)',
        category: 'Passive RLC',
        sublabel: '0.1 [H]',
        desc: 'EMT Trapezoidal companion model inductor with history current injection.',
        tags: ['inductor', 'l', 'reactor', 'passive'],
        symbol: (
          <svg width="90" height="34" viewBox="0 0 90 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="18" y2="17" />
            <circle cx="4" cy="17" r="2.5" className="fill-[#1d4ed8]" />
            <path d="M18 17 A7 7 0 0 1 32 17 A7 7 0 0 1 46 17 A7 7 0 0 1 60 17 A7 7 0 0 1 74 17" />
            <line x1="74" y1="17" x2="86" y2="17" />
            <circle cx="86" cy="17" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.CAPACITOR,
        name: 'Linear Capacitor (C)',
        category: 'Passive RLC',
        sublabel: '1.0 [uF]',
        desc: 'EMT Trapezoidal companion model capacitor with history voltage calculation.',
        tags: ['capacitor', 'c', 'filter', 'passive'],
        symbol: (
          <svg width="90" height="34" viewBox="0 0 90 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="38" y2="17" />
            <circle cx="4" cy="17" r="2.5" className="fill-[#1d4ed8]" />
            <line x1="38" y1="6" x2="38" y2="28" strokeWidth="2.4" />
            <line x1="52" y1="6" x2="52" y2="28" strokeWidth="2.4" />
            <line x1="52" y1="17" x2="86" y2="17" />
            <circle cx="86" cy="17" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.SERIES_RLC,
        name: 'Series RLC Branch',
        category: 'Passive RLC',
        sublabel: '1.0 [ohm] / 0.1 [H] / 1.0 [uF]',
        desc: 'Lumped parameter series RLC impedance branch with unified companion conductance.',
        tags: ['rlc', 'branch', 'series', 'passive'],
        symbol: (
          <svg width="90" height="34" viewBox="0 0 90 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="16" y2="17" />
            <circle cx="4" cy="17" r="2.5" className="fill-[#1d4ed8]" />
            <rect x="16" y="9" width="58" height="16" rx="2" className="fill-slate-50" />
            <text x="25" y="21" className="fill-slate-800 text-[10px] font-mono stroke-none font-bold">R - L - C</text>
            <line x1="74" y1="17" x2="86" y2="17" />
            <circle cx="86" cy="17" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.GROUND,
        name: 'Ground (0V Reference)',
        category: 'Passive RLC',
        sublabel: 'GND 0V',
        desc: 'Zero potential electrical earth reference node for single-wire return.',
        tags: ['ground', 'earth', '0v', 'gnd', 'passive'],
        symbol: (
          <svg width="60" height="40" viewBox="0 0 60 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="30" y1="2" x2="30" y2="20" />
            <circle cx="30" cy="2" r="2.5" className="fill-[#1d4ed8]" />
            <line x1="14" y1="20" x2="46" y2="20" strokeWidth="2.2" />
            <line x1="20" y1="26" x2="40" y2="26" strokeWidth="2" />
            <line x1="25" y1="32" x2="35" y2="32" strokeWidth="1.8" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.SURGE_ARRESTER,
        name: 'Surge Arrester (MOV)',
        category: 'Passive RLC',
        sublabel: 'V1mA = 390 kV',
        desc: 'Non-linear metal oxide varistor with dynamic energy absorption monitoring.',
        tags: ['mov', 'arrester', 'surge', 'lightning', 'varistor'],
        symbol: (
          <svg width="60" height="44" viewBox="0 0 60 44" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="30" y1="2" x2="30" y2="12" />
            <circle cx="30" cy="2" r="2.5" className="fill-[#1d4ed8]" />
            <polygon points="18,12 42,12 30,24" className="fill-slate-700" />
            <polygon points="18,36 42,36 30,24" className="fill-slate-700" />
            <line x1="30" y1="36" x2="30" y2="42" />
            <circle cx="30" cy="42" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 2. Sources & Generators
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        name: '3-Phase AC Grid Source',
        category: 'Sources & Generators',
        sublabel: '230 kV / 60 Hz',
        desc: 'Balanced 3-Phase AC bulk power supply with positive and zero sequence impedance.',
        tags: ['source', 'grid', '3-phase', 'infinite bus', 'ac'],
        symbol: (
          <svg width="100" height="40" viewBox="0 0 100 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="50" cy="20" r="16" className="fill-white" />
            <path d="M41 20 Q45.5 13 50 20 Q54.5 27 59 20" strokeWidth="2" />
            <line x1="8" y1="20" x2="34" y2="20" />
            <circle cx="8" cy="20" r="2.5" className="fill-[#1d4ed8]" />
            <line x1="66" y1="20" x2="92" y2="20" />
            <circle cx="92" cy="20" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        name: 'AC Voltage Source (1-Ph)',
        category: 'Sources & Generators',
        sublabel: '120 kV / 60 Hz',
        desc: 'Thevenin / Ideal 1-Phase AC voltage source with configurable series impedance.',
        tags: ['source', 'grid', 'thevenin', 'ac', 'voltage'],
        symbol: (
          <svg width="90" height="36" viewBox="0 0 90 36" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="45" cy="18" r="14" className="fill-white" />
            <path d="M37 18 Q41 12 45 18 Q49 24 53 18" strokeWidth="1.8" />
            <line x1="8" y1="18" x2="31" y2="18" />
            <circle cx="8" cy="18" r="2.5" className="fill-[#1d4ed8]" />
            <line x1="59" y1="18" x2="82" y2="18" />
            <circle cx="82" cy="18" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.DC_SOURCE,
        name: 'DC Voltage Source',
        category: 'Sources & Generators',
        sublabel: '±500 kV DC',
        desc: 'Ideal ripple-free DC power supply for HVDC converters, batteries and PV strings.',
        tags: ['dc', 'battery', 'pv', 'source'],
        symbol: (
          <svg width="80" height="34" viewBox="0 0 80 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="40" cy="17" r="13" className="fill-white" />
            <line x1="33" y1="13" x2="47" y2="13" strokeWidth="2.2" />
            <line x1="35" y1="21" x2="45" y2="21" strokeWidth="2.2" strokeDasharray="2,2" />
            <line x1="8" y1="17" x2="27" y2="17" />
            <circle cx="8" cy="17" r="2.5" className="fill-[#1d4ed8]" />
            <line x1="53" y1="17" x2="72" y2="17" />
            <circle cx="72" cy="17" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.SYNC_MACHINE_DQ,
        name: 'Park d-q-0 Synchronous Machine',
        category: 'Sources & Generators',
        sublabel: '6th Order dq0',
        ansiCode: 'ANSI 87G',
        desc: '6th-order state-space synchronous generator with subtransient reactances and AVR.',
        tags: ['generator', 'dq0', 'park', 'synchronous', 'avr'],
        symbol: (
          <svg width="80" height="56" viewBox="0 0 80 56" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="40" cy="28" r="20" className="fill-white" />
            <text x="35" y="34" className="fill-slate-900 text-[15px] font-serif stroke-none font-bold">S</text>
            <line x1="8" y1="16" x2="20" y2="28" />
            <line x1="8" y1="40" x2="20" y2="28" />
            <text x="8" y="13" className="fill-slate-700 text-[9px] font-mono stroke-none">W</text>
            <text x="8" y="50" className="fill-slate-700 text-[9px] font-mono stroke-none">Te</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.DFIG_GENERATOR,
        name: 'DFIG Wind Turbine (Type 3)',
        category: 'Sources & Generators',
        sublabel: '2.0 MW / Crowbar',
        desc: 'Doubly-fed induction generator with Crowbar LVRT protection and rotor side control.',
        tags: ['wind', 'dfig', 'renewable', 'crowbar', 'generator'],
        symbol: (
          <svg width="80" height="56" viewBox="0 0 80 56" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="40" cy="28" r="18" className="fill-white" />
            <text x="28" y="32" className="fill-slate-900 text-[10px] font-mono stroke-none font-bold">DFIG</text>
            <line x1="40" y1="10" x2="40" y2="2" />
            <line x1="40" y1="46" x2="40" y2="54" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.PMSG_GENERATOR,
        name: 'PMSG Wind Turbine (Type 4)',
        category: 'Sources & Generators',
        sublabel: '5.0 MW BTB',
        desc: 'Permanent magnet synchronous generator with full-scale back-to-back converter.',
        tags: ['wind', 'pmsg', 'permanent magnet', 'renewable', 'generator'],
        symbol: (
          <svg width="80" height="56" viewBox="0 0 80 56" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="40" cy="28" r="18" className="fill-white" />
            <text x="26" y="32" className="fill-slate-900 text-[10px] font-mono stroke-none font-bold">PMSG</text>
            <line x1="14" y1="28" x2="22" y2="28" />
            <line x1="58" y1="28" x2="66" y2="28" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 3. Switches & Faults
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.BREAKER_1PH,
        name: '1-Phase Circuit Breaker',
        category: 'Switches & Faults',
        sublabel: 'Single Pole',
        ansiCode: 'ANSI 52',
        desc: 'Timed or interactive controlled single-pole breaker with arc extinction and current zero crossing.',
        tags: ['breaker', 'switch', '52'],
        symbol: (
          <svg width="60" height="40" viewBox="0 0 60 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="30" y1="4" x2="30" y2="14" />
            <circle cx="30" cy="4" r="2.5" className="fill-[#1d4ed8]" />
            <rect x="22" y="14" width="16" height="12" className="fill-rose-600 stroke-none" />
            <line x1="30" y1="26" x2="30" y2="36" />
            <circle cx="30" cy="36" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.BREAKER_3PH,
        name: '3-Phase Gang-Operated Breaker',
        category: 'Switches & Faults',
        sublabel: '3-Pole Gang',
        ansiCode: 'ANSI 52',
        desc: '3-pole simultaneous or staggered tripping circuit breaker with point-on-wave closing.',
        tags: ['breaker', '3-phase', '52', 'trip'],
        symbol: (
          <svg width="60" height="40" viewBox="0 0 60 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="30" y1="4" x2="30" y2="14" strokeWidth="2.5" className="stroke-sky-700" />
            <rect x="18" y="14" width="24" height="12" className="fill-rose-600 stroke-none" />
            <line x1="30" y1="26" x2="30" y2="36" strokeWidth="2.5" className="stroke-sky-700" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.FAULT_BLOCK,
        name: 'Timed Fault Block',
        category: 'Switches & Faults',
        sublabel: 'SLG / 2LG / 3LG',
        desc: 'Phase-to-ground, phase-to-phase, or symmetrical 3-phase short circuit fault with arc resistance.',
        tags: ['fault', 'short circuit', '3lg', 'slg'],
        symbol: (
          <svg width="60" height="40" viewBox="0 0 60 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="30" y1="2" x2="30" y2="12" />
            <circle cx="30" cy="2" r="2.5" className="fill-[#1d4ed8]" />
            <polygon points="30,12 20,24 32,24 24,36 40,20 28,20" className="fill-amber-500 stroke-amber-600" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.IDEAL_SWITCH,
        name: 'Ideal Bi-Directional Switch',
        category: 'Switches & Faults',
        sublabel: 'Gated Switch',
        desc: 'Sub-step zero-crossing interpolated bi-directional ideal switch.',
        tags: ['switch', 'ideal', 'interpolated'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="20" cy="17" r="2.5" className="fill-white stroke-slate-900" />
            <line x1="22" y1="15" x2="38" y2="6" strokeWidth="2" />
            <circle cx="40" cy="17" r="2.5" className="fill-white stroke-slate-900" />
            <line x1="40" y1="17" x2="56" y2="17" />
            <circle cx="4" cy="17" r="2" className="fill-[#1d4ed8]" />
            <circle cx="56" cy="17" r="2" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 4. Transformers & Lines
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.TRANSFORMER_1PH,
        name: '2-Winding Transformer (1-Ph)',
        category: 'Transformers & Lines',
        sublabel: 'Single Phase',
        desc: 'Single-phase saturable magnetic transformer with core loss resistance.',
        tags: ['transformer', 'xfmr', '2-winding'],
        symbol: (
          <svg width="80" height="40" viewBox="0 0 80 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <path d="M16 10 C16 16, 24 16, 24 20 C24 24, 16 24, 16 30" />
            <line x1="34" y1="8" x2="34" y2="32" strokeWidth="1.4" />
            <line x1="38" y1="8" x2="38" y2="32" strokeWidth="1.4" />
            <path d="M56 10 C56 16, 48 16, 48 20 C48 24, 56 24, 56 30" />
            <circle cx="10" cy="10" r="2.5" className="fill-[#1d4ed8]" />
            <circle cx="10" cy="30" r="2.5" className="fill-[#1d4ed8]" />
            <circle cx="62" cy="10" r="2.5" className="fill-[#1d4ed8]" />
            <circle cx="62" cy="30" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.TRANSFORMER_3PH,
        name: '3-Phase Power Transformer (Y-Δ)',
        category: 'Transformers & Lines',
        sublabel: 'Y - Δ Substation',
        desc: '3-Phase substation transformer with selectable vector groups (Yg-D1, Yg-Yg, D-D).',
        tags: ['transformer', '3-phase', 'yd', 'substation'],
        symbol: (
          <svg width="90" height="46" viewBox="0 0 90 46" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="34" cy="23" r="16" className="fill-white" />
            <circle cx="56" cy="23" r="16" className="fill-white" />
            <text x="28" y="27" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">#1</text>
            <text x="52" y="27" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">#2</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        name: 'UMEC 3-Limb Core Transformer',
        category: 'Transformers & Lines',
        sublabel: 'Unified Magnetic',
        desc: 'Unified Magnetic Equivalent Circuit (UMEC) with inter-phase magnetic cross-coupling.',
        tags: ['umec', 'transformer', '3-limb', 'reluctance'],
        symbol: (
          <svg width="90" height="46" viewBox="0 0 90 46" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="18" y="10" width="54" height="26" rx="2" className="fill-slate-50" />
            <line x1="36" y1="10" x2="36" y2="36" strokeDasharray="2,2" />
            <line x1="54" y1="10" x2="54" y2="36" strokeDasharray="2,2" />
            <text x="24" y="26" className="fill-slate-800 text-[9px] font-mono stroke-none font-bold">UMEC</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.PI_LINE,
        name: 'Pi-Section Transmission Line',
        category: 'Transformers & Lines',
        sublabel: 'Lumped Pi',
        desc: 'Lumped parameter nominal Pi circuit for short transmission lines.',
        tags: ['line', 'pi', 'transmission'],
        symbol: (
          <svg width="90" height="40" viewBox="0 0 90 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="8" y1="14" x2="82" y2="14" />
            <line x1="26" y1="14" x2="26" y2="34" />
            <line x1="64" y1="14" x2="64" y2="34" />
            <circle cx="8" cy="14" r="2.5" className="fill-[#1d4ed8]" />
            <circle cx="82" cy="14" r="2.5" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.BERGERON_LINE_3PH,
        name: 'Polyphase 3-Ph Coupled Line',
        category: 'Transformers & Lines',
        sublabel: 'Bergeron 3-Ph Tower',
        desc: 'Clarke modal decoupled 3-phase distributed traveling wave transmission line.',
        tags: ['bergeron', '3-phase', 'modal', 'clarke', 'tline'],
        symbol: (
          <svg width="80" height="60" viewBox="0 0 80 60" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="40" y1="6" x2="40" y2="56" strokeWidth="2.2" />
            <line x1="20" y1="18" x2="60" y2="18" strokeWidth="2" />
            <line x1="16" y1="32" x2="64" y2="32" strokeWidth="2" />
            <line x1="24" y1="44" x2="56" y2="44" strokeWidth="2" />
            <circle cx="20" cy="18" r="2" className="fill-[#1d4ed8]" />
            <circle cx="60" cy="18" r="2" className="fill-[#1d4ed8]" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 5. Power Electronics & FACTS
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.LCC_BRIDGE_6PULSE,
        name: '6-Pulse LCC Graetz Bridge',
        category: 'Power Electronics & FACTS',
        sublabel: 'Classic HVDC',
        desc: '6-Thyristor bridge with alpha firing angle control for Classic HVDC stations.',
        tags: ['lcc', 'graetz', 'hvdc', '6-pulse'],
        symbol: (
          <svg width="80" height="54" viewBox="0 0 80 54" className="stroke-slate-900 fill-none stroke-[1.6]">
            <rect x="25" y="8" width="30" height="38" className="fill-slate-50" />
            <polygon points="36,20 44,20 40,28" className="fill-slate-800" />
            <line x1="34" y1="28" x2="46" y2="28" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.THYRISTOR,
        name: 'Line-Commutated Thyristor (SCR)',
        category: 'Power Electronics & FACTS',
        sublabel: 'SCR Valve',
        desc: 'Phase-controlled thyristor with holding current, gate firing pulses and natural commutation.',
        tags: ['thyristor', 'scr', 'rectifier', 'hvdc'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="20" y2="17" />
            <polygon points="20,9 20,25 34,17" className="fill-slate-800" />
            <line x1="34" y1="9" x2="34" y2="25" strokeWidth="2" />
            <line x1="34" y1="17" x2="52" y2="17" />
            <line x1="30" y1="21" x2="36" y2="28" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.DIODE,
        name: 'Power Diode (Qrr / trr)',
        category: 'Power Electronics & FACTS',
        sublabel: 'Diode Rectifier',
        desc: 'Power semiconductor diode with forward voltage drop and reverse recovery charge dynamics.',
        tags: ['diode', 'qrr', 'trr', 'rectifier'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="4" y1="17" x2="20" y2="17" />
            <polygon points="20,9 20,25 34,17" className="fill-slate-800" />
            <line x1="34" y1="9" x2="34" y2="25" strokeWidth="2" />
            <line x1="34" y1="17" x2="52" y2="17" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.STATCOM,
        name: 'STATCOM (Dynamic Var Support)',
        category: 'Power Electronics & FACTS',
        sublabel: 'VSC Var Support',
        desc: 'Static Synchronous Compensator with decoupled d-q current vector controller.',
        tags: ['statcom', 'facts', 'var', 'voltage control'],
        symbol: (
          <svg width="80" height="46" viewBox="0 0 80 46" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="20" y="8" width="40" height="30" rx="3" className="fill-slate-50" />
            <text x="24" y="27" className="fill-indigo-900 text-[10px] font-mono stroke-none font-bold">STATCOM</text>
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 6. Machines & Drives
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.INDUCTION_MACHINE,
        name: 'Induction Machine (SCIM/WRIM)',
        category: 'Machines & Drives',
        sublabel: '4th Order Induction',
        desc: '4th-order squirrel cage or wound rotor induction motor with starting torque dynamics.',
        tags: ['motor', 'induction', 'scim', 'wrim', 'machine'],
        symbol: (
          <svg width="80" height="56" viewBox="0 0 80 56" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="40" cy="28" r="20" className="fill-white" />
            <circle cx="40" cy="28" r="13" strokeDasharray="3,2" />
            <text x="32" y="32" className="fill-slate-900 text-[12px] font-mono stroke-none font-bold">IM</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.MULTI_MASS_SHAFT,
        name: 'Multi-Mass Torsional Shaft',
        category: 'Machines & Drives',
        sublabel: 'Torsional SSR',
        desc: 'N-mass elastic mechanical shaft for Sub-Synchronous Resonance (SSR) torsional fatigue.',
        tags: ['ssr', 'shaft', 'turbine', 'torsional'],
        symbol: (
          <svg width="90" height="40" viewBox="0 0 90 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="10" y1="20" x2="80" y2="20" strokeWidth="2.5" />
            <circle cx="25" cy="20" r="10" className="fill-slate-100" />
            <circle cx="50" cy="20" r="12" className="fill-slate-100" />
            <circle cx="72" cy="20" r="8" className="fill-slate-100" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 7. Control Blocks (CSMF)
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.CSMF_CONSTANT,
        name: 'Constant Signal Source',
        category: 'Control Blocks (CSMF)',
        sublabel: 'Constant [ C ]',
        desc: 'Outputs fixed numeric control constant.',
        tags: ['constant', 'csmf', 'control'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="12" y="6" width="36" height="22" rx="2" className="fill-white" />
            <text x="24" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">[C]</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.CSMF_GAIN,
        name: 'Gain & Offset Block (K)',
        category: 'Control Blocks (CSMF)',
        sublabel: 'y = K*u + b',
        desc: 'Linear scaling: y = K*u + b.',
        tags: ['gain', 'scale', 'csmf'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <polygon points="14,6 46,17 14,28" className="fill-white" />
            <text x="22" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">K</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.CSMF_SUM,
        name: 'Summation Block (Σ)',
        category: 'Control Blocks (CSMF)',
        sublabel: '+ / - Summer',
        desc: 'Algebraic summer with configurable port signs (+, -).',
        tags: ['sum', 'summer', 'csmf'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="30" cy="17" r="12" className="fill-white" />
            <line x1="24" y1="17" x2="36" y2="17" />
            <line x1="30" y1="11" x2="30" y2="23" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.CSMF_PID,
        name: 'PID Controller with Filter',
        category: 'Control Blocks (CSMF)',
        sublabel: 'P + I + D',
        desc: 'PID controller with derivative low-pass filter and anti-windup clamping.',
        tags: ['pid', 'controller', 'pi', 'csmf'],
        symbol: (
          <svg width="70" height="34" viewBox="0 0 70 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="10" y="6" width="50" height="22" rx="2" className="fill-white" />
            <text x="18" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">PID</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.CSMF_INTEGRATOR,
        name: 'Integrator (1/s)',
        category: 'Control Blocks (CSMF)',
        sublabel: '1 / s',
        desc: 'Trapezoidal integrator with reset and saturation limits.',
        tags: ['integrator', '1/s', 'csmf'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="12" y="6" width="36" height="22" rx="2" className="fill-white" />
            <text x="21" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">1/s</text>
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 8. Runtime Controls
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.RUNTIME_SLIDER,
        name: 'Interactive Slider Knob',
        category: 'Runtime Controls',
        sublabel: 'Slider Potentiometer',
        desc: 'Draggable linear potentiometer modulating control signals in real-time during simulation.',
        tags: ['slider', 'knob', 'runtime', 'control'],
        symbol: (
          <svg width="40" height="50" viewBox="0 0 40 50" className="stroke-slate-900 fill-none stroke-[1.8]">
            <line x1="20" y1="6" x2="20" y2="44" />
            <rect x="10" y="20" width="20" height="10" rx="2" className="fill-slate-200" />
            <line x1="13" y1="25" x2="27" y2="25" strokeWidth="2.2" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        name: 'Rotary Dial Knob',
        category: 'Runtime Controls',
        sublabel: 'Rotary Knob',
        desc: 'Rotary knob with sweeping angle indicator for dynamic parameter tuning.',
        tags: ['dial', 'knob', 'runtime', 'tuning'],
        symbol: (
          <svg width="50" height="40" viewBox="0 0 50 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="25" cy="20" r="15" className="fill-slate-100" />
            <line x1="25" y1="20" x2="35" y2="10" strokeWidth="2.5" className="stroke-slate-900" />
            <circle cx="25" cy="20" r="3" className="fill-slate-800" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.RUNTIME_BUTTON,
        name: 'Tactile Push Button',
        category: 'Runtime Controls',
        sublabel: 'Momentary 1.0',
        desc: 'Momentary push button outputting 1.0 when held down.',
        tags: ['button', 'push', 'runtime'],
        symbol: (
          <svg width="50" height="40" viewBox="0 0 50 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="10" y="10" width="30" height="20" rx="3" className="fill-slate-200" />
            <circle cx="25" cy="20" r="6" className="fill-slate-500" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.RUNTIME_SWITCH,
        name: 'Bistable Toggle Switch',
        category: 'Runtime Controls',
        sublabel: 'ON / OFF',
        desc: 'ON/OFF toggle switch with green status LED.',
        tags: ['switch', 'toggle', 'runtime'],
        symbol: (
          <svg width="40" height="50" viewBox="0 0 40 50" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="20" cy="18" r="12" className="fill-white stroke-slate-700" />
            <circle cx="20" cy="18" r="4" className="fill-emerald-500 stroke-none" />
            <line x1="20" y1="30" x2="20" y2="44" />
          </svg>
        ),
      },

      // -------------------------------------------------------------
      // 9. Meters & Probes
      // -------------------------------------------------------------
      {
        type: COMPONENT_TYPES.VOLTMETER,
        name: 'Voltmeter Probe (V)',
        category: 'Meters & Probes',
        sublabel: 'Instantaneous V',
        desc: 'Line-to-ground or differential instantaneous voltage measurement.',
        tags: ['voltmeter', 'voltage', 'probe', 'meter'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="30" cy="17" r="12" className="fill-white" />
            <text x="25" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">V</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.AMMETER,
        name: 'Ammeter Sensor (I)',
        category: 'Meters & Probes',
        sublabel: 'Branch Current I',
        desc: 'Series branch current sensor.',
        tags: ['ammeter', 'current', 'sensor', 'meter'],
        symbol: (
          <svg width="60" height="34" viewBox="0 0 60 34" className="stroke-slate-900 fill-none stroke-[1.8]">
            <circle cx="30" cy="17" r="12" className="fill-white" />
            <text x="27" y="21" className="fill-slate-800 text-[11px] font-mono stroke-none font-bold">A</text>
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.GRAPH_FRAME,
        name: 'Canvas Embedded Graph Frame',
        category: 'Meters & Probes',
        sublabel: 'Oscilloscope Frame',
        desc: 'Resizable on-schematic oscilloscope frame for real-time live waveform visualization.',
        tags: ['graph', 'scope', 'waveform', 'frame', 'plot'],
        symbol: (
          <svg width="70" height="40" viewBox="0 0 70 40" className="stroke-slate-900 fill-none stroke-[1.8]">
            <rect x="8" y="6" width="54" height="28" rx="2" className="fill-[#0b101b] stroke-slate-600" />
            <path d="M14 20 Q24 8 35 20 Q46 32 56 20" className="stroke-emerald-400 stroke-[1.6]" />
          </svg>
        ),
      },
      {
        type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
        name: 'Wireless Transmitter <Sig>',
        category: 'Meters & Probes',
        sublabel: '<Signal>',
        desc: 'Broadcasts control or electrical signal wirelessly across sheets.',
        tags: ['transmitter', 'wireless', 'label'],
        symbol: (
          <div className="p-1 border border-blue-400 rounded bg-blue-50 text-[10px] font-mono font-bold text-blue-900">
            &lt; Transmitter &gt;
          </div>
        ),
      },
      {
        type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
        name: 'Wireless Receiver [Sig]',
        category: 'Meters & Probes',
        sublabel: '[Signal]',
        desc: 'Receives global wireless signal broadcasted by transmitter.',
        tags: ['receiver', 'wireless', 'label'],
        symbol: (
          <div className="p-1 border border-emerald-400 rounded bg-emerald-50 text-[10px] font-mono font-bold text-emerald-900">
            [ Receiver ]
          </div>
        ),
      },
    ];

    // Add registered Definitions
    customDefs.forEach((def) => {
      items.push({
        type: def.baseType || COMPONENT_TYPES.SUBMODULE,
        name: def.name,
        category: 'User Definitions',
        sublabel: def.category || 'Custom Module',
        desc: def.description || 'User-defined component definition.',
        definitionId: def.id,
        tags: ['definition', def.category, def.name.toLowerCase()],
        symbol: (
          <div className="p-2 border border-purple-400 rounded bg-purple-50 text-center">
            <span className="text-xl">📦</span>
            <span className="text-[10px] font-mono font-bold text-purple-900 block">{def.name}</span>
          </div>
        ),
      });
    });

    return items;
  }, [customDefs]);

  const normalizedCategory = normalizeMasterCategory(category);

  const availableCategories = [
    'Passive RLC',
    'Sources & Generators',
    'Switches & Faults',
    'Transformers & Lines',
    'Power Electronics & FACTS',
    'Machines & Drives',
    'Control Blocks (CSMF)',
    'Runtime Controls',
    'Meters & Probes',
    'User Definitions',
  ];

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchCat = item.category === normalizedCategory;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.desc.toLowerCase().includes(q);
      const matchAnsi = item.ansiCode ? item.ansiCode.toLowerCase().includes(q) : false;
      const matchTags = item.tags.some((t) => t.includes(q));
      return matchName || matchDesc || matchAnsi || matchTags;
    });
  }, [allItems, normalizedCategory, search]);

  const handleComponentClick = (item: SubSheetItem) => {
    onAddComp(item.type, item.customDefId, item.definitionId);
    if (onSwitchToProjectTab) {
      onSwitchToProjectTab();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: SubSheetItem) => {
    const payload = JSON.stringify({
      type: item.type,
      name: item.name,
      customDefId: item.customDefId,
      definitionId: item.definitionId,
    });
    e.dataTransfer.setData('application/pscad-component', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-full h-full flex flex-col bg-white select-none overflow-hidden font-sans text-slate-800 relative">
      {/* 1. Header Toolbar */}
      <div className="h-8 bg-[#f0f3f6] border-b border-[#cbd5e1] px-3 flex items-center justify-between text-xs text-[#334155] shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Return to Master Library 12-Card Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Overview</span>
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-bold text-[#1e293b]">{normalizedCategory}</span>
          <span className="text-[#64748b] text-[11px]">— Click or drag any component directly into your schematic</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {onOpenFlyoutCategory && (
            <button
              type="button"
              onClick={() => onOpenFlyoutCategory(normalizedCategory)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium transition-colors cursor-pointer mr-2"
              title="Open Floating Browser Flyout"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Floating Flyout</span>
            </button>
          )}

          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-medium text-[11px] min-w-[40px] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Actual Size (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Category Switcher Bar & Live Search */}
      <div className="px-4 py-2 bg-[#fafbfc] border-b border-[#e2e8f0] flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                normalizedCategory === cat
                  ? 'bg-[#1f6feb] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${normalizedCategory}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Sub-Sheet Canvas Grid */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] relative">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: '1360px',
            minHeight: '800px',
          }}
          className="grid grid-cols-4 gap-4 pb-12 transition-transform duration-75"
        >
          {filteredItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Search className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600">No components found matching "{search}"</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switch categories above.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => handleComponentClick(item)}
                onMouseEnter={() => setHoveredComp(item.type)}
                onMouseLeave={() => setHoveredComp(null)}
                className={`p-3 rounded-lg border bg-white shadow-xs cursor-pointer flex flex-col justify-between transition-all ${
                  hoveredComp === item.type
                    ? 'border-blue-500 ring-2 ring-blue-200 shadow-md bg-blue-50/10'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{item.name}</h4>
                    {item.ansiCode && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                        {item.ansiCode}
                      </span>
                    )}
                  </div>

                  {/* SVG Circuit Symbol Box */}
                  <div className="h-20 bg-[#fafbfc] border border-slate-200 rounded flex items-center justify-center p-2 mb-2">
                    {item.symbol}
                  </div>

                  <div className="text-[10px] font-mono text-slate-600 font-semibold mb-1">{item.sublabel}</div>
                  <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400">
                    <GripHorizontal className="w-3 h-3" />
                    Drag to canvas
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-600 font-medium hover:underline">
                    Click to place <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
