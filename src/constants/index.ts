/**
 * PSCAD Modern - Constants and Color Palettes
 */

export const THEMES = {
  DARK: 'dark' as const,
  LIGHT: 'light' as const,
  BLUEPRINT: 'blueprint' as const,
};

export const COMPONENT_TYPES = {
  // Sources
  AC_SOURCE_1PH: 'ac_source_1ph',
  AC_SOURCE_3PH: 'ac_source_3ph',
  DC_SOURCE: 'dc_source',
  
  // Passives
  RESISTOR: 'resistor',
  INDUCTOR: 'inductor',
  CAPACITOR: 'capacitor',
  SERIES_RLC: 'series_rlc',
  GROUND: 'ground',
  SURGE_ARRESTER: 'surge_arrester',
  
  // Switches & Faults
  BREAKER_1PH: 'breaker_1ph',
  BREAKER_3PH: 'breaker_3ph',
  FAULT_BLOCK: 'fault_block',
  TIMED_SWITCH: 'timed_switch',
  
  // Transformers & Lines
  TRANSFORMER_1PH: 'transformer_1ph',
  TRANSFORMER_3PH: 'transformer_3ph',
  UMEC_TRANSFORMER_3PH: 'umec_transformer_3ph',
  JILES_ATHERTON_CORE: 'jiles_atherton_core',
  OLTC_TRANSFORMER_3PH: 'oltc_transformer_3ph',
  STRAY_CAP_TRANSFORMER: 'stray_cap_transformer',
  ZIGZAG_TRANSFORMER: 'zigzag_transformer',
  PHASE_SHIFTER_PST: 'phase_shifter_pst',
  PI_LINE: 'pi_line',
  BERGERON_LINE_1PH: 'bergeron_line_1ph',
  BERGERON_LINE_3PH: 'bergeron_line_3ph',
  FD_PHASE_LINE: 'fd_phase_line',

  
  // Power Electronics & Machines
  IDEAL_SWITCH: 'ideal_switch',
  DIODE: 'diode',
  THYRISTOR: 'thyristor',
  IGBT_DIODE: 'igbt_diode',
  MMC_CONVERTER_3PH: 'mmc_converter_3ph',
  LCC_BRIDGE_6PULSE: 'lcc_bridge_6pulse',
  LCC_BRIDGE_12PULSE: 'lcc_bridge_12pulse',
  STATCOM: 'statcom',
  SVC: 'svc',
  SYNC_GENERATOR: 'sync_generator',
  SYNC_MACHINE_DQ: 'sync_machine_dq',
  MULTI_MASS_SHAFT: 'multi_mass_shaft',
  INDUCTION_MACHINE: 'induction_machine',
  DFIG_GENERATOR: 'dfig_generator',
  PMSG_GENERATOR: 'pmsg_generator',
  
  // Wireless Data Labels & Bus Routing (Phase 5)
  DATA_LABEL_TRANSMITTER: 'data_label_transmitter',
  DATA_LABEL_RECEIVER: 'data_label_receiver',
  POLYPHASE_BUS_3PH: 'polyphase_bus_3ph',
  PHASE_SPLITTER_3PH: 'phase_splitter_3ph',
  PHASE_MERGER_3PH: 'phase_merger_3ph',

  // Control Blocks (CSMF - Phase 5)
  CSMF_CONSTANT: 'csmf_constant',
  CSMF_GAIN: 'csmf_gain',
  CSMF_INTEGRATOR: 'csmf_integrator',
  CSMF_PID: 'csmf_pid',
  CSMF_SUM: 'csmf_sum',
  CSMF_MULTIPLIER: 'csmf_multiplier',
  CSMF_DIVIDER: 'csmf_divider',
  CSMF_MATH_FUNC: 'csmf_math_func',
  CSMF_MIN_MAX: 'csmf_min_max',
  CSMF_LOGIC_GATE: 'csmf_logic_gate',
  CSMF_EDGE_DETECTOR: 'csmf_edge_detector',
  CSMF_FLIP_FLOP: 'csmf_flip_flop',
  CSMF_COMPARATOR: 'csmf_comparator',
  CSMF_LIMITER: 'csmf_limiter',
  CSMF_RATE_LIMITER: 'csmf_rate_limiter',
  CSMF_DEADBAND: 'csmf_deadband',
  CSMF_HYSTERESIS: 'csmf_hysteresis',
  CSMF_BACKLASH: 'csmf_backlash',
  CSMF_LOOKUP_1D: 'csmf_lookup_1d',
  CSMF_LOOKUP_2D: 'csmf_lookup_2d',
  CSMF_CLARKE: 'csmf_clarke',
  CSMF_PARK: 'csmf_park',
  CSMF_SEQUENCE_ANALYZER: 'csmf_sequence_analyzer',
  CSMF_PLL: 'csmf_pll',
  CSMF_SPWM: 'csmf_spwm',
  CSMF_SVPWM: 'csmf_svpwm',
  CSMF_FIRING_GEN_6PULSE: 'csmf_firing_gen_6pulse',
  
  // Meters & Probes
  // Meters & Probes & Graph Frames
  VOLTMETER: 'voltmeter',
  AMMETER: 'ammeter',
  MULTIMETER: 'multimeter',
  SIGNAL_PROBE: 'signal_probe',
  GRAPH_FRAME: 'graph_frame',
  
  // Busbars
  BUSBAR_1PH: 'busbar_1ph',
  BUSBAR_3PH: 'busbar_3ph',

  // Hierarchical Submodules (Phase 6)
  SUBMODULE: 'submodule',
  SUBMODULE_PORT_IN: 'submodule_port_in',
  SUBMODULE_PORT_OUT: 'submodule_port_out',
  SUBMODULE_PORT_ELECTRICAL: 'submodule_port_electrical',
  SUBMODULE_PORT_POLYPHASE: 'submodule_port_polyphase',

  // Interactive Runtime Controls (Phase 6)
  RUNTIME_SLIDER: 'runtime_slider',
  RUNTIME_DIAL: 'runtime_dial',
  RUNTIME_BUTTON: 'runtime_button',
  RUNTIME_SWITCH: 'runtime_switch',
  RUNTIME_GAUGE: 'runtime_gauge',
  RUNTIME_DIGITAL_DISPLAY: 'runtime_digital_display',

  // Custom User Component Workshop (Phase 6)
  CUSTOM_USER_COMPONENT: 'custom_user_component',

  // Protection & ANSI Relay Suite (Phase 11)
  RELAY_OVERCURRENT_50_51: 'relay_overcurrent_50_51',
  RELAY_DISTANCE_21: 'relay_distance_21',
  RELAY_DIFFERENTIAL_87: 'relay_differential_87',
  RELAY_FREQ_ROCOF_81: 'relay_freq_rocof_81',
  RELAY_LOSS_OF_FIELD_40: 'relay_loss_of_field_40',
  RELAY_OUT_OF_STEP_78: 'relay_out_of_step_78',
  CURRENT_TRANSFORMER_CT: 'current_transformer_ct',
  VOLTAGE_TRANSFORMER_VT: 'voltage_transformer_vt',

  // IEEE Control Systems & Dynamic Regulators (Phase 12)
  CSMF_TRANSFER_FUNCTION_S: 'csmf_transfer_function_s',
  CSMF_FILTER_Z: 'csmf_filter_z',
  GOV_IEEEG1: 'gov_ieeeg1',
  GOV_HYGOV: 'gov_hygov',
  GOV_GAST: 'gov_gast',
  GOV_DEGOV: 'gov_degov',
  AVR_AC1A: 'avr_ac1a',
  AVR_DC1A: 'avr_dc1a',
  AVR_ST1A: 'avr_st1a',
  PSS_PSS1A: 'pss_pss1a',
  PSS_PSS2B: 'pss_pss2b',
  WIND_TURBINE_AERO: 'wind_turbine_aero',
};

export const COLOR_PALETTES = {
  DARK: {
    bg: '#10141d',
    panelBg: '#161b26',
    canvasBg: '#0c0f17',
    gridDot: '#252d3d',
    componentBody: '#1e2533',
    componentStroke: '#61afef',
    componentText: '#e6edf3',
    wireNormal: '#4fc1ff',
    wireControl: '#10b981',
    wirePolyphase: '#38bdf8',
    wireActive: '#00e676',
    selection: '#388bfd',
    pinHover: '#ff9800',
    pinConnected: '#238636',
    pinUnconnected: '#da3633',
    pinControl: '#10b981',
    pinPolyphase: '#00e5ff',
  },
  LIGHT: {
    bg: '#f1f5f9',
    panelBg: '#ffffff',
    canvasBg: '#ffffff',
    gridDot: '#cbd5e1',
    componentBody: '#f8fafc',
    componentStroke: '#0284c7',
    componentText: '#0f172a',
    wireNormal: '#0284c7',
    wireControl: '#059669',
    wirePolyphase: '#0284c7',
    wireActive: '#16a34a',
    selection: '#0284c7',
    pinHover: '#ea580c',
    pinConnected: '#16a34a',
    pinUnconnected: '#dc2626',
    pinControl: '#059669',
    pinPolyphase: '#0284c7',
  },
  BLUEPRINT: {
    bg: '#081324',
    panelBg: '#0d1e38',
    canvasBg: '#060e1c',
    gridDot: '#1d3d6e',
    componentBody: '#0d2240',
    componentStroke: '#64ffda',
    componentText: '#e2f1ff',
    wireNormal: '#00ffff',
    wireControl: '#69f0ae',
    wirePolyphase: '#80d8ff',
    wireActive: '#64ffda',
    selection: '#64ffda',
    pinHover: '#ffa657',
    pinConnected: '#64ffda',
    pinUnconnected: '#ff5964',
    pinControl: '#69f0ae',
    pinPolyphase: '#80d8ff',
  },
};

export const WAVEFORM_COLORS = [
  '#00e5ff', // Cyan
  '#ff4081', // Pink
  '#ffeb3b', // Yellow
  '#00e676', // Bright Green
  '#ff9100', // Orange
  '#7c4dff', // Purple
  '#e040fb', // Magenta
  '#69f0ae', // Mint
  '#ff5252', // Red
  '#40c4ff', // Light Blue
];
