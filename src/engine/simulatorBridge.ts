/**
 * PSCAD CLONE - Unified EMTDC Simulator & Native Kernel Bridge
 * Phase 19 - Step 19.4: Non-Pausing EMTDC Simulation State Mutator Bridge
 *
 * Provides:
 * 1. Unified simulation bridge interface for both web TS engine and native Rust/WASM simulation kernel
 * 2. Non-pausing live parameter dispatch pipeline to active simulation
 * 3. Bidirectional telemetry and high-speed TypedArray waveform streaming
 * 4. Interoperable re-exports of simulationBridge and runtimeMutator
 */

import { simulationBridge } from '../services/simulationBridge';
import { runtimeMutator, type MutationEvent } from './runtimeMutator';
import { simulationEngine } from './solver';
import type { CircuitNetlist } from './netlist';

export class SimulatorBridgeManager {
  /**
   * Mutate parameter live without pausing or resetting simulation time
   */
  public static async mutateParameterLive(
    componentId: string,
    paramName: string,
    value: any
  ): Promise<void> {
    // 1. Dispatch to EMT TS engine
    simulationEngine.setComponentParam(componentId, paramName, value);

    // 2. Dispatch through simulation bridge to native Rust kernel if active
    await simulationBridge.setParameter(componentId, paramName, value);
  }

  /**
   * Dispatch on-canvas runtime control (slider, dial, button, switch) live to running simulation
   */
  public static async dispatchRuntimeControl(
    controlCompId: string,
    value: number | boolean
  ): Promise<void> {
    // 1. Dispatch to simulation engine
    simulationEngine.setRuntimeControlValue(controlCompId, value);

    // 2. Forward to native bridge if active
    const comp = simulationEngine.netlist?.components?.find((c) => c.id === controlCompId);
    if (comp?.params?.targetCompId) {
      const targetParam = comp.params.targetParam || 'value';
      await simulationBridge.setParameter(comp.params.targetCompId, targetParam, value);
    }
  }

  /**
   * Start simulation run loop
   */
  public static async start(): Promise<void> {
    await simulationBridge.start();
  }

  /**
   * Pause simulation
   */
  public static async pause(): Promise<void> {
    await simulationBridge.pause();
  }

  /**
   * Step single simulation time-step
   */
  public static async step(): Promise<void> {
    await simulationBridge.step();
  }

  /**
   * Stop simulation and reset time to 0
   */
  public static async stop(): Promise<void> {
    await simulationBridge.stop();
  }

  /**
   * Initialize netlist
   */
  public static async initialize(netlist: CircuitNetlist, dt: number, tMax: number): Promise<void> {
    await simulationBridge.initialize(netlist, dt, tMax);
  }
}

export { simulationBridge, runtimeMutator };
export type { MutationEvent };
