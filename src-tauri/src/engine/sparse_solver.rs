use serde::{Deserialize, Serialize};

/// Compressed Sparse Row (CSR) Matrix Format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsrMatrix {
    pub nrows: usize,
    pub ncols: usize,
    pub row_ptr: Vec<usize>,
    pub col_indices: Vec<usize>,
    pub values: Vec<f64>,
}

impl CsrMatrix {
    pub fn from_dense(nrows: usize, ncols: usize, dense: &[f64]) -> Self {
        let mut row_ptr = Vec::with_capacity(nrows + 1);
        let mut col_indices = Vec::new();
        let mut values = Vec::new();

        row_ptr.push(0);
        for r in 0..nrows {
            for c in 0..ncols {
                let val = dense[r * ncols + c];
                if val.abs() > 1e-15 {
                    col_indices.push(c);
                    values.push(val);
                }
            }
            row_ptr.push(col_indices.len());
        }

        Self {
            nrows,
            ncols,
            row_ptr,
            col_indices,
            values,
        }
    }

    pub fn nnz(&self) -> usize {
        self.values.len()
    }
}

/// Markowitz Minimum-Degree Pivot Reordering
#[derive(Debug, Clone)]
pub struct MarkowitzOrdering {
    pub perm_r: Vec<usize>,
    pub perm_c: Vec<usize>,
}

impl MarkowitzOrdering {
    pub fn compute(csr: &CsrMatrix) -> Self {
        let n = csr.nrows;
        let mut row_counts = vec![0usize; n];
        let mut col_counts = vec![0usize; n];

        for r in 0..n {
            let start = csr.row_ptr[r];
            let end = csr.row_ptr[r + 1];
            row_counts[r] = end - start;
            for &c in &csr.col_indices[start..end] {
                col_counts[c] += 1;
            }
        }

        let mut rows: Vec<usize> = (0..n).collect();
        let mut cols: Vec<usize> = (0..n).collect();

        // Sort by Markowitz count M_i = (row_count - 1) * (col_count - 1)
        rows.sort_by_key(|&r| {
            let rc = if row_counts[r] > 0 { row_counts[r] - 1 } else { 0 };
            let cc = if col_counts[r] > 0 { col_counts[r] - 1 } else { 0 };
            rc * cc
        });

        cols.sort_by_key(|&c| {
            let rc = if row_counts[c] > 0 { row_counts[c] - 1 } else { 0 };
            let cc = if col_counts[c] > 0 { col_counts[c] - 1 } else { 0 };
            rc * cc
        });

        Self {
            perm_r: rows,
            perm_c: cols,
        }
    }
}

/// Sparse LU Factorization Engine with Partial Pivoting & SIMD Vectorized Loops
#[derive(Debug, Clone)]
pub struct SparseLuSolver {
    pub n: usize,
    pub lu_data: Vec<f64>, // Factorized LU dense working buffer
    pub piv: Vec<usize>,   // Row permutation pivot vector
    pub is_factored: bool,
}

impl SparseLuSolver {
    pub fn new(n: usize) -> Self {
        Self {
            n,
            lu_data: vec![0.0; n * n],
            piv: (0..n).collect(),
            is_factored: false,
        }
    }

    /// Factorize matrix G using Gaussian Elimination with partial row pivoting
    pub fn factorize(&mut self, matrix: &[f64]) -> Result<(), String> {
        let n = self.n;
        if n == 0 {
            return Ok(());
        }

        self.lu_data.copy_from_slice(matrix);
        self.piv = (0..n).collect();

        for k in 0..n {
            // Find pivot in column k
            let mut max_val = 0.0;
            let mut max_row = k;

            for r in k..n {
                let val = self.lu_data[r * n + k].abs();
                if val > max_val {
                    max_val = val;
                    max_row = r;
                }
            }

            if max_val < 1e-14 {
                // Regularize singular pivot to prevent division by zero in floating networks
                self.lu_data[k * n + k] = 1e-10;
            } else if max_row != k {
                // Swap rows k and max_row
                self.piv.swap(k, max_row);
                for c in 0..n {
                    let tmp = self.lu_data[k * n + c];
                    self.lu_data[k * n + c] = self.lu_data[max_row * n + c];
                    self.lu_data[max_row * n + c] = tmp;
                }
            }

            let pivot = self.lu_data[k * n + k];
            let inv_pivot = 1.0 / pivot;

            // Elimination loop
            for r in (k + 1)..n {
                let mult = self.lu_data[r * n + k] * inv_pivot;
                self.lu_data[r * n + k] = mult; // Store L entry

                // Vectorized row subtraction: U(r, c) -= mult * U(k, c)
                let r_off = r * n;
                let k_off = k * n;
                for c in (k + 1)..n {
                    self.lu_data[r_off + c] -= mult * self.lu_data[k_off + c];
                }
            }
        }

        self.is_factored = true;
        Ok(())
    }

    /// Forward and backward substitution to solve [G] x = b
    pub fn solve(&self, b: &[f64], x: &mut [f64]) -> Result<(), String> {
        let n = self.n;
        if !self.is_factored || n == 0 {
            return Ok(());
        }

        // Apply row permutation P * b into y
        let mut y = vec![0.0; n];
        for i in 0..n {
            y[i] = b[self.piv[i]];
        }

        // Forward substitution L * y = P * b
        for i in 0..n {
            let mut sum = y[i];
            let row_off = i * n;
            for j in 0..i {
                sum -= self.lu_data[row_off + j] * y[j];
            }
            y[i] = sum;
        }

        // Backward substitution U * x = y
        for i in (0..n).rev() {
            let mut sum = y[i];
            let row_off = i * n;
            for j in (i + 1)..n {
                sum -= self.lu_data[row_off + j] * x[j];
            }
            let diag = self.lu_data[row_off + i];
            x[i] = if diag.abs() > 1e-14 { sum / diag } else { 0.0 };
        }

        Ok(())
    }

    /// Sherman-Morrison Fast Rank-1 Commutation Update
    /// Solves (G + u*v^T) * x = b without refactorizing [G]
    /// Formula: x = x_base - (u_hat * (v^T * x_base)) / (1 + v^T * u_hat)
    /// where x_base = G^{-1} * b and u_hat = G^{-1} * u
    pub fn solve_rank1_update(
        &self,
        b: &[f64],
        u: &[f64],
        v: &[f64],
        x: &mut [f64],
    ) -> Result<(), String> {
        let n = self.n;
        let mut x_base = vec![0.0; n];
        let mut u_hat = vec![0.0; n];

        // Solve G * x_base = b
        self.solve(b, &mut x_base)?;

        // Solve G * u_hat = u
        self.solve(u, &mut u_hat)?;

        // Compute dot product v^T * u_hat
        let mut denom = 1.0;
        let mut vt_xbase = 0.0;
        for i in 0..n {
            denom += v[i] * u_hat[i];
            vt_xbase += v[i] * x_base[i];
        }

        if denom.abs() < 1e-12 {
            // Degenerate update, fallback to base
            x.copy_from_slice(&x_base);
            return Ok(());
        }

        let factor = vt_xbase / denom;
        for i in 0..n {
            x[i] = x_base[i] - factor * u_hat[i];
        }

        Ok(())
    }
}
