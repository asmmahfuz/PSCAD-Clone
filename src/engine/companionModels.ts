/**
 * PSCAD CLONE - EMTDC Norton Companion Models
 * 
 * Supports:
 * - Standard Trapezoidal integration companion models (second-order accurate)
 * - Critical Damping Adjustment (CDA) Backward Euler half-step companion models (L-stable)
 * - Diodes and power semiconductor switch models with forward drop and sub-step commutation
 */

import type { ComponentParams } from '../types';

export class CompanionModels {
  // --- Resistor ---
  static Resistor(R: number): { G: number; Ihist: number } {
    const safeR = Math.max(R, 1e-6);
    return { G: 1.0 / safeR, Ihist: 0.0 };
  }

  // --- Inductor (Trapezoidal) ---
  static Inductor(L: number, dt: number, prevI: number = 0, prevV: number = 0): { G: number; Ihist: number } {
    const safeL = Math.max(L, 1e-9);
    const G = dt / (2.0 * safeL);
    const Ihist = prevI + G * prevV;
    return { G, Ihist };
  }

  // --- Inductor (Backward Euler / CDA) ---
  static InductorBE(L: number, dtSub: number, prevI: number = 0): { G: number; Ihist: number } {
    const safeL = Math.max(L, 1e-9);
    const G = dtSub / safeL;
    const Ihist = prevI;
    return { G, Ihist };
  }

  // --- Capacitor (Trapezoidal) ---
  static Capacitor(C: number, dt: number, prevI: number = 0, prevV: number = 0): { G: number; Ihist: number } {
    const safeC = Math.max(C, 1e-12);
    const G = (2.0 * safeC) / dt;
    const Ihist = -prevI - G * prevV;
    return { G, Ihist };
  }

  // --- Capacitor (Backward Euler / CDA) ---
  static CapacitorBE(C: number, dtSub: number, prevV: number = 0): { G: number; Ihist: number } {
    const safeC = Math.max(C, 1e-12);
    const G = safeC / dtSub;
    const Ihist = -G * prevV;
    return { G, Ihist };
  }

  // --- AC Voltage Source ---
  static ACSource(params: ComponentParams, t: number, accumulatedPhase?: number): { Vinstant: number; G: number; Inorton: number } {
    const voltage = params.voltage ?? 230000;
    const isRms = params.isRms ?? true;
    const freq = params.freq ?? 60;
    const phaseDeg = params.phaseDeg ?? 0;
    const rampTime = params.rampTime ?? 0.02;
    const internalRs = Math.max(params.internalRs ?? 0.05, 1e-4);

    const Vpeak = isRms ? voltage * Math.SQRT2 : voltage;
    const phaseRad = (phaseDeg * Math.PI) / 180.0;
    const totalAngle = accumulatedPhase !== undefined ? accumulatedPhase + phaseRad : 2.0 * Math.PI * freq * t + phaseRad;

    let ramp = 1.0;
    if (rampTime > 0 && t < rampTime) {
      ramp = 0.5 * (1.0 - Math.cos((Math.PI * t) / rampTime));
    }

    const Vinstant = Vpeak * Math.sin(totalAngle) * ramp;
    const G = 1.0 / internalRs;
    const Inorton = Vinstant * G;

    return { Vinstant, G, Inorton };
  }

  // --- DC Voltage Source ---
  static DCSource(params: ComponentParams, t: number): { Vinstant: number; G: number; Inorton: number } {
    const voltage = params.voltage ?? 500;
    const rampTime = params.rampTime ?? 0.005;
    const internalRs = Math.max(params.internalRs ?? 0.02, 1e-4);

    let ramp = 1.0;
    if (rampTime > 0 && t < rampTime) {
      ramp = t / rampTime;
    }

    const Vinstant = voltage * ramp;
    const G = 1.0 / internalRs;
    const Inorton = Vinstant * G;

    return { Vinstant, G, Inorton };
  }

  // --- Breaker / Switch ---
  static Breaker(isClosed: boolean, Ron: number = 0.0001, Roff: number = 1e7): { G: number } {
    const G = isClosed ? 1.0 / Math.max(Ron, 1e-5) : 1.0 / Math.max(Roff, 1e4);
    return { G };
  }

  // --- Diode ---
  static Diode(isOn: boolean, Ron: number = 0.001, Roff: number = 1e6, Vf: number = 0.7): { G: number; Inorton: number } {
    const safeRon = Math.max(Ron, 1e-5);
    const safeRoff = Math.max(Roff, 1e3);
    const G = isOn ? 1.0 / safeRon : 1.0 / safeRoff;
    const Inorton = isOn ? -Vf * G : 0.0;
    return { G, Inorton };
  }

  // --- Distributed Pi-Line Section ---
  static PiLineSection(params: ComponentParams, dt: number, prevStates: any, isBE: boolean = false): any {
    const lengthKm = params.lengthKm ?? 100;
    const R_per_km = params.R_per_km ?? 0.03;
    const L_per_km = params.L_per_km ?? 0.001;
    const C_per_km = params.C_per_km ?? 0.012e-6;

    const R_total = Math.max(R_per_km * lengthKm, 1e-5);
    const L_total = Math.max(L_per_km * lengthKm, 1e-8);
    const C_half = (C_per_km * lengthKm) / 2.0;

    let G_L: number;
    let I_hist_L: number;
    const prevI_L = prevStates.i_series || 0.0;
    const prevV_L = prevStates.v_L || 0.0;

    if (isBE) {
      G_L = dt / L_total;
      I_hist_L = prevI_L;
    } else {
      G_L = dt / (2.0 * L_total);
      I_hist_L = prevI_L + G_L * prevV_L;
    }

    const Req = R_total + 1.0 / G_L;
    const G_series = 1.0 / Req;
    const I_hist_series = (1.0 / (Req * G_L)) * I_hist_L;

    let G_shunt: number;
    let I_hist_C1: number;
    let I_hist_C2: number;

    if (isBE) {
      G_shunt = C_half / dt;
      I_hist_C1 = -G_shunt * (prevStates.v_c1 || 0.0);
      I_hist_C2 = -G_shunt * (prevStates.v_c2 || 0.0);
    } else {
      G_shunt = (2.0 * C_half) / dt;
      I_hist_C1 = -(prevStates.i_c1 || 0.0) - G_shunt * (prevStates.v_c1 || 0.0);
      I_hist_C2 = -(prevStates.i_c2 || 0.0) - G_shunt * (prevStates.v_c2 || 0.0);
    }

    return { G_series, I_hist_series, G_shunt, I_hist_C1, I_hist_C2 };
  }

  // --- Single Phase Saturable Transformer ---
  static Transformer1Ph(params: ComponentParams, dt: number, prevStates: any, isBE: boolean = false): any {
    const V1_nom = params.V1_nom ?? 230000;
    const V2_nom = params.V2_nom ?? 69000;
    const MVA_rating = params.MVA_rating ?? 100;
    const leakageReactancePu = params.leakageReactancePu ?? 0.10;
    const windingLossPu = params.windingLossPu ?? 0.005;
    const frequency = params.freq ?? 60;
    const enableSaturation = params.enableSaturation ?? true;
    const kneeFluxPu = params.kneeFluxPu ?? 1.15;

    const turnsRatio = V1_nom / V2_nom;
    const Z_base1 = (V1_nom * V1_nom) / (MVA_rating * 1e6);
    const omega = 2.0 * Math.PI * frequency;

    const L_leak = (leakageReactancePu * Z_base1) / omega;
    const R_wind = windingLossPu * Z_base1;

    let G_L: number;
    let I_hist_L: number;
    const prevI = prevStates.i_leak || 0.0;
    const prevV = prevStates.v_leak || 0.0;

    if (isBE) {
      G_L = dt / L_leak;
      I_hist_L = prevI;
    } else {
      G_L = dt / (2.0 * L_leak);
      I_hist_L = prevI + G_L * prevV;
    }

    const Req = R_wind + 1.0 / G_L;
    const G_leak = 1.0 / Req;
    const I_hist_leak = (1.0 / (Req * G_L)) * I_hist_L;

    let L_m = L_leak * 150.0;
    const prevFlux = prevStates.flux || 0.0;
    const baseFlux = (V1_nom * Math.SQRT2) / omega;
    const fluxPu = Math.abs(prevFlux / baseFlux);

    if (enableSaturation && fluxPu > kneeFluxPu) {
      const satRatio = 1.0 + (fluxPu - kneeFluxPu) * 8.0;
      L_m = L_m / satRatio;
    }

    let G_m: number;
    let I_hist_m: number;
    const prevI_m = prevStates.i_m || 0.0;
    const prevV_m = prevStates.v_m || 0.0;

    if (isBE) {
      G_m = dt / L_m;
      I_hist_m = prevI_m;
    } else {
      G_m = dt / (2.0 * L_m);
      I_hist_m = prevI_m + G_m * prevV_m;
    }

    return { turnsRatio, G_leak, I_hist_leak, G_m, I_hist_m, L_leak, R_wind, baseFlux };
  }

  // --- Synchronous Machine (Park's Framework) ---
  static SynchronousMachine(params: ComponentParams, dt: number, state: any, terminalV: number, terminalI: number): any {
    const Sn_MVA = params.Sn_MVA ?? 100;
    const Vn_kV = params.Vn_kV ?? 13.8;
    const freq = params.freq ?? 60;
    const H = params.H ?? 3.5;
    const D = params.D ?? 1.5;
    const Xd_prime = params.Xd_prime ?? 0.25;
    const Ra = 0.003;
    const AVR_gain = params.AVR_gain ?? 20;
    const AVR_time_const = 0.05;
    const Gov_droop = 0.05;

    const omega_sync = 2.0 * Math.PI * freq;
    const Z_base = (Vn_kV * 1000 * Vn_kV * 1000) / (Sn_MVA * 1e6);
    const Xd_prime_ohm = Xd_prime * Z_base;
    const Ra_ohm = Ra * Z_base;
    const Ld_prime = Xd_prime_ohm / omega_sync;

    let delta = state.delta || 0.0;
    let omega_pu = state.omega_pu || 1.0;
    let E_prime = state.E_prime || (Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3);
    let Tm_pu = state.Tm_pu || 1.0;
    let Vf = state.Vf || 1.0;

    const Pe_pu = Math.max(0.0, (terminalV * terminalI) / ((Sn_MVA * 1e6) / 3));

    const targetTm = 1.0 - (1.0 / Gov_droop) * (omega_pu - 1.0);
    Tm_pu += (targetTm - Tm_pu) * (dt / 0.2);

    const V_ref_pu = 1.0;
    const V_term_pu = terminalV / ((Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3));
    const targetVf = 1.0 + AVR_gain * (V_ref_pu - V_term_pu);
    Vf += (Math.max(0.2, Math.min(3.0, targetVf)) - Vf) * (dt / AVR_time_const);
    E_prime = ((Vn_kV * 1000 * Math.SQRT2) / Math.sqrt(3)) * Vf;

    const dOmega_dt = (Tm_pu - Pe_pu - D * (omega_pu - 1.0)) / (2.0 * H);
    omega_pu += dOmega_dt * dt;
    delta += (omega_pu - 1.0) * omega_sync * dt;

    const Eg_instant = E_prime * Math.sin(state.totalAngle || 0.0);
    const totalAngle = (state.totalAngle || 0.0) + omega_sync * omega_pu * dt;

    const G_L = dt / (2.0 * Ld_prime);
    const Req = Ra_ohm + 1.0 / G_L;
    const G = 1.0 / Req;

    const prevI = state.prevI || 0.0;
    const prevV = state.prevV || 0.0;
    const I_hist_L = prevI + G_L * prevV;
    const Inorton = Eg_instant * G + (1.0 / (Req * G_L)) * I_hist_L;

    return {
      G,
      Inorton,
      nextState: {
        delta,
        omega_pu,
        E_prime,
        Tm_pu,
        Vf,
        totalAngle: totalAngle % (2 * Math.PI),
        prevI: terminalI,
        prevV: terminalV
      }
    };
  }
}
