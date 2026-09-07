import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  ArrowRight,
  GripHorizontal,
} from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import { definitionRegistry } from '../../engine/definitions';
import { customComponentRegistry } from '../../engine/customComponents';

export interface MasterLibraryFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (type: string, customDefId?: string, definitionId?: string) => void;
  initialCategory?: string;
}

export function normalizeMasterCategory(cat?: string): string {
  if (!cat) return 'ALL';
  const c = cat.trim().toLowerCase();
  if (c === 'all') return 'ALL';
  if (c.includes('passive') || c.includes('rlc')) return 'Passive RLC';
  if (c.includes('source') || c.includes('generator')) return 'Sources & Generators';
  if (c.includes('switch') || c.includes('fault') || c.includes('breaker')) return 'Switches & Faults';
  if (c.includes('transformer') || c.includes('line') || c.includes('cable') || c.includes('xfmr') || c.includes('tline')) return 'Transformers & Lines';
  if (c.includes('power electronic') || c.includes('hvdc') || c.includes('facts')) return 'Power Electronics & FACTS';
  if (c.includes('machine') || c.includes('drive') || c.includes('motor')) return 'Machines & Drives';
  if (c.includes('csmf') || c.includes('misc')) return 'Control Blocks (CSMF)';
  if (c.includes('meter') || c.includes('probe') || c.includes('label') || c.includes('import') || c.includes('export')) return 'Meters & Probes';
  if (c.includes('runtime') || c.includes('i/o') || c.includes('io') || c.includes('device')) return 'Runtime Controls';
  if (c.includes('control')) return 'Control Blocks (CSMF)';
  if (c.includes('definition') || c.includes('custom') || c.includes('workshop')) return 'User Definitions';
  return cat;
}

interface LibItem {
  type: string;
  name: string;
  category: string;
  icon: string;
  ansiCode?: string;
  desc: string;
  customDefId?: string;
  definitionId?: string;
  tags: string[];
}

export const MasterLibraryFlyout: React.FC<MasterLibraryFlyoutProps> = ({
  isOpen,
  onClose,
  onSelectComponent,
  initialCategory,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => normalizeMasterCategory(initialCategory));

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(normalizeMasterCategory(initialCategory));
    }
  }, [initialCategory, isOpen]);

  const customDefs = definitionRegistry.getAllDefinitions();
  const customWorkshopComps = customComponentRegistry.getAllComponents();

  const libraryItems: LibItem[] = useMemo(() => {
    const items: LibItem[] = [
      // 1. Sources & Generators
      { type: COMPONENT_TYPES.AC_SOURCE_1PH, name: 'AC Voltage Source (1-Ph)', category: 'Sources & Generators', icon: '∿', desc: 'Thevenin / Ideal 1-Phase AC voltage source with configurable series impedance.', tags: ['source', 'grid', 'thevenin', 'ac', 'voltage'] },
      { type: COMPONENT_TYPES.AC_SOURCE_3PH, name: '3-Phase AC Grid Source', category: 'Sources & Generators', icon: '3~', desc: 'Balanced 3-Phase AC bulk power supply with positive and zero sequence impedance.', tags: ['source', 'grid', '3-phase', 'infinite bus'] },
      { type: COMPONENT_TYPES.DC_SOURCE, name: 'DC Voltage Source', category: 'Sources & Generators', icon: '⎓', desc: 'Ideal ripple-free DC power supply for converters, batteries and PV strings.', tags: ['dc', 'battery', 'pv', 'source'] },
      { type: COMPONENT_TYPES.SYNC_MACHINE_DQ, name: 'Park d-q-0 Synchronous Machine', category: 'Machines & Drives', icon: '⚙️', ansiCode: 'ANSI 87G', desc: '6th-order state-space synchronous generator with subtransient reactances and AVR.', tags: ['generator', 'dq0', 'park', 'synchronous', 'avr'] },
      { type: COMPONENT_TYPES.MULTI_MASS_SHAFT, name: 'Multi-Mass Torsional Shaft', category: 'Machines & Drives', icon: '🔩', desc: 'N-mass elastic mechanical shaft for Sub-Synchronous Resonance (SSR) torsional fatigue.', tags: ['ssr', 'shaft', 'turbine', 'torsional'] },
      { type: COMPONENT_TYPES.INDUCTION_MACHINE, name: 'Induction Machine (SCIM/WRIM)', category: 'Machines & Drives', icon: '🌀', desc: '4th-order squirrel cage or wound rotor induction motor with starting torque dynamics.', tags: ['motor', 'induction', 'scim', 'wrim'] },
      { type: COMPONENT_TYPES.DFIG_GENERATOR, name: 'DFIG Wind Turbine (Type 3)', category: 'Machines & Drives', icon: '🌬️', desc: 'Doubly-fed induction generator with Crowbar LVRT protection and rotor side control.', tags: ['wind', 'dfig', 'renewable', 'crowbar'] },
      { type: COMPONENT_TYPES.PMSG_GENERATOR, name: 'PMSG Wind Turbine (Type 4)', category: 'Machines & Drives', icon: '💨', desc: 'Permanent magnet synchronous generator with full-scale back-to-back converter.', tags: ['wind', 'pmsg', 'permanent magnet', 'renewable'] },

      // 2. Passive RLC
      { type: COMPONENT_TYPES.RESISTOR, name: 'Linear Resistor (R)', category: 'Passive RLC', icon: '〰️', desc: 'Ohmic resistance damping companion branch.', tags: ['resistor', 'r', 'damping'] },
      { type: COMPONENT_TYPES.INDUCTOR, name: 'Linear Inductor (L)', category: 'Passive RLC', icon: '➰', desc: 'EMT Trapezoidal companion model inductor with history current injection.', tags: ['inductor', 'l', 'reactor'] },
      { type: COMPONENT_TYPES.CAPACITOR, name: 'Linear Capacitor (C)', category: 'Passive RLC', icon: '⫣⫤', desc: 'EMT Trapezoidal companion model capacitor with history voltage calculation.', tags: ['capacitor', 'c', 'filter'] },
      { type: COMPONENT_TYPES.SERIES_RLC, name: 'Series RLC Branch', category: 'Passive RLC', icon: '🔲', desc: 'Lumped parameter series RLC impedance branch.', tags: ['rlc', 'branch', 'series'] },
      { type: COMPONENT_TYPES.GROUND, name: 'Ground (0V Reference)', category: 'Passive RLC', icon: '⏚', desc: 'Zero potential electrical earth reference node.', tags: ['ground', 'earth', '0v', 'gnd'] },
      { type: COMPONENT_TYPES.SURGE_ARRESTER, name: 'Surge Arrester (MOV)', category: 'Passive RLC', icon: '⚡', desc: 'Non-linear metal oxide varistor with dynamic energy absorption monitoring.', tags: ['mov', 'arrester', 'surge', 'lightning'] },

      // 3. Switches & Faults
      { type: COMPONENT_TYPES.BREAKER_1PH, name: '1-Phase Circuit Breaker', category: 'Switches & Faults', icon: '⏻', ansiCode: 'ANSI 52', desc: 'Timed or interactive controlled single-pole breaker with arc extinction.', tags: ['breaker', 'switch', '52'] },
      { type: COMPONENT_TYPES.BREAKER_3PH, name: '3-Phase Gang-Operated Breaker', category: 'Switches & Faults', icon: '⏻', ansiCode: 'ANSI 52', desc: '3-pole simultaneous or staggered tripping circuit breaker with point-on-wave closing.', tags: ['breaker', '3-phase', '52', 'trip'] },
      { type: COMPONENT_TYPES.FAULT_BLOCK, name: 'Timed Fault Block', category: 'Switches & Faults', icon: '💥', desc: 'Phase-to-ground, phase-to-phase, or symmetrical 3-phase short circuit fault with arc resistance.', tags: ['fault', 'short circuit', '3lg', 'slg'] },

      // 4. Transformers & Lines
      { type: COMPONENT_TYPES.TRANSFORMER_1PH, name: '2-Winding Transformer (1-Ph)', category: 'Transformers & Lines', icon: '🧲', desc: 'Single-phase saturable magnetic transformer with core loss resistance.', tags: ['transformer', 'xfmr', '2-winding'] },
      { type: COMPONENT_TYPES.TRANSFORMER_3PH, name: '3-Phase Power Transformer (Y-Δ)', category: 'Transformers & Lines', icon: '🧲', desc: '3-Phase substation transformer with selectable vector groups (Yg-D1, Yg-Yg, D-D).', tags: ['transformer', '3-phase', 'yd', 'substation'] },
      { type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH, name: 'UMEC 3-Limb Core Transformer', category: 'Transformers & Lines', icon: '🧲', desc: 'Unified Magnetic Equivalent Circuit (UMEC) with inter-phase magnetic cross-coupling.', tags: ['umec', 'transformer', '3-limb', 'reluctance'] },
      { type: COMPONENT_TYPES.JILES_ATHERTON_CORE, name: 'Jiles-Atherton Hysteresis Core', category: 'Transformers & Lines', icon: '🧲', desc: 'Ferromagnetic dynamic B-H hysteresis with domain pinning, remanent flux & inrush spikes.', tags: ['hysteresis', 'jiles-atherton', 'inrush', 'b-h'] },
      { type: COMPONENT_TYPES.OLTC_TRANSFORMER_3PH, name: 'Motorized OLTC Transformer', category: 'Transformers & Lines', icon: '🎛️', ansiCode: 'ANSI 90', desc: 'On-load tap changer with motorized transit delays and ANSI 90 closed-loop AVR regulator.', tags: ['oltc', 'tap changer', 'avr', '90'] },
      { type: COMPONENT_TYPES.STRAY_CAP_TRANSFORMER, name: 'HF Stray Capacitance Matrix', category: 'Transformers & Lines', icon: '⚡', desc: 'High-frequency winding-to-ground and inter-winding capacitance for SFRA Bode diagnostics.', tags: ['stray', 'capacitance', 'sfra', 'high frequency'] },
      { type: COMPONENT_TYPES.ZIGZAG_TRANSFORMER, name: 'Zig-Zag (Zn) Grounding Transformer', category: 'Transformers & Lines', icon: '🛡️', desc: 'Interconnected star neutral derivation with zero-sequence flux cancellation & NGR.', tags: ['zigzag', 'grounding', 'ngr', 'neutral'] },
      { type: COMPONENT_TYPES.PHASE_SHIFTER_PST, name: 'Quadrature Booster (PST)', category: 'Transformers & Lines', icon: '📡', desc: 'Phase shifting transformer for active power flow redirection via series quadrature injection.', tags: ['pst', 'phase shifter', 'quadrature booster'] },
      { type: COMPONENT_TYPES.PI_LINE, name: 'Pi-Section Transmission Line', category: 'Transformers & Lines', icon: '🗼', desc: 'Lumped parameter nominal Pi circuit for short transmission lines.', tags: ['line', 'pi', 'transmission'] },
      { type: COMPONENT_TYPES.BERGERON_LINE_1PH, name: 'Bergeron Traveling Wave Line (1-Ph)', category: 'Transformers & Lines', icon: '〰️', desc: 'Constant parameter distributed traveling wave model with surge impedance Zc and delay tau.', tags: ['bergeron', 'traveling wave', 'transmission'] },
      { type: COMPONENT_TYPES.BERGERON_LINE_3PH, name: 'Polyphase 3-Ph Coupled Line', category: 'Transformers & Lines', icon: '🗼', desc: 'Clarke modal decoupled 3-phase distributed traveling wave transmission line.', tags: ['bergeron', '3-phase', 'modal', 'clarke'] },
      { type: COMPONENT_TYPES.FD_PHASE_LINE, name: 'FD-Phase Frequency Dependent Line', category: 'Transformers & Lines', icon: '📈', desc: 'Vector fitted frequency-dependent line model with non-linear skin depth and ground return.', tags: ['fd-phase', 'frequency dependent', 'vector fitting'] },

      // 5. Power Electronics & FACTS
      { type: COMPONENT_TYPES.IDEAL_SWITCH, name: 'Ideal Controlled Switch', category: 'Power Electronics & FACTS', icon: '⏻', desc: 'Sub-step zero-crossing interpolated bi-directional ideal switch.', tags: ['switch', 'ideal', 'interpolated'] },
      { type: COMPONENT_TYPES.DIODE, name: 'Power Diode (Qrr / trr)', category: 'Power Electronics & FACTS', icon: '▷|', desc: 'Power semiconductor diode with forward voltage drop and reverse recovery charge dynamics.', tags: ['diode', 'qrr', 'trr', 'rectifier'] },
      { type: COMPONENT_TYPES.THYRISTOR, name: 'Line-Commutated Thyristor (SCR)', category: 'Power Electronics & FACTS', icon: '▷|⊣', desc: 'Phase-controlled thyristor with holding current, gate firing pulses and natural commutation.', tags: ['thyristor', 'scr', 'rectifier', 'hvdc'] },
      { type: COMPONENT_TYPES.IGBT_DIODE, name: 'IGBT + Freewheeling Diode', category: 'Power Electronics & FACTS', icon: '⚡', desc: 'High-frequency insulated-gate bipolar transistor with antiparallel freewheeling diode.', tags: ['igbt', 'inverter', 'vsc', 'pwm'] },
      { type: COMPONENT_TYPES.MMC_CONVERTER_3PH, name: 'MMC Converter (201-Level DEM)', category: 'Power Electronics & FACTS', icon: '📶', desc: 'Modular Multilevel Converter with 100+ SM/arm Detailed Equivalent Model and NLC balancing.', tags: ['mmc', 'hvdc', 'multilevel', 'vsc'] },
      { type: COMPONENT_TYPES.LCC_BRIDGE_6PULSE, name: '6-Pulse LCC Graetz Bridge', category: 'Power Electronics & FACTS', icon: '🔷', desc: '6-Thyristor bridge with alpha firing angle control for Classic HVDC stations.', tags: ['lcc', 'graetz', 'hvdc', '6-pulse'] },
      { type: COMPONENT_TYPES.LCC_BRIDGE_12PULSE, name: '12-Pulse LCC HVDC Bridge', category: 'Power Electronics & FACTS', icon: '🔶', desc: '12-Pulse Y-Y / Y-Δ series bridge with harmonic ripple cancellation.', tags: ['lcc', '12-pulse', 'hvdc', 'graetz'] },
      { type: COMPONENT_TYPES.STATCOM, name: 'STATCOM (Dynamic Var Support)', category: 'Power Electronics & FACTS', icon: '💠', desc: 'Static Synchronous Compensator with decoupled d-q current vector controller.', tags: ['statcom', 'facts', 'var', 'voltage control'] },
      { type: COMPONENT_TYPES.SVC, name: 'Static Var Compensator (TCR/TSC)', category: 'Power Electronics & FACTS', icon: '🔄', desc: 'Thyristor-controlled reactor and switched capacitor banks for fast reactive compensation.', tags: ['svc', 'tcr', 'tsc', 'facts'] },

      // 6. CSMF Controls
      { type: COMPONENT_TYPES.CSMF_CONSTANT, name: 'Constant Signal Source', category: 'Control Blocks (CSMF)', icon: '1️⃣', desc: 'Outputs fixed numeric control constant.', tags: ['constant', 'csmf', 'control'] },
      { type: COMPONENT_TYPES.CSMF_GAIN, name: 'Gain & Offset Block (K)', category: 'Control Blocks (CSMF)', icon: '✖️', desc: 'Linear scaling: y = K*u + b.', tags: ['gain', 'scale', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_SUM, name: 'Summation Block (Σ)', category: 'Control Blocks (CSMF)', icon: '➕', desc: 'Algebraic summer with configurable port signs (+, -).', tags: ['sum', 'summer', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_MULTIPLIER, name: 'Multiplier Block (✕)', category: 'Control Blocks (CSMF)', icon: '✖️', desc: 'Product of input signals: y = u1 * u2.', tags: ['multiplier', 'product', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_DIVIDER, name: 'Divider Block (÷)', category: 'Control Blocks (CSMF)', icon: '➗', desc: 'Quotient with zero-division clamping.', tags: ['divider', 'quotient', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_MATH_FUNC, name: 'Math Function f(u)', category: 'Control Blocks (CSMF)', icon: '📐', desc: 'sin, cos, tan, atan2, ln, exp, sqrt, abs, square, inv.', tags: ['math', 'trig', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_MIN_MAX, name: 'Min / Max Selector', category: 'Control Blocks (CSMF)', icon: '↕️', desc: 'Selects the minimum or maximum of input signals.', tags: ['min', 'max', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_INTEGRATOR, name: 'Integrator (1/s)', category: 'Control Blocks (CSMF)', icon: '∫', desc: 'Trapezoidal integrator with reset and saturation limits.', tags: ['integrator', '1/s', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_PID, name: 'PID Controller with Filter', category: 'Control Blocks (CSMF)', icon: '🎮', desc: 'PID controller with derivative low-pass filter and anti-windup clamping.', tags: ['pid', 'controller', 'pi', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_LOGIC_GATE, name: 'Logic Gate (AND/OR/NOT)', category: 'Control Blocks (CSMF)', icon: '🔀', desc: 'Combinatorial boolean logic (AND, OR, XOR, NOT, NAND, NOR).', tags: ['logic', 'and', 'or', 'gate', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_EDGE_DETECTOR, name: 'Edge Detector Pulse', category: 'Control Blocks (CSMF)', icon: '⚡', desc: 'Rising, falling or dual edge pulse detector.', tags: ['edge', 'pulse', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_FLIP_FLOP, name: 'Flip-Flop (RS / D)', category: 'Control Blocks (CSMF)', icon: '🔄', desc: 'Bistable multivibrator state storage latch.', tags: ['flip-flop', 'latch', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_COMPARATOR, name: 'Comparator / Schmitt Trigger', category: 'Control Blocks (CSMF)', icon: '⚖️', desc: 'Signal threshold comparator with hysteresis deadband.', tags: ['comparator', 'schmitt', 'csmf'] },
      { type: COMPONENT_TYPES.CSMF_LIMITER, name: 'Saturation Limiter', category: 'Control Blocks (CSMF)', icon: '🚧', desc: 'Clamps input signal strictly between minimum and maximum bounds.', tags: ['limiter', 'saturation', 'csmf'] },

      // 7. Meters & Probes
      { type: COMPONENT_TYPES.VOLTMETER, name: 'Voltmeter Probe (V)', category: 'Meters & Probes', icon: '⚡', desc: 'Line-to-ground or differential instantaneous voltage measurement.', tags: ['voltmeter', 'voltage', 'probe', 'meter'] },
      { type: COMPONENT_TYPES.AMMETER, name: 'Ammeter Sensor (I)', category: 'Meters & Probes', icon: '⚡', desc: 'Series branch current sensor.', tags: ['ammeter', 'current', 'sensor', 'meter'] },
      { type: COMPONENT_TYPES.MULTIMETER, name: '3-Phase PQ & RMS Multimeter', category: 'Meters & Probes', icon: '📊', desc: 'Measures 3-phase RMS voltages, currents, active P, reactive Q, and frequency.', tags: ['multimeter', 'rms', 'power', 'p-q', 'meter'] },
      { type: COMPONENT_TYPES.GRAPH_FRAME, name: 'Canvas Embedded Graph Frame', category: 'Meters & Probes', icon: '📈', desc: 'Resizable on-schematic oscilloscope frame for real-time live waveform visualization.', tags: ['graph', 'scope', 'waveform', 'frame', 'plot', 'oscilloscope'] },

      // 8. Runtime Controls
      { type: COMPONENT_TYPES.RUNTIME_SLIDER, name: 'Interactive Slider Knob', category: 'Runtime Controls', icon: '🎚️', desc: 'Draggable linear potentiometer modulating control signals in real-time during simulation.', tags: ['slider', 'knob', 'runtime', 'control'] },
      { type: COMPONENT_TYPES.RUNTIME_DIAL, name: 'Rotary Dial Knob', category: 'Runtime Controls', icon: '🎛️', desc: 'Rotary knob with sweeping angle indicator for dynamic parameter tuning.', tags: ['dial', 'knob', 'runtime', 'tuning'] },
      { type: COMPONENT_TYPES.RUNTIME_BUTTON, name: 'Tactile Push Button', category: 'Runtime Controls', icon: '🔘', desc: 'Momentary push button outputting 1.0 when held down.', tags: ['button', 'push', 'runtime'] },
      { type: COMPONENT_TYPES.RUNTIME_SWITCH, name: 'Bistable Toggle Switch', category: 'Runtime Controls', icon: '⏻', desc: 'ON/OFF toggle switch with green status LED.', tags: ['switch', 'toggle', 'runtime'] },
      { type: COMPONENT_TYPES.RUNTIME_GAUGE, name: 'Analog Meter Gauge', category: 'Runtime Controls', icon: '⏱️', desc: 'Circular analog meter with dynamic sweeping needle and colored alarm zones.', tags: ['gauge', 'meter', 'analog', 'runtime'] },
      { type: COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY, name: '7-Segment Digital Readout', category: 'Runtime Controls', icon: '📟', desc: 'Digital LED/LCD display showing formatted real-time signal values.', tags: ['display', 'digital', 'led', 'lcd'] },
    ];

    // Add registered Definitions
    customDefs.forEach((def) => {
      items.push({
        type: def.baseType || COMPONENT_TYPES.SUBMODULE,
        name: def.name,
        category: 'User Definitions',
        icon: def.category === 'custom' ? '✨' : '📦',
        desc: def.description || 'User-defined component definition.',
        definitionId: def.id,
        tags: ['definition', def.category, def.name.toLowerCase()],
      });
    });

    return items;
  }, [customDefs, customWorkshopComps]);

  const categories = [
    'ALL',
    'Sources & Generators',
    'Passive RLC',
    'Switches & Faults',
    'Transformers & Lines',
    'Power Electronics & FACTS',
    'Machines & Drives',
    'Control Blocks (CSMF)',
    'Meters & Probes',
    'Runtime Controls',
    'User Definitions',
  ];

  const filteredItems = useMemo(() => {
    return libraryItems.filter((item) => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchesCat) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.desc.toLowerCase().includes(q);
      const matchAnsi = item.ansiCode ? item.ansiCode.toLowerCase().includes(q) : false;
      const matchTags = item.tags.some((t) => t.includes(q));

      return matchName || matchDesc || matchAnsi || matchTags;
    });
  }, [libraryItems, selectedCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm select-none font-sans p-4 animate-in fade-in duration-150">
      <div className="w-[960px] max-w-full h-[680px] max-h-[90vh] bg-[#121722] border border-[#26354d] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-10 px-4 bg-[#182030] border-b border-[#26354d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#1f6feb] flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <span className="font-bold text-slate-100 text-sm">
              PSCAD Master Library Browser <span className="font-mono text-xs text-sky-400 font-normal">master.pslx</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#202c40] text-slate-400 font-mono">
              {filteredItems.length} components
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#253248] transition-colors"
            title="Close Master Library (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-[#151c2a] border-b border-[#26354d] flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search components by Name, Keyword, or ANSI Device Code (e.g. 52, 87G, Inverter, Bergeron, PID, UMEC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#0d121c] border border-[#2b3a52] rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#1f6feb] transition-colors font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1f6feb] text-white shadow-sm'
                    : 'bg-[#1e2738] text-slate-300 hover:bg-[#28354c] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Component Grid */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#0f1420] grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500 text-center">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-400">No matching components found</p>
              <p className="text-xs text-slate-500 mt-1">Try refining your search terms or select "ALL" categories.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={`${item.type}_${item.name}`}
                draggable={true}
                onDragStart={(e) => {
                  const payload = JSON.stringify({
                    type: item.type,
                    name: item.name,
                    customDefId: item.customDefId,
                    definitionId: item.definitionId,
                  });
                  e.dataTransfer.setData('application/pscad-component', payload);
                  e.dataTransfer.setData('text/plain', payload);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  onSelectComponent(item.type, item.customDefId, item.definitionId);
                  onClose();
                }}
                className="group relative p-3 bg-[#161d2b] border border-[#26354d] hover:border-[#388bfd] rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#1a2334] transition-all flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl w-7 h-7 rounded bg-[#101520] border border-[#2b3a52] flex items-center justify-center shrink-0">
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-[#58a6ff] transition-colors leading-tight">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                    </div>

                    {item.ansiCode && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                        {item.ansiCode}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#222e42] flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 opacity-75 group-hover:opacity-100 group-hover:text-sky-300 transition-colors">
                    <GripHorizontal className="w-3 h-3" />
                    Drag to canvas
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-white">
                    Click to place <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="h-9 px-4 bg-[#141a26] border-t border-[#26354d] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3 text-[11px]">
            <span>💡 <strong>Tip:</strong> Drag any component directly onto the schematic canvas, or click to enter stamping mode.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#202c40] hover:bg-[#2c3d59] text-slate-200 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
