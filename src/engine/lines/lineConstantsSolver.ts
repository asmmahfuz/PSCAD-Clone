/**
 * PSCAD CLONE - Integrated Line Constants Program (LCP) Engine
 * 
 * Computes transmission line parameters from physical tower geometry:
 * - Carson ground skin-depth / Dubanton complex penetration depth formulation
 * - Maxwell potential coefficient matrix inversion for nodal capacitance [C]
 * - Conductor bundle Geometric Mean Radius (GMR) calculation
 * - Kron reduction for eliminating overhead shield / ground wires (OHGW)
 * - 3x3 Phase domain matrices [R], [L], [C]
 * - Positive and Zero sequence modal parameters (Z1, Z0, C1, C0, Zc1, Zc0, v1, v0, tau1, tau0)
 */

export interface ConductorGeometry {
  id: string;
  name: string;
  x: number;          // Horizontal coordinate from tower center (meters)
  y: number;          // Height above ground at tower (meters)
  sag: number;        // Midspan sag (meters)
  isGroundWire: boolean;
  
  // Conductor specifications
  r_dc_per_km: number;       // DC resistance at 20°C (Ohm/km)
  radius_cm: number;         // Conductor physical outer radius (cm)
  gmr_cm: number;            // Conductor GMR (cm)
  numSubconductors: number;  // 1 = single, 2 = twin, 3 = tri, 4 = quad bundle
  bundleSpacing_cm: number;  // Spacing between subconductors in bundle (cm)
}

export interface TowerPreset {
  name: string;
  voltageRatingKv: number;
  description: string;
  conductors: ConductorGeometry[];
  groundResistivity: number; // Ohm-m
  frequencyHz: number;
}

export interface LCPResult {
  frequencyHz: number;
  groundResistivity: number;
  
  // Phase Domain 3x3 Matrices (Per Km)
  R_matrix: number[][]; // Ohm/km
  L_matrix: number[][]; // H/km
  C_matrix: number[][]; // F/km
  
  // Symmetrical / Sequence Parameters
  R1: number;       // Positive sequence resistance (Ohm/km)
  X1: number;       // Positive sequence reactance (Ohm/km)
  L1: number;       // Positive sequence inductance (H/km)
  C1: number;       // Positive sequence capacitance (F/km)
  Zc1: number;      // Positive sequence surge impedance (Ohm)
  v1_km_s: number;  // Positive sequence propagation velocity (km/s)
  tau1_ms_per_100km: number;

  R0: number;       // Zero sequence resistance (Ohm/km)
  X0: number;       // Zero sequence reactance (Ohm/km)
  L0: number;       // Zero sequence inductance (H/km)
  C0: number;       // Zero sequence capacitance (F/km)
  Zc0: number;      // Zero sequence surge impedance (Ohm)
  v0_km_s: number;  // Zero sequence propagation velocity (km/s)
  tau0_ms_per_100km: number;

  penetrationDepth_m: number;
}

export const TOWER_PRESETS: Record<string, TowerPreset> = {
  PRESET_500KV_LATTICE: {
    name: '500 kV Double-Circuit Lattice Tower',
    voltageRatingKv: 500,
    description: 'Standard 500 kV high-capacity transmission line with 4-conductor bundles (Quad ACSR 1272 "Pheasant") and dual shield wires.',
    groundResistivity: 100,
    frequencyHz: 60,
    conductors: [
      // Phase A, B, C (Circuit 1)
      { id: 'pA1', name: 'Phase A1', x: -10.5, y: 35.0, sag: 8.0, isGroundWire: false, r_dc_per_km: 0.045, radius_cm: 1.76, gmr_cm: 1.41, numSubconductors: 4, bundleSpacing_cm: 45.7 },
      { id: 'pB1', name: 'Phase B1', x: -12.0, y: 25.0, sag: 8.0, isGroundWire: false, r_dc_per_km: 0.045, radius_cm: 1.76, gmr_cm: 1.41, numSubconductors: 4, bundleSpacing_cm: 45.7 },
      { id: 'pC1', name: 'Phase C1', x: -10.0, y: 15.0, sag: 8.0, isGroundWire: false, r_dc_per_km: 0.045, radius_cm: 1.76, gmr_cm: 1.41, numSubconductors: 4, bundleSpacing_cm: 45.7 },
      // Shield Wires (OHGW)
      { id: 'gw1', name: 'Shield Wire 1', x: -7.5, y: 45.0, sag: 5.0, isGroundWire: true, r_dc_per_km: 1.5, radius_cm: 0.55, gmr_cm: 0.25, numSubconductors: 1, bundleSpacing_cm: 0 },
      { id: 'gw2', name: 'Shield Wire 2', x: 7.5, y: 45.0, sag: 5.0, isGroundWire: true, r_dc_per_km: 1.5, radius_cm: 0.55, gmr_cm: 0.25, numSubconductors: 1, bundleSpacing_cm: 0 },
    ],
  },
  PRESET_230KV_H_FRAME: {
    name: '230 kV Horizontal H-Frame Tower',
    voltageRatingKv: 230,
    description: 'Horizontal flat configuration 230 kV line with 2-conductor bundles (Twin ACSR 795 "Drake") and dual shield wires.',
    groundResistivity: 100,
    frequencyHz: 60,
    conductors: [
      { id: 'pA', name: 'Phase A', x: -8.0, y: 22.0, sag: 6.0, isGroundWire: false, r_dc_per_km: 0.072, radius_cm: 1.41, gmr_cm: 1.14, numSubconductors: 2, bundleSpacing_cm: 45.7 },
      { id: 'pB', name: 'Phase B', x: 0.0, y: 22.0, sag: 6.0, isGroundWire: false, r_dc_per_km: 0.072, radius_cm: 1.41, gmr_cm: 1.14, numSubconductors: 2, bundleSpacing_cm: 45.7 },
      { id: 'pC', name: 'Phase C', x: 8.0, y: 22.0, sag: 6.0, isGroundWire: false, r_dc_per_km: 0.072, radius_cm: 1.41, gmr_cm: 1.14, numSubconductors: 2, bundleSpacing_cm: 45.7 },
      { id: 'gw1', name: 'Shield Wire 1', x: -4.5, y: 28.0, sag: 4.0, isGroundWire: true, r_dc_per_km: 2.1, radius_cm: 0.48, gmr_cm: 0.20, numSubconductors: 1, bundleSpacing_cm: 0 },
      { id: 'gw2', name: 'Shield Wire 2', x: 4.5, y: 28.0, sag: 4.0, isGroundWire: true, r_dc_per_km: 2.1, radius_cm: 0.48, gmr_cm: 0.20, numSubconductors: 1, bundleSpacing_cm: 0 },
    ],
  },
  PRESET_138KV_MONOPOLE: {
    name: '138 kV Vertical Steel Monopole',
    voltageRatingKv: 138,
    description: 'Compact vertical delta configuration for urban/suburban rights-of-way (Single ACSR 477 "Hawk").',
    groundResistivity: 100,
    frequencyHz: 60,
    conductors: [
      { id: 'pA', name: 'Phase A', x: -2.5, y: 24.0, sag: 4.5, isGroundWire: false, r_dc_per_km: 0.12, radius_cm: 1.09, gmr_cm: 0.88, numSubconductors: 1, bundleSpacing_cm: 0 },
      { id: 'pB', name: 'Phase B', x: 2.8, y: 20.0, sag: 4.5, isGroundWire: false, r_dc_per_km: 0.12, radius_cm: 1.09, gmr_cm: 0.88, numSubconductors: 1, bundleSpacing_cm: 0 },
      { id: 'pC', name: 'Phase C', x: -2.5, y: 16.0, sag: 4.5, isGroundWire: false, r_dc_per_km: 0.12, radius_cm: 1.09, gmr_cm: 0.88, numSubconductors: 1, bundleSpacing_cm: 0 },
      { id: 'gw1', name: 'Shield Wire', x: 0.0, y: 28.0, sag: 3.5, isGroundWire: true, r_dc_per_km: 2.8, radius_cm: 0.40, gmr_cm: 0.15, numSubconductors: 1, bundleSpacing_cm: 0 },
    ],
  },
};

export class LineConstantsSolver {
  static readonly MU_0 = 4.0 * Math.PI * 1e-7;       // H/m
  static readonly EPSILON_0 = 8.8541878128e-12;     // F/m

  /**
   * Solve full line constants for given conductor layout, frequency, and soil resistivity
   */
  static solve(
    conductors: ConductorGeometry[],
    freqHz: number = 60.0,
    rhoGround: number = 100.0
  ): LCPResult {
    const f = Math.max(freqHz, 1.0);
    const omega = 2.0 * Math.PI * f;
    const rho = Math.max(rhoGround, 1.0);

    // Dubanton complex penetration depth of earth return
    // p = sqrt(rho / (j * omega * mu_0))
    // |p| = sqrt(rho / (omega * mu_0))
    const penetrationDepth_m = Math.sqrt(rho / (omega * LineConstantsSolver.MU_0));

    // Split conductors into Phase conductors and Ground shield wires
    const phaseConds = conductors.filter(c => !c.isGroundWire);
    const groundConds = conductors.filter(c => c.isGroundWire);
    const allConds = [...phaseConds, ...groundConds];

    const N_total = allConds.length;
    const N_phase = phaseConds.length;

    // 1. Calculate effective GMR and bundle radius for all conductors
    const effRadius_m = allConds.map(c => {
      const r_single = (c.radius_cm / 100.0);
      const N_bundle = c.numSubconductors;
      if (N_bundle <= 1) return r_single;
      const s = (c.bundleSpacing_cm / 100.0);
      const bundleRadius = s / (2.0 * Math.sin(Math.PI / N_bundle));
      return Math.pow(N_bundle * r_single * Math.pow(bundleRadius, N_bundle - 1), 1.0 / N_bundle);
    });

    const effGmr_m = allConds.map(c => {
      const gmr_single = (c.gmr_cm / 100.0);
      const N_bundle = c.numSubconductors;
      if (N_bundle <= 1) return gmr_single;
      const s = (c.bundleSpacing_cm / 100.0);
      const bundleRadius = s / (2.0 * Math.sin(Math.PI / N_bundle));
      return Math.pow(N_bundle * gmr_single * Math.pow(bundleRadius, N_bundle - 1), 1.0 / N_bundle);
    });

    // Effective average height considering conductor midspan sag: h_avg = y - (2/3) * sag
    const effHeights_m = allConds.map(c => Math.max(c.y - (2.0 / 3.0) * c.sag, 2.0));

    // 2. Build Full Maxwell Potential Coefficient Matrix [P] (N_total x N_total)
    const P_matrix: number[][] = Array.from({ length: N_total }, () => new Array(N_total).fill(0));

    for (let i = 0; i < N_total; i++) {
      for (let j = 0; j < N_total; j++) {
        if (i === j) {
          // Self potential: P_ii = (1 / 2*pi*eps0) * ln( 2 * h_i / r_eff )
          P_matrix[i][j] = (1.0 / (2.0 * Math.PI * LineConstantsSolver.EPSILON_0)) *
            Math.log((2.0 * effHeights_m[i]) / effRadius_m[i]);
        } else {
          // Mutual potential: P_ij = (1 / 2*pi*eps0) * ln( D'_ij / D_ij )
          const dx = allConds[i].x - allConds[j].x;
          const dy = effHeights_m[i] - effHeights_m[j];
          const dy_image = effHeights_m[i] + effHeights_m[j];
          const D_ij = Math.sqrt(dx * dx + dy * dy);
          const D_prime_ij = Math.sqrt(dx * dx + dy_image * dy_image);
          P_matrix[i][j] = (1.0 / (2.0 * Math.PI * LineConstantsSolver.EPSILON_0)) *
            Math.log(D_prime_ij / D_ij);
        }
      }
    }

    // Invert [P] to obtain capacitance matrix [C_full] = [P]^-1 (Farads/meter)
    const C_full_per_m = LineConstantsSolver.invertMatrix(P_matrix);

    // 3. Build Full Series Impedance Matrix [Z_full] (N_total x N_total) with Carson earth return
    const R_full_per_m: number[][] = Array.from({ length: N_total }, () => new Array(N_total).fill(0));
    const L_full_per_m: number[][] = Array.from({ length: N_total }, () => new Array(N_total).fill(0));

    for (let i = 0; i < N_total; i++) {
      for (let j = 0; j < N_total; j++) {
        const c_i = allConds[i];
        const c_j = allConds[j];

        if (i === j) {
          // Self impedance: Z_ii = (R_dc / N_bundle) + j*omega*(mu0 / 2*pi)*ln( 2*(h_i + p) / GMR )
          const r_ac_per_m = (c_i.r_dc_per_km / (c_i.numSubconductors * 1000.0)) *
            (1.0 + 0.08 * Math.sqrt(f / 60.0));
          
          // Carson earth return resistance component: Delta_R = (omega * mu0 / 8) = pi^2 * f * 1e-7
          const delta_R_earth = (Math.PI * Math.PI * f * 1e-7);
          R_full_per_m[i][j] = r_ac_per_m + delta_R_earth;

          const h_eff_image = 2.0 * (effHeights_m[i] + penetrationDepth_m);
          L_full_per_m[i][j] = (LineConstantsSolver.MU_0 / (2.0 * Math.PI)) *
            Math.log(h_eff_image / effGmr_m[i]);
        } else {
          // Mutual impedance: Z_ij = Delta_R + j*omega*(mu0 / 2*pi)*ln( D'_earth / D_ij )
          const delta_R_earth = (Math.PI * Math.PI * f * 1e-7);
          R_full_per_m[i][j] = delta_R_earth;

          const dx = c_i.x - c_j.x;
          const dy = effHeights_m[i] - effHeights_m[j];
          const dy_image = effHeights_m[i] + effHeights_m[j] + 2.0 * penetrationDepth_m;

          const D_ij = Math.sqrt(dx * dx + dy * dy);
          const D_prime_earth = Math.sqrt(dx * dx + dy_image * dy_image);

          L_full_per_m[i][j] = (LineConstantsSolver.MU_0 / (2.0 * Math.PI)) *
            Math.log(D_prime_earth / D_ij);
        }
      }
    }

    // 4. Kron Reduction: Eliminate Ground / Shield wires
    // [Z_red] = [Z_pp] - [Z_pg] * [Z_gg]^-1 * [Z_gp]
    // [C_red] = [C_pp] - [C_pg] * [C_gg]^-1 * [C_gp]
    let R_phase_per_km: number[][];
    let L_phase_per_km: number[][];
    let C_phase_per_km: number[][];

    if (groundConds.length > 0) {
      const C_gg = C_full_per_m.slice(N_phase).map(r => r.slice(N_phase));
      const C_pp = C_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase));
      const C_pg = C_full_per_m.slice(0, N_phase).map(r => r.slice(N_phase));
      const C_gp = C_full_per_m.slice(N_phase).map(r => r.slice(0, N_phase));

      const C_gg_inv = LineConstantsSolver.invertMatrix(C_gg);
      const C_red = LineConstantsSolver.matSub(
        C_pp,
        LineConstantsSolver.matMul(LineConstantsSolver.matMul(C_pg, C_gg_inv), C_gp)
      );

      // Convert to per-km (Farads/km)
      C_phase_per_km = C_red.map(row => row.map(v => v * 1000.0));

      // Inductance Kron reduction
      const L_gg = L_full_per_m.slice(N_phase).map(r => r.slice(N_phase));
      const L_pp = L_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase));
      const L_pg = L_full_per_m.slice(0, N_phase).map(r => r.slice(N_phase));
      const L_gp = L_full_per_m.slice(N_phase).map(r => r.slice(0, N_phase));

      const L_gg_inv = LineConstantsSolver.invertMatrix(L_gg);
      const L_red = LineConstantsSolver.matSub(
        L_pp,
        LineConstantsSolver.matMul(LineConstantsSolver.matMul(L_pg, L_gg_inv), L_gp)
      );

      L_phase_per_km = L_red.map(row => row.map(v => v * 1000.0));
      R_phase_per_km = R_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase).map(v => v * 1000.0));
    } else {
      C_phase_per_km = C_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase).map(v => v * 1000.0));
      L_phase_per_km = L_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase).map(v => v * 1000.0));
      R_phase_per_km = R_full_per_m.slice(0, N_phase).map(r => r.slice(0, N_phase).map(v => v * 1000.0));
    }

    // Ensure at least 3x3 matrices for 3-phase circuits
    while (R_phase_per_km.length < 3) {
      R_phase_per_km.push([0.05, 0.02, 0.02]);
      L_phase_per_km.push([0.0013, 0.0005, 0.0005]);
      C_phase_per_km.push([1.2e-8, 3e-9, 3e-9]);
    }

    // 5. Sequence Parameter Extraction
    const r_self = (R_phase_per_km[0][0] + R_phase_per_km[1][1] + R_phase_per_km[2][2]) / 3.0;
    const r_mut = (R_phase_per_km[0][1] + R_phase_per_km[1][2] + R_phase_per_km[0][2]) / 3.0;

    const l_self = (L_phase_per_km[0][0] + L_phase_per_km[1][1] + L_phase_per_km[2][2]) / 3.0;
    const l_mut = (L_phase_per_km[0][1] + L_phase_per_km[1][2] + L_phase_per_km[0][2]) / 3.0;

    const c_self = (C_phase_per_km[0][0] + C_phase_per_km[1][1] + C_phase_per_km[2][2]) / 3.0;
    const c_mut = (C_phase_per_km[0][1] + C_phase_per_km[1][2] + C_phase_per_km[0][2]) / 3.0;

    const R1 = r_self - r_mut;
    const L1 = l_self - l_mut;
    const C1 = c_self - c_mut;
    const X1 = omega * L1;

    const R0 = r_self + 2.0 * r_mut;
    const L0 = l_self + 2.0 * l_mut;
    const C0 = Math.max(c_self + 2.0 * c_mut, 1e-12);
    const X0 = omega * L0;

    const Zc1 = Math.sqrt(L1 / C1);
    const v1_km_s = 1.0 / Math.sqrt(L1 * C1);
    const tau1_ms_per_100km = (100.0 * Math.sqrt(L1 * C1)) * 1000.0;

    const Zc0 = Math.sqrt(L0 / C0);
    const v0_km_s = 1.0 / Math.sqrt(L0 * C0);
    const tau0_ms_per_100km = (100.0 * Math.sqrt(L0 * C0)) * 1000.0;

    return {
      frequencyHz: f,
      groundResistivity: rho,
      R_matrix: R_phase_per_km,
      L_matrix: L_phase_per_km,
      C_matrix: C_phase_per_km,
      R1,
      X1,
      L1,
      C1,
      Zc1,
      v1_km_s,
      tau1_ms_per_100km,
      R0,
      X0,
      L0,
      C0,
      Zc0,
      v0_km_s,
      tau0_ms_per_100km,
      penetrationDepth_m,
    };
  }

  // --- Matrix Math Helpers ---
  private static invertMatrix(M: number[][]): number[][] {
    const N = M.length;
    const aug = M.map((row, r) => [
      ...row,
      ...Array.from({ length: N }, (_, c) => (r === c ? 1.0 : 0.0)),
    ]);

    for (let col = 0; col < N; col++) {
      let maxRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let r = col + 1; r < N; r++) {
        if (Math.abs(aug[r][col]) > maxVal) {
          maxVal = Math.abs(aug[r][col]);
          maxRow = r;
        }
      }

      if (maxVal < 1e-20) continue;

      if (maxRow !== col) {
        const tmp = aug[col];
        aug[col] = aug[maxRow];
        aug[maxRow] = tmp;
      }

      const pivot = aug[col][col];
      for (let c = col; c < 2 * N; c++) {
        aug[col][c] /= pivot;
      }

      for (let r = 0; r < N; r++) {
        if (r !== col) {
          const factor = aug[r][col];
          for (let c = col; c < 2 * N; c++) {
            aug[r][c] -= factor * aug[col][c];
          }
        }
      }
    }

    return aug.map(row => row.slice(N));
  }

  private static matMul(A: number[][], B: number[][]): number[][] {
    const M = A.length;
    const K = B.length;
    const N = B[0].length;
    const C: number[][] = Array.from({ length: M }, () => new Array(N).fill(0));

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let k = 0; k < K; k++) {
          sum += A[i][k] * B[k][j];
        }
        C[i][j] = sum;
      }
    }
    return C;
  }

  private static matSub(A: number[][], B: number[][]): number[][] {
    return A.map((row, r) => row.map((val, c) => val - B[r][c]));
  }
}
