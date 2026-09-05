use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransformerCoreType {
    ThreeLimb,
    FiveLimb,
    SinglePhaseBank,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WindingConnection {
    StarGrounded,
    StarUngrounded,
    Delta,
}

/// Unified Magnetic Equivalent Circuit (UMEC) Transformer Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UmecTransformer {
    pub id: String,
    pub primary_nodes: [NodeId; 3],   // [A, B, C]
    pub secondary_nodes: [NodeId; 3], // [a, b, c]
    pub core_type: TransformerCoreType,
    pub primary_conn: WindingConnection,
    pub secondary_conn: WindingConnection,

    // Ratings & parameters
    pub rated_mva: f64,
    pub v_pri_kv: f64,
    pub v_sec_kv: f64,
    pub r_pri_pu: f64,
    pub r_sec_pu: f64,
    pub x_leakage_pu: f64,

    // Non-linear core magnetic parameters
    pub knee_flux_pu: f64,    // Knee point of saturation curve (e.g. 1.15 pu)
    pub sat_slope_pu: f64,    // Saturated incremental air-core slope (e.g. 0.15)
    pub limb_flux_pu: [f64; 3], // Flux linkages in limb A, B, C
    pub limb_reluctance: [f64; 3], // Dynamic magnetic reluctance of limbs
    pub g_eq_pri: f64,        // Primary Norton conductance
    pub g_eq_sec: f64,        // Secondary Norton conductance
    pub i_inj_pri: [f64; 3],  // Current injection vectors
    pub i_inj_sec: [f64; 3],
}

impl UmecTransformer {
    pub fn new(
        id: &str,
        primary_nodes: [NodeId; 3],
        secondary_nodes: [NodeId; 3],
        core_type: TransformerCoreType,
        primary_conn: WindingConnection,
        secondary_conn: WindingConnection,
        rated_mva: f64,
        v_pri_kv: f64,
        v_sec_kv: f64,
        x_leakage_pu: f64,
        dt: f64,
    ) -> Self {
        let z_base_pri = (v_pri_kv * v_pri_kv) / rated_mva;
        let z_base_sec = (v_sec_kv * v_sec_kv) / rated_mva;

        let l_leak_pri = (0.5 * x_leakage_pu * z_base_pri) / (2.0 * std::f64::consts::PI * 60.0);
        let l_leak_sec = (0.5 * x_leakage_pu * z_base_sec) / (2.0 * std::f64::consts::PI * 60.0);

        let g_eq_pri = dt / (2.0 * l_leak_pri);
        let g_eq_sec = dt / (2.0 * l_leak_sec);

        Self {
            id: id.to_string(),
            primary_nodes,
            secondary_nodes,
            core_type,
            primary_conn,
            secondary_conn,
            rated_mva,
            v_pri_kv,
            v_sec_kv,
            r_pri_pu: 0.002,
            r_sec_pu: 0.002,
            x_leakage_pu,
            knee_flux_pu: 1.15,
            sat_slope_pu: 0.15,
            limb_flux_pu: [0.0; 3],
            limb_reluctance: [1.0; 3],
            g_eq_pri,
            g_eq_sec,
            i_inj_pri: [0.0; 3],
            i_inj_sec: [0.0; 3],
        }
    }

    /// Evaluates non-linear magnetic saturation on each transformer limb
    pub fn update_saturation(&mut self, v_pri_phase: &[f64; 3], dt: f64) {
        let omega = 2.0 * std::f64::consts::PI * 60.0;
        let v_base_pri = self.v_pri_kv * 1e3 * (2.0f64 / 3.0).sqrt();

        for i in 0..3 {
            // Integrate limb flux: lambda_i(t) = lambda_i(t-dt) + v_pri_i * dt
            let d_flux = (v_pri_phase[i] / (v_base_pri * omega)) * omega * dt;
            self.limb_flux_pu[i] += d_flux;

            let abs_flux = self.limb_flux_pu[i].abs();
            if abs_flux > self.knee_flux_pu {
                // Saturated region: reluctance increases dramatically
                let delta = abs_flux - self.knee_flux_pu;
                self.limb_reluctance[i] = 1.0 + delta / self.sat_slope_pu;
            } else {
                self.limb_reluctance[i] = 1.0; // Linear unsaturated region
            }

            // Inrush magnetizing current injection
            let i_mag_pu = self.limb_flux_pu[i] * self.limb_reluctance[i];
            let i_base_pri = (self.rated_mva * 1e6) / (3.0f64.sqrt() * self.v_pri_kv * 1e3);
            let i_mag_amps = i_mag_pu * i_base_pri * 0.01;

            self.i_inj_pri[i] = -i_mag_amps;
            self.i_inj_sec[i] = i_mag_amps * (self.v_pri_kv / self.v_sec_kv);
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        for &node in &self.primary_nodes {
            if node > 0 {
                g_matrix.add(node, node, self.g_eq_pri);
            }
        }
        for &node in &self.secondary_nodes {
            if node > 0 {
                g_matrix.add(node, node, self.g_eq_sec);
            }
        }
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        for (i, &node) in self.primary_nodes.iter().enumerate() {
            if node > 0 {
                rhs.add(node, self.i_inj_pri[i]);
            }
        }
        for (i, &node) in self.secondary_nodes.iter().enumerate() {
            if node > 0 {
                rhs.add(node, self.i_inj_sec[i]);
            }
        }
    }
}
