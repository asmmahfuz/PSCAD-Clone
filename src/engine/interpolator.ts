/**
 * PSCAD Modern - Two-Half-Step Switching Point Interpolation
 * 
 * Implements linear and parabolic sub-step interpolation for exact zero-crossing
 * detection and switching events (diodes, thyristors, breakers).
 * Eliminates artificial current chopping and extreme L*di/dt overvoltage spikes.
 */

export interface ZeroCrossingEvent {
  componentId: string;
  variableName: string;
  tStart: number;
  valPrev: number;
  valNext: number;
  alpha: number; // Fraction in (0, 1)
  tExact: number;
}

export interface StateSnapshot {
  t: number;
  stepCount: number;
  componentStates: Map<string, any>;
  nodeVoltages: Float64Array;
}

export class SwitchingInterpolator {
  enabled: boolean = true;
  totalInterpolations: number = 0;
  tolerance: number = 1e-9;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Calculate linear interpolation fraction alpha for zero-crossing:
   * alpha = (0 - valPrev) / (valNext - valPrev) = -valPrev / (valNext - valPrev)
   */
  static computeLinearAlpha(valPrev: number, valNext: number): number | null {
    // Check if zero crossing occurred
    if ((valPrev > 0 && valNext < 0) || (valPrev < 0 && valNext > 0) || (valPrev !== 0 && valNext === 0)) {
      const denom = valNext - valPrev;
      if (Math.abs(denom) < 1e-15) return 0.5;
      const alpha = -valPrev / denom;
      if (alpha > 0.0001 && alpha < 0.9999) {
        return alpha;
      }
    }
    return null;
  }

  /**
   * Calculate parabolic interpolation fraction alpha using 3 history points:
   * (t-dt, y0), (t, y1), (t+dt, y2)
   */
  static computeParabolicAlpha(y0: number, y1: number, y2: number): number | null {
    // Standard quadratic interpolation on normalized time xi in [0, 1]
    // y(xi) = y1 + xi*(y2 - y0)/2 + xi^2*(y2 - 2*y1 + y0)/2
    const a = 0.5 * (y2 - 2 * y1 + y0);
    const b = 0.5 * (y2 - y0);
    const c = y1;

    if (Math.abs(a) < 1e-12) {
      // Degenerates to linear
      return SwitchingInterpolator.computeLinearAlpha(y1, y2);
    }

    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const root1 = (-b + sqrtDisc) / (2 * a);
    const root2 = (-b - sqrtDisc) / (2 * a);

    if (root1 > 0.001 && root1 < 0.999) return root1;
    if (root2 > 0.001 && root2 < 0.999) return root2;

    return SwitchingInterpolator.computeLinearAlpha(y1, y2);
  }

  /**
   * Check a list of monitored currents/voltages for zero crossings between step k and k+1
   */
  detectZeroCrossings(
    t: number,
    dt: number,
    checks: Array<{ id: string; name: string; prev: number; curr: number }>
  ): ZeroCrossingEvent | null {
    if (!this.enabled) return null;

    let earliestEvent: ZeroCrossingEvent | null = null;
    let minAlpha = 1.0;

    for (const item of checks) {
      const alpha = SwitchingInterpolator.computeLinearAlpha(item.prev, item.curr);
      if (alpha !== null && alpha < minAlpha) {
        minAlpha = alpha;
        earliestEvent = {
          componentId: item.id,
          variableName: item.name,
          tStart: t,
          valPrev: item.prev,
          valNext: item.curr,
          alpha,
          tExact: t + alpha * dt
        };
      }
    }

    if (earliestEvent) {
      this.totalInterpolations++;
    }

    return earliestEvent;
  }
}
