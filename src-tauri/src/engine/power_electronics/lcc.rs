use super::thyristor::Thyristor;
use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// 6-Pulse Graetz Bridge Converter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lcc6PulseBridge {
    pub id: String,
    pub ac_nodes: [NodeId; 3], // [A, B, C]
    pub dc_pos: NodeId,
    pub dc_neg: NodeId,
    pub thyristors: Vec<Thyristor>, // T1..T6
    pub firing_alpha_deg: f64,
    pub pll_phase: f64,
}

impl Lcc6PulseBridge {
    pub fn new(
        id: &str,
        ac_nodes: [NodeId; 3],
        dc_pos: NodeId,
        dc_neg: NodeId,
        v_fwd: f64,
        r_on: f64,
        r_off: f64,
    ) -> Self {
        // T1: A -> DC+, T3: B -> DC+, T5: C -> DC+
        // T4: DC- -> A, T6: DC- -> B, T2: DC- -> C
        let mut thyristors = Vec::with_capacity(6);

        // Positive group (Cathode is DC+)
        thyristors.push(Thyristor::new(&format!("{}_T1", id), ac_nodes[0], dc_pos, v_fwd, r_on, r_off, 0.05, 3e-5));
        thyristors.push(Thyristor::new(&format!("{}_T3", id), ac_nodes[1], dc_pos, v_fwd, r_on, r_off, 0.05, 3e-5));
        thyristors.push(Thyristor::new(&format!("{}_T5", id), ac_nodes[2], dc_pos, v_fwd, r_on, r_off, 0.05, 3e-5));

        // Negative group (Anode is DC-)
        thyristors.push(Thyristor::new(&format!("{}_T4", id), dc_neg, ac_nodes[0], v_fwd, r_on, r_off, 0.05, 3e-5));
        thyristors.push(Thyristor::new(&format!("{}_T6", id), dc_neg, ac_nodes[1], v_fwd, r_on, r_off, 0.05, 3e-5));
        thyristors.push(Thyristor::new(&format!("{}_T2", id), dc_neg, ac_nodes[2], v_fwd, r_on, r_off, 0.05, 3e-5));

        Self {
            id: id.to_string(),
            ac_nodes,
            dc_pos,
            dc_neg,
            thyristors,
            firing_alpha_deg: 15.0,
            pll_phase: 0.0,
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        for thy in &self.thyristors {
            thy.stamp_conductance(g_matrix);
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        for thy in &self.thyristors {
            thy.stamp_current(rhs);
        }
    }

    pub fn update_firing(&mut self, theta: f64) {
        self.pll_phase = theta;
        let alpha_rad = self.firing_alpha_deg * std::f64::consts::PI / 180.0;
        let pi = std::f64::consts::PI;

        // Firing sequence spaced by 60 degrees (pi/3)
        // T1: 0° + α, T2: 60° + α, T3: 120° + α, T4: 180° + α, T5: 240° + α, T6: 300° + α
        let angles = [
            alpha_rad,
            alpha_rad + 2.0 * pi / 3.0,
            alpha_rad + 4.0 * pi / 3.0,
            alpha_rad + pi,
            alpha_rad + 5.0 * pi / 3.0,
            alpha_rad + pi / 3.0,
        ];

        let pulse_width = pi / 3.0; // 60-degree conduction window
        for (i, &ang) in angles.iter().enumerate() {
            let mut diff = (theta - ang) % (2.0 * pi);
            if diff < 0.0 {
                diff += 2.0 * pi;
            }
            self.thyristors[i].set_gate(diff <= pulse_width);
        }
    }
}
