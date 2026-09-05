/**
 * PSCAD CLONE - High-Performance Sparse LU Linear Solver with Markowitz Pivoting
 * 
 * Solves [G][V] = [I] for large-scale power transmission grids.
 * Implements:
 * 1. Markowitz minimum-degree reordering to minimize fill-in.
 * 2. Numerical threshold pivoting (|a_ij| >= u * max_k |a_kj|, u = 0.1).
 * 3. Fast sparse forward/backward substitution.
 */

import { SparseMatrixCSR } from './sparseMatrix';

export class SparseLUSolver {
  n: number;
  valid: boolean = false;
  
  // Permutation vectors: P (row permutation), Q (col permutation), invP, invQ
  rowPerm: Int32Array;
  colPerm: Int32Array;
  invRowPerm: Int32Array;
  invColPerm: Int32Array;

  // Factored L and U in indexed arrays
  // L is unit lower triangular; U has diagonal entries on U_diag
  L_rowPtr: Int32Array;
  L_cols: Int32Array;
  L_vals: Float64Array;

  U_rowPtr: Int32Array;
  U_cols: Int32Array;
  U_vals: Float64Array;
  U_diag: Float64Array;

  thresholdU: number = 0.1; // Markowitz threshold parameter
  fillInCount: number = 0;
  factorizationTimeMs: number = 0;

  constructor(csr: SparseMatrixCSR, thresholdU: number = 0.1) {
    this.n = csr.rows;
    this.thresholdU = thresholdU;

    this.rowPerm = new Int32Array(this.n);
    this.colPerm = new Int32Array(this.n);
    this.invRowPerm = new Int32Array(this.n);
    this.invColPerm = new Int32Array(this.n);

    for (let i = 0; i < this.n; i++) {
      this.rowPerm[i] = i;
      this.colPerm[i] = i;
      this.invRowPerm[i] = i;
      this.invColPerm[i] = i;
    }

    // Default empty allocations
    this.L_rowPtr = new Int32Array(this.n + 1);
    this.L_cols = new Int32Array(0);
    this.L_vals = new Float64Array(0);

    this.U_rowPtr = new Int32Array(this.n + 1);
    this.U_cols = new Int32Array(0);
    this.U_vals = new Float64Array(0);
    this.U_diag = new Float64Array(this.n);

    if (this.n > 0) {
      this.factorize(csr);
    }
  }

  factorize(csr: SparseMatrixCSR): void {
    const tStart = performance.now();
    const n = this.n;
    if (n === 0) {
      this.valid = true;
      return;
    }

    // Convert CSR into dynamic 2D row maps for efficient Markowitz elimination & fill-in
    const A_rows: Array<Map<number, number>> = Array.from({ length: n }, () => new Map());
    for (let r = 0; r < n; r++) {
      const start = csr.rowPtr[r];
      const end = csr.rowPtr[r + 1];
      for (let k = start; k < end; k++) {
        const c = csr.colIndices[k];
        const val = csr.values[k];
        if (Math.abs(val) > 1e-16) {
          A_rows[r].set(c, val);
        }
      }
      // Ensure diagonal element exists
      if (!A_rows[r].has(r)) {
        A_rows[r].set(r, 1e-12);
      }
    }

    const rowDegree = new Int32Array(n);
    const colDegree = new Int32Array(n);
    for (let r = 0; r < n; r++) {
      rowDegree[r] = A_rows[r].size;
      for (const c of A_rows[r].keys()) {
        colDegree[c]++;
      }
    }

    const eliminatedRows = new Uint8Array(n);
    const eliminatedCols = new Uint8Array(n);

    const L_entries: Array<Array<{ col: number; val: number }>> = Array.from({ length: n }, () => []);
    const U_entries: Array<Array<{ col: number; val: number }>> = Array.from({ length: n }, () => []);

    this.fillInCount = 0;

    // Step-by-step Markowitz pivot selection & elimination
    for (let step = 0; step < n; step++) {
      let bestPivotRow = -1;
      let bestPivotCol = -1;
      let minMarkowitz = Infinity;
      let maxValInCol = 0.0;

      // Find best pivot (r, c)
      for (let r = 0; r < n; r++) {
        if (eliminatedRows[r]) continue;
        const rowMap = A_rows[r];

        // Find max element in row for threshold pivoting
        let rowMax = 0.0;
        for (const [c, val] of rowMap.entries()) {
          if (!eliminatedCols[c] && Math.abs(val) > rowMax) {
            rowMax = Math.abs(val);
          }
        }

        if (rowMax < 1e-15) continue;

        for (const [c, val] of rowMap.entries()) {
          if (eliminatedCols[c]) continue;
          const absVal = Math.abs(val);

          // Threshold pivoting condition
          if (absVal >= this.thresholdU * rowMax) {
            const markowitzCost = (rowDegree[r] - 1) * (colDegree[c] - 1);
            if (markowitzCost < minMarkowitz || (markowitzCost === minMarkowitz && absVal > maxValInCol)) {
              minMarkowitz = markowitzCost;
              bestPivotRow = r;
              bestPivotCol = c;
              maxValInCol = absVal;
            }
          }
        }
      }

      // Fallback if no pivot passed threshold
      if (bestPivotRow === -1) {
        for (let r = 0; r < n; r++) {
          if (!eliminatedRows[r]) {
            for (const [c] of A_rows[r].entries()) {
              if (!eliminatedCols[c]) {
                bestPivotRow = r;
                bestPivotCol = c;
                break;
              }
            }
            if (bestPivotRow !== -1) break;
          }
        }
      }

      if (bestPivotRow === -1 || bestPivotCol === -1) {
        // Singular/unconnected node, assign first remaining
        for (let r = 0; r < n; r++) {
          if (!eliminatedRows[r]) {
            bestPivotRow = r;
            break;
          }
        }
        for (let c = 0; c < n; c++) {
          if (!eliminatedCols[c]) {
            bestPivotCol = c;
            break;
          }
        }
        A_rows[bestPivotRow].set(bestPivotCol, 1e-10);
      }

      // Record permutations for this step
      this.rowPerm[step] = bestPivotRow;
      this.colPerm[step] = bestPivotCol;
      this.invRowPerm[bestPivotRow] = step;
      this.invColPerm[bestPivotCol] = step;

      eliminatedRows[bestPivotRow] = 1;
      eliminatedCols[bestPivotCol] = 1;

      const pivotVal = A_rows[bestPivotRow].get(bestPivotCol) || 1e-11;
      this.U_diag[step] = pivotVal;

      // Extract U row for this step
      for (const [c, val] of A_rows[bestPivotRow].entries()) {
        if (!eliminatedCols[c] && c !== bestPivotCol) {
          U_entries[step].push({ col: c, val });
        }
      }

      // Perform elimination on remaining active rows
      for (let r = 0; r < n; r++) {
        if (eliminatedRows[r] && r !== bestPivotRow) continue;
        if (eliminatedRows[r]) continue;

        const targetMap = A_rows[r];
        if (targetMap.has(bestPivotCol)) {
          const entryVal = targetMap.get(bestPivotCol)!;
          const mult = entryVal / pivotVal;

          // Record L entry
          L_entries[r].push({ col: step, val: mult });
          targetMap.delete(bestPivotCol);
          colDegree[bestPivotCol]--;

          // Eliminate across row
          for (const uEntry of U_entries[step]) {
            const col = uEntry.col;
            const updateVal = mult * uEntry.val;
            const currentVal = targetMap.get(col) || 0.0;
            const newVal = currentVal - updateVal;

            if (!targetMap.has(col)) {
              // Fill-in created!
              this.fillInCount++;
              rowDegree[r]++;
              colDegree[col]++;
            }

            if (Math.abs(newVal) > 1e-16) {
              targetMap.set(col, newVal);
            } else {
              targetMap.delete(col);
              rowDegree[r]--;
              colDegree[col]--;
            }
          }
        }
      }
    }

    // Convert L and U entries to flat CSR structures for rapid O(nnz) solving
    this.buildPackedFactors(L_entries, U_entries);
    this.valid = true;
    this.factorizationTimeMs = performance.now() - tStart;
  }

  private buildPackedFactors(
    L_entries: Array<Array<{ col: number; val: number }>>,
    U_entries: Array<Array<{ col: number; val: number }>>
  ): void {
    const n = this.n;

    // Build L CSR (permuted order)
    let totalL = 0;
    for (let i = 0; i < n; i++) {
      const origRow = this.rowPerm[i];
      totalL += L_entries[origRow].length;
    }

    this.L_rowPtr = new Int32Array(n + 1);
    this.L_cols = new Int32Array(totalL);
    this.L_vals = new Float64Array(totalL);

    let kL = 0;
    for (let i = 0; i < n; i++) {
      this.L_rowPtr[i] = kL;
      const origRow = this.rowPerm[i];
      for (const entry of L_entries[origRow]) {
        this.L_cols[kL] = entry.col;
        this.L_vals[kL] = entry.val;
        kL++;
      }
    }
    this.L_rowPtr[n] = kL;

    // Build U CSR
    let totalU = 0;
    for (let i = 0; i < n; i++) {
      totalU += U_entries[i].length;
    }

    this.U_rowPtr = new Int32Array(n + 1);
    this.U_cols = new Int32Array(totalU);
    this.U_vals = new Float64Array(totalU);

    let kU = 0;
    for (let i = 0; i < n; i++) {
      this.U_rowPtr[i] = kU;
      for (const entry of U_entries[i]) {
        // Store permuted column index
        const permCol = this.invColPerm[entry.col];
        this.U_cols[kU] = permCol;
        this.U_vals[kU] = entry.val;
        kU++;
      }
    }
    this.U_rowPtr[n] = kU;
  }

  /**
   * Solve [G][x] = [b] using sparse forward and backward substitution
   */
  solve(b: Float64Array, out?: Float64Array): Float64Array {
    const n = this.n;
    const x = out || new Float64Array(n);
    if (!this.valid || n === 0) return x;

    const y = new Float64Array(n);

    // Forward solve: L y = P b
    for (let i = 0; i < n; i++) {
      let sum = b[this.rowPerm[i]];
      const start = this.L_rowPtr[i];
      const end = this.L_rowPtr[i + 1];
      for (let k = start; k < end; k++) {
        sum -= this.L_vals[k] * y[this.L_cols[k]];
      }
      y[i] = sum;
    }

    // Backward solve: U z = y
    const z = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      const start = this.U_rowPtr[i];
      const end = this.U_rowPtr[i + 1];
      for (let k = start; k < end; k++) {
        sum -= this.U_vals[k] * z[this.U_cols[k]];
      }
      const diag = this.U_diag[i];
      z[i] = Math.abs(diag) > 1e-15 ? sum / diag : 0.0;
    }

    // Un-permute: x = Q z
    for (let i = 0; i < n; i++) {
      x[this.colPerm[i]] = z[i];
    }

    return x;
  }
}
