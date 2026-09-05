import { tauriBridge } from './tauriBridge';
import { simulationEngine } from '../engine/solver';
import type { CircuitNetlist } from '../engine/netlist';

export interface WaveformFrame {
  channelCount: number;
  sampleCount: number;
  startTime: number;
  dt: number;
  channels: Map<string, Float64Array>;
}

export interface SimTelemetryEvent {
  isRunning: boolean;
  isPaused: boolean;
  t: number;
  stepCount: number;
  speedMultiplier: number;
  nodeCount: number;
  activeSwitches?: number;
  cpuTimeUs?: number;
}

type TelemetryCallback = (telemetry: SimTelemetryEvent) => void;
type SignalsCallback = (signals: Map<string, number[]>) => void;
type LogCallback = (log: { type: 'info' | 'warn' | 'error'; text: string }) => void;

class SimulationBridge {
  private _useNativeKernel: boolean = false;
  private _telemetryListeners: Set<TelemetryCallback> = new Set();
  private _signalListeners: Set<SignalsCallback> = new Set();
  private _logListeners: Set<LogCallback> = new Set();
  private _cachedSignals: Map<string, number[]> = new Map();

  constructor() {
    this._useNativeKernel = tauriBridge.isTauri();
    this.setupListeners();
  }

  public isNativeKernelEnabled(): boolean {
    return this._useNativeKernel;
  }

  public setUseNativeKernel(enabled: boolean) {
    this._useNativeKernel = enabled && tauriBridge.isTauri();
  }

  private setupListeners() {
    // Listen to fallback TS engine events
    simulationEngine.on('time_update', ({ t }) => {
      if (!this._useNativeKernel) {
        const signals = simulationEngine.getSignals();
        this._cachedSignals = new Map(signals);
        this.emitTelemetry({
          isRunning: simulationEngine.isRunning,
          isPaused: simulationEngine.isPaused,
          t,
          stepCount: simulationEngine.stepCount,
          speedMultiplier: simulationEngine.speedMultiplier,
          nodeCount: simulationEngine.conductanceMatrix?.rows || 0,
        });
        this._signalListeners.forEach((fn) => fn(this._cachedSignals));
      }
    });

    simulationEngine.on('log', (log) => {
      this._logListeners.forEach((fn) => fn(log));
    });
  }

  public onTelemetry(cb: TelemetryCallback): () => void {
    this._telemetryListeners.add(cb);
    return () => this._telemetryListeners.delete(cb);
  }

  public onSignals(cb: SignalsCallback): () => void {
    this._signalListeners.add(cb);
    return () => this._signalListeners.delete(cb);
  }

  public onLog(cb: LogCallback): () => void {
    this._logListeners.add(cb);
    return () => this._logListeners.delete(cb);
  }

  private emitTelemetry(telemetry: SimTelemetryEvent) {
    this._telemetryListeners.forEach((fn) => fn(telemetry));
  }

  public async initialize(netlist: CircuitNetlist, dt: number, tMax: number) {
    simulationEngine.setParameters(dt, tMax);
    simulationEngine.initialize(netlist);
  }

  public async start(): Promise<void> {
    if (this._useNativeKernel && tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('native_sim_start', {
          config: {
            dt: simulationEngine.dt,
            t_max: simulationEngine.tMax,
            solver_type: 'sparse_lu',
            cda_enabled: simulationEngine.cdaManager.enabled,
            num_subsystems: 1,
          },
        });
      } catch (err) {
        console.warn('[SimBridge] Native start failed, using TS engine:', err);
      }
    }
    simulationEngine.start();
  }

  public async pause(): Promise<void> {
    if (this._useNativeKernel && tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('native_sim_pause');
      } catch (e) {}
    }
    simulationEngine.pause();
  }

  public async step(): Promise<void> {
    if (this._useNativeKernel && tauriBridge.isTauri()) {
      try {
        const telemetry = await tauriBridge.invoke<any>('native_sim_step');
        if (telemetry) {
          this.emitTelemetry({
            isRunning: telemetry.is_running,
            isPaused: telemetry.is_paused,
            t: telemetry.t,
            stepCount: telemetry.step_count,
            speedMultiplier: telemetry.speed_multiplier,
            nodeCount: telemetry.node_count,
            cpuTimeUs: telemetry.cpu_time_us_per_step,
          });
        }
      } catch (e) {}
    }
    simulationEngine.step();
  }

  public async stop(): Promise<void> {
    if (this._useNativeKernel && tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('native_sim_stop');
      } catch (e) {}
    }
    simulationEngine.stop();
  }

  public async setParameter(componentId: string, paramName: string, value: any): Promise<void> {
    simulationEngine.setComponentParam(componentId, paramName, value);
    if (this._useNativeKernel && tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('native_sim_set_param', {
          componentId,
          paramName,
          value: typeof value === 'boolean' ? (value ? 1.0 : 0.0) : Number(value),
        });
      } catch (e) {}
    }
  }

  public async setRuntimeControl(controlCompId: string, value: number | boolean): Promise<void> {
    simulationEngine.setRuntimeControlValue(controlCompId, value);
    const comp = simulationEngine.netlist?.components?.find((c) => c.id === controlCompId);
    if (comp?.params?.targetCompId) {
      const targetParam = comp.params.targetParam || 'value';
      await this.setParameter(comp.params.targetCompId, targetParam, value);
    }
  }


  public getSignals(): Map<string, number[]> {
    return simulationEngine.getSignals();
  }

  /**
   * Decode binary waveform packet from native IPC streaming
   * Binary buffer format:
   * [4 bytes u32: channelCount]
   * [4 bytes u32: sampleCount]
   * [8 bytes f64: startTime]
   * [8 bytes f64: dt]
   * [data: channelCount * sampleCount * 8 bytes f64]
   */
  public decodeBinaryWaveforms(
    buffer: ArrayBuffer,
    channelNames: string[]
  ): WaveformFrame {
    const view = new DataView(buffer);
    const channelCount = view.getUint32(0, true);
    const sampleCount = view.getUint32(4, true);
    const startTime = view.getFloat64(8, true);
    const dt = view.getFloat64(16, true);

    const channels = new Map<string, Float64Array>();
    let byteOffset = 24;

    for (let c = 0; c < channelCount; c++) {
      const name = channelNames[c] || `Channel_${c + 1}`;
      const samples = new Float64Array(sampleCount);
      for (let s = 0; s < sampleCount; s++) {
        samples[s] = view.getFloat64(byteOffset, true);
        byteOffset += 8;
      }
      channels.set(name, samples);
    }

    return {
      channelCount,
      sampleCount,
      startTime,
      dt,
      channels,
    };
  }
}

export const simulationBridge = new SimulationBridge();
