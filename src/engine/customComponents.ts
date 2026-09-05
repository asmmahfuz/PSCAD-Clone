/**
 * PSCAD Modern - Custom Component Registry & Script Execution Engine
 * 
 * Features:
 * - Dynamic SVG / shape symbol definition storage
 * - Custom pin layout and parameter schema
 * - High-speed sandboxed TS/JS equation transfer function evaluation
 * - LocalStorage persistence and starter templates
 */

import type { CustomComponentDef } from '../types';

export const BUILTIN_CUSTOM_COMPONENTS: CustomComponentDef[] = [
  {
    id: 'custom_saturable_reactor',
    name: 'Saturable Iron-Core Reactor',
    category: 'Custom Power Magnetics',
    description: 'Non-linear saturable inductor with custom flux-current polynomial curve.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -35, y1: -25, x2: 35, y2: 25, stroke: '#61afef', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'line', x1: -20, y1: -15, x2: 20, y2: 15, stroke: '#e5c07b', strokeWidth: 2 },
      { id: 's3', type: 'line', x1: -20, y1: 15, x2: 20, y2: -15, stroke: '#e5c07b', strokeWidth: 2 },
      { id: 's4', type: 'text', cx: 0, cy: 0, text: 'SAT_L', fill: '#e6edf3', fontSize: 10 },
    ],
    pins: [
      { id: 'p1', name: 'In', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p2', name: 'Out', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'L0', label: 'Unsaturated Inductance (H)', type: 'number', default: 0.1, min: 1e-6 },
      { name: 'Lsat', label: 'Saturated Inductance (H)', type: 'number', default: 0.01, min: 1e-6 },
      { name: 'Isat', label: 'Saturation Current (A)', type: 'number', default: 50.0, min: 0.1 },
    ],
    scriptCode: `// Saturable Reactor Equation
// inputs: { In: current }
// params: { L0, Lsat, Isat }
const I = Math.abs(inputs.In || 0);
const L = I < params.Isat ? params.L0 : params.Lsat + (params.L0 - params.Lsat) / (1 + Math.pow(I / params.Isat, 4));
return {
  outputs: { Out: L * (inputs.In || 0) },
  state: { currentL: L }
};`,
  },
  {
    id: 'custom_first_order_lag',
    name: 'First-Order Lag Filter (PT1)',
    category: 'Custom Control Blocks',
    description: 'Low-pass filter transfer function G(s) = K / (1 + s*T) using Trapezoidal discretization.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -35, y1: -25, x2: 35, y2: 25, stroke: '#10b981', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'text', cx: 0, cy: -6, text: 'K / (1+sT)', fill: '#e6edf3', fontSize: 10 },
      { id: 's3', type: 'text', cx: 0, cy: 12, text: 'PT1', fill: '#34d399', fontSize: 9 },
    ],
    pins: [
      { id: 'p1', name: 'u', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p2', name: 'y', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'K', label: 'Gain K', type: 'number', default: 1.0 },
      { name: 'T', label: 'Time Constant T (s)', type: 'number', default: 0.05, min: 1e-5 },
    ],
    scriptCode: `// First-Order Lag Filter (Bilinear / Tustin Transform)
// inputs: { u }
// params: { K, T }
const u = inputs.u || 0;
const prevU = state.prevU || 0;
const prevY = state.prevY || 0;
const T = Math.max(1e-6, params.T || 0.05);
const K = params.K !== undefined ? params.K : 1.0;

const alpha = (2 * T - dt) / (2 * T + dt);
const beta = (K * dt) / (2 * T + dt);
const y = alpha * prevY + beta * (u + prevU);

return {
  outputs: { y },
  state: { prevU: u, prevY: y }
};`,
  },
  {
    id: 'custom_power_calc',
    name: 'Instantaneous PQ Power Calculator',
    category: 'Custom Meters & Math',
    description: 'Calculates active P(t) = Va*Ia + Vb*Ib + Vc*Ic and reactive power Q(t).',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shapes: [
      { id: 's1', type: 'rect', x1: -40, y1: -30, x2: 40, y2: 30, stroke: '#9333ea', strokeWidth: 2, fill: '#1e2533' },
      { id: 's2', type: 'text', cx: 0, cy: -8, text: 'P-Q Calc', fill: '#c084fc', fontSize: 11 },
      { id: 's3', type: 'text', cx: 0, cy: 10, text: '3-Phase', fill: '#e6edf3', fontSize: 9 },
    ],
    pins: [
      { id: 'p_va', name: 'Va', localX: -45, localY: -20, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_vb', name: 'Vb', localX: -45, localY: -10, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_vc', name: 'Vc', localX: -45, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_ia', name: 'Ia', localX: -45, localY: 10, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_ib', name: 'Ib', localX: -45, localY: 20, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'p_p', name: 'P', localX: 45, localY: -10, domain: 'control', direction: 'out', dataType: 'real' },
      { id: 'p_q', name: 'Q', localX: 45, localY: 10, domain: 'control', direction: 'out', dataType: 'real' },
    ],
    parameters: [
      { name: 'scaleMW', label: 'Scale Output to MW', type: 'boolean', default: false },
    ],
    scriptCode: `// 3-Phase Instantaneous Active & Reactive Power
const va = inputs.Va || 0;
const vb = inputs.Vb || 0;
const vc = inputs.Vc || 0;
const ia = inputs.Ia || 0;
const ib = inputs.Ib || 0;
const ic = -(ia + ib); // 3-wire assumption

const P_inst = va * ia + vb * ib + vc * ic;
const Q_inst = (1 / Math.sqrt(3)) * ((va - vb) * ic + (vb - vc) * ia + (vc - va) * ib);
const scale = params.scaleMW ? 1e-6 : 1.0;

return {
  outputs: {
    P: P_inst * scale,
    Q: Q_inst * scale
  },
  state: {}
};`,
  },
];

export class CustomComponentRegistry {
  private components: Map<string, CustomComponentDef> = new Map();
  private compiledFunctions: Map<string, Function> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage(): void {
    this.components.clear();
    this.compiledFunctions.clear();

    // 1. Load built-in templates
    BUILTIN_CUSTOM_COMPONENTS.forEach((c) => {
      this.registerComponent(c, false);
    });

    // 2. Load user components from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('pscad_custom_components');
        if (stored) {
          const parsed = JSON.parse(stored) as CustomComponentDef[];
          parsed.forEach((c) => this.registerComponent(c, false));
        }
      }
    } catch (e) {
      console.warn('Could not load custom components from localStorage:', e);
    }
  }

  public saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const customOnly = Array.from(this.components.values()).filter(
          (c) => !BUILTIN_CUSTOM_COMPONENTS.some((b) => b.id === c.id)
        );
        localStorage.setItem('pscad_custom_components', JSON.stringify(customOnly));
      }
    } catch (e) {
      console.warn('Could not save custom components to localStorage:', e);
    }
  }

  public registerComponent(def: CustomComponentDef, persist = true): void {
    this.components.set(def.id, JSON.parse(JSON.stringify(def)));
    this.compileScript(def.id, def.scriptCode);
    if (persist) this.saveToStorage();
  }

  public deleteComponent(id: string): void {
    this.components.delete(id);
    this.compiledFunctions.delete(id);
    this.saveToStorage();
  }

  public getComponent(id: string): CustomComponentDef | undefined {
    return this.components.get(id);
  }

  public getAllComponents(): CustomComponentDef[] {
    return Array.from(this.components.values());
  }

  /**
   * Compiles the custom TS/JS equation script into an executable JS function
   */
  private compileScript(id: string, code: string): void {
    try {
      // Create sandboxed evaluator function
      const fn = new Function('inputs', 'params', 'state', 'dt', 't', `${code}`);
      this.compiledFunctions.set(id, fn);
    } catch (err) {
      console.error(`Compilation error in custom component script '${id}':`, err);
      this.compiledFunctions.set(id, () => ({ outputs: {}, state: {} }));
    }
  }

  /**
   * Executes a custom component's transfer function during simulation step
   */
  public evaluate(
    id: string,
    inputs: Record<string, number>,
    params: Record<string, any>,
    state: any,
    dt: number,
    t: number
  ): { outputs: Record<string, number>; state: any } {
    let fn = this.compiledFunctions.get(id);
    if (!fn) {
      const def = this.components.get(id);
      if (def) {
        this.compileScript(id, def.scriptCode);
        fn = this.compiledFunctions.get(id);
      }
    }

    if (!fn) return { outputs: {}, state: state || {} };

    try {
      const res = fn(inputs || {}, params || {}, state || {}, dt, t);
      return {
        outputs: res && res.outputs ? res.outputs : {},
        state: res && res.state !== undefined ? res.state : state || {},
      };
    } catch (err) {
      console.warn(`Runtime error evaluating custom component '${id}':`, err);
      return { outputs: {}, state: state || {} };
    }
  }
}

export const customComponentRegistry = new CustomComponentRegistry();
