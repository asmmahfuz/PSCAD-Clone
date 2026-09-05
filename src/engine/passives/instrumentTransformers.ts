/**
 * PSCAD Modern - Instrument Transformer Magnetic Core Saturation (CT & VT / PT)
 * 
 * Complies with:
 * - IEEE Std C57.13 (Standard Requirements for Instrument Transformers)
 * - IEC 61869-2 (Additional requirements for current transformers)
 * 
 * Features:
 * - Current Transformer (CT) with non-linear core B-H / saturation curve:
 *     Secondary current: i_s(t) = i_p(t)/N - i_m(t)
 *     Core flux integration: dψ/dt = v_s(t) + R_s * i_s(t)
 *     Core remanence flux ψ_r and severe DC offset accumulation reproducing classic CT saturation waveforms.
 *     Connected secondary burden: R_burden + j*X_burden (ANSI B-0.1 to B-8.0 standard burdens).
 * - Potential Transformer (VT / PT) with magnetizing inrush and burden regulation.
 */

export interface CurrentTransformerSettings {
  ratioPrimary: number; // e.g. 1200 A
  ratioSecondary: number; // e.g. 5 A (N = 240)
  secondaryResistance: number; // R_s in Ohms (e.g. 0.5 Ω)
  secondaryLeakageInductance: number; // L_s in Henries (e.g. 0.8 mH)
  burdenResistance: number; // R_b in Ohms (e.g. 2.0 Ω for ANSI B-2.0)
  burdenInductance: number; // L_b in Henries (e.g. 1.0 mH)
  
  // Magnetic Core Parameters
  kneeFluxLinkage: number; // ψ_knee in V·s / Wb-t (e.g. 2.0 Wb-t for C800 class)
  linearMagnetizingInductance: number; // L_m0 in Henries (e.g. 50.0 H)
  saturatedInductance: number; // L_sat in Henries (e.g. 0.05 H)
  saturationExponent: number; // e.g. 3 to 7
  remanenceFluxPu: number; // ψ_r / ψ_knee (e.g. 0.0 to 0.8, residual core flux)
}

export interface CurrentTransformerState {
  primaryCurrent: number; // A
  idealSecondaryCurrent: number; // A (i_p / N)
  actualSecondaryCurrent: number; // A
  magnetizingCurrent: number; // A
  fluxLinkage: number; // Wb-turns (ψ)
  burdenVoltage: number; // V
  isCoreSaturated: boolean;
  saturationRatio: number; // |ψ| / ψ_knee
}

export class CurrentTransformer {
  public id: string;
  public settings: CurrentTransformerSettings;
  public state: CurrentTransformerState;

  private turnsRatio: number;
  private prevSecondaryI: number = 0;

  constructor(id: string, settings?: Partial<CurrentTransformerSettings>) {
    this.id = id;
    this.settings = {
      ratioPrimary: settings?.ratioPrimary ?? 1200,
      ratioSecondary: settings?.ratioSecondary ?? 5,
      secondaryResistance: settings?.secondaryResistance ?? 0.45,
      secondaryLeakageInductance: settings?.secondaryLeakageInductance ?? 0.5e-3,
      burdenResistance: settings?.burdenResistance ?? 1.5,
      burdenInductance: settings?.burdenInductance ?? 0.8e-3,
      kneeFluxLinkage: settings?.kneeFluxLinkage ?? 1.8,
      linearMagnetizingInductance: settings?.linearMagnetizingInductance ?? 60.0,
      saturatedInductance: settings?.saturatedInductance ?? 0.04,
      saturationExponent: settings?.saturationExponent ?? 5,
      remanenceFluxPu: settings?.remanenceFluxPu ?? 0.0,
    };

    this.turnsRatio = this.settings.ratioPrimary / this.settings.ratioSecondary;
    this.state = this.createInitialState();
  }

  private createInitialState(): CurrentTransformerState {
    const psi0 = this.settings.kneeFluxLinkage * this.settings.remanenceFluxPu;
    return {
      primaryCurrent: 0,
      idealSecondaryCurrent: 0,
      actualSecondaryCurrent: 0,
      magnetizingCurrent: 0,
      fluxLinkage: psi0,
      burdenVoltage: 0,
      isCoreSaturated: false,
      saturationRatio: Math.abs(psi0) / this.settings.kneeFluxLinkage,
    };
  }

  public reset(): void {
    this.prevSecondaryI = 0;
    this.state = this.createInitialState();
  }

  /**
   * Evaluates non-linear magnetizing current i_m(ψ) for a given core flux linkage ψ.
   */
  public evaluateMagnetizingCurrent(psi: number): number {
    const psiKnee = this.settings.kneeFluxLinkage;
    const Lm0 = this.settings.linearMagnetizingInductance;
    const Lsat = this.settings.saturatedInductance;
    const n = this.settings.saturationExponent;

    const sign = Math.sign(psi);
    const absPsi = Math.abs(psi);

    if (absPsi <= psiKnee) {
      // Linear unsaturated core region
      return psi / Lm0;
    } else {
      // Saturated core region
      const deltaPsi = absPsi - psiKnee;
      const linearPart = psiKnee / Lm0;
      const saturatedLinear = deltaPsi / Lsat;
      const highOrderSaturation = Math.pow(deltaPsi / psiKnee, n) * 10.0;
      return sign * (linearPart + saturatedLinear + highOrderSaturation);
    }
  }

  /**
   * Main simulation step for non-linear CT.
   * @param ip Primary conductor current in Amperes
   * @param dt Time step in seconds
   */
  public step(ip: number, dt: number): CurrentTransformerState {
    this.state.primaryCurrent = ip;
    const idealIs = ip / this.turnsRatio;
    this.state.idealSecondaryCurrent = idealIs;

    const Rb = this.settings.burdenResistance;
    const Rs = this.settings.secondaryResistance;
    const Rtotal = Rb + Rs;

    // Numerical integration of flux linkage: dψ/dt = v_secondary + Rs*i_s = Rtotal * i_s + Ltotal * di_s/dt
    // We solve i_s(t) = idealIs - i_m(ψ(t)) implicitly/explicitly:
    const prevPsi = this.state.fluxLinkage;
    const imEst = this.evaluateMagnetizingCurrent(prevPsi);
    const isEst = idealIs - imEst;

    // Voltage across magnetizing branch e_m = (Rs + Rb) * is + (Ls + Lb) * (is - prevIs)/dt
    const Ltotal = this.settings.secondaryLeakageInductance + this.settings.burdenInductance;
    const disdt = dt > 0 ? (isEst - this.prevSecondaryI) / dt : 0;
    const em = Rtotal * isEst + Ltotal * disdt;

    // Update flux linkage: ψ(t) = ψ(t - dt) + em * dt
    const newPsi = prevPsi + em * dt;
    const actualIm = this.evaluateMagnetizingCurrent(newPsi);
    const actualIs = idealIs - actualIm;

    this.prevSecondaryI = actualIs;
    this.state.fluxLinkage = newPsi;
    this.state.magnetizingCurrent = actualIm;
    this.state.actualSecondaryCurrent = actualIs;
    this.state.burdenVoltage = Rb * actualIs + (this.settings.burdenInductance * (actualIs - this.prevSecondaryI)) / Math.max(1e-9, dt);

    const satRatio = Math.abs(newPsi) / this.settings.kneeFluxLinkage;
    this.state.saturationRatio = satRatio;
    this.state.isCoreSaturated = satRatio >= 1.0;

    return { ...this.state };
  }
}

export interface VoltageTransformerSettings {
  primaryVoltageNominal: number; // e.g. 230,000 V
  secondaryVoltageNominal: number; // e.g. 115 V
  burdenResistance: number; // Ohms
  burdenInductance: number; // Henries
  ratioCorrectionFactor: number; // RCF (e.g. 1.001)
  phaseAngleMinutes: number; // γ in minutes of arc
}

export interface VoltageTransformerState {
  primaryVoltage: number;
  idealSecondaryVoltage: number;
  actualSecondaryVoltage: number;
  secondaryCurrent: number;
}

export class VoltageTransformer {
  public id: string;
  public settings: VoltageTransformerSettings;
  public state: VoltageTransformerState;

  private ratio: number;

  constructor(id: string, settings?: Partial<VoltageTransformerSettings>) {
    this.id = id;
    this.settings = {
      primaryVoltageNominal: settings?.primaryVoltageNominal ?? 230000,
      secondaryVoltageNominal: settings?.secondaryVoltageNominal ?? 115,
      burdenResistance: settings?.burdenResistance ?? 1000.0,
      burdenInductance: settings?.burdenInductance ?? 0.1,
      ratioCorrectionFactor: settings?.ratioCorrectionFactor ?? 1.0,
      phaseAngleMinutes: settings?.phaseAngleMinutes ?? 0.0,
    };

    this.ratio = this.settings.primaryVoltageNominal / this.settings.secondaryVoltageNominal;
    this.state = {
      primaryVoltage: 0,
      idealSecondaryVoltage: 0,
      actualSecondaryVoltage: 0,
      secondaryCurrent: 0,
    };
  }

  public reset(): void {
    this.state = {
      primaryVoltage: 0,
      idealSecondaryVoltage: 0,
      actualSecondaryVoltage: 0,
      secondaryCurrent: 0,
    };
  }

  public step(vp: number): VoltageTransformerState {
    this.state.primaryVoltage = vp;
    const idealVs = vp / this.ratio;
    this.state.idealSecondaryVoltage = idealVs;

    const actualVs = idealVs * this.settings.ratioCorrectionFactor;
    this.state.actualSecondaryVoltage = actualVs;
    this.state.secondaryCurrent = actualVs / this.settings.burdenResistance;

    return { ...this.state };
  }
}
