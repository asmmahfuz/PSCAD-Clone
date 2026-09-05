/**
 * PSCAD CLONE - Component Definitions vs Instances Management Engine
 * 
 * Features:
 * - Decoupled Component Definition registry mirroring PSCAD Master & User Definitions
 * - Dynamic port propagation: editing definition ports updates all placed schematic instances
 * - "Create Definition / Submodule from Selection" auto-encapsulation
 * - Reusable composite blocks, custom scripted components, and macro templates
 */

import type {
  ComponentDefinition,
  DefinitionCategory,
  CircuitComponentData,
  WireData,
  CircuitSheet,
  CustomPinDef,
} from '../types';
import { COMPONENT_TYPES } from '../constants';
import { customComponentRegistry } from './customComponents';

export const BUILTIN_DEFINITIONS: ComponentDefinition[] = [
  {
    id: 'def_submodule_generic',
    name: 'Generic_Submodule',
    category: 'submodule',
    description: 'Hierarchical composite circuit block with configurable input/output interface ports.',
    baseType: COMPONENT_TYPES.SUBMODULE,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ports: [
      { id: 'p_in1', name: 'IN_1', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_out1', name: 'OUT_1', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'submoduleName', label: 'Module Identifier', type: 'string', default: 'Submodule_Block' },
      { name: 'enableMonitoring', label: 'Internal Telemetry Probing', type: 'boolean', default: true },
    ],
    defaultParams: {
      submoduleName: 'Submodule_Block',
      enableMonitoring: true,
    },
  },
  {
    id: 'def_custom_saturable_reactor',
    name: 'Saturable_Reactor',
    category: 'custom',
    description: 'Non-linear saturable inductor with custom flux-current polynomial curve.',
    baseType: COMPONENT_TYPES.CUSTOM_USER_COMPONENT,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -35, y1: -25, x2: 35, y2: 25, stroke: '#61afef', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'line', x1: -20, y1: -15, x2: 20, y2: 15, stroke: '#e5c07b', strokeWidth: 2 },
      { id: 's3', type: 'line', x1: -20, y1: 15, x2: 20, y2: -15, stroke: '#e5c07b', strokeWidth: 2 },
      { id: 's4', type: 'text', cx: 0, cy: 0, text: 'SAT_L', fill: '#e6edf3', fontSize: 10 },
    ],
    ports: [
      { id: 'p1', name: 'In', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p2', name: 'Out', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'L0', label: 'Unsaturated Inductance (H)', type: 'number', default: 0.1, min: 1e-6 },
      { name: 'Lsat', label: 'Saturated Inductance (H)', type: 'number', default: 0.01, min: 1e-6 },
      { name: 'Isat', label: 'Saturation Current (A)', type: 'number', default: 50.0, min: 0.1 },
    ],
    defaultParams: { L0: 0.1, Lsat: 0.01, Isat: 50.0 },
    scriptCode: `const I = Math.abs(inputs.In || 0);
const L = I < params.Isat ? params.L0 : params.Lsat + (params.L0 - params.Lsat) / (1 + Math.pow(I / params.Isat, 4));
return { outputs: { Out: L * (inputs.In || 0) }, state: { currentL: L } };`,
  },
  {
    id: 'def_custom_first_order_lag',
    name: 'PT1_Lag_Filter',
    category: 'custom',
    description: 'First-order low-pass transfer function G(s) = K / (1 + s*T) via Bilinear transformation.',
    baseType: COMPONENT_TYPES.CUSTOM_USER_COMPONENT,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -35, y1: -25, x2: 35, y2: 25, stroke: '#10b981', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'text', cx: 0, cy: -6, text: 'K / (1+sT)', fill: '#e6edf3', fontSize: 10 },
      { id: 's3', type: 'text', cx: 0, cy: 12, text: 'PT1', fill: '#34d399', fontSize: 9 },
    ],
    ports: [
      { id: 'p1', name: 'u', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p2', name: 'y', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'K', label: 'Gain K', type: 'number', default: 1.0 },
      { name: 'T', label: 'Time Constant T (s)', type: 'number', default: 0.05, min: 1e-5 },
    ],
    defaultParams: { K: 1.0, T: 0.05 },
    scriptCode: `const u = inputs.u || 0;
const prevU = state.prevU || 0;
const prevY = state.prevY || 0;
const T = Math.max(1e-6, params.T || 0.05);
const K = params.K !== undefined ? params.K : 1.0;
const alpha = (2 * T - dt) / (2 * T + dt);
const beta = (K * dt) / (2 * T + dt);
const y = alpha * prevY + beta * (u + prevU);
return { outputs: { y }, state: { prevU: u, prevY: y } };`,
  },
  {
    id: 'def_custom_power_calc',
    name: '3Ph_Power_Calculator',
    category: 'custom',
    description: 'Instantaneous 3-phase Active P(t) and Reactive Q(t) Power calculation block.',
    baseType: COMPONENT_TYPES.CUSTOM_USER_COMPONENT,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -40, y1: -30, x2: 40, y2: 30, stroke: '#9333ea', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'text', cx: 0, cy: -8, text: 'P-Q Calc', fill: '#c084fc', fontSize: 11 },
      { id: 's3', type: 'text', cx: 0, cy: 10, text: '3-Phase', fill: '#e6edf3', fontSize: 9 },
    ],
    ports: [
      { id: 'p_va', name: 'Va', localX: -45, localY: -20, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_vb', name: 'Vb', localX: -45, localY: -10, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_vc', name: 'Vc', localX: -45, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_ia', name: 'Ia', localX: -45, localY: 10, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_ib', name: 'Ib', localX: -45, localY: 20, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_p', name: 'P', localX: 45, localY: -10, domain: 'control', direction: 'out', dataType: 'real' },
      { id: 'p_q', name: 'Q', localX: 45, localY: 10, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'scaleMW', label: 'Scale Output to MW/MVAR', type: 'boolean', default: false },
    ],
    defaultParams: { scaleMW: false },
    scriptCode: `const va = inputs.Va || 0;
const vb = inputs.Vb || 0;
const vc = inputs.Vc || 0;
const ia = inputs.Ia || 0;
const ib = inputs.Ib || 0;
const ic = -(ia + ib);
const P_inst = va * ia + vb * ib + vc * ic;
const Q_inst = (1 / Math.sqrt(3)) * ((va - vb) * ic + (vb - vc) * ia + (vc - va) * ib);
const scale = params.scaleMW ? 1e-6 : 1.0;
return { outputs: { P: P_inst * scale, Q: Q_inst * scale }, state: {} };`,
  },
  {
    id: 'def_3ph_filter_bank',
    name: '3Ph_Harmonic_Filter_Bank',
    category: 'macro',
    description: 'Tuned 5th/7th/11th harmonic shunt bandpass filter bank with series damping resistor.',
    baseType: COMPONENT_TYPES.SUBMODULE,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ports: [
      { id: 'p_bus_in', name: 'BUS_ABC', localX: -40, localY: 0, domain: 'polyphase', direction: 'in', dataType: 'polyphase' },
      { id: 'p_gnd', name: 'GND', localX: 40, localY: 0, domain: 'electrical', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'tuningOrder', label: 'Tuned Harmonic Order', type: 'number', default: 5, min: 1 },
      { name: 'Q_filter_MVAR', label: 'Reactive Rating (MVAR)', type: 'number', default: 50.0, min: 0.1 },
      { name: 'qualityFactor', label: 'Quality Factor Q', type: 'number', default: 30.0, min: 1.0 },
    ],
    defaultParams: { tuningOrder: 5, Q_filter_MVAR: 50.0, qualityFactor: 30.0 },
  },
];

type Listener = () => void;

export class DefinitionRegistry {
  private definitions: Map<string, ComponentDefinition> = new Map();
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.initBuiltins();
  }

  private initBuiltins(): void {
    BUILTIN_DEFINITIONS.forEach((def) => {
      this.definitions.set(def.id, { ...def });
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in DefinitionRegistry listener:', e);
      }
    });
  }

  public registerDefinition(def: ComponentDefinition, overwrite: boolean = true): ComponentDefinition {
    if (this.definitions.has(def.id) && !overwrite) {
      return this.definitions.get(def.id)!;
    }
    const finalDef: ComponentDefinition = {
      ...def,
      version: (def.version || 0) + 1,
      updatedAt: Date.now(),
    };
    this.definitions.set(def.id, finalDef);

    // Sync with custom workshop if category is custom
    if (def.category === 'custom' && def.shapes && def.scriptCode) {
      customComponentRegistry.registerComponent(
        {
          id: def.id,
          name: def.name,
          category: 'User Custom Definitions',
          description: def.description || '',
          shapes: def.shapes,
          pins: def.ports,
          parameters: def.parameters,
          scriptCode: def.scriptCode,
          createdAt: def.createdAt || Date.now(),
          updatedAt: Date.now(),
        },
        true
      );
    }

    this.notify();
    return finalDef;
  }

  public getDefinition(defId: string): ComponentDefinition | undefined {
    return this.definitions.get(defId);
  }

  public getAllDefinitions(): ComponentDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getDefinitionsByCategory(category: DefinitionCategory): ComponentDefinition[] {
    return this.getAllDefinitions().filter((d) => d.category === category);
  }

  public updateDefinition(defId: string, updates: Partial<ComponentDefinition>): ComponentDefinition | undefined {
    const existing = this.definitions.get(defId);
    if (!existing) return undefined;

    const updated: ComponentDefinition = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      version: (existing.version || 1) + 1,
      updatedAt: Date.now(),
    };

    this.definitions.set(defId, updated);

    // Also update custom component if applicable
    if (updated.category === 'custom' && updated.shapes && updated.scriptCode) {
      customComponentRegistry.registerComponent(
        {
          id: updated.id,
          name: updated.name,
          category: 'User Custom Definitions',
          description: updated.description || '',
          shapes: updated.shapes,
          pins: updated.ports,
          parameters: updated.parameters,
          scriptCode: updated.scriptCode,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
        true
      );
    }

    this.notify();
    return updated;
  }

  public deleteDefinition(defId: string): boolean {
    if (defId.startsWith('def_builtin_') || defId === 'def_submodule_generic') {
      return false; // Prevent deleting core built-in template
    }
    const res = this.definitions.delete(defId);
    if (res) this.notify();
    return res;
  }

  public loadDefinitions(defsRecord: Record<string, ComponentDefinition> | ComponentDefinition[]): void {
    if (Array.isArray(defsRecord)) {
      defsRecord.forEach((d) => this.definitions.set(d.id, { ...d }));
    } else if (defsRecord && typeof defsRecord === 'object') {
      Object.entries(defsRecord).forEach(([id, def]) => {
        this.definitions.set(id, { ...def });
      });
    }
    this.notify();
  }

  public exportDefinitions(): Record<string, ComponentDefinition> {
    const res: Record<string, ComponentDefinition> = {};
    this.definitions.forEach((def, id) => {
      res[id] = JSON.parse(JSON.stringify(def));
    });
    return res;
  }

  /**
   * Encapsulate selected components & internal wires into a new Definition & Child Sheet.
   * Generates input/output boundary ports and creates a single Submodule instance.
   */
  public createDefinitionFromSelection(
    selectedComponents: CircuitComponentData[],
    selectedWires: WireData[],
    definitionName: string,
    parentSheetId: string
  ): {
    definition: ComponentDefinition;
    instance: CircuitComponentData;
    childSheet: CircuitSheet;
    remainingWires: WireData[];
  } {
    const cleanName = (definitionName || `Def_Module_${Date.now().toString().slice(-4)}`).replace(/\s+/g, '_');
    const defId = `def_${cleanName.toLowerCase()}_${Date.now()}`;
    const childSheetId = `sheet_${defId}`;
    const instanceId = `submod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Calculate bounding box and center of selected components
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    const selectedCompIds = new Set(selectedComponents.map((c) => c.id));

    selectedComponents.forEach((c) => {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    });

    const centerX = Math.round((minX + maxX) / 2 / 20) * 20;
    const centerY = Math.round((minY + maxY) / 2 / 20) * 20;

    // Shift components inside child sheet so they center around (500, 300)
    const childComps: CircuitComponentData[] = selectedComponents.map((c) => ({
      ...JSON.parse(JSON.stringify(c)),
      x: c.x - centerX + 500,
      y: c.y - centerY + 300,
      selected: false,
    }));

    // Find internal wires vs external boundary wires
    const internalWires: WireData[] = [];
    const remainingWires: WireData[] = [];

    selectedWires.forEach((w) => {
      const startCompId = w.startPin ? w.startPin.split('_')[0] : null;
      const endCompId = w.endPin ? w.endPin.split('_')[0] : null;

      const isStartInternal = startCompId ? selectedCompIds.has(startCompId) : false;
      const isEndInternal = endCompId ? selectedCompIds.has(endCompId) : false;

      if (isStartInternal && isEndInternal) {
        internalWires.push({
          ...JSON.parse(JSON.stringify(w)),
          points: (w.points || []).map((pt) => ({
            x: pt.x - centerX + 500,
            y: pt.y - centerY + 300,
          })),
          selected: false,
        });
      } else {
        remainingWires.push(w);
      }
    });

    // Generate boundary interface ports
    const ports: CustomPinDef[] = [
      { id: 'p1', name: 'IN_1', localX: -40, localY: -10, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p2', name: 'OUT_1', localX: 40, localY: 10, domain: 'control', direction: 'out', dataType: 'real' },
    ];

    // Add In and Out port components inside child sheet
    childComps.unshift(
      {
        id: `port_in_${Date.now()}`,
        type: COMPONENT_TYPES.SUBMODULE_PORT_IN,
        name: 'IN_1',
        x: 200,
        y: 300,
        rotation: 0,
        params: { portDirection: 'in', portDomain: 'control', signalName: 'IN_1' },
      },
      {
        id: `port_out_${Date.now()}`,
        type: COMPONENT_TYPES.SUBMODULE_PORT_OUT,
        name: 'OUT_1',
        x: 800,
        y: 300,
        rotation: 0,
        params: { portDirection: 'out', portDomain: 'control', signalName: 'OUT_1' },
      }
    );

    const childSheet: CircuitSheet = {
      id: childSheetId,
      name: cleanName,
      parentSheetId,
      parentComponentId: instanceId,
      components: childComps,
      wires: internalWires,
    };

    const definition: ComponentDefinition = {
      id: defId,
      name: cleanName,
      category: 'submodule',
      description: `Encapsulated submodule definition containing ${selectedComponents.length} components.`,
      baseType: COMPONENT_TYPES.SUBMODULE,
      ports,
      parameters: [
        { name: 'submoduleName', label: 'Submodule Name', type: 'string', default: cleanName },
      ],
      defaultParams: {
        submoduleName: cleanName,
        childSheetId,
        definitionId: defId,
      },
      childSheetId,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.registerDefinition(definition);

    const instance: CircuitComponentData = {
      id: instanceId,
      type: COMPONENT_TYPES.SUBMODULE,
      name: cleanName,
      x: centerX,
      y: centerY,
      rotation: 0,
      definitionId: defId,
      params: {
        childSheetId,
        definitionId: defId,
        submoduleName: cleanName,
      },
      selected: true,
    };

    return { definition, instance, childSheet, remainingWires };
  }

  /**
   * Synchronize definition port / param updates to all placed instances across all sheets
   */
  public syncDefinitionToInstances(
    defId: string,
    sheets: Record<string, CircuitSheet> | CircuitSheet[]
  ): { updatedCount: number; updatedSheets: Record<string, CircuitSheet> } {
    const def = this.getDefinition(defId);
    if (!def) return { updatedCount: 0, updatedSheets: {} };

    const sheetsList = Array.isArray(sheets) ? sheets : Object.values(sheets);
    let updatedCount = 0;
    const updatedSheetsRecord: Record<string, CircuitSheet> = {};

    sheetsList.forEach((sheet) => {
      let sheetModified = false;
      const nextComps = sheet.components.map((comp) => {
        if (comp.definitionId === defId || comp.params?.definitionId === defId || comp.params?.customDefId === defId) {
          updatedCount++;
          sheetModified = true;
          return {
            ...comp,
            params: {
              ...def.defaultParams,
              ...comp.params,
              definitionId: defId,
            },
          };
        }
        return comp;
      });

      if (sheetModified) {
        updatedSheetsRecord[sheet.id] = {
          ...sheet,
          components: nextComps,
        };
      }
    });

    return { updatedCount, updatedSheets: updatedSheetsRecord };
  }
}

export const definitionRegistry = new DefinitionRegistry();
