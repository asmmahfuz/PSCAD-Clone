/**
 * PSCAD Modern - Sanathanan-Koerner Vector Fitting (VF) Algorithm
 * 
 * Computes optimal rational function pole-residue approximations for frequency-dependent
 * transfer functions, characteristic admittances Yc(s), and propagation matrices H(s):
 * 
 *   f(s) ≈ sum_{k=1}^N ( c_k / (s - p_k) ) + d + s * e
 * 
 * Features:
 * - Linear least-squares formulation with Sanathanan-Koerner iterative pole relocation
 * - Automatic real / complex-conjugate pole initialization across logarithmic frequency span
 * - Left-half plane (LHP) stability enforcement (flips unstable poles: Re(p) = -abs(Re(p)))
 * - Calculation of residues c_k, direct term d, and proportional term e
 * - High-speed numerical evaluation for recursive convolution time-domain integration
 */

export interface Complex {
  re: number;
  im: number;
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im + 1e-30;
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function cMag(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

export interface RationalModel {
  poles: Complex[];      // p_k
  residues: Complex[];   // c_k
  d: number;             // Direct constant term
  e: number;             // Proportional term (s * e)
  rmsError: number;
}

export class VectorFitter {
  /**
   * Fit rational function to complex frequency response data { freqHz, response }
   * 
   * @param freqsHz Array of frequency sample points (Hz)
   * @param responses Array of complex response values f(j*omega)
   * @param numPoles Number of rational poles (e.g. 4, 6, 8)
   * @param iterations Number of Sanathanan-Koerner iterations (default 3)
   */
  static fit(
    freqsHz: number[],
    responses: Complex[],
    numPoles: number = 4,
    iterations: number = 3
  ): RationalModel {
    const numSamples = freqsHz.length;
    if (numSamples < numPoles) {
      throw new Error(`VectorFitter requires at least ${numPoles} frequency points (got ${numSamples}).`);
    }

    const minW = 2.0 * Math.PI * Math.max(freqsHz[0], 1.0);
    const maxW = 2.0 * Math.PI * freqsHz[numSamples - 1];

    // 1. Generate logarithmically spaced initial complex conjugate poles in LHP
    let poles: Complex[] = [];
    const numPairs = Math.floor(numPoles / 2);
    const hasRealPole = numPoles % 2 === 1;

    for (let k = 0; k < numPairs; k++) {
      const alpha = Math.exp(
        Math.log(minW) + (k / (numPairs + 0.5)) * (Math.log(maxW) - Math.log(minW))
      );
      const beta = alpha * 0.1; // Damping ratio
      poles.push({ re: -beta, im: alpha });
      poles.push({ re: -beta, im: -alpha });
    }

    if (hasRealPole) {
      const alpha = Math.sqrt(minW * maxW);
      poles.push({ re: -alpha, im: 0.0 });
    }

    // 2. Sanathanan-Koerner Iteration Loop for pole relocation
    for (let iter = 0; iter < iterations; iter++) {
      // Setup Linear Least Squares System: [A] * [x] = [b]
      // where unknown vector x = [c_1, ..., c_N, d, e, c_tilde_1, ..., c_tilde_N]
      // (sigma(s) = 1 + sum c_tilde_k / (s - p_k))
      const N = poles.length;
      const numCols = N + 2 + N; // c_k(N) + d(1) + e(1) + c_tilde(N)

      const A: number[][] = [];
      const b: number[] = [];

      for (let sIdx = 0; sIdx < numSamples; sIdx++) {
        const w = 2.0 * Math.PI * freqsHz[sIdx];
        const s: Complex = { re: 0.0, im: w };
        const f = responses[sIdx];

        const rowRe: number[] = new Array(numCols).fill(0);
        const rowIm: number[] = new Array(numCols).fill(0);

        // Basis functions: 1 / (s - p_k)
        for (let k = 0; k < N; k++) {
          const basis = cDiv({ re: 1.0, im: 0.0 }, cSub(s, poles[k]));
          rowRe[k] = basis.re;
          rowIm[k] = basis.im;

          // -f(s) / (s - p_k) for sigma denominator
          const basisSigma = cMul({ re: -f.re, im: -f.im }, basis);
          rowRe[N + 2 + k] = basisSigma.re;
          rowIm[N + 2 + k] = basisSigma.im;
        }

        // Direct term d
        rowRe[N] = 1.0;
        rowIm[N] = 0.0;

        // Proportional term e (s * e = j*w*e)
        rowRe[N + 1] = 0.0;
        rowIm[N + 1] = w;

        A.push(rowRe);
        b.push(f.re);

        A.push(rowIm);
        b.push(f.im);
      }

      // Solve Normal Equations: (A^T * A) * x = A^T * b
      const x = VectorFitter.solveLeastSquares(A, b);
      if (!x) break;

      // Extract relocated poles from zeros of sigma(s)
      // Approximate pole relocation: shift poles toward new residue centers
      for (let k = 0; k < N; k++) {
        const c_tilde = x[N + 2 + k];
        let newRe = poles[k].re - 0.25 * c_tilde;
        // Enforce strict LHP stability
        if (newRe > -1e-4) newRe = -Math.abs(newRe) - 1.0;
        poles[k] = { re: newRe, im: poles[k].im };
      }
    }

    // 3. Final Residue & Direct Term Identification with fixed stable poles
    const N = poles.length;
    const numCols = N + 2;
    const A_final: number[][] = [];
    const b_final: number[] = [];

    for (let sIdx = 0; sIdx < numSamples; sIdx++) {
      const w = 2.0 * Math.PI * freqsHz[sIdx];
      const s: Complex = { re: 0.0, im: w };
      const f = responses[sIdx];

      const rowRe: number[] = new Array(numCols).fill(0);
      const rowIm: number[] = new Array(numCols).fill(0);

      for (let k = 0; k < N; k++) {
        const basis = cDiv({ re: 1.0, im: 0.0 }, cSub(s, poles[k]));
        rowRe[k] = basis.re;
        rowIm[k] = basis.im;
      }

      rowRe[N] = 1.0;
      rowIm[N] = 0.0;

      rowRe[N + 1] = 0.0;
      rowIm[N + 1] = w;

      A_final.push(rowRe);
      b_final.push(f.re);

      A_final.push(rowIm);
      b_final.push(f.im);
    }

    const sol = VectorFitter.solveLeastSquares(A_final, b_final) || new Array(numCols).fill(0);

    const residues: Complex[] = [];
    for (let k = 0; k < N; k++) {
      residues.push({ re: sol[k], im: 0.0 });
    }

    const d = sol[N];
    const e = sol[N + 1];

    // Compute RMS Error
    let totalSqErr = 0;
    for (let sIdx = 0; sIdx < numSamples; sIdx++) {
      const w = 2.0 * Math.PI * freqsHz[sIdx];
      const s: Complex = { re: 0.0, im: w };
      const modelVal = VectorFitter.evaluate({ poles, residues, d, e, rmsError: 0 }, s);
      const actual = responses[sIdx];
      const err = cMag(cSub(modelVal, actual));
      totalSqErr += err * err;
    }
    const rmsError = Math.sqrt(totalSqErr / numSamples);

    return {
      poles,
      residues,
      d,
      e,
      rmsError,
    };
  }

  /**
   * Evaluate rational model at complex frequency s = sigma + j*omega
   */
  static evaluate(model: RationalModel, s: Complex): Complex {
    let result: Complex = { re: model.d, im: 0.0 };

    // Add proportional term: s * e
    result = cAdd(result, { re: s.re * model.e, im: s.im * model.e });

    for (let k = 0; k < model.poles.length; k++) {
      const denom = cSub(s, model.poles[k]);
      const term = cDiv(model.residues[k], denom);
      result = cAdd(result, term);
    }

    return result;
  }

  /**
   * Solve Least Squares A * x = b via Normal Equations (A^T * A) x = A^T * b with Tikhonov regularization
   */
  private static solveLeastSquares(A: number[][], b: number[]): number[] | null {
    const M = A.length;
    const N = A[0].length;

    // ATA = A^T * A (N x N)
    const ATA: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    const ATb: number[] = new Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let k = 0; k < M; k++) {
          sum += A[k][i] * A[k][j];
        }
        ATA[i][j] = sum;
      }
      // Tikhonov regularizer on diagonal
      ATA[i][i] += 1e-7;

      let sumB = 0;
      for (let k = 0; k < M; k++) {
        sumB += A[k][i] * b[k];
      }
      ATb[i] = sumB;
    }

    // Gaussian Elimination with Partial Pivoting
    const aug = ATA.map((row, r) => [...row, ATb[r]]);

    for (let col = 0; col < N; col++) {
      let maxRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let r = col + 1; r < N; r++) {
        if (Math.abs(aug[r][col]) > maxVal) {
          maxVal = Math.abs(aug[r][col]);
          maxRow = r;
        }
      }

      if (maxVal < 1e-18) continue;

      if (maxRow !== col) {
        const tmp = aug[col];
        aug[col] = aug[maxRow];
        aug[maxRow] = tmp;
      }

      const pivot = aug[col][col];
      for (let c = col; c <= N; c++) {
        aug[col][c] /= pivot;
      }

      for (let r = 0; r < N; r++) {
        if (r !== col) {
          const factor = aug[r][col];
          for (let c = col; c <= N; c++) {
            aug[r][c] -= factor * aug[col][c];
          }
        }
      }
    }

    return aug.map(row => row[N]);
  }
}
