/**
 * PSCAD CLONE - Line-Commutated Thyristor (SCR) Model (TypeScript)
 * 
 * Supports:
 * - Gate firing pulse triggering and forward breakover blocking
 * - Latching current and Holding current (I_holding) retention
 * - Natural commutation zero-crossing extinction with turn-off time (tq)
 * - Sub-step switching point interpolation and CDA chatter suppression
 */

import type { ComponentParams } from '../../types';
import { SwitchingInterpolator } from '../interpolator';

export type ThyristorConductionState = 'BLOCKING' | 'CONDUCTING' | 'EXTINGUISHING';

export interface ThyristorState {
  mode: ThyristorConductionState;
  prevV: number;         // Anode-Cathode voltage v_AK [V]
  prevI: number;         // Anode-Cathode current i_AK [A]
  isFired: boolean;      // True if active gate pulse applied
  extinguishTimer: number;// Recovery timer after zero-crossing [s]
  cdaTriggered: boolean; // Trigger CDA on state switch
}

export class Thyristor {
  id: string;
  Vf: number;
  Ron: number;
  Roff: number;
  I_holding: number;
  tq: number; // Turn-off time [s]

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Vf = params.Vf ?? 1.2; // 1.2V forward drop
    this.Ron = Math.max(params.Ron ?? 0.001, 1e-6);
    this.Roff = Math.max(params.Roff ?? 1e6, 1e3);
    this.I_holding = Math.max(params.I_holding ?? 0.05, 1e-4); // 50 mA default holding current
    this.tq = Math.max(params.trr ?? 50e-6, 1e-7); // 50 µs default recovery
  }

  initState(): ThyristorState {
    return {
      mode: 'BLOCKING',
      prevV: 0.0,
      prevI: 0.0,
      isFired: false,
      extinguishTimer: 0.0,
      cdaTriggered: false,
    };
  }

  /**
   * Norton Companion stamp { G, Ihist }
   */
  computeCompanionStamp(mode: ThyristorConductionState): { G: number; Ihist: number } {
    if (mode === 'CONDUCTING') {
      const G = 1.0 / this.Ron;
      const Ihist = -this.Vf * G;
      return { G, Ihist };
    } else {
      const G = 1.0 / this.Roff;
      return { G, Ihist: 0.0 };
    }
  }

  /**
   * Zero-crossing detection for natural commutation
   */
  computeCommutationAlpha(iPrev: number, iCurr: number, mode: ThyristorConductionState): number | null {
    if (mode === 'CONDUCTING' && iPrev > 0 && iCurr <= 0) {
      return SwitchingInterpolator.computeLinearAlpha(iPrev, iCurr);
    }
    return null;
  }

  /**
   * Update Thyristor state given terminal voltage, current, gate pulse and dt
   */
  updateState(v_AK: number, i_AK: number, gatePulse: boolean, dt: number, state: ThyristorState): { modeChanged: boolean; newMode: ThyristorConductionState } {
    const prevMode = state.mode;
    let nextMode = prevMode;

    if (prevMode === 'BLOCKING') {
      // Forward biased and received gate pulse
      if (v_AK >= this.Vf && gatePulse) {
        nextMode = 'CONDUCTING';
        state.extinguishTimer = 0.0;
      }
    } else if (prevMode === 'CONDUCTING') {
      // Current drops below holding current or crosses zero into negative
      if (i_AK <= this.I_holding) {
        if (i_AK <= 0.0) {
          nextMode = 'EXTINGUISHING';
          state.extinguishTimer = 0.0;
        } else if (!gatePulse && i_AK < this.I_holding * 0.5) {
          // Drops well below holding without gate drive
          nextMode = 'BLOCKING';
        }
      }
    } else if (prevMode === 'EXTINGUISHING') {
      if (gatePulse && v_AK >= this.Vf) {
        nextMode = 'CONDUCTING';
      } else if (i_AK > 0.0) {
        nextMode = 'CONDUCTING';
      } else {
        state.extinguishTimer += dt;
        if (state.extinguishTimer >= this.tq) {
          nextMode = 'BLOCKING';
        }
      }
    }

    const modeChanged = nextMode !== prevMode;
    state.mode = nextMode;
    state.prevV = v_AK;
    state.prevI = i_AK;
    state.isFired = gatePulse;

    if (modeChanged) {
      state.cdaTriggered = true;
    }

    return { modeChanged, newMode: nextMode };
  }
}
