/**
 * PSCAD Modern - High-Frequency Transformer & Bushing Stray Capacitance Matrix
 * 
 * Features:
 * - Distributed and lumped stray capacitance network:
 *   - Primary-to-ground (C_pg), Secondary-to-ground (C_sg), Tertiary-to-ground (C_tg)
 *   - Primary-to-Secondary inter-winding (C_ps)
 *   - Series inter-turn winding capacitances (C_s1, C_s2)
 *   - High-voltage condenser bushings: C1 (conductor-to-tap) and C2 (tap-to-flange/ground)
 *   - Dielectric loss dissipation factor (tan delta) and high-frequency damping
 * - Full Nodal Capacitance Matrix [C_stray] & EMT Companion Conductance [G_C] = (2/dt) [C]
 * - Swept Frequency Response Analysis (SFRA - IEEE C57.149 / IEC 60076-18):
 *   - 20 Hz to 2 MHz logarithmic frequency sweep
 *   - Core deformation (< 2 kHz), Winding movement (2-100 kHz), and Bushing/Lead resonance (> 100 kHz)
 * - Lightning surge (1.2/50 us) and Very Fast Transient Overvoltage (VFTO) voltage division.
 */

export interface StrayCapacitanceParams {
  // Transformer stray capacitances [Farads]
  C_pg: number;       // Primary winding to ground (e.g. 1.8 nF)
  C_sg: number;       // Secondary winding to ground (e.g. 2.5 nF)
  C_ps: number;       // Primary to Secondary inter-winding (e.g. 2.2 nF)
  C_s1: number;       // Primary series inter-turn capacitance (e.g. 0.6 nF)
  C_s2: number;       // Secondary series inter-turn capacitance (e.g. 0.9 nF)

  // Condenser Bushing specifications
  C1_bushing: number; // Main conductor to test tap capacitance (e.g. 450 pF)
  C2_bushing: number; // Test tap to grounded flange capacitance (e.g. 2800 pF)
  tanDelta: number;   // Dielectric dissipation factor tan(delta) (e.g. 0.004 = 0.4%)
  R_damping: number;  // High frequency series damping resistance [Ohm] (e.g. 5.0 Ohm)

  // Nominal lumped winding inductances for SFRA Bode analysis
  L_mag: number;      // Core magnetizing inductance [H] (e.g. 45.0 H)
  L_leak: number;     // Winding leakage inductance [H] (e.g. 0.035 H)
  R_winding: number;  // Winding DC resistance [Ohm] (e.g. 0.25 Ohm)
}

export interface SfraFrequencyPoint {
  freqHz: number;
  magnitudeDb: number;
  phaseDeg: number;
  band: 'core_magnetics' | 'winding_movement' | 'stray_bushings';
}

export interface SfraScanResult {
  frequencies: number[];
  magnitudeDb: number[];
  phaseDeg: number[];
  resonancePeaks: Array<{ freqHz: number; peakDb: number; description: string }>;
  points: SfraFrequencyPoint[];
}

export const DEFAULT_STRAY_PARAMS: StrayCapacitanceParams = {
  C_pg: 1.8e-9,       // 1.8 nF
  C_sg: 2.5e-9,       // 2.5 nF
  C_ps: 2.2e-9,       // 2.2 nF
  C_s1: 0.6e-9,       // 0.6 nF
  C_s2: 0.9e-9,       // 0.9 nF
  C1_bushing: 450e-12,// 450 pF
  C2_bushing: 2800e-12,// 2.8 nF
  tanDelta: 0.004,    // 0.4%
  R_damping: 5.0,
  L_mag: 45.0,        // 45 H
  L_leak: 0.035,      // 35 mH
  R_winding: 0.25,    // 0.25 Ohm
};

export class TransformerStrayCapacitance {
  id: string;
  params: StrayCapacitanceParams;

  constructor(id: string, customParams: Partial<StrayCapacitanceParams> = {}) {
    this.id = id;
    this.params = { ...DEFAULT_STRAY_PARAMS, ...customParams };
  }

  /**
   * Constructs the 4x4 Nodal Capacitance Matrix [C_stray]
   * Node ordering: [0: Primary_Line, 1: Primary_Neutral, 2: Secondary_Line, 3: Bushing_Tap]
   * Ground is reference Node 0 (implicit).
   */
  computeNodalCapacitanceMatrix(): number[][] {
    const C = Array.from({ length: 4 }, () => Array(4).fill(0));

    const { C_pg, C_sg, C_ps, C_s1, C1_bushing, C2_bushing } = this.params;

    // Node 0: Primary Line
    // Connected to Ground (C_pg), Bushing Tap (C1_bushing), Pri Neutral (C_s1), Sec Line (C_ps)
    C[0][0] = C_pg + C1_bushing + C_s1 + C_ps;
    C[0][1] = -C_s1;
    C[0][2] = -C_ps;
    C[0][3] = -C1_bushing;

    // Node 1: Primary Neutral
    C[1][0] = -C_s1;
    C[1][1] = C_s1 + C_pg * 0.5;

    // Node 2: Secondary Line
    C[2][0] = -C_ps;
    C[2][2] = C_ps + C_sg;

    // Node 3: Bushing Tap
    C[3][0] = -C1_bushing;
    C[3][3] = C1_bushing + C2_bushing;

    return C;
  }

  /**
   * Computes EMT Companion Conductance Matrix [G_C] = (2 / dt) * [C_stray]
   */
  computeCompanionConductance(dt: number, isBE: boolean = false): number[][] {
    const C = this.computeNodalCapacitanceMatrix();
    const factor = isBE ? 1.0 / dt : 2.0 / dt;
    const G: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        G[i][j] = factor * C[i][j];
      }
    }

    return G;
  }

  /**
   * Compute companion history current injections: I_hist = -I_prev - G_C * V_prev
   */
  computeHistoryInjections(
    prevV: Float64Array,
    prevI: Float64Array,
    dt: number,
    isBE: boolean = false
  ): Float64Array {
    const G = this.computeCompanionConductance(dt, isBE);
    const I_hist = new Float64Array(4);

    for (let r = 0; r < 4; r++) {
      let sumGV = 0.0;
      for (let c = 0; c < 4; c++) {
        sumGV += G[r][c] * prevV[c];
      }
      if (isBE) {
        I_hist[r] = -prevI[r];
      } else {
        I_hist[r] = -prevI[r] - sumGV;
      }
    }

    return I_hist;
  }

  /**
   * Swept Frequency Response Analysis (SFRA) Simulation Engine
   * Evaluates end-to-end open-circuit transfer function H(jw) = V_out(w) / V_in(w) [dB]
   * across logarithmic range from 20 Hz to 2 MHz (standard SFRA test).
   */
  computeSFRA(
    fStartHz: number = 20,
    fEndHz: number = 2e6,
    numPoints: number = 300,
    faultType: 'healthy' | 'core_displacement' | 'winding_deformation' | 'bushing_degradation' = 'healthy'
  ): SfraScanResult {
    let Lm = this.params.L_mag;
    let Lk = this.params.L_leak;
    let Rw = this.params.R_winding;
    let Cps = this.params.C_ps;
    let Cpg = this.params.C_pg;
    let Csg = this.params.C_sg;
    let Cs1 = this.params.C_s1;
    let C1 = this.params.C1_bushing;

    // Apply fault signature perturbations
    if (faultType === 'core_displacement') {
      // Core grounding / residual flux decreases effective magnetizing inductance
      Lm *= 0.25;
    } else if (faultType === 'winding_deformation') {
      // Radial / axial deformation increases leakage inductance and alters inter-winding capacitance
      Lk *= 1.45;
      Cps *= 0.65;
      Cs1 *= 1.30;
    } else if (faultType === 'bushing_degradation') {
      // Bushing moisture / layer breakdown increases C1 capacitance and tan(delta)
      C1 *= 1.25;
      Cpg *= 1.20;
    }

    const logStart = Math.log10(fStartHz);
    const logEnd = Math.log10(fEndHz);
    const step = (logEnd - logStart) / (numPoints - 1);

    const frequencies: number[] = [];
    const magnitudeDb: number[] = [];
    const phaseDeg: number[] = [];
    const points: SfraFrequencyPoint[] = [];

    for (let i = 0; i < numPoints; i++) {
      const freq = Math.pow(10, logStart + i * step);
      const omega = 2 * Math.PI * freq;

      // Complex branch admittances
      // 1. Core Branch: Y_core = 1 / (Rw + j*w*Lm)
      const denomCore = Rw * Rw + omega * omega * Lm * Lm;
      const G_core = Rw / denomCore;
      const B_core = -(omega * Lm) / denomCore;

      // 2. Leakage Branch: Y_leak = 1 / (Rw + j*w*Lk)
      const denomLeak = Rw * Rw + omega * omega * Lk * Lk;
      const G_leak = Rw / denomLeak;
      const B_leak = -(omega * Lk) / denomLeak;

      // 3. Shunt Capacitances: Y_C = j*w*C + w*C*tanDelta
      const G_c_pg = omega * Cpg * this.params.tanDelta;
      const B_c_pg = omega * Cpg;

      const G_c_ps = omega * Cps * this.params.tanDelta;
      const B_c_ps = omega * Cps;

      const G_c_sg = omega * Csg * this.params.tanDelta;
      const B_c_sg = omega * Csg;

      const G_c_s1 = omega * Cs1 * this.params.tanDelta;
      const B_c_s1 = omega * Cs1;

      // Total series branch admittance: Y_series = Y_leak + Y_c_s1 + Y_c_ps
      const G_series = G_leak + G_c_s1 + G_c_ps;
      const B_series = B_leak + B_c_s1 + B_c_ps;

      // Total shunt load branch admittance: Y_shunt = Y_core + Y_c_pg + Y_c_sg + 1/50 (50 Ohm receiver)
      const G_shunt = G_core + G_c_pg + G_c_sg + 0.02;
      const B_shunt = B_core + B_c_pg + B_c_sg;

      // Transfer voltage division: H(jw) = Y_series / (Y_series + Y_shunt)
      const numR = G_series;
      const numI = B_series;
      const denR = G_series + G_shunt;
      const denI = B_series + B_shunt;

      const denMag2 = denR * denR + denI * denI;
      const H_real = (numR * denR + numI * denI) / denMag2;
      const H_imag = (numI * denR - numR * denI) / denMag2;

      const mag = Math.sqrt(H_real * H_real + H_imag * H_imag);
      const magDb = 20 * Math.log10(Math.max(1e-8, mag));
      const phase = (Math.atan2(H_imag, H_real) * 180) / Math.PI;

      let band: 'core_magnetics' | 'winding_movement' | 'stray_bushings' = 'core_magnetics';
      if (freq >= 2000 && freq < 100000) {
        band = 'winding_movement';
      } else if (freq >= 100000) {
        band = 'stray_bushings';
      }

      frequencies.push(freq);
      magnitudeDb.push(magDb);
      phaseDeg.push(phase);
      points.push({ freqHz: freq, magnitudeDb: magDb, phaseDeg: phase, band });
    }

    // Detect Resonance & Anti-Resonance Peaks/Notches
    const resonancePeaks: Array<{ freqHz: number; peakDb: number; description: string }> = [];
    for (let i = 1; i < magnitudeDb.length - 1; i++) {
      const isPeak = magnitudeDb[i] > magnitudeDb[i - 1] && magnitudeDb[i] > magnitudeDb[i + 1];
      const isNotch = magnitudeDb[i] < magnitudeDb[i - 1] && magnitudeDb[i] < magnitudeDb[i + 1];

      if (isPeak || isNotch) {
        const f = frequencies[i];
        let desc = isPeak ? 'Core / Magnetics Resonance' : 'Inductive-Capacitive Anti-Resonance Notch';
        if (f >= 2000 && f < 100000) {
          desc = isPeak ? 'Winding Inductive-Capacitive Resonance' : 'Winding Radial/Axial Movement Notch';
        } else if (f >= 100000) {
          desc = isPeak ? 'High-Frequency Bushing / Stray Lead Resonance' : 'HF Capacitive Inter-Turn Notch';
        }
        resonancePeaks.push({ freqHz: f, peakDb: magnitudeDb[i], description: desc });
      }
    }



    return { frequencies, magnitudeDb, phaseDeg, resonancePeaks, points };
  }

  /**
   * Condenser Bushing Voltage Division under high voltage test
   * V_tap = V_conductor * (C1 / (C1 + C2))
   */
  computeBushingTapVoltage(V_conductor: number): { V_tap: number; divisionRatio: number } {
    const ratio = this.params.C1_bushing / (this.params.C1_bushing + this.params.C2_bushing);
    return {
      V_tap: V_conductor * ratio,
      divisionRatio: ratio,
    };
  }
}
