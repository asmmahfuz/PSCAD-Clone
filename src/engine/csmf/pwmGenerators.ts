/**
 * PSCAD CLONE - CSMF PWM Pulse Generators & Firing Units
 */

export interface SpwmOutput {
  pulseA: number;
  pulseA_not: number;
  pulseB: number;
  pulseB_not: number;
  pulseC: number;
  pulseC_not: number;
  carrier: number;
}

export interface SvpwmOutput {
  sector: number;
  dutyA: number;
  dutyB: number;
  dutyC: number;
  pulseA: number;
  pulseB: number;
  pulseC: number;
  T1: number;
  T2: number;
  T0: number;
}

export class PwmGenerators {
  /**
   * Sinusoidal Pulse-Width Modulator (SPWM)
   * Triangular carrier between -1 and +1 at carrierFreq
   */
  static SPWM(
    modA: number,
    modB: number,
    modC: number,
    t: number,
    carrierFreq: number = 2000.0,
    deadTimeSec: number = 0.0,
    _state: { lastAOn?: number; lastBOn?: number; lastCOn?: number } = {}
  ): SpwmOutput {
    const T_carrier = 1.0 / Math.max(100.0, carrierFreq);
    const phaseInCycle = (t % T_carrier) / T_carrier; // [0, 1)

    // Symmetrical triangle wave: 0->0.5 ramps from -1 to 1; 0.5->1.0 ramps from 1 to -1
    let carrier = 0.0;
    if (phaseInCycle < 0.5) {
      carrier = -1.0 + 4.0 * phaseInCycle;
    } else {
      carrier = 3.0 - 4.0 * phaseInCycle;
    }

    const rawA = (isNaN(modA) ? 0 : modA) >= carrier;
    const rawB = (isNaN(modB) ? 0 : modB) >= carrier;
    const rawC = (isNaN(modC) ? 0 : modC) >= carrier;

    // Apply deadtime if configured
    let pulseA = rawA ? 1.0 : 0.0;
    let pulseA_not = !rawA ? 1.0 : 0.0;
    let pulseB = rawB ? 1.0 : 0.0;
    let pulseB_not = !rawB ? 1.0 : 0.0;
    let pulseC = rawC ? 1.0 : 0.0;
    let pulseC_not = !rawC ? 1.0 : 0.0;

    if (deadTimeSec > 0) {
      // Prevent simultaneous conduction
      if (pulseA === 1.0) pulseA_not = 0.0;
      if (pulseB === 1.0) pulseB_not = 0.0;
      if (pulseC === 1.0) pulseC_not = 0.0;
    }

    return {
      pulseA,
      pulseA_not,
      pulseB,
      pulseB_not,
      pulseC,
      pulseC_not,
      carrier
    };
  }

  /**
   * Space Vector Pulse-Width Modulator (SVPWM)
   * Sector identification and symmetrical center-aligned switching times
   */
  static SVPWM(
    vAlpha: number,
    vBeta: number,
    vDc: number,
    t: number,
    carrierFreq: number = 2000.0
  ): SvpwmOutput {
    const Vdc = Math.max(1.0, isNaN(vDc) ? 1.0 : vDc);
    const alpha = isNaN(vAlpha) ? 0.0 : vAlpha;
    const beta = isNaN(vBeta) ? 0.0 : vBeta;

    // Reference angle in [0, 2*PI)
    let theta = Math.atan2(beta, alpha);
    if (theta < 0) theta += 2 * Math.PI;

    // Sector 1 to 6
    const sector = Math.min(6, Math.floor(theta / (Math.PI / 3.0)) + 1);
    const thetaRel = theta - (sector - 1) * (Math.PI / 3.0); // angle inside sector [0, pi/3)

    const Vref = Math.sqrt(alpha * alpha + beta * beta);
    // Modulation index: m = sqrt(3) * Vref / Vdc
    const m = Math.min(1.0, (Math.sqrt(3) * Vref) / Vdc);

    // Active vector dwell times normalized to carrier period Ts
    const T1 = m * Math.sin(Math.PI / 3.0 - thetaRel);
    const T2 = m * Math.sin(thetaRel);
    const T0 = Math.max(0.0, 1.0 - T1 - T2);

    let dutyA = 0.0;
    let dutyB = 0.0;
    let dutyC = 0.0;

    switch (sector) {
      case 1:
        dutyA = T1 + T2 + T0 / 2.0;
        dutyB = T2 + T0 / 2.0;
        dutyC = T0 / 2.0;
        break;
      case 2:
        dutyA = T1 + T0 / 2.0;
        dutyB = T1 + T2 + T0 / 2.0;
        dutyC = T0 / 2.0;
        break;
      case 3:
        dutyA = T0 / 2.0;
        dutyB = T1 + T2 + T0 / 2.0;
        dutyC = T2 + T0 / 2.0;
        break;
      case 4:
        dutyA = T0 / 2.0;
        dutyB = T1 + T0 / 2.0;
        dutyC = T1 + T2 + T0 / 2.0;
        break;
      case 5:
        dutyA = T2 + T0 / 2.0;
        dutyB = T0 / 2.0;
        dutyC = T1 + T2 + T0 / 2.0;
        break;
      case 6:
        dutyA = T1 + T2 + T0 / 2.0;
        dutyB = T0 / 2.0;
        dutyC = T1 + T0 / 2.0;
        break;
    }

    const Ts = 1.0 / Math.max(100.0, carrierFreq);
    const cycleFrac = (t % Ts) / Ts;
    // Triangular carrier in [0, 1]
    const tri = cycleFrac < 0.5 ? 2.0 * cycleFrac : 2.0 * (1.0 - cycleFrac);

    const pulseA = dutyA >= tri ? 1.0 : 0.0;
    const pulseB = dutyB >= tri ? 1.0 : 0.0;
    const pulseC = dutyC >= tri ? 1.0 : 0.0;

    return {
      sector,
      dutyA,
      dutyB,
      dutyC,
      pulseA,
      pulseB,
      pulseC,
      T1,
      T2,
      T0
    };
  }

  /**
   * 6-Pulse Graetz Firing Pulse Generator
   * Equidistant firing pulses P1..P6 spaced by 60 degrees, synchronized with theta and firing angle alpha
   */
  static FiringGenerator6Pulse(
    theta: number,
    alphaDeg: number = 30.0,
    pulseWidthDeg: number = 30.0
  ): {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    p6: number;
    pulses: number[];
  } {
    const alphaRad = (alphaDeg * Math.PI) / 180.0;
    const pwRad = (pulseWidthDeg * Math.PI) / 180.0;

    // Normalizing theta relative to alpha
    // Phase firing natural commutations:
    // P1 (Phase A+): at alpha
    // P2 (Phase C-): at alpha + 60°
    // P3 (Phase B+): at alpha + 120°
    // P4 (Phase A-): at alpha + 180°
    // P5 (Phase C+): at alpha + 240°
    // P6 (Phase B-): at alpha + 300°
    const firingOffsets = [
      0, // P1 (A+)
      (Math.PI / 3.0), // P2 (C-)
      (2.0 * Math.PI / 3.0), // P3 (B+)
      Math.PI, // P4 (A-)
      (4.0 * Math.PI / 3.0), // P5 (C+)
      (5.0 * Math.PI / 3.0), // P6 (B-)
    ];

    const pulses = [0, 0, 0, 0, 0, 0];
    const th = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    for (let i = 0; i < 6; i++) {
      const fireAngle = (alphaRad + firingOffsets[i]) % (2 * Math.PI);
      let dAngle = th - fireAngle;
      if (dAngle < 0) dAngle += 2 * Math.PI;

      if (dAngle <= pwRad) {
        pulses[i] = 1.0;
      }
    }

    return {
      p1: pulses[0],
      p2: pulses[1],
      p3: pulses[2],
      p4: pulses[3],
      p5: pulses[4],
      p6: pulses[5],
      pulses
    };
  }
}
