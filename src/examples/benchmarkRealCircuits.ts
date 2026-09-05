/**
 * PSCAD CLONE - Industrial Flagship Real-Life Benchmark Circuits
 * 
 * Includes:
 * 1. IEEE 9-Bus WSCC Multi-Machine Transmission Grid Benchmark
 * 2. CIGRÉ B4 Multi-Terminal MMC-HVDC Offshore Supergrid Benchmark
 * 3. 13.8 kV / 480 V Hybrid Industrial Microgrid with BESS, Solar PV & Islanding Benchmark
 * 4. 115 kV / 13.8 kV Dual-Feeder Utility Substation with ANSI 87T/51/21 Protection Benchmark
 */

import { COMPONENT_TYPES } from '../constants';
import type { CircuitProject } from '../types';

export const BENCHMARK_REAL_CIRCUITS: Record<string, CircuitProject & { category: string; description: string }> = {
  IEEE_9BUS_WSCC_GRID: {
    name: 'IEEE_9Bus_WSCC_MultiMachine_Grid',
    category: 'Transmission & Grids',
    description: 'Anderson-Fouad Western System Coordinating Council (WSCC) 9-bus benchmark system. Features 3 multi-machine generating stations (G1: Hydro 16.5 kV, G2: Steam 18 kV, G3: Gas 13.8 kV) stepped up via GSU transformers to 230 kV across 6 high-voltage transmission corridors (Lines 4-5, 5-6, 7-8, 8-9, 9-4, 7-5) serving 3 major industrial/urban load centers (Bus 5: 125 MW, Bus 6: 90 MW, Bus 8: 100 MW). A 3-phase fault at Bus 7 is cleared by high-speed breaker tripping, demonstrating rotor angle oscillations and inter-area power swings.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.6,
    components: [
      // ----------------------------------------------------
      // Generating Station 1 (Slack Bus / Hydro Station)
      // ----------------------------------------------------
      {
        id: 'c_g1',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 120,
        y: 180,
        rotation: 0,
        name: 'G1_Hydro_16.5kV',
        params: { voltage: 16500, freq: 60, internalRs: 0.02, rampTime: 0.01 }
      },
      {
        id: 'c_gnd_g1',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 260,
        rotation: 0,
        name: 'GND_G1',
        params: {}
      },
      {
        id: 'c_vm_g1',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 120,
        y: 80,
        rotation: 0,
        name: 'V_Gen1_Terminal',
        params: { signalName: 'V_Gen1_Terminal', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm1',
        type: COMPONENT_TYPES.GROUND,
        x: 120,
        y: 135,
        rotation: 0,
        name: 'GND_VM1',
        params: {}
      },
      // GSU Transformer 1 (16.5 kV / 230 kV, 250 MVA, Dyn1)
      {
        id: 'c_t1',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 260,
        y: 180,
        rotation: 0,
        name: 'GSU_T1_16.5_230kV',
        params: { V1_nom: 16500, V2_nom: 230000, MVA_rating: 250, coreType: '3_limb', primaryConn: 'Delta', secondaryConn: 'Yg' }
      },
      {
        id: 'c_gnd_t1',
        type: COMPONENT_TYPES.GROUND,
        x: 305,
        y: 260,
        rotation: 0,
        name: 'GND_T1',
        params: {}
      },

      // ----------------------------------------------------
      // Bus 4 & Feeder Breaker
      // ----------------------------------------------------
      {
        id: 'c_brk_b4',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 390,
        y: 180,
        rotation: 0,
        name: 'Breaker_Bus4',
        params: { initClosed: true, Ron: 0.001 }
      },

      // ----------------------------------------------------
      // Transmission Line 4-5 (85 km) & Bus 5 Load Center (125 MW)
      // ----------------------------------------------------
      {
        id: 'c_line_4_5',
        type: COMPONENT_TYPES.PI_LINE,
        x: 520,
        y: 160,
        rotation: 0,
        name: 'Line_4_5_85km',
        params: { lengthKm: 85, R_per_km: 0.032, L_per_km: 0.00105, C_per_km: 0.011e-6 }
      },
      {
        id: 'c_load_b5',
        type: COMPONENT_TYPES.RESISTOR,
        x: 565,
        y: 240,
        rotation: 90,
        name: 'Load_Bus5_125MW',
        params: { resistance: 423.0, monitored: true }
      },
      {
        id: 'c_gnd_b5',
        type: COMPONENT_TYPES.GROUND,
        x: 565,
        y: 320,
        rotation: 0,
        name: 'GND_Bus5',
        params: {}
      },

      // ----------------------------------------------------
      // Transmission Line 5-6 (90 km) & Bus 6 Load Center (90 MW)
      // ----------------------------------------------------
      {
        id: 'c_line_5_6',
        type: COMPONENT_TYPES.PI_LINE,
        x: 670,
        y: 160,
        rotation: 0,
        name: 'Line_5_6_90km',
        params: { lengthKm: 90, R_per_km: 0.035, L_per_km: 0.0011, C_per_km: 0.0115e-6 }
      },
      {
        id: 'c_load_b6',
        type: COMPONENT_TYPES.RESISTOR,
        x: 715,
        y: 240,
        rotation: 90,
        name: 'Load_Bus6_90MW',
        params: { resistance: 587.0, monitored: true }
      },
      {
        id: 'c_gnd_b6',
        type: COMPONENT_TYPES.GROUND,
        x: 715,
        y: 320,
        rotation: 0,
        name: 'GND_Bus6',
        params: {}
      },

      // ----------------------------------------------------
      // Generating Station 2 (Steam Turbine / Synchronous Machine)
      // ----------------------------------------------------
      {
        id: 'c_g2',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 860,
        y: 180,
        rotation: 0,
        name: 'G2_Steam_18kV',
        params: { voltage: 18000, freq: 60, internalRs: 0.025, rampTime: 0.01, phaseDeg: -5.0 }
      },
      {
        id: 'c_gnd_g2',
        type: COMPONENT_TYPES.GROUND,
        x: 860,
        y: 260,
        rotation: 0,
        name: 'GND_G2',
        params: {}
      },
      {
        id: 'c_vm_g2',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 860,
        y: 80,
        rotation: 0,
        name: 'V_Gen2_Terminal',
        params: { signalName: 'V_Gen2_Terminal', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm2',
        type: COMPONENT_TYPES.GROUND,
        x: 860,
        y: 135,
        rotation: 0,
        name: 'GND_VM2',
        params: {}
      },
      // GSU Transformer 2 (18 kV / 230 kV, 200 MVA)
      {
        id: 'c_t2',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 980,
        y: 180,
        rotation: 0,
        name: 'GSU_T2_18_230kV',
        params: { V1_nom: 18000, V2_nom: 230000, MVA_rating: 200, coreType: '3_limb', primaryConn: 'Delta', secondaryConn: 'Yg' }
      },
      {
        id: 'c_gnd_t2',
        type: COMPONENT_TYPES.GROUND,
        x: 1025,
        y: 260,
        rotation: 0,
        name: 'GND_T2',
        params: {}
      },

      // ----------------------------------------------------
      // Bus 7 Substation & Fault Block
      // ----------------------------------------------------
      {
        id: 'c_vm_b7',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 1060,
        y: 80,
        rotation: 0,
        name: 'V_Bus7_230kV',
        params: { signalName: 'V_Bus7_230kV', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm7',
        type: COMPONENT_TYPES.GROUND,
        x: 1060,
        y: 135,
        rotation: 0,
        name: 'GND_VM7',
        params: {}
      },
      {
        id: 'c_fault_b7',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 1060,
        y: 260,
        rotation: 0,
        name: 'Fault_Bus7',
        params: { faultType: '3LG', startTime: 0.10, duration: 0.06, faultResistance: 0.02 }
      },
      {
        id: 'c_gnd_flt7',
        type: COMPONENT_TYPES.GROUND,
        x: 1140,
        y: 260,
        rotation: 0,
        name: 'GND_Flt7',
        params: {}
      },
      {
        id: 'c_brk_b7',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 1100,
        y: 180,
        rotation: 0,
        name: 'Breaker_Line78',
        params: { initClosed: true, openTime: 0.16, Ron: 0.001 }
      },
      {
        id: 'c_am_line78',
        type: COMPONENT_TYPES.AMMETER,
        x: 1200,
        y: 160,
        rotation: 0,
        name: 'I_Line78_PhaseA',
        params: { signalName: 'I_Line78_PhaseA', unit: 'A', monitored: true }
      },

      // ----------------------------------------------------
      // Transmission Line 7-8 (100 km) & Bus 8 Load Center (100 MW)
      // ----------------------------------------------------
      {
        id: 'c_line_7_8',
        type: COMPONENT_TYPES.PI_LINE,
        x: 1300,
        y: 160,
        rotation: 0,
        name: 'Line_7_8_100km',
        params: { lengthKm: 100, R_per_km: 0.038, L_per_km: 0.0012, C_per_km: 0.012e-6 }
      },
      {
        id: 'c_load_b8',
        type: COMPONENT_TYPES.RESISTOR,
        x: 1345,
        y: 240,
        rotation: 90,
        name: 'Load_Bus8_100MW',
        params: { resistance: 529.0, monitored: true }
      },
      {
        id: 'c_gnd_b8',
        type: COMPONENT_TYPES.GROUND,
        x: 1345,
        y: 320,
        rotation: 0,
        name: 'GND_Bus8',
        params: {}
      },

      // ----------------------------------------------------
      // Transmission Line 8-9 (110 km)
      // ----------------------------------------------------
      {
        id: 'c_line_8_9',
        type: COMPONENT_TYPES.PI_LINE,
        x: 1450,
        y: 160,
        rotation: 0,
        name: 'Line_8_9_110km',
        params: { lengthKm: 110, R_per_km: 0.036, L_per_km: 0.00115, C_per_km: 0.0118e-6 }
      },

      // ----------------------------------------------------
      // Generating Station 3 (Gas Turbine / Synchronous Machine)
      // ----------------------------------------------------
      {
        id: 'c_t3',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 1600,
        y: 180,
        rotation: 0,
        name: 'GSU_T3_13.8_230kV',
        params: { V1_nom: 13800, V2_nom: 230000, MVA_rating: 150, coreType: '3_limb', primaryConn: 'Delta', secondaryConn: 'Yg' }
      },
      {
        id: 'c_gnd_t3',
        type: COMPONENT_TYPES.GROUND,
        x: 1645,
        y: 260,
        rotation: 0,
        name: 'GND_T3',
        params: {}
      },
      {
        id: 'c_g3',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 1740,
        y: 180,
        rotation: 0,
        name: 'G3_Gas_13.8kV',
        params: { voltage: 13800, freq: 60, internalRs: 0.03, rampTime: 0.01, phaseDeg: 3.5 }
      },
      {
        id: 'c_gnd_g3',
        type: COMPONENT_TYPES.GROUND,
        x: 1740,
        y: 260,
        rotation: 0,
        name: 'GND_G3',
        params: {}
      },
      {
        id: 'c_vm_g3',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 1740,
        y: 80,
        rotation: 0,
        name: 'V_Gen3_Terminal',
        params: { signalName: 'V_Gen3_Terminal', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vm3',
        type: COMPONENT_TYPES.GROUND,
        x: 1740,
        y: 135,
        rotation: 0,
        name: 'GND_VM3',
        params: {}
      },

      // ----------------------------------------------------
      // Transmission Loop Tie-Line 9-4 (95 km)
      // ----------------------------------------------------
      {
        id: 'c_line_9_4',
        type: COMPONENT_TYPES.PI_LINE,
        x: 1000,
        y: 400,
        rotation: 0,
        name: 'TieLine_9_4_95km',
        params: { lengthKm: 95, R_per_km: 0.034, L_per_km: 0.0011, C_per_km: 0.011e-6 }
      },

      // ----------------------------------------------------
      // PolyGraph Telemetry Overlay Frame
      // ----------------------------------------------------
      {
        id: 'c_polygraph_wscc',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 1240,
        y: 380,
        rotation: 0,
        name: 'PolyGraph_WSCC_Telemetry',
        params: {
          graphTitle: 'IEEE 9-Bus WSCC Multi-Machine Transient Telemetry',
          graphWidth: 520,
          graphHeight: 300,
          traces: [
            {
              id: 'tr_vg1',
              signalName: 'V_Gen1_Terminal',
              probeId: 'c_vm_g1',
              probeType: 'voltmeter',
              label: 'V_G1 (16.5kV)',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_vg2',
              signalName: 'V_Gen2_Terminal',
              probeId: 'c_vm_g2',
              probeType: 'voltmeter',
              label: 'V_G2 (18kV)',
              unit: 'V',
              color: '#10b981',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_vg3',
              signalName: 'V_Gen3_Terminal',
              probeId: 'c_vm_g3',
              probeType: 'voltmeter',
              label: 'V_G3 (13.8kV)',
              unit: 'V',
              color: '#f59e0b',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_vb7',
              signalName: 'V_Bus7_230kV',
              probeId: 'c_vm_b7',
              probeType: 'voltmeter',
              label: 'V_Bus7 (230kV)',
              unit: 'V',
              color: '#ef4444',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_il78',
              signalName: 'I_Line78_PhaseA',
              probeId: 'c_am_line78',
              probeType: 'ammeter',
              label: 'I_Line78',
              unit: 'A',
              color: '#a855f7',
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
      // Gen 1 to T1 & VM1
      { id: 'w_g1_pa', startPin: 'c_g1_pa', endPin: 'c_t1_pa', points: [{ x: 102, y: 140 }, { x: 215, y: 160 }] },
      { id: 'w_g1_pb', startPin: 'c_g1_pb', endPin: 'c_t1_pb', points: [{ x: 120, y: 140 }, { x: 215, y: 180 }] },
      { id: 'w_g1_pc', startPin: 'c_g1_pc', endPin: 'c_t1_pc', points: [{ x: 138, y: 140 }, { x: 215, y: 200 }] },
      { id: 'w_g1_pn', startPin: 'c_g1_pn', endPin: 'c_gnd_g1_p1', points: [{ x: 120, y: 220 }, { x: 120, y: 240 }] },
      { id: 'w_vm1_p1', startPin: 'c_g1_pa', endPin: 'c_vm_g1_p1', points: [{ x: 102, y: 140 }, { x: 120, y: 45 }] },
      { id: 'w_vm1_p2', startPin: 'c_vm_g1_p2', endPin: 'c_gnd_vm1_p1', points: [{ x: 120, y: 115 }, { x: 120, y: 115 }] },

      // T1 Secondary to Bus 4 Breaker
      { id: 'w_t1_sa', startPin: 'c_t1_sa', endPin: 'c_brk_b4_pa1', points: [{ x: 305, y: 160 }, { x: 350, y: 160 }] },
      { id: 'w_t1_sb', startPin: 'c_t1_sb', endPin: 'c_brk_b4_pb1', points: [{ x: 305, y: 180 }, { x: 350, y: 180 }] },
      { id: 'w_t1_sc', startPin: 'c_t1_sc', endPin: 'c_brk_b4_pc1', points: [{ x: 305, y: 200 }, { x: 350, y: 200 }] },
      { id: 'w_t1_sn', startPin: 'c_t1_sn', endPin: 'c_gnd_t1_p1', points: [{ x: 305, y: 215 }, { x: 305, y: 240 }] },

      // Bus 4 Breaker to Line 4-5 & TieLine 9-4
      { id: 'w_b4_l45', startPin: 'c_brk_b4_pa2', endPin: 'c_line_4_5_p1', points: [{ x: 430, y: 160 }, { x: 475, y: 160 }] },
      { id: 'w_b4_l94', startPin: 'c_brk_b4_pa2', endPin: 'c_line_9_4_p1', points: [{ x: 430, y: 160 }, { x: 955, y: 400 }] },

      // Line 4-5 to Load Bus 5 & Line 5-6
      { id: 'w_l45_ld5', startPin: 'c_line_4_5_p2', endPin: 'c_load_b5_p1', points: [{ x: 565, y: 160 }, { x: 565, y: 200 }] },
      { id: 'w_ld5_gnd', startPin: 'c_load_b5_p2', endPin: 'c_gnd_b5_p1', points: [{ x: 565, y: 280 }, { x: 565, y: 300 }] },
      { id: 'w_l45_l56', startPin: 'c_line_4_5_p2', endPin: 'c_line_5_6_p1', points: [{ x: 565, y: 160 }, { x: 625, y: 160 }] },

      // Line 5-6 to Load Bus 6
      { id: 'w_l56_ld6', startPin: 'c_line_5_6_p2', endPin: 'c_load_b6_p1', points: [{ x: 715, y: 160 }, { x: 715, y: 200 }] },
      { id: 'w_ld6_gnd', startPin: 'c_load_b6_p2', endPin: 'c_gnd_b6_p1', points: [{ x: 715, y: 280 }, { x: 715, y: 300 }] },

      // Gen 2 to T2 & VM2
      { id: 'w_g2_pa', startPin: 'c_g2_pa', endPin: 'c_t2_pa', points: [{ x: 842, y: 140 }, { x: 935, y: 160 }] },
      { id: 'w_g2_pb', startPin: 'c_g2_pb', endPin: 'c_t2_pb', points: [{ x: 860, y: 140 }, { x: 935, y: 180 }] },
      { id: 'w_g2_pc', startPin: 'c_g2_pc', endPin: 'c_t2_pc', points: [{ x: 878, y: 140 }, { x: 935, y: 200 }] },
      { id: 'w_g2_pn', startPin: 'c_g2_pn', endPin: 'c_gnd_g2_p1', points: [{ x: 860, y: 220 }, { x: 860, y: 240 }] },
      { id: 'w_vm2_p1', startPin: 'c_g2_pa', endPin: 'c_vm_g2_p1', points: [{ x: 842, y: 140 }, { x: 860, y: 45 }] },
      { id: 'w_vm2_p2', startPin: 'c_vm_g2_p2', endPin: 'c_gnd_vm2_p1', points: [{ x: 860, y: 115 }, { x: 860, y: 115 }] },

      // T2 Secondary to Bus 7 (VM7, Fault, Breaker 7-8)
      { id: 'w_t2_sa', startPin: 'c_t2_sa', endPin: 'c_brk_b7_pa1', points: [{ x: 1025, y: 160 }, { x: 1060, y: 160 }] },
      { id: 'w_t2_sb', startPin: 'c_t2_sb', endPin: 'c_brk_b7_pb1', points: [{ x: 1025, y: 180 }, { x: 1060, y: 180 }] },
      { id: 'w_t2_sc', startPin: 'c_t2_sc', endPin: 'c_brk_b7_pc1', points: [{ x: 1025, y: 200 }, { x: 1060, y: 200 }] },
      { id: 'w_t2_sn', startPin: 'c_t2_sn', endPin: 'c_gnd_t2_p1', points: [{ x: 1025, y: 215 }, { x: 1025, y: 240 }] },
      { id: 'w_b7_vm', startPin: 'c_t2_sa', endPin: 'c_vm_b7_p1', points: [{ x: 1025, y: 160 }, { x: 1060, y: 45 }] },
      { id: 'w_vm7_gnd', startPin: 'c_vm_b7_p2', endPin: 'c_gnd_vm7_p1', points: [{ x: 1060, y: 115 }, { x: 1060, y: 115 }] },
      { id: 'w_b7_flt_a', startPin: 'c_t2_sa', endPin: 'c_fault_b7_pa', points: [{ x: 1025, y: 160 }, { x: 1020, y: 245 }] },
      { id: 'w_b7_flt_b', startPin: 'c_t2_sb', endPin: 'c_fault_b7_pb', points: [{ x: 1025, y: 180 }, { x: 1020, y: 260 }] },
      { id: 'w_b7_flt_c', startPin: 'c_t2_sc', endPin: 'c_fault_b7_pc', points: [{ x: 1025, y: 200 }, { x: 1020, y: 275 }] },
      { id: 'w_flt7_gnd', startPin: 'c_fault_b7_pg', endPin: 'c_gnd_flt7_p1', points: [{ x: 1100, y: 260 }, { x: 1140, y: 240 }] },

      // Breaker 7-8 to Ammeter & Line 7-8
      { id: 'w_brk7_am', startPin: 'c_brk_b7_pa2', endPin: 'c_am_line78_p1', points: [{ x: 1140, y: 160 }, { x: 1165, y: 160 }] },
      { id: 'w_am_l78', startPin: 'c_am_line78_p2', endPin: 'c_line_7_8_p1', points: [{ x: 1235, y: 160 }, { x: 1255, y: 160 }] },

      // Line 7-8 to Load Bus 8 & Line 8-9
      { id: 'w_l78_ld8', startPin: 'c_line_7_8_p2', endPin: 'c_load_b8_p1', points: [{ x: 1345, y: 160 }, { x: 1345, y: 200 }] },
      { id: 'w_ld8_gnd', startPin: 'c_load_b8_p2', endPin: 'c_gnd_b8_p1', points: [{ x: 1345, y: 280 }, { x: 1345, y: 300 }] },
      { id: 'w_l78_l89', startPin: 'c_line_7_8_p2', endPin: 'c_line_8_9_p1', points: [{ x: 1345, y: 160 }, { x: 1405, y: 160 }] },

      // Line 8-9 to T3 Secondary & TieLine 9-4
      { id: 'w_l89_t3', startPin: 'c_line_8_9_p2', endPin: 'c_t3_sa', points: [{ x: 1495, y: 160 }, { x: 1645, y: 160 }] },
      { id: 'w_t3_l94', startPin: 'c_t3_sa', endPin: 'c_line_9_4_p2', points: [{ x: 1645, y: 160 }, { x: 1045, y: 400 }] },
      { id: 'w_t3_sn', startPin: 'c_t3_sn', endPin: 'c_gnd_t3_p1', points: [{ x: 1645, y: 215 }, { x: 1645, y: 240 }] },

      // Gen 3 to T3 Primary & VM3
      { id: 'w_g3_pa', startPin: 'c_g3_pa', endPin: 'c_t3_pa', points: [{ x: 1722, y: 140 }, { x: 1555, y: 160 }] },
      { id: 'w_g3_pb', startPin: 'c_g3_pb', endPin: 'c_t3_pb', points: [{ x: 1740, y: 140 }, { x: 1555, y: 180 }] },
      { id: 'w_g3_pc', startPin: 'c_g3_pc', endPin: 'c_t3_pc', points: [{ x: 1758, y: 140 }, { x: 1555, y: 200 }] },
      { id: 'w_g3_pn', startPin: 'c_g3_pn', endPin: 'c_gnd_g3_p1', points: [{ x: 1740, y: 220 }, { x: 1740, y: 240 }] },
      { id: 'w_vm3_p1', startPin: 'c_g3_pa', endPin: 'c_vm_g3_p1', points: [{ x: 1722, y: 140 }, { x: 1740, y: 45 }] },
      { id: 'w_vm3_p2', startPin: 'c_vm_g3_p2', endPin: 'c_gnd_vm3_p1', points: [{ x: 1740, y: 115 }, { x: 1740, y: 115 }] }
    ]
  },

  CIGRE_B4_DC_SUPERGRID: {
    name: 'CIGRE_B4_MultiTerminal_HVDC_Supergrid',
    category: 'Power Electronics & FACTS',
    description: 'CIGRÉ B4 benchmark ±320 kV DC / 230 kV AC Multi-Terminal HVDC Supergrid. Integrates an offshore wind collection hub (Station 1: 400 MW MMC Rectifier) transmitting bulk renewable energy across 120 km and 80 km subsea DC cables with series smoothing reactors into two mainland AC receiving grids (Station 2: 300 MW Onshore Grid A MMC Inverter with droop DC voltage control, and Station 3: 200 MW Onshore Grid B MMC Inverter). A 230 kV AC voltage dip at Station 2 at t=0.12s tests autonomous multi-terminal DC voltage stabilization, inter-terminal power reallocation, and low THD (< 0.8%).',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.2,
    components: [
      // ----------------------------------------------------
      // DC Midpoint Bipolar Voltage Source
      // ----------------------------------------------------
      {
        id: 'c_dc_src_p',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 80,
        y: 160,
        rotation: 0,
        name: 'DC_Source_Pos_320kV',
        params: { voltage: 320000, internalRs: 0.05 }
      },
      {
        id: 'c_dc_src_n',
        type: COMPONENT_TYPES.DC_SOURCE,
        x: 80,
        y: 320,
        rotation: 0,
        name: 'DC_Source_Neg_320kV',
        params: { voltage: -320000, internalRs: 0.05 }
      },
      {
        id: 'c_gnd_dc_mid',
        type: COMPONENT_TYPES.GROUND,
        x: 80,
        y: 240,
        rotation: 0,
        name: 'GND_DC_Midpoint',
        params: {}
      },

      // ----------------------------------------------------
      // MMC Station 1 (Offshore Wind Rectifier Terminal)
      // ----------------------------------------------------
      {
        id: 'c_mmc1',
        type: COMPONENT_TYPES.MMC_CONVERTER_3PH,
        x: 280,
        y: 240,
        rotation: 0,
        name: 'MMC_Station1_Offshore',
        params: {
          numSubmodules: 160,
          C_submodule: 0.006,
          Vdc_nom: 640000,
          V_ac_nom: 230000,
          Pac_ref: 400,
          Qac_ref: 0,
          modulationIndex: 0.90,
          L_arm: 0.03,
          R_arm: 0.25,
          monitored: true,
          signalName: 'V_MMC1_AC'
        }
      },
      {
        id: 'c_grid_ac1',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 440,
        y: 140,
        rotation: 0,
        name: 'AC_Grid1_WindFarm',
        params: { voltage: 230000, freq: 60, internalRs: 0.08, rampTime: 0.002 }
      },
      {
        id: 'c_gnd_ac1',
        type: COMPONENT_TYPES.GROUND,
        x: 440,
        y: 220,
        rotation: 0,
        name: 'GND_AC1',
        params: {}
      },

      // ----------------------------------------------------
      // DC Smoothing Inductors & Subsea Cable 1-2 (120 km)
      // ----------------------------------------------------
      {
        id: 'c_l_dc12_p',
        type: COMPONENT_TYPES.INDUCTOR,
        x: 280,
        y: 80,
        rotation: 0,
        name: 'L_Smoothing_P12',
        params: { inductance: 0.05 }
      },
      {
        id: 'c_l_dc12_n',
        type: COMPONENT_TYPES.INDUCTOR,
        x: 280,
        y: 400,
        rotation: 0,
        name: 'L_Smoothing_N12',
        params: { inductance: 0.05 }
      },
      {
        id: 'c_line_dc12_p',
        type: COMPONENT_TYPES.PI_LINE,
        x: 460,
        y: 80,
        rotation: 0,
        name: 'DC_Cable12_Pos_120km',
        params: { lengthKm: 120, R_per_km: 0.012, L_per_km: 0.0006, C_per_km: 0.018e-6 }
      },
      {
        id: 'c_line_dc12_n',
        type: COMPONENT_TYPES.PI_LINE,
        x: 460,
        y: 400,
        rotation: 0,
        name: 'DC_Cable12_Neg_120km',
        params: { lengthKm: 120, R_per_km: 0.012, L_per_km: 0.0006, C_per_km: 0.018e-6 }
      },

      // ----------------------------------------------------
      // MMC Station 2 (Mainland Grid A Inverter Terminal)
      // ----------------------------------------------------
      {
        id: 'c_mmc2',
        type: COMPONENT_TYPES.MMC_CONVERTER_3PH,
        x: 680,
        y: 240,
        rotation: 0,
        name: 'MMC_Station2_GridA',
        params: {
          numSubmodules: 160,
          C_submodule: 0.006,
          Vdc_nom: 640000,
          V_ac_nom: 230000,
          Pac_ref: -280,
          Qac_ref: 30,
          modulationIndex: 0.88,
          L_arm: 0.03,
          R_arm: 0.25,
          monitored: true,
          signalName: 'V_MMC2_AC'
        }
      },
      {
        id: 'c_grid_ac2',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 840,
        y: 140,
        rotation: 0,
        name: 'AC_Grid2_MainlandA',
        params: { voltage: 230000, freq: 60, internalRs: 0.05, rampTime: 0.002 }
      },
      {
        id: 'c_gnd_ac2',
        type: COMPONENT_TYPES.GROUND,
        x: 840,
        y: 220,
        rotation: 0,
        name: 'GND_AC2',
        params: {}
      },
      {
        id: 'c_fault_grid2',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 840,
        y: 300,
        rotation: 0,
        name: 'Fault_GridA',
        params: { faultType: 'SLG_A', startTime: 0.12, duration: 0.04, faultResistance: 0.05 }
      },
      {
        id: 'c_gnd_flt2',
        type: COMPONENT_TYPES.GROUND,
        x: 920,
        y: 360,
        rotation: 0,
        name: 'GND_Flt2',
        params: {}
      },

      // ----------------------------------------------------
      // DC Subsea Cable 2-3 (80 km)
      // ----------------------------------------------------
      {
        id: 'c_line_dc23_p',
        type: COMPONENT_TYPES.PI_LINE,
        x: 880,
        y: 80,
        rotation: 0,
        name: 'DC_Cable23_Pos_80km',
        params: { lengthKm: 80, R_per_km: 0.014, L_per_km: 0.00065, C_per_km: 0.017e-6 }
      },
      {
        id: 'c_line_dc23_n',
        type: COMPONENT_TYPES.PI_LINE,
        x: 880,
        y: 400,
        rotation: 0,
        name: 'DC_Cable23_Neg_80km',
        params: { lengthKm: 80, R_per_km: 0.014, L_per_km: 0.00065, C_per_km: 0.017e-6 }
      },

      // ----------------------------------------------------
      // MMC Station 3 (Mainland Grid B Inverter Terminal)
      // ----------------------------------------------------
      {
        id: 'c_mmc3',
        type: COMPONENT_TYPES.MMC_CONVERTER_3PH,
        x: 1080,
        y: 240,
        rotation: 0,
        name: 'MMC_Station3_GridB',
        params: {
          numSubmodules: 160,
          C_submodule: 0.006,
          Vdc_nom: 640000,
          V_ac_nom: 230000,
          Pac_ref: -120,
          Qac_ref: 0,
          modulationIndex: 0.88,
          L_arm: 0.03,
          R_arm: 0.25,
          monitored: true,
          signalName: 'V_MMC3_AC'
        }
      },
      {
        id: 'c_grid_ac3',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 1240,
        y: 140,
        rotation: 0,
        name: 'AC_Grid3_MainlandB',
        params: { voltage: 230000, freq: 60, internalRs: 0.06, rampTime: 0.002 }
      },
      {
        id: 'c_gnd_ac3',
        type: COMPONENT_TYPES.GROUND,
        x: 1240,
        y: 220,
        rotation: 0,
        name: 'GND_AC3',
        params: {}
      },
      {
        id: 'c_load_grid3',
        type: COMPONENT_TYPES.RESISTOR,
        x: 1240,
        y: 300,
        rotation: 90,
        name: 'Load_Grid3_Industrial',
        params: { resistance: 264.0, monitored: true }
      },
      {
        id: 'c_gnd_load3',
        type: COMPONENT_TYPES.GROUND,
        x: 1240,
        y: 380,
        rotation: 0,
        name: 'GND_Load3',
        params: {}
      },

      // ----------------------------------------------------
      // Telemetry Voltmeter Probes
      // ----------------------------------------------------
      {
        id: 'c_vm_dc_pos',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 560,
        y: 30,
        rotation: 0,
        name: 'V_DC_Pole_Pos',
        params: { signalName: 'V_DC_Pole_Pos', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmdc_p',
        type: COMPONENT_TYPES.GROUND,
        x: 560,
        y: 70,
        rotation: 0,
        name: 'GND_VM_DC_P',
        params: {}
      },
      {
        id: 'c_vm_dc_neg',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 560,
        y: 450,
        rotation: 0,
        name: 'V_DC_Pole_Neg',
        params: { signalName: 'V_DC_Pole_Neg', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmdc_n',
        type: COMPONENT_TYPES.GROUND,
        x: 560,
        y: 490,
        rotation: 0,
        name: 'GND_VM_DC_N',
        params: {}
      },
      {
        id: 'c_vm_ac_st2',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 760,
        y: 140,
        rotation: 0,
        name: 'V_Station2_AC_PhaseA',
        params: { signalName: 'V_Station2_AC_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmac2',
        type: COMPONENT_TYPES.GROUND,
        x: 760,
        y: 200,
        rotation: 0,
        name: 'GND_VM_AC2',
        params: {}
      },

      // ----------------------------------------------------
      // PolyGraph Telemetry Frame
      // ----------------------------------------------------
      {
        id: 'c_polygraph_cigre',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 1380,
        y: 160,
        rotation: 0,
        name: 'PolyGraph_CIGRE_B4_Telemetry',
        params: {
          graphTitle: 'CIGRE B4 Multi-Terminal HVDC Supergrid Telemetry',
          graphWidth: 500,
          graphHeight: 300,
          traces: [
            {
              id: 'tr_vdc_p',
              signalName: 'V_DC_Pole_Pos',
              probeId: 'c_vm_dc_pos',
              probeType: 'voltmeter',
              label: 'V_DC (+320kV)',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_vdc_n',
              signalName: 'V_DC_Pole_Neg',
              probeId: 'c_vm_dc_neg',
              probeType: 'voltmeter',
              label: 'V_DC (-320kV)',
              unit: 'V',
              color: '#38bdf8',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_vac_st2',
              signalName: 'V_Station2_AC_PhaseA',
              probeId: 'c_vm_ac_st2',
              probeType: 'voltmeter',
              label: 'V_AC Station 2',
              unit: 'V',
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
      // DC Midpoint Sources
      { id: 'w_dc_mid_p', startPin: 'c_dc_src_p_p2', endPin: 'c_gnd_dc_mid_p1', points: [{ x: 80, y: 200 }, { x: 80, y: 220 }] },
      { id: 'w_dc_mid_n', startPin: 'c_dc_src_n_p1', endPin: 'c_gnd_dc_mid_p1', points: [{ x: 80, y: 280 }, { x: 80, y: 220 }] },

      // DC Source to MMC1 DC Terminals
      { id: 'w_dc_src_p_mmc1', startPin: 'c_dc_src_p_p1', endPin: 'c_mmc1_pdcp', points: [{ x: 80, y: 120 }, { x: 235, y: 215 }] },
      { id: 'w_dc_src_n_mmc1', startPin: 'c_dc_src_n_p2', endPin: 'c_mmc1_pdcn', points: [{ x: 80, y: 360 }, { x: 235, y: 265 }] },

      // DC Smoothing Inductor inputs
      { id: 'w_dc_p_ind', startPin: 'c_dc_src_p_p1', endPin: 'c_l_dc12_p_p1', points: [{ x: 80, y: 120 }, { x: 240, y: 80 }] },
      { id: 'w_dc_n_ind', startPin: 'c_dc_src_n_p2', endPin: 'c_l_dc12_n_p1', points: [{ x: 80, y: 360 }, { x: 240, y: 400 }] },

      // Smoothing Inductors to Cable 1-2
      { id: 'w_ind_c12_p', startPin: 'c_l_dc12_p_p2', endPin: 'c_line_dc12_p_p1', points: [{ x: 320, y: 80 }, { x: 415, y: 80 }] },
      { id: 'w_ind_c12_n', startPin: 'c_l_dc12_n_p2', endPin: 'c_line_dc12_n_p1', points: [{ x: 320, y: 400 }, { x: 415, y: 400 }] },

      // DC Voltmeter Probes
      { id: 'w_vm_dcp', startPin: 'c_line_dc12_p_p2', endPin: 'c_vm_dc_pos_p1', points: [{ x: 505, y: 80 }, { x: 560, y: -5 }] },
      { id: 'w_vm_dcp_gnd', startPin: 'c_vm_dc_pos_p2', endPin: 'c_gnd_vmdc_p_p1', points: [{ x: 560, y: 65 }, { x: 560, y: 50 }] },
      { id: 'w_vm_dcn', startPin: 'c_line_dc12_n_p2', endPin: 'c_vm_dc_neg_p1', points: [{ x: 505, y: 400 }, { x: 560, y: 415 }] },
      { id: 'w_vm_dcn_gnd', startPin: 'c_vm_dc_neg_p2', endPin: 'c_gnd_vmdc_n_p1', points: [{ x: 560, y: 485 }, { x: 560, y: 470 }] },

      // Cable 1-2 to MMC2 & Cable 2-3
      { id: 'w_c12_mmc2_p', startPin: 'c_line_dc12_p_p2', endPin: 'c_mmc2_pdcp', points: [{ x: 505, y: 80 }, { x: 635, y: 215 }] },
      { id: 'w_c12_mmc2_n', startPin: 'c_line_dc12_n_p2', endPin: 'c_mmc2_pdcn', points: [{ x: 505, y: 400 }, { x: 635, y: 265 }] },
      { id: 'w_c12_c23_p', startPin: 'c_line_dc12_p_p2', endPin: 'c_line_dc23_p_p1', points: [{ x: 505, y: 80 }, { x: 835, y: 80 }] },
      { id: 'w_c12_c23_n', startPin: 'c_line_dc12_n_p2', endPin: 'c_line_dc23_n_p1', points: [{ x: 505, y: 400 }, { x: 835, y: 400 }] },

      // Cable 2-3 to MMC3
      { id: 'w_c23_mmc3_p', startPin: 'c_line_dc23_p_p2', endPin: 'c_mmc3_pdcp', points: [{ x: 925, y: 80 }, { x: 1035, y: 215 }] },
      { id: 'w_c23_mmc3_n', startPin: 'c_line_dc23_n_p2', endPin: 'c_mmc3_pdcn', points: [{ x: 925, y: 400 }, { x: 1035, y: 265 }] },

      // MMC1 AC Terminals to AC Grid 1
      { id: 'w_mmc1_grid1_a', startPin: 'c_mmc1_pa', endPin: 'c_grid_ac1_pa', points: [{ x: 325, y: 220 }, { x: 422, y: 100 }] },
      { id: 'w_mmc1_grid1_b', startPin: 'c_mmc1_pb', endPin: 'c_grid_ac1_pb', points: [{ x: 325, y: 240 }, { x: 440, y: 100 }] },
      { id: 'w_mmc1_grid1_c', startPin: 'c_mmc1_pc', endPin: 'c_grid_ac1_pc', points: [{ x: 325, y: 260 }, { x: 458, y: 100 }] },
      { id: 'w_grid1_gnd', startPin: 'c_grid_ac1_pn', endPin: 'c_gnd_ac1_p1', points: [{ x: 440, y: 180 }, { x: 440, y: 200 }] },

      // MMC2 AC Terminals to AC Grid 2, Fault & Voltmeter
      { id: 'w_mmc2_grid2_a', startPin: 'c_mmc2_pa', endPin: 'c_grid_ac2_pa', points: [{ x: 725, y: 220 }, { x: 822, y: 100 }] },
      { id: 'w_mmc2_grid2_b', startPin: 'c_mmc2_pb', endPin: 'c_grid_ac2_pb', points: [{ x: 725, y: 240 }, { x: 840, y: 100 }] },
      { id: 'w_mmc2_grid2_c', startPin: 'c_mmc2_pc', endPin: 'c_grid_ac2_pc', points: [{ x: 725, y: 260 }, { x: 858, y: 100 }] },
      { id: 'w_grid2_gnd', startPin: 'c_grid_ac2_pn', endPin: 'c_gnd_ac2_p1', points: [{ x: 840, y: 180 }, { x: 840, y: 200 }] },
      { id: 'w_flt2_a', startPin: 'c_mmc2_pa', endPin: 'c_fault_grid2_pa', points: [{ x: 725, y: 220 }, { x: 800, y: 285 }] },
      { id: 'w_flt2_gnd', startPin: 'c_fault_grid2_pg', endPin: 'c_gnd_flt2_p1', points: [{ x: 880, y: 300 }, { x: 920, y: 340 }] },
      { id: 'w_vm_ac2', startPin: 'c_mmc2_pa', endPin: 'c_vm_ac_st2_p1', points: [{ x: 725, y: 220 }, { x: 760, y: 105 }] },
      { id: 'w_vm_ac2_gnd', startPin: 'c_vm_ac_st2_p2', endPin: 'c_gnd_vmac2_p1', points: [{ x: 760, y: 175 }, { x: 760, y: 180 }] },

      // MMC3 AC Terminals to AC Grid 3 & Load
      { id: 'w_mmc3_grid3_a', startPin: 'c_mmc3_pa', endPin: 'c_grid_ac3_pa', points: [{ x: 1125, y: 220 }, { x: 1222, y: 100 }] },
      { id: 'w_mmc3_grid3_b', startPin: 'c_mmc3_pb', endPin: 'c_grid_ac3_pb', points: [{ x: 1125, y: 240 }, { x: 1240, y: 100 }] },
      { id: 'w_mmc3_grid3_c', startPin: 'c_mmc3_pc', endPin: 'c_grid_ac3_pc', points: [{ x: 1125, y: 260 }, { x: 1258, y: 100 }] },
      { id: 'w_grid3_gnd', startPin: 'c_grid_ac3_pn', endPin: 'c_gnd_ac3_p1', points: [{ x: 1240, y: 180 }, { x: 1240, y: 200 }] },
      { id: 'w_load3_conn', startPin: 'c_mmc3_pa', endPin: 'c_load_grid3_p1', points: [{ x: 1125, y: 220 }, { x: 1240, y: 260 }] },
      { id: 'w_load3_gnd', startPin: 'c_load_grid3_p2', endPin: 'c_gnd_load3_p1', points: [{ x: 1240, y: 340 }, { x: 1240, y: 360 }] }
    ]
  },

  INDUSTRIAL_MICROGRID_ISLANDING: {
    name: 'Industrial_Microgrid_BESS_Solar_Islanding',
    category: 'Renewables & Microgrids',
    description: '13.8 kV / 480 V Industrial Facility Microgrid with multi-source hybrid generation and seamless islanding. Integrates a 69 kV utility intertie stepped down via a 69/13.8 kV 15 MVA Dyn1 transformer through a motorized PCC breaker, a 3.0 MWh Grid-Forming (GFM) Battery Energy Storage System (BESS) inverter providing synthetic inertia, a 2.5 MW Solar Photovoltaic inverter with LC harmonic filter, a 1.5 MVA Synchronous Diesel Generator with automatic governor, and an industrial pumping induction motor alongside critical facility feeders. A utility grid fault trips the PCC breaker at t=0.15s, initiating seamless islanding, frequency stabilization, and feeder load management.',
    version: '1.0',
    dt: 5e-5,
    tMax: 0.5,
    components: [
      // ----------------------------------------------------
      // 69 kV Utility Grid Intertie & Substation Step-Down Transformer
      // ----------------------------------------------------
      {
        id: 'c_grid_69k',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 100,
        y: 180,
        rotation: 0,
        name: 'Utility_Grid_69kV',
        params: { voltage: 69000, freq: 60, internalRs: 0.05, rampTime: 0.005 }
      },
      {
        id: 'c_gnd_u',
        type: COMPONENT_TYPES.GROUND,
        x: 100,
        y: 260,
        rotation: 0,
        name: 'GND_Utility',
        params: {}
      },
      {
        id: 'c_xfmr_sub',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 230,
        y: 180,
        rotation: 0,
        name: 'Substation_Xfmr_69_13.8kV',
        params: { V1_nom: 69000, V2_nom: 13800, MVA_rating: 15, coreType: '3_limb', primaryConn: 'Delta', secondaryConn: 'Yg' }
      },
      {
        id: 'c_gnd_xfmr',
        type: COMPONENT_TYPES.GROUND,
        x: 230,
        y: 280,
        rotation: 0,
        name: 'GND_SubXfmr',
        params: {}
      },

      // ----------------------------------------------------
      // Point of Common Coupling (PCC) Breaker & Utility Fault
      // ----------------------------------------------------
      {
        id: 'c_brk_pcc',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 360,
        y: 180,
        rotation: 0,
        name: 'PCC_Motorized_Breaker',
        params: { initClosed: true, openTime: 0.15, Ron: 0.001 }
      },
      {
        id: 'c_flt_grid',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 290,
        y: 260,
        rotation: 0,
        name: 'Utility_Fault',
        params: { faultType: 'SLG_A', startTime: 0.10, duration: 0.08, faultResistance: 0.01 }
      },
      {
        id: 'c_gnd_flt',
        type: COMPONENT_TYPES.GROUND,
        x: 370,
        y: 320,
        rotation: 0,
        name: 'GND_Flt',
        params: {}
      },
      {
        id: 'c_vm_grid',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 230,
        y: 80,
        rotation: 0,
        name: 'V_Utility_PhaseA',
        params: { signalName: 'V_Utility_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmu',
        type: COMPONENT_TYPES.GROUND,
        x: 230,
        y: 130,
        rotation: 0,
        name: 'GND_VM_Util',
        params: {}
      },

      // ----------------------------------------------------
      // 13.8 kV Microgrid Bus: GFM BESS, Solar PV & Diesel Genset
      // ----------------------------------------------------
      {
        id: 'c_bess_statcom',
        type: COMPONENT_TYPES.STATCOM,
        x: 500,
        y: 180,
        rotation: 0,
        name: 'BESS_GridForming_Inverter',
        params: { V_nom_ll: 13800, Q_rating_MVAR: 5.0, Vdc_ref: 25000, Cdc: 0.03, Lf: 0.005, Rf: 0.02, freq: 60 }
      },
      {
        id: 'c_gnd_bess',
        type: COMPONENT_TYPES.GROUND,
        x: 500,
        y: 260,
        rotation: 0,
        name: 'GND_BESS',
        params: {}
      },
      {
        id: 'c_pv_inv',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 640,
        y: 180,
        rotation: 0,
        name: 'Solar_PV_2.5MW_Inverter',
        params: { voltage: 13800, freq: 60, internalRs: 0.08, rampTime: 0.01, phaseDeg: 2.0 }
      },
      {
        id: 'c_gnd_pv',
        type: COMPONENT_TYPES.GROUND,
        x: 640,
        y: 260,
        rotation: 0,
        name: 'GND_PV',
        params: {}
      },
      {
        id: 'c_diesel_gen',
        type: COMPONENT_TYPES.SYNC_MACHINE_DQ,
        x: 780,
        y: 180,
        rotation: 0,
        name: 'Diesel_Genset_1.5MVA',
        params: { Sn_MVA: 1.5, Vn_kV: 13.8, Xd: 1.4, Xq: 1.3, Xd_prime: 0.25, Xd_pp: 0.18, monitored: true }
      },
      {
        id: 'c_gnd_diesel',
        type: COMPONENT_TYPES.GROUND,
        x: 780,
        y: 260,
        rotation: 0,
        name: 'GND_Diesel',
        params: {}
      },
      {
        id: 'c_vm_mg',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 500,
        y: 80,
        rotation: 0,
        name: 'V_Microgrid_Bus_PhaseA',
        params: { signalName: 'V_Microgrid_Bus_PhaseA', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmmg',
        type: COMPONENT_TYPES.GROUND,
        x: 500,
        y: 130,
        rotation: 0,
        name: 'GND_VM_MG',
        params: {}
      },

      // ----------------------------------------------------
      // Microgrid Loads: Feeder 1 Critical Load & Feeder 2 Induction Motor
      // ----------------------------------------------------
      {
        id: 'c_am_mg',
        type: COMPONENT_TYPES.AMMETER,
        x: 880,
        y: 160,
        rotation: 0,
        name: 'I_Microgrid_Total_PhaseA',
        params: { signalName: 'I_Microgrid_Total_PhaseA', unit: 'A', monitored: true }
      },
      {
        id: 'c_brk_f1',
        type: COMPONENT_TYPES.BREAKER_1PH,
        x: 970,
        y: 160,
        rotation: 0,
        name: 'Feeder1_Shed_Breaker',
        params: { initClosed: true, openTime: 0.20, Ron: 0.001 }
      },
      {
        id: 'c_load_crit',
        type: COMPONENT_TYPES.RESISTOR,
        x: 1070,
        y: 160,
        rotation: 90,
        name: 'Critical_Facility_Load',
        params: { resistance: 76.0, monitored: true }
      },
      {
        id: 'c_gnd_crit',
        type: COMPONENT_TYPES.GROUND,
        x: 1070,
        y: 240,
        rotation: 0,
        name: 'GND_Load_Crit',
        params: {}
      },
      {
        id: 'c_motor_ind',
        type: COMPONENT_TYPES.INDUCTION_MACHINE,
        x: 970,
        y: 280,
        rotation: 0,
        name: 'Industrial_Pumping_Motor',
        params: { Sn_MVA: 2.0, Vn_kV: 13.8, Rs: 0.015, Rr: 0.02, Xls: 0.08, Xlr: 0.08, Xm: 3.5, H: 1.8, D: 0.01 }
      },
      {
        id: 'c_gnd_motor',
        type: COMPONENT_TYPES.GROUND,
        x: 970,
        y: 360,
        rotation: 0,
        name: 'GND_Motor',
        params: {}
      },

      // ----------------------------------------------------
      // Interactive Real-Time Mutator Controls
      // ----------------------------------------------------
      {
        id: 'c_slider_load',
        type: COMPONENT_TYPES.RUNTIME_SLIDER,
        x: 120,
        y: 400,
        rotation: 0,
        name: 'Demand_Slider',
        params: {
          label: 'Feeder Load Demand',
          minValue: 20,
          maxValue: 200,
          step: 5,
          defaultValue: 76,
          value: 76,
          unitLabel: 'Ω',
          targetCompId: 'c_load_crit',
          targetParam: 'resistance',
          accentColor: '#38bdf8'
        }
      },
      {
        id: 'c_sw_pcc',
        type: COMPONENT_TYPES.RUNTIME_SWITCH,
        x: 260,
        y: 400,
        rotation: 0,
        name: 'PCC_Switch',
        params: {
          label: 'PCC Grid Intertie Breaker',
          switchState: true,
          isClosed: true,
          onLabel: 'GRID-TIED',
          offLabel: 'ISLANDED',
          targetCompId: 'c_brk_pcc',
          targetParam: 'isClosed'
        }
      },
      {
        id: 'c_dial_bess_freq',
        type: COMPONENT_TYPES.RUNTIME_DIAL,
        x: 400,
        y: 400,
        rotation: 0,
        name: 'BESS_Freq_Dial',
        params: {
          label: 'BESS Reference Frequency',
          minValue: 57,
          maxValue: 63,
          step: 0.1,
          defaultValue: 60,
          value: 60,
          unitLabel: 'Hz',
          targetCompId: 'c_pv_inv',
          targetParam: 'freq',
          accentColor: '#10b981'
        }
      },
      {
        id: 'c_gauge_mg_v',
        type: COMPONENT_TYPES.RUNTIME_GAUGE,
        x: 540,
        y: 400,
        rotation: 0,
        name: 'Microgrid_Volt_Gauge',
        params: {
          label: 'Microgrid Bus RMS Voltage',
          minValue: 0,
          maxValue: 16000,
          unitLabel: 'V',
          targetSignal: 'V_Microgrid_Bus_PhaseA',
          normalZoneMax: 0.88,
          warningZoneMax: 0.98,
          measurementType: 'rms',
          showPeakHold: true,
          needleColor: '#00e5ff'
        }
      },

      // ----------------------------------------------------
      // Scope Telemetry Overlay Frame
      // ----------------------------------------------------
      {
        id: 'c_scope_mg',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 1200,
        y: 120,
        rotation: 0,
        name: 'Live_Microgrid_Scope',
        params: {
          graphTitle: 'Microgrid Islanding Transition & Power Balance Telemetry',
          graphWidth: 500,
          graphHeight: 300,
          traces: [
            {
              id: 'tr_v_util',
              signalName: 'V_Utility_PhaseA',
              probeId: 'c_vm_grid',
              probeType: 'voltmeter',
              label: 'V_Utility (69kV)',
              unit: 'V',
              color: '#f43f5e',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_v_mg',
              signalName: 'V_Microgrid_Bus_PhaseA',
              probeId: 'c_vm_mg',
              probeType: 'voltmeter',
              label: 'V_Microgrid (13.8kV)',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_mg',
              signalName: 'I_Microgrid_Total_PhaseA',
              probeId: 'c_am_mg',
              probeType: 'ammeter',
              label: 'I_Total_Demand',
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
      // 69 kV Grid to Transformer & VM
      { id: 'w_u_pa', startPin: 'c_grid_69k_pa', endPin: 'c_xfmr_sub_pa', points: [{ x: 82, y: 140 }, { x: 185, y: 160 }] },
      { id: 'w_u_pb', startPin: 'c_grid_69k_pb', endPin: 'c_xfmr_sub_pb', points: [{ x: 100, y: 140 }, { x: 185, y: 180 }] },
      { id: 'w_u_pc', startPin: 'c_grid_69k_pc', endPin: 'c_xfmr_sub_pc', points: [{ x: 118, y: 140 }, { x: 185, y: 200 }] },
      { id: 'w_u_pn', startPin: 'c_grid_69k_pn', endPin: 'c_gnd_u_p1', points: [{ x: 100, y: 220 }, { x: 100, y: 240 }] },
      { id: 'w_vm_u', startPin: 'c_grid_69k_pa', endPin: 'c_vm_grid_p1', points: [{ x: 82, y: 140 }, { x: 230, y: 45 }] },
      { id: 'w_vm_u_gnd', startPin: 'c_vm_grid_p2', endPin: 'c_gnd_vmu_p1', points: [{ x: 230, y: 115 }, { x: 230, y: 110 }] },

      // Transformer Secondary to PCC Breaker
      { id: 'w_xfmr_sa', startPin: 'c_xfmr_sub_sa', endPin: 'c_brk_pcc_pa1', points: [{ x: 275, y: 160 }, { x: 320, y: 160 }] },
      { id: 'w_xfmr_sb', startPin: 'c_xfmr_sub_sb', endPin: 'c_brk_pcc_pb1', points: [{ x: 275, y: 180 }, { x: 320, y: 180 }] },
      { id: 'w_xfmr_sc', startPin: 'c_xfmr_sub_sc', endPin: 'c_brk_pcc_pc1', points: [{ x: 275, y: 200 }, { x: 320, y: 200 }] },
      { id: 'w_xfmr_sn', startPin: 'c_xfmr_sub_sn', endPin: 'c_gnd_xfmr_p1', points: [{ x: 275, y: 215 }, { x: 230, y: 260 }] },

      // Utility Fault at Transformer Secondary
      { id: 'w_flt_u_a', startPin: 'c_xfmr_sub_sa', endPin: 'c_flt_grid_pa', points: [{ x: 275, y: 160 }, { x: 250, y: 245 }] },
      { id: 'w_flt_u_gnd', startPin: 'c_flt_grid_pg', endPin: 'c_gnd_flt_p1', points: [{ x: 330, y: 260 }, { x: 370, y: 300 }] },

      // PCC Breaker to 13.8 kV Microgrid Bus (BESS, Solar PV, Diesel, Motor, VM)
      { id: 'w_pcc_bess_a', startPin: 'c_brk_pcc_pa2', endPin: 'c_bess_statcom_pa', points: [{ x: 400, y: 160 }, { x: 482, y: 140 }] },
      { id: 'w_pcc_bess_b', startPin: 'c_brk_pcc_pb2', endPin: 'c_bess_statcom_pb', points: [{ x: 400, y: 180 }, { x: 500, y: 140 }] },
      { id: 'w_pcc_bess_c', startPin: 'c_brk_pcc_pc2', endPin: 'c_bess_statcom_pc', points: [{ x: 400, y: 200 }, { x: 518, y: 140 }] },
      { id: 'w_bess_gnd', startPin: 'c_bess_statcom_pn', endPin: 'c_gnd_bess_p1', points: [{ x: 500, y: 220 }, { x: 500, y: 240 }] },

      { id: 'w_bess_pv_a', startPin: 'c_bess_statcom_pa', endPin: 'c_pv_inv_pa', points: [{ x: 482, y: 140 }, { x: 622, y: 140 }] },
      { id: 'w_bess_pv_b', startPin: 'c_bess_statcom_pb', endPin: 'c_pv_inv_pb', points: [{ x: 500, y: 140 }, { x: 640, y: 140 }] },
      { id: 'w_bess_pv_c', startPin: 'c_bess_statcom_pc', endPin: 'c_pv_inv_pc', points: [{ x: 518, y: 140 }, { x: 658, y: 140 }] },
      { id: 'w_pv_gnd', startPin: 'c_pv_inv_pn', endPin: 'c_gnd_pv_p1', points: [{ x: 640, y: 220 }, { x: 640, y: 240 }] },

      { id: 'w_pv_gen_a', startPin: 'c_pv_inv_pa', endPin: 'c_diesel_gen_pa', points: [{ x: 622, y: 140 }, { x: 762, y: 140 }] },
      { id: 'w_pv_gen_b', startPin: 'c_pv_inv_pb', endPin: 'c_diesel_gen_pb', points: [{ x: 640, y: 140 }, { x: 780, y: 140 }] },
      { id: 'w_pv_gen_c', startPin: 'c_pv_inv_pc', endPin: 'c_diesel_gen_pc', points: [{ x: 658, y: 140 }, { x: 798, y: 140 }] },
      { id: 'w_diesel_gnd', startPin: 'c_diesel_gen_pn', endPin: 'c_gnd_diesel_p1', points: [{ x: 780, y: 220 }, { x: 780, y: 240 }] },

      // Microgrid VM
      { id: 'w_vm_mg_p1', startPin: 'c_bess_statcom_pa', endPin: 'c_vm_mg_p1', points: [{ x: 482, y: 140 }, { x: 500, y: 45 }] },
      { id: 'w_vm_mg_p2', startPin: 'c_vm_mg_p2', endPin: 'c_gnd_vmmg_p1', points: [{ x: 500, y: 115 }, { x: 500, y: 110 }] },

      // Microgrid Bus to Ammeter & Feeder 1
      { id: 'w_mg_am', startPin: 'c_diesel_gen_pa', endPin: 'c_am_mg_p1', points: [{ x: 762, y: 140 }, { x: 845, y: 160 }] },
      { id: 'w_am_brk1', startPin: 'c_am_mg_p2', endPin: 'c_brk_f1_p1', points: [{ x: 915, y: 160 }, { x: 930, y: 160 }] },
      { id: 'w_brk1_load', startPin: 'c_brk_f1_p2', endPin: 'c_load_crit_p1', points: [{ x: 1010, y: 160 }, { x: 1070, y: 120 }] },
      { id: 'w_load_gnd', startPin: 'c_load_crit_p2', endPin: 'c_gnd_crit_p1', points: [{ x: 1070, y: 200 }, { x: 1070, y: 220 }] },

      // Feeder 2 Induction Motor
      { id: 'w_mg_mot_a', startPin: 'c_diesel_gen_pa', endPin: 'c_motor_ind_pa', points: [{ x: 762, y: 140 }, { x: 952, y: 240 }] },
      { id: 'w_mg_mot_b', startPin: 'c_diesel_gen_pb', endPin: 'c_motor_ind_pb', points: [{ x: 780, y: 140 }, { x: 970, y: 240 }] },
      { id: 'w_mg_mot_c', startPin: 'c_diesel_gen_pc', endPin: 'c_motor_ind_pc', points: [{ x: 798, y: 140 }, { x: 988, y: 240 }] },
      { id: 'w_mot_gnd', startPin: 'c_motor_ind_pn', endPin: 'c_gnd_motor_p1', points: [{ x: 970, y: 320 }, { x: 970, y: 340 }] }
    ]
  },

  SUBSTATION_ANSI_PROTECTION: {
    name: 'Substation_115kV_DualFeeder_ANSI_Protection',
    category: 'Protection & Relays',
    description: '115 kV / 13.8 kV Dual-Feeder Utility Substation benchmark with ANSI 87T/51/21 protection and high-speed auto-reclosing. 115 kV incoming grid feeds high-voltage ZnO surge arresters and a 40 MVA Dyn1 transformer equipped with primary (CT-1) and secondary (CT-2) current transformers connected to an ANSI 87T percentage differential relay. Outgoing Feeder 1 (overhead distribution line) and Feeder 2 (underground distribution cable) feed separate industrial load centers. A single line-to-ground fault on Feeder 1 at t=0.10s activates ANSI 51 time-overcurrent protection, tripping the feeder breaker at t=0.15s, followed by auto-reclosure at t=0.35s to clear transient fault debris.',
    version: '1.0',
    dt: 2.5e-5,
    tMax: 0.4,
    components: [
      // ----------------------------------------------------
      // 115 kV Incoming Grid & Metal-Oxide Surge Arrester
      // ----------------------------------------------------
      {
        id: 'c_grid_115k',
        type: COMPONENT_TYPES.AC_SOURCE_3PH,
        x: 100,
        y: 180,
        rotation: 0,
        name: 'Grid_115kV_Incomer',
        params: { voltage: 115000, freq: 60, internalRs: 0.05, rampTime: 0.002 }
      },
      {
        id: 'c_gnd_grid115',
        type: COMPONENT_TYPES.GROUND,
        x: 100,
        y: 260,
        rotation: 0,
        name: 'GND_Grid115',
        params: {}
      },
      {
        id: 'c_sa_hv',
        type: COMPONENT_TYPES.SURGE_ARRESTER,
        x: 200,
        y: 110,
        rotation: 0,
        name: 'Surge_Arrester_ZnO',
        params: { V_ref: 95000, k: 1e-25, alpha: 28 }
      },
      {
        id: 'c_gnd_sa',
        type: COMPONENT_TYPES.GROUND,
        x: 200,
        y: 160,
        rotation: 0,
        name: 'GND_SA',
        params: {}
      },

      // ----------------------------------------------------
      // Primary CT & Substation 115/13.8 kV 40 MVA Power Transformer
      // ----------------------------------------------------
      {
        id: 'c_ct_prim',
        type: COMPONENT_TYPES.CURRENT_TRANSFORMER_CT,
        x: 280,
        y: 160,
        rotation: 0,
        name: 'CT1_Primary_200_5A',
        params: { ratio: 200, burdenR: 0.5, monitored: true }
      },
      {
        id: 'c_xfmr_sub115',
        type: COMPONENT_TYPES.UMEC_TRANSFORMER_3PH,
        x: 420,
        y: 180,
        rotation: 0,
        name: 'Power_Xfmr_115_13.8kV',
        params: { V1_nom: 115000, V2_nom: 13800, MVA_rating: 40, coreType: '3_limb', primaryConn: 'Delta', secondaryConn: 'Yg' }
      },
      {
        id: 'c_gnd_xfmr115',
        type: COMPONENT_TYPES.GROUND,
        x: 420,
        y: 280,
        rotation: 0,
        name: 'GND_Xfmr115',
        params: {}
      },

      // ----------------------------------------------------
      // Secondary CT & 13.8 kV Distribution Busbar Voltmeter
      // ----------------------------------------------------
      {
        id: 'c_ct_sec',
        type: COMPONENT_TYPES.CURRENT_TRANSFORMER_CT,
        x: 560,
        y: 160,
        rotation: 0,
        name: 'CT2_Secondary_1600_5A',
        params: { ratio: 1600, burdenR: 0.5, monitored: true }
      },
      {
        id: 'c_vm_bus13',
        type: COMPONENT_TYPES.VOLTMETER,
        x: 660,
        y: 90,
        rotation: 0,
        name: 'V_Substation_13kV',
        params: { signalName: 'V_Substation_13kV', unit: 'V', monitored: true }
      },
      {
        id: 'c_gnd_vmbus',
        type: COMPONENT_TYPES.GROUND,
        x: 660,
        y: 140,
        rotation: 0,
        name: 'GND_VM_Bus',
        params: {}
      },

      // ----------------------------------------------------
      // Feeder 1 (Overhead Distribution Line with Fault & Auto-Reclose)
      // ----------------------------------------------------
      {
        id: 'c_am_f1',
        type: COMPONENT_TYPES.AMMETER,
        x: 810,
        y: 120,
        rotation: 0,
        name: 'I_Feeder1_PhaseA',
        params: { signalName: 'I_Feeder1_PhaseA', unit: 'A', monitored: true }
      },
      {
        id: 'c_brk_f1',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 740,
        y: 160,
        rotation: 0,
        name: 'Feeder1_Breaker_51_Reclose',
        params: { initClosed: true, openTime: 0.15, closeTime: 0.35, Ron: 0.001 }
      },
      {
        id: 'c_line_f1',
        type: COMPONENT_TYPES.PI_LINE,
        x: 920,
        y: 140,
        rotation: 0,
        name: 'Feeder1_OverheadLine_15km',
        params: { lengthKm: 15, R_per_km: 0.15, L_per_km: 0.0011, C_per_km: 0.009e-6 }
      },
      {
        id: 'c_flt_f1',
        type: COMPONENT_TYPES.FAULT_BLOCK,
        x: 920,
        y: 240,
        rotation: 0,
        name: 'Feeder1_Fault_SLG',
        params: { faultType: 'SLG_A', startTime: 0.10, duration: 0.05, faultResistance: 0.02 }
      },
      {
        id: 'c_gnd_fltf1',
        type: COMPONENT_TYPES.GROUND,
        x: 1000,
        y: 300,
        rotation: 0,
        name: 'GND_Flt_F1',
        params: {}
      },
      {
        id: 'c_load_f1',
        type: COMPONENT_TYPES.RESISTOR,
        x: 1060,
        y: 140,
        rotation: 90,
        name: 'Load_Feeder1_Industrial',
        params: { resistance: 47.6, monitored: true }
      },
      {
        id: 'c_gnd_lf1',
        type: COMPONENT_TYPES.GROUND,
        x: 1060,
        y: 220,
        rotation: 0,
        name: 'GND_Load_F1',
        params: {}
      },

      // ----------------------------------------------------
      // Feeder 2 (Underground Cable Feeder)
      // ----------------------------------------------------
      {
        id: 'c_am_f2',
        type: COMPONENT_TYPES.AMMETER,
        x: 810,
        y: 280,
        rotation: 0,
        name: 'I_Feeder2_PhaseA',
        params: { signalName: 'I_Feeder2_PhaseA', unit: 'A', monitored: true }
      },
      {
        id: 'c_brk_f2',
        type: COMPONENT_TYPES.BREAKER_3PH,
        x: 740,
        y: 300,
        rotation: 0,
        name: 'Feeder2_Breaker',
        params: { initClosed: true, Ron: 0.001 }
      },
      {
        id: 'c_cable_f2',
        type: COMPONENT_TYPES.PI_LINE,
        x: 920,
        y: 320,
        rotation: 0,
        name: 'Feeder2_UndergroundCable_8km',
        params: { lengthKm: 8, R_per_km: 0.08, L_per_km: 0.00045, C_per_km: 0.18e-6 }
      },
      {
        id: 'c_load_f2',
        type: COMPONENT_TYPES.RESISTOR,
        x: 1060,
        y: 320,
        rotation: 90,
        name: 'Load_Feeder2_Commercial',
        params: { resistance: 31.7, monitored: true }
      },
      {
        id: 'c_gnd_lf2',
        type: COMPONENT_TYPES.GROUND,
        x: 1060,
        y: 400,
        rotation: 0,
        name: 'GND_Load_F2',
        params: {}
      },

      // ----------------------------------------------------
      // Substation Telemetry PolyGraph Frame
      // ----------------------------------------------------
      {
        id: 'c_scope_sub',
        type: COMPONENT_TYPES.GRAPH_FRAME,
        x: 1200,
        y: 140,
        rotation: 0,
        name: 'Substation_Protection_Telemetry',
        params: {
          graphTitle: '115kV/13.8kV Substation Protection & Auto-Reclose Telemetry',
          graphWidth: 500,
          graphHeight: 300,
          traces: [
            {
              id: 'tr_v_bus13',
              signalName: 'V_Substation_13kV',
              probeId: 'c_vm_bus13',
              probeType: 'voltmeter',
              label: 'V_Bus (13.8kV)',
              unit: 'V',
              color: '#00e5ff',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_f1',
              signalName: 'I_Feeder1_PhaseA',
              probeId: 'c_am_f1',
              probeType: 'ammeter',
              label: 'I_Feeder 1 (Fault & Trip)',
              unit: 'A',
              color: '#ef4444',
              visible: true,
              gain: 1.0,
              offset: 0
            },
            {
              id: 'tr_i_f2',
              signalName: 'I_Feeder2_PhaseA',
              probeId: 'c_am_f2',
              probeType: 'ammeter',
              label: 'I_Feeder 2 (Cable Load)',
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
      // 115 kV Grid to Surge Arrester & CT Primary
      { id: 'w_g115_pa', startPin: 'c_grid_115k_pa', endPin: 'c_ct_prim_p1', points: [{ x: 82, y: 140 }, { x: 245, y: 160 }] },
      { id: 'w_g115_sa', startPin: 'c_grid_115k_pa', endPin: 'c_sa_hv_p1', points: [{ x: 82, y: 140 }, { x: 200, y: 75 }] },
      { id: 'w_sa_gnd', startPin: 'c_sa_hv_p2', endPin: 'c_gnd_sa_p1', points: [{ x: 200, y: 145 }, { x: 200, y: 140 }] },
      { id: 'w_g115_pb', startPin: 'c_grid_115k_pb', endPin: 'c_xfmr_sub115_pb', points: [{ x: 100, y: 140 }, { x: 375, y: 180 }] },
      { id: 'w_g115_pc', startPin: 'c_grid_115k_pc', endPin: 'c_xfmr_sub115_pc', points: [{ x: 118, y: 140 }, { x: 375, y: 200 }] },
      { id: 'w_g115_pn', startPin: 'c_grid_115k_pn', endPin: 'c_gnd_grid115_p1', points: [{ x: 100, y: 220 }, { x: 100, y: 240 }] },

      // CT Primary Out to Transformer Primary Phase A
      { id: 'w_ct1_xfmr', startPin: 'c_ct_prim_p2', endPin: 'c_xfmr_sub115_pa', points: [{ x: 315, y: 160 }, { x: 375, y: 160 }] },

      // Transformer Secondary to CT Secondary In & Ground
      { id: 'w_xfmr_ct2_a', startPin: 'c_xfmr_sub115_sa', endPin: 'c_ct_sec_p1', points: [{ x: 465, y: 160 }, { x: 525, y: 160 }] },
      { id: 'w_xfmr_ct2_b', startPin: 'c_xfmr_sub115_sb', endPin: 'c_brk_f1_pb1', points: [{ x: 465, y: 180 }, { x: 700, y: 180 }] },
      { id: 'w_xfmr_ct2_c', startPin: 'c_xfmr_sub115_sc', endPin: 'c_brk_f1_pc1', points: [{ x: 465, y: 200 }, { x: 700, y: 200 }] },
      { id: 'w_xfmr115_sn', startPin: 'c_xfmr_sub115_sn', endPin: 'c_gnd_xfmr115_p1', points: [{ x: 465, y: 215 }, { x: 420, y: 260 }] },

      // CT Secondary Out to 13.8 kV Bus (VM, Feeder 1, Feeder 2)
      { id: 'w_ct2_bus_a', startPin: 'c_ct_sec_p2', endPin: 'c_brk_f1_pa1', points: [{ x: 595, y: 160 }, { x: 700, y: 160 }] },
      { id: 'w_bus_vm', startPin: 'c_ct_sec_p2', endPin: 'c_vm_bus13_p1', points: [{ x: 595, y: 160 }, { x: 660, y: 55 }] },
      { id: 'w_vm_bus_gnd', startPin: 'c_vm_bus13_p2', endPin: 'c_gnd_vmbus_p1', points: [{ x: 660, y: 125 }, { x: 660, y: 120 }] },
      { id: 'w_bus_f2_a', startPin: 'c_ct_sec_p2', endPin: 'c_brk_f2_pa1', points: [{ x: 595, y: 160 }, { x: 700, y: 280 }] },
      { id: 'w_bus_f2_b', startPin: 'c_xfmr_sub115_sb', endPin: 'c_brk_f2_pb1', points: [{ x: 465, y: 180 }, { x: 700, y: 300 }] },
      { id: 'w_bus_f2_c', startPin: 'c_xfmr_sub115_sc', endPin: 'c_brk_f2_pc1', points: [{ x: 465, y: 200 }, { x: 700, y: 320 }] },

      // Feeder 1: Breaker to Ammeter & Line
      { id: 'w_brk1_am', startPin: 'c_brk_f1_pa2', endPin: 'c_am_f1_p1', points: [{ x: 780, y: 160 }, { x: 775, y: 120 }] },
      { id: 'w_am_line1', startPin: 'c_am_f1_p2', endPin: 'c_line_f1_p1', points: [{ x: 845, y: 120 }, { x: 875, y: 140 }] },

      // Feeder 1 Fault Block
      { id: 'w_flt1_conn', startPin: 'c_line_f1_p1', endPin: 'c_flt_f1_pa', points: [{ x: 875, y: 140 }, { x: 880, y: 225 }] },
      { id: 'w_flt1_gnd', startPin: 'c_flt_f1_pg', endPin: 'c_gnd_fltf1_p1', points: [{ x: 960, y: 240 }, { x: 1000, y: 280 }] },

      // Feeder 1 Line to Load 1
      { id: 'w_line1_load', startPin: 'c_line_f1_p2', endPin: 'c_load_f1_p1', points: [{ x: 965, y: 140 }, { x: 1060, y: 100 }] },
      { id: 'w_load1_gnd', startPin: 'c_load_f1_p2', endPin: 'c_gnd_lf1_p1', points: [{ x: 1060, y: 180 }, { x: 1060, y: 200 }] },

      // Feeder 2: Breaker to Ammeter & Cable & Load 2
      { id: 'w_brk2_am', startPin: 'c_brk_f2_pa2', endPin: 'c_am_f2_p1', points: [{ x: 780, y: 280 }, { x: 775, y: 280 }] },
      { id: 'w_am_cable2', startPin: 'c_am_f2_p2', endPin: 'c_cable_f2_p1', points: [{ x: 845, y: 280 }, { x: 875, y: 320 }] },
      { id: 'w_cable2_load', startPin: 'c_cable_f2_p2', endPin: 'c_load_f2_p1', points: [{ x: 965, y: 320 }, { x: 1060, y: 280 }] },
      { id: 'w_load2_gnd', startPin: 'c_load_f2_p2', endPin: 'c_gnd_lf2_p1', points: [{ x: 1060, y: 360 }, { x: 1060, y: 380 }] }
    ]
  }
};
