/**
 * PSCAD Modern - ANSI 81O/81U, 81R (ROCOF), ANSI 40 (Loss of Field), & ANSI 78 (Out-of-Step)
 * 
 * Features:
 * - ANSI 81U/81O Multi-Stage Under/Over Frequency Protection with customizable delay timers.
 * - ANSI 81R Rate of Change of Frequency (ROCOF df/dt) with windowed filtering and voltage interlock.
 * - ANSI 40 Loss of Excitation (LOE) Dual Offset-Mho Relay in generator R-X plane.
 * - ANSI 78 Out-of-Step / Power Swing Detection with Double Blinders (PSB vs OST).
 */

import { type Complex, cMag, cSub } from './distanceRelay';

export interface FrequencyStage {
  enabled: boolean;
  frequencyHz: number; // Threshold frequency
  timeDelaySec: number; // Trip delay timer
}

export interface GeneratorProtectionSettings {
  // ANSI 81U Under-Frequency Stages
  underFreqStages: FrequencyStage[];
  // ANSI 81O Over-Frequency Stages
  overFreqStages: FrequencyStage[];

  // ANSI 81R ROCOF
  enableRocof: boolean;
  rocofThresholdHzPerSec: number; // e.g. 1.0 Hz/s
  rocofTimeDelaySec: number; // e.g. 0.05 s
  rocofUnderVoltageInterlockPu: number; // e.g. 0.8 pu (minimum voltage for ROCOF)

  // ANSI 40 Loss of Field (LOE) Settings (Per-unit on generator base)
  enableLossOfField: boolean;
  xd: number; // Synchronous d-axis reactance Xd (e.g. 1.8 pu)
  xdPrime: number; // Transient d-axis reactance X'd (e.g. 0.3 pu)
  circle1DelaySec: number; // Fast small zone timer (e.g. 0.1 s)
  circle2DelaySec: number; // Large zone timer (e.g. 0.75 s)

  // ANSI 78 Power Swing / Out-of-Step (OST / PSB) Settings
  enablePowerSwing: boolean;
  outerBlinderR: number; // Outer blinder resistive reach (Ohms / pu)
  innerBlinderR: number; // Inner blinder resistive reach (Ohms / pu)
  powerSwingDeltaTimeThresholdSec: number; // e.g. 0.035 s (35 ms)
  enableOutOfStepTrip: boolean; // OST tripping on pole slip
}

export interface GeneratorProtectionState {
  isTripped: boolean;
  tripReasons: string[];

  // Frequency Telemetry
  frequencyHz: number;
  dfdtHzPerSec: number;
  underFreqActive: boolean;
  overFreqActive: boolean;
  rocofActive: boolean;

  // ANSI 40 Telemetry
  isLoeCircle1Inside: boolean;
  isLoeCircle2Inside: boolean;
  loeCircle1Timer: number;
  loeCircle2Timer: number;
  loeTripped: boolean;

  // ANSI 78 Telemetry
  powerSwingActive: boolean; // PSB active
  outOfStepTripped: boolean; // OST tripped
  powerSwingTransitTimer: number;
  inOuterBlinder: boolean;
  inInnerBlinder: boolean;
}

export class GeneratorProtectionRelay {
  public id: string;
  public settings: GeneratorProtectionSettings;
  public state: GeneratorProtectionState;

  private prevFreq: number = 60.0;
  private underFreqTimers: number[] = [];
  private overFreqTimers: number[] = [];
  private rocofTimer: number = 0.0;

  constructor(id: string, settings?: Partial<GeneratorProtectionSettings>) {
    this.id = id;
    this.settings = {
      underFreqStages: settings?.underFreqStages || [
        { enabled: true, frequencyHz: 59.3, timeDelaySec: 0.5 },
        { enabled: true, frequencyHz: 58.5, timeDelaySec: 0.2 },
        { enabled: true, frequencyHz: 57.5, timeDelaySec: 0.05 },
      ],
      overFreqStages: settings?.overFreqStages || [
        { enabled: true, frequencyHz: 60.5, timeDelaySec: 2.0 },
        { enabled: true, frequencyHz: 61.5, timeDelaySec: 0.2 },
      ],
      enableRocof: settings?.enableRocof ?? true,
      rocofThresholdHzPerSec: settings?.rocofThresholdHzPerSec ?? 1.2,
      rocofTimeDelaySec: settings?.rocofTimeDelaySec ?? 0.05,
      rocofUnderVoltageInterlockPu: settings?.rocofUnderVoltageInterlockPu ?? 0.8,
      enableLossOfField: settings?.enableLossOfField ?? true,
      xd: settings?.xd ?? 1.8,
      xdPrime: settings?.xdPrime ?? 0.3,
      circle1DelaySec: settings?.circle1DelaySec ?? 0.1,
      circle2DelaySec: settings?.circle2DelaySec ?? 0.75,
      enablePowerSwing: settings?.enablePowerSwing ?? true,
      outerBlinderR: settings?.outerBlinderR ?? 12.0,
      innerBlinderR: settings?.innerBlinderR ?? 6.0,
      powerSwingDeltaTimeThresholdSec: settings?.powerSwingDeltaTimeThresholdSec ?? 0.035,
      enableOutOfStepTrip: settings?.enableOutOfStepTrip ?? true,
    };

    this.underFreqTimers = new Array(this.settings.underFreqStages.length).fill(0);
    this.overFreqTimers = new Array(this.settings.overFreqStages.length).fill(0);

    this.state = this.createInitialState();
  }

  private createInitialState(): GeneratorProtectionState {
    return {
      isTripped: false,
      tripReasons: [],
      frequencyHz: 60.0,
      dfdtHzPerSec: 0.0,
      underFreqActive: false,
      overFreqActive: false,
      rocofActive: false,
      isLoeCircle1Inside: false,
      isLoeCircle2Inside: false,
      loeCircle1Timer: 0.0,
      loeCircle2Timer: 0.0,
      loeTripped: false,
      powerSwingActive: false,
      outOfStepTripped: false,
      powerSwingTransitTimer: 0.0,
      inOuterBlinder: false,
      inInnerBlinder: false,
    };
  }

  public reset(): void {
    this.underFreqTimers.fill(0);
    this.overFreqTimers.fill(0);
    this.rocofTimer = 0.0;
    this.prevFreq = 60.0;
    this.state = this.createInitialState();
  }

  /**
   * Evaluates ANSI 40 Loss of Field in the generator R-X impedance plane.
   * Circle 1: Center = -(X'd/2 + 0.5), Diameter = 1.0 pu
   * Circle 2: Center = -(X'd/2 + Xd/2), Diameter = Xd pu
   */
  public evaluateLossOfField(zGen: Complex, dt: number): void {
    if (!this.settings.enableLossOfField) return;

    const xd = this.settings.xd;
    const xdPrime = this.settings.xdPrime;

    // Circle 1: Center (0, -(xdPrime/2 + 0.5)), Radius = 0.5
    const center1: Complex = { r: 0, i: -(xdPrime / 2.0 + 0.5) };
    const radius1 = 0.5;
    const inside1 = cMag(cSub(zGen, center1)) <= radius1;

    // Circle 2: Center (0, -(xdPrime/2 + xd/2)), Radius = xd/2
    const center2: Complex = { r: 0, i: -(xdPrime / 2.0 + xd / 2.0) };
    const radius2 = xd / 2.0;
    const inside2 = cMag(cSub(zGen, center2)) <= radius2;

    this.state.isLoeCircle1Inside = inside1;
    this.state.isLoeCircle2Inside = inside2;

    if (inside1) {
      this.state.loeCircle1Timer += dt;
      if (this.state.loeCircle1Timer >= this.settings.circle1DelaySec) {
        this.state.isTripped = true;
        this.state.loeTripped = true;
        if (!this.state.tripReasons.includes('ANSI_40_LOE_CIRCLE_1')) {
          this.state.tripReasons.push('ANSI_40_LOE_CIRCLE_1');
        }
      }
    } else {
      this.state.loeCircle1Timer = 0;
    }

    if (inside2) {
      this.state.loeCircle2Timer += dt;
      if (this.state.loeCircle2Timer >= this.settings.circle2DelaySec) {
        this.state.isTripped = true;
        this.state.loeTripped = true;
        if (!this.state.tripReasons.includes('ANSI_40_LOE_CIRCLE_2')) {
          this.state.tripReasons.push('ANSI_40_LOE_CIRCLE_2');
        }
      }
    } else {
      this.state.loeCircle2Timer = 0;
    }
  }

  /**
   * Evaluates ANSI 78 Out-of-Step / Power Swing with double blinders.
   */
  public evaluatePowerSwing(zApp: Complex, dt: number): void {
    if (!this.settings.enablePowerSwing) return;

    const absR = Math.abs(zApp.r);
    const inOuter = absR <= this.settings.outerBlinderR;
    const inInner = absR <= this.settings.innerBlinderR;

    this.state.inOuterBlinder = inOuter;
    this.state.inInnerBlinder = inInner;

    if (inOuter && !inInner) {
      // Trajectory is in transit band between outer and inner blinder
      this.state.powerSwingTransitTimer += dt;
    } else if (inInner) {
      if (this.state.powerSwingTransitTimer >= this.settings.powerSwingDeltaTimeThresholdSec) {
        // Slow movement between blinders -> Power Swing detected!
        this.state.powerSwingActive = true;

        if (this.settings.enableOutOfStepTrip && zApp.i < 0) {
          // Pole slip through reverse plane -> Out of step trip
          this.state.isTripped = true;
          this.state.outOfStepTripped = true;
          if (!this.state.tripReasons.includes('ANSI_78_OUT_OF_STEP_TRIP')) {
            this.state.tripReasons.push('ANSI_78_OUT_OF_STEP_TRIP');
          }
        }
      } else {
        // Instantaneous jump -> Line fault, not power swing
        this.state.powerSwingActive = false;
      }
    } else {
      // Outside outer blinder -> Reset
      this.state.powerSwingTransitTimer = 0;
      this.state.powerSwingActive = false;
    }
  }

  /**
   * Main step for generator and frequency protection relay.
   * @param measuredFreq Instantaneous grid / machine electrical frequency in Hz
   * @param voltagePu Positive-sequence terminal voltage magnitude in pu
   * @param zGen Generator terminal apparent impedance Z = R + jX in pu
   * @param dt Time step in seconds
   */
  public step(
    measuredFreq: number,
    voltagePu: number,
    zGen: Complex,
    dt: number
  ): GeneratorProtectionState {
    this.state.frequencyHz = measuredFreq;

    // 1. Calculate ROCOF df/dt
    const df = measuredFreq - this.prevFreq;
    const dfdt = dt > 0 ? df / dt : 0;
    this.prevFreq = measuredFreq;
    this.state.dfdtHzPerSec = dfdt;

    // 2. ANSI 81U Under-Frequency Stages
    let underActive = false;
    for (let i = 0; i < this.settings.underFreqStages.length; i++) {
      const stage = this.settings.underFreqStages[i];
      if (stage.enabled && measuredFreq <= stage.frequencyHz) {
        underActive = true;
        this.underFreqTimers[i] += dt;
        if (this.underFreqTimers[i] >= stage.timeDelaySec) {
          this.state.isTripped = true;
          const tag = `ANSI_81U_STAGE_${i + 1}`;
          if (!this.state.tripReasons.includes(tag)) this.state.tripReasons.push(tag);
        }
      } else {
        this.underFreqTimers[i] = 0;
      }
    }
    this.state.underFreqActive = underActive;

    // 3. ANSI 81O Over-Frequency Stages
    let overActive = false;
    for (let i = 0; i < this.settings.overFreqStages.length; i++) {
      const stage = this.settings.overFreqStages[i];
      if (stage.enabled && measuredFreq >= stage.frequencyHz) {
        overActive = true;
        this.overFreqTimers[i] += dt;
        if (this.overFreqTimers[i] >= stage.timeDelaySec) {
          this.state.isTripped = true;
          const tag = `ANSI_81O_STAGE_${i + 1}`;
          if (!this.state.tripReasons.includes(tag)) this.state.tripReasons.push(tag);
        }
      } else {
        this.overFreqTimers[i] = 0;
      }
    }
    this.state.overFreqActive = overActive;

    // 4. ANSI 81R ROCOF
    if (
      this.settings.enableRocof &&
      voltagePu >= this.settings.rocofUnderVoltageInterlockPu &&
      Math.abs(dfdt) >= this.settings.rocofThresholdHzPerSec
    ) {
      this.state.rocofActive = true;
      this.rocofTimer += dt;
      if (this.rocofTimer >= this.settings.rocofTimeDelaySec) {
        this.state.isTripped = true;
        if (!this.state.tripReasons.includes('ANSI_81R_ROCOF_TRIP')) {
          this.state.tripReasons.push('ANSI_81R_ROCOF_TRIP');
        }
      }
    } else {
      this.state.rocofActive = false;
      this.rocofTimer = 0;
    }

    // 5. ANSI 40 Loss of Field (LOE)
    this.evaluateLossOfField(zGen, dt);

    // 6. ANSI 78 Power Swing & Out of Step
    this.evaluatePowerSwing(zGen, dt);

    return { ...this.state };
  }
}
