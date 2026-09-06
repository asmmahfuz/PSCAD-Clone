/**
 * PSCAD CLONE - Circuit Topology and Netlist Analyzer in TypeScript
 * 
 * Features:
 * - Strict Dual-Domain Type System (Electrical vs Control)
 * - Compiler Diagnostics & Domain Consistency Verification
 * - Wireless Data Label (Transmitter <Sig> / Receiver [Sig]) Resolution
 * - 3-Phase Polyphase Busbar & Phase Splitters/Mergers
 */

import { Matrix } from './matrix';
import type { CircuitComponentData, WireData, Pin, CompilerDiagnostic, PinDomain, PinDirection, SignalDataType } from '../types';
import { COMPONENT_TYPES } from '../constants';
import { customComponentRegistry } from './customComponents';
import { hierarchyManager } from './hierarchy';

class UnionFind {
  parent: Map<string, string> = new Map();

  find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      return id;
    }
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let curr = id;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(idA: string, idB: string): void {
    const rootA = this.find(idA);
    const rootB = this.find(idB);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

export function getComponentPins(comp: CircuitComponentData): Pin[] {
  const local = getComponentPinsLocal(comp);
  const rad = (comp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return local.map(pin => {
    let px = pin.x;
    let py = pin.y;
    if (comp.flippedH) px = -px;
    if (comp.flippedV) py = -py;

    const wx = comp.x + (px * cos - py * sin);
    const wy = comp.y + (px * sin + py * cos);

    return {
      id: pin.id,
      name: pin.name,
      x: Math.round(wx),
      y: Math.round(wy),
      localX: pin.x,
      localY: pin.y,
      componentId: comp.id,
      domain: pin.domain,
      direction: pin.direction,
      dataType: pin.dataType
    };
  });
}

export function getComponentPinsLocal(comp: CircuitComponentData): Array<{
  id: string;
  name: string;
  x: number;
  y: number;
  domain: PinDomain;
  direction: PinDirection;
  dataType?: SignalDataType;
}> {
  switch (comp.type) {
    // Electrical Passives (2-terminal)
    case COMPONENT_TYPES.RESISTOR:
    case COMPONENT_TYPES.INDUCTOR:
    case COMPONENT_TYPES.CAPACITOR:
    case COMPONENT_TYPES.SERIES_RLC:
      return [
        { id: `${comp.id}_p1`, name: 'P1', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'P2', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.GROUND:
      return [
        { id: `${comp.id}_p1`, name: 'GND', x: 0, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Electrical Sources
    case COMPONENT_TYPES.AC_SOURCE_1PH:
    case COMPONENT_TYPES.DC_SOURCE:
      return [
        { id: `${comp.id}_p1`, name: '+', x: 0, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: '-', x: 0, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.AC_SOURCE_3PH:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -20, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: 0, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: 20, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: 0, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Switches & Breakers
    case COMPONENT_TYPES.BREAKER_1PH:
    case COMPONENT_TYPES.TIMED_SWITCH:
      return [
        { id: `${comp.id}_p1`, name: 'In', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Out', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.BREAKER_3PH:
      return [
        { id: `${comp.id}_pa1`, name: 'A1', x: -40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pa2`, name: 'A2', x: 40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb1`, name: 'B1', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb2`, name: 'B2', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc1`, name: 'C1', x: -40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc2`, name: 'C2', x: 40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.FAULT_BLOCK:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -40, y: -15, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: -40, y: 15, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pg`, name: 'GND', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Transformers
    case COMPONENT_TYPES.TRANSFORMER_1PH:
    case COMPONENT_TYPES.JILES_ATHERTON_CORE:
    case COMPONENT_TYPES.STRAY_CAP_TRANSFORMER:
      return [
        { id: `${comp.id}_p1`, name: 'P1', x: -12, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'P2', x: -12, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s1`, name: 'S1', x: 12, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s2`, name: 'S2', x: 12, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.TRANSFORMER_3PH:
      return [
        { id: `${comp.id}_pa`, name: 'P_A', x: -40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'P_B', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'P_C', x: -40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'P_N', x: -40, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sa`, name: 'S_A', x: 40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sb`, name: 'S_B', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sc`, name: 'S_C', x: 40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sn`, name: 'S_N', x: 40, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH:
    case COMPONENT_TYPES.OLTC_TRANSFORMER_3PH:
      return [
        { id: `${comp.id}_pa`, name: 'P_A', x: -45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'P_B', x: -45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'P_C', x: -45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'P_N', x: -45, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sa`, name: 'S_A', x: 45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sb`, name: 'S_B', x: 45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sc`, name: 'S_C', x: 45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_sn`, name: 'S_N', x: 45, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.ZIGZAG_TRANSFORMER:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -30, y: -30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: 0, y: -30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: 30, y: -30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: 0, y: 30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.PHASE_SHIFTER_PST:
      return [
        { id: `${comp.id}_in_a`, name: 'In_A', x: -45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_in_b`, name: 'In_B', x: -45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_in_c`, name: 'In_C', x: -45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_out_a`, name: 'Out_A', x: 45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_out_b`, name: 'Out_B', x: 45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_out_c`, name: 'Out_C', x: 45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];


    // Transmission Lines
    case COMPONENT_TYPES.PI_LINE:
    case COMPONENT_TYPES.BERGERON_LINE_1PH:
    case COMPONENT_TYPES.FD_PHASE_LINE:
      return [
        { id: `${comp.id}_p1`, name: 'Send', x: -45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Recv', x: 45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.BERGERON_LINE_3PH:
      return [
        { id: `${comp.id}_pa1`, name: 'Send A', x: -45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb1`, name: 'Send B', x: -45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc1`, name: 'Send C', x: -45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pa2`, name: 'Recv A', x: 45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb2`, name: 'Recv B', x: 45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc2`, name: 'Recv C', x: 45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Domain Bridges: Probes & Sensors
    case COMPONENT_TYPES.VOLTMETER:
    case COMPONENT_TYPES.SIGNAL_PROBE:
      return [
        { id: `${comp.id}_p1`, name: '+', x: 0, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: '-', x: 0, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.AMMETER:
    case COMPONENT_TYPES.MULTIMETER:
      return [
        { id: `${comp.id}_p1`, name: 'In', x: -35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Out', x: 35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Machines & Rotating Equipment
    case COMPONENT_TYPES.SYNC_GENERATOR:
      return [
        { id: `${comp.id}_p1`, name: 'Phase', x: 0, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'Neutral', x: 0, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.SYNC_MACHINE_DQ:
    case COMPONENT_TYPES.INDUCTION_MACHINE:
    case COMPONENT_TYPES.DFIG_GENERATOR:
    case COMPONENT_TYPES.PMSG_GENERATOR:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -18, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: 0, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: 18, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: 0, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.MULTI_MASS_SHAFT:
      return [
        { id: `${comp.id}_p1`, name: 'Shaft In', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Shaft Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.SURGE_ARRESTER:
      return [
        { id: `${comp.id}_p1`, name: 'Top', x: 0, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Bottom', x: 0, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Power Electronics Switches
    case COMPONENT_TYPES.IDEAL_SWITCH:
      return [
        { id: `${comp.id}_p1`, name: 'In', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'Out', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pg`, name: 'Gate', x: 0, y: -25, domain: 'control', direction: 'in', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.DIODE:
      return [
        { id: `${comp.id}_pa`, name: 'Anode', x: -35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pk`, name: 'Cathode', x: 35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.THYRISTOR:
      return [
        { id: `${comp.id}_pa`, name: 'Anode', x: -35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pk`, name: 'Cathode', x: 35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pg`, name: 'Gate', x: 0, y: -25, domain: 'control', direction: 'in', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.IGBT_DIODE:
      return [
        { id: `${comp.id}_pc`, name: 'Collector', x: 0, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pe`, name: 'Emitter', x: 0, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pg`, name: 'Gate', x: -35, y: 0, domain: 'control', direction: 'in', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.MMC_CONVERTER_3PH:
      return [
        { id: `${comp.id}_pdcp`, name: 'DC+', x: -45, y: -25, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pdcn`, name: 'DC-', x: -45, y: 25, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pa`, name: 'AC_A', x: 45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'AC_B', x: 45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'AC_C', x: 45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
    case COMPONENT_TYPES.LCC_BRIDGE_12PULSE:
      return [
        { id: `${comp.id}_pa`, name: 'AC_A', x: -45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'AC_B', x: -45, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'AC_C', x: -45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pdcp`, name: 'DC+', x: 45, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pdcn`, name: 'DC-', x: 45, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.STATCOM:
    case COMPONENT_TYPES.SVC:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -18, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: 0, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: 18, y: -40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: 0, y: 40, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Busbars
    case COMPONENT_TYPES.BUSBAR_1PH: {
      const len = comp.params?.length || 120;
      return [
        { id: `${comp.id}_t1`, name: 'T1', x: -len / 2, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_t2`, name: 'T2', x: -len / 4, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_t3`, name: 'T3', x: 0, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_t4`, name: 'T4', x: len / 4, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_t5`, name: 'T5', x: len / 2, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];
    }

    // 3-Phase Polyphase Bus & Splitters (Phase 5)
    case COMPONENT_TYPES.POLYPHASE_BUS_3PH: {
      const len = comp.params?.length || 140;
      return [
        { id: `${comp.id}_t1`, name: '3Ph_1', x: -len / 2, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' },
        { id: `${comp.id}_t2`, name: '3Ph_2', x: -len / 4, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' },
        { id: `${comp.id}_t3`, name: '3Ph_3', x: 0, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' },
        { id: `${comp.id}_t4`, name: '3Ph_4', x: len / 4, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' },
        { id: `${comp.id}_t5`, name: '3Ph_5', x: len / 2, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' }
      ];
    }

    case COMPONENT_TYPES.PHASE_SPLITTER_3PH:
      return [
        { id: `${comp.id}_p3ph`, name: '3Ph In', x: -40, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' },
        { id: `${comp.id}_pa`, name: 'A', x: 40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: 40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: 40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: 40, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.PHASE_MERGER_3PH:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -40, y: -20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: -40, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: -40, y: 20, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_pn`, name: 'N', x: -40, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p3ph`, name: '3Ph Out', x: 40, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' }
      ];

    // Wireless Data Labels (Phase 5)
    case COMPONENT_TYPES.DATA_LABEL_TRANSMITTER:
      return [
        { id: `${comp.id}_in`, name: 'In', x: -35, y: 0, domain: 'control', direction: 'in', dataType: 'real' }
      ];

    case COMPONENT_TYPES.DATA_LABEL_RECEIVER:
      return [
        { id: `${comp.id}_out`, name: 'Out', x: 35, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    // CSMF Control Blocks (Phase 5)
    case COMPONENT_TYPES.CSMF_CONSTANT:
      return [
        { id: `${comp.id}_out`, name: 'Out', x: 35, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_GAIN:
    case COMPONENT_TYPES.CSMF_MATH_FUNC:
    case COMPONENT_TYPES.CSMF_LIMITER:
    case COMPONENT_TYPES.CSMF_RATE_LIMITER:
    case COMPONENT_TYPES.CSMF_DEADBAND:
    case COMPONENT_TYPES.CSMF_HYSTERESIS:
    case COMPONENT_TYPES.CSMF_BACKLASH:
    case COMPONENT_TYPES.CSMF_LOOKUP_1D:
    case COMPONENT_TYPES.CSMF_EDGE_DETECTOR:
      return [
        { id: `${comp.id}_in`, name: 'In', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_out`, name: 'Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_SUM:
    case COMPONENT_TYPES.CSMF_MULTIPLIER:
    case COMPONENT_TYPES.CSMF_DIVIDER:
    case COMPONENT_TYPES.CSMF_MIN_MAX:
    case COMPONENT_TYPES.CSMF_LOGIC_GATE:
    case COMPONENT_TYPES.CSMF_COMPARATOR:
    case COMPONENT_TYPES.CSMF_LOOKUP_2D:
      return [
        { id: `${comp.id}_in1`, name: 'In1', x: -40, y: -15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_in2`, name: 'In2', x: -40, y: 15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_out`, name: 'Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_INTEGRATOR:
      return [
        { id: `${comp.id}_in`, name: 'In', x: -40, y: -10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_reset`, name: 'Rst', x: -40, y: 15, domain: 'control', direction: 'in', dataType: 'boolean' },
        { id: `${comp.id}_out`, name: 'Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_PID:
      return [
        { id: `${comp.id}_in`, name: 'Err', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_out`, name: 'Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_FLIP_FLOP:
      return [
        { id: `${comp.id}_in1`, name: 'S/D', x: -40, y: -15, domain: 'control', direction: 'in', dataType: 'boolean' },
        { id: `${comp.id}_in2`, name: 'R/Clk', x: -40, y: 15, domain: 'control', direction: 'in', dataType: 'boolean' },
        { id: `${comp.id}_out`, name: 'Q', x: 40, y: -15, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_out_not`, name: 'Qn', x: 40, y: 15, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.CSMF_CLARKE:
      return [
        { id: `${comp.id}_pa`, name: 'A', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'B', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'C', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_palpha`, name: 'α', x: 40, y: -20, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pbeta`, name: 'β', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pzero`, name: '0', x: 40, y: 20, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_PARK:
      return [
        { id: `${comp.id}_palpha`, name: 'α', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pbeta`, name: 'β', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_ptheta`, name: 'θ', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pd`, name: 'd', x: 40, y: -20, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pq`, name: 'q', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pzero`, name: '0', x: 40, y: 20, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_PLL:
      return [
        { id: `${comp.id}_pa`, name: 'Va', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'Vb', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'Vc', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_ptheta`, name: 'θ', x: 40, y: -20, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pomega`, name: 'ω', x: 40, y: -7, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pfreq`, name: 'f', x: 40, y: 7, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pd`, name: 'Vd', x: 40, y: 20, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER:
      return [
        { id: `${comp.id}_pa`, name: 'Va', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pb`, name: 'Vb', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pc`, name: 'Vc', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pv1_mag`, name: 'V1', x: 40, y: -25, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pv1_ang`, name: '∠1', x: 40, y: -15, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pv2_mag`, name: 'V2', x: 40, y: -5, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pv2_ang`, name: '∠2', x: 40, y: 5, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pv0_mag`, name: 'V0', x: 40, y: 15, domain: 'control', direction: 'out', dataType: 'real' },
        { id: `${comp.id}_pv0_ang`, name: '∠0', x: 40, y: 25, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.CSMF_SPWM:
      return [
        { id: `${comp.id}_pma`, name: 'Ma', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pmb`, name: 'Mb', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pmc`, name: 'Mc', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pga`, name: 'Ga', x: 40, y: -25, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pga_not`, name: 'Ga_', x: 40, y: -15, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgb`, name: 'Gb', x: 40, y: -5, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgb_not`, name: 'Gb_', x: 40, y: 5, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgc`, name: 'Gc', x: 40, y: 15, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgc_not`, name: 'Gc_', x: 40, y: 25, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.CSMF_SVPWM:
      return [
        { id: `${comp.id}_palpha`, name: 'Vα', x: -40, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pbeta`, name: 'Vβ', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pvdc`, name: 'Vdc', x: -40, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pga`, name: 'Ga', x: 40, y: -20, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgb`, name: 'Gb', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pgc`, name: 'Gc', x: 40, y: 20, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.CSMF_FIRING_GEN_6PULSE:
      return [
        { id: `${comp.id}_ptheta`, name: 'θ', x: -40, y: -15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_palpha_deg`, name: 'α', x: -40, y: 15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_pp1`, name: 'P1', x: 40, y: -25, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pp2`, name: 'P2', x: 40, y: -15, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pp3`, name: 'P3', x: 40, y: -5, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pp4`, name: 'P4', x: 40, y: 5, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pp5`, name: 'P5', x: 40, y: 15, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_pp6`, name: 'P6', x: 40, y: 25, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    // Phase 6: Hierarchical Submodule Block
    case COMPONENT_TYPES.SUBMODULE: {
      const childSheetId = comp.params?.childSheetId;
      const ports = childSheetId ? hierarchyManager.getSubmodulePorts(childSheetId) : [];
      if (ports.length === 0) {
        return [
          { id: `${comp.id}_p1`, name: 'IN', x: -45, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
          { id: `${comp.id}_p2`, name: 'OUT', x: 45, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
        ];
      }
      return ports.map((port, idx) => {
        const isLeft = idx % 2 === 0;
        const py = -20 + Math.floor(idx / 2) * 18;
        const px = isLeft ? -45 : 45;
        return {
          id: `${comp.id}_p${idx + 1}`,
          name: port.portName,
          x: px,
          y: py,
          domain: port.domain,
          direction: port.direction,
          dataType: port.dataType
        };
      });
    }

    case COMPONENT_TYPES.SUBMODULE_PORT_IN:
      return [
        { id: `${comp.id}_p1`, name: comp.name || 'IN', x: 25, y: 0, domain: comp.params?.portDomain || 'control', direction: 'out', dataType: comp.params?.portDataType || 'real' }
      ];

    case COMPONENT_TYPES.SUBMODULE_PORT_OUT:
      return [
        { id: `${comp.id}_p1`, name: comp.name || 'OUT', x: -25, y: 0, domain: comp.params?.portDomain || 'control', direction: 'in', dataType: comp.params?.portDataType || 'real' }
      ];

    case COMPONENT_TYPES.SUBMODULE_PORT_ELECTRICAL:
      return [
        { id: `${comp.id}_p1`, name: comp.name || 'PORT', x: 25, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.SUBMODULE_PORT_POLYPHASE:
      return [
        { id: `${comp.id}_p1`, name: comp.name || '3PH', x: 25, y: 0, domain: 'polyphase', direction: 'bidirectional', dataType: 'polyphase' }
      ];

    // Phase 6: Runtime Controls
    case COMPONENT_TYPES.RUNTIME_SLIDER:
    case COMPONENT_TYPES.RUNTIME_DIAL:
    case COMPONENT_TYPES.RUNTIME_BUTTON:
    case COMPONENT_TYPES.RUNTIME_SWITCH:
      return [
        { id: `${comp.id}_out`, name: 'Out', x: 45, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];

    case COMPONENT_TYPES.RUNTIME_GAUGE:
    case COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY:
      return [
        { id: `${comp.id}_in`, name: 'In', x: -45, y: 0, domain: 'control', direction: 'in', dataType: 'real' }
      ];

    // Phase 11: Power System Protection & ANSI Relays
    case COMPONENT_TYPES.RELAY_OVERCURRENT_50_51:
      return [
        { id: `${comp.id}_iin`, name: 'I', x: -40, y: -10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_vpol`, name: 'Vpol', x: -40, y: 10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_trip`, name: 'Trip', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.RELAY_DISTANCE_21:
      return [
        { id: `${comp.id}_va`, name: 'Va', x: -45, y: -25, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_vb`, name: 'Vb', x: -45, y: -15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_vc`, name: 'Vc', x: -45, y: -5, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_ia`, name: 'Ia', x: -45, y: 5, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_ib`, name: 'Ib', x: -45, y: 15, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_ic`, name: 'Ic', x: -45, y: 25, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_trip`, name: 'Trip', x: 45, y: 0, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.RELAY_DIFFERENTIAL_87:
      return [
        { id: `${comp.id}_i1a`, name: 'I1a', x: -45, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_i1b`, name: 'I1b', x: -45, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_i1c`, name: 'I1c', x: -45, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_i2a`, name: 'I2a', x: 45, y: -20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_i2b`, name: 'I2b', x: 45, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_i2c`, name: 'I2c', x: 45, y: 20, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_trip`, name: 'Trip', x: 0, y: 40, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.RELAY_FREQ_ROCOF_81:
      return [
        { id: `${comp.id}_vin`, name: 'V', x: -35, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_trip`, name: 'Trip', x: 35, y: 0, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.RELAY_LOSS_OF_FIELD_40:
      return [
        { id: `${comp.id}_vgen`, name: 'Vgen', x: -40, y: -10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_igen`, name: 'Igen', x: -40, y: 10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_trip`, name: 'Trip', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.RELAY_OUT_OF_STEP_78:
      return [
        { id: `${comp.id}_vin`, name: 'V', x: -40, y: -10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_iin`, name: 'I', x: -40, y: 10, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_psb`, name: 'PSB', x: 40, y: -10, domain: 'control', direction: 'out', dataType: 'boolean' },
        { id: `${comp.id}_ost`, name: 'OST', x: 40, y: 10, domain: 'control', direction: 'out', dataType: 'boolean' }
      ];

    case COMPONENT_TYPES.CURRENT_TRANSFORMER_CT:
      return [
        { id: `${comp.id}_p1`, name: 'P1', x: -35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'P2', x: 35, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s1`, name: 'S1', x: -15, y: 30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s2`, name: 'S2', x: 15, y: 30, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    case COMPONENT_TYPES.VOLTAGE_TRANSFORMER_VT:
      return [
        { id: `${comp.id}_p1`, name: 'P1', x: 0, y: -35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'P2', x: 0, y: 35, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s1`, name: 'S1', x: 35, y: -12, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_s2`, name: 'S2', x: 35, y: 12, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];

    // Phase 6: Custom User Workshop Component
    case COMPONENT_TYPES.CUSTOM_USER_COMPONENT: {
      const defId = comp.params?.customDefId;
      const def = defId ? customComponentRegistry.getComponent(defId) : undefined;
      if (def && def.pins && def.pins.length > 0) {
        return def.pins.map(p => ({
          id: `${comp.id}_${p.id}`,
          name: p.name,
          x: p.localX,
          y: p.localY,
          domain: p.domain,
          direction: p.direction,
          dataType: p.dataType
        }));
      }
      return [
        { id: `${comp.id}_in1`, name: 'In', x: -40, y: 0, domain: 'control', direction: 'in', dataType: 'real' },
        { id: `${comp.id}_out1`, name: 'Out', x: 40, y: 0, domain: 'control', direction: 'out', dataType: 'real' }
      ];
    }

    case COMPONENT_TYPES.GRAPH_FRAME:
      return [];

    default:
      return [
        { id: `${comp.id}_p1`, name: 'P1', x: -30, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' },
        { id: `${comp.id}_p2`, name: 'P2', x: 30, y: 0, domain: 'electrical', direction: 'bidirectional', dataType: 'real' }
      ];
  }
}

export class CircuitNetlist {
  nodes: Map<string, number> = new Map();
  nodeCount: number = 0;
  groundRoots: Set<string> = new Set();
  components: CircuitComponentData[] = [];
  wires: WireData[] = [];
  G_matrix: Matrix | null = null;
  diagnostics: CompilerDiagnostic[] = [];

  // Polyphase virtual pin connections
  polyphaseBundles: Map<string, { pa: string; pb: string; pc: string; pn?: string }> = new Map();

  compile(components: CircuitComponentData[], wires: WireData[]): CircuitNetlist {
    this.components = components || [];
    this.wires = wires || [];
    this.nodes.clear();
    this.groundRoots.clear();
    this.diagnostics = [];
    this.polyphaseBundles.clear();

    // 1. Build map of all pins with domain and direction
    const pinMap = new Map<string, Pin>();
    for (const comp of this.components) {
      for (const pin of getComponentPins(comp)) {
        pinMap.set(pin.id, pin);
      }
    }

    // 2. Dual-domain verification & wire classification
    for (const wire of this.wires) {
      if (wire.startPin && wire.endPin) {
        const pinA = pinMap.get(wire.startPin);
        const pinB = pinMap.get(wire.endPin);

        if (pinA && pinB) {
          const domA = pinA.domain || 'electrical';
          const domB = pinB.domain || 'electrical';

          if (domA !== domB) {
            this.diagnostics.push({
              id: `diag_domain_${wire.id}`,
              level: 'error',
              message: `Domain Mismatch: Cannot connect ${domA} pin '${pinA.name}' to ${domB} pin '${pinB.name}'. Use an appropriate transducer or probe.`,
              wireId: wire.id,
              pinId: pinA.id
            });
          }

          // Control domain direction checking
          if (domA === 'control' && domB === 'control') {
            if (pinA.direction === 'out' && pinB.direction === 'out') {
              this.diagnostics.push({
                id: `diag_fanin_${wire.id}`,
                level: 'warning',
                message: `Control Conflict: Two output pins ('${pinA.name}' and '${pinB.name}') connected together without a summation block.`,
                wireId: wire.id
              });
            }
          }
        }
      }
    }

    // 3. Wireless Data Label Resolution & Orphan Detection
    const transmitters = new Set<string>();
    const receivers = new Set<string>();

    for (const comp of this.components) {
      if (comp.type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER) {
        const sig = comp.params?.signalName || comp.name;
        if (sig) transmitters.add(sig);
      } else if (comp.type === COMPONENT_TYPES.DATA_LABEL_RECEIVER) {
        const sig = comp.params?.signalName || comp.name;
        if (sig) receivers.add(sig);
      }
    }

    for (const rec of receivers) {
      if (!transmitters.has(rec)) {
        this.diagnostics.push({
          id: `diag_orphan_${rec}`,
          level: 'warning',
          message: `Orphaned Wireless Receiver: No Transmitter found with tag '<${rec}>'. Receiver will default to 0.0.`
        });
      }
    }

    // 4. Electrical Nodal Matrix Compilation (Union-Find for electrical and polyphase splitters)
    const uf = new UnionFind();

    // Map wires
    for (const wire of this.wires) {
      if (wire.startPin && wire.endPin) {
        const pinA = pinMap.get(wire.startPin);
        const pinB = pinMap.get(wire.endPin);

        // Only unify electrical pins in the nodal admittance matrix
        if (pinA?.domain === 'electrical' && pinB?.domain === 'electrical') {
          uf.union(wire.startPin, wire.endPin);
        } else if (pinA?.domain === 'polyphase' && pinB?.domain === 'polyphase') {
          // Unify polyphase bus taps
          uf.union(wire.startPin, wire.endPin);
        }
      }
    }

    // Connect internal conductors for Phase Splitters & Mergers tied to Polyphase Buses
    for (const comp of this.components) {
      if (comp.type === COMPONENT_TYPES.PHASE_SPLITTER_3PH || comp.type === COMPONENT_TYPES.PHASE_MERGER_3PH) {
        const polyPinId = `${comp.id}_p3ph`;
        const root = uf.find(polyPinId);
        // Record bundle mapping
        this.polyphaseBundles.set(root, {
          pa: `${comp.id}_pa`,
          pb: `${comp.id}_pb`,
          pc: `${comp.id}_pc`,
          pn: `${comp.id}_pn`
        });
      } else if (comp.type === COMPONENT_TYPES.BUSBAR_1PH || comp.type === COMPONENT_TYPES.POLYPHASE_BUS_3PH) {
        // Multi-tap busbar: all taps belong to the same zero-impedance conductor
        const pins = getComponentPins(comp);
        for (let i = 1; i < pins.length; i++) {
          uf.union(pins[0].id, pins[i].id);
        }
      }
    }

    // Identify Ground components
    for (const comp of this.components) {
      if (comp.type === COMPONENT_TYPES.GROUND) {
        const pinId = `${comp.id}_p1`;
        const root = uf.find(pinId);
        this.groundRoots.add(root);
      }
    }

    // Assign node indices to electrical pins
    const rootToNodeIndex = new Map<string, number>();
    let nextNodeIndex = 1;

    for (const comp of this.components) {
      for (const pin of getComponentPins(comp)) {
        if (pin.domain === 'electrical') {
          const root = uf.find(pin.id);
          if (this.groundRoots.has(root)) {
            this.nodes.set(pin.id, 0); // 0 = Ground
          } else {
            if (!rootToNodeIndex.has(root)) {
              rootToNodeIndex.set(root, nextNodeIndex++);
            }
            const nodeIdx = rootToNodeIndex.get(root)!;
            this.nodes.set(pin.id, nodeIdx);
          }
        }
      }
    }

    this.nodeCount = nextNodeIndex - 1;
    this.G_matrix = Matrix.zeros(this.nodeCount, this.nodeCount);
    return this;
  }

  getNode(pinId: string): number {
    return this.nodes.has(pinId) ? this.nodes.get(pinId)! : 0;
  }

  getDiagnostics(): CompilerDiagnostic[] {
    return this.diagnostics;
  }

  stampConductance(matrix: Matrix, nodeA: number, nodeB: number, G: number): void {
    if (isNaN(G) || Math.abs(G) < 1e-15) return;
    const idxA = nodeA - 1;
    const idxB = nodeB - 1;

    if (nodeA > 0) matrix.add(idxA, idxA, G);
    if (nodeB > 0) matrix.add(idxB, idxB, G);
    if (nodeA > 0 && nodeB > 0) {
      matrix.add(idxA, idxB, -G);
      matrix.add(idxB, idxA, -G);
    }
  }

  stampConductanceSparse(builder: { add: (r: number, c: number, val: number) => void }, nodeA: number, nodeB: number, G: number): void {
    if (isNaN(G) || Math.abs(G) < 1e-15) return;
    const idxA = nodeA - 1;
    const idxB = nodeB - 1;

    if (nodeA > 0) builder.add(idxA, idxA, G);
    if (nodeB > 0) builder.add(idxB, idxB, G);
    if (nodeA > 0 && nodeB > 0) {
      builder.add(idxA, idxB, -G);
      builder.add(idxB, idxA, -G);
    }
  }

  stampCurrent(currentVector: Float64Array, node: number, I: number): void {
    if (isNaN(I) || Math.abs(I) < 1e-15 || node <= 0) return;
    const idx = node - 1;
    currentVector[idx] += I;
  }
}
