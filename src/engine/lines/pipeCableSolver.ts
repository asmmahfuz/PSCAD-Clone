/**
 * PSCAD CLONE - High-Pressure Pipe-Type (HPPT) Cable Constants Engine
 * 
 * Computes frequency-dependent parameters for 3-core fluid-filled / gas-insulated
 * conductors enclosed inside a ferromagnetic steel pipe:
 * - Complex tubular Bessel function internal & transfer impedance of the steel pipe
 * - Mutual electromagnetic coupling between eccentric conductors inside the conductive pipe
 * - Non-linear magnetic permeability mu_r of the steel pipe enclosure
 * - Pipe outer surface earth return impedance (Wedepohl formulation)
 * - Kron reduction of the steel pipe enclosure to 3x3 Phase Impedance Matrix [Z]
 * - Positive and zero sequence parameters (Z1, Z0, C1, C0)
 */

import { type Complex, C, ComplexBessel } from './bessel';

export interface PipeCableGeometry {
  // Conductor core
  coreRadius_mm: number;
  coreResistivity_Ohm_m: number;
  
  // Conductor insulation
  insulationRadius_mm: number;
  insulationEps_r: number;
  insulationLossFactor_tanDelta: number;
  
  // Steel Pipe enclosure
  pipeInnerRadius_mm: number;
  pipeOuterRadius_mm: number;
  pipeResistivity_Ohm_m: number;    // Carbon steel ~ 1.8e-7 Ohm-m
  pipePermeability_ur: number;      // Steel pipe relative permeability ~ 200.0 - 500.0
  pipeProtectiveCoating_mm: number; // Somastic / Epoxy anti-corrosion coating
  coatingEps_r: number;
  
  // Physical arrangement inside pipe
  conductorLayout: 'cradled' | 'triangular' | 'flat';
  conductorPitch_mm?: number;       // Distance from pipe center
  
  // Trench Installation
  pipeBurialDepth_m: number;        // Depth to pipe center (m)
  soilResistivity_Ohm_m: number;
}

export interface PipeCableResult {
  frequencyHz: number;
  soilResistivity_Ohm_m: number;
  
  // Internal Pipe Impedances (Ohm/km)
  Z_pipe_internal_in: Complex;
  Z_pipe_internal_out: Complex;
  Z_pipe_mutual: Complex;
  Z_pipe_earth_return: Complex;
  
  // 3x3 Phase domain matrices (per km)
  R_matrix: number[][]; // Ohm/km
  X_matrix: number[][]; // Ohm/km
  L_matrix: number[][]; // H/km
  C_matrix: number[][]; // F/km
  
  // Symmetrical Sequence Parameters
  R1: number;       // Positive sequence resistance (Ohm/km)
  X1: number;       // Positive sequence reactance (Ohm/km)
  L1: number;       // Positive sequence inductance (H/km)
  C1: number;       // Positive sequence capacitance (F/km)
  Zc1: number;      // Surge impedance (Ohm)
  v1_km_s: number;  // Wave propagation velocity (km/s)
  
  R0: number;       // Zero sequence resistance (Ohm/km)
  X0: number;       // Zero sequence reactance (Ohm/km)
  L0: number;       // Zero sequence inductance (H/km)
  C0: number;       // Zero sequence capacitance (F/km)
  Zc0: number;      // Surge impedance (Ohm)
  v0_km_s: number;  // Wave propagation velocity (km/s)
}

const MU_0 = 4 * Math.PI * 1e-7;
const EPS_0 = 8.8541878128e-12;

export const PIPE_CABLE_PRESETS: Record<string, { name: string; description: string; geom: PipeCableGeometry }> = {
  HPPT_230KV_STEEL: {
    name: '230 kV High-Pressure Fluid-Filled (HPFF) Pipe Cable',
    description: 'Classic 230 kV HPFF pipe-type cable with 3x 1250 mm2 copper conductors enclosed in a 8-inch (219 mm OD) carbon steel pipe.',
    geom: {
      coreRadius_mm: 20.0,
      coreResistivity_Ohm_m: 1.7241e-8,
      insulationRadius_mm: 36.5,
      insulationEps_r: 3.5, // Oil-impregnated paper
      insulationLossFactor_tanDelta: 0.002,
      pipeInnerRadius_mm: 104.8, // 8.25" ID
      pipeOuterRadius_mm: 109.5, // 8.625" OD (4.7 mm wall)
      pipeResistivity_Ohm_m: 1.8e-7,
      pipePermeability_ur: 250.0,
      pipeProtectiveCoating_mm: 12.7, // 0.5" Somastic
      coatingEps_r: 3.0,
      conductorLayout: 'triangular',
      pipeBurialDepth_m: 1.5,
      soilResistivity_Ohm_m: 100,
    },
  },
  HPPT_345KV_EXTRA_HIGH_VOLTAGE: {
    name: '345 kV High-Pressure Gas-Filled (HPGF) Pipe Cable',
    description: '345 kV high-capacity underground transmission link with segmented copper conductors in a 10-inch steel pipe.',
    geom: {
      coreRadius_mm: 25.0,
      coreResistivity_Ohm_m: 1.7241e-8,
      insulationRadius_mm: 48.0,
      insulationEps_r: 3.2,
      insulationLossFactor_tanDelta: 0.0018,
      pipeInnerRadius_mm: 128.5,
      pipeOuterRadius_mm: 136.5,
      pipeResistivity_Ohm_m: 1.8e-7,
      pipePermeability_ur: 300.0,
      pipeProtectiveCoating_mm: 15.0,
      coatingEps_r: 3.0,
      conductorLayout: 'cradled',
      pipeBurialDepth_m: 1.8,
      soilResistivity_Ohm_m: 100,
    },
  },
};

export class PipeCableSolver {
  /**
   * Solves pipe-type cable parameters using tubular Bessel formulations
   */
  public static solve(geom: PipeCableGeometry, freqHz: number = 60): PipeCableResult {
    const f = Math.max(1, freqHz);
    const omega = 2 * Math.PI * f;
    const rho_e = Math.max(0.01, geom.soilResistivity_Ohm_m);

    const r_core = geom.coreRadius_mm * 1e-3;
    const r_ins = geom.insulationRadius_mm * 1e-3;
    const R_p_in = geom.pipeInnerRadius_mm * 1e-3;
    const R_p_out = geom.pipeOuterRadius_mm * 1e-3;
    const R_coat_out = R_p_out + geom.pipeProtectiveCoating_mm * 1e-3;

    // 1. Conductor core internal skin-effect impedance
    const sigma_c = 1 / geom.coreResistivity_Ohm_m;
    const m_c = C.sqrt(C.create(0, omega * MU_0 * sigma_c));
    const mCoreR = C.scale(m_c, r_core);
    const i0_c = ComplexBessel.I0(mCoreR);
    const i1_c = ComplexBessel.I1(mCoreR);
    const coreFactor = C.scale(m_c, 1 / (2 * Math.PI * r_core * sigma_c));
    const Z_core_int_per_m = C.mul(coreFactor, C.div(i0_c, i1_c));

    // 2. Steel pipe internal, external, and mutual impedance
    const sigma_pipe = 1 / geom.pipeResistivity_Ohm_m;
    const mu_pipe = MU_0 * geom.pipePermeability_ur;
    const m_pipe = C.sqrt(C.create(0, omega * mu_pipe * sigma_pipe));

    const mR_in = C.scale(m_pipe, R_p_in);
    const mR_out = C.scale(m_pipe, R_p_out);

    const i0_in = ComplexBessel.I0(mR_in);
    const i1_in = ComplexBessel.I1(mR_in);
    const k0_in = ComplexBessel.K0(mR_in);
    const k1_in = ComplexBessel.K1(mR_in);

    const i0_out = ComplexBessel.I0(mR_out);
    const i1_out = ComplexBessel.I1(mR_out);
    const k0_out = ComplexBessel.K0(mR_out);
    const k1_out = ComplexBessel.K1(mR_out);

    const D_pipe = C.sub(C.mul(i1_out, k1_in), C.mul(i1_in, k1_out));

    // Z_pipe_in = (m_pipe / (2*pi*R_p_in*sigma_pipe)) * [I0(m*R_in)*K1(m*R_out) + K0(m*R_in)*I1(m*R_out)] / D_pipe
    const num_p_in = C.add(C.mul(i0_in, k1_out), C.mul(k0_in, i1_out));
    const factor_p_in = C.scale(m_pipe, 1 / (2 * Math.PI * R_p_in * sigma_pipe));
    const Z_pipe_in_per_m = C.mul(factor_p_in, C.div(num_p_in, D_pipe));

    // Z_pipe_out
    const num_p_out = C.add(C.mul(i0_out, k1_in), C.mul(k0_out, i1_in));
    const factor_p_out = C.scale(m_pipe, 1 / (2 * Math.PI * R_p_out * sigma_pipe));
    const Z_pipe_out_per_m = C.mul(factor_p_out, C.div(num_p_out, D_pipe));

    // Z_pipe_mutual
    const Z_pipe_m_per_m = C.div(
      C.create(1, 0),
      C.scale(D_pipe, 2 * Math.PI * R_p_in * R_p_out * sigma_pipe)
    );

    // 3. Pipe-to-Earth outer return impedance
    const m_earth = C.sqrt(C.create(0, (omega * MU_0) / rho_e));
    const h_pipe = Math.max(0.2, geom.pipeBurialDepth_m);
    const onePlusMeH = C.add(C.create(1, 0), C.scale(m_earth, h_pipe));
    const meRout = C.scale(m_earth, R_coat_out);
    const lnRatioSelf = C.ln(C.div(onePlusMeH, meRout));
    const factorE = C.create(0, (omega * MU_0) / (2 * Math.PI));
    const Z_earth_pipe_per_m = C.mul(factorE, lnRatioSelf);

    // Total pipe return impedance: Z_pp = Z_pipe_out + Z_earth_pipe
    const Z_pp_per_m = C.add(Z_pipe_out_per_m, Z_earth_pipe_per_m);

    // 4. Calculate conductor positioning inside pipe
    // Triangular arrangement: touching equilateral triangle with base at bottom
    const d_cond = 2 * r_ins; // Touching insulation outer surfaces
    let pA: { x: number; y: number };
    let pB: { x: number; y: number };
    let pC: { x: number; y: number };

    if (geom.conductorLayout === 'triangular') {
      const h_tri = (Math.sqrt(3) / 2) * d_cond;
      pA = { x: -d_cond / 2, y: -h_tri / 3 };
      pB = { x: d_cond / 2, y: -h_tri / 3 };
      pC = { x: 0, y: (2 * h_tri) / 3 };
    } else if (geom.conductorLayout === 'cradled') {
      // 2 conductors at bottom, 1 slightly above in cradle
      pA = { x: -d_cond / 2, y: -r_ins };
      pB = { x: d_cond / 2, y: -r_ins };
      pC = { x: 0, y: 0.2 * r_ins };
    } else {
      // Flat horizontal
      pA = { x: -d_cond, y: 0 };
      pB = { x: 0, y: 0 };
      pC = { x: d_cond, y: 0 };
    }

    const pos = [pA, pB, pC];

    // 5. Build 4x4 system: [3 Conductors, 1 Steel Pipe]
    // Z_full = [ Z_cc (3x3)   Z_cp (3x1) ]
    //          [ Z_pc (1x3)   Z_pp (1x1) ]
    const Z_full: Complex[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => C.zero())
    );

    // Pipe self
    Z_full[3][3] = C.scale(Z_pp_per_m, 1000);

    for (let i = 0; i < 3; i++) {
      const r_i = Math.hypot(pos[i].x, pos[i].y);
      // Loop inductance of conductor i inside pipe:
      // L_i = (mu_0 / 2pi) * ln( (R_p_in^2 - r_i^2) / (R_p_in * r_core) )
      const numL = Math.max(1e-6, R_p_in * R_p_in - r_i * r_i);
      const denL = Math.max(1e-6, R_p_in * r_core);
      const L_ins_i = (MU_0 / (2 * Math.PI)) * Math.log(numL / denL);
      const Z_ins_i = C.create(0, omega * L_ins_i);

      // Conductor self: Z_cc,ii = Z_core_int + Z_ins_i + Z_pipe_in + Z_pp
      const z_self_per_m = C.add(Z_core_int_per_m, C.add(Z_ins_i, C.add(Z_pipe_in_per_m, Z_pp_per_m)));
      Z_full[i][i] = C.scale(z_self_per_m, 1000);

      // Conductor to pipe mutual: Z_cp,i = Z_pipe_m + Z_earth_pipe (or Z_pp)
      const z_cp_per_m = C.add(Z_pipe_m_per_m, Z_earth_pipe_per_m);
      Z_full[i][3] = C.scale(z_cp_per_m, 1000);
      Z_full[3][i] = Z_full[i][3];

      for (let k = 0; k < 3; k++) {
        if (i === k) continue;
        const dx = pos[i].x - pos[k].x;
        const dy = pos[i].y - pos[k].y;
        const d_ik = Math.max(1e-4, Math.hypot(dx, dy));
        const r_k = Math.hypot(pos[k].x, pos[k].y);

        // Mutual inductance inside pipe with geometric reflection
        // L_ik = (mu_0 / 2pi) * ln( (R_p_in^4 - 2*R_p_in^2*(x_i x_k + y_i y_k) + r_i^2 r_k^2) / (R_p_in^2 * d_ik^2) )^0.5
        const dotProd = pos[i].x * pos[k].x + pos[i].y * pos[k].y;
        const term1 = Math.pow(R_p_in, 4) - 2 * R_p_in * R_p_in * dotProd + r_i * r_i * r_k * r_k;
        const term2 = R_p_in * R_p_in * d_ik * d_ik;
        const L_mut_ik = (MU_0 / (2 * Math.PI)) * 0.5 * Math.log(Math.max(1.001, term1 / Math.max(1e-12, term2)));
        const Z_mut_geom = C.create(0, omega * L_mut_ik);

        const z_mut_per_m = C.add(Z_mut_geom, C.add(Z_pipe_in_per_m, Z_pp_per_m));
        Z_full[i][k] = C.scale(z_mut_per_m, 1000);
      }
    }

    // 6. Kron Reduction: Eliminate pipe return (Z_reduced = Z_cc - Z_cp * Z_pc / Z_pp)
    const Z_red: Complex[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => C.zero())
    );

    const invZ_pp = C.inv(Z_full[3][3]);
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 3; k++) {
        const correction = C.mul(C.mul(Z_full[i][3], invZ_pp), Z_full[3][k]);
        Z_red[i][k] = C.sub(Z_full[i][k], correction);
      }
    }

    // 7. Electrostatic Capacitance Matrix
    // Main insulation capacitance per meter: C_ins = 2 * pi * eps_0 * eps_r / ln(r_ins / r_core)
    const C_ins_per_m = (2 * Math.PI * EPS_0 * geom.insulationEps_r) / Math.log(Math.max(1.001, r_ins / r_core));
    const C_mat: number[][] = Array.from({ length: 3 }, (_, i) =>
      Array.from({ length: 3 }, (_, k) => (i === k ? C_ins_per_m * 1000 : 0))
    );

    // 8. Sequence Parameters
    let zSelfSum = C.zero();
    let zMutSum = C.zero();
    for (let i = 0; i < 3; i++) {
      zSelfSum = C.add(zSelfSum, Z_red[i][i]);
      for (let k = 0; k < 3; k++) {
        if (i !== k) zMutSum = C.add(zMutSum, Z_red[i][k]);
      }
    }
    const zSelfAvg = C.scale(zSelfSum, 1 / 3);
    const zMutAvg = C.scale(zMutSum, 1 / 6);

    const Z1_c = C.sub(zSelfAvg, zMutAvg);
    const Z0_c = C.add(zSelfAvg, C.scale(zMutAvg, 2));

    const R1 = Z1_c.re;
    const X1 = Z1_c.im;
    const L1 = X1 / omega;
    const C1 = C_mat[0][0];

    const R0 = Z0_c.re;
    const X0 = Z0_c.im;
    const L0 = X0 / omega;
    const C0 = C_mat[0][0];

    const Y1_c = C.create(0, omega * C1);
    const Zc1 = C.abs(C.sqrt(C.div(Z1_c, Y1_c)));
    const gamma1 = C.sqrt(C.mul(Z1_c, Y1_c));
    const v1_km_s = omega / Math.max(1e-9, gamma1.im);

    const Y0_c = C.create(0, omega * C0);
    const Zc0 = C.abs(C.sqrt(C.div(Z0_c, Y0_c)));
    const gamma0 = C.sqrt(C.mul(Z0_c, Y0_c));
    const v0_km_s = omega / Math.max(1e-9, gamma0.im);

    const R_mat = Z_red.map((row) => row.map((v) => v.re));
    const X_mat = Z_red.map((row) => row.map((v) => v.im));
    const L_mat = Z_red.map((row) => row.map((v) => v.im / omega));

    return {
      frequencyHz: f,
      soilResistivity_Ohm_m: rho_e,
      Z_pipe_internal_in: C.scale(Z_pipe_in_per_m, 1000),
      Z_pipe_internal_out: C.scale(Z_pipe_out_per_m, 1000),
      Z_pipe_mutual: C.scale(Z_pipe_m_per_m, 1000),
      Z_pipe_earth_return: C.scale(Z_earth_pipe_per_m, 1000),
      R_matrix: R_mat,
      X_matrix: X_mat,
      L_matrix: L_mat,
      C_matrix: C_mat,
      R1,
      X1,
      L1,
      C1,
      Zc1,
      v1_km_s,
      R0,
      X0,
      L0,
      C0,
      Zc0,
      v0_km_s,
    };
  }
}
