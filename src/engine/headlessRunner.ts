/**
 * PSCAD Modern - Headless Simulation Engine Runner
 * Executes fast batch time-domain simulations and parametric sweeps in pure TypeScript / Web Worker without UI.
 */

import { CircuitNetlist } from './netlist';
import { simulationEngine } from './solver';
import type { CircuitComponentData, WireData } from '../types';

export interface HeadlessRunOptions {
  components: CircuitComponentData[];
  wires: WireData[];
  dt: number;
  tMax: number;
  cdaEnabled?: boolean;
  onProgress?: (progressPercent: number, currentTime: number) => void;
}

export interface HeadlessRunResult {
  stepsCompleted: number;
  totalSimTime: number;
  computeTimeMs: number;
  timeVector: Float64Array;
  signals: Record<string, Float64Array>;
  nodeCount: number;
  peakVoltages: Record<string, number>;
  thdMetrics?: Record<string, number>;
}

export class HeadlessRunner {
  /**
   * Run a full time-domain simulation headlessly
   */
  public static async run(options: HeadlessRunOptions): Promise<HeadlessRunResult> {
    const startTime = performance.now();
    const dt = options.dt > 0 ? options.dt : 5e-5;
    const tMax = options.tMax > 0 ? options.tMax : 0.2;
    const totalSteps = Math.ceil(tMax / dt);

    // 1. Build and compile netlist
    const netlist = new CircuitNetlist();
    netlist.compile(options.components, options.wires);

    // 2. Initialize Solver
    simulationEngine.setParameters(dt, tMax);
    if (options.cdaEnabled !== undefined) {
      simulationEngine.setCDAEnabled(options.cdaEnabled);
    }
    simulationEngine.initialize(netlist);


    const numNodes = netlist.nodeCount;
    const timeVector = new Float64Array(totalSteps);
    const nodeVoltages: Record<string, Float64Array> = {};
    const peakVoltages: Record<string, number> = {};

    for (let i = 1; i <= numNodes; i++) {
      const key = `V_Node_${i}`;
      nodeVoltages[key] = new Float64Array(totalSteps);
      peakVoltages[key] = 0;
    }

    let currentT = 0;
    const reportInterval = Math.max(1, Math.floor(totalSteps / 20));

    for (let step = 0; step < totalSteps; step++) {
      currentT = step * dt;
      timeVector[step] = currentT;

      simulationEngine.step();
      const voltages = simulationEngine.lastNodeVoltages;

      if (voltages) {
        for (let i = 0; i < voltages.length; i++) {
          const key = `V_Node_${i + 1}`;
          if (!nodeVoltages[key]) {
            nodeVoltages[key] = new Float64Array(totalSteps);
            peakVoltages[key] = 0;
          }
          const v = voltages[i];
          nodeVoltages[key][step] = v;
          if (Math.abs(v) > (peakVoltages[key] || 0)) {
            peakVoltages[key] = Math.abs(v);
          }
        }
      }

      if (options.onProgress && step % reportInterval === 0) {
        options.onProgress(Math.round((step / totalSteps) * 100), currentT);
      }
    }

    const computeTimeMs = performance.now() - startTime;

    return {
      stepsCompleted: totalSteps,
      totalSimTime: currentT,
      computeTimeMs,
      timeVector,
      signals: nodeVoltages,
      nodeCount: numNodes,
      peakVoltages,
    };
  }

  /**
   * Run multi-case parametric sensitivity sweep headlessly
   */
  public static async runParametricSweep(
    baseComponents: CircuitComponentData[],
    baseWires: WireData[],
    targetComponentId: string,
    targetParamName: string,
    paramValues: number[],
    dt: number,
    tMax: number
  ): Promise<Array<{ paramValue: number; peakVoltage: number; computeTimeMs: number }>> {
    const results = [];

    for (const val of paramValues) {
      // Mutate clone of components
      const clonedComps = baseComponents.map((c) => {
        if (c.id === targetComponentId) {
          return {
            ...c,
            params: {
              ...c.params,
              [targetParamName]: val,
            },
          };
        }
        return c;
      });

      const res = await HeadlessRunner.run({
        components: clonedComps,
        wires: baseWires,
        dt,
        tMax,
      });

      const maxPeak = Math.max(...Object.values(res.peakVoltages), 0);
      results.push({
        paramValue: val,
        peakVoltage: maxPeak,
        computeTimeMs: res.computeTimeMs,
      });
    }

    return results;
  }
}
