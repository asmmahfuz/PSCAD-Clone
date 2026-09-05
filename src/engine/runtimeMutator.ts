/**
 * PSCAD CLONE - EMTDC Non-Pausing Runtime State Mutator Engine
 * Phase 19 - Step 19.4: Non-Pausing Simulation State Mutator Bridge
 *
 * Implements:
 * 1. Real-time non-pausing parameter mutation pipeline for active EMTDC simulation
 * 2. Sherman-Morrison rank-1 & rank-k fast conductance matrix solver for on-the-fly branch changes
 * 3. Phase-continuous frequency integration ($\theta(t) = \int 2\pi f(t) dt$) ensuring $C^0$ continuity without phase jumps
 * 4. Multi-target signal routing & expression parameter mapping for canvas sliders, dials, and switches
 */

import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';
import type { LUSolver } from './matrix';

export interface BranchConductanceUpdate {
  componentId: string;
  node1: number; // 1-based node index or 0 for ground
  node2: number; // 1-based node index or 0 for ground
  oldG: number;
  newG: number;
  deltaG: number;
}

export interface MutationOptions {
  preserveTime?: boolean;
  triggerCDA?: boolean;
  useShermanMorrison?: boolean;
  notifyListeners?: boolean;
}

export interface MutationEvent {
  componentId: string;
  paramKey: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  isContinuous: boolean;
}

export type MutationListener = (event: MutationEvent) => void;

/**
 * Continuous instantaneous phase integrator for frequency-modulated sources and generators.
 * Guarantees that varying frequency f(t) dynamically causes zero phase-angle discontinuity.
 */
export class PhaseContinuousIntegrator {
  private _accumulatedPhase: number = 0.0;

  constructor(initialFreq: number = 60.0, initialPhaseRad: number = 0.0) {
    void initialFreq;
    this._accumulatedPhase = initialPhaseRad;
  }

  /**
   * Advance the continuous phase angle by delta-t at instantaneous frequency
   */
  public advance(freq: number, dt: number): number {
    const omega = 2.0 * Math.PI * freq;
    this._accumulatedPhase += omega * dt;
    // Wrap to [0, 2pi) to prevent precision loss over long simulation runs
    if (this._accumulatedPhase > 2.0 * Math.PI * 1e6) {
      this._accumulatedPhase = this._accumulatedPhase % (2.0 * Math.PI);
    }
    return this._accumulatedPhase;
  }

  /**
   * Get current phase angle in radians
   */
  public getPhase(): number {
    return this._accumulatedPhase;
  }

  /**
   * Set explicit phase offset without disrupting continuity
   */
  public setPhase(phaseRad: number): void {
    this._accumulatedPhase = phaseRad;
  }

  /**
   * Reset integrator
   */
  public reset(initialPhaseRad: number = 0.0): void {
    this._accumulatedPhase = initialPhaseRad;
  }
}

/**
 * Sherman-Morrison Fast Rank-1 & Rank-K Conductance Matrix Solver
 *
 * For a branch between node i and node j with conductance change deltaG:
 * G_new = G_base + deltaG * d * d^T = G_base + u * v^T
 * where d = (e_i - e_j), u = deltaG * d, v = d
 *
 * Sherman-Morrison Inverse Solution Formula:
 * (G + u v^T)^(-1) b = G^(-1) b - [G^(-1) u * (v^T G^(-1) b)] / [1 + v^T G^(-1) u]
 */
export class ShermanMorrisonEngine {
  /**
   * Solve (G_base + deltaG * d * d^T) x = b using existing base LU factorization
   */
  public static solveRank1(
    rhs: Float64Array,
    baseLu: LUSolver,
    node1: number,
    node2: number,
    deltaG: number,
    out?: Float64Array
  ): Float64Array {
    const n = baseLu.n;
    const x = out || new Float64Array(n);

    // If deltaG is virtually 0, standard LU solve
    if (Math.abs(deltaG) < 1e-15 || (node1 === 0 && node2 === 0)) {
      return baseLu.solve(rhs, x);
    }

    // 1. Solve base system: x0 = G^(-1) * b
    const x0 = baseLu.solve(rhs);

    // 2. Build difference vector d = e_i - e_j
    // Note: node numbers are 1-based (node 0 is ground)
    const u = new Float64Array(n);
    if (node1 > 0 && node1 <= n) {
      u[node1 - 1] += deltaG;
    }
    if (node2 > 0 && node2 <= n) {
      u[node2 - 1] -= deltaG;
    }

    // 3. Solve auxiliary system: z = G^(-1) * u
    const z = baseLu.solve(u);

    // 4. Compute inner products:
    // v = d = (e_i - e_j) -> v^T * z = z[node1-1] - z[node2-1]
    let vTz = 0.0;
    if (node1 > 0 && node1 <= n) vTz += z[node1 - 1];
    if (node2 > 0 && node2 <= n) vTz -= z[node2 - 1];

    const gamma = 1.0 + vTz;

    // If gamma is near zero (singular perturbation), return base solution
    if (Math.abs(gamma) < 1e-14) {
      x.set(x0);
      return x;
    }

    // v^T * x0 = x0[node1-1] - x0[node2-1]
    let vTx0 = 0.0;
    if (node1 > 0 && node1 <= n) vTx0 += x0[node1 - 1];
    if (node2 > 0 && node2 <= n) vTx0 -= x0[node2 - 1];

    const alpha = vTx0 / gamma;

    // 5. Final rank-1 updated solution: x = x0 - alpha * z
    for (let i = 0; i < n; i++) {
      x[i] = x0[i] - alpha * z[i];
    }

    return x;
  }

  /**
   * Solve multiple simultaneous branch conductance updates via Woodbury formula:
   * (G + U V^T)^(-1) b = x0 - (G^(-1) U) * [I_k + V^T (G^(-1) U)]^(-1) * (V^T x0)
   */
  public static solveRankK(
    rhs: Float64Array,
    baseLu: LUSolver,
    updates: BranchConductanceUpdate[],
    out?: Float64Array
  ): Float64Array {
    const validUpdates = updates.filter((u) => Math.abs(u.deltaG) > 1e-15);
    const k = validUpdates.length;

    if (k === 0) {
      return baseLu.solve(rhs, out);
    }

    if (k === 1) {
      const up = validUpdates[0];
      return this.solveRank1(rhs, baseLu, up.node1, up.node2, up.deltaG, out);
    }

    const n = baseLu.n;
    const x = out || new Float64Array(n);

    // 1. Solve base system: x0 = G^(-1) b
    const x0 = baseLu.solve(rhs);

    // 2. Compute Z = G^(-1) U (n x k) and vector r = V^T x0 (k x 1)
    const Z: Float64Array[] = new Array(k);
    const r = new Float64Array(k);

    for (let j = 0; j < k; j++) {
      const up = validUpdates[j];
      const u = new Float64Array(n);
      if (up.node1 > 0 && up.node1 <= n) u[up.node1 - 1] += up.deltaG;
      if (up.node2 > 0 && up.node2 <= n) u[up.node2 - 1] -= up.deltaG;

      Z[j] = baseLu.solve(u);

      let rVal = 0.0;
      if (up.node1 > 0 && up.node1 <= n) rVal += x0[up.node1 - 1];
      if (up.node2 > 0 && up.node2 <= n) rVal -= x0[up.node2 - 1];
      r[j] = rVal;
    }

    // 3. Form k x k matrix M = I_k + V^T Z
    const M: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let p = 0; p < k; p++) {
      const up_p = validUpdates[p];
      for (let q = 0; q < k; q++) {
        let vTz = 0.0;
        if (up_p.node1 > 0 && up_p.node1 <= n) vTz += Z[q][up_p.node1 - 1];
        if (up_p.node2 > 0 && up_p.node2 <= n) vTz -= Z[q][up_p.node2 - 1];
        M[p][q] = (p === q ? 1.0 : 0.0) + vTz;
      }
    }

    // 4. Solve k x k system M y = r
    const y = new Float64Array(k);
    if (k === 2) {
      const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      if (Math.abs(det) > 1e-14) {
        y[0] = (M[1][1] * r[0] - M[0][1] * r[1]) / det;
        y[1] = (-M[1][0] * r[0] + M[0][0] * r[1]) / det;
      }
    } else {
      // Gaussian elimination for small k x k matrix
      const A = M.map((row) => [...row]);
      const b = Array.from(r);
      for (let i = 0; i < k; i++) {
        let maxRow = i;
        for (let row = i + 1; row < k; row++) {
          if (Math.abs(A[row][i]) > Math.abs(A[maxRow][i])) maxRow = row;
        }
        if (Math.abs(A[maxRow][i]) < 1e-14) continue;
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [b[i], b[maxRow]] = [b[maxRow], b[i]];

        for (let row = i + 1; row < k; row++) {
          const factor = A[row][i] / A[i][i];
          for (let col = i; col < k; col++) A[row][col] -= factor * A[i][col];
          b[row] -= factor * b[i];
        }
      }
      for (let i = k - 1; i >= 0; i--) {
        let sum = b[i];
        for (let col = i + 1; col < k; col++) sum -= A[i][col] * y[col];
        y[i] = Math.abs(A[i][i]) > 1e-14 ? sum / A[i][i] : 0.0;
      }
    }

    // 5. Final solution: x = x0 - sum(y[j] * Z[j])
    for (let i = 0; i < n; i++) {
      let corr = 0.0;
      for (let j = 0; j < k; j++) {
        corr += y[j] * Z[j][i];
      }
      x[i] = x0[i] - corr;
    }

    return x;
  }
}

/**
 * Non-Pausing Runtime State Mutator
 */
export class RuntimeMutator {
  private _phaseIntegrators: Map<string, PhaseContinuousIntegrator> = new Map();
  private _branchUpdates: Map<string, BranchConductanceUpdate> = new Map();
  private _listeners: Set<MutationListener> = new Set();
  private _activeMutationsCount: number = 0;

  /**
   * Subscribe to mutation events
   */
  public onMutation(cb: MutationListener): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /**
   * Emit mutation event to listeners
   */
  private emitMutation(event: MutationEvent): void {
    this._listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('[RuntimeMutator] Listener error:', err);
      }
    });
  }

  /**
   * Get or create a phase integrator for an AC source or generator
   */
  public getPhaseIntegrator(sourceId: string, initialFreq: number = 60.0): PhaseContinuousIntegrator {
    let integrator = this._phaseIntegrators.get(sourceId);
    if (!integrator) {
      integrator = new PhaseContinuousIntegrator(initialFreq);
      this._phaseIntegrators.set(sourceId, integrator);
    }
    return integrator;
  }

  /**
   * Advance continuous phase for an AC source
   */
  public advanceSourcePhase(sourceId: string, freq: number, dt: number): number {
    const integrator = this.getPhaseIntegrator(sourceId, freq);
    return integrator.advance(freq, dt);
  }

  /**
   * Register or update a variable branch conductance modification
   */
  public recordBranchConductance(
    componentId: string,
    node1: number,
    node2: number,
    baseG: number,
    currentG: number
  ): void {
    const deltaG = currentG - baseG;
    if (Math.abs(deltaG) < 1e-15) {
      this._branchUpdates.delete(componentId);
    } else {
      this._branchUpdates.set(componentId, {
        componentId,
        node1,
        node2,
        oldG: baseG,
        newG: currentG,
        deltaG,
      });
    }
  }

  /**
   * Get all active branch conductance updates for Sherman-Morrison solver
   */
  public getActiveBranchUpdates(): BranchConductanceUpdate[] {
    return Array.from(this._branchUpdates.values());
  }

  /**
   * Clear recorded branch updates (e.g., after full matrix re-factorization)
   */
  public clearBranchUpdates(): void {
    this._branchUpdates.clear();
  }

  /**
   * Mutate a single component parameter in-place without resetting simulation clock or buffers
   */
  public mutateParam(
    components: CircuitComponentData[],
    compId: string,
    key: string,
    value: any,
    options: MutationOptions = {}
  ): { updatedComponents: CircuitComponentData[]; changed: boolean } {
    let changed = false;
    let oldValue: any = undefined;

    const updated = components.map((comp) => {
      if (comp.id === compId) {
        oldValue = comp.params?.[key];
        if (oldValue !== value) {
          changed = true;
          return {
            ...comp,
            params: {
              ...comp.params,
              [key]: value,
            },
          };
        }
      }
      return comp;
    });

    if (changed && options.notifyListeners !== false) {
      this._activeMutationsCount++;
      this.emitMutation({
        componentId: compId,
        paramKey: key,
        oldValue,
        newValue: value,
        timestamp: performance.now(),
        isContinuous: typeof value === 'number',
      });
    }

    return { updatedComponents: updated, changed };
  }

  /**
   * Dispatches on-canvas continuous control (slider, dial) or discrete trigger (button, switch)
   * to target circuit components, CSMF control pins, and wireless signal buses.
   */
  public mutateRuntimeControl(
    components: CircuitComponentData[],
    controlCompId: string,
    value: number | boolean
  ): { updatedComponents: CircuitComponentData[]; targetCompId?: string; targetParam?: string } {
    const controlComp = components.find((c) => c.id === controlCompId);
    if (!controlComp) {
      return { updatedComponents: components };
    }

    const targetCompId = controlComp.params?.targetCompId;
    const targetParam = controlComp.params?.targetParam;

    const isDiscrete = typeof value === 'boolean';
    const numValue = isDiscrete ? (value ? 1.0 : 0.0) : Number(value);

    // Update the control component itself
    const updatedControlParams = {
      ...controlComp.params,
      ...(isDiscrete
        ? controlComp.type === COMPONENT_TYPES.RUNTIME_BUTTON
          ? { buttonState: value }
          : { switchState: value, isClosed: value }
        : { value: numValue }),
    };

    const updatedControlComp: CircuitComponentData = {
      ...controlComp,
      params: updatedControlParams,
    };

    let mappedTargetParam = targetParam;

    const updatedList = components.map((c) => {
      if (c.id === controlCompId) {
        return updatedControlComp;
      }
      if (targetCompId && c.id === targetCompId) {
        const isBreaker =
          c.type === COMPONENT_TYPES.BREAKER_1PH ||
          c.type === COMPONENT_TYPES.BREAKER_3PH ||
          c.type === COMPONENT_TYPES.TIMED_SWITCH;

        const isSource =
          c.type === COMPONENT_TYPES.AC_SOURCE_1PH ||
          c.type === COMPONENT_TYPES.AC_SOURCE_3PH ||
          c.type === COMPONENT_TYPES.DC_SOURCE;

        const isResistor = c.type === COMPONENT_TYPES.RESISTOR;

        mappedTargetParam =
          targetParam ||
          (isBreaker
            ? 'isClosed'
            : isResistor
            ? 'resistance'
            : isSource
            ? 'freq'
            : 'value');

        return {
          ...c,
          params: {
            ...c.params,
            [mappedTargetParam]: value,
          },
        };
      }
      return c;
    });

    this.emitMutation({
      componentId: controlCompId,
      paramKey: isDiscrete ? 'switchState' : 'value',
      oldValue: controlComp.params?.value,
      newValue: value,
      timestamp: performance.now(),
      isContinuous: !isDiscrete,
    });

    return {
      updatedComponents: updatedList,
      targetCompId,
      targetParam: mappedTargetParam,
    };
  }

  /**
   * Batch mutate multiple parameters simultaneously
   */
  public batchMutate(
    components: CircuitComponentData[],
    mutations: Array<{ compId: string; paramKey: string; value: any }>
  ): CircuitComponentData[] {
    const mutationMap = new Map<string, Map<string, any>>();
    for (const m of mutations) {
      if (!mutationMap.has(m.compId)) {
        mutationMap.set(m.compId, new Map());
      }
      mutationMap.get(m.compId)!.set(m.paramKey, m.value);
    }

    return components.map((comp) => {
      const compMutations = mutationMap.get(comp.id);
      if (compMutations) {
        const nextParams = { ...comp.params };
        compMutations.forEach((val, key) => {
          nextParams[key] = val;
        });
        return {
          ...comp,
          params: nextParams,
        };
      }
      return comp;
    });
  }

  /**
   * Reset mutator state
   */
  public reset(): void {
    this._phaseIntegrators.clear();
    this._branchUpdates.clear();
    this._activeMutationsCount = 0;
  }
}

export const runtimeMutator = new RuntimeMutator();
