/**
 * PSCAD Modern - Jiles-Atherton Dynamic B-H Hysteresis Core Model
 * 
 * Implements the differential Jiles-Atherton ferromagnetic hysteresis formulation:
 * - Langevin anhysteretic curve: Man(He) = Ms * (coth(He/a) - a/He)
 * - Effective field: He = H + alpha * M
 * - Irreversible domain wall motion: dMirr/dH = (Man - Mirr) / (k*delta - alpha*(Man - Mirr))
 * - Reversible magnetization: Mrev = c * (Man - Mirr)
 * - Total magnetization: M = Mirr + Mrev
 * - Total flux density: B = mu0 * (H + M)
 * - Dynamic differential permeability: mu_diff = dB/dH = mu0 * (1 + dM/dH)
 * - EMT Norton companion stamping: G_eq = dt / (2 * L_inc), I_hist
 * - Trapped remanent flux (Br) upon de-energization and asymmetrical inrush current upon reclosing.
 */

export interface JilesAthertonParams {
  Ms: number;       // Saturation magnetization [A/m] (e.g. 1.6e6 A/m for silicon steel)
  a: number;        // Domain wall density / shape parameter [A/m] (e.g. 1100 A/m)
  alpha: number;    // Inter-domain coupling parameter (e.g. 1.6e-3)
  k: number;        // Pinning energy coefficient [A/m] (e.g. 400 A/m)
  c: number;        // Reversible domain wall bowing parameter (e.g. 0.2)
  A_core: number;   // Core cross-sectional area [m^2] (e.g. 0.08 m^2)
  l_core: number;   // Core mean magnetic path length [m] (e.g. 2.5 m)
  N1: number;       // Primary turns (e.g. 500)
  N2?: number;      // Secondary turns (e.g. 100)
  R_w1?: number;    // Primary winding resistance [Ohm]
  R_w2?: number;    // Secondary winding resistance [Ohm]
  L_leak1?: number; // Primary leakage inductance [H]
  L_leak2?: number; // Secondary leakage inductance [H]
}

export interface JilesAthertonState {
  H: number;        // Magnetic field intensity [A/m]
  M: number;        // Total magnetization [A/m]
  Mirr: number;     // Irreversible magnetization [A/m]
  B: number;        // Magnetic flux density [T]
  flux: number;     // Total core flux Phi = B * A_core [Wb]
  mu_diff: number;  // Differential permeability [H/m]
  L_inc: number;    // Incremental inductance [H]
  prevV: number;    // Previous winding terminal voltage [V]
  prevI: number;    // Previous winding terminal current [A]
  remanentB: number;// Trapped remanent flux density [T]
}

export const DEFAULT_JA_SILICON_STEEL: JilesAthertonParams = {
  Ms: 1.65e6,       // Saturation magnetization [A/m]
  a: 1100.0,        // Domain parameter [A/m]
  alpha: 1.5e-3,    // Interdomain coupling
  k: 450.0,         // Pinning energy [A/m]
  c: 0.18,          // Reversible coefficient
  A_core: 0.08,     // 0.08 m^2
  l_core: 2.2,      // 2.2 m
  N1: 500,
  N2: 150,
  R_w1: 0.15,
  R_w2: 0.05,
  L_leak1: 0.005,
  L_leak2: 0.001,
};

export const MU_0 = 4.0 * Math.PI * 1e-7; // Permeability of free space [H/m]

export class JilesAthertonCore {
  params: JilesAthertonParams;
  id: string;

  constructor(id: string, params: Partial<JilesAthertonParams> = {}) {
    this.id = id;
    this.params = { ...DEFAULT_JA_SILICON_STEEL, ...params };
  }

  /**
   * Initializes state at demagnetized origin (H=0, M=0, B=0) or preset remanence
   */
  initState(initialB: number = 0.0): JilesAthertonState {
    const initialM = initialB / MU_0;
    const mu_init = this.computeDifferentialPermeability(0, initialM, initialM, 1);
    const L_init = (this.params.N1 * this.params.N1 * this.params.A_core * mu_init) / this.params.l_core;

    return {
      H: 0.0,
      M: initialM,
      Mirr: initialM,
      B: initialB,
      flux: initialB * this.params.A_core,
      mu_diff: mu_init,
      L_inc: L_init,
      prevV: 0.0,
      prevI: 0.0,
      remanentB: initialB,
    };
  }

  /**
   * Evaluates the Langevin anhysteretic function:
   * L(z) = coth(z) - 1/z
   * Includes Taylor series expansion around z = 0 for numerical precision.
   */
  static langevin(z: number): number {
    const absZ = Math.abs(z);
    if (absZ < 1e-4) {
      // Taylor series: z/3 - z^3/45 + 2z^5/945
      const z2 = z * z;
      return z * (1.0 / 3.0 - z2 / 45.0 + (2.0 * z2 * z2) / 945.0);
    }
    if (absZ > 100.0) {
      return z > 0 ? 1.0 - 1.0 / z : -1.0 - 1.0 / z;
    }
    const exp2z = Math.exp(2.0 * z);
    const coth = (exp2z + 1.0) / (exp2z - 1.0);
    return coth - 1.0 / z;
  }

  /**
   * Derivative of the Langevin function dL/dz = 1 - coth^2(z) + 1/z^2
   */
  static dLangevin(z: number): number {
    const absZ = Math.abs(z);
    if (absZ < 1e-4) {
      const z2 = z * z;
      return 1.0 / 3.0 - (2.0 * z2) / 45.0 + (2.0 * z2 * z2) / 189.0;
    }
    if (absZ > 100.0) {
      return 1.0 / (z * z);
    }
    const sinhZ = Math.sinh(z);
    return 1.0 / (z * z) - 1.0 / (sinhZ * sinhZ);
  }

  /**
   * Computes anhysteretic magnetization: Man(He) = Ms * L(He / a)
   */
  computeMan(He: number): number {
    const z = He / this.params.a;
    return this.params.Ms * JilesAthertonCore.langevin(z);
  }

  /**
   * Derivative dMan / dHe
   */
  computeDManDHe(He: number): number {
    const z = He / this.params.a;
    return (this.params.Ms / this.params.a) * JilesAthertonCore.dLangevin(z);
  }

  /**
   * Computes differential permeability mu_diff = dB/dH = mu0 * (1 + dM/dH)
   */
  computeDifferentialPermeability(H: number, M: number, Mirr: number, delta: number): number {
    const He = H + this.params.alpha * M;
    const Man = this.computeMan(He);
    const dManDHe = this.computeDManDHe(He);

    // Irreversible derivative: dMirr/dH
    let dMirr_dH = 0.0;
    const diff = Man - Mirr;
    const denom = this.params.k * delta - this.params.alpha * diff;

    // Physical non-negative constraint
    if (delta !== 0 && Math.abs(denom) > 1e-12) {
      if (delta * diff > 0) {
        dMirr_dH = diff / denom;
      }
    }

    // Total dM/dH = ((1 - c)*dMirr/dH + c*dMan/dHe) / (1 - c*alpha*dMan/dHe)
    const numerator = (1.0 - this.params.c) * dMirr_dH + this.params.c * dManDHe;
    const denominator = Math.max(1e-6, 1.0 - this.params.c * this.params.alpha * dManDHe);
    const dM_dH = Math.max(0.0, numerator / denominator);

    // Differential permeability
    const mu_diff = MU_0 * (1.0 + dM_dH);
    return Math.max(MU_0, mu_diff);
  }

  /**
   * Step integration of Jiles-Atherton equations using 4th-order Runge-Kutta (RK4)
   * given incremental field change dH over time step dt.
   */
  stepH(state: JilesAthertonState, newH: number): void {
    const dH = newH - state.H;
    const delta = dH > 1e-9 ? 1 : dH < -1e-9 ? -1 : 0;

    if (delta === 0) {
      // No field change
      state.H = newH;
      state.flux = state.B * this.params.A_core;
      state.mu_diff = this.computeDifferentialPermeability(state.H, state.M, state.Mirr, 1);
      state.L_inc = (this.params.N1 * this.params.N1 * this.params.A_core * state.mu_diff) / this.params.l_core;
      return;
    }

    // RK4 Integration for dMirr/dH
    const evalDeriv = (currH: number, currMirr: number): number => {
      const He = currH + this.params.alpha * (currMirr + this.params.c * (this.computeMan(currH + this.params.alpha * currMirr) - currMirr));
      const Man = this.computeMan(He);
      const diff = Man - currMirr;
      const denom = this.params.k * delta - this.params.alpha * diff;
      if (Math.abs(denom) < 1e-12 || delta * diff <= 0) return 0.0;
      return diff / denom;
    };

    const k1 = evalDeriv(state.H, state.Mirr);
    const k2 = evalDeriv(state.H + 0.5 * dH, state.Mirr + 0.5 * dH * k1);
    const k3 = evalDeriv(state.H + 0.5 * dH, state.Mirr + 0.5 * dH * k2);
    const k4 = evalDeriv(state.H + dH, state.Mirr + dH * k3);

    const dMirr = (dH / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
    state.Mirr += dMirr;
    state.H = newH;

    // Update He, Man, M, and B
    const He = state.H + this.params.alpha * state.M;
    const Man = this.computeMan(He);
    const Mrev = this.params.c * (Man - state.Mirr);
    state.M = state.Mirr + Mrev;

    // Recalculate B = mu0 * (H + M)
    state.B = MU_0 * (state.H + state.M);
    state.flux = state.B * this.params.A_core;

    // Update dynamic differential permeability and incremental inductance
    state.mu_diff = this.computeDifferentialPermeability(state.H, state.M, state.Mirr, delta);
    state.L_inc = Math.max(
      1e-5,
      (this.params.N1 * this.params.N1 * this.params.A_core * state.mu_diff) / this.params.l_core
    );

    // Track remanent flux when H crosses zero
    if (Math.abs(state.H) < 5.0) {
      state.remanentB = state.B;
    }
  }

  /**
   * Norton Companion Conductance [S] for EMT solver
   */
  getNortonConductance(state: JilesAthertonState, dt: number, isBE: boolean = false): number {
    const totalL = state.L_inc + (this.params.L_leak1 || 0);
    const R = this.params.R_w1 || 0.01;
    const factor = isBE ? 1.0 / dt : 2.0 / dt;
    return 1.0 / (factor * totalL + R);
  }

  /**
   * Norton Companion History Current [A]
   */
  getNortonHistoryCurrent(state: JilesAthertonState, dt: number, isBE: boolean = false): number {
    const G_eq = this.getNortonConductance(state, dt, isBE);
    if (isBE) {
      return -state.prevI;
    }
    return -state.prevI - G_eq * state.prevV;
  }

  /**
   * Complete simulation time step update given terminal voltage V_term
   */
  updateEMTStep(V_term: number, dt: number, state: JilesAthertonState, isBE: boolean = false): number {
    const G_eq = this.getNortonConductance(state, dt, isBE);
    const I_hist = this.getNortonHistoryCurrent(state, dt, isBE);

    // Current i(t) = G_eq * V_term + I_hist
    const current = G_eq * V_term + I_hist;

    // Magnetic field H = (N1 * i) / l_core
    const targetH = (this.params.N1 * current) / this.params.l_core;
    this.stepH(state, targetH);

    state.prevV = V_term;
    state.prevI = current;

    return current;
  }

  /**
   * Generate complete B-H hysteresis loop points for visual studio display
   */
  generateHysteresisLoop(H_max: number = 3000, numPoints: number = 400): { H: number[]; B: number[]; M: number[] } {
    const state = this.initState(0.0);
    const H_arr: number[] = [];
    const B_arr: number[] = [];
    const M_arr: number[] = [];

    // Cycle 1: 0 -> +Hmax -> -Hmax -> +Hmax (to settle into stable limit cycle)
    const phases = [
      { start: 0, end: H_max, steps: Math.floor(numPoints / 4) },
      { start: H_max, end: -H_max, steps: Math.floor(numPoints / 2) },
      { start: -H_max, end: H_max, steps: Math.floor(numPoints / 2) },
    ];

    for (const phase of phases) {
      const stepH = (phase.end - phase.start) / phase.steps;
      for (let i = 0; i <= phase.steps; i++) {
        const h = phase.start + i * stepH;
        this.stepH(state, h);
      }
    }

    // Capture the final stabilized cycle: +Hmax -> -Hmax -> +Hmax
    const finalPhases = [
      { start: H_max, end: -H_max, steps: Math.floor(numPoints / 2) },
      { start: -H_max, end: H_max, steps: Math.floor(numPoints / 2) },
    ];

    for (const phase of finalPhases) {
      const stepH = (phase.end - phase.start) / phase.steps;
      for (let i = 0; i <= phase.steps; i++) {
        const h = phase.start + i * stepH;
        this.stepH(state, h);
        H_arr.push(state.H);
        B_arr.push(state.B);
        M_arr.push(state.M);
      }
    }

    return { H: H_arr, B: B_arr, M: M_arr };
  }

  /**
   * Calculates magnetic energy hysteresis loss per cycle: Q_loss = oint H dB [J/m^3]
   */
  calculateCycleLoss(loop: { H: number[]; B: number[] }): number {
    let loss = 0.0;
    const n = loop.H.length;
    for (let i = 0; i < n - 1; i++) {
      const H_avg = 0.5 * (loop.H[i] + loop.H[i + 1]);
      const dB = loop.B[i + 1] - loop.B[i];
      loss += H_avg * dB;
    }
    return Math.abs(loss);
  }
}
