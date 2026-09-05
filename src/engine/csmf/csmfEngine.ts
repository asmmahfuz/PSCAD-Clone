/**
 * PSCAD CLONE - CSMF Control System Execution Engine
 */

import { MathBlocks } from './mathBlocks';
import { LogicBlocks } from './logicBlocks';
import { NonLinearBlocks } from './nonlinearBlocks';
import { PowerTransforms } from './powerTransforms';
import { PwmGenerators } from './pwmGenerators';
import { TransferFunctionS, DiscreteFilterZ } from './transferFunction';
import { IEEEG1Governor, HYGOVGovernor, GASTGovernor, DEGOVGovernor } from './governors';
import { AC1AExciter, DC1AExciter, ST1AExciter } from './exciters';
import { PSS1AStabilizer, PSS2BStabilizer } from './stabilizers';
import { WindTurbineAerodynamics } from '../machines/windAerodynamics';
import { COMPONENT_TYPES } from '../../constants';
import type { CircuitComponentData, WireData } from '../../types';
import { customComponentRegistry } from '../customComponents';

export class CSMFEngine {
  /**
   * Signal dictionary holding all named wireless data labels and pin values
   */
  signalBus: Map<string, number> = new Map();

  /**
   * Per-component internal control states
   */
  blockStates: Map<string, any> = new Map();

  /**
   * Pin value cache
   */
  pinValues: Map<string, number> = new Map();

  /**
   * Map from component pin ID to the set of connected source pin IDs
   */
  pinConnections: Map<string, string[]> = new Map();

  /**
   * Components ordered for evaluation
   */
  controlComponents: CircuitComponentData[] = [];

  reset(): void {
    this.signalBus.clear();
    this.blockStates.clear();
    this.pinValues.clear();
    this.pinConnections.clear();
    this.controlComponents = [];
  }

  initialize(components: CircuitComponentData[], wires: WireData[]): void {
    this.reset();

    // 1. Build pin connection graph
    for (const wire of wires || []) {
      if (wire.startPin && wire.endPin) {
        if (!this.pinConnections.has(wire.endPin)) {
          this.pinConnections.set(wire.endPin, []);
        }
        this.pinConnections.get(wire.endPin)!.push(wire.startPin);

        if (!this.pinConnections.has(wire.startPin)) {
          this.pinConnections.set(wire.startPin, []);
        }
        this.pinConnections.get(wire.startPin)!.push(wire.endPin);
      }
    }

    // 2. Identify and register all CSMF blocks and Wireless Data Labels
    for (const comp of components || []) {
      if (this.isControlComponent(comp.type)) {
        this.controlComponents.push(comp);
        this.blockStates.set(comp.id, this.initBlockState(comp));
      }
    }
  }

  isControlComponent(type: string): boolean {
    return (
      type.startsWith('csmf_') ||
      type.startsWith('gov_') ||
      type.startsWith('avr_') ||
      type.startsWith('pss_') ||
      type === COMPONENT_TYPES.WIND_TURBINE_AERO ||
      type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER ||
      type === COMPONENT_TYPES.DATA_LABEL_RECEIVER ||
      type === COMPONENT_TYPES.RUNTIME_SLIDER ||
      type === COMPONENT_TYPES.RUNTIME_DIAL ||
      type === COMPONENT_TYPES.RUNTIME_BUTTON ||
      type === COMPONENT_TYPES.RUNTIME_SWITCH ||
      type === COMPONENT_TYPES.RUNTIME_GAUGE ||
      type === COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY ||
      type === COMPONENT_TYPES.CUSTOM_USER_COMPONENT
    );
  }

  initBlockState(comp: CircuitComponentData): any {
    const params = comp.params || {};
    switch (comp.type) {
      case COMPONENT_TYPES.CSMF_INTEGRATOR:
        return { y: params.initVal || 0.0, prevU: 0.0 };
      case COMPONENT_TYPES.CSMF_PID:
        return { integ: 0.0, prevErr: 0.0, derivFilt: 0.0 };
      case COMPONENT_TYPES.CSMF_PLL:
        return {
          theta: 0.0,
          omega: 2 * Math.PI * (params.pllFreq || 60),
          piState: { integ: 0.0, prevErr: 0.0, derivFilt: 0.0 },
          freqNomHz: params.pllFreq || 60
        };
      case COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER:
        return {
          sogiA: { v: 0, qv: 0 },
          sogiB: { v: 0, qv: 0 },
          sogiC: { v: 0, qv: 0 }
        };
      case COMPONENT_TYPES.CSMF_EDGE_DETECTOR:
        return { prevBool: false };
      case COMPONENT_TYPES.CSMF_FLIP_FLOP:
        return { q: false, prevClk: false };
      case COMPONENT_TYPES.CSMF_COMPARATOR:
        return { prevOut: false };
      case COMPONENT_TYPES.CSMF_RATE_LIMITER:
        return { prevY: 0.0, isInit: false };
      case COMPONENT_TYPES.CSMF_BACKLASH:
        return { prevY: 0.0, isInit: false };
      case COMPONENT_TYPES.CSMF_HYSTERESIS:
        return { y: 0.0 };
      case COMPONENT_TYPES.CSMF_TRANSFER_FUNCTION_S:
        return new TransferFunctionS({
          num: params.num || [1.0],
          den: params.den || [0.1, 1.0],
          minVal: params.minVal,
          maxVal: params.maxVal,
          slewRateMax: params.slewRateMax,
          slewRateMin: params.slewRateMin,
        });
      case COMPONENT_TYPES.CSMF_FILTER_Z:
        return new DiscreteFilterZ(
          params.b || [1.0],
          params.a || [1.0],
          params.minVal,
          params.maxVal
        );
      case COMPONENT_TYPES.GOV_IEEEG1:
        return new IEEEG1Governor(comp.id, params as any);
      case COMPONENT_TYPES.GOV_HYGOV:
        return new HYGOVGovernor(comp.id, params as any);
      case COMPONENT_TYPES.GOV_GAST:
        return new GASTGovernor(comp.id, params as any);
      case COMPONENT_TYPES.GOV_DEGOV:
        return new DEGOVGovernor(comp.id, params as any);
      case COMPONENT_TYPES.AVR_AC1A:
        return new AC1AExciter(comp.id, params as any);
      case COMPONENT_TYPES.AVR_DC1A:
        return new DC1AExciter(comp.id, params as any);
      case COMPONENT_TYPES.AVR_ST1A:
        return new ST1AExciter(comp.id, params as any);
      case COMPONENT_TYPES.PSS_PSS1A:
        return new PSS1AStabilizer(comp.id, params as any);
      case COMPONENT_TYPES.PSS_PSS2B:
        return new PSS2BStabilizer(comp.id, params as any);
      case COMPONENT_TYPES.WIND_TURBINE_AERO:
        return new WindTurbineAerodynamics(comp.id, params as any);
      default:
        return {};
    }
  }

  /**
   * Set an external pin value (e.g. from an EMT voltmeter or probe measurement)
   */
  setPinValue(pinId: string, val: number): void {
    this.pinValues.set(pinId, val);
  }

  /**
   * Read the input value for a given pin ID from connected pins or wireless bus
   */
  readPinValue(pinId: string, defaultValue: number = 0.0): number {
    if (this.pinValues.has(pinId)) {
      return this.pinValues.get(pinId)!;
    }

    const conns = this.pinConnections.get(pinId);
    if (conns && conns.length > 0) {
      for (const srcPin of conns) {
        if (this.pinValues.has(srcPin)) {
          return this.pinValues.get(srcPin)!;
        }
      }
    }

    return defaultValue;
  }

  /**
   * Publish a signal to the wireless bus
   */
  publishWirelessSignal(name: string, val: number): void {
    if (!name) return;
    this.signalBus.set(name, val);
  }

  /**
   * Read a wireless signal
   */
  readWirelessSignal(name: string, defaultValue: number = 0.0): number {
    if (!name) return defaultValue;
    return this.signalBus.has(name) ? this.signalBus.get(name)! : defaultValue;
  }

  /**
   * Step all CSMF control blocks for the current time-step
   */
  step(t: number, dt: number): void {
    // Perform two signal propagation passes per step to instantly resolve transmitters and receivers
    for (let pass = 0; pass < 2; pass++) {
      for (const comp of this.controlComponents) {
        const params = comp.params || {};
        const state = this.blockStates.get(comp.id) || {};

        if (comp.type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER) {
          const inPin = `${comp.id}_in`;
          const sigName = comp.params?.signalName || comp.name;
          const val = this.readPinValue(inPin, comp.params?.defaultValue || 0.0);
          if (sigName) {
            this.publishWirelessSignal(sigName, val);
          }
          continue;
        }

        if (comp.type === COMPONENT_TYPES.DATA_LABEL_RECEIVER) {
          const outPin = `${comp.id}_out`;
          const sigName = comp.params?.signalName || comp.name;
          const val = this.readWirelessSignal(sigName, comp.params?.defaultValue || 0.0);
          this.pinValues.set(outPin, val);
          continue;
        }

        switch (comp.type) {
          case COMPONENT_TYPES.CSMF_CONSTANT: {
            const outPin = `${comp.id}_out`;
            const val = MathBlocks.Constant(params.voltage !== undefined ? params.voltage : (params.gain !== undefined ? params.gain : 1.0));
            this.pinValues.set(outPin, val);
            break;
          }

          case COMPONENT_TYPES.CSMF_GAIN: {
            const inPin = `${comp.id}_in`;
            const outPin = `${comp.id}_out`;
            const u = this.readPinValue(inPin);
            const y = MathBlocks.Gain(u, params.gain !== undefined ? params.gain : 1.0, params.offset || 0.0);
            this.pinValues.set(outPin, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_SUM: {
            const numInputs = params.numInputs || 2;
            const signs = params.signs || ['+', '+'];
            let inputs: number[] = [];
            for (let i = 0; i < numInputs; i++) {
              inputs.push(this.readPinValue(`${comp.id}_in${i + 1}`));
            }
            // Also check default single 'in' pin if single wire
            const allZero = inputs.every(v => v === 0);
            if (allZero) {
              const fallbackIn = this.readPinValue(`${comp.id}_in`);
              if (fallbackIn !== 0) inputs = [fallbackIn];
            }
            const y = MathBlocks.Sum(inputs, signs);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_MULTIPLIER: {
            const u1 = this.readPinValue(`${comp.id}_in1`, 1.0);
            const u2 = this.readPinValue(`${comp.id}_in2`, 1.0);
            const y = MathBlocks.Multiplier([u1, u2]);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_DIVIDER: {
            const num = this.readPinValue(`${comp.id}_in1`, 0.0);
            const den = this.readPinValue(`${comp.id}_in2`, 1.0);
            const y = MathBlocks.Divider(num, den);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_MATH_FUNC: {
            const u = this.readPinValue(`${comp.id}_in`);
            const u2 = this.readPinValue(`${comp.id}_in2`, 0.0);
            const y = MathBlocks.MathFunction(u, params.mathOp || 'sin', u2);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_MIN_MAX: {
            const u1 = this.readPinValue(`${comp.id}_in1`);
            const u2 = this.readPinValue(`${comp.id}_in2`);
            const y = MathBlocks.MinMax([u1, u2], params.minMaxMode || 'min');
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_INTEGRATOR: {
            const u = this.readPinValue(`${comp.id}_in`);
            const reset = this.readPinValue(`${comp.id}_reset`, 0.0) >= 0.5;
            const { output, state: nextState } = MathBlocks.Integrator(
              u,
              dt,
              state,
              params.limitMin !== undefined ? params.limitMin : -Infinity,
              params.limitMax !== undefined ? params.limitMax : Infinity,
              params.gain !== undefined ? params.gain : 1.0,
              reset
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_PID: {
            const err = this.readPinValue(`${comp.id}_in`);
            const { output, state: nextState } = MathBlocks.PID(
              err,
              dt,
              state,
              params.pidKp !== undefined ? params.pidKp : 1.0,
              params.pidKi !== undefined ? params.pidKi : 5.0,
              params.pidKd !== undefined ? params.pidKd : 0.0,
              params.pidTf !== undefined ? params.pidTf : 0.005,
              params.pidMin !== undefined ? params.pidMin : -10.0,
              params.pidMax !== undefined ? params.pidMax : 10.0
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_LOGIC_GATE: {
            const u1 = this.readPinValue(`${comp.id}_in1`);
            const u2 = this.readPinValue(`${comp.id}_in2`);
            const inputs = params.logicOp === 'NOT' ? [u1] : [u1, u2];
            const y = LogicBlocks.LogicGate(inputs, params.logicOp || 'AND', params.threshold || 0.5);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_EDGE_DETECTOR: {
            const u = this.readPinValue(`${comp.id}_in`);
            const { output, state: nextState } = LogicBlocks.EdgeDetector(
              u,
              state,
              params.edgeType || 'rising',
              params.threshold || 0.5
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_FLIP_FLOP: {
            const in1 = this.readPinValue(`${comp.id}_in1`);
            const in2 = this.readPinValue(`${comp.id}_in2`);
            const { q, qNot, state: nextState } = LogicBlocks.FlipFlop(
              { sOrD: in1, rOrClk: in2 },
              state,
              params.flipFlopType || 'RS',
              params.threshold || 0.5
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, q);
            this.pinValues.set(`${comp.id}_out_not`, qNot);
            break;
          }

          case COMPONENT_TYPES.CSMF_COMPARATOR: {
            const u1 = this.readPinValue(`${comp.id}_in1`);
            const u2 = this.readPinValue(`${comp.id}_in2`, 0.0);
            const { output, state: nextState } = LogicBlocks.Comparator(
              u1,
              u2,
              params.compOp || 'GT',
              params.hysteresisWidth || 0.0,
              state
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_LIMITER: {
            const u = this.readPinValue(`${comp.id}_in`);
            const y = NonLinearBlocks.Limiter(u, params.limitMin !== undefined ? params.limitMin : -1.0, params.limitMax !== undefined ? params.limitMax : 1.0);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_RATE_LIMITER: {
            const u = this.readPinValue(`${comp.id}_in`);
            const { output, state: nextState } = NonLinearBlocks.RateLimiter(
              u,
              dt,
              state,
              params.rateUp || 100.0,
              params.rateDown || -100.0
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_DEADBAND: {
            const u = this.readPinValue(`${comp.id}_in`);
            const y = NonLinearBlocks.Deadband(u, params.deadbandWidth || 0.1);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_HYSTERESIS: {
            const u = this.readPinValue(`${comp.id}_in`);
            const { output, state: nextState } = NonLinearBlocks.Hysteresis(
              u,
              state,
              params.limitMax || 1.0,
              params.limitMin || -1.0,
              1.0,
              0.0
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_BACKLASH: {
            const u = this.readPinValue(`${comp.id}_in`);
            const { output, state: nextState } = NonLinearBlocks.Backlash(
              u,
              state,
              params.backlashGap || 0.1
            );
            this.blockStates.set(comp.id, nextState);
            this.pinValues.set(`${comp.id}_out`, output);
            break;
          }

          case COMPONENT_TYPES.CSMF_LOOKUP_1D: {
            const u = this.readPinValue(`${comp.id}_in`);
            const y = NonLinearBlocks.Lookup1D(u, params.lutX || [0, 1], params.lutY || [0, 1]);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_LOOKUP_2D: {
            const ux = this.readPinValue(`${comp.id}_in1`);
            const uy = this.readPinValue(`${comp.id}_in2`);
            const y = NonLinearBlocks.Lookup2D(ux, uy, params.lutX, params.lutY, params.lutZ);
            this.pinValues.set(`${comp.id}_out`, y);
            break;
          }

          case COMPONENT_TYPES.CSMF_CLARKE: {
            const va = this.readPinValue(`${comp.id}_pa`);
            const vb = this.readPinValue(`${comp.id}_pb`);
            const vc = this.readPinValue(`${comp.id}_pc`);
            const clarke = PowerTransforms.Clarke(va, vb, vc);
            this.pinValues.set(`${comp.id}_palpha`, clarke.alpha);
            this.pinValues.set(`${comp.id}_pbeta`, clarke.beta);
            this.pinValues.set(`${comp.id}_pzero`, clarke.zero);
            break;
          }

          case COMPONENT_TYPES.CSMF_PARK: {
            const vAlpha = this.readPinValue(`${comp.id}_palpha`);
            const vBeta = this.readPinValue(`${comp.id}_pbeta`);
            const theta = this.readPinValue(`${comp.id}_ptheta`);
            const park = PowerTransforms.Park(vAlpha, vBeta, theta);
            this.pinValues.set(`${comp.id}_pd`, park.d);
            this.pinValues.set(`${comp.id}_pq`, park.q);
            this.pinValues.set(`${comp.id}_pzero`, park.zero);
            break;
          }

          case COMPONENT_TYPES.CSMF_PLL: {
            const va = this.readPinValue(`${comp.id}_pa`);
            const vb = this.readPinValue(`${comp.id}_pb`);
            const vc = this.readPinValue(`${comp.id}_pc`);
            const pll = PowerTransforms.PLL(
              va,
              vb,
              vc,
              dt,
              state,
              params.pllKp || 60.0,
              params.pllKi || 1400.0
            );
            this.blockStates.set(comp.id, pll.state);
            this.pinValues.set(`${comp.id}_ptheta`, pll.theta);
            this.pinValues.set(`${comp.id}_pomega`, pll.omega);
            this.pinValues.set(`${comp.id}_pfreq`, pll.freqHz);
            this.pinValues.set(`${comp.id}_pd`, pll.V_d);
            this.pinValues.set(`${comp.id}_pq`, pll.V_q);
            break;
          }

          case COMPONENT_TYPES.CSMF_SEQUENCE_ANALYZER: {
            const va = this.readPinValue(`${comp.id}_pa`);
            const vb = this.readPinValue(`${comp.id}_pb`);
            const vc = this.readPinValue(`${comp.id}_pc`);
            const seq = PowerTransforms.SequenceAnalyzer(va, vb, vc, dt, state, params.freq || 60.0);
            this.blockStates.set(comp.id, seq.state);
            this.pinValues.set(`${comp.id}_pv1_mag`, seq.result.V1_mag);
            this.pinValues.set(`${comp.id}_pv1_ang`, seq.result.V1_phaseDeg);
            this.pinValues.set(`${comp.id}_pv2_mag`, seq.result.V2_mag);
            this.pinValues.set(`${comp.id}_pv2_ang`, seq.result.V2_phaseDeg);
            this.pinValues.set(`${comp.id}_pv0_mag`, seq.result.V0_mag);
            this.pinValues.set(`${comp.id}_pv0_ang`, seq.result.V0_phaseDeg);
            break;
          }

          case COMPONENT_TYPES.CSMF_SPWM: {
            const modA = this.readPinValue(`${comp.id}_pma`);
            const modB = this.readPinValue(`${comp.id}_pmb`);
            const modC = this.readPinValue(`${comp.id}_pmc`);
            const spwm = PwmGenerators.SPWM(
              modA,
              modB,
              modC,
              t,
              params.carrierFreq || params.spwmCarrierFreq || 2000.0,
              params.deadTimeSec || 0.0
            );
            this.pinValues.set(`${comp.id}_pga`, spwm.pulseA);
            this.pinValues.set(`${comp.id}_pga_not`, spwm.pulseA_not);
            this.pinValues.set(`${comp.id}_pgb`, spwm.pulseB);
            this.pinValues.set(`${comp.id}_pgb_not`, spwm.pulseB_not);
            this.pinValues.set(`${comp.id}_pgc`, spwm.pulseC);
            this.pinValues.set(`${comp.id}_pgc_not`, spwm.pulseC_not);
            this.pinValues.set(`${comp.id}_ptri`, spwm.carrier);
            break;
          }

          case COMPONENT_TYPES.CSMF_SVPWM: {
            const valpha = this.readPinValue(`${comp.id}_palpha`);
            const vbeta = this.readPinValue(`${comp.id}_pbeta`);
            const vdc = this.readPinValue(`${comp.id}_pvdc`, params.Vdc_nom || 800.0);
            const svpwm = PwmGenerators.SVPWM(
              valpha,
              vbeta,
              vdc,
              t,
              params.carrierFreq || 2000.0
            );
            this.pinValues.set(`${comp.id}_pga`, svpwm.pulseA);
            this.pinValues.set(`${comp.id}_pgb`, svpwm.pulseB);
            this.pinValues.set(`${comp.id}_pgc`, svpwm.pulseC);
            this.pinValues.set(`${comp.id}_psector`, svpwm.sector);
            this.pinValues.set(`${comp.id}_pdutya`, svpwm.dutyA);
            this.pinValues.set(`${comp.id}_pdutyb`, svpwm.dutyB);
            this.pinValues.set(`${comp.id}_pdutyc`, svpwm.dutyC);
            break;
          }

          case COMPONENT_TYPES.CSMF_FIRING_GEN_6PULSE: {
            const theta = this.readPinValue(`${comp.id}_ptheta`);
            const alphaDeg = this.readPinValue(
              `${comp.id}_palpha_deg`,
              params.firingAngleDeg !== undefined ? params.firingAngleDeg : (params.fir6AlphaDeg || 30.0)
            );
            const fir = PwmGenerators.FiringGenerator6Pulse(theta, alphaDeg, params.pulseWidthDeg || 30.0);
            for (let p = 1; p <= 6; p++) {
              this.pinValues.set(`${comp.id}_pp${p}`, (fir as any)[`p${p}`]);
            }
            break;
          }

          // Phase 6: Runtime Controls
          case COMPONENT_TYPES.RUNTIME_SLIDER:
          case COMPONENT_TYPES.RUNTIME_DIAL: {
            const outPin = `${comp.id}_out`;
            const val = comp.params?.value !== undefined ? comp.params.value : (comp.params?.minValue !== undefined ? comp.params.minValue : 0.0);
            this.pinValues.set(outPin, val);
            break;
          }

          case COMPONENT_TYPES.RUNTIME_BUTTON: {
            const outPin = `${comp.id}_out`;
            const val = comp.params?.buttonState ? 1.0 : 0.0;
            this.pinValues.set(outPin, val);
            break;
          }

          case COMPONENT_TYPES.RUNTIME_SWITCH: {
            const outPin = `${comp.id}_out`;
            const val = comp.params?.switchState ? 1.0 : 0.0;
            this.pinValues.set(outPin, val);
            break;
          }

          case COMPONENT_TYPES.RUNTIME_GAUGE:
          case COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY: {
            const inPin = `${comp.id}_in`;
            const u = this.readPinValue(inPin);
            state.inputVal = u;
            break;
          }

          // Phase 6: Custom User Component Workshop
          case COMPONENT_TYPES.CUSTOM_USER_COMPONENT: {
            const defId = comp.params?.customDefId;
            const def = defId ? customComponentRegistry.getComponent(defId) : undefined;
            if (def) {
              const inputs: Record<string, number> = {};
              def.pins
                .filter(p => p.direction === 'in' || p.direction === 'bidirectional')
                .forEach(p => {
                  inputs[p.name] = this.readPinValue(`${comp.id}_${p.id}`);
                });
              const res = customComponentRegistry.evaluate(def.id, inputs, comp.params || {}, state, dt, t);
              this.blockStates.set(comp.id, res.state);
              def.pins
                .filter(p => p.direction === 'out')
                .forEach(p => {
                  const outVal = res.outputs[p.name] !== undefined ? res.outputs[p.name] : 0.0;
                  this.pinValues.set(`${comp.id}_${p.id}`, outVal);
                });
            }
            break;
          }

          // Phase 12: s-Domain and z-Domain Transfer Functions & Dynamic Regulators
          case COMPONENT_TYPES.CSMF_TRANSFER_FUNCTION_S: {
            const u = this.readPinValue(`${comp.id}_in`);
            if (state instanceof TransferFunctionS) {
              const y = state.step(u, dt);
              this.pinValues.set(`${comp.id}_out`, y);
            }
            break;
          }

          case COMPONENT_TYPES.CSMF_FILTER_Z: {
            const u = this.readPinValue(`${comp.id}_in`);
            if (state instanceof DiscreteFilterZ) {
              const y = state.step(u);
              this.pinValues.set(`${comp.id}_out`, y);
            }
            break;
          }

          case COMPONENT_TYPES.GOV_IEEEG1:
          case COMPONENT_TYPES.GOV_HYGOV:
          case COMPONENT_TYPES.GOV_GAST:
          case COMPONENT_TYPES.GOV_DEGOV: {
            const wPu = this.readPinValue(`${comp.id}_pw`, 1.0);
            const wRef = this.readPinValue(`${comp.id}_pwref`, 1.0);
            const pRef = this.readPinValue(`${comp.id}_ppref`, comp.params?.Pref || 0.8);
            if (state && typeof state.step === 'function') {
              const pm = state.step(wPu, wRef, pRef, dt);
              this.pinValues.set(`${comp.id}_ppm`, pm);
            }
            break;
          }

          case COMPONENT_TYPES.AVR_AC1A:
          case COMPONENT_TYPES.AVR_DC1A:
          case COMPONENT_TYPES.AVR_ST1A: {
            const vtPu = this.readPinValue(`${comp.id}_pvt`, 1.0);
            const vRef = this.readPinValue(`${comp.id}_pvref`, 1.0);
            const ifdPu = this.readPinValue(`${comp.id}_pifd`, 1.0);
            const vPss = this.readPinValue(`${comp.id}_pvpss`, 0.0);
            if (state && typeof state.step === 'function') {
              const efd = state.step(vtPu, vRef, ifdPu, vPss, dt);
              this.pinValues.set(`${comp.id}_pefd`, efd);
            }
            break;
          }

          case COMPONENT_TYPES.PSS_PSS1A: {
            const inSig = this.readPinValue(`${comp.id}_pin`, 0.0);
            if (state instanceof PSS1AStabilizer) {
              const vst = state.step(inSig, dt);
              this.pinValues.set(`${comp.id}_pvst`, vst);
            }
            break;
          }

          case COMPONENT_TYPES.PSS_PSS2B: {
            const wPu = this.readPinValue(`${comp.id}_pw`, 1.0);
            const pePu = this.readPinValue(`${comp.id}_ppe`, 0.8);
            if (state instanceof PSS2BStabilizer) {
              const vst = state.step(wPu, pePu, dt);
              this.pinValues.set(`${comp.id}_pvst`, vst);
            }
            break;
          }

          case COMPONENT_TYPES.WIND_TURBINE_AERO: {
            const vWind = this.readPinValue(`${comp.id}_pvwind`, 10.0);
            const wRotor = this.readPinValue(`${comp.id}_pwrotor`, 1.2);
            if (state instanceof WindTurbineAerodynamics) {
              const st = state.step(vWind, wRotor, dt);
              this.pinValues.set(`${comp.id}_ppaero`, st.PaeroMW);
              this.pinValues.set(`${comp.id}_ptaero`, st.TaeroMNm);
              this.pinValues.set(`${comp.id}_ppitch`, st.pitchAngleDeg);
              this.pinValues.set(`${comp.id}_pthrust`, st.thrustKN);
              this.pinValues.set(`${comp.id}_pmppt_torque`, st.mpptTorqueDemandMNm);
            }
            break;
          }
        }
      }
    }
  }
}
