/**
 * PSCAD Modern - Unified Magnetic Equivalent Circuit (UMEC) Transformer Model
 * 
 * Supports:
 * - 3-Limb Core, 5-Limb Core, and 3 Single-Phase Independent Bank Topologies
 * - Inter-phase flux coupling through yokes and zero-sequence return path
 * - Non-linear dual-slope core saturation per limb with inrush & harmonic generation
 * - Multi-winding configurations: Yg-Yg, Yg-Delta (with 30 deg phase shift), Delta-Delta
 * - EMT Trapezoidal & Critical Damping Adjustment (CDA) Backward Euler companion stamping
 */

import type { ComponentParams } from '../../types';

export type UmecCoreType = '3_limb' | '5_limb' | '3_single_phase';
export type WindingConnection = 'Yg' | 'Y' | 'Delta';

export interface UmecState {
  flux: [number, number, number];        // Core limb fluxes [Wb] (A, B, C)
  prevBranchV: Float64Array;             // 6 winding voltages (3 primary, 3 secondary)
  prevBranchI: Float64Array;             // 6 winding currents (3 primary, 3 secondary)
  prevTermV: Float64Array;               // 8 terminal voltages (Pa, Pb, Pc, Pn, Sa, Sb, Sc, Sn)
  prevTermI: Float64Array;               // 8 terminal currents
  inrushDetected?: boolean;
}

export class UmecTransformer {
  id: string;
  coreType: UmecCoreType;
  primaryConn: WindingConnection;
  secondaryConn: WindingConnection;
  
  V1_nom: number;       // Primary nominal line-to-line voltage [V]
  V2_nom: number;       // Secondary nominal line-to-line voltage [V]
  MVA_rating: number;   // Rated power [MVA]
  freq: number;         // Nominal frequency [Hz]
  leakagePu: number;    // Leakage reactance [pu]
  windingLossPu: number;// Copper loss [pu]
  kneeFluxPu: number;   // Core saturation knee flux [pu]
  satSlopeRatio: number;// Saturated to unsaturated air-core reluctance ratio
  zeroSeqReluctance: number; // Zero-sequence tank/air reluctance ratio for 3-limb core

  turnsRatio: number;
  N1: number;           // Primary turns
  N2: number;           // Secondary turns
  baseFlux: number;     // Nominal peak flux [Wb]
  R_w1: number;         // Primary winding resistance [Ohm]
  R_w2: number;         // Secondary winding resistance [Ohm]
  L_leak1: number;      // Primary leakage inductance [H]
  L_leak2: number;      // Secondary leakage inductance [H]
  
  // Base core permeance
  P_core0: number;

  // Stamped Conductance matrix for 8 terminals (Pa, Pb, Pc, Pn, Sa, Sb, Sc, Sn)
  G_term: number[][];

  constructor(id: string, params: ComponentParams) {
    this.id = id;
    this.coreType = (params.coreType as UmecCoreType) || '3_limb';
    this.primaryConn = (params.primaryConn as WindingConnection) || 'Yg';
    this.secondaryConn = (params.secondaryConn as WindingConnection) || 'Delta';

    this.V1_nom = params.V1_nom ?? 230000;
    this.V2_nom = params.V2_nom ?? 69000;
    this.MVA_rating = params.MVA_rating ?? 100;
    this.freq = params.freq ?? 60;
    this.leakagePu = params.leakageReactancePu ?? 0.10;
    this.windingLossPu = params.windingLossPu ?? 0.005;
    this.kneeFluxPu = params.kneeFluxPu ?? 1.15;
    this.satSlopeRatio = params.satSlopeRatio ?? 20.0;
    this.zeroSeqReluctance = params.zeroSeqReluctance ?? 10.0; // Air/tank reluctance for 3-limb

    const omega = 2 * Math.PI * this.freq;
    const Z_base1 = (this.V1_nom * this.V1_nom) / (this.MVA_rating * 1e6);

    // Turns ratio per phase
    const V1_phase = this.primaryConn === 'Delta' ? this.V1_nom : this.V1_nom / Math.sqrt(3);
    const V2_phase = this.secondaryConn === 'Delta' ? this.V2_nom : this.V2_nom / Math.sqrt(3);
    this.turnsRatio = V1_phase / V2_phase;
    this.N1 = 1000;
    this.N2 = Math.round(this.N1 / this.turnsRatio);

    this.baseFlux = (V1_phase * Math.SQRT2) / (omega * this.N1);

    // Leakage and winding resistance split between primary and secondary (50/50)
    const L_leak_total1 = (this.leakagePu * Z_base1) / omega;
    this.L_leak1 = L_leak_total1 * 0.5;
    this.L_leak2 = (this.L_leak1 / (this.turnsRatio * this.turnsRatio));

    const R_wind_total1 = this.windingLossPu * Z_base1;
    this.R_w1 = R_wind_total1 * 0.5;
    this.R_w2 = (this.R_w1 / (this.turnsRatio * this.turnsRatio));

    // Core magnetizing base permeance (unsaturated magnetizing current ~ 0.5% rated)
    const L_m_base = (Z_base1 / (0.005 * omega));
    this.P_core0 = L_m_base / (this.N1 * this.N1);

    this.G_term = Array.from({ length: 8 }, () => Array(8).fill(0));
  }

  initState(): UmecState {
    return {
      flux: [0, 0, 0],
      prevBranchV: new Float64Array(6),
      prevBranchI: new Float64Array(6),
      prevTermV: new Float64Array(8),
      prevTermI: new Float64Array(8),
      inrushDetected: false,
    };
  }

  /**
   * Build Core Reluctance Matrix [R_m] based on geometry and saturation
   */
  computeReluctanceMatrix(fluxes: [number, number, number]): number[][] {
    const R_m: number[][] = Array.from({ length: 3 }, () => Array(3).fill(0));
    const R_limb_base = 1.0 / this.P_core0;

    // Saturation factors per limb
    const satFactors = fluxes.map(phi => {
      const phiPu = Math.abs(phi / this.baseFlux);
      if (phiPu > this.kneeFluxPu) {
        return 1.0 + (phiPu - this.kneeFluxPu) * this.satSlopeRatio;
      }
      return 1.0;
    });

    const R_limb = satFactors.map(f => R_limb_base * f);
    const R_yoke = R_limb_base * 0.2; // Yoke reluctance

    if (this.coreType === '3_single_phase') {
      // Decoupled single phase units
      R_m[0][0] = R_limb[0] + 2 * R_yoke;
      R_m[1][1] = R_limb[1] + 2 * R_yoke;
      R_m[2][2] = R_limb[2] + 2 * R_yoke;
    } else if (this.coreType === '5_limb') {
      // 3 wound legs + 2 return legs
      const R_outer = R_limb_base * 0.8;
      for (let i = 0; i < 3; i++) {
        R_m[i][i] = R_limb[i] + 2 * R_yoke + R_outer * 0.5;
        for (let j = 0; j < 3; j++) {
          if (i !== j) {
            R_m[i][j] = R_yoke * 0.5;
          }
        }
      }
    } else {
      // 3-Limb Core (Standard)
      // 3 wound limbs coupled through top/bottom yokes
      for (let i = 0; i < 3; i++) {
        R_m[i][i] = R_limb[i] + 2 * R_yoke;
        for (let j = 0; j < 3; j++) {
          if (i !== j) {
            R_m[i][j] = R_yoke * 0.5;
          }
        }
      }
    }

    return R_m;
  }

  /**
   * Invert a 3x3 matrix
   */
  private invert3x3(A: number[][]): number[][] {
    const a = A[0][0], b = A[0][1], c = A[0][2];
    const d = A[1][0], e = A[1][1], f = A[1][2];
    const g = A[2][0], h = A[2][1], k = A[2][2];

    const det = a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
    if (Math.abs(det) < 1e-20) {
      return [
        [1 / A[0][0], 0, 0],
        [0, 1 / A[1][1], 0],
        [0, 0, 1 / A[2][2]]
      ];
    }
    const invDet = 1.0 / det;

    return [
      [(e * k - f * h) * invDet, (c * h - b * k) * invDet, (b * f - c * e) * invDet],
      [(f * g - d * k) * invDet, (a * k - c * g) * invDet, (c * d - a * f) * invDet],
      [(d * h - e * g) * invDet, (g * b - a * h) * invDet, (a * e - b * d) * invDet]
    ];
  }

  /**
   * Compute 6x6 Winding Inductance Matrix [L_windings]
   * Winding ordering: [Pri_A, Pri_B, Pri_C, Sec_A, Sec_B, Sec_C]
   */
  computeInductanceMatrix(fluxes: [number, number, number]): number[][] {
    const R_m = this.computeReluctanceMatrix(fluxes);
    const P_m = this.invert3x3(R_m); // Permeance matrix

    const L: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));

    // Primary-Primary: L_pp = N1^2 * P_m + L_leak1 * I
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        L[i][j] = this.N1 * this.N1 * P_m[i][j];
        if (i === j) L[i][j] += this.L_leak1;
      }
    }

    // Secondary-Secondary: L_ss = N2^2 * P_m + L_leak2 * I
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        L[i + 3][j + 3] = this.N2 * this.N2 * P_m[i][j];
        if (i === j) L[i + 3][j + 3] += this.L_leak2;
      }
    }

    // Mutual Primary-Secondary: L_ps = N1 * N2 * P_m
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const val = this.N1 * this.N2 * P_m[i][j];
        L[i][j + 3] = val;
        L[i + 3][j] = val;
      }
    }

    return L;
  }

  /**
   * Invert a symmetric positive definite 6x6 matrix using Gauss-Jordan
   */
  private invert6x6(A: number[][]): number[][] {
    const n = 6;
    const M: number[][] = A.map(row => [...row]);
    const inv: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0.0))
    );

    for (let i = 0; i < n; i++) {
      let pivot = M[i][i];
      if (Math.abs(pivot) < 1e-15) {
        let swapRow = i + 1;
        while (swapRow < n && Math.abs(M[swapRow][i]) < 1e-15) swapRow++;
        if (swapRow < n) {
          [M[i], M[swapRow]] = [M[swapRow], M[i]];
          [inv[i], inv[swapRow]] = [inv[swapRow], inv[i]];
          pivot = M[i][i];
        }
      }
      const invPivot = 1.0 / pivot;
      for (let j = 0; j < n; j++) {
        M[i][j] *= invPivot;
        inv[i][j] *= invPivot;
      }
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = M[r][i];
          for (let c = 0; c < n; c++) {
            M[r][c] -= factor * M[i][c];
            inv[r][c] -= factor * inv[i][c];
          }
        }
      }
    }

    return inv;
  }

  /**
   * Compute 6x6 Winding Conductance Matrix [G_branch]
   */
  computeBranchConductance(dt: number, fluxes: [number, number, number], isBE: boolean = false): number[][] {
    const L = this.computeInductanceMatrix(fluxes);
    const R_diag = [this.R_w1, this.R_w1, this.R_w1, this.R_w2, this.R_w2, this.R_w2];

    const factor = isBE ? 1.0 / dt : 2.0 / dt;
    const Z: number[][] = Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => {
        let val = factor * L[i][j];
        if (i === j) val += R_diag[i];
        return val;
      })
    );

    return this.invert6x6(Z);
  }

  /**
   * Terminal connection matrix [C] (6 branch rows x 8 terminal cols)
   * Terminals: [0: Pa, 1: Pb, 2: Pc, 3: Pn, 4: Sa, 5: Sb, 6: Sc, 7: Sn]
   */
  private getConnectionMatrix(): number[][] {
    const C: number[][] = Array.from({ length: 6 }, () => Array(8).fill(0));

    // Primary Connections
    if (this.primaryConn === 'Yg' || this.primaryConn === 'Y') {
      // Pri winding A: Pa - Pn
      C[0][0] = 1; C[0][3] = -1;
      // Pri winding B: Pb - Pn
      C[1][1] = 1; C[1][3] = -1;
      // Pri winding C: Pc - Pn
      C[2][2] = 1; C[2][3] = -1;
    } else {
      // Delta: A-B, B-C, C-A
      C[0][0] = 1; C[0][1] = -1;
      C[1][1] = 1; C[1][2] = -1;
      C[2][2] = 1; C[2][0] = -1;
    }

    // Secondary Connections
    if (this.secondaryConn === 'Yg' || this.secondaryConn === 'Y') {
      // Sec winding A: Sa - Sn
      C[3][4] = 1; C[3][7] = -1;
      // Sec winding B: Sb - Sn
      C[4][5] = 1; C[4][7] = -1;
      // Sec winding C: Sc - Sn
      C[5][6] = 1; C[5][7] = -1;
    } else {
      // Delta: Sa-Sb, Sb-Sc, Sc-Sa (standard ANSI 30 deg phase shift)
      C[3][4] = 1; C[3][5] = -1;
      C[4][5] = 1; C[4][6] = -1;
      C[5][6] = 1; C[5][4] = -1;
    }

    return C;
  }

  /**
   * Rebuild 8x8 terminal conductance matrix [G_term] = [C]^T [G_branch] [C]
   */
  rebuildTerminalConductance(dt: number, state: UmecState, isBE: boolean = false): void {
    const G_branch = this.computeBranchConductance(dt, state.flux, isBE);
    const C = this.getConnectionMatrix();

    // G_term = C^T * G_branch * C
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let sum = 0;
        for (let i = 0; i < 6; i++) {
          if (Math.abs(C[i][r]) > 1e-10) {
            for (let j = 0; j < 6; j++) {
              if (Math.abs(C[j][c]) > 1e-10) {
                sum += C[i][r] * G_branch[i][j] * C[j][c];
              }
            }
          }
        }
        this.G_term[r][c] = sum;
      }
    }
  }

  /**
   * Calculate companion history injections into 8 terminals:
   * I_hist_term = C^T * I_hist_branch
   */
  computeHistoryInjections(dt: number, state: UmecState, isBE: boolean = false): Float64Array {
    const G_branch = this.computeBranchConductance(dt, state.flux, isBE);
    const I_hist_branch = new Float64Array(6);

    for (let i = 0; i < 6; i++) {
      let sumGV = 0;
      for (let j = 0; j < 6; j++) {
        sumGV += G_branch[i][j] * state.prevBranchV[j];
      }
      if (isBE) {
        I_hist_branch[i] = -state.prevBranchI[i];
      } else {
        I_hist_branch[i] = -state.prevBranchI[i] - sumGV;
      }
    }

    const C = this.getConnectionMatrix();
    const I_hist_term = new Float64Array(8);

    for (let term = 0; term < 8; term++) {
      let sum = 0;
      for (let b = 0; b < 6; b++) {
        sum += C[b][term] * I_hist_branch[b];
      }
      I_hist_term[term] = sum;
    }

    return I_hist_term;
  }

  /**
   * Update internal state, branch voltages, currents, and core flux linkages
   */
  updateState(termVoltages: Float64Array, dt: number, state: UmecState): void {
    const C = this.getConnectionMatrix();
    const branchV = new Float64Array(6);

    for (let b = 0; b < 6; b++) {
      let v = 0;
      for (let t = 0; t < 8; t++) {
        v += C[b][t] * termVoltages[t];
      }
      branchV[b] = v;
    }

    // Integrate flux for each limb: phi_k = integral( (V_pri_k - R_w1 * i_pri_k) / N1 )
    for (let k = 0; k < 3; k++) {
      const e_induced = branchV[k] - this.R_w1 * state.prevBranchI[k];
      const dPhi = (e_induced / this.N1) * dt;
      state.flux[k] += dPhi;
    }

    // Check for inrush / core saturation
    const maxFluxPu = Math.max(...state.flux.map(f => Math.abs(f / this.baseFlux)));
    state.inrushDetected = maxFluxPu > this.kneeFluxPu;

    state.prevBranchV.set(branchV);
    state.prevTermV.set(termVoltages);
  }
}
