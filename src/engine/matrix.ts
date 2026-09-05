/**
 * PSCAD CLONE - Matrix & LU Factorization Linear Solver
 * Solves [G][V] = [I] with high performance partial pivoting
 */

export class Matrix {
  rows: number;
  cols: number;
  data: Float64Array;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.data = new Float64Array(rows * cols);
  }

  static zeros(rows: number, cols: number): Matrix {
    return new Matrix(rows, cols);
  }

  static identity(n: number): Matrix {
    const m = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      m.data[i * n + i] = 1.0;
    }
    return m;
  }

  get(r: number, c: number): number {
    return this.data[r * this.cols + c];
  }

  set(r: number, c: number, val: number): void {
    this.data[r * this.cols + c] = val;
  }

  add(r: number, c: number, val: number): void {
    this.data[r * this.cols + c] += val;
  }

  clone(): Matrix {
    const copy = new Matrix(this.rows, this.cols);
    copy.data.set(this.data);
    return copy;
  }

  fill(val: number): void {
    this.data.fill(val);
  }
}

export class LUSolver {
  n: number;
  LU: Matrix;
  pivots: Int32Array;
  valid: boolean;

  constructor(matrix: Matrix) {
    this.n = matrix.rows;
    this.LU = matrix.clone();
    this.pivots = new Int32Array(this.n);
    this.valid = false;
    this.factorize();
  }

  factorize(): void {
    const n = this.n;
    const lu = this.LU.data;

    for (let i = 0; i < n; i++) {
      this.pivots[i] = i;
    }

    for (let i = 0; i < n; i++) {
      let maxVal = 0.0;
      let pivotRow = i;
      for (let k = i; k < n; k++) {
        const val = Math.abs(lu[k * n + i]);
        if (val > maxVal) {
          maxVal = val;
          pivotRow = k;
        }
      }

      if (maxVal < 1e-14) {
        lu[i * n + i] += 1e-11;
      }

      if (pivotRow !== i) {
        for (let k = 0; k < n; k++) {
          const tmp = lu[i * n + k];
          lu[i * n + k] = lu[pivotRow * n + k];
          lu[pivotRow * n + k] = tmp;
        }
        const tmpP = this.pivots[i];
        this.pivots[i] = this.pivots[pivotRow];
        this.pivots[pivotRow] = tmpP;
      }

      const diag = lu[i * n + i];
      if (Math.abs(diag) > 1e-16) {
        for (let j = i + 1; j < n; j++) {
          lu[j * n + i] /= diag;
          const mult = lu[j * n + i];
          for (let k = i + 1; k < n; k++) {
            lu[j * n + k] -= mult * lu[i * n + k];
          }
        }
      }
    }

    this.valid = true;
  }

  solve(b: Float64Array, out?: Float64Array): Float64Array {
    const n = this.n;
    const lu = this.LU.data;
    const x = out || new Float64Array(n);

    for (let i = 0; i < n; i++) {
      x[i] = b[this.pivots[i]];
    }

    for (let i = 0; i < n; i++) {
      let sum = x[i];
      for (let j = 0; j < i; j++) {
        sum -= lu[i * n + j] * x[j];
      }
      x[i] = sum;
    }

    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i];
      for (let j = i + 1; j < n; j++) {
        sum -= lu[i * n + j] * x[j];
      }
      const diag = lu[i * n + i];
      x[i] = Math.abs(diag) > 1e-16 ? sum / diag : 0.0;
    }

    return x;
  }
}
