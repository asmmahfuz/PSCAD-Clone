/**
 * PSCAD Modern - Power Diode Model with Reverse Recovery (TypeScript)
 * 
 * Supports:
 * - Forward threshold voltage drop (Vf) and forward conduction resistance (Ron)
 * - Reverse recovery charge (Qrr) and reverse recovery extinction time (trr)
 * - Exact sub-step zero-crossing switching point interpolation
 * - Critical Damping Adjustment (CDA) chatter suppression upon diode blocking
 */

import type { ComponentParams } from '../../types';
import { SwitchingInterpolator } from '../interpolator';

export type DiodeConductionState = 'OFF' | 'ON' | 'REVERSE_RECOVERY';

export interface DiodeState {
  mode: DiodeConductionState;
  prevV: number;        // Anode-Cathode voltage v_AK [V]
  prevI: number;        // Anode-Cathode current i_AK [A]
  q_recovered: number;  // Accumulated reverse recovery charge [Coulombs]
  recoveryTime: number; // Time elapsed in reverse recovery [s]
  cdaTriggered: boolean;// True if state changed and CDA should execute
}

export class PowerDiode {
  id: string;
  Vf: number;
  Ron: number;
  Roff: number;
  Qrr: number;
  trr: number;

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Vf = params.Vf ?? 0.8; // Default 0.8V forward threshold
    this.Ron = Math.max(params.Ron ?? 0.001, 1e-6);
    this.Roff = Math.max(params.Roff ?? 1e6, 1e3);
    this.Qrr = Math.max(params.Qrr ?? 0.0, 0.0); // Reverse recovery charge in micro-Coulombs or Coulombs
    this.trr = Math.max(params.trr ?? 1e-6, 1e-8); // Reverse recovery time in seconds
  }

  initState(): DiodeState {
    return {
      mode: 'OFF',
      prevV: 0.0,
      prevI: 0.0,
      q_recovered: 0.0,
      recoveryTime: 0.0,
      cdaTriggered: false,
    };
  }

  /**
   * Evaluate Norton Companion stamp { G, Ihist }
   * When ON: I = G*(V - Vf) => I = G*V - G*Vf => Ihist = -G*Vf
   * When OFF: I = G_off * V => Ihist = 0
   */
  computeCompanionStamp(mode: DiodeConductionState): { G: number; Ihist: number } {
    if (mode === 'ON' || mode === 'REVERSE_RECOVERY') {
      const G = 1.0 / this.Ron;
      const Ihist = mode === 'ON' ? -this.Vf * G : 0.0;
      return { G, Ihist };
    } else {
      const G = 1.0 / this.Roff;
      return { G, Ihist: 0.0 };
    }
  }

  /**
   * Determine exact zero-crossing fraction alpha for turn-on or turn-off
   */
  computeCommutationAlpha(vPrev: number, vCurr: number, iPrev: number, iCurr: number, mode: DiodeConductionState): number | null {
    if (mode === 'OFF') {
      // Check forward voltage turn-on zero crossing (v_AK crosses Vf)
      if (vPrev < this.Vf && vCurr >= this.Vf) {
        return SwitchingInterpolator.computeLinearAlpha(vPrev - this.Vf, vCurr - this.Vf);
      }
    } else if (mode === 'ON') {
      // Check current zero-crossing turn-off (i_AK crosses 0 from positive to negative)
      if (iPrev > 0 && iCurr <= 0) {
        return SwitchingInterpolator.computeLinearAlpha(iPrev, iCurr);
      }
    }
    return null;
  }

  /**
   * Advance state machine with current timestep solution
   */
  updateState(v_AK: number, i_AK: number, dt: number, state: DiodeState): { modeChanged: boolean; newMode: DiodeConductionState } {
    const prevMode = state.mode;
    let nextMode = prevMode;

    if (prevMode === 'OFF') {
      if (v_AK >= this.Vf) {
        nextMode = 'ON';
        state.q_recovered = 0.0;
        state.recoveryTime = 0.0;
      }
    } else if (prevMode === 'ON') {
      if (i_AK <= 0.0) {
        if (this.Qrr > 0.0 || this.trr > 1e-7) {
          nextMode = 'REVERSE_RECOVERY';
          state.q_recovered = 0.0;
          state.recoveryTime = 0.0;
        } else {
          nextMode = 'OFF';
        }
      }
    } else if (prevMode === 'REVERSE_RECOVERY') {
      if (i_AK > 0.0) {
        nextMode = 'ON';
      } else {
        // Accumulate reverse charge Q = integral(-i * dt)
        state.q_recovered += (-i_AK) * dt;
        state.recoveryTime += dt;
        if (state.q_recovered >= this.Qrr || state.recoveryTime >= this.trr) {
          nextMode = 'OFF';
        }
      }
    }

    const modeChanged = nextMode !== prevMode;
    state.mode = nextMode;
    state.prevV = v_AK;
    state.prevI = i_AK;

    if (modeChanged) {
      state.cdaTriggered = true;
    }

    return { modeChanged, newMode: nextMode };
  }
}
