/**
 * PSCAD CLONE - Snapshot & Hot-Start State Engine
 * 
 * Provides complete serialization and deserialization of the active EMTDC simulation state:
 * - Node voltages
 * - Inductor / Capacitor / Line / Transformer companion history currents & voltages
 * - Transformer saturation flux
 * - Synchronous machine rotor angle, speed, excitation, and governor states
 * - CSMF control block integrators, filters, and PLL angles
 * - Switch / Breaker positions
 * 
 * Enables instant simulation resumption at steady-state (t = T_ss) with zero startup transients.
 */

import type { EMTSimulationEngine } from './solver';

export interface ComponentStateSnapshot {
  prevV?: number;
  prevI?: number;
  i_series?: number;
  v_L?: number;
  v_c1?: number;
  v_c2?: number;
  i_c1?: number;
  i_c2?: number;
  flux?: number;
  i_m?: number;
  i_leak?: number;
  v_leak?: number;
  v_m?: number;
  delta?: number;
  omega_pu?: number;
  Tm_pu?: number;
  Vf?: number;
  totalAngle?: number;
  isClosed?: boolean;
  isFaultActive?: boolean;
  integ?: number;
  prevErr?: number;
  derivFilt?: number;
  pllTheta?: number;
  pllOmega?: number;
  [key: string]: any;
}

export interface SimulationSnapshot {
  id: string;
  name: string;
  createdAt: string;
  simTime: number;
  stepCount: number;
  dt: number;
  tMax: number;
  nodeCount: number;
  nodeVoltages: number[];
  componentStates: Record<string, ComponentStateSnapshot>;
  description?: string;
}

export class SnapshotEngine {
  private savedSnapshots: Map<string, SimulationSnapshot> = new Map();

  /**
   * Take a full snapshot of the simulation engine state
   */
  takeSnapshot(
    engine: EMTSimulationEngine,
    name?: string,
    description?: string
  ): SimulationSnapshot {
    const simTime = engine.t;
    const stepCount = engine.stepCount;
    const dt = engine.dt;
    const tMax = engine.tMax;
    const nodeCount = engine.netlist ? engine.netlist.nodeCount : 0;

    // Capture component states
    const componentStates: Record<string, ComponentStateSnapshot> = {};
    for (const [id, state] of engine.componentStates.entries()) {
      componentStates[id] = { ...state };
    }

    // Capture latest node voltages from solver or last step
    const nodeVoltages: number[] = [];
    if (engine.lastNodeVoltages) {
      for (let i = 0; i < engine.lastNodeVoltages.length; i++) {
        nodeVoltages.push(engine.lastNodeVoltages[i]);
      }
    } else {
      for (let i = 0; i < nodeCount; i++) {
        nodeVoltages.push(0.0);
      }
    }

    const id = `snap_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const snapshotName = name || `Snapshot at t = ${(simTime * 1000).toFixed(2)} ms`;

    const snapshot: SimulationSnapshot = {
      id,
      name: snapshotName,
      createdAt: new Date().toISOString(),
      simTime,
      stepCount,
      dt,
      tMax,
      nodeCount,
      nodeVoltages,
      componentStates,
      description: description || `State snapshot captured at t = ${simTime.toFixed(4)} s (Step ${stepCount})`
    };

    this.savedSnapshots.set(id, snapshot);
    return snapshot;
  }

  /**
   * Restore a simulation engine state from a snapshot (Hot-Start)
   */
  restoreSnapshot(engine: EMTSimulationEngine, snapshot: SimulationSnapshot): boolean {
    if (!engine || !snapshot) return false;

    // Stop current run if active
    if (engine.isRunning) {
      engine.pause();
    }

    // Set simulation time and time step
    engine.t = snapshot.simTime;
    engine.stepCount = snapshot.stepCount;
    engine.dt = snapshot.dt;
    engine.tMax = snapshot.tMax;

    // Restore component states
    engine.componentStates.clear();
    for (const [id, state] of Object.entries(snapshot.componentStates)) {
      engine.componentStates.set(id, { ...state });
    }

    // Restore node voltages
    if (snapshot.nodeVoltages && snapshot.nodeVoltages.length > 0) {
      engine.lastNodeVoltages = new Float64Array(snapshot.nodeVoltages);
    }

    // Rebuild conductance matrix with restored states
    engine.needsRecompilation = true;
    engine.rebuildConductanceMatrix();

    engine.emit('log', {
      type: 'info',
      text: `[Hot-Start] Successfully restored snapshot '${snapshot.name}' at t = ${snapshot.simTime.toFixed(4)} s.`
    });

    engine.emit('snapshot_restored', { snapshot });
    return true;
  }

  /**
   * Get all in-memory snapshots
   */
  getAllSnapshots(): SimulationSnapshot[] {
    return Array.from(this.savedSnapshots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Delete a snapshot by ID
   */
  deleteSnapshot(id: string): boolean {
    return this.savedSnapshots.delete(id);
  }

  /**
   * Export snapshot to JSON string
   */
  exportToJSON(snapshot: SimulationSnapshot): string {
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * Import snapshot from JSON string
   */
  importFromJSON(jsonStr: string): SimulationSnapshot {
    const snapshot: SimulationSnapshot = JSON.parse(jsonStr);
    if (!snapshot.id || snapshot.simTime === undefined || !snapshot.componentStates) {
      throw new Error('Invalid PSCAD simulation snapshot format');
    }
    this.savedSnapshots.set(snapshot.id, snapshot);
    return snapshot;
  }
}

export const snapshotEngine = new SnapshotEngine();
