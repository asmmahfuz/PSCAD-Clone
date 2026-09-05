/**
 * PSCAD CLONE - IGBT / MOSFET with Antiparallel Freewheeling Diode (TypeScript)
 * 
 * Supports:
 * - Controlled forward conduction via Gate signal (G in {0, 1} or PWM)
 * - Automatic antiparallel diode freewheeling under inductive reverse polarity (v_CE < -Vf)
 * - Sub-step switching point interpolation
 * - Critical Damping Adjustment (CDA) chatter suppression
 */

import type { ComponentParams } from '../../types';
import { SwitchingInterpolator } from '../interpolator';

export type IgbtConductionMode = 'OFF' | 'IGBT_ON' | 'DIODE_FWD';

export interface IgbtState {
  mode: IgbtConductionMode;
  prevV: number;         // Collector-Emitter voltage v_CE [V]
  prevI: number;         // Collector-Emitter current i_CE [A] (positive = C to E)
  gateSignal: boolean;   // Active gate drive status
  cdaTriggered: boolean; // True if switching occurred
}

export class IgbtDiode {
  id: string;
  Vce_sat: number; // IGBT forward saturation drop [V]
  Vf_diode: number;// Antiparallel diode forward drop [V]
  Ron: number;     // Forward on-resistance [Ω]
  Ron_diode: number;// Diode on-resistance [Ω]
  Roff: number;    // Off-state leakage resistance [Ω]

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Vce_sat = params.Vf ?? 1.5; // 1.5V forward IGBT saturation drop
    this.Vf_diode = params.Vf ?? 1.0; // 1.0V diode drop
    this.Ron = Math.max(params.Ron ?? 0.001, 1e-6);
    this.Ron_diode = Math.max(params.Ron ?? 0.001, 1e-6);
    this.Roff = Math.max(params.Roff ?? 1e6, 1e3);
  }

  initState(): IgbtState {
    return {
      mode: 'OFF',
      prevV: 0.0,
      prevI: 0.0,
      gateSignal: false,
      cdaTriggered: false,
    };
  }

  /**
   * Norton companion stamp { G, Ihist }
   * - IGBT_ON (v_CE > 0): I = G * (v_CE - Vce_sat) => Ihist = -G * Vce_sat
   * - DIODE_FWD (v_CE < 0): I = G * (v_CE + Vf_diode) => Ihist = +G * Vf_diode
   * - OFF: I = G_off * v_CE => Ihist = 0
   */
  computeCompanionStamp(mode: IgbtConductionMode): { G: number; Ihist: number } {
    if (mode === 'IGBT_ON') {
      const G = 1.0 / this.Ron;
      const Ihist = -this.Vce_sat * G;
      return { G, Ihist };
    } else if (mode === 'DIODE_FWD') {
      const G = 1.0 / this.Ron_diode;
      const Ihist = this.Vf_diode * G;
      return { G, Ihist };
    } else {
      const G = 1.0 / this.Roff;
      return { G, Ihist: 0.0 };
    }
  }

  /**
   * Check sub-step zero-crossing for diode freewheeling commutation
   */
  computeCommutationAlpha(vPrev: number, vCurr: number, iPrev: number, iCurr: number, mode: IgbtConductionMode): number | null {
    if (mode === 'OFF' && vPrev > -this.Vf_diode && vCurr <= -this.Vf_diode) {
      return SwitchingInterpolator.computeLinearAlpha(vPrev + this.Vf_diode, vCurr + this.Vf_diode);
    }
    if (mode === 'DIODE_FWD' && iPrev < 0 && iCurr >= 0) {
      return SwitchingInterpolator.computeLinearAlpha(iPrev, iCurr);
    }
    return null;
  }

  /**
   * Advance IGBT state machine
   */
  updateState(v_CE: number, i_CE: number, gateSignal: boolean, state: IgbtState): { modeChanged: boolean; newMode: IgbtConductionMode } {
    const prevMode = state.mode;
    let nextMode: IgbtConductionMode = 'OFF';

    // 1. Check Freewheeling Diode (highest priority for reverse inductive voltage)
    if (v_CE < -this.Vf_diode || (prevMode === 'DIODE_FWD' && i_CE < 0.0)) {
      nextMode = 'DIODE_FWD';
    } 
    // 2. Check IGBT Forward Conduction
    else if (gateSignal && (v_CE >= this.Vce_sat || i_CE > 0.0)) {
      nextMode = 'IGBT_ON';
    } 
    // 3. Otherwise Blocking
    else {
      nextMode = 'OFF';
    }

    const modeChanged = nextMode !== prevMode;
    state.mode = nextMode;
    state.prevV = v_CE;
    state.prevI = i_CE;
    state.gateSignal = gateSignal;

    if (modeChanged) {
      state.cdaTriggered = true;
    }

    return { modeChanged, newMode: nextMode };
  }
}
