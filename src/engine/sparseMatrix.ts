/**
 * PSCAD Modern - Sparse Matrix Data Structures (CSR / CSC / Coordinate Triplet)
 * 
 * Provides memory-efficient representation for large power system admittance matrices.
 */

export interface Triplet {
  r: number;
  c: number;
  val: number;
}

export class SparseMatrixCSR {
  rows: number;
  cols: number;
  rowPtr: Int32Array;
  colIndices: Int32Array;
  values: Float64Array;
  nnz: number;

  constructor(rows: number, cols: number, rowPtr: Int32Array, colIndices: Int32Array, values: Float64Array) {
    this.rows = rows;
    this.cols = cols;
    this.rowPtr = rowPtr;
    this.colIndices = colIndices;
    this.values = values;
    this.nnz = values.length;
  }

  get(r: number, c: number): number {
    const start = this.rowPtr[r];
    const end = this.rowPtr[r + 1];
    for (let k = start; k < end; k++) {
      if (this.colIndices[k] === c) {
        return this.values[k];
      }
    }
    return 0.0;
  }

  set(r: number, c: number, val: number): void {
    const start = this.rowPtr[r];
    const end = this.rowPtr[r + 1];
    for (let k = start; k < end; k++) {
      if (this.colIndices[k] === c) {
        this.values[k] = val;
        return;
      }
    }
    // If not found in sparsity pattern, cannot set without reassembly
  }

  multiplyVector(x: Float64Array, out?: Float64Array): Float64Array {
    const y = out || new Float64Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      let sum = 0.0;
      const start = this.rowPtr[i];
      const end = this.rowPtr[i + 1];
      for (let k = start; k < end; k++) {
        sum += this.values[k] * x[this.colIndices[k]];
      }
      y[i] = sum;
    }
    return y;
  }

  get sparsityRatio(): number {
    const totalEntries = this.rows * this.cols;
    if (totalEntries === 0) return 1.0;
    return 1.0 - this.nnz / totalEntries;
  }
}

export class SparseMatrixBuilder {
  rows: number;
  cols: number;
  triplets: Triplet[] = [];

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
  }

  add(r: number, c: number, val: number): void {
    if (Math.abs(val) < 1e-18) return;
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.triplets.push({ r, c, val });
    }
  }

  clear(): void {
    this.triplets = [];
  }

  buildCSR(): SparseMatrixCSR {
    const n = this.rows;
    // 1. Group and accumulate triplets by (r, c)
    const map = new Map<number, number>(); // key: r * cols + c -> val
    for (const t of this.triplets) {
      const key = t.r * this.cols + t.c;
      const existing = map.get(key) || 0.0;
      map.set(key, existing + t.val);
    }

    // Ensure diagonal elements exist for solver stability
    for (let i = 0; i < n; i++) {
      const key = i * this.cols + i;
      if (!map.has(key)) {
        map.set(key, 1e-12);
      }
    }

    // 2. Count non-zeros per row
    const rowCounts = new Int32Array(n);
    for (const key of map.keys()) {
      const r = Math.floor(key / this.cols);
      rowCounts[r]++;
    }

    // 3. Build rowPtr
    const rowPtr = new Int32Array(n + 1);
    rowPtr[0] = 0;
    for (let i = 0; i < n; i++) {
      rowPtr[i + 1] = rowPtr[i] + rowCounts[i];
    }

    const totalNnz = rowPtr[n];
    const colIndices = new Int32Array(totalNnz);
    const values = new Float64Array(totalNnz);

    // 4. Fill CSR arrays sorted by column index within each row
    const rowEntries: Array<Array<{ col: number; val: number }>> = Array.from({ length: n }, () => []);
    for (const [key, val] of map.entries()) {
      const r = Math.floor(key / this.cols);
      const c = key % this.cols;
      rowEntries[r].push({ col: c, val });
    }

    let k = 0;
    for (let r = 0; r < n; r++) {
      rowEntries[r].sort((a, b) => a.col - b.col);
      for (const entry of rowEntries[r]) {
        colIndices[k] = entry.col;
        values[k] = entry.val;
        k++;
      }
    }

    return new SparseMatrixCSR(this.rows, this.cols, rowPtr, colIndices, values);
  }
}
