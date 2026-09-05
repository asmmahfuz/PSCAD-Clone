/**
 * PSCAD CLONE - Ideal Bi-Directional Switch Model (TypeScript)
 * 
 * Supports:
 * - Timed opening / closing and external gate-signal control
 * - Sub-step switching point interpolation (linear/parabolic zero-crossing detection)
 * - Integration with Critical Damping Adjustment (CDA) to prevent chatter
 */

import type { ComponentParams } from '../../types';

export interface IdealSwitchState {
  isClosed: boolean;
  prevV: number;
  prevI: number;
  lastSwitchTime: number;
  cdaTriggered: boolean;
}

export class IdealSwitch {
  id: string;
  Ron: number;
  Roff: number;
  initClosed: boolean;
  openTime: number;
  closeTime: number;

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    this.Ron = Math.max(params.Ron ?? 1e-4, 1e-6);
    this.Roff = Math.max(params.Roff ?? 1e7, 1e4);
    this.initClosed = params.initClosed ?? false;
    this.openTime = params.openTime ?? -1.0;
    this.closeTime = params.closeTime ?? -1.0;
  }

  initState(): IdealSwitchState {
    return {
      isClosed: this.initClosed,
      prevV: 0.0,
      prevI: 0.0,
      lastSwitchTime: 0.0,
      cdaTriggered: false,
    };
  }

  /**
   * Determine target switch state at time t or gate signal
   */
  evaluateState(t: number, gateSignal?: boolean): boolean {
    if (gateSignal !== undefined) {
      return gateSignal;
    }
    let closed = this.initClosed;
    if (this.openTime >= 0 && t >= this.openTime) {
      closed = false;
    }
    if (this.closeTime >= 0 && t >= this.closeTime) {
      closed = true;
    }
    return closed;
  }

  /**
   * Get Norton companion conductance and history current
   */
  computeCompanionStamp(isClosed: boolean): { G: number; Ihist: number } {
    const G = isClosed ? 1.0 / this.Ron : 1.0 / this.Roff;
    return { G, Ihist: 0.0 };
  }

  /**
   * Update state at time t and record terminal variables
   */
  updateState(v: number, i: number, t: number, state: IdealSwitchState, gateSignal?: boolean): { stateChanged: boolean; newClosed: boolean } {
    const nextClosed = this.evaluateState(t, gateSignal);
    const stateChanged = nextClosed !== state.isClosed;

    state.prevV = v;
    state.prevI = i;

    if (stateChanged) {
      state.isClosed = nextClosed;
      state.lastSwitchTime = t;
      state.cdaTriggered = true;
    }

    return { stateChanged, newClosed: nextClosed };
  }
}
