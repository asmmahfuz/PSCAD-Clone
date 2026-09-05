/**
 * PSCAD CLONE - Harmonic Impedance & Frequency Scan (Z(f)) Engine
 * 
 * Implements small-signal AC nodal admittance matrix [Y(ω)] solving across
 * frequency sweeps f ∈ [fMin, fMax] with 1.0 A current injection to compute
 * driving-point and transfer impedance Bode plots, identifying parallel
 * anti-resonance peaks and series filter tuning notches.
 */

import { CircuitNetlist, getComponentPins } from '../engine/netlist';
import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';

export interface ResonancePoint {
  freq: number;
  type: 'parallel' | 'series';
  mag: number;
  phaseDeg: number;
  qFactor?: number;
  description: string;
}

export interface FrequencyScanOptions {
  targetNode: number; // 1-indexed electrical node
  fMin?: number;      // Hz (default: 5 Hz)
  fMax?: number;      // Hz (default: 2500 Hz)
  numPoints?: number; // default: 200
  scale?: 'linear' | 'log';
  componentId?: string;
  busName?: string;
}

export interface FrequencyScanResult {
  targetNode: number;
  targetName: string;
  frequencies: number[];
  magnitude: number[];     // Ohms (Ω)
  magnitudeDb: number[];   // dBΩ (20*log10(|Z|))
  phaseDeg: number[];      // Degrees (-180° to +180°)
  real: number[];          // Resistance R (Ω)
  imag: number[];          // Reactance X (Ω)
  resonances: ResonancePoint[];
  executionTimeMs: number;
}

/**
 * Complex Number helper class for AC frequency domain operations
 */
export class Complex {
  public re: number;
  public im: number;

  constructor(re: number = 0, im: number = 0) {
    this.re = re;
    this.im = im;
  }

  static fromPolar(r: number, thetaRad: number): Complex {
    return new Complex(r * Math.cos(thetaRad), r * Math.sin(thetaRad));
  }

  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other: Complex): Complex {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  div(other: Complex): Complex {
    const denom = other.re * other.re + other.im * other.im;
    if (denom === 0) return new Complex(1e12, 0);
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  inv(): Complex {
    const denom = this.re * this.re + this.im * this.im;
    if (denom === 0) return new Complex(1e12, 0);
    return new Complex(this.re / denom, -this.im / denom);
  }

  mag(): number {
    return Math.hypot(this.re, this.im);
  }

  phaseDeg(): number {
    return (Math.atan2(this.im, this.re) * 180) / Math.PI;
  }
}

/**
 * Complex Matrix with LU Decomposition with Partial Pivoting
 */
export class ComplexMatrix {
  public n: number;
  public data: Complex[][];

  constructor(n: number) {
    this.n = n;
    this.data = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => new Complex(0, 0))
    );
  }

  stamp(i: number, j: number, val: Complex): void {
    if (i >= 0 && i < this.n && j >= 0 && j < this.n) {
      this.data[i][j] = this.data[i][j].add(val);
    }
  }

  stampBranch(n1: number, n2: number, Y: Complex): void {
    // n1 and n2 are 1-indexed, 0 represents ground
    const idx1 = n1 - 1;
    const idx2 = n2 - 1;

    if (idx1 >= 0) this.stamp(idx1, idx1, Y);
    if (idx2 >= 0) this.stamp(idx2, idx2, Y);
    if (idx1 >= 0 && idx2 >= 0) {
      const negY = new Complex(-Y.re, -Y.im);
      this.stamp(idx1, idx2, negY);
      this.stamp(idx2, idx1, negY);
    }
  }

  solve(rhs: Complex[]): Complex[] {
    const n = this.n;
    // Clone matrix and RHS
    const A: Complex[][] = this.data.map(row => row.map(c => new Complex(c.re, c.im)));
    const b: Complex[] = rhs.map(c => new Complex(c.re, c.im));

    // Gaussian elimination with partial pivoting
    for (let k = 0; k < n; k++) {
      let maxRow = k;
      let maxMag = A[k][k].mag();

      for (let r = k + 1; r < n; r++) {
        const m = A[r][k].mag();
        if (m > maxMag) {
          maxMag = m;
          maxRow = r;
        }
      }

      if (maxMag < 1e-15) {
        // Regularize near-singular diagonal
        A[k][k] = A[k][k].add(new Complex(1e-9, 1e-9));
      }

      if (maxRow !== k) {
        const tmpRow = A[k];
        A[k] = A[maxRow];
        A[maxRow] = tmpRow;
        const tmpB = b[k];
        b[k] = b[maxRow];
        b[maxRow] = tmpB;
      }

      const pivot = A[k][k];
      for (let i = k + 1; i < n; i++) {
        const factor = A[i][k].div(pivot);
        A[i][k] = factor;
        for (let j = k + 1; j < n; j++) {
          A[i][j] = A[i][j].sub(factor.mul(A[k][j]));
        }
        b[i] = b[i].sub(factor.mul(b[k]));
      }
    }

    // Back-substitution
    const x: Complex[] = Array.from({ length: n }, () => new Complex(0, 0));
    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum = sum.sub(A[i][j].mul(x[j]));
      }
      x[i] = sum.div(A[i][i]);
    }

    return x;
  }
}

/**
 * Frequency Scan Engine
 */
export class FrequencyScanEngine {
  /**
   * Run small-signal frequency scan on a circuit netlist
   */
  static runScan(
    netlist: CircuitNetlist,
    options: FrequencyScanOptions
  ): FrequencyScanResult {
    const tStart = performance.now();
    const targetNode = options.targetNode;
    const fMin = Math.max(0.1, options.fMin || 5.0);
    const fMax = Math.max(fMin + 1, options.fMax || 2500.0);
    const numPoints = Math.max(10, Math.min(2000, options.numPoints || 200));
    const scale = options.scale || 'log';

    const nodeCount = netlist.nodeCount;
    if (nodeCount === 0 || targetNode <= 0 || targetNode > nodeCount) {
      return {
        targetNode,
        targetName: options.busName || `Node_${targetNode}`,
        frequencies: [],
        magnitude: [],
        magnitudeDb: [],
        phaseDeg: [],
        real: [],
        imag: [],
        resonances: [],
        executionTimeMs: 0
      };
    }

    // Generate frequency sweep points
    const freqs: number[] = [];
    if (scale === 'log') {
      const logMin = Math.log10(fMin);
      const logMax = Math.log10(fMax);
      const step = (logMax - logMin) / (numPoints - 1);
      for (let i = 0; i < numPoints; i++) {
        freqs.push(Math.pow(10, logMin + i * step));
      }
    } else {
      const step = (fMax - fMin) / (numPoints - 1);
      for (let i = 0; i < numPoints; i++) {
        freqs.push(fMin + i * step);
      }
    }

    const magnitudes: number[] = [];
    const magnitudesDb: number[] = [];
    const phaseDegs: number[] = [];
    const reals: number[] = [];
    const imags: number[] = [];

    // Solve for each frequency
    for (const f of freqs) {
      const omega = 2 * Math.PI * f;
      const Y_matrix = new ComplexMatrix(nodeCount);

      // Add minimum numerical shunt conductance to ground to avoid floating islands
      for (let i = 1; i <= nodeCount; i++) {
        Y_matrix.stampBranch(i, 0, new Complex(1e-7, 0));
      }

      // Stamp each component's AC frequency admittance
      for (const comp of netlist.components) {
        FrequencyScanEngine.stampComponentAdmittance(comp, netlist, omega, Y_matrix);
      }

      // Current injection: 1.0 A @ 0° at target node
      const rhs: Complex[] = Array.from({ length: nodeCount }, () => new Complex(0, 0));
      rhs[targetNode - 1] = new Complex(1.0, 0.0);

      // Solve [Y][V] = [I] -> V_target = Z_driving_point (since I = 1.0 A)
      const V_vec = Y_matrix.solve(rhs);
      const Z_target = V_vec[targetNode - 1];

      const mag = Z_target.mag();
      const phase = Z_target.phaseDeg();
      const magDb = 20 * Math.log10(Math.max(1e-6, mag));

      magnitudes.push(mag);
      magnitudesDb.push(magDb);
      phaseDegs.push(phase);
      reals.push(Z_target.re);
      imags.push(Z_target.im);
    }

    // Detect Parallel (Peaks) and Series (Notches) Resonances
    const resonances = FrequencyScanEngine.detectResonances(freqs, magnitudes, phaseDegs);
    const executionTimeMs = performance.now() - tStart;

    return {
      targetNode,
      targetName: options.busName || `Node ${targetNode}`,
      frequencies: freqs,
      magnitude: magnitudes,
      magnitudeDb: magnitudesDb,
      phaseDeg: phaseDegs,
      real: reals,
      imag: imags,
      resonances,
      executionTimeMs
    };
  }

  /**
   * Stamp AC small-signal admittance for a single component at frequency omega
   */
  static stampComponentAdmittance(
    comp: CircuitComponentData,
    netlist: CircuitNetlist,
    omega: number,
    Y_mat: ComplexMatrix
  ): void {
    const pins = getComponentPins(comp);
    const p = comp.params || {};

    const getNode = (pinIdx: number): number => {
      if (pinIdx < pins.length) {
        return netlist.getNode(pins[pinIdx].id);
      }
      return 0;
    };

    switch (comp.type) {
      case COMPONENT_TYPES.RESISTOR: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const R = Math.max(1e-4, p.resistance || 1.0);
        Y_mat.stampBranch(n1, n2, new Complex(1.0 / R, 0));
        break;
      }

      case COMPONENT_TYPES.INDUCTOR: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const L = Math.max(1e-7, p.inductance || 0.01);
        // Y_L = 1 / (j*omega*L) = -j / (omega*L)
        Y_mat.stampBranch(n1, n2, new Complex(0, -1.0 / (omega * L)));
        break;
      }

      case COMPONENT_TYPES.CAPACITOR: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const C = Math.max(1e-12, p.capacitance || 100e-6);
        // Y_C = j*omega*C
        Y_mat.stampBranch(n1, n2, new Complex(0, omega * C));
        break;
      }

      case COMPONENT_TYPES.SERIES_RLC: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const R = p.resistance || 0.1;
        const L = p.inductance || 0.01;
        const C = p.capacitance || 50e-6;
        const Z_re = R;
        const Z_im = omega * L - (C > 0 ? 1.0 / (omega * C) : 0);
        const Z = new Complex(Z_re, Z_im);
        Y_mat.stampBranch(n1, n2, Z.inv());
        break;
      }

      case 'parallel_rlc': {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const R = p.resistance || 1000;
        const L = p.inductance || 0.01;
        const C = p.capacitance || 50e-6;
        const Y = new Complex(1.0 / R, omega * C - (L > 0 ? 1.0 / (omega * L) : 0));
        Y_mat.stampBranch(n1, n2, Y);
        break;
      }

      case COMPONENT_TYPES.PI_LINE: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const lengthKm = p.lengthKm || 100;
        const R_km = p.R_per_km || 0.03;
        const L_km = p.L_per_km || 1e-3;
        const C_km = p.C_per_km || 12e-9;

        const R_total = Math.max(1e-4, R_km * lengthKm);
        const L_total = Math.max(1e-7, L_km * lengthKm);
        const C_total = C_km * lengthKm;

        // Series branch
        const Z_series = new Complex(R_total, omega * L_total);
        Y_mat.stampBranch(n1, n2, Z_series.inv());

        // Shunt capacitors C/2 at each end
        const Y_shunt = new Complex(0, (omega * C_total) / 2.0);
        Y_mat.stampBranch(n1, 0, Y_shunt);
        Y_mat.stampBranch(n2, 0, Y_shunt);
        break;
      }

      case COMPONENT_TYPES.BERGERON_LINE_1PH:
      case COMPONENT_TYPES.FD_PHASE_LINE: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const lengthKm = p.lengthKm || 100;
        const R_km = p.R_per_km || 0.03;
        const L_km = p.L_per_km || 1e-3;
        const C_km = p.C_per_km || 12e-9;

        const Zc = Math.sqrt(L_km / Math.max(1e-15, C_km));
        const v = 1.0 / Math.sqrt(L_km * C_km);
        const tau = lengthKm / v;
        const alpha = (R_km / (2 * Zc)) * lengthKm;
        const beta = omega * tau;

        // Hyperbolic transmission line exact model
        // Y_series = 1 / (Zc * sinh(gamma*l))
        // Y_shunt = (cosh(gamma*l) - 1) / (Zc * sinh(gamma*l))
        const cosh_re = Math.cosh(alpha) * Math.cos(beta);
        const cosh_im = Math.sinh(alpha) * Math.sin(beta);
        const sinh_re = Math.sinh(alpha) * Math.cos(beta);
        const sinh_im = Math.cosh(alpha) * Math.sin(beta);

        const sinh_gamma = new Complex(sinh_re, sinh_im);
        const cosh_gamma = new Complex(cosh_re, cosh_im);
        const Zc_c = new Complex(Zc, 0);

        const Z_denom = Zc_c.mul(sinh_gamma);
        const Y_series = Z_denom.inv();
        const Y_shunt = cosh_gamma.sub(new Complex(1, 0)).div(Z_denom);

        Y_mat.stampBranch(n1, n2, Y_series);
        Y_mat.stampBranch(n1, 0, Y_shunt);
        Y_mat.stampBranch(n2, 0, Y_shunt);
        break;
      }

      case COMPONENT_TYPES.AC_SOURCE_1PH:
      case COMPONENT_TYPES.DC_SOURCE: {
        // Independent voltage sources are zeroed (short to ground through internal Rs/Ls)
        const n1 = getNode(0);
        const n2 = getNode(1);
        const Rs = Math.max(1e-3, p.internalRs || 0.1);
        const Ls = p.inductance || 1e-4;
        const Z_src = new Complex(Rs, omega * Ls);
        Y_mat.stampBranch(n1, n2, Z_src.inv());
        break;
      }

      case COMPONENT_TYPES.AC_SOURCE_3PH: {
        const nA = getNode(0);
        const nB = getNode(1);
        const nC = getNode(2);
        const nN = getNode(3);
        const Rs = Math.max(1e-3, p.internalRs || 0.1);
        const Ls = p.inductance || 1e-4;
        const Y_src = new Complex(Rs, omega * Ls).inv();
        Y_mat.stampBranch(nA, nN, Y_src);
        Y_mat.stampBranch(nB, nN, Y_src);
        Y_mat.stampBranch(nC, nN, Y_src);
        break;
      }

      case COMPONENT_TYPES.TRANSFORMER_1PH: {
        const nP1 = getNode(0);
        const nP2 = getNode(1);
        const nS1 = getNode(2);
        const nS2 = getNode(3);

        const V1 = p.V1_nom || 230e3;
        const V2 = p.V2_nom || 69e3;
        const a = V1 / Math.max(1.0, V2);
        const MVA = p.MVA_rating || 100;
        const Xl_pu = p.leakageReactancePu || 0.1;
        const Zbase = (V1 * V1) / (MVA * 1e6);
        const X_leak = Xl_pu * Zbase;
        const L_leak = X_leak / (2 * Math.PI * (p.freq || 60));
        const R_leak = (p.windingLossPu || 0.005) * Zbase;

        const Z_leak = new Complex(R_leak, omega * L_leak);
        const Y_leak = Z_leak.inv();

        // Primary side leakage
        Y_mat.stampBranch(nP1, nP2, Y_leak);
        // Secondary side reflected leakage
        const Y_sec = new Complex(Y_leak.re / (a * a), Y_leak.im / (a * a));
        Y_mat.stampBranch(nS1, nS2, Y_sec);
        break;
      }

      case COMPONENT_TYPES.BREAKER_1PH:
      case COMPONENT_TYPES.TIMED_SWITCH:
      case COMPONENT_TYPES.IDEAL_SWITCH: {
        const n1 = getNode(0);
        const n2 = getNode(1);
        const isClosed = p.initClosed !== undefined ? p.initClosed : true;
        const Ron = p.Ron || 1e-4;
        const Roff = p.Roff || 1e7;
        const R = isClosed ? Ron : Roff;
        Y_mat.stampBranch(n1, n2, new Complex(1.0 / R, 0));
        break;
      }

      default:
        // Default two-pin or polyphase passive fallback
        if (pins.length >= 2) {
          const n1 = getNode(0);
          const n2 = getNode(1);
          if (n1 > 0 || n2 > 0) {
            Y_mat.stampBranch(n1, n2, new Complex(1e-6, 0));
          }
        }
        break;
    }
  }

  /**
   * Automatically detect parallel anti-resonances (peaks) and series resonances (notches)
   */
  static detectResonances(
    freqs: number[],
    magnitudes: number[],
    phaseDegs: number[]
  ): ResonancePoint[] {
    const resonances: ResonancePoint[] = [];
    const len = freqs.length;
    if (len < 5) return resonances;

    for (let i = 2; i < len - 2; i++) {
      const f = freqs[i];
      const m = magnitudes[i];
      const mPrev = magnitudes[i - 1];
      const mNext = magnitudes[i + 1];
      const p = phaseDegs[i];

      // 1. Parallel Resonance Peak (Local Maximum of |Z|)
      if (m > mPrev && m > mNext && m > magnitudes[i - 2] && m > magnitudes[i + 2]) {
        // Find 3dB drop frequencies
        const m3dB = m / Math.SQRT2;
        let fLow = f;
        let fHigh = f;

        for (let j = i - 1; j >= 0; j--) {
          if (magnitudes[j] <= m3dB) {
            fLow = freqs[j];
            break;
          }
        }
        for (let j = i + 1; j < len; j++) {
          if (magnitudes[j] <= m3dB) {
            fHigh = freqs[j];
            break;
          }
        }

        const deltaF = Math.max(1e-3, fHigh - fLow);
        const qFactor = deltaF > 0 ? f / deltaF : 1.0;

        resonances.push({
          freq: Math.round(f * 100) / 100,
          type: 'parallel',
          mag: Math.round(m * 100) / 100,
          phaseDeg: Math.round(p * 10) / 10,
          qFactor: Math.round(qFactor * 10) / 10,
          description: `Parallel Anti-Resonance (Peak |Z| = ${m >= 1e3 ? (m / 1e3).toFixed(2) + ' kΩ' : m.toFixed(1) + ' Ω'})`
        });
      }

      // 2. Series Resonance Notch (Local Minimum of |Z|)
      if (m < mPrev && m < mNext && m < magnitudes[i - 2] && m < magnitudes[i + 2]) {
        resonances.push({
          freq: Math.round(f * 100) / 100,
          type: 'series',
          mag: Math.round(m * 100) / 100,
          phaseDeg: Math.round(p * 10) / 10,
          description: `Series Filter Notch (Min |Z| = ${m.toFixed(2)} Ω)`
        });
      }
    }

    return resonances;
  }
}
