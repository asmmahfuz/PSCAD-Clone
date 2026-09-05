/**
 * PSCAD Modern - Automated Parametric Multi-Run Engine
 * 
 * Executes high-speed headless batch sensitivity sweeps (e.g. fault point-on-wave
 * inception angle, line length, fault resistance, control gains) and computes
 * statistical distributions (worst-case overvoltage, mean, std-dev, 95th percentile).
 */

import { CircuitNetlist } from '../engine/netlist';
import { EMTSimulationEngine } from '../engine/solver';
import type { CircuitComponentData, WireData } from '../types';
import { COMPONENT_TYPES } from '../constants';

export type SweepType = 'point_on_wave' | 'linear_range' | 'discrete_list';

export interface MultiRunConfig {
  name: string;
  sweepType: SweepType;
  targetComponentId: string;
  targetParamKey: string;
  // For linear range
  startValue?: number;
  endValue?: number;
  numRuns?: number;
  // For discrete list
  discreteValues?: number[];
  // For point on wave
  baseFaultTime?: number; // e.g. 0.05 s
  systemFreq?: number;    // e.g. 60 Hz
  // Simulation params
  dt?: number;
  tMax?: number;
  monitoredSignalName?: string;
  nominalVoltageBase?: number;
}

export interface SingleRunResult {
  runIndex: number;
  paramValue: number;
  paramLabel: string;
  peakVoltage: number;
  peakCurrent: number;
  overvoltagePu: number;
  thdPercent: number;
  energyJoules: number;
  signalsSample?: { time: number[]; values: number[] };
}

export interface MultiRunReport {
  config: MultiRunConfig;
  totalRuns: number;
  runs: SingleRunResult[];
  worstCaseRun: SingleRunResult;
  stats: {
    maxPeakVoltage: number;
    minPeakVoltage: number;
    meanPeakVoltage: number;
    stdDevVoltage: number;
    p95Voltage: number;
    maxOvervoltagePu: number;
  };
  executionTimeMs: number;
}

export type MultiRunProgressCallback = (progress: {
  currentRun: number;
  totalRuns: number;
  percent: number;
  currentResult?: SingleRunResult;
}) => void;

export class MultiRunEngine {
  /**
   * Execute batch multi-run parameter sweep
   */
  static async runBatch(
    baseComponents: CircuitComponentData[],
    baseWires: WireData[],
    config: MultiRunConfig,
    onProgress?: MultiRunProgressCallback
  ): Promise<MultiRunReport> {
    const tStart = performance.now();
    const valuesToRun = MultiRunEngine.generateSweepValues(config);
    const totalRuns = valuesToRun.length;
    const runs: SingleRunResult[] = [];

    const simDt = config.dt || 50e-6;
    const simTMax = config.tMax || 0.2;
    const freq = config.systemFreq || 60;
    const baseV = config.nominalVoltageBase || 230e3;

    for (let r = 0; r < totalRuns; r++) {
      const paramVal = valuesToRun[r];
      let paramLabel = `${paramVal.toFixed(2)}`;

      // Clone components for this isolated run
      const runComps: CircuitComponentData[] = JSON.parse(JSON.stringify(baseComponents));
      const targetComp = runComps.find(c => c.id === config.targetComponentId);

      if (targetComp) {
        if (!targetComp.params) targetComp.params = {};

        if (config.sweepType === 'point_on_wave') {
          // Inception angle theta in degrees -> time offset
          const angleDeg = paramVal;
          paramLabel = `${angleDeg.toFixed(0)}°`;
          const timeOffset = (angleDeg / 360.0) * (1.0 / freq);
          const faultStart = (config.baseFaultTime || 0.05) + timeOffset;
          targetComp.params.startTime = faultStart;
        } else {
          targetComp.params[config.targetParamKey] = paramVal;
        }
      }

      // Run headless simulation
      const runResult = MultiRunEngine.runHeadlessSimulation(
        runComps,
        baseWires,
        r + 1,
        paramVal,
        paramLabel,
        simDt,
        simTMax,
        config.monitoredSignalName,
        baseV
      );

      runs.push(runResult);

      if (onProgress) {
        onProgress({
          currentRun: r + 1,
          totalRuns,
          percent: Math.round(((r + 1) / totalRuns) * 100),
          currentResult: runResult
        });
      }

      // Yield control briefly for UI updates
      if (r % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Compute Statistical Summary
    const peakVoltages = runs.map(r => r.peakVoltage);
    const maxPeak = Math.max(...peakVoltages);
    const minPeak = Math.min(...peakVoltages);
    const meanPeak = peakVoltages.reduce((a, b) => a + b, 0) / (peakVoltages.length || 1);

    const variance = peakVoltages.reduce((acc, v) => acc + Math.pow(v - meanPeak, 2), 0) / (peakVoltages.length || 1);
    const stdDev = Math.sqrt(variance);

    // 95th Percentile
    const sortedV = [...peakVoltages].sort((a, b) => a - b);
    const p95Idx = Math.min(sortedV.length - 1, Math.floor(sortedV.length * 0.95));
    const p95Voltage = sortedV[p95Idx] || maxPeak;

    const worstCaseRun = runs.reduce((worst, cur) => (cur.peakVoltage > worst.peakVoltage ? cur : worst), runs[0]);
    const maxOvervoltagePu = worstCaseRun ? worstCaseRun.overvoltagePu : 1.0;

    const executionTimeMs = performance.now() - tStart;

    return {
      config,
      totalRuns,
      runs,
      worstCaseRun,
      stats: {
        maxPeakVoltage: maxPeak,
        minPeakVoltage: minPeak,
        meanPeakVoltage: meanPeak,
        stdDevVoltage: stdDev,
        p95Voltage,
        maxOvervoltagePu
      },
      executionTimeMs
    };
  }

  /**
   * Execute single run headless without requestAnimationFrame
   */
  private static runHeadlessSimulation(
    components: CircuitComponentData[],
    wires: WireData[],
    runIndex: number,
    paramValue: number,
    paramLabel: string,
    dt: number,
    tMax: number,
    monitoredName?: string,
    baseVoltage: number = 230e3
  ): SingleRunResult {
    const netlist = new CircuitNetlist();
    netlist.compile(components, wires);

    const engine = new EMTSimulationEngine();
    engine.setParameters(dt, tMax);
    engine.initialize(netlist);

    let peakV = 0.0;
    let peakI = 0.0;
    let totalEnergy = 0.0;

    const recordedTimes: number[] = [];
    const recordedVals: number[] = [];

    const totalSteps = Math.ceil(tMax / dt);
    const sampleInterval = Math.max(1, Math.floor(totalSteps / 150));

    for (let step = 0; step < totalSteps; step++) {
      engine.step();

      // Check node voltages & companion states
      const voltages = engine.lastNodeVoltages;
      if (voltages) {
        for (let i = 0; i < voltages.length; i++) {
          const absV = Math.abs(voltages[i]);
          if (absV > peakV) peakV = absV;
        }
      }

      // Check components
      for (const comp of components) {
        const state = engine.componentStates.get(comp.id);
        if (state) {
          if (state.prevI !== undefined && Math.abs(state.prevI) > peakI) {
            peakI = Math.abs(state.prevI);
          }
          if (comp.type === COMPONENT_TYPES.SURGE_ARRESTER && state.energyAbsorbedJ) {
            totalEnergy = state.energyAbsorbedJ;
          }
        }
      }

      if (step % sampleInterval === 0) {
        recordedTimes.push(engine.t);
        // Find monitored signal or max node voltage
        let val = 0.0;
        if (monitoredName && engine.signals.has(monitoredName)) {
          const sig = engine.signals.get(monitoredName);
          val = sig && sig.length > 0 ? sig[sig.length - 1] : 0.0;
        } else if (voltages && voltages.length > 0) {
          val = voltages[0];
        }
        recordedVals.push(val);
      }
    }

    const overvoltagePu = baseVoltage > 0 ? peakV / ((baseVoltage * Math.SQRT2) / Math.sqrt(3)) : 1.0;

    return {
      runIndex,
      paramValue,
      paramLabel,
      peakVoltage: peakV,
      peakCurrent: peakI,
      overvoltagePu: Math.round(overvoltagePu * 1000) / 1000,
      thdPercent: 0.0,
      energyJoules: totalEnergy,
      signalsSample: {
        time: recordedTimes,
        values: recordedVals
      }
    };
  }

  /**
   * Generate array of values to sweep
   */
  static generateSweepValues(config: MultiRunConfig): number[] {
    if (config.sweepType === 'point_on_wave') {
      const numRuns = config.numRuns || 12;
      const step = 360.0 / numRuns;
      const angles: number[] = [];
      for (let i = 0; i < numRuns; i++) {
        angles.push(i * step);
      }
      return angles;
    }

    if (config.sweepType === 'discrete_list') {
      return config.discreteValues && config.discreteValues.length > 0
        ? config.discreteValues
        : [1, 2, 5, 10, 20];
    }

    // Linear range
    const start = config.startValue !== undefined ? config.startValue : 0;
    const end = config.endValue !== undefined ? config.endValue : 100;
    const count = Math.max(2, config.numRuns || 10);
    const step = (end - start) / (count - 1);

    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      values.push(start + i * step);
    }
    return values;
  }
}
