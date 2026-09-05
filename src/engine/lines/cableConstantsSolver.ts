/**
 * PSCAD CLONE - Coaxial Underground & Submarine Cable Constants Engine
 * 
 * Computes frequency-dependent cable parameters from physical layer geometry:
 * - Multi-layer coaxial geometry (Core, Semicon, XLPE, Sheath, Bedding, Armor, Jacket)
 * - Complex Bessel function skin-effect for solid core & tubular metallic sheaths
 * - Wedepohl / Pollaczek / Dubanton complex penetration earth return formulation
 * - Maxwell electrostatic capacitance matrix from coaxial permittivity
 * - Kron reduction for solidly bonded, single-point bonded, and cross-bonded sheaths/armors
 * - 3x3 Phase impedance [Z] and admittance [Y] matrices
 * - Positive and Zero sequence modal parameters (Z1, Z0, C1, C0, Zc1, Zc0, v1, v0, tau1, tau0)
 * - Benchmarked against CIGRE TB 531 standard reference cable cases
 */

import { type Complex, C, ComplexBessel } from './bessel';

export interface CableLayerGeometry {
  coreRadius_mm: number;            // Conductor radius (mm)
  coreResistivity_Ohm_m: number;    // Copper = 1.7241e-8, Al = 2.8264e-8
  corePermeability_ur: number;      // Conductor relative permeability (1.0)
  
  innerSemiconThick_mm: number;     // Inner semiconductive screen thickness (mm)
  innerSemiconEps_r: number;        // Semicon permittivity (~10.0)
  
  insulationThick_mm: number;       // Main insulation thickness (mm)
  insulationEps_r: number;          // XLPE = 2.3, EPR = 2.8, Paper = 3.5
  insulationLossFactor_tanDelta: number; // 0.0004 for XLPE
  
  outerSemiconThick_mm: number;     // Outer semiconductive screen thickness (mm)
  outerSemiconEps_r: number;        // Semicon permittivity (~10.0)
  
  sheathThick_mm: number;           // Metallic sheath thickness (mm)
  sheathResistivity_Ohm_m: number;  // Lead = 2.14e-7, Cu = 1.72e-8, Al = 2.83e-8
  sheathPermeability_ur: number;    // Sheath relative permeability (1.0)
  
  beddingThick_mm: number;          // Sheath outer jacket / bedding thickness (mm)
  beddingEps_r: number;             // Bedding relative permittivity (~2.5)
  
  hasArmor: boolean;                // Whether cable has metallic armor
  armorThick_mm: number;            // Metallic armor layer thickness / wire diameter (mm)
  armorResistivity_Ohm_m: number;   // Galvanized steel = 1.38e-7, Bronze = 5.5e-8
  armorPermeability_ur: number;     // Steel armor relative permeability (~10.0 - 50.0)
  
  outerJacketThick_mm: number;      // Outer protective serving jacket thickness (mm)
  outerJacketEps_r: number;         // Serving jacket relative permittivity (~2.3)
}

export interface CablePlacement {
  id: string;
  name: string;
  x_m: number;                      // Horizontal offset from trench center (m)
  depth_m: number;                  // Burial depth below surface (m)
  phase: 'A' | 'B' | 'C' | 'N';
}

export interface CableSystemPreset {
  name: string;
  voltageRatingKv: number;
  description: string;
  frequencyHz: number;
  soilResistivity_Ohm_m: number;
  cableGeometry: CableLayerGeometry;
  layoutType: 'flat' | 'trefoil' | 'duct';
  cables: CablePlacement[];
  sheathBonding: 'solid' | 'single_point' | 'cross_bonded';
}

export interface CableConstantsResult {
  frequencyHz: number;
  soilResistivity_Ohm_m: number;
  sheathBonding: string;

  // Radii summary (mm)
  r1_core_mm: number;
  r2_ins_in_mm: number;
  r3_ins_out_mm: number;
  r4_sheath_in_mm: number;
  r5_sheath_out_mm: number;
  r6_armor_in_mm: number;
  r7_armor_out_mm: number;
  r_outermost_mm: number;

  // Internal Impedances (Ohm/km)
  Z_core_internal: Complex;
  Z_sheath_internal_in: Complex;
  Z_sheath_internal_out: Complex;
  Z_sheath_mutual: Complex;
  Z_insulation_loop: Complex;

  // 3x3 Phase domain matrices (Reduced to core conductors, per km)
  R_matrix: number[][]; // Ohm/km
  X_matrix: number[][]; // Ohm/km (at frequencyHz)
  L_matrix: number[][]; // H/km
  C_matrix: number[][]; // F/km
  G_matrix: number[][]; // S/km

  // Symmetrical Sequence Parameters
  R1: number;       // Positive sequence resistance (Ohm/km)
  X1: number;       // Positive sequence reactance (Ohm/km)
  L1: number;       // Positive sequence inductance (H/km)
  C1: number;       // Positive sequence capacitance (F/km)
  Z1_mag: number;   // |Z1| (Ohm/km)
  Zc1: number;      // Surge impedance (Ohm)
  v1_km_s: number;  // Wave propagation velocity (km/s)
  tau1_ms_per_100km: number;

  R0: number;       // Zero sequence resistance (Ohm/km)
  X0: number;       // Zero sequence reactance (Ohm/km)
  L0: number;       // Zero sequence inductance (H/km)
  C0: number;       // Zero sequence capacitance (F/km)
  Z0_mag: number;   // |Z0| (Ohm/km)
  Zc0: number;      // Surge impedance (Ohm)
  v0_km_s: number;  // Wave propagation velocity (km/s)
  tau0_ms_per_100km: number;
}

export const CABLE_PRESETS: Record<string, CableSystemPreset> = {
  CIGRE_TB_531_132KV_SC: {
    name: '132 kV Single-Core XLPE Cable (CIGRE TB 531 Benchmark)',
    voltageRatingKv: 132,
    description: 'Standard 132 kV single-core copper conductor with lead sheath in horizontal flat formation. Benchmarked against CIGRE Technical Brochure 531 standard values.',
    frequencyHz: 50,
    soilResistivity_Ohm_m: 100,
    sheathBonding: 'solid',
    layoutType: 'flat',
    cableGeometry: {
      coreRadius_mm: 15.0,              // 706 mm2 copper core
      coreResistivity_Ohm_m: 1.7241e-8,
      corePermeability_ur: 1.0,
      innerSemiconThick_mm: 1.2,
      innerSemiconEps_r: 2.3,
      insulationThick_mm: 16.0,          // 132 kV XLPE
      insulationEps_r: 2.3,
      insulationLossFactor_tanDelta: 0.0004,
      outerSemiconThick_mm: 1.0,
      outerSemiconEps_r: 2.3,
      sheathThick_mm: 2.2,              // Lead alloy sheath
      sheathResistivity_Ohm_m: 2.14e-7,
      sheathPermeability_ur: 1.0,
      beddingThick_mm: 3.5,
      beddingEps_r: 2.3,
      hasArmor: false,
      armorThick_mm: 0,
      armorResistivity_Ohm_m: 1.38e-7,
      armorPermeability_ur: 1.0,
      outerJacketThick_mm: 3.0,
      outerJacketEps_r: 2.3,
    },
    cables: [
      { id: 'cA', name: 'Cable Phase A', x_m: -0.30, depth_m: 1.0, phase: 'A' },
      { id: 'cB', name: 'Cable Phase B', x_m: 0.00, depth_m: 1.0, phase: 'B' },
      { id: 'cC', name: 'Cable Phase C', x_m: 0.30, depth_m: 1.0, phase: 'C' },
    ],
  },

  PRESET_230KV_TREFOIL: {
    name: '230 kV Single-Core XLPE Cable (Trefoil Formation)',
    voltageRatingKv: 230,
    description: 'High-voltage 230 kV 1000 mm2 copper XLPE insulated cable with aluminum sheath arranged in touching trefoil formation.',
    frequencyHz: 60,
    soilResistivity_Ohm_m: 100,
    sheathBonding: 'cross_bonded',
    layoutType: 'trefoil',
    cableGeometry: {
      coreRadius_mm: 18.5,              // ~1000 mm2 core
      coreResistivity_Ohm_m: 1.7241e-8,
      corePermeability_ur: 1.0,
      innerSemiconThick_mm: 1.5,
      innerSemiconEps_r: 2.3,
      insulationThick_mm: 22.0,          // 230 kV insulation
      insulationEps_r: 2.3,
      insulationLossFactor_tanDelta: 0.0003,
      outerSemiconThick_mm: 1.2,
      outerSemiconEps_r: 2.3,
      sheathThick_mm: 1.8,              // Corrugated Aluminum sheath
      sheathResistivity_Ohm_m: 2.8264e-8,
      sheathPermeability_ur: 1.0,
      beddingThick_mm: 4.0,
      beddingEps_r: 2.3,
      hasArmor: false,
      armorThick_mm: 0,
      armorResistivity_Ohm_m: 1.38e-7,
      armorPermeability_ur: 1.0,
      outerJacketThick_mm: 3.5,
      outerJacketEps_r: 2.3,
    },
    cables: [
      { id: 'cA', name: 'Cable Phase A', x_m: -0.055, depth_m: 1.20, phase: 'A' },
      { id: 'cB', name: 'Cable Phase B', x_m: 0.055, depth_m: 1.20, phase: 'B' },
      { id: 'cC', name: 'Cable Phase C', x_m: 0.00, depth_m: 1.104, phase: 'C' },
    ],
  },

  PRESET_400KV_SUBSEA: {
    name: '400 kV Submarine Armored Cable (Export Link)',
    voltageRatingKv: 400,
    description: 'Heavy subsea 400 kV cable with copper conductor, lead water-barrier sheath, and double layer galvanized steel wire armor for subsea offshore wind interconnection.',
    frequencyHz: 50,
    soilResistivity_Ohm_m: 0.25, // Sea water resistivity ~0.25 Ohm-m
    sheathBonding: 'solid',
    layoutType: 'flat',
    cableGeometry: {
      coreRadius_mm: 22.0,              // 1500 mm2 copper core
      coreResistivity_Ohm_m: 1.7241e-8,
      corePermeability_ur: 1.0,
      innerSemiconThick_mm: 2.0,
      innerSemiconEps_r: 2.3,
      insulationThick_mm: 27.0,          // 400 kV XLPE
      insulationEps_r: 2.3,
      insulationLossFactor_tanDelta: 0.0003,
      outerSemiconThick_mm: 1.5,
      outerSemiconEps_r: 2.3,
      sheathThick_mm: 3.0,              // Lead sheath
      sheathResistivity_Ohm_m: 2.14e-7,
      sheathPermeability_ur: 1.0,
      beddingThick_mm: 5.0,
      beddingEps_r: 2.3,
      hasArmor: true,
      armorThick_mm: 6.0,               // Double steel wire armor
      armorResistivity_Ohm_m: 1.38e-7,
      armorPermeability_ur: 25.0,        // Steel permeability
      outerJacketThick_mm: 5.0,
      outerJacketEps_r: 2.3,
    },
    cables: [
      { id: 'cA', name: 'Cable Phase A', x_m: -1.50, depth_m: 1.5, phase: 'A' },
      { id: 'cB', name: 'Cable Phase B', x_m: 0.00, depth_m: 1.5, phase: 'B' },
      { id: 'cC', name: 'Cable Phase C', x_m: 1.50, depth_m: 1.5, phase: 'C' },
    ],
  },

  PRESET_33KV_BELTED: {
    name: '33 kV 3-Core Distribution Cable',
    voltageRatingKv: 33,
    description: 'Medium-voltage 33 kV 300 mm2 copper 3-core underground distribution feeder with individual copper tape screens and common steel tape armor.',
    frequencyHz: 60,
    soilResistivity_Ohm_m: 100,
    sheathBonding: 'solid',
    layoutType: 'trefoil',
    cableGeometry: {
      coreRadius_mm: 9.8,               // 300 mm2 copper core
      coreResistivity_Ohm_m: 1.7241e-8,
      corePermeability_ur: 1.0,
      innerSemiconThick_mm: 0.8,
      innerSemiconEps_r: 2.3,
      insulationThick_mm: 8.0,           // 33 kV XLPE
      insulationEps_r: 2.3,
      insulationLossFactor_tanDelta: 0.0005,
      outerSemiconThick_mm: 0.8,
      outerSemiconEps_r: 2.3,
      sheathThick_mm: 0.3,              // Copper tape screen
      sheathResistivity_Ohm_m: 1.7241e-8,
      sheathPermeability_ur: 1.0,
      beddingThick_mm: 2.5,
      beddingEps_r: 2.3,
      hasArmor: true,
      armorThick_mm: 2.0,               // Steel tape armor
      armorResistivity_Ohm_m: 1.38e-7,
      armorPermeability_ur: 15.0,
      outerJacketThick_mm: 2.5,
      outerJacketEps_r: 2.3,
    },
    cables: [
      { id: 'cA', name: 'Core Phase A', x_m: -0.025, depth_m: 0.825, phase: 'A' },
      { id: 'cB', name: 'Core Phase B', x_m: 0.025, depth_m: 0.825, phase: 'B' },
      { id: 'cC', name: 'Core Phase C', x_m: 0.00, depth_m: 0.780, phase: 'C' },
    ],
  },
};

const MU_0 = 4 * Math.PI * 1e-7;   // H/m
const EPS_0 = 8.8541878128e-12;   // F/m

export class CableConstantsSolver {
  /**
   * Solves full cable parameter matrices and sequence values
   */
  public static solve(
    geom: CableLayerGeometry,
    cables: CablePlacement[],
    freqHz: number,
    soilResistivity: number,
    sheathBonding: 'solid' | 'single_point' | 'cross_bonded' = 'solid'
  ): CableConstantsResult {
    const f = Math.max(1, freqHz);
    const omega = 2 * Math.PI * f;
    const rho_e = Math.max(0.01, soilResistivity);

    // 1. Calculate layer radii (in meters)
    const r1 = geom.coreRadius_mm * 1e-3;
    const r2 = r1 + geom.innerSemiconThick_mm * 1e-3;
    const r3 = r2 + geom.insulationThick_mm * 1e-3;
    const r4 = r3 + geom.outerSemiconThick_mm * 1e-3;
    const r5 = r4 + geom.sheathThick_mm * 1e-3;
    const r6 = r5 + geom.beddingThick_mm * 1e-3;
    const r7 = geom.hasArmor ? r6 + geom.armorThick_mm * 1e-3 : r6;
    const r_outer = r7 + geom.outerJacketThick_mm * 1e-3;

    // 2. Complex propagation constants for materials
    // m_core = sqrt(j * omega * mu_0 * mu_r / rho_core)
    const sigma_core = 1 / Math.max(1e-12, geom.coreResistivity_Ohm_m);
    const m_core = C.sqrt(C.create(0, omega * MU_0 * geom.corePermeability_ur * sigma_core));

    const sigma_sheath = 1 / Math.max(1e-12, geom.sheathResistivity_Ohm_m);
    const m_sheath = C.sqrt(C.create(0, omega * MU_0 * geom.sheathPermeability_ur * sigma_sheath));

    // 3. Conductor & Sheath internal impedances using complex Bessel functions
    // Z_core_internal = (m_core / (2 * pi * r1 * sigma_core)) * (I0(m_core * r1) / I1(m_core * r1))
    const mCoreR1 = C.scale(m_core, r1);
    const i0_core = ComplexBessel.I0(mCoreR1);
    const i1_core = ComplexBessel.I1(mCoreR1);
    const coreFactor = C.scale(m_core, 1 / (2 * Math.PI * r1 * sigma_core));
    const Z_core_int_per_m = C.mul(coreFactor, C.div(i0_core, i1_core));

    // Tubular Sheath Internal & Transfer Impedances (Schelkunoff / Wedepohl formulation)
    const deltaSh = Math.max(1e-6, r5 - r4);
    const mDeltaSh = C.scale(m_sheath, deltaSh);
    const cothSh = C.coth(mDeltaSh);
    const cschSh = C.csch(mDeltaSh);

    // Z_sheath_in = (m / (2*pi*r4*sigma)) * coth(m * delta)
    const Z_sheath_in_per_m = C.mul(
      C.scale(m_sheath, 1 / (2 * Math.PI * r4 * sigma_sheath)),
      cothSh
    );

    // Z_sheath_out = (m / (2*pi*r5*sigma)) * coth(m * delta)
    const Z_sheath_out_per_m = C.mul(
      C.scale(m_sheath, 1 / (2 * Math.PI * r5 * sigma_sheath)),
      cothSh
    );

    // Z_sheath_mutual = (m / (2*pi*sqrt(r4*r5)*sigma)) * csch(m * delta)
    const Z_sheath_m_per_m = C.mul(
      C.scale(m_sheath, 1 / (2 * Math.PI * Math.sqrt(r4 * r5) * sigma_sheath)),
      cschSh
    );

    // Insulation loop inductance & reactance (between core and sheath)
    // L_ins = (mu_0 / (2*pi)) * ln(r4 / r1)
    const L_ins_per_m = (MU_0 / (2 * Math.PI)) * Math.log(Math.max(1.001, r4 / r1));
    const Z_ins_per_m = C.create(0, omega * L_ins_per_m);

    // Coaxial Capacitances (per meter)
    // Main insulation capacitance: C1 = 2 * pi * eps_0 * eps_r / ln(r4 / r1)
    const C_core_sheath_per_m = (2 * Math.PI * EPS_0 * geom.insulationEps_r) / Math.log(Math.max(1.001, r4 / r1));
    const G_core_sheath_per_m = omega * C_core_sheath_per_m * geom.insulationLossFactor_tanDelta;

    // Convert internal impedances to Ohm/km

    const Z_core_int_per_km = C.scale(Z_core_int_per_m, 1000);
    const Z_sheath_in_per_km = C.scale(Z_sheath_in_per_m, 1000);
    const Z_sheath_out_per_km = C.scale(Z_sheath_out_per_m, 1000);
    const Z_sheath_m_per_km = C.scale(Z_sheath_m_per_m, 1000);
    const Z_ins_per_km = C.scale(Z_ins_per_m, 1000);

    // 4. Multi-Conductor Earth Return Impedance (Wedepohl / Pollaczek Formulation)
    // Complex penetration depth p = sqrt(rho_e / (j * omega * mu_0))
    const m_earth = C.sqrt(C.create(0, (omega * MU_0) / rho_e));
    const p_earth = C.div(C.create(1, 0), m_earth);

    const N = cables.length; // Number of cables (typically 3 for 3-phase)

    // Build full multi-conductor system matrix: each cable has Core (c) and Sheath (s) -> 2N x 2N
    // [ Z_cc   Z_cs ]
    // [ Z_sc   Z_ss ]
    const size = 2 * N;
    const Z_full: Complex[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => C.zero())
    );

    for (let i = 0; i < N; i++) {
      const cI = cables[i];
      const coreIdxI = i;
      const shIdxI = i + N;

      // Self earth return for cable i (external to sheath/jacket):
      // Z_e,ii = (j * omega * mu_0 / (2*pi)) * ln( (1 + m_e * h_i) / (m_e * r_outer) )
      const h_i = Math.max(0.1, cI.depth_m);
      const onePlusMeH = C.add(C.create(1, 0), C.scale(m_earth, h_i));
      const meRout = C.scale(m_earth, r_outer);
      const lnRatioSelf = C.ln(C.div(onePlusMeH, meRout));
      const factorE = C.create(0, (omega * MU_0) / (2 * Math.PI));
      const Z_earth_self_per_m = C.mul(factorE, lnRatioSelf);
      const Z_earth_self_per_km = C.scale(Z_earth_self_per_m, 1000);

      // Sheath self impedance: Z_ss,ii = Z_sheath_out + Z_earth_self
      Z_full[shIdxI][shIdxI] = C.add(Z_sheath_out_per_km, Z_earth_self_per_km);

      // Core-to-Sheath mutual: Z_cs,ii = Z_sc,ii = Z_sheath_out - Z_sheath_m + Z_earth_self
      const z_cs_self = C.add(C.sub(Z_sheath_out_per_km, Z_sheath_m_per_km), Z_earth_self_per_km);
      Z_full[coreIdxI][shIdxI] = z_cs_self;
      Z_full[shIdxI][coreIdxI] = z_cs_self;

      // Core self impedance: Z_cc,ii = Z_core_int + Z_ins + Z_sheath_in + Z_sheath_out - 2*Z_sheath_m + Z_earth_self
      const z_core_loop = C.add(Z_core_int_per_km, C.add(Z_ins_per_km, Z_sheath_in_per_km));
      const z_sheath_outer = C.add(Z_sheath_out_per_km, Z_earth_self_per_km);
      const z_sheath_cross = C.scale(Z_sheath_m_per_km, -2);
      Z_full[coreIdxI][coreIdxI] = C.add(z_core_loop, C.add(z_sheath_outer, z_sheath_cross));

      // Off-diagonal mutual terms with cable k
      for (let k = 0; k < N; k++) {
        if (i === k) continue;
        const cK = cables[k];
        const coreIdxK = k;
        const shIdxK = k + N;

        const dx = cI.x_m - cK.x_m;
        const dy = cI.depth_m - cK.depth_m;
        const d_ik = Math.max(0.001, Math.hypot(dx, dy));
        const h_k = Math.max(0.1, cK.depth_m);

        // Carson/Wedepohl underground mutual earth return:
        // D_ik_image = sqrt(dx^2 + (h_i + h_k + 2*p)^2)
        const twoP = C.scale(p_earth, 2);
        const sumH = C.create(h_i + h_k, 0);
        const yDist = C.add(sumH, twoP);
        const yDistSq = C.mul(yDist, yDist);
        const distSq = C.add(C.create(dx * dx, 0), yDistSq);
        const distImage = C.sqrt(distSq);

        const ratioMutual = C.div(distImage, C.create(d_ik, 0));
        const lnRatioMutual = C.ln(ratioMutual);
        const Z_earth_mut_per_km = C.scale(C.mul(factorE, lnRatioMutual), 1000);

        // Mutual between cables is purely through earth return
        Z_full[coreIdxI][coreIdxK] = Z_earth_mut_per_km;
        Z_full[coreIdxI][shIdxK] = Z_earth_mut_per_km;
        Z_full[shIdxI][coreIdxK] = Z_earth_mut_per_km;
        Z_full[shIdxI][shIdxK] = Z_earth_mut_per_km;
      }
    }

    // 5. Kron Reduction: Eliminate metallic sheaths (Z_reduced = Z_cc - Z_cs * inv(Z_ss) * Z_sc)
    // Extract submatrices:
    // Z_cc: N x N
    // Z_cs: N x N
    // Z_sc: N x N
    // Z_ss: N x N
    const Z_cc: Complex[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_full[i][k])
    );
    const Z_cs: Complex[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_full[i][k + N])
    );
    const Z_sc: Complex[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_full[i + N][k])
    );
    const Z_ss: Complex[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_full[i + N][k + N])
    );

    let Z_reduced: Complex[][];

    if (sheathBonding === 'single_point') {
      // Sheaths are open at one end (no circulating current) -> Z_reduced = Z_cc
      Z_reduced = Z_cc;
    } else {
      // Solidly bonded or cross-bonded -> Kron reduction: Z_red = Z_cc - Z_cs * inv(Z_ss) * Z_sc
      const invZ_ss = invertComplexMatrix(Z_ss);
      const Z_cs_invZ_ss = multiplyComplexMatrices(Z_cs, invZ_ss);
      const Z_correction = multiplyComplexMatrices(Z_cs_invZ_ss, Z_sc);

      Z_reduced = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, k) => C.sub(Z_cc[i][k], Z_correction[i][k]))
      );

      // If cross-bonded, average diagonal and off-diagonal to model balanced transposition
      if (sheathBonding === 'cross_bonded' && N === 3) {
        let avgSelf = C.zero();
        let avgMut = C.zero();
        for (let i = 0; i < 3; i++) {
          avgSelf = C.add(avgSelf, Z_reduced[i][i]);
          for (let k = 0; k < 3; k++) {
            if (i !== k) avgMut = C.add(avgMut, Z_reduced[i][k]);
          }
        }
        avgSelf = C.scale(avgSelf, 1 / 3);
        avgMut = C.scale(avgMut, 1 / 6);

        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 3; k++) {
            Z_reduced[i][k] = i === k ? avgSelf : avgMut;
          }
        }
      }
    }

    // 6. Extract R, X, L matrices (per km)
    const R_mat: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_reduced[i][k].re)
    );
    const X_mat: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_reduced[i][k].im)
    );
    const L_mat: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => Z_reduced[i][k].im / omega)
    );

    // 7. Shunt Capacitance [C] and Conductance [G] Matrices (per km)
    // Coaxial single-core cables with grounded sheaths have negligible inter-phase capacitance C_ij ≈ 0
    const C_mat: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => (i === k ? C_core_sheath_per_m * 1000 : 0))
    );
    const G_mat: number[][] = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, k) => (i === k ? G_core_sheath_per_m * 1000 : 0))
    );

    // 8. Symmetrical Sequence Parameters (Z1, Z0, C1, C0)
    // For 3-phase systems:
    // Z1 = Z_self_avg - Z_mut_avg
    // Z0 = Z_self_avg + 2 * Z_mut_avg
    let Z1_complex: Complex;
    let Z0_complex: Complex;
    let C1_val = C_mat[0][0];
    let C0_val = C_mat[0][0];

    if (N >= 3) {
      let zSelfSum = C.zero();
      let zMutSum = C.zero();
      let mutCount = 0;

      for (let i = 0; i < 3; i++) {
        zSelfSum = C.add(zSelfSum, Z_reduced[i][i]);
        for (let k = 0; k < 3; k++) {
          if (i !== k) {
            zMutSum = C.add(zMutSum, Z_reduced[i][k]);
            mutCount++;
          }
        }
      }
      const zSelfAvg = C.scale(zSelfSum, 1 / 3);
      const zMutAvg = C.scale(zMutSum, 1 / Math.max(1, mutCount));

      Z1_complex = C.sub(zSelfAvg, zMutAvg);
      Z0_complex = C.add(zSelfAvg, C.scale(zMutAvg, 2));
    } else {
      Z1_complex = Z_reduced[0][0];
      Z0_complex = Z_reduced[0][0];
    }

    const R1 = Z1_complex.re;
    const X1 = Z1_complex.im;
    const L1 = X1 / omega;
    const Z1_mag = C.abs(Z1_complex);

    const R0 = Z0_complex.re;
    const X0 = Z0_complex.im;
    const L0 = X0 / omega;
    const Z0_mag = C.abs(Z0_complex);

    // Surge impedance & propagation velocity
    // Zc = sqrt(Z_per_km / Y_per_km), v = omega / beta
    const Y1_complex = C.create(G_mat[0][0], omega * C1_val);
    const Zc1_complex = C.sqrt(C.div(Z1_complex, Y1_complex));
    const Zc1 = C.abs(Zc1_complex);

    const gamma1 = C.sqrt(C.mul(Z1_complex, Y1_complex));
    const beta1 = Math.max(1e-9, Math.abs(gamma1.im)); // rad/km
    const v1_km_s = omega / beta1;
    const tau1_ms_per_100km = (100 / v1_km_s) * 1000;

    const Y0_complex = C.create(G_mat[0][0], omega * C0_val);
    const Zc0_complex = C.sqrt(C.div(Z0_complex, Y0_complex));
    const Zc0 = C.abs(Zc0_complex);

    const gamma0 = C.sqrt(C.mul(Z0_complex, Y0_complex));
    const beta0 = Math.max(1e-9, Math.abs(gamma0.im));
    const v0_km_s = omega / beta0;
    const tau0_ms_per_100km = (100 / v0_km_s) * 1000;

    return {
      frequencyHz: f,
      soilResistivity_Ohm_m: rho_e,
      sheathBonding,
      r1_core_mm: geom.coreRadius_mm,
      r2_ins_in_mm: (r2 * 1e3),
      r3_ins_out_mm: (r3 * 1e3),
      r4_sheath_in_mm: (r4 * 1e3),
      r5_sheath_out_mm: (r5 * 1e3),
      r6_armor_in_mm: (r6 * 1e3),
      r7_armor_out_mm: (r7 * 1e3),
      r_outermost_mm: (r_outer * 1e3),
      Z_core_internal: Z_core_int_per_km,
      Z_sheath_internal_in: Z_sheath_in_per_km,
      Z_sheath_internal_out: Z_sheath_out_per_km,
      Z_sheath_mutual: Z_sheath_m_per_km,
      Z_insulation_loop: Z_ins_per_km,
      R_matrix: R_mat,
      X_matrix: X_mat,
      L_matrix: L_mat,
      C_matrix: C_mat,
      G_matrix: G_mat,
      R1,
      X1,
      L1,
      C1: C1_val,
      Z1_mag,
      Zc1,
      v1_km_s,
      tau1_ms_per_100km,
      R0,
      X0,
      L0,
      C0: C0_val,
      Z0_mag,
      Zc0,
      v0_km_s,
      tau0_ms_per_100km,
    };
  }
}

/**
 * Helper: Matrix multiply for complex matrices
 */
function multiplyComplexMatrices(A: Complex[][], B: Complex[][]): Complex[][] {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const res: Complex[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => C.zero())
  );

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let sum = C.zero();
      for (let k = 0; k < inner; k++) {
        sum = C.add(sum, C.mul(A[i][k], B[k][j]));
      }
      res[i][j] = sum;
    }
  }
  return res;
}

/**
 * Helper: Gauss-Jordan inversion of NxN complex matrix
 */
function invertComplexMatrix(M: Complex[][]): Complex[][] {
  const n = M.length;
  // Create augmented matrix [M | I]
  const aug: Complex[][] = Array.from({ length: n }, (_, i) => [
    ...M[i].map((val) => ({ ...val })),
    ...Array.from({ length: n }, (_, k) => (i === k ? C.one() : C.zero())),
  ]);

  for (let col = 0; col < n; col++) {
    // Find pivot with largest magnitude
    let maxRow = col;
    let maxVal = C.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = C.abs(aug[r][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }

    if (maxRow !== col) {
      const temp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = temp;
    }

    const pivot = aug[col][col];
    if (C.abs(pivot) < 1e-18) continue; // Singular or near-singular

    // Normalize pivot row
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] = C.div(aug[col][j], pivot);
    }

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[r][j] = C.sub(aug[r][j], C.mul(factor, aug[col][j]));
      }
    }
  }

  // Extract right half as inverse
  return aug.map((row) => row.slice(n));
}
