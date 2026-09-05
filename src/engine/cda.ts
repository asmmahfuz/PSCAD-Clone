/**
 * PSCAD CLONE - Critical Damping Adjustment (CDA) & Chatter Removal
 * 
 * Implements 2-step Backward Euler (BE) half-step integration immediately following
 * discontinuous switching events (breaker trip, fault ignition, diode commutation)
 * to eliminate artificial trapezoidal rule numerical oscillations (chatter).
 */

export const CDAStage = {
  IDLE: 0,         // Normal Trapezoidal rule integration (dt)
  HALF_STEP_1: 1,  // First Backward Euler half-step (dt/2)
  HALF_STEP_2: 2   // Second Backward Euler half-step (dt/2)
} as const;

export type CDAStage = typeof CDAStage[keyof typeof CDAStage];

export interface CDATriggerEvent {
  componentId: string;
  type: string;
  timestamp: number;
  description: string;
}

export class CDAManager {
  enabled: boolean = true;
  currentStage: CDAStage = CDAStage.IDLE;
  triggerEvents: CDATriggerEvent[] = [];
  cdaStepCount: number = 0;
  totalCDATriggers: number = 0;
  
  // Storage for intermediate half-step states
  halfStepTime: number = 0.0;
  halfStepDt: number = 0.0;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Signal a discontinuous switching event in the network
   */
  trigger(event: CDATriggerEvent): void {
    if (!this.enabled) return;
    this.triggerEvents.push(event);
    this.currentStage = CDAStage.HALF_STEP_1;
    this.totalCDATriggers++;
  }

  /**
   * Reset the CDA manager to IDLE
   */
  reset(): void {
    this.currentStage = CDAStage.IDLE;
    this.triggerEvents = [];
    this.cdaStepCount = 0;
  }

  /**
   * Whether CDA is currently active (in half-step 1 or 2)
   */
  get isActive(): boolean {
    return this.enabled && this.currentStage !== CDAStage.IDLE;
  }

  /**
   * Get the effective time-step for the current integration step
   */
  getEffectiveDt(baseDt: number): number {
    if (!this.isActive) return baseDt;
    return baseDt / 2.0;
  }

  /**
   * Advance the CDA state machine after solving a sub-step
   */
  advanceStage(): CDAStage {
    if (this.currentStage === CDAStage.HALF_STEP_1) {
      this.currentStage = CDAStage.HALF_STEP_2;
    } else if (this.currentStage === CDAStage.HALF_STEP_2) {
      this.currentStage = CDAStage.IDLE;
      this.triggerEvents = [];
    }
    return this.currentStage;
  }

  /**
   * Calculate Backward Euler Inductor companion parameters
   * G_be = dtSub / L
   * I_hist = prevI
   */
  static InductorBE(L: number, dtSub: number, prevI: number): { G: number; Ihist: number } {
    const safeL = Math.max(L, 1e-9);
    const G = dtSub / safeL;
    const Ihist = prevI;
    return { G, Ihist };
  }

  /**
   * Calculate Backward Euler Capacitor companion parameters
   * G_be = C / dtSub
   * I_hist = -G_be * prevV
   */
  static CapacitorBE(C: number, dtSub: number, prevV: number): { G: number; Ihist: number } {
    const safeC = Math.max(C, 1e-12);
    const G = safeC / dtSub;
    const Ihist = -G * prevV;
    return { G, Ihist };
  }

  /**
   * Detect numerical chatter on a node voltage history:
   * Chatter signature: v[k] - v[k-1] and v[k-1] - v[k-2] have opposite signs with similar magnitude
   */
  static detectChatter(history: number[], threshold: number = 1.0): boolean {
    if (history.length < 3) return false;
    const n = history.length;
    const d1 = history[n - 1] - history[n - 2];
    const d2 = history[n - 2] - history[n - 3];
    
    if (Math.abs(d1) > threshold && Math.abs(d2) > threshold) {
      // Check sign reversal and magnitude parity
      if (d1 * d2 < 0 && Math.abs(d1 + d2) < 0.2 * (Math.abs(d1) + Math.abs(d2))) {
        return true;
      }
    }
    return false;
  }
}
