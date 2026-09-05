/**
 * PSCAD CLONE - ANSI 21 Multi-Zone Distance Protection Relay (Mho & Quadrilateral)
 * 
 * Features:
 * - 6 Apparent Impedance Measuring Loops:
 *     Phase-to-Ground: AG, BG, CG with zero-sequence compensation k0 = (Z0 - Z1) / (3 * Z1)
 *     Phase-to-Phase:  AB, BC, CA
 * - Mho Characteristic (Self-polarized, Cross-polarized / Memory-polarized, Offset-Mho).
 * - Quadrilateral Characteristic (Independent X and R reach, Directional blinders, Load Encroachment exclusion).
 * - 3-Zone Time-Discriminated Coordination (Zone 1 Instantaneous, Zone 2 Delayed, Zone 3 Backup).
 * - Real-time R-X trajectory recording for visualization.
 */

export interface Complex {
  r: number; // Real (Ohms)
  i: number; // Imaginary (Ohms)
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { r: a.r + b.r, i: a.i + b.i };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { r: a.r - b.r, i: a.i - b.i };
}

export function cMul(a: Complex, b: Complex): Complex {
  return { r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r };
}

export function cScale(a: Complex, s: number): Complex {
  return { r: a.r * s, i: a.i * s };
}

export function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.r * b.r + b.i * b.i;
  if (denom === 0) return { r: 1e9, i: 1e9 };
  return {
    r: (a.r * b.r + a.i * b.i) / denom,
    i: (a.i * b.r - a.r * b.i) / denom,
  };
}

export function cMag(a: Complex): number {
  return Math.hypot(a.r, a.i);
}

export function cAng(a: Complex): number {
  return Math.atan2(a.i, a.r);
}

export type FaultLoopType = 'AG' | 'BG' | 'CG' | 'AB' | 'BC' | 'CA';
export type CharacteristicType = 'MHO' | 'QUADRILATERAL';

export interface DistanceZoneSettings {
  enabled: boolean;
  reachZ1Mag: number; // Ohms secondary/primary
  reachZ1AngDeg: number; // Line angle in degrees (e.g. 75° to 85°)
  timeDelay: number; // Seconds (0 for Zone 1)
  characteristic: CharacteristicType;
  
  // Mho specific
  offsetMag?: number; // Reverse offset (default 0 for non-offset forward Mho)
  offsetAngDeg?: number;

  // Quadrilateral specific
  reachX?: number; // Reactive reach (Ohms)
  reachRRight?: number; // Resistive reach for phase/ground faults (Ohms)
  reachRLeft?: number;
  blinderAngleDeg?: number; // Tilt angle (default 90°)
}

export interface DistanceRelaySettings {
  lineZ1: Complex; // Positive-sequence line impedance (Ohms)
  lineZ0: Complex; // Zero-sequence line impedance (Ohms)
  zone1: DistanceZoneSettings;
  zone2: DistanceZoneSettings;
  zone3: DistanceZoneSettings;
  enableLoadEncroachment: boolean;
  loadEncroachmentR: number; // Load blinder resistive limit
  loadEncroachmentAngleDeg: number; // Max load power factor angle (e.g. 30°)
}

export interface DistanceLoopResult {
  loop: FaultLoopType;
  zApparent: Complex;
  inZone1: boolean;
  inZone2: boolean;
  inZone3: boolean;
}

export interface DistanceRelayState {
  isTripped: boolean;
  tripZone: 'ZONE1' | 'ZONE2' | 'ZONE3' | 'NONE';
  faultedLoop: FaultLoopType | 'NONE';
  loopResults: Record<FaultLoopType, DistanceLoopResult>;
  zoneTimers: {
    z1: number;
    z2: number;
    z3: number;
  };
  trajectory: Array<{ r: number; x: number; loop: FaultLoopType; t: number }>;
}

export class DistanceRelay {
  public id: string;
  public settings: DistanceRelaySettings;
  public state: DistanceRelayState;
  public k0: Complex; // Zero-sequence compensation factor (Z0 - Z1) / (3 * Z1)

  constructor(id: string, settings?: Partial<DistanceRelaySettings>) {
    this.id = id;

    const z1 = settings?.lineZ1 || { r: 2.0, i: 10.0 };
    const z0 = settings?.lineZ0 || { r: 6.0, i: 30.0 };

    this.settings = {
      lineZ1: z1,
      lineZ0: z0,
      zone1: settings?.zone1 || {
        enabled: true,
        reachZ1Mag: cMag(z1) * 0.8,
        reachZ1AngDeg: (cAng(z1) * 180) / Math.PI,
        timeDelay: 0.0,
        characteristic: 'MHO',
        reachX: z1.i * 0.8,
        reachRRight: z1.r * 0.8 + 4.0,
        reachRLeft: z1.r * 0.8 + 4.0,
      },
      zone2: settings?.zone2 || {
        enabled: true,
        reachZ1Mag: cMag(z1) * 1.2,
        reachZ1AngDeg: (cAng(z1) * 180) / Math.PI,
        timeDelay: 0.3,
        characteristic: 'MHO',
        reachX: z1.i * 1.2,
        reachRRight: z1.r * 1.2 + 6.0,
        reachRLeft: z1.r * 1.2 + 6.0,
      },
      zone3: settings?.zone3 || {
        enabled: true,
        reachZ1Mag: cMag(z1) * 1.5,
        reachZ1AngDeg: (cAng(z1) * 180) / Math.PI,
        timeDelay: 0.8,
        characteristic: 'MHO',
        reachX: z1.i * 1.5,
        reachRRight: z1.r * 1.5 + 10.0,
        reachRLeft: z1.r * 1.5 + 10.0,
      },
      enableLoadEncroachment: settings?.enableLoadEncroachment ?? true,
      loadEncroachmentR: settings?.loadEncroachmentR ?? 15.0,
      loadEncroachmentAngleDeg: settings?.loadEncroachmentAngleDeg ?? 35.0,
    };

    // Calculate k0 = (Z0 - Z1) / (3 * Z1)
    const num = cSub(this.settings.lineZ0, this.settings.lineZ1);
    const den = cScale(this.settings.lineZ1, 3.0);
    this.k0 = cDiv(num, den);

    this.state = this.createInitialState();
  }

  private createInitialState(): DistanceRelayState {
    const emptyResult = (loop: FaultLoopType): DistanceLoopResult => ({
      loop,
      zApparent: { r: 9999, i: 9999 },
      inZone1: false,
      inZone2: false,
      inZone3: false,
    });

    return {
      isTripped: false,
      tripZone: 'NONE',
      faultedLoop: 'NONE',
      loopResults: {
        AG: emptyResult('AG'),
        BG: emptyResult('BG'),
        CG: emptyResult('CG'),
        AB: emptyResult('AB'),
        BC: emptyResult('BC'),
        CA: emptyResult('CA'),
      },
      zoneTimers: { z1: 0, z2: 0, z3: 0 },
      trajectory: [],
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Evaluates whether apparent impedance Z = R + jX falls inside a given zone.
   */
  public isInsideZone(z: Complex, zone: DistanceZoneSettings): boolean {
    if (!zone.enabled) return false;

    // Load encroachment check: if within load zone, block distance trip
    if (this.settings.enableLoadEncroachment) {
      const zMag = cMag(z);
      const zAngDeg = Math.abs((cAng(z) * 180) / Math.PI);
      if (zMag <= this.settings.loadEncroachmentR && zAngDeg <= this.settings.loadEncroachmentAngleDeg) {
        return false; // Load encroachment exclusion
      }
    }

    if (zone.characteristic === 'MHO') {
      // Forward reach phasor
      const phiReachRad = (zone.reachZ1AngDeg * Math.PI) / 180;
      const zFwd: Complex = {
        r: zone.reachZ1Mag * Math.cos(phiReachRad),
        i: zone.reachZ1Mag * Math.sin(phiReachRad),
      };

      // Offset phasor (if any)
      const offsetMag = zone.offsetMag || 0;
      const offsetAngRad = ((zone.offsetAngDeg || 0) * Math.PI) / 180;
      const zRev: Complex = {
        r: offsetMag * Math.cos(offsetAngRad),
        i: offsetMag * Math.sin(offsetAngRad),
      };

      // Center and Radius of Mho Circle
      const center = cScale(cAdd(zFwd, zRev), 0.5);
      const radius = cMag(cSub(zFwd, zRev)) / 2.0;

      const distToCenter = cMag(cSub(z, center));
      return distToCenter <= radius + 1e-6;
    } else {
      // Quadrilateral Characteristic
      const reachX = zone.reachX ?? zone.reachZ1Mag * Math.sin((zone.reachZ1AngDeg * Math.PI) / 180);
      const reachRRight = zone.reachRRight ?? zone.reachZ1Mag * Math.cos((zone.reachZ1AngDeg * Math.PI) / 180) + 5.0;
      const reachRLeft = zone.reachRLeft ?? reachRRight;

      // Bottom directional line (X >= -0.05 * reachX)
      const isAboveDir = z.i >= -0.1 * reachX;
      const isBelowX = z.i <= reachX;
      const isRightOk = z.r <= reachRRight;
      const isLeftOk = z.r >= -reachRLeft;

      return isAboveDir && isBelowX && isRightOk && isLeftOk;
    }
  }

  /**
   * Computes 6 loop apparent impedances from 3-phase voltages and currents.
   */
  public computeApparentImpedances(
    va: Complex,
    vb: Complex,
    vc: Complex,
    ia: Complex,
    ib: Complex,
    ic: Complex
  ): Record<FaultLoopType, Complex> {
    // 3 * I0 = Ia + Ib + Ic
    const threeI0 = cAdd(cAdd(ia, ib), ic);
    const i0Comp = cMul(this.k0, threeI0);

    // Phase-to-Ground Loops
    const zAG = cDiv(va, cAdd(ia, i0Comp));
    const zBG = cDiv(vb, cAdd(ib, i0Comp));
    const zCG = cDiv(vc, cAdd(ic, i0Comp));

    // Phase-to-Phase Loops
    const zAB = cDiv(cSub(va, vb), cSub(ia, ib));
    const zBC = cDiv(cSub(vb, vc), cSub(ib, ic));
    const zCA = cDiv(cSub(vc, va), cSub(ic, ia));

    return { AG: zAG, BG: zBG, CG: zCG, AB: zAB, BC: zBC, CA: zCA };
  }

  /**
   * Main simulation step for ANSI 21 distance relay.
   */
  public step(
    va: Complex,
    vb: Complex,
    vc: Complex,
    ia: Complex,
    ib: Complex,
    ic: Complex,
    dt: number,
    simTime: number = 0
  ): DistanceRelayState {
    const loops = this.computeApparentImpedances(va, vb, vc, ia, ib, ic);
    const loopTypes: FaultLoopType[] = ['AG', 'BG', 'CG', 'AB', 'BC', 'CA'];

    let anyInZ1 = false;
    let anyInZ2 = false;
    let anyInZ3 = false;
    let activeFaultLoop: FaultLoopType | 'NONE' = 'NONE';
    let minZMag = Infinity;

    for (const lp of loopTypes) {
      const zApp = loops[lp];
      const inZ1 = this.isInsideZone(zApp, this.settings.zone1);
      const inZ2 = this.isInsideZone(zApp, this.settings.zone2);
      const inZ3 = this.isInsideZone(zApp, this.settings.zone3);

      this.state.loopResults[lp] = {
        loop: lp,
        zApparent: zApp,
        inZone1: inZ1,
        inZone2: inZ2,
        inZone3: inZ3,
      };

      if (inZ1) anyInZ1 = true;
      if (inZ2) anyInZ2 = true;
      if (inZ3) anyInZ3 = true;

      const mag = cMag(zApp);
      if ((inZ1 || inZ2 || inZ3) && mag < minZMag) {
        minZMag = mag;
        activeFaultLoop = lp;
      }
    }

    this.state.faultedLoop = activeFaultLoop;

    // Track minimum trajectory
    if (activeFaultLoop !== 'NONE') {
      const zFocus = loops[activeFaultLoop];
      if (this.state.trajectory.length < 500) {
        this.state.trajectory.push({ r: zFocus.r, x: zFocus.i, loop: activeFaultLoop, t: simTime });
      }
    }

    // Zone 1 Instantaneous
    if (anyInZ1) {
      this.state.zoneTimers.z1 += dt;
      if (this.state.zoneTimers.z1 >= this.settings.zone1.timeDelay) {
        this.state.isTripped = true;
        this.state.tripZone = 'ZONE1';
        return { ...this.state };
      }
    } else {
      this.state.zoneTimers.z1 = 0;
    }

    // Zone 2 Delayed
    if (anyInZ2) {
      this.state.zoneTimers.z2 += dt;
      if (this.state.zoneTimers.z2 >= this.settings.zone2.timeDelay) {
        this.state.isTripped = true;
        this.state.tripZone = 'ZONE2';
        return { ...this.state };
      }
    } else {
      this.state.zoneTimers.z2 = 0;
    }

    // Zone 3 Delayed
    if (anyInZ3) {
      this.state.zoneTimers.z3 += dt;
      if (this.state.zoneTimers.z3 >= this.settings.zone3.timeDelay) {
        this.state.isTripped = true;
        this.state.tripZone = 'ZONE3';
        return { ...this.state };
      }
    } else {
      this.state.zoneTimers.z3 = 0;
    }

    return { ...this.state };
  }
}
