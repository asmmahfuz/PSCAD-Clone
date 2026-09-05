/**
 * PSCAD Modern - CSMF Non-Linear Control Blocks
 */

export class NonLinearBlocks {
  /**
   * Saturation / Limiter: Clamps input between min and max limits
   */
  static Limiter(u: number, minLimit: number = -1.0, maxLimit: number = 1.0): number {
    const val = isNaN(u) ? 0.0 : u;
    const lower = Math.min(minLimit, maxLimit);
    const upper = Math.max(minLimit, maxLimit);
    return Math.max(lower, Math.min(upper, val));
  }

  /**
   * Slew Rate Limiter: Limits dy/dt to [rateDown, rateUp]
   */
  static RateLimiter(
    u: number,
    dt: number,
    state: { prevY: number; isInit?: boolean } = { prevY: 0, isInit: false },
    rateUp: number = 100.0,
    rateDown: number = -100.0
  ): { output: number; state: { prevY: number; isInit: boolean } } {
    const val = isNaN(u) ? 0.0 : u;
    if (!state.isInit || dt <= 0) {
      return { output: val, state: { prevY: val, isInit: true } };
    }

    const prevY = state.prevY || 0.0;
    const maxDelta = Math.abs(rateUp) * dt;
    const minDelta = -Math.abs(rateDown) * dt;

    const delta = val - prevY;
    const clampedDelta = Math.max(minDelta, Math.min(maxDelta, delta));
    const y = prevY + clampedDelta;

    return { output: y, state: { prevY: y, isInit: true } };
  }

  /**
   * Deadband block: Suppresses small input signals around zero
   * If |u| <= width/2 -> 0; else u - sign(u)*width/2
   */
  static Deadband(u: number, width: number = 0.1, zeroOffset: boolean = true): number {
    const val = isNaN(u) ? 0.0 : u;
    const half = Math.max(0.0, width / 2.0);
    if (Math.abs(val) <= half) {
      return 0.0;
    }
    if (zeroOffset) {
      return val > 0 ? val - half : val + half;
    }
    return val;
  }

  /**
   * Hysteresis Relay block: Upper and lower trip points
   */
  static Hysteresis(
    u: number,
    state: { y: number } = { y: 0 },
    highThreshold: number = 1.0,
    lowThreshold: number = -1.0,
    highOutput: number = 1.0,
    lowOutput: number = 0.0
  ): { output: number; state: { y: number } } {
    const val = isNaN(u) ? 0.0 : u;
    let y = state.y !== undefined ? state.y : lowOutput;

    if (val >= highThreshold) {
      y = highOutput;
    } else if (val <= lowThreshold) {
      y = lowOutput;
    }

    return { output: y, state: { y } };
  }

  /**
   * Mechanical Backlash block
   */
  static Backlash(
    u: number,
    state: { prevY: number; isInit?: boolean } = { prevY: 0, isInit: false },
    gap: number = 0.1
  ): { output: number; state: { prevY: number; isInit: boolean } } {
    const val = isNaN(u) ? 0.0 : u;
    const halfGap = Math.max(0.0, gap / 2.0);

    if (!state.isInit) {
      return { output: val, state: { prevY: val, isInit: true } };
    }

    const prevY = state.prevY || 0.0;
    let y = prevY;

    if (val > prevY + halfGap) {
      y = val - halfGap;
    } else if (val < prevY - halfGap) {
      y = val + halfGap;
    }

    return { output: y, state: { prevY: y, isInit: true } };
  }

  /**
   * 1D Look-Up Table (Piecewise linear interpolation)
   */
  static Lookup1D(u: number, tableX: number[] = [], tableY: number[] = []): number {
    const x = isNaN(u) ? 0.0 : u;
    if (!tableX || tableX.length === 0 || !tableY || tableY.length === 0) return x;
    const n = Math.min(tableX.length, tableY.length);
    if (n === 1) return tableY[0];

    // Clamping at ends
    if (x <= tableX[0]) return tableY[0];
    if (x >= tableX[n - 1]) return tableY[n - 1];

    // Binary search / linear scan
    for (let i = 0; i < n - 1; i++) {
      if (x >= tableX[i] && x <= tableX[i + 1]) {
        const dx = tableX[i + 1] - tableX[i];
        if (Math.abs(dx) < 1e-12) return tableY[i];
        const frac = (x - tableX[i]) / dx;
        return tableY[i] + frac * (tableY[i + 1] - tableY[i]);
      }
    }

    return tableY[n - 1];
  }

  /**
   * 2D Look-Up Table (Bilinear interpolation)
   */
  static Lookup2D(
    uX: number,
    uY: number,
    tableX: number[] = [],
    tableY: number[] = [],
    tableZ: number[][] = [[]]
  ): number {
    const x = isNaN(uX) ? 0.0 : uX;
    const y = isNaN(uY) ? 0.0 : uY;

    if (!tableX || tableX.length === 0 || !tableY || tableY.length === 0 || !tableZ || tableZ.length === 0) {
      return 0.0;
    }

    const nx = tableX.length;
    const ny = tableY.length;

    // Find X interval [i, i+1]
    let ix = 0;
    if (x <= tableX[0]) ix = 0;
    else if (x >= tableX[nx - 1]) ix = nx - 2;
    else {
      for (let i = 0; i < nx - 1; i++) {
        if (x >= tableX[i] && x <= tableX[i + 1]) {
          ix = i;
          break;
        }
      }
    }

    // Find Y interval [j, j+1]
    let iy = 0;
    if (y <= tableY[0]) iy = 0;
    else if (y >= tableY[ny - 1]) iy = ny - 2;
    else {
      for (let j = 0; j < ny - 1; j++) {
        if (y >= tableY[j] && y <= tableY[j + 1]) {
          iy = j;
          break;
        }
      }
    }

    ix = Math.max(0, Math.min(nx - 2, ix));
    iy = Math.max(0, Math.min(ny - 2, iy));

    const x0 = tableX[ix];
    const x1 = tableX[ix + 1];
    const y0 = tableY[iy];
    const y1 = tableY[iy + 1];

    const dx = Math.max(1e-12, x1 - x0);
    const dy = Math.max(1e-12, y1 - y0);

    const fx = Math.max(0.0, Math.min(1.0, (x - x0) / dx));
    const fy = Math.max(0.0, Math.min(1.0, (y - y0) / dy));

    const z00 = tableZ[iy]?.[ix] ?? 0.0;
    const z01 = tableZ[iy]?.[ix + 1] ?? 0.0;
    const z10 = tableZ[iy + 1]?.[ix] ?? 0.0;
    const z11 = tableZ[iy + 1]?.[ix + 1] ?? 0.0;

    const z0 = z00 + fx * (z01 - z00);
    const z1 = z10 + fx * (z11 - z10);

    return z0 + fy * (z1 - z0);
  }
}
