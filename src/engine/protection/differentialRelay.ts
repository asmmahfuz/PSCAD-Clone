/**
 * PSCAD Modern - ANSI 87T Transformer & 87L Line Differential Protection Relay
 * 
 * Features:
 * - Dual-Slope Percentage Restraint Characteristic:
 *     I_op  = |I_1 + I_2| (vectorial sum per phase)
 *     I_res = (|I_1| + |I_2|) / 2 (or max(|I_1|, |I_2|))
 *     Trip boundary: I_pickup, Slope 1 (S1), Slope 2 (S2), Knee Breakpoint (I_knee)
 * - Harmonic Restraint & Blocking:
 *     2nd Harmonic Inrush Restraint: I2 / I1 >= 15% blocks trip
 *     5th Harmonic Overexcitation Restraint: I5 / I1 >= 35% blocks trip
 * - Unrestrained Instantaneous High-Set Element (I_op >= I_unrestrained)
 * - Vector Group Phase Shift & Zero-Sequence Current Elimination:
 *     Y-Y, Y-d1 (-30°), Y-d11 (+30°), D-y1, D-y11, D-d0
 */

import { type Complex, cMag, cAdd, cSub, cScale } from './distanceRelay';

export type VectorGroup = 'Yy0' | 'Yd1' | 'Yd11' | 'Dy1' | 'Dy11' | 'Dd0';

export interface DifferentialRelaySettings {
  // Pickup and Slopes (in per-unit or Amperes)
  pickupCurrent: number; // I_pickup (e.g. 0.2 to 0.4 pu)
  slope1: number; // S1 (e.g. 0.2 to 0.35, 20% - 35%)
  slope2: number; // S2 (e.g. 0.5 to 0.8, 50% - 80%)
  kneeCurrent: number; // I_knee (e.g. 1.5 to 2.5 pu)
  unrestrainedPickup: number; // Instantaneous differential pickup (e.g. 8.0 pu)

  // Harmonic Restraints
  enable2ndHarmonicRestraint: boolean;
  ratio2ndHarmonic: number; // Default 0.15 (15% inrush threshold)
  enable5thHarmonicRestraint: boolean;
  ratio5thHarmonic: number; // Default 0.35 (35% overexcitation threshold)
  crossPhaseHarmonicBlocking?: boolean; // If true, inrush on any phase blocks all phases

  // Transformer Configuration
  vectorGroup: VectorGroup;
  ctRatioPrimary: number; // CTR1
  ctRatioSecondary: number; // CTR2
  zeroSequenceElimination: boolean; // Zero sequence filtering on Wye side
}

export interface PhaseDiffResult {
  phase: 'A' | 'B' | 'C';
  i1: Complex;
  i2: Complex;
  iOp: number;
  iRes: number;
  iOpTripThreshold: number;
  ratio2nd: number;
  ratio5th: number;
  is2ndBlocked: boolean;
  is5thBlocked: boolean;
  isRestrainedTrip: boolean;
  isUnrestrainedTrip: boolean;
}

export interface DifferentialRelayState {
  isTripped: boolean;
  tripMode: 'RESTRAINED' | 'UNRESTRAINED' | 'NONE';
  trippedPhases: { A: boolean; B: boolean; C: boolean };
  phaseResults: {
    A: PhaseDiffResult;
    B: PhaseDiffResult;
    C: PhaseDiffResult;
  };
}

export class DifferentialRelay {
  public id: string;
  public settings: DifferentialRelaySettings;
  public state: DifferentialRelayState;

  constructor(id: string, settings?: Partial<DifferentialRelaySettings>) {
    this.id = id;
    this.settings = {
      pickupCurrent: settings?.pickupCurrent ?? 0.3,
      slope1: settings?.slope1 ?? 0.25,
      slope2: settings?.slope2 ?? 0.65,
      kneeCurrent: settings?.kneeCurrent ?? 2.0,
      unrestrainedPickup: settings?.unrestrainedPickup ?? 8.0,
      enable2ndHarmonicRestraint: settings?.enable2ndHarmonicRestraint ?? true,
      ratio2ndHarmonic: settings?.ratio2ndHarmonic ?? 0.15,
      enable5thHarmonicRestraint: settings?.enable5thHarmonicRestraint ?? true,
      ratio5thHarmonic: settings?.ratio5thHarmonic ?? 0.35,
      crossPhaseHarmonicBlocking: settings?.crossPhaseHarmonicBlocking ?? true,
      vectorGroup: settings?.vectorGroup || 'Yd1',
      ctRatioPrimary: settings?.ctRatioPrimary ?? 1.0,
      ctRatioSecondary: settings?.ctRatioSecondary ?? 1.0,
      zeroSequenceElimination: settings?.zeroSequenceElimination ?? true,
    };

    this.state = this.createInitialState();
  }

  private createInitialState(): DifferentialRelayState {
    const emptyPhase = (p: 'A' | 'B' | 'C'): PhaseDiffResult => ({
      phase: p,
      i1: { r: 0, i: 0 },
      i2: { r: 0, i: 0 },
      iOp: 0,
      iRes: 0,
      iOpTripThreshold: this.settings.pickupCurrent,
      ratio2nd: 0,
      ratio5th: 0,
      is2ndBlocked: false,
      is5thBlocked: false,
      isRestrainedTrip: false,
      isUnrestrainedTrip: false,
    });

    return {
      isTripped: false,
      tripMode: 'NONE',
      trippedPhases: { A: false, B: false, C: false },
      phaseResults: {
        A: emptyPhase('A'),
        B: emptyPhase('B'),
        C: emptyPhase('C'),
      },
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Calculates operating threshold I_op,trip as a function of restraint current I_res.
   */
  public calculateRestraintThreshold(iRes: number): number {
    const I_pu = this.settings.pickupCurrent;
    const S1 = this.settings.slope1;
    const S2 = this.settings.slope2;
    const I_knee = this.settings.kneeCurrent;

    if (iRes <= I_knee) {
      return I_pu + S1 * iRes;
    } else {
      return I_pu + S1 * I_knee + S2 * (iRes - I_knee);
    }
  }

  /**
   * Applies vector group phase compensation and zero-sequence elimination to secondary currents.
   */
  public applyVectorCompensation(
    i2a: Complex,
    i2b: Complex,
    i2c: Complex
  ): { a: Complex; b: Complex; c: Complex } {
    let a = i2a;
    let b = i2b;
    let c = i2c;

    // Vector group rotation:
    // Yd1 (-30° lag on delta side): multiply by e^(+j30°) = (sqrt(3)/2 + j 0.5) / sqrt(3) or (ia - ic)/sqrt(3)
    const sqrt3 = Math.sqrt(3);
    switch (this.settings.vectorGroup) {
      case 'Yd1': {
        // Delta lags by 30° -> multiply by (ia - ic)/sqrt(3)
        a = cScale(cSub(i2a, i2c), 1.0 / sqrt3);
        b = cScale(cSub(i2b, i2a), 1.0 / sqrt3);
        c = cScale(cSub(i2c, i2b), 1.0 / sqrt3);
        break;
      }
      case 'Yd11': {
        // Delta leads by 30° -> multiply by (ia - ib)/sqrt(3)
        a = cScale(cSub(i2a, i2b), 1.0 / sqrt3);
        b = cScale(cSub(i2b, i2c), 1.0 / sqrt3);
        c = cScale(cSub(i2c, i2a), 1.0 / sqrt3);
        break;
      }
      case 'Dy1': {
        a = cScale(cSub(i2a, i2b), 1.0 / sqrt3);
        b = cScale(cSub(i2b, i2c), 1.0 / sqrt3);
        c = cScale(cSub(i2c, i2a), 1.0 / sqrt3);
        break;
      }
      case 'Dy11': {
        a = cScale(cSub(i2a, i2c), 1.0 / sqrt3);
        b = cScale(cSub(i2b, i2a), 1.0 / sqrt3);
        c = cScale(cSub(i2c, i2b), 1.0 / sqrt3);
        break;
      }
      case 'Yy0':
      case 'Dd0':
      default:
        // Direct
        break;
    }

    // Zero-sequence elimination: subtract I0 = (a + b + c) / 3
    if (this.settings.zeroSequenceElimination) {
      const i0 = cScale(cAdd(cAdd(a, b), c), 1.0 / 3.0);
      a = cSub(a, i0);
      b = cSub(b, i0);
      c = cSub(c, i0);
    }

    return { a, b, c };
  }

  /**
   * Main step for differential relay.
   * @param primaryCurrents Fundamental 3-phase currents entering transformer primary side (A, B, C)
   * @param secondaryCurrents Fundamental 3-phase currents leaving transformer secondary side (A, B, C)
   * @param harmonics2nd 2nd harmonic magnitudes for inrush restraint (A, B, C)
   * @param harmonics5th 5th harmonic magnitudes for overexcitation restraint (A, B, C)
   */
  public step(
    primaryCurrents: { a: Complex; b: Complex; c: Complex },
    secondaryCurrents: { a: Complex; b: Complex; c: Complex },
    harmonics2nd?: { a: number; b: number; c: number },
    harmonics5th?: { a: number; b: number; c: number }
  ): DifferentialRelayState {
    const compSec = this.applyVectorCompensation(
      secondaryCurrents.a,
      secondaryCurrents.b,
      secondaryCurrents.c
    );

    const phases: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    const pI1 = [primaryCurrents.a, primaryCurrents.b, primaryCurrents.c];
    const pI2 = [compSec.a, compSec.b, compSec.c];
    const h2 = harmonics2nd ? [harmonics2nd.a, harmonics2nd.b, harmonics2nd.c] : [0, 0, 0];
    const h5 = harmonics5th ? [harmonics5th.a, harmonics5th.b, harmonics5th.c] : [0, 0, 0];

    // Compute harmonic ratios across all phases
    const ratios2: number[] = [];
    const ratios5: number[] = [];
    let anyCross2ndBlocked = false;
    let anyCross5thBlocked = false;

    for (let idx = 0; idx < 3; idx++) {
      const fundMag = Math.max(1e-6, (cMag(pI1[idx]) + cMag(pI2[idx])) / 2.0);
      const r2 = h2[idx] / fundMag;
      const r5 = h5[idx] / fundMag;
      ratios2.push(r2);
      ratios5.push(r5);

      if (this.settings.enable2ndHarmonicRestraint && r2 >= this.settings.ratio2ndHarmonic) {
        anyCross2ndBlocked = true;
      }
      if (this.settings.enable5thHarmonicRestraint && r5 >= this.settings.ratio5thHarmonic) {
        anyCross5thBlocked = true;
      }
    }

    const useCross = this.settings.crossPhaseHarmonicBlocking ?? true;

    let anyTrip = false;
    let tripMode: 'RESTRAINED' | 'UNRESTRAINED' | 'NONE' = 'NONE';
    const trippedPhases = { A: false, B: false, C: false };

    for (let idx = 0; idx < 3; idx++) {
      const phase = phases[idx];
      const i1 = pI1[idx];
      const i2 = pI2[idx];

      const iOp = cMag(cAdd(i1, i2));
      const iRes = (cMag(i1) + cMag(i2)) / 2.0;

      const threshold = this.calculateRestraintThreshold(iRes);
      const ratio2 = ratios2[idx];
      const ratio5 = ratios5[idx];

      const is2ndBlocked = useCross
        ? anyCross2ndBlocked
        : this.settings.enable2ndHarmonicRestraint && ratio2 >= this.settings.ratio2ndHarmonic;
      const is5thBlocked = useCross
        ? anyCross5thBlocked
        : this.settings.enable5thHarmonicRestraint && ratio5 >= this.settings.ratio5thHarmonic;
      const isBlocked = is2ndBlocked || is5thBlocked;

      const isUnrestrained = iOp >= this.settings.unrestrainedPickup;
      const isRestrained = !isBlocked && iOp >= threshold;

      if (isUnrestrained) {
        anyTrip = true;
        tripMode = 'UNRESTRAINED';
        trippedPhases[phase] = true;
      } else if (isRestrained) {
        anyTrip = true;
        if (tripMode !== 'UNRESTRAINED') tripMode = 'RESTRAINED';
        trippedPhases[phase] = true;
      }

      this.state.phaseResults[phase] = {
        phase,
        i1,
        i2,
        iOp,
        iRes,
        iOpTripThreshold: threshold,
        ratio2nd: ratio2,
        ratio5th: ratio5,
        is2ndBlocked,
        is5thBlocked,
        isRestrainedTrip: isRestrained,
        isUnrestrainedTrip: isUnrestrained,
      };
    }

    this.state.isTripped = anyTrip;
    this.state.tripMode = tripMode;
    this.state.trippedPhases = trippedPhases;

    return { ...this.state };
  }
}
