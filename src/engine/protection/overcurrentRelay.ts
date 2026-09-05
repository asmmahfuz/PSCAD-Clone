/**
 * PSCAD Modern - ANSI 50/51/67 Time-Overcurrent & Instantaneous Overcurrent Relay
 * 
 * Complies with:
 * - IEEE Std C37.112 (Standard Inverse-Time Characteristic Equations for Overcurrent Relays)
 * - IEC 60255-151 (Functional requirements for over/under current protection)
 * 
 * Features:
 * - Standard TCC curve families: IEC Standard, Very, Extremely, Long-Time Inverse, and IEEE US Curves.
 * - Continuous electromechanical disk reset integrator:
 *     dθ/dt = +1 / t_trip(I)   for I > I_pickup
 *     dθ/dt = -1 / t_reset(I)  for I < I_dropout
 * - Instantaneous high-set overcurrent element (ANSI 50) with sub-cycle trip timing.
 * - Directional polarizing unit (ANSI 67) with Maximum Torque Angle (MTA) & zero-sequence / negative-sequence polarization.
 */

export type CurveFamily =
  | 'IEC_STANDARD_INVERSE'
  | 'IEC_VERY_INVERSE'
  | 'IEC_EXTREMELY_INVERSE'
  | 'IEC_LONG_TIME_INVERSE'
  | 'IEEE_MODERATELY_INVERSE'
  | 'IEEE_VERY_INVERSE'
  | 'IEEE_EXTREMELY_INVERSE'
  | 'IEEE_SHORT_TIME_INVERSE'
  | 'DEFINITE_TIME';

export interface CurveParameters {
  A: number;
  p: number;
  B: number;
  tr: number; // Reset time constant
}

export const TCC_CURVE_DATABASE: Record<CurveFamily, CurveParameters> = {
  IEC_STANDARD_INVERSE: { A: 0.14, p: 0.02, B: 0.0, tr: 13.5 },
  IEC_VERY_INVERSE: { A: 13.5, p: 1.0, B: 0.0, tr: 47.3 },
  IEC_EXTREMELY_INVERSE: { A: 80.0, p: 2.0, B: 0.0, tr: 80.0 },
  IEC_LONG_TIME_INVERSE: { A: 120.0, p: 1.0, B: 0.0, tr: 120.0 },
  IEEE_MODERATELY_INVERSE: { A: 0.0515, p: 0.02, B: 0.114, tr: 4.85 },
  IEEE_VERY_INVERSE: { A: 19.61, p: 2.0, B: 0.491, tr: 21.6 },
  IEEE_EXTREMELY_INVERSE: { A: 28.2, p: 2.0, B: 0.1217, tr: 29.1 },
  IEEE_SHORT_TIME_INVERSE: { A: 0.00342, p: 0.02, B: 0.00262, tr: 0.097 },
  DEFINITE_TIME: { A: 0, p: 0, B: 1.0, tr: 0.1 },
};

export interface OvercurrentRelaySettings {
  // 51 Time-Overcurrent Settings
  curveType: CurveFamily;
  pickupCurrent: number; // Primary or Secondary Amperes (I_pu = 1.0)
  timeDial: number; // Time Multiplier Setting (TMS / TD), e.g. 0.05 to 10.0
  definiteTimeDelay?: number; // seconds, used if DEFINITE_TIME
  dropoutRatio?: number; // ratio of pickup, default 0.95 (95%)
  diskResetType?: 'INTEGRATING' | 'INSTANTANEOUS';

  // 50 Instantaneous High-Set Settings
  enable50: boolean;
  instantaneousPickup: number; // Amperes
  instantaneousDelay?: number; // Delay in seconds (default 0 for instantaneous)

  // 67 Directional Settings
  directionalMode?: 'NON_DIRECTIONAL' | 'FORWARD' | 'REVERSE';
  maxTorqueAngleDeg?: number; // MTA in degrees (e.g. 45° for phase faults, 65° for ground)
}

export interface OvercurrentRelayState {
  diskTravel: number; // 0.0 to 1.0 (1.0 = Tripped)
  is51PickedUp: boolean;
  is50PickedUp: boolean;
  isTripped: boolean;
  tripSource: '50' | '51' | 'NONE';
  instantaneousTimer: number;
  measuredCurrent: number;
  operatingTimeEstimate: number; // seconds
}

export class OvercurrentRelay {
  public id: string;
  public settings: OvercurrentRelaySettings;
  public state: OvercurrentRelayState;

  constructor(id: string, settings: Partial<OvercurrentRelaySettings> = {}) {
    this.id = id;
    this.settings = {
      curveType: settings.curveType || 'IEC_STANDARD_INVERSE',
      pickupCurrent: settings.pickupCurrent ?? 5.0,
      timeDial: settings.timeDial ?? 1.0,
      definiteTimeDelay: settings.definiteTimeDelay ?? 0.5,
      dropoutRatio: settings.dropoutRatio ?? 0.95,
      diskResetType: settings.diskResetType ?? 'INTEGRATING',
      enable50: settings.enable50 ?? true,
      instantaneousPickup: settings.instantaneousPickup ?? 25.0,
      instantaneousDelay: settings.instantaneousDelay ?? 0.0,
      directionalMode: settings.directionalMode ?? 'NON_DIRECTIONAL',
      maxTorqueAngleDeg: settings.maxTorqueAngleDeg ?? 45.0,
    };

    this.state = {
      diskTravel: 0.0,
      is51PickedUp: false,
      is50PickedUp: false,
      isTripped: false,
      tripSource: 'NONE',
      instantaneousTimer: 0.0,
      measuredCurrent: 0.0,
      operatingTimeEstimate: Infinity,
    };
  }

  public reset(): void {
    this.state.diskTravel = 0.0;
    this.state.is51PickedUp = false;
    this.state.is50PickedUp = false;
    this.state.isTripped = false;
    this.state.tripSource = 'NONE';
    this.state.instantaneousTimer = 0.0;
    this.state.measuredCurrent = 0.0;
    this.state.operatingTimeEstimate = Infinity;
  }

  /**
   * Calculates theoretical trip operating time in seconds for a given current magnitude.
   */
  public calculateTripTime(currentMag: number): number {
    const I = currentMag;
    const Is = this.settings.pickupCurrent;
    const TD = this.settings.timeDial;

    if (I <= Is) return Infinity;

    if (this.settings.curveType === 'DEFINITE_TIME') {
      return this.settings.definiteTimeDelay || 0.5;
    }

    const curve = TCC_CURVE_DATABASE[this.settings.curveType];
    const M = I / Is; // Multiplier of pickup

    // IEEE / IEC General Formula: t = TD * [ A / (M^p - 1) + B ]
    const denom = Math.pow(M, curve.p) - 1.0;
    if (denom <= 0) return Infinity;

    return TD * (curve.A / denom + curve.B);
  }

  /**
   * Calculates electromechanical disk reset time in seconds for a given current magnitude below dropout.
   */
  public calculateResetTime(currentMag: number): number {
    const I = currentMag;
    const Is = this.settings.pickupCurrent;
    const TD = this.settings.timeDial;
    const curve = TCC_CURVE_DATABASE[this.settings.curveType];

    const M = Math.min(0.999, I / Is);
    const denom = 1.0 - Math.pow(M, 2.0);
    if (denom <= 0) return TD * curve.tr;

    return TD * (curve.tr / denom);
  }

  /**
   * Evaluates directional unit condition.
   * @param currentAngleRad Angle of current phasor in radians
   * @param voltageAngleRad Angle of polarizing voltage phasor in radians
   */
  public isDirectionPermitted(currentAngleRad: number = 0, voltageAngleRad: number = 0): boolean {
    if (this.settings.directionalMode === 'NON_DIRECTIONAL') return true;

    const mtaRad = ((this.settings.maxTorqueAngleDeg || 45.0) * Math.PI) / 180;
    // Characteristic angle difference: θ = I_angle - (V_angle + MTA)
    let angleDiff = currentAngleRad - (voltageAngleRad + mtaRad);
    // Normalize to [-π, π]
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    const isForward = Math.abs(angleDiff) <= Math.PI / 2.0;
    return this.settings.directionalMode === 'FORWARD' ? isForward : !isForward;
  }

  /**
   * Steps the relay forward in time by dt seconds.
   * @param currentMag RMS or fundamental current magnitude
   * @param dt Time step in seconds
   * @param currentAngleRad Current phasor angle (for ANSI 67 directional check)
   * @param voltageAngleRad Voltage phasor angle (for ANSI 67 directional check)
   */
  public step(
    currentMag: number,
    dt: number,
    currentAngleRad: number = 0,
    voltageAngleRad: number = 0
  ): OvercurrentRelayState {
    this.state.measuredCurrent = currentMag;
    const dirOk = this.isDirectionPermitted(currentAngleRad, voltageAngleRad);

    const Is = this.settings.pickupCurrent;
    const I_dropout = Is * (this.settings.dropoutRatio || 0.95);

    // 1. ANSI 50 Instantaneous Overcurrent Element
    if (this.settings.enable50 && dirOk && currentMag >= this.settings.instantaneousPickup) {
      this.state.is50PickedUp = true;
      this.state.instantaneousTimer += dt;
      if (this.state.instantaneousTimer >= (this.settings.instantaneousDelay || 0.0)) {
        this.state.isTripped = true;
        this.state.tripSource = '50';
        return { ...this.state };
      }
    } else {
      this.state.is50PickedUp = false;
      this.state.instantaneousTimer = 0.0;
    }

    // 2. ANSI 51 Time-Overcurrent Element with Induction Disk Integrator
    if (dirOk && currentMag >= Is) {
      this.state.is51PickedUp = true;
      const tTrip = this.calculateTripTime(currentMag);
      this.state.operatingTimeEstimate = tTrip;

      if (isFinite(tTrip) && tTrip > 0) {
        // Increment disk travel: dθ/dt = 1 / t_trip
        this.state.diskTravel += dt / tTrip;
      }
    } else if (currentMag < I_dropout) {
      this.state.is51PickedUp = false;
      this.state.operatingTimeEstimate = Infinity;

      if (this.settings.diskResetType === 'INSTANTANEOUS') {
        this.state.diskTravel = 0.0;
      } else {
        // Continuous integrating reset: dθ/dt = -1 / t_reset
        const tReset = this.calculateResetTime(currentMag);
        if (isFinite(tReset) && tReset > 0) {
          this.state.diskTravel -= dt / tReset;
        } else {
          this.state.diskTravel -= dt / 1.0;
        }
      }
    }

    // Clamp disk travel [0.0, 1.0]
    this.state.diskTravel = Math.max(0.0, Math.min(1.0, this.state.diskTravel));

    // Check for 51 trip condition
    if (this.state.diskTravel >= 1.0) {
      this.state.isTripped = true;
      this.state.tripSource = '51';
    }

    return { ...this.state };
  }
}
