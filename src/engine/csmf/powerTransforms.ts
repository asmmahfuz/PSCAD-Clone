/**
 * PSCAD CLONE - CSMF Power Domain Transforms & Sequence Analyzers
 */

import { MathBlocks } from './mathBlocks';

export interface ClarkeResult {
  alpha: number;
  beta: number;
  zero: number;
}

export interface ParkResult {
  d: number;
  q: number;
  zero: number;
}

export interface SymmetricalSequenceResult {
  V1_mag: number;
  V1_phaseDeg: number;
  V2_mag: number;
  V2_phaseDeg: number;
  V0_mag: number;
  V0_phaseDeg: number;
}

export class PowerTransforms {
  /**
   * Clarke Transform (abc -> alpha, beta, 0)
   * Power-invariant / Amplitude-invariant formulation (2/3 scaling)
   */
  static Clarke(va: number, vb: number, vc: number): ClarkeResult {
    const a = isNaN(va) ? 0.0 : va;
    const b = isNaN(vb) ? 0.0 : vb;
    const c = isNaN(vc) ? 0.0 : vc;

    const alpha = (2.0 / 3.0) * (a - 0.5 * b - 0.5 * c);
    const beta = (2.0 / 3.0) * ((Math.sqrt(3) / 2.0) * (b - c));
    const zero = (1.0 / 3.0) * (a + b + c);

    return { alpha, beta, zero };
  }

  /**
   * Inverse Clarke Transform (alpha, beta, 0 -> abc)
   */
  static InverseClarke(alpha: number, beta: number, zero: number = 0.0): { a: number; b: number; c: number } {
    const al = isNaN(alpha) ? 0.0 : alpha;
    const be = isNaN(beta) ? 0.0 : beta;
    const z = isNaN(zero) ? 0.0 : zero;

    const a = al + z;
    const b = -0.5 * al + (Math.sqrt(3) / 2.0) * be + z;
    const c = -0.5 * al - (Math.sqrt(3) / 2.0) * be + z;

    return { a, b, c };
  }

  /**
   * Park Transform (alpha, beta -> d, q, 0)
   * Using alignment with d-axis at theta (cosine component)
   */
  static Park(alpha: number, beta: number, theta: number, zero: number = 0.0): ParkResult {
    const al = isNaN(alpha) ? 0.0 : alpha;
    const be = isNaN(beta) ? 0.0 : beta;
    const th = isNaN(theta) ? 0.0 : theta;

    const cosT = Math.cos(th);
    const sinT = Math.sin(th);

    const d = al * cosT + be * sinT;
    const q = -al * sinT + be * cosT;

    return { d, q, zero: isNaN(zero) ? 0.0 : zero };
  }

  /**
   * Inverse Park Transform (d, q, 0 -> alpha, beta, 0)
   */
  static InversePark(d: number, q: number, theta: number, zero: number = 0.0): ClarkeResult {
    const vd = isNaN(d) ? 0.0 : d;
    const vq = isNaN(q) ? 0.0 : q;
    const th = isNaN(theta) ? 0.0 : theta;

    const cosT = Math.cos(th);
    const sinT = Math.sin(th);

    const alpha = vd * cosT - vq * sinT;
    const beta = vd * sinT + vq * cosT;

    return { alpha, beta, zero: isNaN(zero) ? 0.0 : zero };
  }

  /**
   * Direct abc -> dq0 Transform
   */
  static AbcToDq0(va: number, vb: number, vc: number, theta: number): ParkResult {
    const clarke = PowerTransforms.Clarke(va, vb, vc);
    return PowerTransforms.Park(clarke.alpha, clarke.beta, theta, clarke.zero);
  }

  /**
   * Direct dq0 -> abc Transform
   */
  static Dq0ToAbc(d: number, q: number, theta: number, zero: number = 0.0): { a: number; b: number; c: number } {
    const clarke = PowerTransforms.InversePark(d, q, theta, zero);
    return PowerTransforms.InverseClarke(clarke.alpha, clarke.beta, clarke.zero);
  }

  /**
   * Synchronous Reference Frame Phase-Locked Loop (SRF-PLL)
   */
  static PLL(
    va: number,
    vb: number,
    vc: number,
    dt: number,
    state: {
      theta: number;
      omega: number;
      piState: { integ: number; prevErr: number; derivFilt: number };
      freqNomHz?: number;
    } = {
      theta: 0,
      omega: 2 * Math.PI * 60,
      piState: { integ: 2 * Math.PI * 60, prevErr: 0, derivFilt: 0 },
      freqNomHz: 60
    },
    kp: number = 60.0,
    ki: number = 1400.0
  ): {
    theta: number;
    omega: number;
    freqHz: number;
    V_d: number;
    V_q: number;
    state: typeof state;
  } {
    const nomFreq = state.freqNomHz || 60;
    const nomOmega = 2 * Math.PI * nomFreq;

    const clarke = PowerTransforms.Clarke(va, vb, vc);
    const park = PowerTransforms.Park(clarke.alpha, clarke.beta, state.theta);

    // Normalize error by magnitude to avoid gain variation with voltage dip
    const mag = Math.sqrt(park.d * park.d + park.q * park.q);
    const normQ = mag > 1e-3 ? park.q / mag : park.q;

    // PI regulator drives V_q to 0
    const pidResult = MathBlocks.PID(
      normQ,
      dt,
      state.piState,
      kp,
      ki,
      0.0,
      0.001,
      -2 * Math.PI * 25,
      2 * Math.PI * 25
    );

    const deltaOmega = pidResult.output;
    const omega = nomOmega + deltaOmega;
    let theta = state.theta + omega * dt;
    theta = theta % (2.0 * Math.PI);
    if (theta < 0) theta += 2.0 * Math.PI;

    return {
      theta,
      omega,
      freqHz: omega / (2.0 * Math.PI),
      V_d: park.d,
      V_q: park.q,
      state: {
        theta,
        omega,
        piState: pidResult.state,
        freqNomHz: nomFreq
      }
    };
  }

  /**
   * Symmetrical Sequence Analyzer (Fortescue Components: V0, V1, V2)
   * Uses Second-Order Generalized Integrator (SOGI) / 90° Phase Shifter
   */
  static SequenceAnalyzer(
    va: number,
    vb: number,
    vc: number,
    dt: number,
    state: {
      sogiA: { v: number; qv: number };
      sogiB: { v: number; qv: number };
      sogiC: { v: number; qv: number };
    } = {
      sogiA: { v: 0, qv: 0 },
      sogiB: { v: 0, qv: 0 },
      sogiC: { v: 0, qv: 0 }
    },
    nomFreq: number = 60.0
  ): {
    result: SymmetricalSequenceResult;
    state: typeof state;
  } {
    const w0 = 2 * Math.PI * nomFreq;
    const k = 1.414; // damping factor for SOGI

    const updateSOGI = (u: number, s: { v: number; qv: number }) => {
      const err = u - s.v;
      const v_dot = k * w0 * err - w0 * s.qv;
      const qv_dot = w0 * s.v;
      const newV = s.v + v_dot * dt;
      const newQv = s.qv + qv_dot * dt;
      return { v: newV, qv: newQv };
    };

    const sA = updateSOGI(isNaN(va) ? 0 : va, state.sogiA);
    const sB = updateSOGI(isNaN(vb) ? 0 : vb, state.sogiB);
    const sC = updateSOGI(isNaN(vc) ? 0 : vc, state.sogiC);

    // Phasors: Real = v, Imag = -qv (90 deg lag)
    // A = sA.v - j*sA.qv
    // a = exp(j*2pi/3) = -0.5 + j*sqrt(3)/2
    // a^2 = exp(-j*2pi/3) = -0.5 - j*sqrt(3)/2
    const Ax = sA.v, Ay = -sA.qv;
    const Bx = sB.v, By = -sB.qv;
    const Cx = sC.v, Cy = -sC.qv;

    // a * B = (-0.5*Bx - sqrt(3)/2*By) + j*(-0.5*By + sqrt(3)/2*Bx)
    const sqrt3_2 = Math.sqrt(3) / 2.0;
    const aBx = -0.5 * Bx - sqrt3_2 * By;
    const aBy = -0.5 * By + sqrt3_2 * Bx;

    // a^2 * C = (-0.5*Cx + sqrt(3)/2*Cy) + j*(-0.5*Cy - sqrt(3)/2*Cx)
    const a2Cx = -0.5 * Cx + sqrt3_2 * Cy;
    const a2Cy = -0.5 * Cy - sqrt3_2 * Cx;

    // Positive Sequence: V1 = (A + a*B + a^2*C) / 3
    const V1x = (Ax + aBx + a2Cx) / 3.0;
    const V1y = (Ay + aBy + a2Cy) / 3.0;
    const V1_mag = Math.sqrt(V1x * V1x + V1y * V1y);
    const V1_phaseDeg = (Math.atan2(V1y, V1x) * 180.0) / Math.PI;

    // Negative Sequence: V2 = (A + a^2*B + a*C) / 3
    const a2Bx = -0.5 * Bx + sqrt3_2 * By;
    const a2By = -0.5 * By - sqrt3_2 * Bx;
    const aCx = -0.5 * Cx - sqrt3_2 * Cy;
    const aCy = -0.5 * Cy + sqrt3_2 * Cx;

    const V2x = (Ax + a2Bx + aCx) / 3.0;
    const V2y = (Ay + a2By + aCy) / 3.0;
    const V2_mag = Math.sqrt(V2x * V2x + V2y * V2y);
    const V2_phaseDeg = (Math.atan2(V2y, V2x) * 180.0) / Math.PI;

    // Zero Sequence: V0 = (A + B + C) / 3
    const V0x = (Ax + Bx + Cx) / 3.0;
    const V0y = (Ay + By + Cy) / 3.0;
    const V0_mag = Math.sqrt(V0x * V0x + V0y * V0y);
    const V0_phaseDeg = (Math.atan2(V0y, V0x) * 180.0) / Math.PI;

    return {
      result: {
        V1_mag,
        V1_phaseDeg,
        V2_mag,
        V2_phaseDeg,
        V0_mag,
        V0_phaseDeg
      },
      state: { sogiA: sA, sogiB: sB, sogiC: sC }
    };
  }
}
