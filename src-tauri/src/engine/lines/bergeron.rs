use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// 1-Phase Constant Parameter (CP) Bergeron Distributed Line Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BergeronLine1Phase {
    pub id: String,
    pub node_k: NodeId, // Sending end
    pub node_m: NodeId, // Receiving end
    pub z_c: f64,       // Surge impedance sqrt(L/C)
    pub tau: f64,       // Propagation transit time d / v (s)
    pub r_total: f64,   // Total series DC resistance (Ohms)
    pub g_eq: f64,      // Norton equivalent conductance
    pub delay_steps: usize,
    pub hist_k: Vec<f64>, // Ring buffer of sending end history [v_k + (Z_c - R/4)*i_k]
    pub hist_m: Vec<f64>, // Ring buffer of receiving end history [v_m + (Z_c - R/4)*i_m]
    pub ring_idx: usize,
    pub i_inj_k: f64,
    pub i_inj_m: f64,
}

impl BergeronLine1Phase {
    pub fn calculate_bergeron_params(z_c: f64, r_total: f64) -> (f64, f64) {
        let r_quarter = r_total / 4.0;
        let g_eq = (1.0 + r_quarter / z_c) / (z_c + r_quarter);
        let h = (z_c - r_quarter) / (z_c + r_quarter);
        (g_eq, h)
    }

    pub fn new(
        id: &str,
        node_k: NodeId,
        node_m: NodeId,
        z_c: f64,
        tau: f64,
        r_total: f64,
        dt: f64,
    ) -> Self {
        let delay_steps = ((tau / dt).round() as usize).max(1);
        let (g_eq, _) = Self::calculate_bergeron_params(z_c, r_total);

        Self {
            id: id.to_string(),
            node_k,
            node_m,
            z_c,
            tau,
            r_total,
            g_eq,
            delay_steps,
            hist_k: vec![0.0; delay_steps + 1],
            hist_m: vec![0.0; delay_steps + 1],
            ring_idx: 0,
            i_inj_k: 0.0,
            i_inj_m: 0.0,
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        if self.node_k > 0 {
            g_matrix.add(self.node_k, self.node_k, self.g_eq);
        }
        if self.node_m > 0 {
            g_matrix.add(self.node_m, self.node_m, self.g_eq);
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        if self.node_k > 0 {
            rhs.add(self.node_k, self.i_inj_k);
        }
        if self.node_m > 0 {
            rhs.add(self.node_m, self.i_inj_m);
        }
    }

    pub fn update_step(&mut self, v_k: f64, v_m: f64) {
        let r_quarter = self.r_total / 4.0;
        let factor = (1.0 - r_quarter / self.z_c) / (1.0 + r_quarter / self.z_c);

        // Forward traveling wave arrives from m to k:
        let delayed_idx = (self.ring_idx + 1) % (self.delay_steps + 1);
        let wave_from_m = self.hist_m[delayed_idx];
        let wave_from_k = self.hist_k[delayed_idx];

        self.i_inj_k = -(1.0 + factor) * wave_from_m;
        self.i_inj_m = -(1.0 + factor) * wave_from_k;

        // Current entering line from nodes
        let i_k = self.g_eq * v_k - self.i_inj_k;
        let i_m = self.g_eq * v_m - self.i_inj_m;

        // Store current wave into ring buffer
        self.hist_k[self.ring_idx] = (1.0 + r_quarter / self.z_c) * (v_k / (self.z_c + r_quarter)) + factor * i_k;
        self.hist_m[self.ring_idx] = (1.0 + r_quarter / self.z_c) * (v_m / (self.z_c + r_quarter)) + factor * i_m;

        self.ring_idx = (self.ring_idx + 1) % (self.delay_steps + 1);
    }
}

/// 3-Phase Polyphase Coupled Bergeron Line Model with Clarke Modal Decoupling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolyphaseBergeronLine {
    pub id: String,
    pub nodes_k: [NodeId; 3], // [A_k, B_k, C_k]
    pub nodes_m: [NodeId; 3], // [A_m, B_m, C_m]
    pub mode_lines: [BergeronLine1Phase; 3], // Modes: [Mode 0 (ground), Mode 1 (aerial α), Mode 2 (aerial β)]
}

impl PolyphaseBergeronLine {
    pub fn new(
        id: &str,
        nodes_k: [NodeId; 3],
        nodes_m: [NodeId; 3],
        z_c_aerial: f64,
        tau_aerial: f64,
        r_aerial: f64,
        z_c_ground: f64,
        tau_ground: f64,
        r_ground: f64,
        dt: f64,
    ) -> Self {
        let line_mode0 = BergeronLine1Phase::new(
            &format!("{}_mode0", id),
            nodes_k[0],
            nodes_m[0],
            z_c_ground,
            tau_ground,
            r_ground,
            dt,
        );
        let line_mode1 = BergeronLine1Phase::new(
            &format!("{}_mode1", id),
            nodes_k[1],
            nodes_m[1],
            z_c_aerial,
            tau_aerial,
            r_aerial,
            dt,
        );
        let line_mode2 = BergeronLine1Phase::new(
            &format!("{}_mode2", id),
            nodes_k[2],
            nodes_m[2],
            z_c_aerial,
            tau_aerial,
            r_aerial,
            dt,
        );

        Self {
            id: id.to_string(),
            nodes_k,
            nodes_m,
            mode_lines: [line_mode0, line_mode1, line_mode2],
        }
    }

    /// Clarke modal transformation: [V_0, V_α, V_β]^T = [T_c] * [V_a, V_b, V_c]^T
    #[inline(always)]
    pub fn clarke_forward(v_phase: &[f64; 3]) -> [f64; 3] {
        let inv_sqrt3 = 1.0 / 3.0f64.sqrt();
        let inv_3 = 1.0 / 3.0;
        let v0 = inv_3 * (v_phase[0] + v_phase[1] + v_phase[2]);
        let valpha = (2.0 / 3.0) * (v_phase[0] - 0.5 * v_phase[1] - 0.5 * v_phase[2]);
        let vbeta = inv_sqrt3 * (v_phase[1] - v_phase[2]);
        [v0, valpha, vbeta]
    }

    /// Inverse Clarke transformation: [V_a, V_b, V_c]^T = [T_c]^{-1} * [V_0, V_α, V_β]^T
    #[inline(always)]
    pub fn clarke_inverse(v_mode: &[f64; 3]) -> [f64; 3] {
        let sqrt3_over_2 = 3.0f64.sqrt() / 2.0;
        let va = v_mode[0] + v_mode[1];
        let vb = v_mode[0] - 0.5 * v_mode[1] + sqrt3_over_2 * v_mode[2];
        let vc = v_mode[0] - 0.5 * v_mode[1] - sqrt3_over_2 * v_mode[2];
        [va, vb, vc]
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        let g_aerial = self.mode_lines[1].g_eq;
        let g_ground = self.mode_lines[0].g_eq;

        // Phase domain self- and mutual conductances
        let g_self = (g_ground + 2.0 * g_aerial) / 3.0;
        let g_mut = (g_ground - g_aerial) / 3.0;

        for p in 0..3 {
            let nk = self.nodes_k[p];
            let nm = self.nodes_m[p];
            if nk > 0 {
                g_matrix.add(nk, nk, g_self);
            }
            if nm > 0 {
                g_matrix.add(nm, nm, g_self);
            }
            for q in (p + 1)..3 {
                let nk_q = self.nodes_k[q];
                let nm_q = self.nodes_m[q];
                if nk > 0 && nk_q > 0 {
                    g_matrix.add(nk, nk_q, g_mut);
                    g_matrix.add(nk_q, nk, g_mut);
                }
                if nm > 0 && nm_q > 0 {
                    g_matrix.add(nm, nm_q, g_mut);
                    g_matrix.add(nm_q, nm, g_mut);
                }
            }
        }
    }

    pub fn update_step(&mut self, v_k_phase: &[f64; 3], v_m_phase: &[f64; 3]) {
        let v_k_mode = Self::clarke_forward(v_k_phase);
        let v_m_mode = Self::clarke_forward(v_m_phase);

        for m in 0..3 {
            self.mode_lines[m].update_step(v_k_mode[m], v_m_mode[m]);
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        let i_inj_k_mode = [
            self.mode_lines[0].i_inj_k,
            self.mode_lines[1].i_inj_k,
            self.mode_lines[2].i_inj_k,
        ];
        let i_inj_m_mode = [
            self.mode_lines[0].i_inj_m,
            self.mode_lines[1].i_inj_m,
            self.mode_lines[2].i_inj_m,
        ];

        let i_inj_k_phase = Self::clarke_inverse(&i_inj_k_mode);
        let i_inj_m_phase = Self::clarke_inverse(&i_inj_m_mode);

        for p in 0..3 {
            if self.nodes_k[p] > 0 {
                rhs.add(self.nodes_k[p], i_inj_k_phase[p]);
            }
            if self.nodes_m[p] > 0 {
                rhs.add(self.nodes_m[p], i_inj_m_phase[p]);
            }
        }
    }
}
