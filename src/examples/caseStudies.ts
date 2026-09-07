/**
 * PSCAD CLONE - Benchmark Industrial Power System Case Studies (TypeScript)
 */

import { COMPONENT_TYPES } from '../constants';
import type { CircuitProject } from '../types';
import { BENCHMARK_REAL_CIRCUITS } from './benchmarkRealCircuits';

export const CASE_STUDIES: Record<string, CircuitProject & { category: string; description: string }> = {
  ...BENCHMARK_REAL_CIRCUITS,
  TRANSMISSION_FAULT: {
    name: '3Ph_Line_Fault_Study',
    category: 'Transmission & Protection',
    description: '230 kV 3-phase grid feeding a 100 km transmission line. A single line-to-ground (SLG-A) fault occurs at t=0.10s. The 3-phase breaker trips at t=0.15s, clearing the fault, and attempts auto-reclosure at t=0.35s.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      {
        id: 'c_src3ph',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 240,
        rotation: 0,
        name: 'Grid_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 0.1, rampTime: 0.015 }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 320,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_vm_src',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 180,
        y: 100,
        rotation: 0,
        name: 'V_Send_PhaseA',
        params: { signalName: 'V_Send_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm_src',
        type: COMPONENT_TYPES.GROUND,
        x: 180,
        y: 155,
        rotation: 0,
        name: 'GND_VMSrc',
        params: {}
      },
      {
        id: 'c_brk3ph',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 280,
        y: 220,
        rotation: 0,
        name: 'Breaker_Main',
        params: { initClosed: true, openTime: 0.15, closeTime: 0.35, Ron: 0.001 }
      },
      {
        id: 'c_am_line',
        type: COMPONENT_TYPES.AMMETER,
        x: 380,
        y: 200,
        rotation: 0,
        name: 'I_Line_PhaseA',
        params: { signalName: 'I_Line_PhaseA', unit: 'A', monitored: true }
      },
      {
        id: 'c_tline',
        type: COMPONENT_TYPES.BERGERON_LINE_3PH,
        x: 500,
        y: 220,
        rotation: 0,
        name: 'Line_100km',
        params: { lengthKm: 100, R_per_km: 0.03, L_per_km: 0.001, C_per_km: 0.012e-6 }
      },
      {
        id: 'c_fault',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 650,
        y: 220,
        rotation: 0,
        name: 'Fault_BusB',
        params: { faultType: 'SLG_A', startTime: 0.10, duration: 0.08, faultResistance: 0.01 }
      },
      {
        id: 'c_gnd_fault',
        type: COMPONENT_TYPES.GROUND,
        x: 710,
        y: 260,
        rotation: 0,
        name: 'GND_Fault',
        params: {}
      },
      {
        id: 'c_vm_recv',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 700,
        y: 100,
        rotation: 0,
        name: 'V_Load_PhaseA',
        params: { signalName: 'V_Load_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm_recv',
        type: COMPONENT_TYPES.GROUND,
        x: 700,
        y: 155,
        rotation: 0,
        name: 'GND_VMRecv',
        params: {}
      },
      {
        id: 'c_load_ra',
        type: COMPONENT_TYPES.RESISTOR,
        x: 760,
        y: 260,
        rotation: 90,
        name: 'R_Load_A',
        params: { resistance: 50.0, monitored: true }
      },
      {
        id: 'c_load_rb',
        type: COMPONENT_TYPES.RESISTOR,
        x: 810,
        y: 260,
        rotation: 90,
        name: 'R_Load_B',
        params: { resistance: 50.0, monitored: true }
      },
      {
        id: 'c_load_rc',
        type: COMPONENT_TYPES.RESISTOR,
        x: 860,
        y: 260,
        rotation: 90,
        name: 'R_Load_C',
        params: { resistance: 50.0, monitored: true }
      },
      {
        id: 'c_gnd_load',
        type: COMPONENT_TYPES.GROUND,
        x: 810,
        y: 340,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_graph_frame1',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 920,
        y: 100,
        rotation: 0,
        name: 'MultiTrace_Telemetry_Frame',
        params: {
          graphTitle: 'Telemetry Overlay: V_Send, V_Load & I_Line',
          graphWidth: 440,
          graphHeight: 250,
          graphSignals: ['V_Send_PhaseA', 'V_Load_PhaseA', 'I_Line_PhaseA'],
          traces: [
            {
              id: 'tr_v_send',
              signalName: 'V_Send_PhaseA',
              probeId: 'c_vm_src',
              probeType: 'voltmeter',
              label: 'V_Send_A',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
            },
            {
              id: 'tr_v_load',
              signalName: 'V_Load_PhaseA',
              probeId: 'c_vm_recv',
              probeType: 'voltmeter',
              label: 'V_Load_A',
              unit: 'V',
              color: '#ff4081',
              visible: true,
            },
            {
              id: 'tr_i_line',
              signalName: 'I_Line_PhaseA',
              probeId: 'c_am_line',
              probeType: 'ammeter',
              label: 'I_Line_A',
              unit: 'A',
              color: '#ffeb3b',
              visible: true,
            },
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
        }
      }
    ],
    wires: [
      // Neutral to Ground
      { id: 'w_src_pn_gnd', startPin: 'c_src3ph_pn', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 280 }, { x: 120, y: 300 }] },
      
      // Sending Voltmeter
      { id: 'w_vm_src_tap', startPin: 'c_src3ph_pa', endPin: 'c_vm_src_p1', points: [{ x: 100, y: 200 }, { x: 180, y: 200 }, { x: 180, y: 65 }] },
      { id: 'w_vm_src_gnd', startPin: 'c_vm_src_p2', endPin: 'c_gnd_vm_src_p1', points: [{ x: 180, y: 135 }, { x: 180, y: 135 }] },

      // Source to Breaker (Phase A, B, C)
      { id: 'w_src_brk_a', startPin: 'c_src3ph_pa', endPin: 'c_brk3ph_pa1', points: [{ x: 100, y: 200 }, { x: 240, y: 200 }] },
      { id: 'w_src_brk_b', startPin: 'c_src3ph_pb', endPin: 'c_brk3ph_pb1', points: [{ x: 120, y: 200 }, { x: 120, y: 220 }, { x: 240, y: 220 }] },
      { id: 'w_src_brk_c', startPin: 'c_src3ph_pc', endPin: 'c_brk3ph_pc1', points: [{ x: 140, y: 200 }, { x: 140, y: 240 }, { x: 240, y: 240 }] },

      // Breaker to Ammeter (Phase A) & Line (Phases B, C)
      { id: 'w_brk_am_a', startPin: 'c_brk3ph_pa2', endPin: 'c_am_line_p1', points: [{ x: 320, y: 200 }, { x: 345, y: 200 }] },
      { id: 'w_am_line_a', startPin: 'c_am_line_p2', endPin: 'c_tline_pa1', points: [{ x: 415, y: 200 }, { x: 455, y: 200 }] },
      { id: 'w_brk_line_b', startPin: 'c_brk3ph_pb2', endPin: 'c_tline_pb1', points: [{ x: 320, y: 220 }, { x: 455, y: 220 }] },
      { id: 'w_brk_line_c', startPin: 'c_brk3ph_pc2', endPin: 'c_tline_pc1', points: [{ x: 320, y: 240 }, { x: 455, y: 240 }] },

      // Line to Fault Block (Phases A, B, C)
      { id: 'w_line_fault_a', startPin: 'c_tline_pa2', endPin: 'c_fault_pa', points: [{ x: 545, y: 200 }, { x: 580, y: 200 }, { x: 580, y: 205 }, { x: 610, y: 205 }] },
      { id: 'w_line_fault_b', startPin: 'c_tline_pb2', endPin: 'c_fault_pb', points: [{ x: 545, y: 220 }, { x: 610, y: 220 }] },
      { id: 'w_line_fault_c', startPin: 'c_tline_pc2', endPin: 'c_fault_pc', points: [{ x: 545, y: 240 }, { x: 580, y: 240 }, { x: 580, y: 235 }, { x: 610, y: 235 }] },
      { id: 'w_fault_gnd', startPin: 'c_fault_pg', endPin: 'c_gnd_fault_p1', points: [{ x: 690, y: 220 }, { x: 710, y: 220 }, { x: 710, y: 240 }] },

      // Receiving Voltmeter (Phase A to Ground)
      { id: 'w_vm_recv_tap', startPin: 'c_fault_pa', endPin: 'c_vm_recv_p1', points: [{ x: 610, y: 205 }, { x: 700, y: 205 }, { x: 700, y: 65 }] },
      { id: 'w_vm_recv_gnd', startPin: 'c_vm_recv_p2', endPin: 'c_gnd_vm_recv_p1', points: [{ x: 700, y: 135 }, { x: 700, y: 135 }] },

      // Fault Bus to 3-Phase Wye Load
      { id: 'w_bus_load_a', startPin: 'c_fault_pa', endPin: 'c_load_ra_p1', points: [{ x: 610, y: 205 }, { x: 760, y: 205 }, { x: 760, y: 220 }] },
      { id: 'w_bus_load_b', startPin: 'c_fault_pb', endPin: 'c_load_rb_p1', points: [{ x: 610, y: 220 }, { x: 810, y: 220 }] },
      { id: 'w_bus_load_c', startPin: 'c_fault_pc', endPin: 'c_load_rc_p1', points: [{ x: 610, y: 235 }, { x: 860, y: 235 }, { x: 860, y: 220 }] },

      // Wye Neutral to Ground
      { id: 'w_load_na', startPin: 'c_load_ra_p2', endPin: 'c_gnd_load_p1', points: [{ x: 760, y: 300 }, { x: 810, y: 300 }, { x: 810, y: 320 }] },
      { id: 'w_load_nb', startPin: 'c_load_rb_p2', endPin: 'c_gnd_load_p1', points: [{ x: 810, y: 300 }, { x: 810, y: 320 }] },
      { id: 'w_load_nc', startPin: 'c_load_rc_p2', endPin: 'c_gnd_load_p1', points: [{ x: 860, y: 300 }, { x: 810, y: 300 }, { x: 810, y: 320 }] }
    ],
    sheets: {
      root: {
        id: 'root',
        name: 'Main Schematic',
        parentSheetId: null,
        parentComponentId: null,
        components: [],
        wires: [],
      }
    }
  },

  HIERARCHICAL_PROTECTION: {
    name: 'Hierarchical_Protection_Study',
    category: 'Protection & Relays',
    description: 'Hierarchical multi-sheet substation protection scheme testing inter-sheet wireless data label signal transmission (<Fault_Sig> -> [Fault_Sig]), submodule signal scoping, and remote breaker lockout trip logic.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      {
        id: 'c_tx_fault',
        type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
        x: 620,
        y: 80,
        rotation: 0,
        name: 'Tx_Fault_Trigger',
        params: { signalName: 'Fault_Sig' }
      },
      {
        id: 'c_rx_trip',
        type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
        x: 270,
        y: 80,
        rotation: 0,
        name: 'Rx_Breaker_Trip',
        params: { signalName: 'Fault_Sig' }
      },
      {
        id: 'c_probe_fault',
        type: COMPONENT_TYPES.SIGNAL_PROBE,
        x: 450,
        y: 80,
        rotation: 0,
        name: 'Probe_Fault_Status',
        params: { signalName: 'Fault_Sig', monitored: true }
      },
      {
        id: 'c_submod_prot',
        type: COMPONENT_TYPES.SUBMODULE,
        x: 450,
        y: 300,
        rotation: 0,
        name: 'Substation_Protection',
        params: { childSheetId: 'sheet_protection' }
      }
    ],
    wires: [],
    sheets: {
      root: {
        id: 'root',
        name: 'Main Schematic',
        parentSheetId: null,
        parentComponentId: null,
        components: [],
        wires: [],
      },
      sheet_protection: {
        id: 'sheet_protection',
        name: 'Substation Protection',
        parentSheetId: 'root',
        parentComponentId: 'c_submod_prot',
        components: [
          {
            id: 'c_rx_prot_sub',
            type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
            x: 240,
            y: 160,
            rotation: 0,
            name: 'Rx_Sub_Protection',
            params: { signalName: 'Fault_Sig' }
          },
          {
            id: 'c_ctrl_relay',
            type: COMPONENT_TYPES.RUNTIME_SWITCH,
            x: 400,
            y: 160,
            rotation: 0,
            name: 'Relay_Lockout_Switch',
            params: { targetParam: 'Fault_Sig', switchState: true }
          }
        ],
        wires: []
      }
    }
  },

  TRANSFORMER_INRUSH: {
    name: 'Transformer_Inrush_Study',
    category: 'Transformers & Magnetics',
    description: 'Demonstrates non-linear core saturation causing substantial asymmetric DC-offset inrush current when a 230/69 kV power transformer is energized at voltage zero-crossing (t=0.03s).',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.4,
    components: [
      {
        id: 'c_grid_src',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Grid_Source',
        params: { voltage: 230000, freq: 60, phaseDeg: 0, rampTime: 0.001 }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_switch',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 260,
        y: 160,
        rotation: 0,
        name: 'Energize_Switch',
        params: { initClosed: false, closeTime: 0.03, Ron: 0.01 }
      },
      {
        id: 'c_am_inrush',
        type: COMPONENT_TYPES.AMMETER,
        x: 390,
        y: 160,
        rotation: 0,
        name: 'I_Primary_Inrush',
        params: { signalName: 'I_Inrush_Primary', unit: 'A', monitored: true }
      },
      {
        id: 'c_xfmr',
        type: COMPONENT_TYPES.TRANSFORMER_1PH,
        x: 520,
        y: 200,
        rotation: 0,
        name: 'Tx_230_69kV',
        params: { V1_nom: 230000, V2_nom: 69000, MVA_rating: 100, enableSaturation: true, kneeFluxPu: 1.10 }
      },
      {
        id: 'c_gnd_p2',
        type: COMPONENT_TYPES.GROUND,
        x: 508,
        y: 270,
        rotation: 0,
        name: 'GND_P2',
        params: {}
      },
      {
        id: 'c_sec_load',
        type: COMPONENT_TYPES.RESISTOR,
        x: 660,
        y: 200,
        rotation: 90,
        name: 'R_Sec_Load',
        params: { resistance: 200.0, monitored: true }
      },
      {
        id: 'c_gnd_sec',
        type: COMPONENT_TYPES.GROUND,
        x: 660,
        y: 280,
        rotation: 0,
        name: 'GND_Sec',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_grid_src_p1', endPin: 'c_switch_p1', points: [{ x: 120, y: 160 }, { x: 220, y: 160 }] },
      { id: 'w2', startPin: 'c_grid_src_p2', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_switch_p2', endPin: 'c_am_inrush_p1', points: [{ x: 300, y: 160 }, { x: 355, y: 160 }] },
      { id: 'w4', startPin: 'c_am_inrush_p2', endPin: 'c_xfmr_p1', points: [{ x: 425, y: 160 }, { x: 508, y: 160 }, { x: 508, y: 165 }] },
      { id: 'w5', startPin: 'c_xfmr_p2', endPin: 'c_gnd_p2_p1', points: [{ x: 508, y: 235 }, { x: 508, y: 250 }] },
      { id: 'w6', startPin: 'c_xfmr_s1', endPin: 'c_sec_load_p1', points: [{ x: 532, y: 165 }, { x: 660, y: 160 }] },
      { id: 'w7', startPin: 'c_sec_load_p2', endPin: 'c_gnd_sec_p1', points: [{ x: 660, y: 240 }, { x: 660, y: 260 }] }
    ]
  },

  RLC_RESONANCE: {
    name: 'RLC_Resonance_Study',
    category: 'Basic Circuit Theory',
    description: 'Classic step-response study of an underdamped series RLC circuit. Shows peak overshoot, damping envelope, natural resonant frequency f0 = 1 / (2*pi*sqrt(LC)).',
    version: '1.0',
    dt: 1e-5,
    tMax: 0.05,
    components: [
      {
        id: 'c_dc_step',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Step_DC_100V',
        params: { voltage: 100, rampTime: 0.0001, monitored: true }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_resistor',
        type: COMPONENT_TYPES.RESISTOR,
        x: 260,
        y: 160,
        rotation: 0,
        name: 'R_Damping',
        params: { resistance: 2.0, monitored: true }
      },
      {
        id: 'c_inductor',
        type: COMPONENT_TYPES.INDUCTOR,
        x: 400,
        y: 160,
        rotation: 0,
        name: 'L_Choke',
        params: { inductance: 0.005, monitored: true }
      },
      {
        id: 'c_capacitor',
        type: COMPONENT_TYPES.CAPACITOR,
        x: 540,
        y: 210,
        rotation: 90,
        name: 'C_Tank',
        params: { capacitance: 20e-6, monitored: true }
      },
      {
        id: 'c_vm_cap',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 640,
        y: 210,
        rotation: 0,
        name: 'V_Capacitor',
        params: { signalName: 'V_Capacitor_Out', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_tank',
        type: COMPONENT_TYPES.GROUND,
        x: 540,
        y: 290,
        rotation: 0,
        name: 'GND_Tank',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_dc_step_p1', endPin: 'c_resistor_p1', points: [{ x: 120, y: 160 }, { x: 220, y: 160 }] },
      { id: 'w2', startPin: 'c_dc_step_p2', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_resistor_p2', endPin: 'c_inductor_p1', points: [{ x: 300, y: 160 }, { x: 360, y: 160 }] },
      { id: 'w4', startPin: 'c_inductor_p2', endPin: 'c_capacitor_p1', points: [{ x: 440, y: 160 }, { x: 540, y: 160 }, { x: 540, y: 170 }] },
      { id: 'w5', startPin: 'c_capacitor_p1', endPin: 'c_vm_cap_p1', points: [{ x: 540, y: 170 }, { x: 640, y: 175 }] },
      { id: 'w6', startPin: 'c_capacitor_p2', endPin: 'c_gnd_tank_p1', points: [{ x: 540, y: 250 }, { x: 540, y: 270 }] }
    ]
  },

  CDA_CHATTER_BENCHMARK: {
    name: 'CDA_Chatter_Suppression_Benchmark',
    category: 'EMTDC Numerical Stability',
    description: 'RLC capacitor discharge into a fast breaker opening at t=0.05s. Demonstrates 0.00% numerical oscillation with Critical Damping Adjustment (CDA) 2-step Backward Euler transition vs conventional Trapezoidal chatter.',
    version: '1.1',
    dt: 2.5e-5,
    tMax: 0.15,
    components: [
      {
        id: 'c_dc_cda',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'DC_Precharge',
        params: { voltage: 1000, internalRs: 0.05, rampTime: 0.002 }
      },
      {
        id: 'c_gnd_cda1',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_1',
        params: {}
      },
      {
        id: 'c_brk_cda',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 260,
        y: 160,
        rotation: 0,
        name: 'Breaker_Trip',
        params: { initClosed: true, openTime: 0.05, Ron: 0.001, Roff: 1e7 }
      },
      {
        id: 'c_ind_cda',
        type: COMPONENT_TYPES.INDUCTOR,
        x: 400,
        y: 160,
        rotation: 0,
        name: 'L_Series',
        params: { inductance: 0.02, monitored: true }
      },
      {
        id: 'c_cap_cda',
        type: COMPONENT_TYPES.CAPACITOR,
        x: 540,
        y: 210,
        rotation: 90,
        name: 'C_Snubber',
        params: { capacitance: 5e-6, monitored: true }
      },
      {
        id: 'c_vm_cda',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 650,
        y: 210,
        rotation: 0,
        name: 'V_CDA_Test',
        params: { signalName: 'V_CDA_Test', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_cda2',
        type: COMPONENT_TYPES.GROUND,
        x: 540,
        y: 290,
        rotation: 0,
        name: 'GND_2',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_dc_cda_p1', endPin: 'c_brk_cda_p1', points: [{ x: 120, y: 160 }, { x: 220, y: 160 }] },
      { id: 'w2', startPin: 'c_dc_cda_p2', endPin: 'c_gnd_cda1_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_brk_cda_p2', endPin: 'c_ind_cda_p1', points: [{ x: 300, y: 160 }, { x: 360, y: 160 }] },
      { id: 'w4', startPin: 'c_ind_cda_p2', endPin: 'c_cap_cda_p1', points: [{ x: 440, y: 160 }, { x: 540, y: 160 }, { x: 540, y: 170 }] },
      { id: 'w5', startPin: 'c_cap_cda_p1', endPin: 'c_vm_cda_p1', points: [{ x: 540, y: 170 }, { x: 650, y: 175 }] },
      { id: 'w6', startPin: 'c_cap_cda_p2', endPin: 'c_gnd_cda2_p1', points: [{ x: 540, y: 250 }, { x: 540, y: 270 }] }
    ]
  },

  INTERPOLATION_BENCHMARK: {
    name: 'Switching_Point_Interpolation_Benchmark',
    category: 'EMTDC Numerical Stability',
    description: 'High-speed sub-step switching interpolation during current zero-crossing. Eliminates artificial current chopping and extreme numerical L*di/dt overvoltage spikes.',
    version: '1.1',
    dt: 5e-5,
    tMax: 0.12,
    components: [
      {
        id: 'c_ac_interp',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'AC_Grid',
        params: { voltage: 480, freq: 60, internalRs: 0.05 }
      },
      {
        id: 'c_gnd_int1',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_1',
        params: {}
      },
      {
        id: 'c_brk_interp',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 270,
        y: 160,
        rotation: 0,
        name: 'Interp_Breaker',
        params: { initClosed: true, openTime: 0.04167, Ron: 0.001, Roff: 1e7 }
      },
      {
        id: 'c_ind_interp',
        type: COMPONENT_TYPES.INDUCTOR,
        x: 420,
        y: 160,
        rotation: 0,
        name: 'L_InductiveLoad',
        params: { inductance: 0.05, monitored: true }
      },
      {
        id: 'c_res_interp',
        type: COMPONENT_TYPES.RESISTOR,
        x: 550,
        y: 210,
        rotation: 90,
        name: 'R_Bleed',
        params: { resistance: 20.0, monitored: true }
      },
      {
        id: 'c_vm_interp',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 650,
        y: 210,
        rotation: 0,
        name: 'V_SwitchTerminal',
        params: { signalName: 'V_SwitchTerminal', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_int2',
        type: COMPONENT_TYPES.GROUND,
        x: 550,
        y: 290,
        rotation: 0,
        name: 'GND_2',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_ac_interp_p1', endPin: 'c_brk_interp_p1', points: [{ x: 120, y: 160 }, { x: 230, y: 160 }] },
      { id: 'w2', startPin: 'c_ac_interp_p2', endPin: 'c_gnd_int1_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_brk_interp_p2', endPin: 'c_ind_interp_p1', points: [{ x: 310, y: 160 }, { x: 380, y: 160 }] },
      { id: 'w4', startPin: 'c_ind_interp_p2', endPin: 'c_res_interp_p1', points: [{ x: 460, y: 160 }, { x: 550, y: 160 }, { x: 550, y: 170 }] },
      { id: 'w5', startPin: 'c_res_interp_p1', endPin: 'c_vm_interp_p1', points: [{ x: 550, y: 170 }, { x: 650, y: 175 }] },
      { id: 'w6', startPin: 'c_res_interp_p2', endPin: 'c_gnd_int2_p1', points: [{ x: 550, y: 250 }, { x: 550, y: 270 }] }
    ]
  },

  BERGERON_TRAVELING_WAVE: {
    name: 'Bergeron_Traveling_Wave_Study',
    category: 'Transmission Lines & Cables',
    description: 'Demonstrates distributed parameter wave propagation, precise transit delay (tau = 0.50 ms for 150 km line), and voltage wave doubling reflection (Gamma = +1.0) at an open receiving terminal.',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.01,
    components: [
      {
        id: 'c_step_src',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Step_Surge_100kV',
        params: { voltage: 100000, rampTime: 0.0001, internalRs: 50.0 }
      },
      {
        id: 'c_gnd_src_tw',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_vm_send',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 240,
        y: 140,
        rotation: 0,
        name: 'V_SendingEnd',
        params: { signalName: 'V_SendingEnd', unit: 'V', monitored: true }
      },
      {
        id: 'c_berg_line',
        type: COMPONENT_TYPES.BERGERON_LINE_1PH,
        x: 380,
        y: 200,
        rotation: 0,
        name: 'Bergeron_150km',
        params: { lengthKm: 150, R_per_km: 0.01, L_per_km: 0.001, C_per_km: 0.0111e-6 }
      },
      {
        id: 'c_vm_recv',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 540,
        y: 140,
        rotation: 0,
        name: 'V_ReceivingEnd',
        params: { signalName: 'V_ReceivingEnd', unit: 'V', monitored: true }
      },
      {
        id: 'c_open_load',
        type: COMPONENT_TYPES.RESISTOR,
        x: 540,
        y: 220,
        rotation: 90,
        name: 'R_OpenEnd',
        params: { resistance: 10000000.0, monitored: true }
      },
      {
        id: 'c_gnd_recv_tw',
        type: COMPONENT_TYPES.GROUND,
        x: 540,
        y: 300,
        rotation: 0,
        name: 'GND_Recv',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_step_src_p1', endPin: 'c_berg_line_p1', points: [{ x: 120, y: 160 }, { x: 335, y: 200 }] },
      { id: 'w2', startPin: 'c_step_src_p2', endPin: 'c_gnd_src_tw_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_step_src_p1', endPin: 'c_vm_send_p1', points: [{ x: 120, y: 160 }, { x: 240, y: 105 }] },
      { id: 'w4', startPin: 'c_berg_line_p2', endPin: 'c_vm_recv_p1', points: [{ x: 425, y: 200 }, { x: 540, y: 105 }] },
      { id: 'w5', startPin: 'c_berg_line_p2', endPin: 'c_open_load_p1', points: [{ x: 425, y: 200 }, { x: 540, y: 180 }] },
      { id: 'w6', startPin: 'c_open_load_p2', endPin: 'c_gnd_recv_tw_p1', points: [{ x: 540, y: 260 }, { x: 540, y: 280 }] }
    ]
  },

  POLYPHASE_3PH_MODAL: {
    name: 'Polyphase_3Ph_Modal_Propagation',
    category: 'Transmission Lines & Cables',
    description: 'Models a 200 km 3-phase coupled transmission line using Clarke modal decomposition, illustrating the travel time velocity discrepancy between the fast aerial mode (tau_1 = 0.67 ms) and retarded ground mode (tau_0 = 1.02 ms).',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.015,
    components: [
      {
        id: 'c_step_3ph',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Grid_3Ph_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 0.05, rampTime: 0.0005 }
      },
      {
        id: 'c_gnd_poly_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Poly_Src',
        params: {}
      },
      {
        id: 'c_poly_line',
        type: COMPONENT_TYPES.BERGERON_LINE_3PH,
        x: 360,
        y: 200,
        rotation: 0,
        name: 'Polyphase_200km',
        params: {
          lengthKm: 200,
          R_self_per_km: 0.05,
          R_mutual_per_km: 0.02,
          L_self_per_km: 0.0013,
          L_mutual_per_km: 0.0005,
          C_self_per_km: 0.012e-6,
          C_mutual_per_km: 0.003e-6
        }
      },
      {
        id: 'c_vm_poly_recv',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 540,
        y: 140,
        rotation: 0,
        name: 'V_Receiving_PhaseA',
        params: { signalName: 'V_Receiving_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_r3ph',
        type: COMPONENT_TYPES.RESISTOR,
        x: 540,
        y: 220,
        rotation: 90,
        name: 'R_TerminalLoad',
        params: { resistance: 300.0, monitored: true }
      },
      {
        id: 'c_gnd_poly_recv',
        type: COMPONENT_TYPES.GROUND,
        x: 540,
        y: 300,
        rotation: 0,
        name: 'GND_Poly_Recv',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_step_3ph_pa', endPin: 'c_poly_line_pa1', points: [{ x: 102, y: 160 }, { x: 315, y: 180 }] },
      { id: 'w2', startPin: 'c_step_3ph_pb', endPin: 'c_poly_line_pb1', points: [{ x: 120, y: 160 }, { x: 315, y: 200 }] },
      { id: 'w3', startPin: 'c_step_3ph_pc', endPin: 'c_poly_line_pc1', points: [{ x: 138, y: 160 }, { x: 315, y: 220 }] },
      { id: 'w4', startPin: 'c_step_3ph_pn', endPin: 'c_gnd_poly_src_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w5', startPin: 'c_poly_line_pa2', endPin: 'c_vm_poly_recv_p1', points: [{ x: 405, y: 180 }, { x: 540, y: 105 }] },
      { id: 'w6', startPin: 'c_poly_line_pa2', endPin: 'c_load_r3ph_p1', points: [{ x: 405, y: 180 }, { x: 540, y: 180 }] },
      { id: 'w7', startPin: 'c_load_r3ph_p2', endPin: 'c_gnd_poly_recv_p1', points: [{ x: 540, y: 260 }, { x: 540, y: 280 }] }
    ]
  },

  UMEC_TRANSFORMER_INRUSH: {
    name: 'UMEC_Transformer_Inrush_Study',
    category: 'Transformers & Magnetics',
    description: 'Models a 230/69 kV 3-phase 100 MVA power transformer with a 3-limb reluctance core, inter-phase flux coupling, and dual-slope core saturation. Energization at voltage zero-crossing creates asymmetric inrush current and rich 3rd/5th harmonics.',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.25,
    components: [
      {
        id: 'c_grid_src3ph',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Grid_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 0.05, rampTime: 0.001 }
      },
      {
        id: 'c_gnd_grid',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Grid',
        params: {}
      },
      {
        id: 'c_brk_inrush',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 260,
        y: 200,
        rotation: 0,
        name: 'Main_Breaker',
        params: { initClosed: false, closeTime: 0.02, Ron: 0.001 }
      },
      {
        id: 'c_umec_xfmr',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 440,
        y: 200,
        rotation: 0,
        name: 'UMEC_3Limb_Xfmr',
        params: {
          V1_nom: 230000,
          V2_nom: 69000,
          MVA_rating: 100,
          coreType: '3_limb',
          primaryConn: 'Yg',
          secondaryConn: 'Delta',
          kneeFluxPu: 1.15,
          satSlopeRatio: 20.0,
          monitored: true
        }
      },
      {
        id: 'c_vm_sec',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 600,
        y: 140,
        rotation: 0,
        name: 'V_Secondary_PhaseA',
        params: { signalName: 'V_Secondary_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_sec',
        type: COMPONENT_TYPES.RESISTOR,
        x: 600,
        y: 220,
        rotation: 90,
        name: 'R_Secondary_Load',
        params: { resistance: 200.0, monitored: true }
      },
      {
        id: 'c_gnd_sec',
        type: COMPONENT_TYPES.GROUND,
        x: 600,
        y: 300,
        rotation: 0,
        name: 'GND_Sec',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_grid_src3ph_pa', endPin: 'c_brk_inrush_pa1', points: [{ x: 102, y: 160 }, { x: 220, y: 180 }] },
      { id: 'w2', startPin: 'c_grid_src3ph_pb', endPin: 'c_brk_inrush_pb1', points: [{ x: 120, y: 160 }, { x: 220, y: 200 }] },
      { id: 'w3', startPin: 'c_grid_src3ph_pc', endPin: 'c_brk_inrush_pc1', points: [{ x: 138, y: 160 }, { x: 220, y: 220 }] },
      { id: 'w4', startPin: 'c_grid_src3ph_pn', endPin: 'c_gnd_grid_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w5', startPin: 'c_brk_inrush_pa2', endPin: 'c_umec_xfmr_pa', points: [{ x: 300, y: 180 }, { x: 395, y: 180 }] },
      { id: 'w6', startPin: 'c_brk_inrush_pb2', endPin: 'c_umec_xfmr_pb', points: [{ x: 300, y: 200 }, { x: 395, y: 200 }] },
      { id: 'w7', startPin: 'c_brk_inrush_pc2', endPin: 'c_umec_xfmr_pc', points: [{ x: 300, y: 220 }, { x: 395, y: 220 }] },
      { id: 'w8', startPin: 'c_umec_xfmr_pn', endPin: 'c_gnd_grid_p1', points: [{ x: 395, y: 235 }, { x: 120, y: 260 }] },
      { id: 'w9', startPin: 'c_umec_xfmr_sa', endPin: 'c_vm_sec_p1', points: [{ x: 485, y: 180 }, { x: 600, y: 105 }] },
      { id: 'w10', startPin: 'c_umec_xfmr_sa', endPin: 'c_load_sec_p1', points: [{ x: 485, y: 180 }, { x: 600, y: 180 }] },
      { id: 'w11', startPin: 'c_load_sec_p2', endPin: 'c_gnd_sec_p1', points: [{ x: 600, y: 260 }, { x: 600, y: 280 }] }
    ]
  },

  SYNC_GENERATOR_SSR: {
    name: 'Sync_Generator_SSR_Study',
    category: 'Rotating Machines & Drives',
    description: '100 MVA Synchronous Machine equipped with a 4-mass torsional shaft (HP, IP, LP, Generator). Line switching at t=0.10s excites sub-synchronous resonance (SSR) torsional torque oscillations across shaft couplings.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      {
        id: 'c_sync_gen',
        type: COMPONENT_TYPES.SYNC_MACHINE_DQ,
        x: 150,
        y: 200,
        rotation: 0,
        name: 'Gen_100MVA',
        params: {
          Sn_MVA: 100,
          Vn_kV: 13.8,
          Xd: 1.8,
          Xq: 1.7,
          Xd_prime: 0.3,
          Xd_pp: 0.2,
          useMultiMassShaft: true,
          H_hp: 0.88,
          H_ip: 0.77,
          H_lp: 1.45,
          H_gen: 0.85,
          K_hp_ip: 19.3,
          K_ip_lp: 35.8,
          K_lp_gen: 45.2,
          monitored: true
        }
      },
      {
        id: 'c_gnd_gen',
        type: COMPONENT_TYPES.GROUND,
        x: 150,
        y: 280,
        rotation: 0,
        name: 'GND_Gen',
        params: {}
      },
      {
        id: 'c_brk_ssr',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 320,
        y: 200,
        rotation: 0,
        name: 'Breaker_Line',
        params: { initClosed: true, openTime: 0.15, Ron: 0.001 }
      },
      {
        id: 'c_vm_ssr',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 480,
        y: 140,
        rotation: 0,
        name: 'V_Terminal_PhaseA',
        params: { signalName: 'V_Terminal_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_ssr',
        type: COMPONENT_TYPES.RESISTOR,
        x: 480,
        y: 220,
        rotation: 90,
        name: 'R_GridLoad',
        params: { resistance: 2.0, monitored: true }
      },
      {
        id: 'c_gnd_load_ssr',
        type: COMPONENT_TYPES.GROUND,
        x: 480,
        y: 300,
        rotation: 0,
        name: 'GND_SSR_Load',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_sync_gen_pa', endPin: 'c_brk_ssr_pa1', points: [{ x: 132, y: 160 }, { x: 280, y: 180 }] },
      { id: 'w2', startPin: 'c_sync_gen_pb', endPin: 'c_brk_ssr_pb1', points: [{ x: 150, y: 160 }, { x: 280, y: 200 }] },
      { id: 'w3', startPin: 'c_sync_gen_pc', endPin: 'c_brk_ssr_pc1', points: [{ x: 168, y: 160 }, { x: 280, y: 220 }] },
      { id: 'w4', startPin: 'c_sync_gen_pn', endPin: 'c_gnd_gen_p1', points: [{ x: 150, y: 240 }, { x: 150, y: 260 }] },
      { id: 'w5', startPin: 'c_brk_ssr_pa2', endPin: 'c_vm_ssr_p1', points: [{ x: 360, y: 180 }, { x: 480, y: 105 }] },
      { id: 'w6', startPin: 'c_brk_ssr_pa2', endPin: 'c_load_ssr_p1', points: [{ x: 360, y: 180 }, { x: 480, y: 180 }] },
      { id: 'w7', startPin: 'c_load_ssr_p2', endPin: 'c_gnd_load_ssr_p1', points: [{ x: 480, y: 260 }, { x: 480, y: 280 }] }
    ]
  },

  DFIG_WIND_LVRT: {
    name: 'DFIG_Wind_Turbine_LVRT',
    category: 'Renewable Generation & Wind',
    description: '2.0 MW Doubly-Fed Induction Generator (DFIG Type 3 Wind Turbine) with Stator Field-Oriented Control (FOC). A symmetric grid fault at t=0.10s triggers the active rotor Crowbar circuit, demonstrating Low-Voltage Ride-Through (LVRT) reactive current injection.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.4,
    components: [
      {
        id: 'c_dfig_wt',
        type: COMPONENT_TYPES.DFIG_GENERATOR,
        x: 150,
        y: 200,
        rotation: 0,
        name: 'DFIG_2MW',
        params: {
          Sn_MVA: 2.0,
          Vn_kV: 0.69,
          windSpeed: 11.5,
          Pref_pu: 0.9,
          Qref_pu: 0.0,
          monitored: true
        }
      },
      {
        id: 'c_gnd_dfig',
        type: COMPONENT_TYPES.GROUND,
        x: 150,
        y: 280,
        rotation: 0,
        name: 'GND_DFIG',
        params: {}
      },
      {
        id: 'c_fault_dfig',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 340,
        y: 200,
        rotation: 0,
        name: 'Grid_Fault',
        params: { faultType: '3LG', startTime: 0.10, duration: 0.06, faultResistance: 0.02 }
      },
      {
        id: 'c_gnd_flt_dfig',
        type: COMPONENT_TYPES.GROUND,
        x: 420,
        y: 260,
        rotation: 0,
        name: 'GND_Fault',
        params: {}
      },
      {
        id: 'c_vm_dfig',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 520,
        y: 140,
        rotation: 0,
        name: 'V_Grid_PhaseA',
        params: { signalName: 'V_Grid_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_dfig',
        type: COMPONENT_TYPES.RESISTOR,
        x: 520,
        y: 220,
        rotation: 90,
        name: 'R_Grid',
        params: { resistance: 0.25, monitored: true }
      },
      {
        id: 'c_gnd_grid_dfig',
        type: COMPONENT_TYPES.GROUND,
        x: 520,
        y: 300,
        rotation: 0,
        name: 'GND_Grid',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_dfig_wt_pa', endPin: 'c_fault_dfig_pa', points: [{ x: 132, y: 160 }, { x: 300, y: 185 }] },
      { id: 'w2', startPin: 'c_dfig_wt_pb', endPin: 'c_fault_dfig_pb', points: [{ x: 150, y: 160 }, { x: 300, y: 200 }] },
      { id: 'w3', startPin: 'c_dfig_wt_pc', endPin: 'c_fault_dfig_pc', points: [{ x: 168, y: 160 }, { x: 300, y: 215 }] },
      { id: 'w4', startPin: 'c_dfig_wt_pn', endPin: 'c_gnd_dfig_p1', points: [{ x: 150, y: 240 }, { x: 150, y: 260 }] },
      { id: 'w5', startPin: 'c_fault_dfig_pg', endPin: 'c_gnd_flt_dfig_p1', points: [{ x: 380, y: 200 }, { x: 420, y: 200 }, { x: 420, y: 240 }] },
      { id: 'w6', startPin: 'c_fault_dfig_pa', endPin: 'c_vm_dfig_p1', points: [{ x: 300, y: 185 }, { x: 520, y: 105 }] },
      { id: 'w7', startPin: 'c_fault_dfig_pa', endPin: 'c_load_dfig_p1', points: [{ x: 300, y: 185 }, { x: 520, y: 180 }] },
      { id: 'w8', startPin: 'c_load_dfig_p2', endPin: 'c_gnd_grid_dfig_p1', points: [{ x: 520, y: 260 }, { x: 520, y: 280 }] }
    ]
  },

  SURGE_ARRESTER_LIGHTNING: {
    name: 'Surge_Arrester_Lightning_Study',
    category: 'Non-Linear & Protection',
    description: 'Demonstrates non-linear Metal Oxide Varistor (MOV) surge arrester clamping action when an 8/20 µs 10 kA lightning surge strikes a 230 kV substation busbar, capping overvoltages below protective margin.',
    version: '1.0',
    dt: 1e-6,
    tMax: 0.0005,
    components: [
      {
        id: 'c_surge_src',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'Lightning_Surge_1000kV',
        params: { voltage: 1000000, rampTime: 0.000008, internalRs: 400.0 }
      },
      {
        id: 'c_gnd_src_surge',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Surge',
        params: {}
      },
      {
        id: 'c_mov_arrester',
        type: COMPONENT_TYPES.SURGE_ARRESTER,
        x: 300,
        y: 200,
        rotation: 0,
        name: 'MOV_Arrester_210kV',
        params: {
          V_ref: 210000,
          I_ref: 1000,
          alpha1: 4.0,
          alpha2: 32.0,
          alpha3: 8.0,
          energyRatingKJ: 500.0,
          monitored: true
        }
      },
      {
        id: 'c_gnd_mov',
        type: COMPONENT_TYPES.GROUND,
        x: 300,
        y: 280,
        rotation: 0,
        name: 'GND_MOV',
        params: {}
      },
      {
        id: 'c_vm_clamp',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 450,
        y: 140,
        rotation: 0,
        name: 'V_Clamped_Bus',
        params: { signalName: 'V_Clamped_Bus', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_surge',
        type: COMPONENT_TYPES.RESISTOR,
        x: 450,
        y: 220,
        rotation: 90,
        name: 'R_Transformer_HF',
        params: { resistance: 2000.0, monitored: true }
      },
      {
        id: 'c_gnd_load_surge',
        type: COMPONENT_TYPES.GROUND,
        x: 450,
        y: 300,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_surge_src_p1', endPin: 'c_mov_arrester_p1', points: [{ x: 120, y: 160 }, { x: 300, y: 165 }] },
      { id: 'w2', startPin: 'c_surge_src_p2', endPin: 'c_gnd_src_surge_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w3', startPin: 'c_mov_arrester_p2', endPin: 'c_gnd_mov_p1', points: [{ x: 300, y: 235 }, { x: 300, y: 260 }] },
      { id: 'w4', startPin: 'c_mov_arrester_p1', endPin: 'c_vm_clamp_p1', points: [{ x: 300, y: 165 }, { x: 450, y: 105 }] },
      { id: 'w5', startPin: 'c_mov_arrester_p1', endPin: 'c_load_surge_p1', points: [{ x: 300, y: 165 }, { x: 450, y: 180 }] },
      { id: 'w6', startPin: 'c_load_surge_p2', endPin: 'c_gnd_load_surge_p1', points: [{ x: 450, y: 260 }, { x: 450, y: 280 }] }
    ]
  },
  MMC_HVDC_GRID: {
    name: 'MMC_201Level_HVDC_Station',
    category: 'Power Electronics & FACTS',
    description: '400 kV DC / 230 kV AC Modular Multilevel Converter (MMC) Detailed Equivalent Model (DEM) with N=100 submodules/arm (201 voltage levels). Demonstrates sub-step nearest level control (NLC) modulation, fast capacitor voltage sorting/balancing, and ultra-low harmonic distortion (THD < 1.0%).',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.1,
    components: [
      {
        id: 'c_dc_src_p',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 100,
        y: 150,
        rotation: 0,
        name: 'DC_Link_Pos',
        params: { voltage: 200000, internalRs: 0.1 }
      },
      {
        id: 'c_dc_src_n',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 100,
        y: 350,
        rotation: 0,
        name: 'DC_Link_Neg',
        params: { voltage: -200000, internalRs: 0.1 }
      },
      {
        id: 'c_gnd_dc',
        type: COMPONENT_TYPES.GROUND,
        x: 100,
        y: 250,
        rotation: 0,
        name: 'GND_DC',
        params: {}
      },
      {
        id: 'c_mmc_station',
        type: COMPONENT_TYPES.MMC_CONVERTER_3PH,
        x: 350,
        y: 250,
        rotation: 0,
        name: 'MMC_Converter_Station',
        params: {
          numSubmodules: 100,
          C_submodule: 0.005,
          Vdc_nom: 400000,
          V_ac_nom: 230000,
          Pac_ref: 500,
          Qac_ref: 0,
          modulationIndex: 0.88,
          L_arm: 0.035,
          R_arm: 0.35,
          monitored: true,
          signalName: 'MMC_AC_PhaseA'
        }
      },
      {
        id: 'c_vm_ac_a',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 550,
        y: 180,
        rotation: 0,
        name: 'V_MMC_PhaseA',
        params: { signalName: 'V_MMC_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_vm_ac_b',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 550,
        y: 250,
        rotation: 0,
        name: 'V_MMC_PhaseB',
        params: { signalName: 'V_MMC_PhaseB', unit: 'V', monitored: true }
      },
      {
        id: 'c_vm_ac_c',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 550,
        y: 320,
        rotation: 0,
        name: 'V_MMC_PhaseC',
        params: { signalName: 'V_MMC_PhaseC', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_ac',
        type: COMPONENT_TYPES.GROUND,
        x: 650,
        y: 250,
        rotation: 0,
        name: 'GND_AC_Grid',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_dc_src_p_p1', endPin: 'c_mmc_station_pdcp', points: [{ x: 100, y: 110 }, { x: 305, y: 225 }] },
      { id: 'w2', startPin: 'c_dc_src_p_p2', endPin: 'c_gnd_dc_p1', points: [{ x: 100, y: 190 }, { x: 100, y: 230 }] },
      { id: 'w3', startPin: 'c_dc_src_n_p1', endPin: 'c_gnd_dc_p1', points: [{ x: 100, y: 310 }, { x: 100, y: 230 }] },
      { id: 'w4', startPin: 'c_dc_src_n_p2', endPin: 'c_mmc_station_pdcn', points: [{ x: 100, y: 390 }, { x: 305, y: 275 }] },
      { id: 'w5', startPin: 'c_mmc_station_pa', endPin: 'c_vm_ac_a_p1', points: [{ x: 395, y: 230 }, { x: 550, y: 145 }] },
      { id: 'w6', startPin: 'c_mmc_station_pb', endPin: 'c_vm_ac_b_p1', points: [{ x: 395, y: 250 }, { x: 550, y: 215 }] },
      { id: 'w7', startPin: 'c_mmc_station_pc', endPin: 'c_vm_ac_c_p1', points: [{ x: 395, y: 270 }, { x: 550, y: 285 }] },
      { id: 'w8', startPin: 'c_vm_ac_a_p2', endPin: 'c_gnd_ac_p1', points: [{ x: 550, y: 215 }, { x: 650, y: 230 }] },
      { id: 'w9', startPin: 'c_vm_ac_b_p2', endPin: 'c_gnd_ac_p1', points: [{ x: 550, y: 285 }, { x: 650, y: 230 }] },
      { id: 'w10', startPin: 'c_vm_ac_c_p2', endPin: 'c_gnd_ac_p1', points: [{ x: 550, y: 355 }, { x: 650, y: 230 }] }
    ]
  },
  LCC_12PULSE_HVDC: {
    name: 'LCC_12Pulse_HVDC_Station',
    category: 'Power Electronics & FACTS',
    description: '12-Pulse Line-Commutated Converter (LCC) Graetz HVDC transmission station fed by Y-Y and Y-Δ phase-shifting transformers (30° shift). Demonstrates 5th/7th harmonic cancellation and DC voltage ripple reduction (< 1.0%).',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.1,
    components: [
      {
        id: 'c_ac_grid_lcc',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 220,
        rotation: 0,
        name: 'Grid_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_grid_lcc',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 300,
        rotation: 0,
        name: 'GND_Grid',
        params: {}
      },
      {
        id: 'c_lcc_12p',
        type: COMPONENT_TYPES.LCC_BRIDGE_12PULSE,
        x: 350,
        y: 220,
        rotation: 0,
        name: 'LCC_12Pulse_Bridge',
        params: {
          V_ac_nom: 230000,
          alphaDeg: 18.0,
          gammaMinDeg: 15.0,
          inductance: 0.015,
          monitored: true,
          signalName: 'LCC_Vdc'
        }
      },
      {
        id: 'c_vm_dc_lcc',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 550,
        y: 220,
        rotation: 0,
        name: 'Vdc_12Pulse_Bus',
        params: { signalName: 'Vdc_12Pulse_Bus', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_dc_lcc',
        type: COMPONENT_TYPES.RESISTOR,
        x: 550,
        y: 320,
        rotation: 90,
        name: 'R_DC_Transmission',
        params: { resistance: 300.0 }
      },
      {
        id: 'c_gnd_dc_lcc',
        type: COMPONENT_TYPES.GROUND,
        x: 550,
        y: 400,
        rotation: 0,
        name: 'GND_DC_Load',
        params: {}
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_ac_grid_lcc_pa', endPin: 'c_lcc_12p_pa', points: [{ x: 102, y: 180 }, { x: 305, y: 200 }] },
      { id: 'w2', startPin: 'c_ac_grid_lcc_pb', endPin: 'c_lcc_12p_pb', points: [{ x: 120, y: 180 }, { x: 305, y: 220 }] },
      { id: 'w3', startPin: 'c_ac_grid_lcc_pc', endPin: 'c_lcc_12p_pc', points: [{ x: 138, y: 180 }, { x: 305, y: 240 }] },
      { id: 'w4', startPin: 'c_ac_grid_lcc_pn', endPin: 'c_gnd_grid_lcc_p1', points: [{ x: 120, y: 260 }, { x: 120, y: 280 }] },
      { id: 'w5', startPin: 'c_lcc_12p_pdcp', endPin: 'c_vm_dc_lcc_p1', points: [{ x: 395, y: 200 }, { x: 550, y: 185 }] },
      { id: 'w6', startPin: 'c_lcc_12p_pdcn', endPin: 'c_vm_dc_lcc_p2', points: [{ x: 395, y: 240 }, { x: 550, y: 255 }] },
      { id: 'w7', startPin: 'c_lcc_12p_pdcp', endPin: 'c_load_dc_lcc_p1', points: [{ x: 395, y: 200 }, { x: 550, y: 280 }] },
      { id: 'w8', startPin: 'c_load_dc_lcc_p2', endPin: 'c_gnd_dc_lcc_p1', points: [{ x: 550, y: 360 }, { x: 550, y: 380 }] }
    ]
  },
  STATCOM_VOLTAGE_SUPPORT: {
    name: 'STATCOM_Dynamic_Voltage_Support',
    category: 'Power Electronics & FACTS',
    description: '±100 MVAR STATCOM connected to a 230 kV weak transmission bus. A heavy inductive load step occurs at t=0.05s causing a 12% voltage sag. The STATCOM decoupled d-q controller injects dynamic capacitive vars in < 15 ms, restoring voltage to 1.00 pu.',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.15,
    components: [
      {
        id: 'c_grid_statcom',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 100,
        y: 200,
        rotation: 0,
        name: 'Weak_Grid_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 5.0, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_grid_stat',
        type: COMPONENT_TYPES.GROUND,
        x: 100,
        y: 280,
        rotation: 0,
        name: 'GND_Grid',
        params: {}
      },
      {
        id: 'c_statcom_unit',
        type: COMPONENT_TYPES.STATCOM,
        x: 320,
        y: 200,
        rotation: 0,
        name: 'STATCOM_100MVAR',
        params: {
          V_ac_nom: 230000,
          Q_rating_MVAR: 100.0,
          Vdc_nom: 40000,
          Cdc_F: 0.020,
          monitored: true,
          signalName: 'STATCOM_Q_Injection'
        }
      },
      {
        id: 'c_gnd_stat',
        type: COMPONENT_TYPES.GROUND,
        x: 320,
        y: 280,
        rotation: 0,
        name: 'GND_Statcom',
        params: {}
      },
      {
        id: 'c_sw_load',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 480,
        y: 200,
        rotation: 0,
        name: 'Load_Step_Breaker',
        params: { initClosed: false, closeTime: 0.05, Ron: 0.001 }
      },
      {
        id: 'c_load_rlc',
        type: COMPONENT_TYPES.SERIES_RLC,
        x: 620,
        y: 200,
        rotation: 90,
        name: 'Heavy_Inductive_Load',
        params: { resistance: 20.0, inductance: 0.080 }
      },
      {
        id: 'c_gnd_load_stat',
        type: COMPONENT_TYPES.GROUND,
        x: 620,
        y: 280,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_vm_grid_stat',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 320,
        y: 100,
        rotation: 0,
        name: 'V_Grid_Bus',
        params: { signalName: 'V_Grid_Bus', unit: 'V', monitored: true }
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_grid_statcom_pa', endPin: 'c_statcom_unit_pa', points: [{ x: 82, y: 160 }, { x: 302, y: 160 }] },
      { id: 'w2', startPin: 'c_grid_statcom_pb', endPin: 'c_statcom_unit_pb', points: [{ x: 100, y: 160 }, { x: 320, y: 160 }] },
      { id: 'w3', startPin: 'c_grid_statcom_pc', endPin: 'c_statcom_unit_pc', points: [{ x: 118, y: 160 }, { x: 338, y: 160 }] },
      { id: 'w4', startPin: 'c_grid_statcom_pn', endPin: 'c_gnd_grid_stat_p1', points: [{ x: 100, y: 240 }, { x: 100, y: 260 }] },
      { id: 'w5', startPin: 'c_statcom_unit_pn', endPin: 'c_gnd_stat_p1', points: [{ x: 320, y: 240 }, { x: 320, y: 260 }] },
      { id: 'w6', startPin: 'c_statcom_unit_pa', endPin: 'c_sw_load_pa1', points: [{ x: 302, y: 160 }, { x: 440, y: 180 }] },
      { id: 'w7', startPin: 'c_sw_load_pa2', endPin: 'c_load_rlc_p1', points: [{ x: 520, y: 180 }, { x: 620, y: 160 }] },
      { id: 'w8', startPin: 'c_load_rlc_p2', endPin: 'c_gnd_load_stat_p1', points: [{ x: 620, y: 240 }, { x: 620, y: 260 }] },
      { id: 'w9', startPin: 'c_statcom_unit_pa', endPin: 'c_vm_grid_stat_p1', points: [{ x: 302, y: 160 }, { x: 320, y: 65 }] },
      { id: 'w10', startPin: 'c_vm_grid_stat_p2', endPin: 'c_gnd_stat_p1', points: [{ x: 320, y: 135 }, { x: 320, y: 260 }] }
    ]
  },
  GRID_INVERTER_CSMF_CONTROL: {
    name: 'Grid_Inverter_CSMF_Control',
    category: 'Control & Power Electronics',
    description: '3-Phase Grid-Connected Converter with comprehensive CSMF Control: SRF-PLL synchronization, Clarke/Park d-q frame transformations, decoupled PI current regulators, Space Vector PWM (SVPWM), Symmetrical Sequence Analyzer (V1, V2, V0), and Wireless Data Labels.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      {
        id: 'c_grid_src',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 100,
        y: 180,
        rotation: 0,
        name: 'Grid_69kV',
        params: { voltage: 69000, freq: 60, internalRs: 0.1 }
      },
      {
        id: 'c_gnd_grid',
        type: COMPONENT_TYPES.GROUND,
        x: 100,
        y: 260,
        rotation: 0,
        name: 'GND_Grid',
        params: {}
      },
      {
        id: 'c_poly_bus',
        type: COMPONENT_TYPES.POLYPHASE_BUS_3PH,
        x: 260,
        y: 180,
        rotation: 0,
        name: 'Polyphase_Bus_3Ph',
        params: { length: 140 }
      },
      {
        id: 'c_splitter',
        type: COMPONENT_TYPES.PHASE_SPLITTER_3PH,
        x: 420,
        y: 180,
        rotation: 0,
        name: 'Phase_Splitter',
        params: {}
      },
      {
        id: 'c_inv_bridge',
        type: COMPONENT_TYPES.MMC_CONVERTER_3PH,
        x: 600,
        y: 180,
        rotation: 0,
        name: 'VSC_Inverter',
        params: {
          Vdc_nom: 150000,
          Pac_ref: 50.0,
          Qac_ref: 10.0,
          monitored: true,
          signalName: 'Inverter_P_MW'
        }
      },
      {
        id: 'c_gnd_inv',
        type: COMPONENT_TYPES.GROUND,
        x: 600,
        y: 260,
        rotation: 0,
        name: 'GND_Inv',
        params: {}
      },
      // CSMF Control Sub-circuit (Rows 2 & 3)
      {
        id: 'c_pll',
        type: COMPONENT_TYPES.CSMF_PLL,
        x: 140,
        y: 380,
        rotation: 0,
        name: 'Grid_SRF_PLL',
        params: { pllFreq: 60, pllKp: 60.0, pllKi: 1400.0, monitored: true, signalName: 'PLL_Theta_Rad' }
      },
      {
        id: 'c_tx_theta',
        type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
        x: 260,
        y: 360,
        rotation: 0,
        name: 'Tx_Theta',
        params: { signalName: 'Grid_Theta' }
      },
      {
        id: 'c_tx_freq',
        type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
        x: 260,
        y: 400,
        rotation: 0,
        name: 'Tx_Freq',
        params: { signalName: 'Grid_Freq_Hz' }
      },
      {
        id: 'c_rx_theta_park',
        type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
        x: 360,
        y: 380,
        rotation: 0,
        name: 'Rx_Theta_Park',
        params: { signalName: 'Grid_Theta' }
      },
      {
        id: 'c_park_trans',
        type: COMPONENT_TYPES.CSMF_PARK,
        x: 480,
        y: 380,
        rotation: 0,
        name: 'Park_Transform',
        params: { monitored: true, signalName: 'V_d_pu' }
      },
      {
        id: 'c_pid_d',
        type: COMPONENT_TYPES.CSMF_PID,
        x: 640,
        y: 360,
        rotation: 0,
        name: 'PI_Id_Current_Loop',
        params: { pidKp: 1.5, pidKi: 25.0, pidMin: -2.0, pidMax: 2.0, monitored: true, signalName: 'V_conv_d_ref' }
      },
      {
        id: 'c_pid_q',
        type: COMPONENT_TYPES.CSMF_PID,
        x: 640,
        y: 420,
        rotation: 0,
        name: 'PI_Iq_Current_Loop',
        params: { pidKp: 1.5, pidKi: 25.0, pidMin: -2.0, pidMax: 2.0, monitored: true, signalName: 'V_conv_q_ref' }
      },
      {
        id: 'c_svpwm_mod',
        type: COMPONENT_TYPES.CSMF_SVPWM,
        x: 800,
        y: 380,
        rotation: 0,
        name: 'SVPWM_SpaceVector_Unit',
        params: { carrierFreq: 2500, Vdc_nom: 150000, monitored: true, signalName: 'SVPWM_Duty_A' }
      },
      {
        id: 'c_seq_analyzer',
        type: COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER,
        x: 480,
        y: 500,
        rotation: 0,
        name: 'Symmetrical_Seq_V1_V2_V0',
        params: { freq: 60, monitored: true, signalName: 'Grid_V1_Pos_Seq' }
      },
      {
        id: 'c_vm_grid_mon',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 100,
        y: 80,
        rotation: 0,
        name: 'V_Grid_A_Mon',
        params: { signalName: 'V_Grid_PhaseA', unit: 'V', monitored: true }
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_grid_src_pa', endPin: 'c_poly_bus_t1', points: [{ x: 82, y: 140 }, { x: 190, y: 180 }], domain: 'electrical' },
      { id: 'w2', startPin: 'c_grid_src_pb', endPin: 'c_poly_bus_t2', points: [{ x: 100, y: 140 }, { x: 225, y: 180 }], domain: 'electrical' },
      { id: 'w3', startPin: 'c_grid_src_pc', endPin: 'c_poly_bus_t3', points: [{ x: 118, y: 140 }, { x: 260, y: 180 }], domain: 'electrical' },
      { id: 'w4', startPin: 'c_grid_src_pn', endPin: 'c_gnd_grid_p1', points: [{ x: 100, y: 220 }, { x: 100, y: 240 }], domain: 'electrical' },
      { id: 'w5', startPin: 'c_poly_bus_t5', endPin: 'c_splitter_p3ph', points: [{ x: 330, y: 180 }, { x: 380, y: 180 }], domain: 'polyphase' },
      { id: 'w6', startPin: 'c_splitter_pa', endPin: 'c_inv_bridge_pa', points: [{ x: 460, y: 160 }, { x: 645, y: 160 }], domain: 'electrical' },
      { id: 'w7', startPin: 'c_splitter_pb', endPin: 'c_inv_bridge_pb', points: [{ x: 460, y: 180 }, { x: 645, y: 180 }], domain: 'electrical' },
      { id: 'w8', startPin: 'c_splitter_pc', endPin: 'c_inv_bridge_pc', points: [{ x: 460, y: 200 }, { x: 645, y: 200 }], domain: 'electrical' },
      { id: 'w9', startPin: 'c_pll_ptheta', endPin: 'c_tx_theta_in', points: [{ x: 180, y: 360 }, { x: 225, y: 360 }], domain: 'control' },
      { id: 'w10', startPin: 'c_pll_pfreq', endPin: 'c_tx_freq_in', points: [{ x: 180, y: 387 }, { x: 225, y: 400 }], domain: 'control' },
      { id: 'w11', startPin: 'c_rx_theta_park_out', endPin: 'c_park_trans_ptheta', points: [{ x: 395, y: 380 }, { x: 440, y: 400 }], domain: 'control' },
      { id: 'w12', startPin: 'c_park_trans_pd', endPin: 'c_pid_d_in', points: [{ x: 520, y: 360 }, { x: 600, y: 360 }], domain: 'control' },
      { id: 'w13', startPin: 'c_park_trans_pq', endPin: 'c_pid_q_in', points: [{ x: 520, y: 380 }, { x: 600, y: 420 }], domain: 'control' },
      { id: 'w14', startPin: 'c_pid_d_out', endPin: 'c_svpwm_mod_palpha', points: [{ x: 680, y: 360 }, { x: 760, y: 360 }], domain: 'control' },
      { id: 'w15', startPin: 'c_pid_q_out', endPin: 'c_svpwm_mod_pbeta', points: [{ x: 680, y: 420 }, { x: 760, y: 380 }], domain: 'control' },
      { id: 'w16', startPin: 'c_grid_src_pa', endPin: 'c_vm_grid_mon_p1', points: [{ x: 82, y: 140 }, { x: 100, y: 45 }], domain: 'electrical' },
      { id: 'w17', startPin: 'c_vm_grid_mon_p2', endPin: 'c_gnd_grid_p1', points: [{ x: 100, y: 115 }, { x: 100, y: 240 }], domain: 'electrical' }
    ]
  },

  POLYGRAPH_3PH_STUDY: {
    name: '3Ph_PolyGraph_Stacked_Study',
    category: 'Transmission & Protection',
    description: 'Stacked multi-grid PolyGraph benchmark demonstrating independent dynamic Y-scaling across disparate signal units (Sub-Grid 1: 230 kV Voltages vs Sub-Grid 2: 1.2 kA Line Currents) and synchronized vertical time crosshairs.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      {
        id: 'c_src3ph',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 220,
        rotation: 0,
        name: 'Grid_230kV',
        params: { voltage: 230000, freq: 60, internalRs: 0.1, rampTime: 0.015 }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 300,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_brk3ph',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 270,
        y: 200,
        rotation: 0,
        name: 'Breaker_Main',
        params: { initClosed: true, openTime: 0.15, closeTime: 0.35, Ron: 0.001 }
      },
      {
        id: 'c_tline',
        type: COMPONENT_TYPES.PI_LINE,
        x: 450,
        y: 200,
        rotation: 0,
        name: 'Line_100km',
        params: { lengthKm: 100, R_per_km: 0.03, L_per_km: 0.001, C_per_km: 0.012e-6 }
      },
      {
        id: 'c_fault',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 620,
        y: 200,
        rotation: 0,
        name: 'Fault_BusB',
        params: { faultType: 'SLG_A', startTime: 0.10, duration: 0.08, faultResistance: 0.01 }
      },
      {
        id: 'c_gnd_fault',
        type: COMPONENT_TYPES.GROUND,
        x: 700,
        y: 260,
        rotation: 0,
        name: 'GND_Fault',
        params: {}
      },
      {
        id: 'c_vm_src',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 230,
        y: 100,
        rotation: 0,
        name: 'V_Send_PhaseA',
        params: { signalName: 'V_Send_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm_src',
        type: COMPONENT_TYPES.GROUND,
        x: 230,
        y: 155,
        rotation: 0,
        name: 'GND_VMSrc',
        params: {}
      },
      {
        id: 'c_am_line',
        type: COMPONENT_TYPES.AMMETER,
        x: 360,
        y: 180,
        rotation: 0,
        name: 'I_Line_PhaseA',
        params: { signalName: 'I_Line_PhaseA', unit: 'A', monitored: true }
      },
      {
        id: 'c_vm_recv',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 780,
        y: 180,
        rotation: 0,
        name: 'V_Load_PhaseA',
        params: { signalName: 'V_Load_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_load_r',
        type: COMPONENT_TYPES.RESISTOR,
        x: 780,
        y: 260,
        rotation: 90,
        name: 'R_Load',
        params: { resistance: 50.0, monitored: true }
      },
      {
        id: 'c_gnd_load',
        type: COMPONENT_TYPES.GROUND,
        x: 780,
        y: 340,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_polygraph_frame1',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 940,
        y: 100,
        rotation: 0,
        name: 'PolyGraph_3Ph_VI_Frame',
        params: {
          graphTitle: 'PolyGraph: Stacked 3-Phase Voltages & Currents',
          graphWidth: 440,
          graphHeight: 300,
          graphMode: 'polygraph',
          numSubGrids: 2,
          subGrids: [
            {
              id: 'sg_volts',
              title: 'Track 1: Voltages (V_Send & V_Load)',
              unit: 'V',
              traces: ['V_Send_PhaseA', 'V_Load_PhaseA'],
            },
            {
              id: 'sg_currents',
              title: 'Track 2: Line Current (I_Line)',
              unit: 'A',
              traces: ['I_Line_PhaseA'],
            },
          ],
          traces: [
            {
              id: 'tr_v_send',
              signalName: 'V_Send_PhaseA',
              probeId: 'c_vm_src',
              probeType: 'voltmeter',
              label: 'V_Send_A',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              subGridIndex: 0,
            },
            {
              id: 'tr_v_load',
              signalName: 'V_Load_PhaseA',
              probeId: 'c_vm_recv',
              probeType: 'voltmeter',
              label: 'V_Load_A',
              unit: 'V',
              color: '#ff4081',
              visible: true,
              subGridIndex: 0,
            },
            {
              id: 'tr_i_line',
              signalName: 'I_Line_PhaseA',
              probeId: 'c_am_line',
              probeType: 'ammeter',
              label: 'I_Line_A',
              unit: 'A',
              color: '#ffeb3b',
              visible: true,
              subGridIndex: 1,
            },
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
          graphShowCrosshair: true,
        }
      }
    ],
    wires: [
      { id: 'w1', startPin: 'c_src3ph_pa', endPin: 'c_brk3ph_pa1', points: [{ x: 102, y: 180 }, { x: 230, y: 180 }] },
      { id: 'w2', startPin: 'c_src3ph_pn', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 260 }, { x: 120, y: 280 }] },
      { id: 'w3_vm_tap', startPin: 'c_brk3ph_pa1', endPin: 'c_vm_src_p1', points: [{ x: 230, y: 180 }, { x: 230, y: 65 }] },
      { id: 'w3_vm_gnd', startPin: 'c_vm_src_p2', endPin: 'c_gnd_vm_src_p1', points: [{ x: 230, y: 135 }, { x: 230, y: 135 }] },
      { id: 'w3_am_in', startPin: 'c_brk3ph_pa2', endPin: 'c_am_line_p1', points: [{ x: 310, y: 180 }, { x: 325, y: 180 }] },
      { id: 'w3_am_out', startPin: 'c_am_line_p2', endPin: 'c_tline_p1', points: [{ x: 395, y: 180 }, { x: 405, y: 200 }] },
      { id: 'w4', startPin: 'c_tline_p2', endPin: 'c_fault_pa', points: [{ x: 495, y: 200 }, { x: 580, y: 185 }] },
      { id: 'w5', startPin: 'c_fault_pg', endPin: 'c_gnd_fault_p1', points: [{ x: 660, y: 200 }, { x: 700, y: 200 }, { x: 700, y: 240 }] },
      { id: 'w6', startPin: 'c_fault_pa', endPin: 'c_vm_recv_p1', points: [{ x: 580, y: 185 }, { x: 780, y: 145 }] },
      { id: 'w7', startPin: 'c_vm_recv_p2', endPin: 'c_load_r_p1', points: [{ x: 780, y: 215 }, { x: 780, y: 220 }] },
      { id: 'w8', startPin: 'c_load_r_p2', endPin: 'c_gnd_load_p1', points: [{ x: 780, y: 300 }, { x: 780, y: 320 }] }
    ]
  },
  RUNTIME_CONTROLS_STUDY: {
    name: 'Interactive_Runtime_Controls_Study',
    category: 'Controls & Automation',
    description: 'Interactive schematic workbench featuring on-canvas sliders and rotary dials modulating AC voltage, frequency, and variable load resistance live during continuous EMTDC simulation execution.',
    version: '1.0',
    dt: 5e-5,
    tMax: 2.0,
    components: [
      {
        id: 'c_src_ac',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'AC_Supply_230V',
        params: { voltage: 230, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_am_line',
        type: COMPONENT_TYPES.AMMETER,
        x: 240,
        y: 160,
        rotation: 0,
        name: 'I_Load_Meter',
        params: { signalName: 'I_Load', unit: 'A', monitored: true }
      },
      {
        id: 'c_load_r',
        type: COMPONENT_TYPES.RESISTOR,
        x: 360,
        y: 200,
        rotation: 0,
        name: 'R_Load_Modulated',
        params: { resistance: 50.0 }
      },
      {
        id: 'c_gnd_load',
        type: COMPONENT_TYPES.GROUND,
        x: 360,
        y: 280,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_vm_load',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 480,
        y: 200,
        rotation: 0,
        name: 'V_Load_Meter',
        params: { signalName: 'V_Load', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm',
        type: COMPONENT_TYPES.GROUND,
        x: 480,
        y: 280,
        rotation: 0,
        name: 'GND_VM',
        params: {}
      },
      {
        id: 'c_slider_r',
        type: COMPONENT_TYPES.RUNTIME_SLIDER,
        x: 180,
        y: 380,
        rotation: 0,
        name: 'Load_R_Slider',
        params: {
          label: 'Load Resistance',
          minValue: 10,
          maxValue: 200,
          step: 5,
          defaultValue: 50,
          value: 50,
          unitLabel: 'Ω',
          targetCompId: 'c_load_r',
          targetParam: 'resistance',
          accentColor: '#00e5ff'
        }
      },
      {
        id: 'c_dial_freq',
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        x: 340,
        y: 380,
        rotation: 0,
        name: 'Freq_Dial',
        params: {
          label: 'Source Freq',
          minValue: 40,
          maxValue: 80,
          step: 1,
          defaultValue: 60,
          value: 60,
          unitLabel: 'Hz',
          targetCompId: 'c_src_ac',
          targetParam: 'freq',
          accentColor: '#38bdf8'
        }
      },
      {
        id: 'c_dial_volt',
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        x: 480,
        y: 380,
        rotation: 0,
        name: 'Volt_Dial',
        params: {
          label: 'Source Voltage',
          minValue: 100,
          maxValue: 400,
          step: 10,
          defaultValue: 230,
          value: 230,
          unitLabel: 'V',
          targetCompId: 'c_src_ac',
          targetParam: 'voltage',
          accentColor: '#10b981'
        }
      },
      {
        id: 'c_scope_frame',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 640,
        y: 120,
        rotation: 0,
        name: 'Live_Waveforms',
        params: {
          graphTitle: 'Live Telemetry: Voltage & Current',
          graphWidth: 420,
          graphHeight: 240,
          traces: [
            {
              id: 'tr_v',
              signalName: 'V_Load',
              probeId: 'c_vm_load',
              probeType: 'voltmeter',
              label: 'V_Load',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i',
              signalName: 'I_Load',
              probeId: 'c_am_line',
              probeType: 'ammeter',
              label: 'I_Load',
              unit: 'A',
              color: '#ff4081',
              visible: true,
              gain: 1.0,
              offset: 0
            }
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
          graphShowCrosshair: true
        }
      }
    ],
    wires: [
      { id: 'w_src_am', startPin: 'c_src_ac_p1', endPin: 'c_am_line_p1', points: [{ x: 120, y: 160 }, { x: 205, y: 160 }] },
      { id: 'w_src_gnd', startPin: 'c_src_ac_p2', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w_am_load', startPin: 'c_am_line_p2', endPin: 'c_load_r_p1', points: [{ x: 275, y: 160 }, { x: 360, y: 160 }] },
      { id: 'w_load_gnd', startPin: 'c_load_r_p2', endPin: 'c_gnd_load_p1', points: [{ x: 360, y: 240 }, { x: 360, y: 260 }] },
      { id: 'w_tap_vm', startPin: 'c_load_r_p1', endPin: 'c_vm_load_p1', points: [{ x: 360, y: 160 }, { x: 480, y: 160 }] },
      { id: 'w_vm_gnd', startPin: 'c_vm_load_p2', endPin: 'c_gnd_vm_p1', points: [{ x: 480, y: 240 }, { x: 480, y: 260 }] }
    ]
  },
  RUNTIME_SWITCHES_STUDY: {
    name: 'Interactive_Switches_Breakers_Study',
    category: 'Controls & Automation',
    description: 'Interactive schematic featuring on-canvas toggle switches and momentary push buttons modulating transmission line breaker status (OPEN/CLOSED) and triggering live CDA switching events during continuous EMTDC simulation.',
    version: '1.0',
    dt: 5e-5,
    tMax: 2.0,
    components: [
      {
        id: 'c_src_grid',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 200,
        rotation: 0,
        name: 'AC_Grid_230V',
        params: { voltage: 230, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_src',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 280,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_am_feeder',
        type: COMPONENT_TYPES.AMMETER,
        x: 230,
        y: 160,
        rotation: 0,
        name: 'I_Feeder_Meter',
        params: { signalName: 'I_Feeder', unit: 'A', monitored: true }
      },
      {
        id: 'c_breaker_main',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 350,
        y: 160,
        rotation: 0,
        name: 'CB_Main',
        params: { initClosed: true, Ron: 0.001, Roff: 1e7 }
      },
      {
        id: 'c_load_feeder',
        type: COMPONENT_TYPES.RESISTOR,
        x: 470,
        y: 200,
        rotation: 0,
        name: 'R_Feeder_Load',
        params: { resistance: 20.0 }
      },
      {
        id: 'c_gnd_load',
        type: COMPONENT_TYPES.GROUND,
        x: 470,
        y: 280,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_vm_load',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 550,
        y: 200,
        rotation: 0,
        name: 'V_Load_Meter',
        params: { signalName: 'V_Load', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm',
        type: COMPONENT_TYPES.GROUND,
        x: 550,
        y: 280,
        rotation: 0,
        name: 'GND_VM',
        params: {}
      },
      {
        id: 'c_sw_breaker',
        type: COMPONENT_TYPES.RUNTIME_SWITCH,
        x: 160,
        y: 380,
        rotation: 0,
        name: 'Breaker_Rocker',
        params: {
          label: 'Breaker Control',
          switchState: true,
          isClosed: true,
          onLabel: 'CLOSED',
          offLabel: 'OPEN',
          onColor: '#10b981',
          offColor: '#ef4444',
          targetCompId: 'c_breaker_main',
          targetParam: 'isClosed'
        }
      },
      {
        id: 'c_btn_trip',
        type: COMPONENT_TYPES.RUNTIME_BUTTON,
        x: 280,
        y: 380,
        rotation: 0,
        name: 'Trip_Button',
        params: {
          label: 'Emergency Trip',
          sublabel: 'MOMENTARY',
          mode: 'momentary',
          buttonState: false,
          accentColor: '#ef4444',
          targetCompId: 'c_breaker_main',
          targetParam: 'isClosed'
        }
      },
      {
        id: 'c_btn_close',
        type: COMPONENT_TYPES.RUNTIME_BUTTON,
        x: 400,
        y: 380,
        rotation: 0,
        name: 'Close_Button',
        params: {
          label: 'Manual Close',
          sublabel: 'MOMENTARY',
          mode: 'momentary',
          buttonState: false,
          accentColor: '#10b981',
          targetCompId: 'c_breaker_main',
          targetParam: 'isClosed'
        }
      },
      {
        id: 'c_scope_switches',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 640,
        y: 120,
        rotation: 0,
        name: 'Live_Breaker_Scope',
        params: {
          graphTitle: 'Feeder Voltage & Current Telemetry',
          graphWidth: 440,
          graphHeight: 250,
          traces: [
            {
              id: 'tr_v_load',
              signalName: 'V_Load',
              probeId: 'c_vm_load',
              probeType: 'voltmeter',
              label: 'V_Load',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_feeder',
              signalName: 'I_Feeder',
              probeId: 'c_am_feeder',
              probeType: 'ammeter',
              label: 'I_Feeder',
              unit: 'A',
              color: '#10b981',
              visible: true,
              gain: 1.0,
              offset: 0
            }
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
          graphShowCrosshair: true
        }
      }
    ],
    wires: [
      { id: 'w_src_am', startPin: 'c_src_grid_p1', endPin: 'c_am_feeder_p1', points: [{ x: 120, y: 160 }, { x: 195, y: 160 }] },
      { id: 'w_src_gnd', startPin: 'c_src_grid_p2', endPin: 'c_gnd_src_p1', points: [{ x: 120, y: 240 }, { x: 120, y: 260 }] },
      { id: 'w_am_brk', startPin: 'c_am_feeder_p2', endPin: 'c_breaker_main_p1', points: [{ x: 265, y: 160 }, { x: 315, y: 160 }] },
      { id: 'w_brk_load', startPin: 'c_breaker_main_p2', endPin: 'c_load_feeder_p1', points: [{ x: 385, y: 160 }, { x: 470, y: 160 }] },
      { id: 'w_load_gnd', startPin: 'c_load_feeder_p2', endPin: 'c_gnd_load_p1', points: [{ x: 470, y: 240 }, { x: 470, y: 260 }] },
      { id: 'w_tap_vm', startPin: 'c_load_feeder_p1', endPin: 'c_vm_load_p1', points: [{ x: 470, y: 160 }, { x: 550, y: 160 }] },
      { id: 'w_vm_gnd', startPin: 'c_vm_load_p2', endPin: 'c_gnd_vm_p1', points: [{ x: 550, y: 240 }, { x: 550, y: 260 }] }
    ]
  },
  RUNTIME_METERS_STUDY: {
    name: 'Live_Dynamic_Meters_Study',
    category: 'Controls & Automation',
    description: 'Real-time instrumentation workbench featuring an on-schematic sweeping needle analog gauge with color-coded operating zones (Green/Amber/Red) and peak hold pointer, alongside a multi-quantity OLED digital LED monitoring badge displaying live RMS voltage, current, active power (P), and reactive power (Q) dynamically modulated via an on-canvas load slider.',
    version: '1.0',
    dt: 5e-5,
    tMax: 2.0,
    components: [
      {
        id: 'c_src_ac_m',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 180,
        rotation: 0,
        name: 'AC_Supply_230V',
        params: { voltage: 230, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_src_m',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 260,
        rotation: 0,
        name: 'GND_Src',
        params: {}
      },
      {
        id: 'c_am_line_m',
        type: COMPONENT_TYPES.AMMETER,
        x: 230,
        y: 140,
        rotation: 0,
        name: 'I_Load_Ammeter',
        params: { signalName: 'I_Load', unit: 'A', monitored: true }
      },
      {
        id: 'c_load_r_m',
        type: COMPONENT_TYPES.RESISTOR,
        x: 350,
        y: 180,
        rotation: 0,
        name: 'R_Load_Modulated',
        params: { resistance: 50.0 }
      },
      {
        id: 'c_gnd_load_m',
        type: COMPONENT_TYPES.GROUND,
        x: 350,
        y: 260,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_vm_bus_m',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 470,
        y: 180,
        rotation: 0,
        name: 'V_Bus_Voltmeter',
        params: { signalName: 'V_Bus', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm_m',
        type: COMPONENT_TYPES.GROUND,
        x: 470,
        y: 260,
        rotation: 0,
        name: 'GND_VM',
        params: {}
      },
      {
        id: 'c_gauge_volt',
        type: COMPONENT_TYPES.RUNTIME_GAUGE,
        x: 170,
        y: 360,
        rotation: 0,
        name: 'Analog_Volt_Gauge',
        params: {
          label: 'Feeder Voltage (V)',
          minValue: 0,
          maxValue: 300,
          unitLabel: 'V',
          targetSignal: 'V_Bus',
          normalZoneMax: 0.70,
          warningZoneMax: 0.85,
          measurementType: 'rms',
          showPeakHold: true,
          needleColor: '#f43f5e',
          peakColor: '#f97316'
        }
      },
      {
        id: 'c_display_pq',
        type: COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY,
        x: 350,
        y: 360,
        rotation: 0,
        name: 'Substation_PQV_Badge',
        params: {
          label: 'Feeder Metrics (PQV)',
          mode: 'multimeter_4row',
          targetVoltageSignal: 'V_Bus',
          targetCurrentSignal: 'I_Load',
          accentColor: '#38bdf8'
        }
      },
      {
        id: 'c_slider_load_m',
        type: COMPONENT_TYPES.RUNTIME_SLIDER,
        x: 520,
        y: 360,
        rotation: 0,
        name: 'Load_R_Slider',
        params: {
          label: 'Load Resistance',
          minValue: 10,
          maxValue: 200,
          step: 5,
          defaultValue: 50,
          value: 50,
          unitLabel: 'Ω',
          targetCompId: 'c_load_r_m',
          targetParam: 'resistance',
          accentColor: '#00e5ff'
        }
      },
      {
        id: 'c_scope_meters',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 680,
        y: 120,
        rotation: 0,
        name: 'Live_Waveforms',
        params: {
          graphTitle: 'Live Feeder Telemetry: Voltage & Current',
          graphWidth: 440,
          graphHeight: 250,
          traces: [
            {
              id: 'tr_v_bus',
              signalName: 'V_Bus',
              probeId: 'c_vm_bus_m',
              probeType: 'voltmeter',
              label: 'V_Bus',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_load',
              signalName: 'I_Load',
              probeId: 'c_am_line_m',
              probeType: 'ammeter',
              label: 'I_Load',
              unit: 'A',
              color: '#10b981',
              visible: true,
              gain: 1.0,
              offset: 0
            }
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
          graphShowCrosshair: true
        }
      }
    ],
    wires: [
      { id: 'wm_1', startPin: 'c_src_ac_m_p1', endPin: 'c_am_line_m_p1', points: [{ x: 120, y: 140 }, { x: 195, y: 140 }] },
      { id: 'wm_2', startPin: 'c_src_ac_m_p2', endPin: 'c_gnd_src_m_p1', points: [{ x: 120, y: 220 }, { x: 120, y: 240 }] },
      { id: 'wm_3', startPin: 'c_am_line_m_p2', endPin: 'c_load_r_m_p1', points: [{ x: 265, y: 140 }, { x: 350, y: 140 }] },
      { id: 'wm_4', startPin: 'c_load_r_m_p2', endPin: 'c_gnd_load_m_p1', points: [{ x: 350, y: 220 }, { x: 350, y: 240 }] },
      { id: 'wm_5', startPin: 'c_load_r_m_p1', endPin: 'c_vm_bus_m_p1', points: [{ x: 350, y: 140 }, { x: 470, y: 140 }] },
      { id: 'wm_6', startPin: 'c_vm_bus_m_p2', endPin: 'c_gnd_vm_m_p1', points: [{ x: 470, y: 220 }, { x: 470, y: 240 }] }
    ]
  },
  RUNTIME_MUTATOR_STUDY: {
    name: 'Live_State_Mutator_Bridge_Study',
    category: 'Controls & Automation',
    description: 'Real-time EMTDC simulation state mutator workbench featuring live continuous frequency and voltage rotary dials modulating an AC synchronous generator without phase jumps, an adjustable load resistance slider with Sherman-Morrison rank-1 matrix updates, a toggle switch for feeder breaker control, live analog sweeping gauge, and embedded PolyGraph waveforms.',
    version: '1.0',
    dt: 5e-5,
    tMax: 5.0,
    components: [
      {
        id: 'c_gen_ac',
        type: COMPONENT_TYPES.AC_SOURCE_1PH,
        x: 120,
        y: 180,
        rotation: 0,
        name: 'Gen_Supply_230V',
        params: { voltage: 230, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_gen',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 260,
        rotation: 0,
        name: 'GND_Gen',
        params: {}
      },
      {
        id: 'c_am_line',
        type: COMPONENT_TYPES.AMMETER,
        x: 230,
        y: 140,
        rotation: 0,
        name: 'I_Feeder_Ammeter',
        params: { signalName: 'I_Gen', unit: 'A', monitored: true }
      },
      {
        id: 'c_brk_feeder',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 340,
        y: 140,
        rotation: 0,
        name: 'Feeder_Breaker',
        params: { initClosed: true, Ron: 0.001, Roff: 1e7 }
      },
      {
        id: 'c_load_r_mut',
        type: COMPONENT_TYPES.RESISTOR,
        x: 460,
        y: 180,
        rotation: 0,
        name: 'R_Load_Dynamic',
        params: { resistance: 50.0 }
      },
      {
        id: 'c_gnd_load_mut',
        type: COMPONENT_TYPES.GROUND,
        x: 460,
        y: 260,
        rotation: 0,
        name: 'GND_Load',
        params: {}
      },
      {
        id: 'c_vm_bus_mut',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 570,
        y: 180,
        rotation: 0,
        name: 'V_Terminal_Voltmeter',
        params: { signalName: 'V_Gen', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm_mut',
        type: COMPONENT_TYPES.GROUND,
        x: 570,
        y: 260,
        rotation: 0,
        name: 'GND_VM',
        params: {}
      },
      {
        id: 'c_dial_freq_ctrl',
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        x: 140,
        y: 370,
        rotation: 0,
        name: 'Grid_Freq_Dial',
        params: {
          label: 'Grid Frequency',
          minValue: 40,
          maxValue: 80,
          step: 0.5,
          defaultValue: 60,
          value: 60,
          unitLabel: 'Hz',
          targetCompId: 'c_gen_ac',
          targetParam: 'freq',
          accentColor: '#38bdf8'
        }
      },
      {
        id: 'c_dial_volt_ctrl',
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        x: 260,
        y: 370,
        rotation: 0,
        name: 'Terminal_V_Dial',
        params: {
          label: 'Terminal Voltage',
          minValue: 100,
          maxValue: 400,
          step: 5,
          defaultValue: 230,
          value: 230,
          unitLabel: 'V',
          targetCompId: 'c_gen_ac',
          targetParam: 'voltage',
          accentColor: '#00e5ff'
        }
      },
      {
        id: 'c_slider_load_ctrl',
        type: COMPONENT_TYPES.RUNTIME_SLIDER,
        x: 400,
        y: 370,
        rotation: 0,
        name: 'Load_R_Slider',
        params: {
          label: 'Load Resistance',
          minValue: 10,
          maxValue: 200,
          step: 5,
          defaultValue: 50,
          value: 50,
          unitLabel: 'Ω',
          targetCompId: 'c_load_r_mut',
          targetParam: 'resistance',
          accentColor: '#10b981'
        }
      },
      {
        id: 'c_sw_brk_ctrl',
        type: COMPONENT_TYPES.RUNTIME_SWITCH,
        x: 530,
        y: 370,
        rotation: 0,
        name: 'Breaker_Switch',
        params: {
          label: 'Feeder Breaker',
          switchState: true,
          isClosed: true,
          onLabel: 'CLOSED',
          offLabel: 'OPEN',
          targetCompId: 'c_brk_feeder',
          targetParam: 'isClosed'
        }
      },
      {
        id: 'c_gauge_v_mut',
        type: COMPONENT_TYPES.RUNTIME_GAUGE,
        x: 650,
        y: 370,
        rotation: 0,
        name: 'Gen_Volt_Gauge',
        params: {
          label: 'Gen RMS Voltage (V)',
          minValue: 0,
          maxValue: 450,
          unitLabel: 'V',
          targetSignal: 'V_Gen',
          normalZoneMax: 0.70,
          warningZoneMax: 0.85,
          measurementType: 'rms',
          showPeakHold: true,
          needleColor: '#f43f5e',
          peakColor: '#f97316'
        }
      },
      {
        id: 'c_scope_mutator',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 750,
        y: 120,
        rotation: 0,
        name: 'Live_Mutator_Scope',
        params: {
          graphTitle: 'Real-Time Frequency & Amplitude Modulator Telemetry',
          graphWidth: 480,
          graphHeight: 260,
          traces: [
            {
              id: 'tr_v_gen',
              signalName: 'V_Gen',
              probeId: 'c_vm_bus_mut',
              probeType: 'voltmeter',
              label: 'V_Gen',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_gen',
              signalName: 'I_Gen',
              probeId: 'c_am_line',
              probeType: 'ammeter',
              label: 'I_Gen',
              unit: 'A',
              color: '#10b981',
              visible: true,
              gain: 1.0,
              offset: 0
            }
          ],
          graphAutoScale: true,
          graphShowGrid: true,
          graphShowLegend: true,
          graphShowCrosshair: true
        }
      }
    ],
    wires: [
      { id: 'wmut_1', startPin: 'c_gen_ac_p1', endPin: 'c_am_line_p1', points: [{ x: 120, y: 140 }, { x: 195, y: 140 }] },
      { id: 'wmut_2', startPin: 'c_gen_ac_p2', endPin: 'c_gnd_gen_p1', points: [{ x: 120, y: 220 }, { x: 120, y: 240 }] },
      { id: 'wmut_3', startPin: 'c_am_line_p2', endPin: 'c_brk_feeder_p1', points: [{ x: 265, y: 140 }, { x: 305, y: 140 }] },
      { id: 'wmut_4', startPin: 'c_brk_feeder_p2', endPin: 'c_load_r_mut_p1', points: [{ x: 375, y: 140 }, { x: 460, y: 140 }] },
      { id: 'wmut_5', startPin: 'c_load_r_mut_p2', endPin: 'c_gnd_load_mut_p1', points: [{ x: 460, y: 220 }, { x: 460, y: 240 }] },
      { id: 'wmut_6', startPin: 'c_load_r_mut_p1', endPin: 'c_vm_bus_mut_p1', points: [{ x: 460, y: 140 }, { x: 570, y: 140 }] },
      { id: 'wmut_7', startPin: 'c_vm_bus_mut_p2', endPin: 'c_gnd_vm_mut_p1', points: [{ x: 570, y: 220 }, { x: 570, y: 240 }] }
    ]
  }
};




