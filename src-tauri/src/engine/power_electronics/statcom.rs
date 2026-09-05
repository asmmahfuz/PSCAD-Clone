use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Decoupled d-q PI Vector Controller for STATCOM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatcomController {
    pub kp_q: f64,
    pub ki_q: f64,
    pub kp_v: f64,
    pub ki_v: f64,
    pub integ_q: f64,
    pub integ_v: f64,
    pub q_ref_kvar: f64,
    pub v_dc_ref: f64,
    pub v_dc_meas: f64,
    pub i_d_ref: f64,
    pub i_q_ref: f64,
}

impl Default for StatcomController {
    fn default() -> Self {
        Self {
            kp_q: 0.5,
            ki_q: 20.0,
            kp_v: 1.0,
            ki_v: 50.0,
            integ_q: 0.0,
            integ_v: 0.0,
            q_ref_kvar: 0.0,
            v_dc_ref: 1000.0,
            v_dc_meas: 1000.0,
            i_d_ref: 0.0,
            i_q_ref: 0.0,
        }
    }
}

/// Static Synchronous Compensator (STATCOM) Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatcomModel {
    pub id: String,
    pub ac_nodes: [NodeId; 3], // [A, B, C]
    pub l_filter: f64,         // Interfacing coupling reactor
    pub r_filter: f64,
    pub c_dc: f64,             // DC link energy storage capacitor
    pub ctrl: StatcomController,
    pub g_eq: f64,
    pub i_inj_phase: [f64; 3],
}

impl StatcomModel {
    pub fn new(
        id: &str,
        ac_nodes: [NodeId; 3],
        l_filter: f64,
        r_filter: f64,
        c_dc: f64,
        dt: f64,
    ) -> Self {
        let r_eq = r_filter + (2.0 * l_filter) / dt;
        let g_eq = 1.0 / r_eq;

        Self {
            id: id.to_string(),
            ac_nodes,
            l_filter,
            r_filter,
            c_dc,
            ctrl: StatcomController::default(),
            g_eq,
            i_inj_phase: [0.0; 3],
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        for &node in &self.ac_nodes {
            if node > 0 {
                g_matrix.add(node, node, self.g_eq);
            }
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        for (i, &node) in self.ac_nodes.iter().enumerate() {
            if node > 0 {
                rhs.add(node, self.i_inj_phase[i]);
            }
        }
    }

    /// Step STATCOM d-q decoupled current controller
    pub fn step_control(&mut self, theta: f64, q_meas_kvar: f64, dt: f64) {
        // Reactive power loop: err_q = Q_ref - Q_meas
        let err_q = self.ctrl.q_ref_kvar - q_meas_kvar;
        self.ctrl.integ_q += err_q * self.ctrl.ki_q * dt;
        self.ctrl.i_q_ref = (err_q * self.ctrl.kp_q + self.ctrl.integ_q).clamp(-500.0, 500.0);

        // DC voltage regulation loop
        let err_v = self.ctrl.v_dc_ref - self.ctrl.v_dc_meas;
        self.ctrl.integ_v += err_v * self.ctrl.ki_v * dt;
        self.ctrl.i_d_ref = (err_v * self.ctrl.kp_v + self.ctrl.integ_v).clamp(-200.0, 200.0);

        // Inverse Park Transform to generate phase current injections
        let cos_th = theta.cos();
        let sin_th = theta.sin();

        let id = self.ctrl.i_d_ref;
        let iq = self.ctrl.i_q_ref;

        let ia = id * cos_th - iq * sin_th;
        let ib = id * (theta - 2.0 * std::f64::consts::PI / 3.0).cos() - iq * (theta - 2.0 * std::f64::consts::PI / 3.0).sin();
        let ic = -(ia + ib);

        self.i_inj_phase = [ia, ib, ic];
    }
}
