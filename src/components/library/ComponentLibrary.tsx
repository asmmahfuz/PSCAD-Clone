import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Layers, Sparkles, Plus, ExternalLink } from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import { customComponentRegistry } from '../../engine/customComponents';
import { definitionRegistry } from '../../engine/definitions';

interface LibraryProps {
  onAddComp: (type: string, customDefId?: string, definitionId?: string) => void;
  onOpenComponentBuilder?: () => void;
  onOpenMasterLibrary?: () => void;
}

interface LibItem {
  type: string;
  name: string;
  icon: string;
  desc: string;
  customDefId?: string;
  definitionId?: string;
}

interface LibCategory {
  title: string;
  items: LibItem[];
}

export const ComponentLibrary: React.FC<LibraryProps> = ({ onAddComp, onOpenComponentBuilder, onOpenMasterLibrary }) => {
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    'Sources & Generators': true,
    'Passive RLC': true,
    'Switches & Faults': true,
    'Transformers & Lines': true,
    'Hierarchical Submodules': true,
    'Runtime Canvas Controls': true,
    '📦 Component Definitions': true,
    '🌟 Custom User Workshop': true,
  });

  const customComps = customComponentRegistry.getAllComponents();
  const defs = definitionRegistry.getAllDefinitions();

  const categories: LibCategory[] = [
    {
      title: 'Sources & Generators',
      items: [
        { type: COMPONENT_TYPES.AC_SOURCE_1PH, name: 'AC Voltage Source (1-Ph)', icon: '∿', desc: 'Thevenin/Ideal AC grid source' },
        { type: COMPONENT_TYPES.AC_SOURCE_3PH, name: '3-Phase AC Source', icon: '3~', desc: 'Balanced 3-Phase grid source' },
        { type: COMPONENT_TYPES.DC_SOURCE, name: 'DC Voltage Source', icon: '⎓', desc: 'Ideal DC voltage supply' },
        { type: COMPONENT_TYPES.SYNC_MACHINE_DQ, name: 'Park d-q-0 Synchronous Machine', icon: '⚙️', desc: '6th-order state-space machine with AVR and subtransient parameters' },
        { type: COMPONENT_TYPES.MULTI_MASS_SHAFT, name: 'Multi-Mass Torsional Shaft', icon: '🔩', desc: 'N-mass elastic shaft model for Sub-Synchronous Resonance (SSR)' },
        { type: COMPONENT_TYPES.INDUCTION_MACHINE, name: 'Induction Machine (SCIM/WRIM)', icon: '🌀', desc: '4th-order induction machine with DOL starting torque curve' },
        { type: COMPONENT_TYPES.DFIG_GENERATOR, name: 'DFIG Wind Turbine (Type 3)', icon: '🌬️', desc: 'Doubly-fed induction generator with Crowbar LVRT protection' },
        { type: COMPONENT_TYPES.PMSG_GENERATOR, name: 'PMSG Wind Turbine (Type 4)', icon: '💨', desc: 'Permanent magnet generator with full-scale back-to-back converter' },
      ],
    },
    {
      title: 'Passive RLC',
      items: [
        { type: COMPONENT_TYPES.RESISTOR, name: 'Resistor (R)', icon: '〰️', desc: 'Linear resistor' },
        { type: COMPONENT_TYPES.INDUCTOR, name: 'Inductor (L)', icon: '➰', desc: 'EMT companion inductor' },
        { type: COMPONENT_TYPES.CAPACITOR, name: 'Capacitor (C)', icon: '⫣⫤', desc: 'EMT companion capacitor' },
        { type: COMPONENT_TYPES.SERIES_RLC, name: 'Series RLC Branch', icon: '🔲', desc: 'Lumped series RLC' },
        { type: COMPONENT_TYPES.GROUND, name: 'Ground (0V Reference)', icon: '⏚', desc: 'Zero potential electrical earth' },
        { type: COMPONENT_TYPES.SURGE_ARRESTER, name: 'Surge Arrester (MOV)', icon: '⚡', desc: 'Non-linear metal oxide varistor with energy absorption monitoring' },
      ],
    },
    {
      title: 'Switches & Faults',
      items: [
        { type: COMPONENT_TYPES.BREAKER_1PH, name: '1-Phase Breaker', icon: '⏻', desc: 'Timed / interactive breaker' },
        { type: COMPONENT_TYPES.BREAKER_3PH, name: '3-Phase Breaker', icon: '⏻', desc: '3-pole gang-operated breaker' },
        { type: COMPONENT_TYPES.FAULT_BLOCK, name: 'Timed Fault Block', icon: '💥', desc: 'Phase-to-ground or 3-phase fault' },
      ],
    },
    {
      title: 'Transformers & Lines',
      items: [
        { type: COMPONENT_TYPES.TRANSFORMER_1PH, name: '2-Winding Transformer', icon: '🧲', desc: 'Transformer with core saturation' },
        { type: COMPONENT_TYPES.TRANSFORMER_3PH, name: '3-Phase Transformer (Y-Δ)', icon: '🧲', desc: 'Substation power transformer' },
        { type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH, name: 'UMEC 3-Limb Core Transformer', icon: '🧲', desc: 'Multi-limb reluctance core model with non-linear saturation' },
        { type: COMPONENT_TYPES.JILES_ATHERTON_CORE, name: 'Jiles-Atherton Hysteresis Transformer', icon: '🧲', desc: 'Ferromagnetic hysteresis with domain pinning, remanent flux & inrush' },
        { type: COMPONENT_TYPES.OLTC_TRANSFORMER_3PH, name: 'Motorized OLTC Transformer (AVR)', icon: '🎛️', desc: 'On-load tap changer with motorized transit and ANSI 90 voltage regulator' },
        { type: COMPONENT_TYPES.STRAY_CAP_TRANSFORMER, name: 'HF Stray Capacitance & Bushing Unit', icon: '⚡', desc: 'High-frequency stray matrix with C1/C2 bushings for SFRA & surge analysis' },
        { type: COMPONENT_TYPES.ZIGZAG_TRANSFORMER, name: 'Zig-Zag (Zn) Grounding Transformer', icon: '🛡️', desc: 'Interconnected star neutral derivation with zero-sequence flux cancellation' },
        { type: COMPONENT_TYPES.PHASE_SHIFTER_PST, name: 'Quadrature Booster Phase Shifter (PST)', icon: '📡', desc: 'Active power flow redirection via series quadrature voltage injection' },
        { type: COMPONENT_TYPES.PI_LINE, name: 'Pi-Section Transmission Line', icon: '🗼', desc: 'Distributed parameter Pi line' },
        { type: COMPONENT_TYPES.BERGERON_LINE_1PH, name: 'Bergeron Traveling Wave (1-Ph)', icon: '〰️', desc: 'Constant parameter distributed traveling wave line' },
        { type: COMPONENT_TYPES.BERGERON_LINE_3PH, name: 'Polyphase 3-Ph Coupled Line', icon: '🗼', desc: 'Clarke modal decoupled 3-phase line' },
        { type: COMPONENT_TYPES.FD_PHASE_LINE, name: 'FD-Phase Frequency Dependent', icon: '📈', desc: 'Vector fitted frequency-dependent line with dispersion' },
      ],

    },
    {
      title: 'Hierarchical Submodules',
      items: [
        { type: COMPONENT_TYPES.SUBMODULE, name: 'Hierarchical Submodule Block', icon: '📦', desc: 'Encapsulates a nested child schematic sheet with input/output interface ports' },
        { type: COMPONENT_TYPES.SUBMODULE_PORT_IN, name: 'Submodule Input Port', icon: '📥', desc: 'Input interface port connecting parent signal into child sheet' },
        { type: COMPONENT_TYPES.SUBMODULE_PORT_OUT, name: 'Submodule Output Port', icon: '📤', desc: 'Output interface port exporting child signal to parent block' },
        { type: COMPONENT_TYPES.SUBMODULE_PORT_ELECTRICAL, name: 'Submodule Electrical Port', icon: '⚡', desc: 'Bi-directional electrical terminal port' },
        { type: COMPONENT_TYPES.SUBMODULE_PORT_POLYPHASE, name: 'Submodule 3-Ph Port', icon: '🌐', desc: '3-Phase bundled polyphase terminal port' },
      ],
    },
    {
      title: 'Runtime Canvas Controls',
      items: [
        { type: COMPONENT_TYPES.RUNTIME_SLIDER, name: 'Interactive Slider Knob', icon: '🎚️', desc: 'Draggable linear slider modulating control signal in real-time' },
        { type: COMPONENT_TYPES.RUNTIME_DIAL, name: 'Rotary Dial Knob', icon: '🎛️', desc: '3D rotary potentiometer with angle indicator for live runtime tuning' },
        { type: COMPONENT_TYPES.RUNTIME_BUTTON, name: 'Momentary Push Button', icon: '🔘', desc: 'Tactile push button outputting 1.0 when held' },
        { type: COMPONENT_TYPES.RUNTIME_SWITCH, name: 'Toggle Switch (ON/OFF)', icon: '⏻', desc: 'Bistable toggle switch with green status LED' },
        { type: COMPONENT_TYPES.RUNTIME_GAUGE, name: 'Analog Meter Gauge', icon: '⏱️', desc: 'Circular analog meter with dynamic sweeping needle and color zones' },
        { type: COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY, name: 'Digital LED / LCD Display', icon: '📟', desc: '7-Segment digital readout for live voltage/current signals' },
      ],
    },
    {
      title: '📦 Component Definitions',
      items: defs.map((d) => ({
        type: d.baseType || COMPONENT_TYPES.SUBMODULE,
        name: d.name,
        icon: d.category === 'custom' ? '✨' : '📦',
        desc: d.description || 'Registered component definition',
        definitionId: d.id,
      })),
    },
    {
      title: '🌟 Custom User Workshop',
      items: customComps.map((c) => ({
        type: COMPONENT_TYPES.CUSTOM_USER_COMPONENT,
        name: c.name,
        icon: '✨',
        desc: c.description || 'User-designed custom scripted component',
        customDefId: c.id,
      })),
    },
    {
      title: 'Power Electronics & FACTS',
      items: [
        { type: COMPONENT_TYPES.IDEAL_SWITCH, name: 'Ideal Bi-Directional Switch', icon: '⏻', desc: 'Sub-step interpolated controlled switch' },
        { type: COMPONENT_TYPES.DIODE, name: 'Power Diode (Qrr / trr)', icon: '▷|', desc: 'Diode with forward drop and reverse recovery' },
        { type: COMPONENT_TYPES.THYRISTOR, name: 'Line-Commutated Thyristor (SCR)', icon: '▷|⊣', desc: 'Phase-controlled thyristor with holding current' },
        { type: COMPONENT_TYPES.IGBT_DIODE, name: 'IGBT + Freewheeling Diode', icon: '⚡', desc: 'High-speed IGBT with antiparallel diode' },
        { type: COMPONENT_TYPES.MMC_CONVERTER_3PH, name: 'MMC Converter (201-Level DEM)', icon: '📶', desc: '100+ SM/arm detailed equivalent model with NLC & balancing' },
        { type: COMPONENT_TYPES.LCC_BRIDGE_6PULSE, name: '6-Pulse LCC Graetz Bridge', icon: '🔷', desc: '6-Thyristor bridge with firing angle control' },
        { type: COMPONENT_TYPES.LCC_BRIDGE_12PULSE, name: '12-Pulse LCC HVDC Bridge', icon: '🔶', desc: '12-Pulse Y-Y / Y-Δ series bridge with ripple cancellation' },
        { type: COMPONENT_TYPES.STATCOM, name: 'STATCOM (Dynamic Var Support)', icon: '💠', desc: 'VSC with decoupled d-q current vector controller' },
        { type: COMPONENT_TYPES.SVC, name: 'Static Var Compensator (TCR/TSC)', icon: '🔄', desc: 'Thyristor-controlled reactor & switched capacitor banks' },
      ],
    },
    {
      title: 'Control Blocks (CSMF)',
      items: [
        { type: COMPONENT_TYPES.CSMF_CONSTANT, name: 'Constant Source', icon: '1️⃣', desc: 'Outputs fixed numeric constant' },
        { type: COMPONENT_TYPES.CSMF_GAIN, name: 'Gain Block (K)', icon: '✖️', desc: 'Linear gain and offset: y = K*u + b' },
        { type: COMPONENT_TYPES.CSMF_SUM, name: 'Summation Block (Σ)', icon: '➕', desc: 'Algebraic summer with configurable signs' },
        { type: COMPONENT_TYPES.CSMF_MULTIPLIER, name: 'Multiplier Block (✕)', icon: '✖️', desc: 'Product of input signals: y = u1 * u2' },
        { type: COMPONENT_TYPES.CSMF_DIVIDER, name: 'Divider Block (÷)', icon: '➗', desc: 'Quotient: y = u1 / u2 with zero protection' },
        { type: COMPONENT_TYPES.CSMF_MATH_FUNC, name: 'Math Function f(u)', icon: '📐', desc: 'sin, cos, tan, atan2, ln, exp, sqrt, abs' },
        { type: COMPONENT_TYPES.CSMF_MIN_MAX, name: 'Min / Max Selector', icon: '↕️', desc: 'Selects minimum or maximum signal' },
        { type: COMPONENT_TYPES.CSMF_INTEGRATOR, name: 'Integrator (1/s)', icon: '∫', desc: 'Trapezoidal integrator with reset and limits' },
        { type: COMPONENT_TYPES.CSMF_PID, name: 'PID Controller', icon: '🎮', desc: 'PID controller with derivative filter and tracking' },
        { type: COMPONENT_TYPES.CSMF_LOGIC_GATE, name: 'Logic Gate (AND/OR/NOT)', icon: '🔀', desc: 'AND, OR, XOR, NOT, NAND, NOR logic' },
        { type: COMPONENT_TYPES.CSMF_EDGE_DETECTOR, name: 'Edge Detector', icon: '⚡', desc: 'Rising/Falling edge pulse generator' },
        { type: COMPONENT_TYPES.CSMF_FLIP_FLOP, name: 'Flip-Flop (RS / D)', icon: '🔄', desc: 'Bistable multivibrator storage latch' },
        { type: COMPONENT_TYPES.CSMF_COMPARATOR, name: 'Comparator / Schmitt Trigger', icon: '⚖️', desc: 'Signal threshold comparator with hysteresis' },
        { type: COMPONENT_TYPES.CSMF_LIMITER, name: 'Saturation / Limiter', icon: '🚧', desc: 'Clamps signal between min and max bounds' },
        { type: COMPONENT_TYPES.CSMF_RATE_LIMITER, name: 'Slew Rate Limiter', icon: '📈', desc: 'Limits maximum dy/dt rate of change' },
        { type: COMPONENT_TYPES.CSMF_DEADBAND, name: 'Deadband Block', icon: '⏸️', desc: 'Zeroes out small signals around threshold' },
        { type: COMPONENT_TYPES.CSMF_HYSTERESIS, name: 'Hysteresis Relay', icon: '🔁', desc: 'Two-point hysteresis relay with state memory' },
        { type: COMPONENT_TYPES.CSMF_BACKLASH, name: 'Mechanical Backlash', icon: '🔩', desc: 'Simulates mechanical deadband and play' },
        { type: COMPONENT_TYPES.CSMF_LOOKUP_1D, name: '1D Look-Up Table (LUT)', icon: '📊', desc: 'Piecewise linear 1D interpolation' },
        { type: COMPONENT_TYPES.CSMF_LOOKUP_2D, name: '2D Look-Up Table (LUT)', icon: '📉', desc: 'Bilinear 2D table surface interpolation' },
        { type: COMPONENT_TYPES.CSMF_CLARKE, name: 'Clarke Transform (abc ➔ αβ0)', icon: '🌐', desc: '3-phase to 2-axis stationary frame' },
        { type: COMPONENT_TYPES.CSMF_PARK, name: 'Park Transform (αβ ➔ dq0)', icon: '🔄', desc: 'Stationary to rotating reference frame' },
        { type: COMPONENT_TYPES.CSMF_PLL, name: 'Phase-Locked Loop (SRF-PLL)', icon: '🎯', desc: 'Synchronous reference frame grid angle tracking' },
        { type: COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER, name: 'Symmetrical Sequence Analyzer', icon: '🔮', desc: 'Extracts dynamic V1, V2, V0 Fortescue components' },
        { type: COMPONENT_TYPES.CSMF_SPWM, name: 'Sinusoidal PWM (SPWM)', icon: '📶', desc: 'Carrier-comparison 3-phase PWM with deadtime' },
        { type: COMPONENT_TYPES.CSMF_SVPWM, name: 'Space Vector PWM (SVPWM)', icon: '🔷', desc: '7-Segment center-aligned space vector PWM' },
        { type: COMPONENT_TYPES.CSMF_FIRING_GEN_6PULSE, name: '6-Pulse Firing Unit', icon: '⚡', desc: 'Thyristor bridge firing pulse generator (alpha)' },
      ],
    },
    {
      title: 'Meters & Data Routing',
      items: [
        { type: COMPONENT_TYPES.VOLTMETER, name: 'Voltmeter (Node to GND)', icon: '📈', desc: 'Measures node voltage' },
        { type: COMPONENT_TYPES.AMMETER, name: 'Ammeter (Series Branch)', icon: '📉', desc: 'Series branch current probe' },
        { type: COMPONENT_TYPES.MULTIMETER, name: 'Multimeter (V, I, P)', icon: '📊', desc: 'Simultaneous V, I and Power' },
        { type: COMPONENT_TYPES.SIGNAL_PROBE, name: 'Signal Probe / Marker', icon: '🎯', desc: 'Telemetry recorder pin' },
        { type: COMPONENT_TYPES.BUSBAR_1PH, name: '1-Phase Busbar', icon: '➖', desc: 'Zero-impedance conductor' },
        { type: COMPONENT_TYPES.BUSBAR_3PH, name: '3-Phase Busbar', icon: '≡', desc: '3-phase rigid busbar' },
        { type: COMPONENT_TYPES.POLYPHASE_BUS_3PH, name: '3-Phase Polyphase Bus', icon: '|||', desc: 'Bundled single-line 3-phase bus' },
        { type: COMPONENT_TYPES.PHASE_SPLITTER_3PH, name: '3-Phase Splitter', icon: '🔀', desc: 'Breakout bundled 3Ph into A, B, C' },
        { type: COMPONENT_TYPES.PHASE_MERGER_3PH, name: '3-Phase Merger', icon: '🔁', desc: 'Bundles discrete A, B, C into single 3Ph wire' },
        { type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER, name: 'Wireless Transmitter <Sig>', icon: '📡', desc: 'Broadcasts control signal wirelessly' },
        { type: COMPONENT_TYPES.DATA_LABEL_RECEIVER, name: 'Wireless Receiver [Sig]', icon: '📻', desc: 'Receives global wireless signal' },
      ],
    },
    {
      title: '🛡️ Protection Relays & ANSI Suite',
      items: [
        { type: COMPONENT_TYPES.RELAY_OVERCURRENT_50_51, name: 'ANSI 50/51/67 Overcurrent Relay', icon: '⏱️', desc: 'IEEE C37.112 / IEC 60255-151 TCC curves with disk reset' },
        { type: COMPONENT_TYPES.RELAY_DISTANCE_21, name: 'ANSI 21 Distance Relay (Mho / Quad)', icon: '📐', desc: '6-loop distance protection with Zone 1/2/3 reach' },
        { type: COMPONENT_TYPES.RELAY_DIFFERENTIAL_87, name: 'ANSI 87T/87L Differential Relay', icon: '⚖️', desc: 'Dual-slope percentage restraint with 2nd/5th harmonic block' },
        { type: COMPONENT_TYPES.RELAY_FREQ_ROCOF_81, name: 'ANSI 81O/81U & 81R (ROCOF)', icon: '📈', desc: 'Multi-stage under/over frequency and df/dt rate of change' },
        { type: COMPONENT_TYPES.RELAY_LOSS_OF_FIELD_40, name: 'ANSI 40 Loss of Field (LOE)', icon: '🧲', desc: 'Generator loss of excitation dual offset-mho relay' },
        { type: COMPONENT_TYPES.RELAY_OUT_OF_STEP_78, name: 'ANSI 78 Out-of-Step / Power Swing', icon: '🌀', desc: 'Double-blinder power swing blocking (PSB) & OST tripping' },
        { type: COMPONENT_TYPES.CURRENT_TRANSFORMER_CT, name: 'Current Transformer (CT)', icon: '🔄', desc: 'Non-linear core saturation with remanence flux & burden' },
        { type: COMPONENT_TYPES.VOLTAGE_TRANSFORMER_VT, name: 'Voltage Transformer (VT/PT)', icon: '⚡', desc: 'Potential transformer with ratio correction & burden' },
      ],
    },
    {
      title: '🎮 IEEE Controls, Exciters & Governors',
      items: [
        { type: COMPONENT_TYPES.CSMF_TRANSFER_FUNCTION_S, name: 's-Domain Transfer Function H(s)', icon: '➗', desc: 'Arbitrary continuous polynomial rational transfer function via Tustin' },
        { type: COMPONENT_TYPES.CSMF_FILTER_Z, name: 'z-Domain Filter H(z)', icon: '🔢', desc: 'Direct digital discrete polynomial difference equation filter' },
        { type: COMPONENT_TYPES.GOV_IEEEG1, name: 'IEEEG1 Steam Turbine Governor', icon: '💨', desc: 'General-purpose steam turbine governor with HP/IP/LP reheat stages' },
        { type: COMPONENT_TYPES.GOV_HYGOV, name: 'HYGOV Hydro Turbine Governor', icon: '💧', desc: 'Hydro turbine with water column inertia Tw & gate limits' },
        { type: COMPONENT_TYPES.GOV_GAST, name: 'GAST Gas Turbine Governor', icon: '🔥', desc: 'Gas turbine with exhaust temperature radiation limiter' },
        { type: COMPONENT_TYPES.GOV_DEGOV, name: 'DEGOV Diesel Engine Governor', icon: '🚜', desc: 'Diesel speed governor with mechanical actuator & transport lag' },
        { type: COMPONENT_TYPES.AVR_AC1A, name: 'IEEE AC1A Excitation & AVR', icon: '⚡', desc: 'Alternator-rectifier excitation system with non-linear saturation' },
        { type: COMPONENT_TYPES.AVR_DC1A, name: 'IEEE DC1A Commutator Exciter', icon: '🎛️', desc: 'DC commutator exciter with saturation & rate feedback' },
        { type: COMPONENT_TYPES.AVR_ST1A, name: 'IEEE ST1A Static Exciter', icon: '🔌', desc: 'High-initial response static thyristor exciter with ceiling' },
        { type: COMPONENT_TYPES.PSS_PSS1A, name: 'IEEE PSS1A Stabilizer', icon: '🎯', desc: 'Single-input PSS with washout, lead-lag & SSR notch filter' },
        { type: COMPONENT_TYPES.PSS_PSS2B, name: 'IEEE PSS2B Accelerating Power PSS', icon: '⚖️', desc: 'Dual-input accelerating power stabilizer Pa = Pm - Pe' },
        { type: COMPONENT_TYPES.WIND_TURBINE_AERO, name: 'Wind Turbine Aerodynamics & Pitch', icon: '🌬️', desc: '2D Cp(lambda, beta) aerodynamics with hydraulic pitch regulation' },
      ],
    },
  ];

  const toggleCat = (title: string) => {
    setOpenCats((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          it.desc.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0 || cat.title === '🌟 Custom User Workshop');

  return (
    <div className="flex flex-col h-full bg-[#161b26] border-r border-[#263147] select-none text-[11px] font-sans">
      {/* Header */}
      <div className="h-6 px-2 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between shrink-0">
        <span className="font-semibold text-slate-200 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          Master Library
        </span>
        <div className="flex items-center gap-1">
          {onOpenMasterLibrary && (
            <button
              onClick={onOpenMasterLibrary}
              title="Open Master Library Browser Pop-out"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-sky-900/50 hover:bg-sky-800 text-sky-200 border border-sky-600/40 rounded font-medium text-[9px] transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5 text-sky-300" />
              <span>Browser</span>
            </button>
          )}
          {onOpenComponentBuilder && (
            <button
              onClick={onOpenComponentBuilder}
              title="Open Custom Component Workshop"
              className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50 rounded font-medium text-[9px] transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
              <span>Workshop</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-1 px-1.5 border-b border-[#263147] shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search components or drag to canvas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-6 pr-2 py-0.5 bg-[#0f131c] border border-[#263147] rounded text-slate-200 placeholder-slate-500 text-[11px] h-6 leading-tight focus:outline-none focus:border-[#388bfd]"
          />
        </div>
      </div>

      {/* Category Tree */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {filteredCategories.map((cat) => (
          <div key={cat.title} className="mb-0.5">
            <button
              onClick={() => toggleCat(cat.title)}
              className="w-full flex items-center justify-between px-1.5 py-0.5 text-slate-300 hover:bg-[#1c2333] rounded transition-colors font-medium text-left text-[11px] leading-tight"
            >
              <div className="flex items-center gap-1">
                {openCats[cat.title] ? (
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span>{cat.title}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">({cat.items.length})</span>
            </button>

            {openCats[cat.title] && (
              <div className="pl-2 pr-0.5 py-0.5 space-y-0.5">
                {cat.title === '🌟 Custom User Workshop' && onOpenComponentBuilder && (
                  <button
                    onClick={onOpenComponentBuilder}
                    className="w-full flex items-center justify-center gap-1 py-1 mb-0.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded text-purple-300 font-medium text-[10px] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-purple-400" />
                    <span>Create New Component...</span>
                  </button>
                )}

                {cat.items.map((item, idx) => (
                  <div
                    key={`${item.type}_${item.customDefId || item.definitionId || idx}`}
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
                    onClick={() => onAddComp(item.type, item.customDefId, item.definitionId)}
                    title={`${item.desc}\n(Click to stamp, or drag onto canvas)`}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-grab active:cursor-grabbing transition-colors group text-[11px] leading-tight"
                  >
                    <span className="w-3.5 text-center text-xs shrink-0 select-none">{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
