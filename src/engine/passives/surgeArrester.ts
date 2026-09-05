/**
 * PSCAD Modern - Metal Oxide Varistor (MOV) Non-Linear Surge Arrester Model (TypeScript)
 * 
 * Supports:
 * - Standard IEEE/IEC non-linear V-I power-law characteristic across 3 piecewise zones:
 *   1. Pre-breakdown / Leakage Zone (alpha ~ 4)
 *   2. Main non-linear Clamping Zone (alpha ~ 30-50)
 *   3. High-Current Upturn Zone (alpha ~ 8)
 * - Newton-Raphson Norton companion model linearization stamp (G_eq and I_hist)
 * - Thermal energy absorption accumulator E(t) = integral(v * i dt) and energy rating monitoring
 * - Lightning surge clamping for 8/20 us and 2/10 us impulse testing
 */

import type { ComponentParams } from '../../types';

export interface SurgeArresterState {
  prevV: number;           // Terminal voltage across arrester [V]
  prevI: number;           // Terminal current through arrester [A]
  energyAbsorbed_kJ: number;// Accumulated thermal energy [kJ]
  energyUtilizationPct: number;// % of rated energy absorption capability
  isConducting: boolean;   // True if active clamping in high-current zone
}

export class SurgeArrester {
  id: string;
  V_ref: number;           // Reference knee voltage [V] (e.g. 210 kV for 230 kV grid)
  I_ref: number;           // Reference current [A] (e.g. 1.0 A or 1000 A)
  alpha1: number;          // Low-current leakage exponent (default ~ 4.0)
  alpha2: number;          // Main clamping non-linear exponent (default ~ 32.0)
  alpha3: number;          // High-current upturn exponent (default ~ 8.0)
  energyRatingKJ: number;  // Rated energy capability [kJ]

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.V_ref = params.V_ref ?? params.voltage ?? 210000;
    this.I_ref = params.I_ref ?? 1.0;
    this.alpha1 = params.alpha1 ?? 4.0;
    this.alpha2 = params.alpha2 ?? 32.0;
    this.alpha3 = params.alpha3 ?? 8.0;
    this.energyRatingKJ = params.energyRatingKJ ?? 500.0; // 500 kJ default
  }

  initState(): SurgeArresterState {
    return {
      prevV: 0.0,
      prevI: 0.0,
      energyAbsorbed_kJ: 0.0,
      energyUtilizationPct: 0.0,
      isConducting: false,
    };
  }

  /**
   * Evaluate Non-linear Current I(V) and differential conductance dI/dV
   */
  evaluateVI(v: number): { I: number; dIdV: number } {
    const absV = Math.abs(v);
    const sign = v >= 0 ? 1.0 : -1.0;

    if (absV < 1.0) {
      // Extremely low voltage region (avoid division by 0)
      const G_leak_min = 1e-9;
      return { I: G_leak_min * v, dIdV: G_leak_min };
    }

    const vRatio = absV / this.V_ref;
    let alpha: number;
    let I_scale: number;

    if (vRatio <= 0.85) {
      // Zone 1: Leakage Region
      alpha = this.alpha1;
      I_scale = this.I_ref * Math.pow(0.85, this.alpha2 - this.alpha1);
    } else if (vRatio <= 1.15) {
      // Zone 2: Main Non-linear Clamping Region
      alpha = this.alpha2;
      I_scale = this.I_ref;
    } else {
      // Zone 3: High-Current Upturn Region
      alpha = this.alpha3;
      I_scale = this.I_ref * Math.pow(1.15, this.alpha2 - this.alpha3);
    }

    // Limit power exponent evaluation to prevent numerical IEEE float overflow
    const safePow = Math.min(1e12, Math.pow(vRatio, alpha));
    const I = sign * I_scale * safePow;
    const dIdV = Math.max(1e-8, Math.min(1e6, (alpha * I_scale / this.V_ref) * Math.pow(vRatio, alpha - 1)));

    return { I, dIdV };
  }

  /**
   * Compute Norton Companion Model Stamp { G, Ihist }
   * Linearization at operating point V_k:
   * G_eq = dI/dV
   * I_hist = I(V_k) - G_eq * V_k
   */
  computeCompanionStamp(state: SurgeArresterState): { G: number; Ihist: number } {
    const { I, dIdV } = this.evaluateVI(state.prevV);
    const G = dIdV;
    const Ihist = I - G * state.prevV;
    return { G, Ihist };
  }

  /**
   * Update Arrester State and Thermal Energy Absorption
   */
  updateState(v: number, dt: number, state: SurgeArresterState): void {
    const { I } = this.evaluateVI(v);
    
    // Thermal energy absorption: dE = v * i * dt
    const instantaneousPower = Math.abs(v * I);
    const energyDelta_kJ = (instantaneousPower * dt) / 1000.0;
    
    state.prevV = v;
    state.prevI = I;
    state.energyAbsorbed_kJ += energyDelta_kJ;
    state.energyUtilizationPct = (state.energyAbsorbed_kJ / Math.max(1.0, this.energyRatingKJ)) * 100.0;
    state.isConducting = Math.abs(I) > 10.0; // Conducting if current > 10 A
  }
}
