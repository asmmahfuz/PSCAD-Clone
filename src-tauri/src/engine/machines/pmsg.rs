use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Permanent Magnet Synchronous Generator (PMSG Type 4) Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmsgMachine {
    pub id: String,
    pub grid_nodes: [NodeId; 3],
    pub p_rated_mw: f64,
    pub v_rated_kv: f64,
    pub wind_speed_ms: f64,
    pub rotor_speed_rads: f64,
    pub p_opt_mppt_mw: f64,
    pub v_dc_link: f64,
    pub g_grid_eq: f64,
    pub i_inj_grid: [f64; 3],
}

impl PmsgMachine {
    pub fn new(
        id: &str,
        grid_nodes: [NodeId; 3],
        p_rated_mw: f64,
        v_rated_kv: f64,
        dt: f64,
    ) -> Self {
        let r_base = (v_rated_kv * v_rated_kv) / p_rated_mw;
        let l_filter = (0.15 * r_base) / (2.0 * std::f64::consts::PI * 60.0);
        let r_eq = 0.005 * r_base + (2.0 * l_filter) / dt;
        let g_grid_eq = 1.0 / r_eq;

        Self {
            id: id.to_string(),
            grid_nodes,
            p_rated_mw,
            v_rated_kv,
            wind_speed_ms: 11.5,
            rotor_speed_rads: 1.5,
            p_opt_mppt_mw: 2.0,
            v_dc_link: 1200.0,
            g_grid_eq,
            i_inj_grid: [0.0; 3],
        }
    }

    /// Maximum Power Point Tracking (MPPT) Cubic Optimal Power Curve: P_opt = k_opt * omega^3
    pub fn update_mppt(&mut self, wind_speed: f64) {
        self.wind_speed_ms = wind_speed;
        let k_opt = 0.58; // Optimal aerodynamic tracking coefficient
        self.rotor_speed_rads = (wind_speed * 0.15).clamp(0.8, 1.8);
        self.p_opt_mppt_mw = (k_opt * self.rotor_speed_rads.powi(3)).min(self.p_rated_mw);
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        for &node in &self.grid_nodes {
            if node > 0 {
                g_matrix.add(node, node, self.g_grid_eq);
            }
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector, theta_grid: f64) {
        // Grid-side converter synthesizes active power injection into AC grid
        let i_mag = (self.p_opt_mppt_mw * 1e6) / (3.0f64.sqrt() * self.v_rated_kv * 1e3);

        let ia = i_mag * theta_grid.sin();
        let ib = i_mag * (theta_grid - 2.0 * std::f64::consts::PI / 3.0).sin();
        let ic = -(ia + ib);
        let inj_currents = [ia, ib, ic];

        for (i, &node) in self.grid_nodes.iter().enumerate() {
            if node > 0 {
                rhs.add(node, inj_currents[i]);
            }
        }
    }
}
