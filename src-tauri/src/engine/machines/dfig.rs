use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Doubly-Fed Induction Generator (DFIG Type 3) Model with Crowbar Protection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DfigMachine {
    pub id: String,
    pub stator_nodes: [NodeId; 3],
    pub rotor_nodes: [NodeId; 3],
    pub p_rated_mw: f64,
    pub v_rated_kv: f64,
    pub slip: f64,
    pub r_stator: f64,
    pub x_stator: f64,
    pub r_rotor: f64,
    pub x_rotor: f64,
    pub x_mag: f64,
    pub crowbar_active: bool,
    pub r_crowbar: f64,
    pub v_dc_link: f64,
    pub g_stator_eq: f64,
    pub i_inj_stator: [f64; 3],
}

impl DfigMachine {
    pub fn new(
        id: &str,
        stator_nodes: [NodeId; 3],
        rotor_nodes: [NodeId; 3],
        p_rated_mw: f64,
        v_rated_kv: f64,
        dt: f64,
    ) -> Self {
        let r_stator = 0.01;
        let x_stator = 0.10;
        let r_base = (v_rated_kv * v_rated_kv) / p_rated_mw;
        let r_stator_ohm = r_stator * r_base;
        let l_stator = (x_stator * r_base) / (2.0 * std::f64::consts::PI * 60.0);

        let r_eq = r_stator_ohm + (2.0 * l_stator) / dt;
        let g_stator_eq = 1.0 / r_eq;

        Self {
            id: id.to_string(),
            stator_nodes,
            rotor_nodes,
            p_rated_mw,
            v_rated_kv,
            slip: -0.2, // Typical supersynchronous operation
            r_stator,
            x_stator,
            r_rotor: 0.01,
            x_rotor: 0.10,
            x_mag: 3.5,
            crowbar_active: false,
            r_crowbar: 0.20,
            v_dc_link: 1150.0,
            g_stator_eq,
            i_inj_stator: [0.0; 3],
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        for &node in &self.stator_nodes {
            if node > 0 {
                g_matrix.add(node, node, self.g_stator_eq);
            }
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        for (i, &node) in self.stator_nodes.iter().enumerate() {
            if node > 0 {
                rhs.add(node, self.i_inj_stator[i]);
            }
        }
    }

    pub fn trigger_crowbar(&mut self, activate: bool) {
        self.crowbar_active = activate;
    }

    pub fn step_control(&mut self, v_grid_mag: f64, v_stator: &[f64; 3]) {
        // Under severe grid fault (V < 0.5 pu), fire crowbar to protect RSC
        if v_grid_mag < 0.50 {
            self.crowbar_active = true;
        }

        // Stator injection calculation
        let factor = if self.crowbar_active { 0.3 } else { 1.0 };
        for i in 0..3 {
            self.i_inj_stator[i] = -factor * (v_stator[i] * self.g_stator_eq);
        }
    }
}
