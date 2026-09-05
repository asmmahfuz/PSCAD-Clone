/**
 * PSCAD CLONE - EMT Simulation Solver Engine (TypeScript)
 * 
 * Integrated with:
 * - Critical Damping Adjustment (CDA) 2-step Backward Euler chatter suppression
 * - Two-Half-Step Switching Point Interpolation for zero-crossing accuracy
 * - High-Performance Sparse LU Linear Solver with Markowitz Pivoting
 * - Subsystem Decoupling across transmission delay lines
 * - Snapshot & Hot-Start State Engine
 */

import { Matrix, LUSolver } from './matrix';
import { SparseMatrixCSR, SparseMatrixBuilder } from './sparseMatrix';
import { SparseLUSolver } from './sparseLUSolver';
import { CDAManager, CDAStage } from './cda';
import { SwitchingInterpolator } from './interpolator';
import { SubsystemCoordinator } from './subsystems';
import { CompanionModels } from './companionModels';
import { BergeronLine1Ph } from './lines/bergeronLine';
import { PolyphaseBergeronLine } from './lines/polyphaseBergeron';
import { FDPhaseLine } from './lines/fdPhaseLine';
import { UmecTransformer } from './transformers/umecTransformer';
import { SynchronousMachineDq } from './machines/synchronousMachineDq';
import { InductionMachine } from './machines/inductionMachine';
import { DfigMachine } from './machines/dfigMachine';
import { PmsgMachine } from './machines/pmsgMachine';
import { SurgeArrester } from './passives/surgeArrester';
import { IdealSwitch } from './powerElectronics/idealSwitch';
import { PowerDiode } from './powerElectronics/diode';
import { Thyristor } from './powerElectronics/thyristor';
import { IgbtDiode } from './powerElectronics/igbtMosfet';
import { MmcConverterDEM } from './powerElectronics/mmcConverter';
import { LccGraetzBridge } from './powerElectronics/lccBridge';
import { Statcom } from './powerElectronics/statcom';
import { StaticVarCompensator } from './powerElectronics/svc';
import { CSMFEngine } from './csmf/csmfEngine';
import { runtimeMutator, ShermanMorrisonEngine } from './runtimeMutator';
import { CircuitNetlist, getComponentPins } from './netlist';
import type { CircuitComponentData } from '../types';
import { COMPONENT_TYPES } from '../constants';

export type SimEventCallback = (data: any) => void;
export type SolverType = 'sparse' | 'dense' | 'subsystems';

export class EMTSimulationEngine {
  netlist: CircuitNetlist | null = null;
  dt: number = 5e-5;
  tMax: number = 0.5;
  t: number = 0.0;
  stepCount: number = 0;

  isRunning: boolean = false;
  isPaused: boolean = false;
  speedMultiplier: number = 1.0;

  // Solver mode & options
  solverType: SolverType = 'sparse';
  cdaManager: CDAManager = new CDAManager(true);
  interpolator: SwitchingInterpolator = new SwitchingInterpolator(true);
  subsystemCoordinator: SubsystemCoordinator = new SubsystemCoordinator();
  csmfEngine: CSMFEngine = new CSMFEngine();

  // Distributed Transmission Line Engines (Phase 2)
  bergeronLines: Map<string, BergeronLine1Ph> = new Map();
  polyphaseLines: Map<string, PolyphaseBergeronLine> = new Map();
  fdPhaseLines: Map<string, FDPhaseLine> = new Map();

  // Magnetics, Machines & Non-Linear Equipment (Phase 3)
  umecTransformers: Map<string, UmecTransformer> = new Map();
  syncMachinesDq: Map<string, SynchronousMachineDq> = new Map();
  inductionMachines: Map<string, InductionMachine> = new Map();
  dfigMachines: Map<string, DfigMachine> = new Map();
  pmsgMachines: Map<string, PmsgMachine> = new Map();
  surgeArresters: Map<string, SurgeArrester> = new Map();

  // Power Electronics, MMC & FACTS (Phase 4)
  idealSwitches: Map<string, IdealSwitch> = new Map();
  diodes: Map<string, PowerDiode> = new Map();
  thyristors: Map<string, Thyristor> = new Map();
  igbtDiodes: Map<string, IgbtDiode> = new Map();
  mmcConverters: Map<string, MmcConverterDEM> = new Map();
  lccBridges: Map<string, LccGraetzBridge> = new Map();
  statcoms: Map<string, Statcom> = new Map();
  svcs: Map<string, StaticVarCompensator> = new Map();

  // Linear solvers & matrices
  luSolver: LUSolver | null = null;
  sparseLUSolver: SparseLUSolver | null = null;
  conductanceMatrix: Matrix | null = null;
  sparseCSR: SparseMatrixCSR | null = null;
  needsRecompilation: boolean = true;

  // State storage
  componentStates: Map<string, any> = new Map();
  lastNodeVoltages: Float64Array | null = null;
  signals: Map<string, number[]> = new Map();
  sampleDecimation: number = 2;

  // Performance telemetry
  lastStepDurationMs: number = 0;
  totalSolveTimeMs: number = 0;

  animFrameId: number | null = null;
  lastRealTimestamp: number | null = null;
  listeners: Map<string, Set<SimEventCallback>> = new Map();

  on(event: string, cb: SimEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: SimEventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(cb);
    }
  }

  emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  setParameters(dt: number, tMax: number, speedMultiplier: number = 1.0): void {
    this.dt = Math.max(1e-6, Math.min(1e-3, dt));
    this.tMax = Math.max(0.01, tMax);
    this.speedMultiplier = speedMultiplier;
    this.needsRecompilation = true;
  }

  setSolverType(type: SolverType): void {
    this.solverType = type;
    this.needsRecompilation = true;
  }

  setCDAEnabled(enabled: boolean): void {
    this.cdaManager.enabled = enabled;
  }

  setInterpolationEnabled(enabled: boolean): void {
    this.interpolator.enabled = enabled;
  }

  initialize(netlist: CircuitNetlist): void {
    this.netlist = netlist;
    this.t = 0.0;
    this.stepCount = 0;
    this.componentStates.clear();
    this.bergeronLines.clear();
    this.polyphaseLines.clear();
    this.fdPhaseLines.clear();
    this.umecTransformers.clear();
    this.syncMachinesDq.clear();
    this.inductionMachines.clear();
    this.dfigMachines.clear();
    this.pmsgMachines.clear();
    this.surgeArresters.clear();
    this.idealSwitches.clear();
    this.diodes.clear();
    this.thyristors.clear();
    this.igbtDiodes.clear();
    this.mmcConverters.clear();
    this.lccBridges.clear();
    this.statcoms.clear();
    this.svcs.clear();
    this.signals.clear();
    this.cdaManager.reset();

    const n = this.netlist.nodeCount;
    if (n === 0) return;

    this.lastNodeVoltages = new Float64Array(n);

    for (const comp of this.netlist.components) {
      this.initComponentState(comp);

      if (comp.type === COMPONENT_TYPES.BERGERON_LINE_1PH) {
        this.bergeronLines.set(comp.id, new BergeronLine1Ph(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.BERGERON_LINE_3PH) {
        this.polyphaseLines.set(comp.id, new PolyphaseBergeronLine(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.FD_PHASE_LINE) {
        this.fdPhaseLines.set(comp.id, new FDPhaseLine(comp.id, comp.params || {}, this.dt));
      } else if (comp.type === COMPONENT_TYPES.UMEC_TRANSFORMER_3PH) {
        this.umecTransformers.set(comp.id, new UmecTransformer(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.SYNC_MACHINE_DQ) {
        this.syncMachinesDq.set(comp.id, new SynchronousMachineDq(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.INDUCTION_MACHINE) {
        this.inductionMachines.set(comp.id, new InductionMachine(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.DFIG_GENERATOR) {
        this.dfigMachines.set(comp.id, new DfigMachine(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.PMSG_GENERATOR) {
        this.pmsgMachines.set(comp.id, new PmsgMachine(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.SURGE_ARRESTER) {
        this.surgeArresters.set(comp.id, new SurgeArrester(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.IDEAL_SWITCH) {
        this.idealSwitches.set(comp.id, new IdealSwitch(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.DIODE) {
        this.diodes.set(comp.id, new PowerDiode(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.THYRISTOR) {
        this.thyristors.set(comp.id, new Thyristor(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.IGBT_DIODE) {
        this.igbtDiodes.set(comp.id, new IgbtDiode(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.MMC_CONVERTER_3PH) {
        this.mmcConverters.set(comp.id, new MmcConverterDEM(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.LCC_BRIDGE_6PULSE) {
        this.lccBridges.set(comp.id, new LccGraetzBridge(comp.id, comp.params || {}, false));
      } else if (comp.type === COMPONENT_TYPES.LCC_BRIDGE_12PULSE) {
        this.lccBridges.set(comp.id, new LccGraetzBridge(comp.id, comp.params || {}, true));
      } else if (comp.type === COMPONENT_TYPES.STATCOM) {
        this.statcoms.set(comp.id, new Statcom(comp.id, comp.params || {}));
      } else if (comp.type === COMPONENT_TYPES.SVC) {
        this.svcs.set(comp.id, new StaticVarCompensator(comp.id, comp.params || {}));
      }
    }

    this.csmfEngine.initialize(this.netlist.components, this.netlist.wires);
    this.initSignalBuffers();
    this.rebuildConductanceMatrix();

    this.emit('compiled', {
      nodeCount: n,
      compCount: this.netlist.components.length,
      dt: this.dt,
      tMax: this.tMax,
      solverType: this.solverType,
      cdaEnabled: this.cdaManager.enabled
    });
  }

  initComponentState(comp: CircuitComponentData): void {
    const params = comp.params || {};
    const state: any = {
      prevV: 0.0,
      prevI: 0.0,
      i_series: 0.0,
      v_L: 0.0,
      v_c1: 0.0,
      v_c2: 0.0,
      i_c1: 0.0,
      i_c2: 0.0,
      flux: 0.0,
      i_m: 0.0,
      i_leak: 0.0,
      v_leak: 0.0,
      v_m: 0.0,
      delta: 0.0,
      omega_pu: 1.0,
      Tm_pu: 1.0,
      Vf: 1.0,
      totalAngle: 0.0,
      isClosed: params.initClosed !== undefined ? params.initClosed : true,
      isFaultActive: false,
      mode: 'OFF',
      q_recovered: 0.0,
      recoveryTime: 0.0,
      isFired: false,
      gateSignal: false,
      integ: 0.0,
      prevErr: 0.0,
      derivFilt: 0.0,
      pllTheta: 0.0,
      pllOmega: 2 * Math.PI * (params.freq || 60)
    };

    if (comp.type === COMPONENT_TYPES.UMEC_TRANSFORMER_3PH) {
      state.flux = [0.0, 0.0, 0.0];
      state.prevBranchV = new Float64Array(6);
      state.prevBranchI = new Float64Array(6);
      state.prevTermV = new Float64Array(8);
      state.prevTermI = new Float64Array(8);
    } else if (comp.type === COMPONENT_TYPES.SYNC_MACHINE_DQ) {
      state.delta = 0.0;
      state.omega_pu = 1.0;
      state.theta_e = 0.0;
      state.Ed_prime = 0.0;
      state.Eq_prime = 1.0;
      state.Ed_pp = 0.0;
      state.Eq_pp = 1.0;
      state.psi_1d = 0.0;
      state.psi_2q = 0.0;
      state.Vf = 1.0;
      state.Tm_pu = 1.0;
      state.Te_pu = 1.0;
      state.prevV_abc = [0.0, 0.0, 0.0];
      state.prevI_abc = [0.0, 0.0, 0.0];
    } else if (comp.type === COMPONENT_TYPES.INDUCTION_MACHINE) {
      state.omega_r_pu = 0.98;
      state.slip = 0.02;
      state.theta_e = 0.0;
      state.psi_ds = 0.0;
      state.psi_qs = 1.0;
      state.psi_dr = 0.0;
      state.psi_qr = 1.0;
      state.Te_pu = 1.0;
      state.Tm_load_pu = 1.0;
      state.prevV_abc = [0.0, 0.0, 0.0];
      state.prevI_abc = [0.0, 0.0, 0.0];
    }

    this.componentStates.set(comp.id, state);
  }

  initSignalBuffers(): void {
    this.signals.clear();
    this.signals.set('Time', []);

    if (!this.netlist) return;
    for (const comp of this.netlist.components) {
      if (
        comp.type === COMPONENT_TYPES.VOLTMETER ||
        comp.type === COMPONENT_TYPES.AMMETER ||
        comp.type === COMPONENT_TYPES.MULTIMETER ||
        comp.type === COMPONENT_TYPES.SIGNAL_PROBE ||
        comp.params?.monitored
      ) {
        const sigName = comp.params?.signalName || comp.name || comp.id;
        this.signals.set(sigName, []);
        if (comp.type === COMPONENT_TYPES.MULTIMETER) {
          this.signals.set(`${sigName}_I`, []);
          this.signals.set(`${sigName}_P`, []);
        }
      }
    }
  }

  rebuildConductanceMatrix(isBE: boolean = false, effectiveDt: number = this.dt): void {
    if (!this.netlist) return;
    const n = this.netlist.nodeCount;
    if (n === 0) return;

    this.conductanceMatrix = Matrix.zeros(n, n);
    const sparseBuilder = new SparseMatrixBuilder(n, n);

    for (let i = 0; i < n; i++) {
      this.conductanceMatrix.add(i, i, 1e-10);
      sparseBuilder.add(i, i, 1e-10);
    }

    for (const comp of this.netlist.components) {
      const pins = getComponentPins(comp);
      const params = comp.params || {};
      const state = this.componentStates.get(comp.id) || {};

      switch (comp.type) {
        case COMPONENT_TYPES.RESISTOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const { G } = CompanionModels.Resistor(params.resistance || 10.0);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.INDUCTOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const L = params.inductance || 0.05;
          const { G } = isBE
            ? CompanionModels.InductorBE(L, effectiveDt)
            : CompanionModels.Inductor(L, effectiveDt);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.CAPACITOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const C = params.capacitance || 100e-6;
          const { G } = isBE
            ? CompanionModels.CapacitorBE(C, effectiveDt)
            : CompanionModels.Capacitor(C, effectiveDt);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.AC_SOURCE_1PH:
        case COMPONENT_TYPES.DC_SOURCE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const safeRs = Math.max(params.internalRs || 0.05, 1e-4);
          const G = 1.0 / safeRs;
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.AC_SOURCE_3PH: {
          const nA = this.netlist.getNode(pins[0].id);
          const nB = this.netlist.getNode(pins[1].id);
          const nC = this.netlist.getNode(pins[2].id);
          const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
          const safeRs = Math.max(params.internalRs || 0.1, 1e-4);
          const G = 1.0 / safeRs;
          this.netlist.stampConductance(this.conductanceMatrix, nA, nN, G);
          this.netlist.stampConductance(this.conductanceMatrix, nB, nN, G);
          this.netlist.stampConductance(this.conductanceMatrix, nC, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nA, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nB, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nC, nN, G);
          break;
        }
        case COMPONENT_TYPES.BREAKER_1PH:
        case COMPONENT_TYPES.TIMED_SWITCH: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const { G } = CompanionModels.Breaker(state.isClosed, params.Ron || 0.0001, params.Roff || 1e7);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.BREAKER_3PH: {
          const nA1 = this.netlist.getNode(pins[0].id);
          const nA2 = this.netlist.getNode(pins[1].id);
          const nB1 = this.netlist.getNode(pins[2].id);
          const nB2 = this.netlist.getNode(pins[3].id);
          const nC1 = this.netlist.getNode(pins[4].id);
          const nC2 = this.netlist.getNode(pins[5].id);
          const { G } = CompanionModels.Breaker(state.isClosed, params.Ron || 0.0001, params.Roff || 1e7);
          this.netlist.stampConductance(this.conductanceMatrix, nA1, nA2, G);
          this.netlist.stampConductance(this.conductanceMatrix, nB1, nB2, G);
          this.netlist.stampConductance(this.conductanceMatrix, nC1, nC2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nA1, nA2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nB1, nB2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nC1, nC2, G);
          break;
        }
        case COMPONENT_TYPES.FAULT_BLOCK: {
          const nA = this.netlist.getNode(pins[0].id);
          const nB = this.netlist.getNode(pins[1].id);
          const nC = this.netlist.getNode(pins[2].id);
          const nG = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
          const isFault = state.isFaultActive || false;
          const Rf = Math.max(params.faultResistance || 0.01, 1e-4);
          const G_fault = isFault ? 1.0 / Rf : 1e-8;

          if (params.faultType === '3LG' || params.faultType === 'SLG_A') {
            this.netlist.stampConductance(this.conductanceMatrix, nA, nG, G_fault);
            this.netlist.stampConductanceSparse(sparseBuilder, nA, nG, G_fault);
          }
          if (params.faultType === '3LG' || params.faultType === 'LL_AB') {
            this.netlist.stampConductance(this.conductanceMatrix, nB, nG, G_fault);
            this.netlist.stampConductanceSparse(sparseBuilder, nB, nG, G_fault);
          }
          if (params.faultType === '3LG') {
            this.netlist.stampConductance(this.conductanceMatrix, nC, nG, G_fault);
            this.netlist.stampConductanceSparse(sparseBuilder, nC, nG, G_fault);
          }
          break;
        }
        case COMPONENT_TYPES.PI_LINE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const pi = CompanionModels.PiLineSection(params, effectiveDt, state, isBE);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, pi.G_series);
          this.netlist.stampConductance(this.conductanceMatrix, n1, 0, pi.G_shunt);
          this.netlist.stampConductance(this.conductanceMatrix, n2, 0, pi.G_shunt);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, pi.G_series);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, 0, pi.G_shunt);
          this.netlist.stampConductanceSparse(sparseBuilder, n2, 0, pi.G_shunt);
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_1PH: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let line = this.bergeronLines.get(comp.id);
          if (!line) {
            line = new BergeronLine1Ph(comp.id, params);
            this.bergeronLines.set(comp.id, line);
          }
          line.updateParams(params);
          this.netlist.stampConductance(this.conductanceMatrix, n1, 0, line.G_equiv);
          this.netlist.stampConductance(this.conductanceMatrix, n2, 0, line.G_equiv);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, 0, line.G_equiv);
          this.netlist.stampConductanceSparse(sparseBuilder, n2, 0, line.G_equiv);
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_3PH: {
          let polyLine = this.polyphaseLines.get(comp.id);
          if (!polyLine) {
            polyLine = new PolyphaseBergeronLine(comp.id, params);
            this.polyphaseLines.set(comp.id, polyLine);
          }
          const nSend = [
            this.netlist.getNode(pins[0]?.id || ''),
            this.netlist.getNode(pins[1]?.id || ''),
            this.netlist.getNode(pins[2]?.id || '')
          ];
          const nRecv = [
            this.netlist.getNode(pins[3]?.id || ''),
            this.netlist.getNode(pins[4]?.id || ''),
            this.netlist.getNode(pins[5]?.id || '')
          ];

          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const val = polyLine.G_phase[r][c];
              if (Math.abs(val) > 1e-15) {
                if (nSend[r] > 0 && nSend[c] > 0) {
                  this.conductanceMatrix.add(nSend[r] - 1, nSend[c] - 1, val);
                  sparseBuilder.add(nSend[r] - 1, nSend[c] - 1, val);
                }
                if (nRecv[r] > 0 && nRecv[c] > 0) {
                  this.conductanceMatrix.add(nRecv[r] - 1, nRecv[c] - 1, val);
                  sparseBuilder.add(nRecv[r] - 1, nRecv[c] - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.FD_PHASE_LINE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let fdLine = this.fdPhaseLines.get(comp.id);
          if (!fdLine) {
            fdLine = new FDPhaseLine(comp.id, params, effectiveDt);
            this.fdPhaseLines.set(comp.id, fdLine);
          }
          fdLine.dt = effectiveDt;
          fdLine.rebuildConductance();
          this.netlist.stampConductance(this.conductanceMatrix, n1, 0, fdLine.G_equiv);
          this.netlist.stampConductance(this.conductanceMatrix, n2, 0, fdLine.G_equiv);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, 0, fdLine.G_equiv);
          this.netlist.stampConductanceSparse(sparseBuilder, n2, 0, fdLine.G_equiv);
          break;
        }
        case COMPONENT_TYPES.TRANSFORMER_1PH: {
          const nP1 = this.netlist.getNode(pins[0].id);
          const nP2 = this.netlist.getNode(pins[1].id);
          const nS1 = this.netlist.getNode(pins[2].id);
          const nS2 = this.netlist.getNode(pins[3].id);
          const xfmr = CompanionModels.Transformer1Ph(params, effectiveDt, state, isBE);
          this.netlist.stampConductance(this.conductanceMatrix, nP1, nP2, xfmr.G_leak + xfmr.G_m);
          this.netlist.stampConductanceSparse(sparseBuilder, nP1, nP2, xfmr.G_leak + xfmr.G_m);
          const a = xfmr.turnsRatio;
          this.netlist.stampConductance(this.conductanceMatrix, nS1, nS2, xfmr.G_leak / (a * a));
          this.netlist.stampConductanceSparse(sparseBuilder, nS1, nS2, xfmr.G_leak / (a * a));
          break;
        }
        case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH: {
          let umec = this.umecTransformers.get(comp.id);
          if (!umec) {
            umec = new UmecTransformer(comp.id, params);
            this.umecTransformers.set(comp.id, umec);
          }
          const termNodes = pins.map(p => this.netlist!.getNode(p.id));
          umec.rebuildTerminalConductance(effectiveDt, state, isBE);

          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const val = umec.G_term[r][c];
              if (Math.abs(val) > 1e-15) {
                const nr = termNodes[r] || 0;
                const nc = termNodes[c] || 0;
                if (nr > 0 && nc > 0) {
                  this.conductanceMatrix.add(nr - 1, nc - 1, val);
                  sparseBuilder.add(nr - 1, nc - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.SYNC_MACHINE_DQ: {
          let sm = this.syncMachinesDq.get(comp.id);
          if (!sm) {
            sm = new SynchronousMachineDq(comp.id, params);
            this.syncMachinesDq.set(comp.id, sm);
          }
          sm.rebuildConductanceMatrix(effectiveDt, state);
          const nPhases = [
            this.netlist.getNode(pins[0]?.id || ''),
            this.netlist.getNode(pins[1]?.id || ''),
            this.netlist.getNode(pins[2]?.id || '')
          ];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const val = sm.G_abc[r][c];
              if (Math.abs(val) > 1e-15) {
                if (nPhases[r] > 0 && nPhases[c] > 0) {
                  this.conductanceMatrix.add(nPhases[r] - 1, nPhases[c] - 1, val);
                  sparseBuilder.add(nPhases[r] - 1, nPhases[c] - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.INDUCTION_MACHINE: {
          let im = this.inductionMachines.get(comp.id);
          if (!im) {
            im = new InductionMachine(comp.id, params);
            this.inductionMachines.set(comp.id, im);
          }
          im.rebuildConductanceMatrix(effectiveDt);
          const nPhases = [
            this.netlist.getNode(pins[0]?.id || ''),
            this.netlist.getNode(pins[1]?.id || ''),
            this.netlist.getNode(pins[2]?.id || '')
          ];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const val = im.G_abc[r][c];
              if (Math.abs(val) > 1e-15) {
                if (nPhases[r] > 0 && nPhases[c] > 0) {
                  this.conductanceMatrix.add(nPhases[r] - 1, nPhases[c] - 1, val);
                  sparseBuilder.add(nPhases[r] - 1, nPhases[c] - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.DFIG_GENERATOR: {
          let dfig = this.dfigMachines.get(comp.id);
          if (!dfig) {
            dfig = new DfigMachine(comp.id, params);
            this.dfigMachines.set(comp.id, dfig);
          }
          dfig.rebuildConductanceMatrix(effectiveDt, state);
          const nPhases = [
            this.netlist.getNode(pins[0]?.id || ''),
            this.netlist.getNode(pins[1]?.id || ''),
            this.netlist.getNode(pins[2]?.id || '')
          ];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const val = dfig.G_abc[r][c];
              if (Math.abs(val) > 1e-15) {
                if (nPhases[r] > 0 && nPhases[c] > 0) {
                  this.conductanceMatrix.add(nPhases[r] - 1, nPhases[c] - 1, val);
                  sparseBuilder.add(nPhases[r] - 1, nPhases[c] - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.PMSG_GENERATOR: {
          let pmsg = this.pmsgMachines.get(comp.id);
          if (!pmsg) {
            pmsg = new PmsgMachine(comp.id, params);
            this.pmsgMachines.set(comp.id, pmsg);
          }
          pmsg.rebuildConductanceMatrix(effectiveDt);
          const nPhases = [
            this.netlist.getNode(pins[0]?.id || ''),
            this.netlist.getNode(pins[1]?.id || ''),
            this.netlist.getNode(pins[2]?.id || '')
          ];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const val = pmsg.G_abc[r][c];
              if (Math.abs(val) > 1e-15) {
                if (nPhases[r] > 0 && nPhases[c] > 0) {
                  this.conductanceMatrix.add(nPhases[r] - 1, nPhases[c] - 1, val);
                  sparseBuilder.add(nPhases[r] - 1, nPhases[c] - 1, val);
                }
              }
            }
          }
          break;
        }
        case COMPONENT_TYPES.SURGE_ARRESTER: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let sa = this.surgeArresters.get(comp.id);
          if (!sa) {
            sa = new SurgeArrester(comp.id, params);
            this.surgeArresters.set(comp.id, sa);
          }
          const { G } = sa.computeCompanionStamp(state);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.IDEAL_SWITCH: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let sw = this.idealSwitches.get(comp.id);
          if (!sw) {
            sw = new IdealSwitch(comp.id, params);
            this.idealSwitches.set(comp.id, sw);
          }
          const { G } = sw.computeCompanionStamp(state.isClosed !== undefined ? state.isClosed : sw.initClosed);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.DIODE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let diode = this.diodes.get(comp.id);
          if (!diode) {
            diode = new PowerDiode(comp.id, params);
            this.diodes.set(comp.id, diode);
          }
          const { G } = diode.computeCompanionStamp(state.mode || 'OFF');
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.THYRISTOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let thy = this.thyristors.get(comp.id);
          if (!thy) {
            thy = new Thyristor(comp.id, params);
            this.thyristors.set(comp.id, thy);
          }
          const { G } = thy.computeCompanionStamp(state.mode || 'BLOCKING');
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.IGBT_DIODE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          let igbt = this.igbtDiodes.get(comp.id);
          if (!igbt) {
            igbt = new IgbtDiode(comp.id, params);
            this.igbtDiodes.set(comp.id, igbt);
          }
          const { G } = igbt.computeCompanionStamp(state.mode || 'OFF');
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, G);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, G);
          break;
        }
        case COMPONENT_TYPES.MMC_CONVERTER_3PH: {
          let mmc = this.mmcConverters.get(comp.id);
          if (!mmc) {
            mmc = new MmcConverterDEM(comp.id, params);
            this.mmcConverters.set(comp.id, mmc);
          }
          if (!state.armStates) {
            Object.assign(state, mmc.initState());
          }
          mmc.executeControlAndBalancing(this.t, state);
          const stamps = mmc.computeArmStamps(effectiveDt, state, isBE);
          const nDcp = this.netlist.getNode(pins[0]?.id || '');
          const nDcn = this.netlist.getNode(pins[1]?.id || '');
          const nA = this.netlist.getNode(pins[2]?.id || '');
          const nB = this.netlist.getNode(pins[3]?.id || '');
          const nC = this.netlist.getNode(pins[4]?.id || '');

          // Upper arms: DC+ to AC (A, B, C)
          this.netlist.stampConductance(this.conductanceMatrix, nDcp, nA, stamps.a_u.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nDcp, nA, stamps.a_u.G);
          this.netlist.stampConductance(this.conductanceMatrix, nDcp, nB, stamps.b_u.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nDcp, nB, stamps.b_u.G);
          this.netlist.stampConductance(this.conductanceMatrix, nDcp, nC, stamps.c_u.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nDcp, nC, stamps.c_u.G);

          // Lower arms: AC (A, B, C) to DC-
          this.netlist.stampConductance(this.conductanceMatrix, nA, nDcn, stamps.a_l.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nA, nDcn, stamps.a_l.G);
          this.netlist.stampConductance(this.conductanceMatrix, nB, nDcn, stamps.b_l.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nB, nDcn, stamps.b_l.G);
          this.netlist.stampConductance(this.conductanceMatrix, nC, nDcn, stamps.c_l.G);
          this.netlist.stampConductanceSparse(sparseBuilder, nC, nDcn, stamps.c_l.G);
          break;
        }
        case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
        case COMPONENT_TYPES.LCC_BRIDGE_12PULSE: {
          const is12 = comp.type === COMPONENT_TYPES.LCC_BRIDGE_12PULSE;
          let lcc = this.lccBridges.get(comp.id);
          if (!lcc) {
            lcc = new LccGraetzBridge(comp.id, params, is12);
            this.lccBridges.set(comp.id, lcc);
          }
          if (!state.thyristors) {
            Object.assign(state, lcc.initState());
          }
          const { G_dc, G_ac } = lcc.computeCompanionStamp(effectiveDt, state, isBE);
          const nA = this.netlist.getNode(pins[0]?.id || '');
          const nB = this.netlist.getNode(pins[1]?.id || '');
          const nC = this.netlist.getNode(pins[2]?.id || '');
          const nDcp = this.netlist.getNode(pins[3]?.id || '');
          const nDcn = this.netlist.getNode(pins[4]?.id || '');

          // Stamp DC circuit
          this.netlist.stampConductance(this.conductanceMatrix, nDcp, nDcn, G_dc);
          this.netlist.stampConductanceSparse(sparseBuilder, nDcp, nDcn, G_dc);

          // Stamp AC commutation admittance
          this.netlist.stampConductance(this.conductanceMatrix, nA, nB, G_ac * 0.5);
          this.netlist.stampConductanceSparse(sparseBuilder, nA, nB, G_ac * 0.5);
          this.netlist.stampConductance(this.conductanceMatrix, nB, nC, G_ac * 0.5);
          this.netlist.stampConductanceSparse(sparseBuilder, nB, nC, G_ac * 0.5);
          this.netlist.stampConductance(this.conductanceMatrix, nC, nA, G_ac * 0.5);
          this.netlist.stampConductanceSparse(sparseBuilder, nC, nA, G_ac * 0.5);
          break;
        }
        case COMPONENT_TYPES.STATCOM: {
          let stat = this.statcoms.get(comp.id);
          if (!stat) {
            stat = new Statcom(comp.id, params);
            this.statcoms.set(comp.id, stat);
          }
          if (!state.theta_pll) {
            Object.assign(state, stat.initState());
          }
          const { G } = stat.computeCompanionStamp(effectiveDt, isBE);
          const nA = this.netlist.getNode(pins[0]?.id || '');
          const nB = this.netlist.getNode(pins[1]?.id || '');
          const nC = this.netlist.getNode(pins[2]?.id || '');
          const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;

          this.netlist.stampConductance(this.conductanceMatrix, nA, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nA, nN, G);
          this.netlist.stampConductance(this.conductanceMatrix, nB, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nB, nN, G);
          this.netlist.stampConductance(this.conductanceMatrix, nC, nN, G);
          this.netlist.stampConductanceSparse(sparseBuilder, nC, nN, G);
          break;
        }
        case COMPONENT_TYPES.SVC: {
          let svc = this.svcs.get(comp.id);
          if (!svc) {
            svc = new StaticVarCompensator(comp.id, params);
            this.svcs.set(comp.id, svc);
          }
          if (!state.sigmaDeg) {
            Object.assign(state, svc.initState());
          }
          const nA = this.netlist.getNode(pins[0]?.id || '');
          const nB = this.netlist.getNode(pins[1]?.id || '');
          const nC = this.netlist.getNode(pins[2]?.id || '');
          const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
          const G_total = Math.max(1e-4, Math.abs(state.B_svc_total || 0.01));

          this.netlist.stampConductance(this.conductanceMatrix, nA, nN, G_total);
          this.netlist.stampConductanceSparse(sparseBuilder, nA, nN, G_total);
          this.netlist.stampConductance(this.conductanceMatrix, nB, nN, G_total);
          this.netlist.stampConductanceSparse(sparseBuilder, nB, nN, G_total);
          this.netlist.stampConductance(this.conductanceMatrix, nC, nN, G_total);
          this.netlist.stampConductanceSparse(sparseBuilder, nC, nN, G_total);
          break;
        }
        case COMPONENT_TYPES.VOLTMETER:
        case COMPONENT_TYPES.SIGNAL_PROBE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = pins.length > 1 ? this.netlist.getNode(pins[1].id) : 0;
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, 1e-9);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, 1e-9);
          break;
        }
        case COMPONENT_TYPES.AMMETER: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          this.netlist.stampConductance(this.conductanceMatrix, n1, n2, 1e5);
          this.netlist.stampConductanceSparse(sparseBuilder, n1, n2, 1e5);
          break;
        }
      }
    }

    // Build Dense LU Solver
    this.luSolver = new LUSolver(this.conductanceMatrix);

    // Build Sparse CSR & Sparse LU Solver
    this.sparseCSR = sparseBuilder.buildCSR();
    this.sparseLUSolver = new SparseLUSolver(this.sparseCSR);

    runtimeMutator.clearBranchUpdates();
    this.needsRecompilation = false;
  }

  step(): void {
    if (!this.netlist) return;

    const tStart = performance.now();

    // Check if CDA is active
    const isCDAActive = this.cdaManager.isActive;
    const effectiveDt = this.cdaManager.getEffectiveDt(this.dt);
    const isBE = isCDAActive;

    if (this.needsRecompilation || isCDAActive) {
      this.rebuildConductanceMatrix(isBE, effectiveDt);
    }

    const n = this.netlist.nodeCount;
    if (n === 0 || !this.luSolver) return;

    const rhs = new Float64Array(n);
    const t = this.t;

    // 1. Process Timed Events (Breakers, Faults) with CDA Triggering
    for (const comp of this.netlist.components) {
      const params = comp.params || {};
      const state = this.componentStates.get(comp.id);
      if (!state) continue;

      if (comp.type === COMPONENT_TYPES.BREAKER_1PH || comp.type === COMPONENT_TYPES.BREAKER_3PH || comp.type === COMPONENT_TYPES.TIMED_SWITCH) {
        if (params.openTime !== undefined && Math.abs(t - params.openTime) < this.dt / 2.0 && state.isClosed) {
          state.isClosed = false;
          this.needsRecompilation = true;
          this.cdaManager.trigger({
            componentId: comp.id,
            type: 'BREAKER_OPEN',
            timestamp: t,
            description: `Breaker '${comp.name || comp.id}' OPENED.`
          });
          this.emit('log', { type: 'info', text: `[t=${t.toFixed(4)}s] Breaker '${comp.name || comp.id}' OPENED (CDA triggered).` });
        }
        if (params.closeTime !== undefined && Math.abs(t - params.closeTime) < this.dt / 2.0 && !state.isClosed) {
          state.isClosed = true;
          this.needsRecompilation = true;
          this.cdaManager.trigger({
            componentId: comp.id,
            type: 'BREAKER_CLOSE',
            timestamp: t,
            description: `Breaker '${comp.name || comp.id}' CLOSED.`
          });
          this.emit('log', { type: 'info', text: `[t=${t.toFixed(4)}s] Breaker '${comp.name || comp.id}' CLOSED (CDA triggered).` });
        }
      }

      if (comp.type === COMPONENT_TYPES.FAULT_BLOCK) {
        const faultStart = params.startTime || 0.1;
        const faultDuration = params.duration || 0.08;
        const shouldBeActive = t >= faultStart && t <= faultStart + faultDuration;
        if (state.isFaultActive !== shouldBeActive) {
          state.isFaultActive = shouldBeActive;
          this.needsRecompilation = true;
          this.cdaManager.trigger({
            componentId: comp.id,
            type: shouldBeActive ? 'FAULT_INCEPTION' : 'FAULT_CLEARED',
            timestamp: t,
            description: `Fault '${comp.name || comp.id}' ${shouldBeActive ? 'ACTIVATED' : 'CLEARED'}.`
          });
          this.emit('log', {
            type: 'warning',
            text: `[t=${t.toFixed(4)}s] Fault '${comp.name || comp.id}' ${shouldBeActive ? 'ACTIVATED' : 'CLEARED'} (CDA triggered).`
          });
        }
      }
    }

    if (this.needsRecompilation) {
      this.rebuildConductanceMatrix(isBE, effectiveDt);
    }

    // Step CSMF Control Engine
    for (const comp of this.netlist.components) {
      if (comp.type === COMPONENT_TYPES.VOLTMETER || comp.type === COMPONENT_TYPES.SIGNAL_PROBE) {
        const state = this.componentStates.get(comp.id);
        if (state && state.prevV !== undefined) {
          this.csmfEngine.setPinValue(`${comp.id}_p1`, state.prevV);
          this.csmfEngine.setPinValue(`${comp.id}_out`, state.prevV);
        }
      }
    }
    this.csmfEngine.step(t, effectiveDt);

    // Update controllable switch gate signals from CSMF control pins
    for (const comp of this.netlist.components) {
      const state = this.componentStates.get(comp.id);
      if (!state) continue;

      if (comp.type === COMPONENT_TYPES.IDEAL_SWITCH) {
        const gatePin = `${comp.id}_pg`;
        if (this.csmfEngine.pinConnections.has(gatePin)) {
          const isClosed = this.csmfEngine.readPinValue(gatePin) >= 0.5;
          if (state.isClosed !== isClosed) {
            state.isClosed = isClosed;
            this.needsRecompilation = true;
          }
        }
      } else if (comp.type === COMPONENT_TYPES.THYRISTOR) {
        const gatePin = `${comp.id}_pg`;
        if (this.csmfEngine.pinConnections.has(gatePin)) {
          state.isFired = this.csmfEngine.readPinValue(gatePin) >= 0.5;
        }
      } else if (comp.type === COMPONENT_TYPES.IGBT_DIODE) {
        const gatePin = `${comp.id}_pg`;
        if (this.csmfEngine.pinConnections.has(gatePin)) {
          state.gateSignal = this.csmfEngine.readPinValue(gatePin) >= 0.5;
        }
      }
    }

    if (this.needsRecompilation) {
      this.rebuildConductanceMatrix(isBE, effectiveDt);
    }

    // 2. Injections into RHS
    for (const comp of this.netlist.components) {
      const pins = getComponentPins(comp);
      const params = comp.params || {};
      const state = this.componentStates.get(comp.id);

      switch (comp.type) {
        case COMPONENT_TYPES.AC_SOURCE_1PH: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const freq = params.freq !== undefined ? Number(params.freq) : 60.0;
          const currentPhase = runtimeMutator.advanceSourcePhase(comp.id, freq, effectiveDt);
          const { Inorton, Vinstant } = CompanionModels.ACSource(params, t, currentPhase);
          state.prevV = Vinstant;
          this.netlist.stampCurrent(rhs, n1, Inorton);
          this.netlist.stampCurrent(rhs, n2, -Inorton);
          break;
        }
        case COMPONENT_TYPES.AC_SOURCE_3PH: {
          const nA = this.netlist.getNode(pins[0].id);
          const nB = this.netlist.getNode(pins[1].id);
          const nC = this.netlist.getNode(pins[2].id);
          const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
          const freq = params.freq !== undefined ? Number(params.freq) : 60.0;
          const currentPhase = runtimeMutator.advanceSourcePhase(comp.id, freq, effectiveDt);

          const baseParams = { ...params };
          const srcA = CompanionModels.ACSource({ ...baseParams, phaseDeg: params.phaseDeg || 0 }, t, currentPhase);
          const srcB = CompanionModels.ACSource({ ...baseParams, phaseDeg: (params.phaseDeg || 0) - 120 }, t, currentPhase);
          const srcC = CompanionModels.ACSource({ ...baseParams, phaseDeg: (params.phaseDeg || 0) + 120 }, t, currentPhase);

          state.prevV = srcA.Vinstant;
          this.netlist.stampCurrent(rhs, nA, srcA.Inorton);
          this.netlist.stampCurrent(rhs, nN, -srcA.Inorton);
          this.netlist.stampCurrent(rhs, nB, srcB.Inorton);
          this.netlist.stampCurrent(rhs, nN, -srcB.Inorton);
          this.netlist.stampCurrent(rhs, nC, srcC.Inorton);
          this.netlist.stampCurrent(rhs, nN, -srcC.Inorton);
          break;
        }
        case COMPONENT_TYPES.DC_SOURCE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const { Inorton } = CompanionModels.DCSource(params, t);
          this.netlist.stampCurrent(rhs, n1, Inorton);
          this.netlist.stampCurrent(rhs, n2, -Inorton);
          break;
        }
        case COMPONENT_TYPES.INDUCTOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const L = params.inductance || 0.05;
          const { Ihist } = isBE
            ? CompanionModels.InductorBE(L, effectiveDt, state.prevI)
            : CompanionModels.Inductor(L, effectiveDt, state.prevI, state.prevV);
          this.netlist.stampCurrent(rhs, n1, -Ihist);
          this.netlist.stampCurrent(rhs, n2, Ihist);
          break;
        }
        case COMPONENT_TYPES.CAPACITOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const C = params.capacitance || 100e-6;
          const { Ihist } = isBE
            ? CompanionModels.CapacitorBE(C, effectiveDt, state.prevV)
            : CompanionModels.Capacitor(C, effectiveDt, state.prevI, state.prevV);
          this.netlist.stampCurrent(rhs, n1, -Ihist);
          this.netlist.stampCurrent(rhs, n2, Ihist);
          break;
        }
        case COMPONENT_TYPES.PI_LINE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const pi = CompanionModels.PiLineSection(params, effectiveDt, state, isBE);
          this.netlist.stampCurrent(rhs, n1, -pi.I_hist_series - pi.I_hist_C1);
          this.netlist.stampCurrent(rhs, n2, pi.I_hist_series - pi.I_hist_C2);
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_1PH: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const line = this.bergeronLines.get(comp.id);
          if (line) {
            const { I_hist_send, I_hist_recv } = line.computeHistoryInjections(t);
            this.netlist.stampCurrent(rhs, n1, I_hist_send);
            this.netlist.stampCurrent(rhs, n2, I_hist_recv);
          }
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_3PH: {
          const polyLine = this.polyphaseLines.get(comp.id);
          if (polyLine) {
            const { I_hist_send, I_hist_recv } = polyLine.computeHistoryInjections(t);
            const nSend = [
              this.netlist.getNode(pins[0]?.id || ''),
              this.netlist.getNode(pins[1]?.id || ''),
              this.netlist.getNode(pins[2]?.id || '')
            ];
            const nRecv = [
              this.netlist.getNode(pins[3]?.id || ''),
              this.netlist.getNode(pins[4]?.id || ''),
              this.netlist.getNode(pins[5]?.id || '')
            ];
            for (let ph = 0; ph < 3; ph++) {
              this.netlist.stampCurrent(rhs, nSend[ph], I_hist_send[ph]);
              this.netlist.stampCurrent(rhs, nRecv[ph], I_hist_recv[ph]);
            }
          }
          break;
        }
        case COMPONENT_TYPES.FD_PHASE_LINE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const fdLine = this.fdPhaseLines.get(comp.id);
          if (fdLine) {
            const { I_hist_send, I_hist_recv } = fdLine.computeHistoryInjections(t);
            this.netlist.stampCurrent(rhs, n1, I_hist_send);
            this.netlist.stampCurrent(rhs, n2, I_hist_recv);
          }
          break;
        }
        case COMPONENT_TYPES.TRANSFORMER_1PH: {
          const nP1 = this.netlist.getNode(pins[0].id);
          const nP2 = this.netlist.getNode(pins[1].id);
          const nS1 = this.netlist.getNode(pins[2].id);
          const nS2 = this.netlist.getNode(pins[3].id);
          const xfmr = CompanionModels.Transformer1Ph(params, effectiveDt, state, isBE);
          this.netlist.stampCurrent(rhs, nP1, -xfmr.I_hist_leak - xfmr.I_hist_m);
          this.netlist.stampCurrent(rhs, nP2, xfmr.I_hist_leak + xfmr.I_hist_m);
          const a = xfmr.turnsRatio;
          this.netlist.stampCurrent(rhs, nS1, xfmr.I_hist_leak / a);
          this.netlist.stampCurrent(rhs, nS2, -xfmr.I_hist_leak / a);
          break;
        }
        case COMPONENT_TYPES.SYNC_GENERATOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const nN = pins.length > 1 ? this.netlist.getNode(pins[1].id) : 0;
          const mach = CompanionModels.SynchronousMachine(params, effectiveDt, state, state.prevV, state.prevI);
          this.netlist.stampCurrent(rhs, n1, mach.Inorton);
          this.netlist.stampCurrent(rhs, nN, -mach.Inorton);
          Object.assign(state, mach.nextState);
          break;
        }
        case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH: {
          const umec = this.umecTransformers.get(comp.id);
          if (umec) {
            const termNodes = pins.map(p => this.netlist!.getNode(p.id));
            const I_hist_term = umec.computeHistoryInjections(effectiveDt, state, isBE);
            for (let i = 0; i < 8; i++) {
              this.netlist.stampCurrent(rhs, termNodes[i], I_hist_term[i]);
            }
          }
          break;
        }
        case COMPONENT_TYPES.SYNC_MACHINE_DQ: {
          const sm = this.syncMachinesDq.get(comp.id);
          if (sm) {
            const I_hist = sm.computeHistoryInjections(effectiveDt, state);
            const nPhases = [
              this.netlist.getNode(pins[0]?.id || ''),
              this.netlist.getNode(pins[1]?.id || ''),
              this.netlist.getNode(pins[2]?.id || '')
            ];
            const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
            this.netlist.stampCurrent(rhs, nPhases[0], I_hist[0]);
            this.netlist.stampCurrent(rhs, nPhases[1], I_hist[1]);
            this.netlist.stampCurrent(rhs, nPhases[2], I_hist[2]);
            this.netlist.stampCurrent(rhs, nN, -(I_hist[0] + I_hist[1] + I_hist[2]));
          }
          break;
        }
        case COMPONENT_TYPES.INDUCTION_MACHINE: {
          const im = this.inductionMachines.get(comp.id);
          if (im) {
            const I_hist = im.computeHistoryInjections(effectiveDt, state);
            const nPhases = [
              this.netlist.getNode(pins[0]?.id || ''),
              this.netlist.getNode(pins[1]?.id || ''),
              this.netlist.getNode(pins[2]?.id || '')
            ];
            const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
            this.netlist.stampCurrent(rhs, nPhases[0], I_hist[0]);
            this.netlist.stampCurrent(rhs, nPhases[1], I_hist[1]);
            this.netlist.stampCurrent(rhs, nPhases[2], I_hist[2]);
            this.netlist.stampCurrent(rhs, nN, -(I_hist[0] + I_hist[1] + I_hist[2]));
          }
          break;
        }
        case COMPONENT_TYPES.DFIG_GENERATOR: {
          const dfig = this.dfigMachines.get(comp.id);
          if (dfig) {
            const I_hist = dfig.computeHistoryInjections(effectiveDt, state);
            const nPhases = [
              this.netlist.getNode(pins[0]?.id || ''),
              this.netlist.getNode(pins[1]?.id || ''),
              this.netlist.getNode(pins[2]?.id || '')
            ];
            const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
            this.netlist.stampCurrent(rhs, nPhases[0], I_hist[0]);
            this.netlist.stampCurrent(rhs, nPhases[1], I_hist[1]);
            this.netlist.stampCurrent(rhs, nPhases[2], I_hist[2]);
            this.netlist.stampCurrent(rhs, nN, -(I_hist[0] + I_hist[1] + I_hist[2]));
          }
          break;
        }
        case COMPONENT_TYPES.PMSG_GENERATOR: {
          const pmsg = this.pmsgMachines.get(comp.id);
          if (pmsg) {
            const I_hist = pmsg.computeHistoryInjections(effectiveDt, state);
            const nPhases = [
              this.netlist.getNode(pins[0]?.id || ''),
              this.netlist.getNode(pins[1]?.id || ''),
              this.netlist.getNode(pins[2]?.id || '')
            ];
            const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
            this.netlist.stampCurrent(rhs, nPhases[0], I_hist[0]);
            this.netlist.stampCurrent(rhs, nPhases[1], I_hist[1]);
            this.netlist.stampCurrent(rhs, nPhases[2], I_hist[2]);
            this.netlist.stampCurrent(rhs, nN, -(I_hist[0] + I_hist[1] + I_hist[2]));
          }
          break;
        }
        case COMPONENT_TYPES.SURGE_ARRESTER: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const sa = this.surgeArresters.get(comp.id);
          if (sa) {
            const { Ihist } = sa.computeCompanionStamp(state);
            this.netlist.stampCurrent(rhs, n1, -Ihist);
            this.netlist.stampCurrent(rhs, n2, Ihist);
          }
          break;
        }
        case COMPONENT_TYPES.DIODE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const diode = this.diodes.get(comp.id);
          if (diode) {
            const { Ihist } = diode.computeCompanionStamp(state.mode || 'OFF');
            this.netlist.stampCurrent(rhs, n1, -Ihist);
            this.netlist.stampCurrent(rhs, n2, Ihist);
          }
          break;
        }
        case COMPONENT_TYPES.THYRISTOR: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const thy = this.thyristors.get(comp.id);
          if (thy) {
            const { Ihist } = thy.computeCompanionStamp(state.mode || 'BLOCKING');
            this.netlist.stampCurrent(rhs, n1, -Ihist);
            this.netlist.stampCurrent(rhs, n2, Ihist);
          }
          break;
        }
        case COMPONENT_TYPES.IGBT_DIODE: {
          const n1 = this.netlist.getNode(pins[0].id);
          const n2 = this.netlist.getNode(pins[1].id);
          const igbt = this.igbtDiodes.get(comp.id);
          if (igbt) {
            const { Ihist } = igbt.computeCompanionStamp(state.mode || 'OFF');
            this.netlist.stampCurrent(rhs, n1, -Ihist);
            this.netlist.stampCurrent(rhs, n2, Ihist);
          }
          break;
        }
        case COMPONENT_TYPES.MMC_CONVERTER_3PH: {
          const mmc = this.mmcConverters.get(comp.id);
          if (mmc && state.armStates) {
            const stamps = mmc.computeArmStamps(effectiveDt, state, isBE);
            const nDcp = this.netlist.getNode(pins[0]?.id || '');
            const nDcn = this.netlist.getNode(pins[1]?.id || '');
            const nA = this.netlist.getNode(pins[2]?.id || '');
            const nB = this.netlist.getNode(pins[3]?.id || '');
            const nC = this.netlist.getNode(pins[4]?.id || '');

            this.netlist.stampCurrent(rhs, nDcp, -stamps.a_u.Ihist - stamps.b_u.Ihist - stamps.c_u.Ihist);
            this.netlist.stampCurrent(rhs, nDcn, stamps.a_l.Ihist + stamps.b_l.Ihist + stamps.c_l.Ihist);
            this.netlist.stampCurrent(rhs, nA, stamps.a_u.Ihist - stamps.a_l.Ihist);
            this.netlist.stampCurrent(rhs, nB, stamps.b_u.Ihist - stamps.b_l.Ihist);
            this.netlist.stampCurrent(rhs, nC, stamps.c_u.Ihist - stamps.c_l.Ihist);
          }
          break;
        }
        case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
        case COMPONENT_TYPES.LCC_BRIDGE_12PULSE: {
          const lcc = this.lccBridges.get(comp.id);
          if (lcc && state.thyristors) {
            const { Ihist_dc } = lcc.computeCompanionStamp(effectiveDt, state, isBE);
            const nDcp = this.netlist.getNode(pins[3]?.id || '');
            const nDcn = this.netlist.getNode(pins[4]?.id || '');
            this.netlist.stampCurrent(rhs, nDcp, Ihist_dc);
            this.netlist.stampCurrent(rhs, nDcn, -Ihist_dc);
          }
          break;
        }
        case COMPONENT_TYPES.STATCOM: {
          const stat = this.statcoms.get(comp.id);
          if (stat) {
            const nA = this.netlist.getNode(pins[0]?.id || '');
            const nB = this.netlist.getNode(pins[1]?.id || '');
            const nC = this.netlist.getNode(pins[2]?.id || '');
            const nN = pins.length > 3 ? this.netlist.getNode(pins[3].id) : 0;
            const getLastV = (idx: number) => (idx > 0 && this.lastNodeVoltages ? this.lastNodeVoltages[idx - 1] || 0.0 : 0.0);
            const vA = getLastV(nA);
            const vB = getLastV(nB);
            const vC = getLastV(nC);
            const ctrl = stat.executeControl(vA, vB, vC, state.i_d || 0, 0, 0, t, effectiveDt, state);
            const { G } = stat.computeCompanionStamp(effectiveDt, isBE);

            this.netlist.stampCurrent(rhs, nA, ctrl.v_conv_a * G);
            this.netlist.stampCurrent(rhs, nB, ctrl.v_conv_b * G);
            this.netlist.stampCurrent(rhs, nC, ctrl.v_conv_c * G);
            this.netlist.stampCurrent(rhs, nN, -(ctrl.v_conv_a + ctrl.v_conv_b + ctrl.v_conv_c) * G);
          }
          break;
        }
      }
    }

    // 3. Solve [G][V] = [I] based on selected solver
    let V_sol: Float64Array;
    const branchUpdates = runtimeMutator.getActiveBranchUpdates();

    if (branchUpdates.length > 0 && this.luSolver && this.luSolver.valid) {
      V_sol = ShermanMorrisonEngine.solveRankK(rhs, this.luSolver, branchUpdates);
    } else if (this.solverType === 'sparse' && this.sparseLUSolver && this.sparseLUSolver.valid) {
      V_sol = this.sparseLUSolver.solve(rhs);
    } else {
      V_sol = this.luSolver.solve(rhs);
    }

    this.lastNodeVoltages = V_sol;

    const getNodeVoltage = (nodeIdx: number) => {
      if (nodeIdx === 0) return 0.0;
      return V_sol[nodeIdx - 1] || 0.0;
    };

    // 4. Update states & history
    for (const comp of this.netlist.components) {
      const pins = getComponentPins(comp);
      const params = comp.params || {};
      const state = this.componentStates.get(comp.id);
      if (!state) continue;

      switch (comp.type) {
        case COMPONENT_TYPES.RESISTOR: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
          const v = v1 - v2;
          const R = Math.max(params.resistance || 10.0, 1e-6);
          state.prevV = v;
          state.prevI = v / R;
          break;
        }
        case COMPONENT_TYPES.INDUCTOR: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
          const v = v1 - v2;
          const L = Math.max(params.inductance || 0.05, 1e-9);
          if (isBE) {
            const G = effectiveDt / L;
            state.prevI = G * v + state.prevI;
          } else {
            const G = effectiveDt / (2.0 * L);
            const Ihist = state.prevI + G * state.prevV;
            state.prevI = G * v + Ihist;
          }
          state.prevV = v;
          break;
        }
        case COMPONENT_TYPES.CAPACITOR: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
          const v = v1 - v2;
          const C = Math.max(params.capacitance || 100e-6, 1e-12);
          if (isBE) {
            const G = C / effectiveDt;
            state.prevI = G * (v - state.prevV);
          } else {
            const G = (2.0 * C) / effectiveDt;
            const Ihist = -state.prevI - G * state.prevV;
            state.prevI = G * v + Ihist;
          }
          state.prevV = v;
          break;
        }
        case COMPONENT_TYPES.VOLTMETER:
        case COMPONENT_TYPES.SIGNAL_PROBE: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = pins.length > 1 ? getNodeVoltage(this.netlist.getNode(pins[1].id)) : 0.0;
          state.prevV = v1 - v2;
          break;
        }
        case COMPONENT_TYPES.AMMETER: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
          state.prevI = (v1 - v2) * 1e5;
          break;
        }
        case COMPONENT_TYPES.PI_LINE: {
          const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
          const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
          state.v_c1 = v1;
          state.v_c2 = v2;
          state.v_L = v1 - v2;
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_1PH: {
          const line = this.bergeronLines.get(comp.id);
          if (line) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const iSend = line.G_equiv * v1 - line.I_hist_send;
            const iRecv = line.G_equiv * v2 - line.I_hist_recv;
            line.recordTerminalStates(t, v1, iSend, v2, iRecv);
            state.prevV = v1 - v2;
            state.prevI = iSend;
          }
          break;
        }
        case COMPONENT_TYPES.BERGERON_LINE_3PH: {
          const polyLine = this.polyphaseLines.get(comp.id);
          if (polyLine) {
            const vSend: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[0]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[1]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[2]?.id || ''))
            ];
            const vRecv: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[3]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[4]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[5]?.id || ''))
            ];
            const iSend: [number, number, number] = [0, 0, 0];
            const iRecv: [number, number, number] = [0, 0, 0];
            for (let r = 0; r < 3; r++) {
              let sumSend = 0;
              let sumRecv = 0;
              for (let c = 0; c < 3; c++) {
                sumSend += polyLine.G_phase[r][c] * vSend[c];
                sumRecv += polyLine.G_phase[r][c] * vRecv[c];
              }
              iSend[r] = sumSend - polyLine.I_hist_send[r];
              iRecv[r] = sumRecv - polyLine.I_hist_recv[r];
            }
            polyLine.recordTerminalStates(t, vSend, iSend, vRecv, iRecv);
            state.prevV = vSend[0] - vRecv[0];
            state.prevI = iSend[0];
          }
          break;
        }
        case COMPONENT_TYPES.FD_PHASE_LINE: {
          const fdLine = this.fdPhaseLines.get(comp.id);
          if (fdLine) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const iSend = fdLine.G_equiv * v1 - fdLine.I_hist_send;
            const iRecv = fdLine.G_equiv * v2 - fdLine.I_hist_recv;
            fdLine.recordTerminalStates(t, v1, iSend, v2, iRecv);
            state.prevV = v1 - v2;
            state.prevI = iSend;
          }
          break;
        }
        case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH: {
          const umec = this.umecTransformers.get(comp.id);
          if (umec) {
            const termVoltages = new Float64Array(8);
            for (let i = 0; i < 8; i++) {
              termVoltages[i] = getNodeVoltage(this.netlist.getNode(pins[i]?.id || ''));
            }
            umec.updateState(termVoltages, effectiveDt, state);
            state.prevV = termVoltages[0] - termVoltages[3];
            state.flux_a = state.flux ? state.flux[0] : 0;
            state.flux_b = state.flux ? state.flux[1] : 0;
            state.flux_c = state.flux ? state.flux[2] : 0;
          }
          break;
        }
        case COMPONENT_TYPES.SYNC_MACHINE_DQ: {
          const sm = this.syncMachinesDq.get(comp.id);
          if (sm) {
            const v_abc: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[0]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[1]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[2]?.id || ''))
            ];
            const i_abc: [number, number, number] = [0, 0, 0];
            for (let r = 0; r < 3; r++) {
              let sumGV = 0;
              for (let c = 0; c < 3; c++) {
                sumGV += sm.G_abc[r][c] * v_abc[c];
              }
              i_abc[r] = sumGV;
            }
            sm.step(v_abc, i_abc, effectiveDt, state);
            state.prevV = v_abc[0];
            state.prevI = i_abc[0];
          }
          break;
        }
        case COMPONENT_TYPES.INDUCTION_MACHINE: {
          const im = this.inductionMachines.get(comp.id);
          if (im) {
            const v_abc: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[0]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[1]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[2]?.id || ''))
            ];
            const i_abc: [number, number, number] = [0, 0, 0];
            for (let r = 0; r < 3; r++) {
              let sumGV = 0;
              for (let c = 0; c < 3; c++) {
                sumGV += im.G_abc[r][c] * v_abc[c];
              }
              i_abc[r] = sumGV;
            }
            im.step(v_abc, i_abc, effectiveDt, state);
            state.prevV = v_abc[0];
            state.prevI = i_abc[0];
          }
          break;
        }
        case COMPONENT_TYPES.DFIG_GENERATOR: {
          const dfig = this.dfigMachines.get(comp.id);
          if (dfig) {
            const v_abc: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[0]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[1]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[2]?.id || ''))
            ];
            const i_abc: [number, number, number] = [0, 0, 0];
            for (let r = 0; r < 3; r++) {
              let sumGV = 0;
              for (let c = 0; c < 3; c++) {
                sumGV += dfig.G_abc[r][c] * v_abc[c];
              }
              i_abc[r] = sumGV;
            }
            dfig.step(v_abc, i_abc, effectiveDt, state);
            state.prevV = v_abc[0];
            state.prevI = i_abc[0];
          }
          break;
        }
        case COMPONENT_TYPES.PMSG_GENERATOR: {
          const pmsg = this.pmsgMachines.get(comp.id);
          if (pmsg) {
            const v_abc: [number, number, number] = [
              getNodeVoltage(this.netlist.getNode(pins[0]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[1]?.id || '')),
              getNodeVoltage(this.netlist.getNode(pins[2]?.id || ''))
            ];
            const i_abc: [number, number, number] = [0, 0, 0];
            for (let r = 0; r < 3; r++) {
              let sumGV = 0;
              for (let c = 0; c < 3; c++) {
                sumGV += pmsg.G_abc[r][c] * v_abc[c];
              }
              i_abc[r] = sumGV;
            }
            pmsg.step(v_abc, i_abc, effectiveDt, state);
            state.prevV = v_abc[0];
            state.prevI = i_abc[0];
          }
          break;
        }
        case COMPONENT_TYPES.SURGE_ARRESTER: {
          const sa = this.surgeArresters.get(comp.id);
          if (sa) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const v = v1 - v2;
            sa.updateState(v, effectiveDt, state);
          }
          break;
        }
        case COMPONENT_TYPES.IDEAL_SWITCH: {
          const sw = this.idealSwitches.get(comp.id);
          if (sw) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const v = v1 - v2;
            const { G } = sw.computeCompanionStamp(state.isClosed);
            const i = v * G;
            const { stateChanged } = sw.updateState(v, i, t, state);
            if (stateChanged) {
              this.needsRecompilation = true;
              this.cdaManager.trigger({
                componentId: comp.id,
                type: 'SWITCH_TOGGLE',
                timestamp: t,
                description: `Ideal Switch '${comp.name || comp.id}' switched ${state.isClosed ? 'CLOSED' : 'OPEN'}.`
              });
            }
          }
          break;
        }
        case COMPONENT_TYPES.DIODE: {
          const diode = this.diodes.get(comp.id);
          if (diode) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const v = v1 - v2;
            const { G, Ihist } = diode.computeCompanionStamp(state.mode || 'OFF');
            const i = v * G - Ihist;
            const { modeChanged, newMode } = diode.updateState(v, i, effectiveDt, state);
            if (modeChanged) {
              this.needsRecompilation = true;
              this.cdaManager.trigger({
                componentId: comp.id,
                type: 'DIODE_COMMUTATION',
                timestamp: t,
                description: `Diode '${comp.name || comp.id}' commutated to ${newMode}.`
              });
            }
          }
          break;
        }
        case COMPONENT_TYPES.THYRISTOR: {
          const thy = this.thyristors.get(comp.id);
          if (thy) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const v = v1 - v2;
            const { G, Ihist } = thy.computeCompanionStamp(state.mode || 'BLOCKING');
            const i = v * G - Ihist;
            const gatePulse = state.isFired !== undefined ? state.isFired : true;
            const { modeChanged, newMode } = thy.updateState(v, i, gatePulse, effectiveDt, state);
            if (modeChanged) {
              this.needsRecompilation = true;
              this.cdaManager.trigger({
                componentId: comp.id,
                type: 'THYRISTOR_COMMUTATION',
                timestamp: t,
                description: `Thyristor '${comp.name || comp.id}' transitioned to ${newMode}.`
              });
            }
          }
          break;
        }
        case COMPONENT_TYPES.IGBT_DIODE: {
          const igbt = this.igbtDiodes.get(comp.id);
          if (igbt) {
            const v1 = getNodeVoltage(this.netlist.getNode(pins[0].id));
            const v2 = getNodeVoltage(this.netlist.getNode(pins[1].id));
            const v = v1 - v2;
            const { G, Ihist } = igbt.computeCompanionStamp(state.mode || 'OFF');
            const i = v * G - Ihist;
            const gateSignal = state.gateSignal !== undefined ? state.gateSignal : true;
            const { modeChanged, newMode } = igbt.updateState(v, i, gateSignal, state);
            if (modeChanged) {
              this.needsRecompilation = true;
              this.cdaManager.trigger({
                componentId: comp.id,
                type: 'IGBT_SWITCHING',
                timestamp: t,
                description: `IGBT '${comp.name || comp.id}' switched to ${newMode}.`
              });
            }
          }
          break;
        }
        case COMPONENT_TYPES.MMC_CONVERTER_3PH: {
          const mmc = this.mmcConverters.get(comp.id);
          if (mmc && state.armStates) {
            const nDcp = this.netlist.getNode(pins[0]?.id || '');
            const nDcn = this.netlist.getNode(pins[1]?.id || '');
            const nA = this.netlist.getNode(pins[2]?.id || '');
            const nB = this.netlist.getNode(pins[3]?.id || '');
            const nC = this.netlist.getNode(pins[4]?.id || '');
            mmc.updateConverterState(
              {
                v_dcp: getNodeVoltage(nDcp),
                v_dcn: getNodeVoltage(nDcn),
                v_a: getNodeVoltage(nA),
                v_b: getNodeVoltage(nB),
                v_c: getNodeVoltage(nC)
              },
              effectiveDt,
              state,
              isBE
            );
            state.prevV = state.v_ac[0];
            state.prevI = state.i_ac[0];
          }
          break;
        }
        case COMPONENT_TYPES.LCC_BRIDGE_6PULSE:
        case COMPONENT_TYPES.LCC_BRIDGE_12PULSE: {
          const lcc = this.lccBridges.get(comp.id);
          if (lcc && state.thyristors) {
            const nA = this.netlist.getNode(pins[0]?.id || '');
            const nB = this.netlist.getNode(pins[1]?.id || '');
            const nC = this.netlist.getNode(pins[2]?.id || '');
            const nDcp = this.netlist.getNode(pins[3]?.id || '');
            const nDcn = this.netlist.getNode(pins[4]?.id || '');
            lcc.updateBridgeState(
              getNodeVoltage(nA),
              getNodeVoltage(nB),
              getNodeVoltage(nC),
              getNodeVoltage(nDcp),
              getNodeVoltage(nDcn),
              t,
              effectiveDt,
              state
            );
            state.prevV = state.v_dc;
            state.prevI = state.i_dc;
          }
          break;
        }
        case COMPONENT_TYPES.STATCOM: {
          const nA = this.netlist.getNode(pins[0]?.id || '');
          state.prevV = getNodeVoltage(nA);
          state.prevI = state.i_d || 0.0;
          break;
        }
        case COMPONENT_TYPES.SVC: {
          const svc = this.svcs.get(comp.id);
          if (svc) {
            const nA = this.netlist.getNode(pins[0]?.id || '');
            const nB = this.netlist.getNode(pins[1]?.id || '');
            const nC = this.netlist.getNode(pins[2]?.id || '');
            svc.executeControl(getNodeVoltage(nA), getNodeVoltage(nB), getNodeVoltage(nC), t, effectiveDt, state);
            state.prevV = state.v_ac_rms;
            state.prevI = state.i_svc_rms;
          }
          break;
        }
      }
    }

    // 5. Advance CDA stage if active
    if (isCDAActive) {
      const nextStage = this.cdaManager.advanceStage();
      if (nextStage === CDAStage.IDLE) {
        this.needsRecompilation = true; // Revert back to Trapezoidal conductance
      }
    }

    // 6. Record decimation signals
    if (this.stepCount % this.sampleDecimation === 0) {
      this.recordSignals(t);
    }

    this.t += effectiveDt;
    this.stepCount++;

    const tEnd = performance.now();
    this.lastStepDurationMs = tEnd - tStart;
    this.totalSolveTimeMs += this.lastStepDurationMs;
  }

  recordSignals(t: number): void {
    if (this.signals.has('Time')) {
      this.signals.get('Time')!.push(t);
    }

    if (!this.netlist) return;
    for (const comp of this.netlist.components) {
      const state = this.componentStates.get(comp.id);
      if (!state) continue;

      const sigName = comp.params?.signalName || comp.name || comp.id;

      if (comp.type === COMPONENT_TYPES.VOLTMETER || comp.type === COMPONENT_TYPES.SIGNAL_PROBE) {
        if (!this.signals.has(sigName)) this.signals.set(sigName, []);
        this.signals.get(sigName)!.push(state.prevV || 0.0);
      } else if (comp.type === COMPONENT_TYPES.AMMETER) {
        if (!this.signals.has(sigName)) this.signals.set(sigName, []);
        this.signals.get(sigName)!.push(state.prevI || 0.0);
      } else if (comp.params?.monitored) {
        if (!this.signals.has(sigName)) this.signals.set(sigName, []);
        this.signals.get(sigName)!.push(state.prevV || 0.0);
      } else if (comp.type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER || comp.type === COMPONENT_TYPES.DATA_LABEL_RECEIVER) {
        const val = this.csmfEngine.readWirelessSignal(sigName, 0.0);
        if (!this.signals.has(sigName)) this.signals.set(sigName, []);
        this.signals.get(sigName)!.push(val);
      } else if (comp.type.startsWith('csmf_')) {
        const outPin = `${comp.id}_out`;
        const val = this.csmfEngine.readPinValue(outPin, 0.0);
        if (!this.signals.has(sigName)) this.signals.set(sigName, []);
        this.signals.get(sigName)!.push(val);
      }
    }

    // Record any named wireless bus signals
    for (const [busName, val] of this.csmfEngine.signalBus.entries()) {
      if (!this.signals.has(busName)) this.signals.set(busName, []);
      // Only push if we haven't already pushed for this time step
      if (this.signals.get(busName)!.length < this.signals.get('Time')!.length) {
        this.signals.get(busName)!.push(val);
      }
    }
  }

  toggleBreaker(compId: string): void {
    const state = this.componentStates.get(compId);
    const comp = this.netlist?.components?.find(c => c.id === compId);
    if (state && comp) {
      state.isClosed = !state.isClosed;
      this.needsRecompilation = true;
      this.cdaManager.trigger({
        componentId: compId,
        type: 'MANUAL_BREAKER_TOGGLE',
        timestamp: this.t,
        description: `Manual switch: Breaker '${comp.name || comp.id}' toggled ${state.isClosed ? 'CLOSED' : 'OPEN'}.`
      });
      this.emit('log', {
        type: 'info',
        text: `Manual switch: Breaker '${comp.name || comp.id}' toggled ${state.isClosed ? 'CLOSED' : 'OPEN'} (CDA active).`
      });
      this.emit('breaker_toggled', { compId, isClosed: state.isClosed });
    }
  }

  setComponentParam(compId: string, key: string, value: any): void {
    if (!this.netlist) return;
    const comp = this.netlist.components.find(c => c.id === compId);
    if (comp) {
      if (!comp.params) comp.params = {};
      comp.params[key] = value;
      this.needsRecompilation = true;

      // Notify runtime mutator
      runtimeMutator.mutateParam(this.netlist.components, compId, key, value);

      if (
        comp.type === COMPONENT_TYPES.RUNTIME_SLIDER ||
        comp.type === COMPONENT_TYPES.RUNTIME_DIAL ||
        comp.type === COMPONENT_TYPES.RUNTIME_BUTTON ||
        comp.type === COMPONENT_TYPES.RUNTIME_SWITCH
      ) {
        const outPin = `${comp.id}_out`;
        const numVal = typeof value === 'boolean' ? (value ? 1.0 : 0.0) : (parseFloat(value) || 0.0);
        this.csmfEngine.setPinValue(outPin, numVal);
      }

      // If target component is a breaker or switch
      if (
        comp.type === COMPONENT_TYPES.BREAKER_1PH ||
        comp.type === COMPONENT_TYPES.BREAKER_3PH ||
        comp.type === COMPONENT_TYPES.TIMED_SWITCH
      ) {
        const state = this.componentStates.get(compId);
        if (state && (key === 'isClosed' || key === 'switchState' || key === 'status')) {
          const isClosed = Boolean(value);
          if (state.isClosed !== isClosed) {
            state.isClosed = isClosed;
            this.needsRecompilation = true;
            this.cdaManager.trigger({
              componentId: compId,
              type: 'MANUAL_BREAKER_TOGGLE',
              timestamp: this.t,
              description: `Breaker '${comp.name || compId}' switched ${isClosed ? 'CLOSED' : 'OPEN'}.`
            });
            this.emit('log', {
              type: 'info',
              text: `Breaker '${comp.name || compId}' switched ${isClosed ? 'CLOSED' : 'OPEN'} (CDA active).`
            });
            this.emit('breaker_toggled', { compId, isClosed });
          }
        }
      }
    }
  }

  setRuntimeControlValue(compId: string, value: number | boolean): void {
    this.setComponentParam(compId, typeof value === 'boolean' ? (value ? 'buttonState' : 'switchState') : 'value', value);
    if (!this.netlist) return;
    const comp = this.netlist.components.find(c => c.id === compId);
    if (comp) {
      if (comp.params?.targetSignal) {
        const numVal = typeof value === 'boolean' ? (value ? 1.0 : 0.0) : Number(value);
        this.csmfEngine.signalBus.set(comp.params.targetSignal, numVal);
      }
      if (comp.params?.targetCompId) {
        const targetComp = this.netlist.components.find(c => c.id === comp.params?.targetCompId);
        const isBreaker = targetComp && (
          targetComp.type === COMPONENT_TYPES.BREAKER_1PH ||
          targetComp.type === COMPONENT_TYPES.BREAKER_3PH ||
          targetComp.type === COMPONENT_TYPES.TIMED_SWITCH
        );
        const isSource = targetComp && (
          targetComp.type === COMPONENT_TYPES.AC_SOURCE_1PH ||
          targetComp.type === COMPONENT_TYPES.AC_SOURCE_3PH ||
          targetComp.type === COMPONENT_TYPES.DC_SOURCE
        );
        const isResistor = targetComp && targetComp.type === COMPONENT_TYPES.RESISTOR;

        const defaultParam = isBreaker
          ? 'isClosed'
          : isResistor
          ? 'resistance'
          : isSource
          ? 'freq'
          : 'value';

        const targetParam = comp.params.targetParam || defaultParam;
        this.setComponentParam(comp.params.targetCompId, targetParam, value);
        this.needsRecompilation = true;
      }
    }
  }

  start(): void {
    if (!this.netlist || this.netlist.nodeCount === 0) {
      if (this.netlist) this.initialize(this.netlist);
    }
    if (this.t >= this.tMax) {
      this.t = 0.0;
      this.stepCount = 0;
      this.initSignalBuffers();
    }

    this.isRunning = true;
    this.isPaused = false;
    this.lastRealTimestamp = performance.now();
    this.emit('start', { t: this.t, tMax: this.tMax });

    const runLoop = (now: number) => {
      if (!this.isRunning || this.isPaused) return;

      const elapsedMs = now - (this.lastRealTimestamp || now);
      this.lastRealTimestamp = now;

      const simulatedMsNeeded = elapsedMs * this.speedMultiplier;
      const targetSteps = Math.floor((simulatedMsNeeded * 1e-3) / this.dt);
      const stepsToRun = Math.max(1, Math.min(targetSteps, 600));

      for (let i = 0; i < stepsToRun; i++) {
        if (this.t >= this.tMax) {
          this.pause();
          this.emit('log', {
            type: 'info',
            text: `Simulation complete at t = ${this.t.toFixed(4)} s (${this.stepCount} steps).`
          });
          this.emit('stop', { t: this.t });
          return;
        }
        this.step();
      }

      this.emit('time_update', {
        t: this.t,
        tMax: this.tMax,
        progress: (this.t / this.tMax) * 100,
        cdaActive: this.cdaManager.isActive,
        cdaTriggers: this.cdaManager.totalCDATriggers
      });

      this.animFrameId = requestAnimationFrame(runLoop);
    };

    this.animFrameId = requestAnimationFrame(runLoop);
  }

  pause(): void {
    this.isRunning = false;
    this.isPaused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.emit('pause', { t: this.t });
  }

  stop(): void {
    this.pause();
    this.isPaused = false;
    this.t = 0.0;
    this.stepCount = 0;
    this.emit('stop', { t: 0.0 });
  }

  reset(): void {
    this.stop();
    runtimeMutator.reset();
    if (this.netlist) {
      this.initialize(this.netlist);
    }
    this.emit('reset');
  }

  getSignals(): Map<string, number[]> {
    return this.signals;
  }
}

export const simulationEngine = new EMTSimulationEngine();
