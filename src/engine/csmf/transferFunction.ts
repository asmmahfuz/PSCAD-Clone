/**
 * PSCAD Modern - s-Domain Rational Transfer Function & z-Domain Filter Engine
 * 
 * Supports:
 * - Arbitrary-order continuous rational transfer function:
 *     H(s) = (b_m * s^m + ... + b_1 * s + b_0) / (a_n * s^n + ... + a_1 * s + a_0)  (n >= m)
 * - Tustin (Bilinear) Transformation: s <- (2 / dt) * (1 - z^-1) / (1 + z^-1)
 * - Optional frequency pre-warping for precise resonant/notch frequencies
 * - Canonical difference equations with anti-windup clamping [ymin, ymax]
 * - Slew rate limiting [slewMin, slewMax]
 * - Exact initial steady-state solving (y0 = (b0 / a0) * u0)
 * - z-Domain discrete rational transfer functions H(z)
 * - Factory methods for standard industrial blocks: Lag, Lead-Lag, Washout, Biquad, Butterworth, Notch
 */

export interface TransferFunctionConfig {
  num: number[]; // Numerator coefficients [b_m, ..., b_1, b_0] or [b_0, ..., b_m]
  den: number[]; // Denominator coefficients [a_n, ..., a_1, a_0] or [a_0, ..., a_n]
  coeffOrder?: 'DESCENDING' | 'ASCENDING'; // Default: 'DESCENDING' (highest power first: b_m*s^m + ...)
  minVal?: number; // Anti-windup minimum limit
  maxVal?: number; // Anti-windup maximum limit
  slewRateMax?: number; // Max rate of change dy/dt [units/s]
  slewRateMin?: number; // Min rate of change dy/dt [units/s]
  prewarpFreqRad?: number; // Optional frequency pre-warping (rad/s)
  initialOutput?: number; // Explicit initial output (otherwise steady-state solved)
}

export class TransferFunctionS {
  public numDesc: number[]; // Descending order [b_m, ..., b_0]
  public denDesc: number[]; // Descending order [a_n, ..., a_0]
  public minVal: number;
  public maxVal: number;
  public slewRateMax: number;
  public slewRateMin: number;
  public prewarpFreqRad?: number;

  // Discretized z-domain difference equation coefficients:
  // y[k] + a_disc[1]*y[k-1] + ... = b_disc[0]*u[k] + b_disc[1]*u[k-1] + ...
  private b_disc: number[] = [];
  private a_disc: number[] = [];
  private order: number = 0;

  // History buffers:
  // uHistory[0] = u[k], uHistory[1] = u[k-1], ...
  // yHistory[0] = y[k-1], yHistory[1] = y[k-2], ...
  private uHistory: number[] = [];
  private yHistory: number[] = [];
  private currentY: number = 0;
  private currentU: number = 0;
  private isInitialized: boolean = false;
  private lastDt: number = 0.0001;

  constructor(config: TransferFunctionConfig) {
    const order = config.coeffOrder || 'DESCENDING';
    if (order === 'DESCENDING') {
      this.numDesc = [...config.num];
      this.denDesc = [...config.den];
    } else {
      this.numDesc = [...config.num].reverse();
      this.denDesc = [...config.den].reverse();
    }

    // Strip leading zeros
    while (this.denDesc.length > 1 && Math.abs(this.denDesc[0]) < 1e-14) {
      this.denDesc.shift();
    }
    while (this.numDesc.length > 1 && Math.abs(this.numDesc[0]) < 1e-14) {
      this.numDesc.shift();
    }

    if (this.denDesc.length === 0 || Math.abs(this.denDesc[0]) < 1e-14) {
      throw new Error('TransferFunctionS: Denominator cannot be zero.');
    }

    // Properness check: numerator order <= denominator order
    if (this.numDesc.length > this.denDesc.length) {
      throw new Error('TransferFunctionS: Transfer function must be proper (deg(num) <= deg(den)).');
    }

    this.minVal = config.minVal ?? -Infinity;
    this.maxVal = config.maxVal ?? Infinity;
    this.slewRateMax = config.slewRateMax ?? Infinity;
    this.slewRateMin = config.slewRateMin ?? -Infinity;
    this.prewarpFreqRad = config.prewarpFreqRad;

    if (config.initialOutput !== undefined) {
      this.currentY = Math.max(this.minVal, Math.min(this.maxVal, config.initialOutput));
    }
  }

  /**
   * Discretize the continuous transfer function H(s) via Bilinear (Tustin) transformation
   */
  public discretize(dt: number): void {
    if (dt <= 0) throw new Error('TransferFunctionS: Time step dt must be positive.');
    this.lastDt = dt;

    let c: number;
    if (this.prewarpFreqRad && this.prewarpFreqRad > 0) {
      // Pre-warped bilinear mapping constant: c = w0 / tan(w0 * dt / 2)
      c = this.prewarpFreqRad / Math.tan((this.prewarpFreqRad * dt) / 2);
    } else {
      // Standard Tustin: c = 2 / dt
      c = 2.0 / dt;
    }

    const n = this.denDesc.length - 1;
    this.order = n;

    // Pad numerator with leading zeros to match denominator order n
    const numPadded = new Array(n + 1).fill(0);
    const m = this.numDesc.length - 1;
    for (let i = 0; i <= m; i++) {
      numPadded[n - m + i] = this.numDesc[i];
    }

    // Expand (c * (1 - z^-1))^k * (1 + z^-1)^(n - k)
    const bZ = new Array(n + 1).fill(0);
    const aZ = new Array(n + 1).fill(0);

    for (let k = 0; k <= n; k++) {
      const numCoeff = numPadded[n - k]; // coefficient of s^k
      const denCoeff = this.denDesc[n - k]; // coefficient of s^k

      if (numCoeff !== 0 || denCoeff !== 0) {
        const poly = this.expandBilinearTerm(k, n - k, c);
        for (let j = 0; j <= n; j++) {
          bZ[j] += numCoeff * poly[j];
          aZ[j] += denCoeff * poly[j];
        }
      }
    }

    // Normalize so a_disc[0] = 1.0
    const a0 = aZ[0];
    if (Math.abs(a0) < 1e-15) {
      throw new Error('TransferFunctionS: Discretization singular denominator.');
    }

    this.a_disc = aZ.map((val) => val / a0);
    this.b_disc = bZ.map((val) => val / a0);

    // Initialize history buffers
    this.uHistory = new Array(n + 1).fill(this.currentU);
    this.yHistory = new Array(Math.max(1, n)).fill(this.currentY);
  }

  /**
   * Helper: expands c^k * (1 - z^-1)^k * (1 + z^-1)^m into polynomial in z^-1
   */
  private expandBilinearTerm(k: number, m: number, c: number): number[] {
    const poly1MinusZ = this.binomialExpansion(k, -1); // (1 - z^-1)^k
    const poly1PlusZ = this.binomialExpansion(m, 1); // (1 + z^-1)^m

    const product = this.polynomialMultiply(poly1MinusZ, poly1PlusZ);
    const scale = Math.pow(c, k);
    return product.map((val) => val * scale);
  }

  private binomialExpansion(n: number, sign: number): number[] {
    const res = new Array(n + 1).fill(0);
    for (let i = 0; i <= n; i++) {
      let combo = 1;
      for (let j = 0; j < i; j++) {
        combo = (combo * (n - j)) / (j + 1);
      }
      res[i] = combo * Math.pow(sign, i);
    }
    return res;
  }

  private polynomialMultiply(p1: number[], p2: number[]): number[] {
    const res = new Array(p1.length + p2.length - 1).fill(0);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        res[i + j] += p1[i] * p2[j];
      }
    }
    return res;
  }

  /**
   * Initialize to steady-state for a given initial input u0
   */
  public initializeSteadyState(u0: number, dt: number): number {
    this.currentU = u0;
    const num0 = this.numDesc[this.numDesc.length - 1];
    const den0 = this.denDesc[this.denDesc.length - 1];

    if (Math.abs(den0) > 1e-14) {
      this.currentY = (num0 / den0) * u0;
    } else {
      this.currentY = 0;
    }

    this.currentY = Math.max(this.minVal, Math.min(this.maxVal, this.currentY));
    this.discretize(dt);
    this.uHistory.fill(u0);
    this.yHistory.fill(this.currentY);
    this.isInitialized = true;
    return this.currentY;
  }

  /**
   * Step the transfer function forward by one time step dt
   */
  public step(u: number, dt: number): number {
    if (!this.isInitialized || Math.abs(dt - this.lastDt) > 1e-9) {
      this.discretize(dt);
      if (!this.isInitialized) {
        this.uHistory.fill(u);
        this.yHistory.fill(this.currentY);
        this.isInitialized = true;
      }
    }

    this.currentU = u;
    // Shift input history: uHistory[0] = u[k], uHistory[1] = u[k-1], ...
    for (let i = this.order; i >= 1; i--) {
      this.uHistory[i] = this.uHistory[i - 1];
    }
    this.uHistory[0] = u;

    // Direct difference equation:
    // y[k] = sum_{i=0}^n (b_disc[i] * u[k-i]) - sum_{j=1}^n (a_disc[j] * y[k-j])
    let yRaw = 0.0;
    for (let i = 0; i <= this.order; i++) {
      yRaw += this.b_disc[i] * this.uHistory[i];
    }
    for (let j = 1; j <= this.order; j++) {
      yRaw -= this.a_disc[j] * this.yHistory[j - 1];
    }

    // Apply slew rate limiter if specified
    const prevY = this.yHistory[0];
    const maxChange = this.slewRateMax * dt;
    const minChange = this.slewRateMin * dt;
    let yRateLimited = yRaw;
    if (isFinite(this.slewRateMax) && yRateLimited - prevY > maxChange) {
      yRateLimited = prevY + maxChange;
    }
    if (isFinite(this.slewRateMin) && yRateLimited - prevY < minChange) {
      yRateLimited = prevY + minChange;
    }

    // Apply anti-windup clamping
    const yClamped = Math.max(this.minVal, Math.min(this.maxVal, yRateLimited));
    this.currentY = yClamped;

    // Shift yHistory and store y[k] into yHistory[0] for next time step
    for (let j = this.order - 1; j >= 1; j--) {
      this.yHistory[j] = this.yHistory[j - 1];
    }
    if (this.order > 0) {
      this.yHistory[0] = yClamped;
    }

    return this.currentY;
  }

  public getOutput(): number {
    return this.currentY;
  }

  public reset(initVal: number = 0): void {
    this.currentY = Math.max(this.minVal, Math.min(this.maxVal, initVal));
    this.currentU = 0;
    this.uHistory.fill(0);
    this.yHistory.fill(this.currentY);
    this.isInitialized = false;
  }

  // ==========================================
  // Standard Pre-Built Factory Constructors
  // ==========================================

  /**
   * First-Order Lag Filter: H(s) = K / (1 + s*T)
   */
  public static firstOrderLag(K: number, T: number, minVal?: number, maxVal?: number): TransferFunctionS {
    return new TransferFunctionS({
      num: [K],
      den: [T, 1.0],
      minVal,
      maxVal,
    });
  }

  /**
   * Lead-Lag Compensator: H(s) = K * (1 + s*T1) / (1 + s*T2)
   */
  public static leadLag(K: number, T1: number, T2: number, minVal?: number, maxVal?: number): TransferFunctionS {
    return new TransferFunctionS({
      num: [K * T1, K],
      den: [T2, 1.0],
      minVal,
      maxVal,
    });
  }

  /**
   * Washout (High-Pass) Filter: H(s) = (s*Tw) / (1 + s*Tw)
   */
  public static washout(Tw: number, minVal?: number, maxVal?: number): TransferFunctionS {
    return new TransferFunctionS({
      num: [Tw, 0.0],
      den: [Tw, 1.0],
      minVal,
      maxVal,
    });
  }

  /**
   * 2nd-Order Biquad Low-Pass Filter: H(s) = K * wn^2 / (s^2 + 2*zeta*wn*s + wn^2)
   */
  public static biquadLowPass(wn: number, zeta: number, K: number = 1.0): TransferFunctionS {
    return new TransferFunctionS({
      num: [K * wn * wn],
      den: [1.0, 2.0 * zeta * wn, wn * wn],
    });
  }

  /**
   * 2nd-Order Torsional SSR Notch Filter:
   * H(s) = (s^2 + wn^2) / (s^2 + 2*zeta*wn*s + wn^2)
   */
  public static biquadNotch(wn: number, zeta: number = 0.1): TransferFunctionS {
    return new TransferFunctionS({
      num: [1.0, 0.0, wn * wn],
      den: [1.0, 2.0 * zeta * wn, wn * wn],
      prewarpFreqRad: wn,
    });
  }

  /**
   * 2nd-Order Butterworth Low-Pass Filter with cut-off frequency fc (Hz)
   */
  public static butterworth2nd(fc: number, K: number = 1.0): TransferFunctionS {
    const wn = 2 * Math.PI * fc;
    const zeta = Math.SQRT1_2; // 0.7071
    return TransferFunctionS.biquadLowPass(wn, zeta, K);
  }
}

/**
 * z-Domain Direct Rational Filter:
 * H(z) = (b0 + b1*z^-1 + ... + bm*z^-m) / (a0 + a1*z^-1 + ... + an*z^-n)
 */
export class DiscreteFilterZ {
  public b: number[];
  public a: number[];
  public minVal: number;
  public maxVal: number;

  private uHist: number[] = [];
  private yHist: number[] = [];
  private currentY: number = 0;

  constructor(b: number[], a: number[], minVal?: number, maxVal?: number) {
    if (a.length === 0 || Math.abs(a[0]) < 1e-15) {
      throw new Error('DiscreteFilterZ: a[0] must not be zero.');
    }
    // Normalize coefficients by a[0]
    const a0 = a[0];
    this.b = b.map((val) => val / a0);
    this.a = a.map((val) => val / a0);
    this.minVal = minVal ?? -Infinity;
    this.maxVal = maxVal ?? Infinity;

    const maxOrder = Math.max(this.b.length, this.a.length);
    this.uHist = new Array(maxOrder).fill(0);
    this.yHist = new Array(Math.max(1, maxOrder)).fill(0);
  }

  public step(u: number): number {
    for (let i = this.uHist.length - 1; i >= 1; i--) {
      this.uHist[i] = this.uHist[i - 1];
    }
    this.uHist[0] = u;

    let y = 0.0;
    for (let i = 0; i < this.b.length; i++) {
      y += this.b[i] * this.uHist[i];
    }
    for (let j = 1; j < this.a.length; j++) {
      y -= this.a[j] * this.yHist[j - 1];
    }

    const yClamped = Math.max(this.minVal, Math.min(this.maxVal, y));
    this.currentY = yClamped;

    for (let j = this.yHist.length - 1; j >= 1; j--) {
      this.yHist[j] = this.yHist[j - 1];
    }
    this.yHist[0] = yClamped;

    return this.currentY;
  }

  public getOutput(): number {
    return this.currentY;
  }

  public reset(initVal: number = 0): void {
    this.currentY = Math.max(this.minVal, Math.min(this.maxVal, initVal));
    this.uHist.fill(0);
    this.yHist.fill(this.currentY);
  }
}
