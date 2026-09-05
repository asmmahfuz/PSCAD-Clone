/**
 * PSCAD Modern - Sheath Cross-Bonding & Sheath Voltage Limiter (SVL) Engine
 * 
 * Implements CIGRE / IEEE 575 standard metallic sheath cross-bonding calculations:
 * - Major section divided into 3 transposed minor sections (A->B->C->A)
 * - Induced sheath EMF and standing voltage profile Vs(x) along route length
 * - Sheath circulating current suppression under balanced & unbalanced section lengths
 * - Non-linear Sheath Voltage Limiter (SVL) MOV surge arrester companion model
 * - Transient overvoltage clamping and energy dissipation during lightning/switching surges
 */

export interface CrossBondingConfig {
  cableSystemVoltageKv: number;
  routeLengthKm: number;
  minorSectionLengthsKm: [number, number, number]; // [L1, L2, L3]
  loadCurrentA: number;
  loadPowerFactor: number;
  phaseSpacingM: number;
  layoutType: 'flat' | 'trefoil';
  sheathRadiusMm: number;
  sheathResistancePerKm: number;
  groundingResistanceOhm: number;
  
  // SVL Arrester parameters
  svlRatedVoltageKv: number;        // e.g. 3 kV, 6 kV, 12 kV
  svlRefCurrentA: number;           // 1000 A reference
  svlNonLinearExponentAlpha: number;// Typically 25 - 40
  svlMaxEnergyRatingKj: number;     // Energy absorption capability
}

export interface StandingVoltagePoint {
  xKm: number;
  section: 1 | 2 | 3;
  phaseA_V: number;
  phaseB_V: number;
  phaseC_V: number;
}

export interface CrossBondingResult {
  isBalanced: boolean;
  lengthImbalancePercent: number;
  mutualInductanceM_uH_per_km: number;
  inducedEmfGradient_V_per_km_per_kA: number;
  maxStandingVoltageV: number;
  standingVoltageProfile: StandingVoltagePoint[];
  
  // Sheath currents
  sheathCirculatingCurrentA: number;
  sheathLossReductionPercent: number; // vs solidly bonded (~95 - 99%)
  
  // SVL Protection State
  svlTripThresholdV: number;
  svlClampingVoltageAt10kA_V: number;
  svlHealthy: boolean;
}

const MU_0 = 4 * Math.PI * 1e-7;

export class CrossBondingEngine {
  /**
   * Evaluates cross-bonding sheath voltage profiles and circulating currents
   */
  public static evaluate(config: CrossBondingConfig, freqHz: number = 60): CrossBondingResult {
    const omega = 2 * Math.PI * freqHz;
    const [L1, L2, L3] = config.minorSectionLengthsKm;
    const totalL = L1 + L2 + L3;

    const avgL = totalL / 3;
    const maxDiffL = Math.max(Math.abs(L1 - avgL), Math.abs(L2 - avgL), Math.abs(L3 - avgL));
    const imbalancePct = (maxDiffL / Math.max(0.01, avgL)) * 100;
    const isBalanced = imbalancePct < 3.0; // Under 3% difference is considered balanced

    // Mutual inductance between core and sheath (H/km)
    // In flat layout, average spacing S_eq = cbrt(S * S * 2S) = 1.26 * S
    const S_eff = config.layoutType === 'flat' ? 1.26 * config.phaseSpacingM : config.phaseSpacingM;
    const r_sh_m = config.sheathRadiusMm * 1e-3;
    const M_per_m = (MU_0 / (2 * Math.PI)) * Math.log(Math.max(1.05, S_eff / r_sh_m));
    const M_per_km = M_per_m * 1000; // H/km

    // Induced EMF gradient per km per kA
    const emfGradient_V_km_kA = omega * M_per_km * 1000; // V / (km * kA)
    const emfGradient_V_km = omega * M_per_km * config.loadCurrentA; // V/km

    // Calculate voltage profile across 3 minor sections
    const points: StandingVoltagePoint[] = [];
    const numSteps = 60;
    const dx = totalL / numSteps;

    let maxVs = 0;

    for (let step = 0; step <= numSteps; step++) {
      const x = step * dx;
      let sec: 1 | 2 | 3;
      let vsA = 0;
      let vsB = 0;
      let vsC = 0;

      if (x <= L1) {
        sec = 1;
        vsA = emfGradient_V_km * x;
        vsB = emfGradient_V_km * x;
        vsC = emfGradient_V_km * x;
      } else if (x <= L1 + L2) {
        sec = 2;
        const xRel = x - L1;
        // Transposition: Phase A sheath connects to Phase B, etc.
        vsA = Math.hypot(emfGradient_V_km * L1 * Math.cos(0) + emfGradient_V_km * xRel * Math.cos(-2 * Math.PI / 3),
                         emfGradient_V_km * L1 * Math.sin(0) + emfGradient_V_km * xRel * Math.sin(-2 * Math.PI / 3));
        vsB = vsA;
        vsC = vsA;
      } else {
        sec = 3;
        const xRel = x - (L1 + L2);
        // Complete transposition to 3rd phase: sum of 3 vectors
        const vReal = emfGradient_V_km * L1 * Math.cos(0) +
                      emfGradient_V_km * L2 * Math.cos(-2 * Math.PI / 3) +
                      emfGradient_V_km * xRel * Math.cos(2 * Math.PI / 3);
        const vImag = emfGradient_V_km * L1 * Math.sin(0) +
                      emfGradient_V_km * L2 * Math.sin(-2 * Math.PI / 3) +
                      emfGradient_V_km * xRel * Math.sin(2 * Math.PI / 3);
        vsA = Math.hypot(vReal, vImag);
        vsB = vsA;
        vsC = vsA;
      }

      if (vsA > maxVs) maxVs = vsA;

      points.push({
        xKm: parseFloat(x.toFixed(3)),
        section: sec,
        phaseA_V: parseFloat(vsA.toFixed(2)),
        phaseB_V: parseFloat(vsB.toFixed(2)),
        phaseC_V: parseFloat(vsC.toFixed(2)),
      });
    }

    // Residual circulating EMF across major section
    const emfResidualReal = emfGradient_V_km * (L1 + L2 * Math.cos(-2 * Math.PI / 3) + L3 * Math.cos(2 * Math.PI / 3));
    const emfResidualImag = emfGradient_V_km * (L2 * Math.sin(-2 * Math.PI / 3) + L3 * Math.sin(2 * Math.PI / 3));
    const deltaEmf = Math.hypot(emfResidualReal, emfResidualImag);

    // Sheath loop impedance (3 sections in series + ground resistances)
    const R_sheath_total = config.sheathResistancePerKm * totalL + 2 * config.groundingResistanceOhm;
    const X_sheath_total = omega * M_per_km * totalL;
    const Z_sheath_loop = Math.hypot(R_sheath_total, X_sheath_total);

    const I_circ = deltaEmf / Math.max(0.01, Z_sheath_loop);

    // Without cross-bonding (solidly bonded), circulating current would be ~ 0.4 - 0.7 * I_load
    const I_solid_est = (emfGradient_V_km * totalL) / Z_sheath_loop;
    const lossReductionPct = Math.max(0, Math.min(99.9, (1 - Math.pow(I_circ / Math.max(0.1, I_solid_est), 2)) * 100));

    // Sheath Voltage Limiter (SVL) Characteristics
    const vRef = config.svlRatedVoltageKv * 1000;
    const alpha = config.svlNonLinearExponentAlpha;
    const iRef = config.svlRefCurrentA;

    // Clamping voltage at 10 kA lightning surge: V_clamp = V_ref * (10000 / I_ref)^(1/alpha)
    const vClamp10kA = vRef * Math.pow(10000 / iRef, 1 / alpha);

    return {
      isBalanced,
      lengthImbalancePercent: parseFloat(imbalancePct.toFixed(2)),
      mutualInductanceM_uH_per_km: parseFloat((M_per_km * 1e6).toFixed(2)),
      inducedEmfGradient_V_per_km_per_kA: parseFloat(emfGradient_V_km_kA.toFixed(2)),
      maxStandingVoltageV: parseFloat(maxVs.toFixed(2)),
      standingVoltageProfile: points,
      sheathCirculatingCurrentA: parseFloat(I_circ.toFixed(3)),
      sheathLossReductionPercent: parseFloat(lossReductionPct.toFixed(1)),
      svlTripThresholdV: vRef,
      svlClampingVoltageAt10kA_V: parseFloat(vClamp10kA.toFixed(1)),
      svlHealthy: maxVs < vRef * 0.7, // Standing voltage must remain well below SVL continuous conduction threshold
    };
  }

  /**
   * Instantaneous non-linear SVL companion model for time-domain EMTDC solvers
   */
  public static svlCurrent(voltage: number, vRef: number = 6000, iRef: number = 1000, alpha: number = 30): number {
    const absV = Math.abs(voltage);
    if (absV < 1e-3) return 0;
    const sign = voltage >= 0 ? 1 : -1;
    return sign * iRef * Math.pow(absV / vRef, alpha);
  }
}
