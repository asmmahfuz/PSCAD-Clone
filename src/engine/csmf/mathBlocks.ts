/**
 * PSCAD CLONE - CSMF Mathematical Control Blocks
 */

export class MathBlocks {
  /**
   * Constant source block
   */
  static Constant(value: number = 1.0): number {
    return isNaN(value) ? 0.0 : value;
  }

  /**
   * Linear Gain block: y = K * u + offset
   */
  static Gain(u: number, K: number = 1.0, offset: number = 0.0): number {
    const input = isNaN(u) ? 0.0 : u;
    return input * K + offset;
  }

  /**
   * Multi-input algebraic summation block
   */
  static Sum(inputs: number[] = [], signs: string[] = []): number {
    let sum = 0.0;
    for (let i = 0; i < inputs.length; i++) {
      const val = isNaN(inputs[i]) ? 0.0 : inputs[i];
      const sign = signs[i] === '-' ? -1.0 : 1.0;
      sum += sign * val;
    }
    return sum;
  }

  /**
   * Multiplier block: y = u1 * u2 * ... * un
   */
  static Multiplier(inputs: number[] = []): number {
    if (inputs.length === 0) return 0.0;
    let prod = 1.0;
    for (const u of inputs) {
      prod *= isNaN(u) ? 0.0 : u;
    }
    return prod;
  }

  /**
   * Divider block: y = u1 / (u2 + eps)
   */
  static Divider(num: number, den: number, eps: number = 1e-12): number {
    const n = isNaN(num) ? 0.0 : num;
    const d = isNaN(den) ? 0.0 : den;
    if (Math.abs(d) < eps) {
      return (d >= 0 ? 1.0 : -1.0) * n / eps;
    }
    return n / d;
  }

  /**
   * Standard Mathematical Functions
   */
  static MathFunction(
    u: number,
    op: 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan2' | 'ln' | 'exp' | 'sqrt' | 'abs' | 'square' | 'inv' | 'log10' = 'sin',
    u2: number = 0.0
  ): number {
    const x = isNaN(u) ? 0.0 : u;
    const y = isNaN(u2) ? 0.0 : u2;

    switch (op) {
      case 'sin': return Math.sin(x);
      case 'cos': return Math.cos(x);
      case 'tan': return Math.tan(x);
      case 'asin': return Math.asin(Math.max(-1.0, Math.min(1.0, x)));
      case 'acos': return Math.acos(Math.max(-1.0, Math.min(1.0, x)));
      case 'atan2': return Math.atan2(x, y);
      case 'ln': return x > 0 ? Math.log(x) : -100.0;
      case 'log10': return x > 0 ? Math.log10(x) : -100.0;
      case 'exp': return Math.exp(Math.max(-100.0, Math.min(100.0, x)));
      case 'sqrt': return x >= 0 ? Math.sqrt(x) : 0.0;
      case 'abs': return Math.abs(x);
      case 'square': return x * x;
      case 'inv': return Math.abs(x) > 1e-12 ? 1.0 / x : 1e12;
      default: return x;
    }
  }

  /**
   * Minimum or Maximum Selector
   */
  static MinMax(inputs: number[] = [], mode: 'min' | 'max' = 'min'): number {
    if (inputs.length === 0) return 0.0;
    const cleanInputs = inputs.map(v => isNaN(v) ? 0.0 : v);
    return mode === 'min' ? Math.min(...cleanInputs) : Math.max(...cleanInputs);
  }

  /**
   * Trapezoidal Integrator with limits and anti-windup:
   * y(t) = y(t-dt) + K * (dt/2) * (u(t) + u(t-dt))
   */
  static Integrator(
    u: number,
    dt: number,
    state: { y: number; prevU: number } = { y: 0, prevU: 0 },
    minLimit: number = -Infinity,
    maxLimit: number = Infinity,
    K: number = 1.0,
    resetSignal: boolean = false,
    resetVal: number = 0.0
  ): { output: number; state: { y: number; prevU: number } } {
    if (resetSignal) {
      const yReset = Math.max(minLimit, Math.min(maxLimit, resetVal));
      return { output: yReset, state: { y: yReset, prevU: u } };
    }

    const curU = isNaN(u) ? 0.0 : u;
    const prevU = isNaN(state.prevU) ? 0.0 : state.prevU;

    let y = (state.y || 0.0) + K * (dt / 2.0) * (curU + prevU);
    y = Math.max(minLimit, Math.min(maxLimit, y));

    return { output: y, state: { y, prevU: curU } };
  }

  /**
   * Proportional-Integral-Derivative (PID) Controller with filtered derivative and anti-windup
   */
  static PID(
    error: number,
    dt: number,
    state: { integ: number; prevErr: number; derivFilt: number } = { integ: 0, prevErr: 0, derivFilt: 0 },
    Kp: number = 1.0,
    Ki: number = 5.0,
    Kd: number = 0.0,
    Tf: number = 0.005,
    minOut: number = -10.0,
    maxOut: number = 10.0,
    trackingEnabled: boolean = false,
    trackingVal: number = 0.0
  ): { output: number; state: { integ: number; prevErr: number; derivFilt: number } } {
    const err = isNaN(error) ? 0.0 : error;
    const P = Kp * err;

    let integ = state.integ || 0.0;
    if (trackingEnabled) {
      integ = trackingVal - P;
    } else {
      integ += Ki * err * dt;
    }
    integ = Math.max(minOut, Math.min(maxOut, integ));

    let derivFilt = 0.0;
    if (Kd > 0 && dt > 0) {
      const rawD = Kd * (err - (state.prevErr || 0.0)) / dt;
      const alpha = dt / (dt + Math.max(Tf, 1e-5));
      derivFilt = (state.derivFilt || 0.0) + alpha * (rawD - (state.derivFilt || 0.0));
    }

    let output = P + integ + derivFilt;
    output = Math.max(minOut, Math.min(maxOut, output));

    return { output, state: { integ, prevErr: err, derivFilt } };
  }
}
