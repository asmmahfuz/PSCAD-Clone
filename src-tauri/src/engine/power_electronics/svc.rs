use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Static Var Compensator (SVC) with coordinated TCR and TSC banks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvcModel {
    pub id: String,
    pub ac_nodes: [NodeId; 3],
    pub l_tcr: f64,              // TCR inductor (H)
    pub c_tsc: f64,              // TSC capacitor per bank (F)
    pub num_tsc_banks: usize,    // Number of switchable TSC banks
    pub active_tsc_banks: usize, // Currently connected TSC banks
    pub alpha_tcr_deg: f64,      // TCR firing angle [90°, 180°]
    pub b_tcr: f64,              // Equivalent variable fundamental susceptance
    pub b_tsc: f64,              // Total active capacitive susceptance
    pub omega: f64,              // Nominal system frequency 2*pi*f
}

impl SvcModel {
    pub fn new(
        id: &str,
        ac_nodes: [NodeId; 3],
        l_tcr: f64,
        c_tsc: f64,
        num_tsc_banks: usize,
        freq_hz: f64,
    ) -> Self {
        let omega = 2.0 * std::f64::consts::PI * freq_hz;
        let mut svc = Self {
            id: id.to_string(),
            ac_nodes,
            l_tcr: if l_tcr < 1e-6 { 1e-6 } else { l_tcr },
            c_tsc,
            num_tsc_banks,
            active_tsc_banks: 0,
            alpha_tcr_deg: 90.0,
            b_tcr: 0.0,
            b_tsc: 0.0,
            omega,
        };
        svc.recompute_susceptances();
        svc
    }

    /// Recomputes fundamental susceptance of TCR:
    /// B_TCR(α) = (2*(π - α) + sin(2α)) / (π * ω * L_TCR)
    pub fn recompute_susceptances(&mut self) {
        let alpha_rad = (self.alpha_tcr_deg.clamp(90.0, 180.0)) * std::f64::consts::PI / 180.0;
        let pi = std::f64::consts::PI;

        let b_tcr_max = 1.0 / (self.omega * self.l_tcr);
        let factor = (2.0 * (pi - alpha_rad) + (2.0 * alpha_rad).sin()) / pi;
        self.b_tcr = b_tcr_max * factor;

        // TSC susceptance: B_TSC = N_active * (ω * C_TSC)
        self.b_tsc = (self.active_tsc_banks as f64) * (self.omega * self.c_tsc);
    }

    pub fn set_tcr_alpha(&mut self, alpha_deg: f64) {
        self.alpha_tcr_deg = alpha_deg;
        self.recompute_susceptances();
    }

    pub fn set_tsc_banks(&mut self, banks: usize) {
        self.active_tsc_banks = banks.min(self.num_tsc_banks);
        self.recompute_susceptances();
    }

    /// Net SVC admittance: Y_svc = j * (B_TSC - B_TCR)
    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        // High frequency conductance / damping representation
        let g_damp = 1e-4;
        for &node in &self.ac_nodes {
            if node > 0 {
                g_matrix.add(node, node, g_damp);
            }
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector, v_phases: &[f64; 3]) {
        let b_net = self.b_tsc - self.b_tcr;
        for (i, &node) in self.ac_nodes.iter().enumerate() {
            if node > 0 {
                // Reactive injection: I_inj = -B_net * V_phase
                let i_inj = b_net * v_phases[i];
                rhs.add(node, i_inj);
            }
        }
    }
}
