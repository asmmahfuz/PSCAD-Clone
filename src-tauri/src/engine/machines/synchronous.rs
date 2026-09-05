use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// 6th-Order Park d-q-0 Synchronous Machine Model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SynchronousMachineDq {
    pub id: String,
    pub stator_nodes: [NodeId; 3], // [A, B, C]
    pub neutral_node: NodeId,

    // Machine ratings & base parameters
    pub s_base_mva: f64,
    pub v_base_kv: f64,
    pub freq_nom: f64,
    pub inertia_h: f64,       // Inertia constant H (s)
    pub damping_d: f64,       // Damping factor D (pu)

    // d-q reactances and time constants (pu)
    pub x_d: f64,
    pub x_d_prime: f64,
    pub x_d_pprime: f64,
    pub x_q: f64,
    pub x_q_prime: f64,
    pub x_q_pprime: f64,
    pub r_stator: f64,

    // Dynamic state variables
    pub rotor_angle_rad: f64, // Electrical rotor angle θ_r
    pub rotor_speed_pu: f64,  // Rotor speed ω_r (pu)
    pub psi_d: f64,           // Flux linkages
    pub psi_q: f64,
    pub psi_f: f64,           // Field flux linkage
    pub psi_1d: f64,          // d-axis damper
    pub psi_1q: f64,          // q-axis damper 1
    pub psi_2q: f64,          // q-axis damper 2

    // Interface
    pub v_fd_pu: f64,         // Field excitation voltage
    pub p_mech_pu: f64,       // Mechanical turbine power
    pub p_elec_pu: f64,       // Electrical air-gap power
    pub t_elec_pu: f64,       // Electrical torque
    pub g_stator_eq: f64,     // Norton subtransient conductance
    pub i_inj_phase: [f64; 3],
}

impl SynchronousMachineDq {
    pub fn new(
        id: &str,
        stator_nodes: [NodeId; 3],
        neutral_node: NodeId,
        s_base_mva: f64,
        v_base_kv: f64,
        freq_nom: f64,
        inertia_h: f64,
        dt: f64,
    ) -> Self {
        let x_d_pprime = 0.20;
        let r_stator = 0.003;
        let r_base = (v_base_kv * v_base_kv) / s_base_mva;
        let r_stator_ohm = r_stator * r_base;
        let l_pprime = (x_d_pprime * r_base) / (2.0 * std::f64::consts::PI * freq_nom);

        let r_eq = r_stator_ohm + (2.0 * l_pprime) / dt;
        let g_stator_eq = 1.0 / r_eq;

        Self {
            id: id.to_string(),
            stator_nodes,
            neutral_node,
            s_base_mva,
            v_base_kv,
            freq_nom,
            inertia_h: if inertia_h < 0.1 { 3.5 } else { inertia_h },
            damping_d: 1.0,
            x_d: 1.8,
            x_d_prime: 0.30,
            x_d_pprime,
            x_q: 1.7,
            x_q_prime: 0.55,
            x_q_pprime: 0.20,
            r_stator,
            rotor_angle_rad: 0.0,
            rotor_speed_pu: 1.0,
            psi_d: 0.0,
            psi_q: 0.0,
            psi_f: 1.0,
            psi_1d: 0.0,
            psi_1q: 0.0,
            psi_2q: 0.0,
            v_fd_pu: 1.0,
            p_mech_pu: 1.0,
            p_elec_pu: 1.0,
            t_elec_pu: 1.0,
            g_stator_eq,
            i_inj_phase: [0.0; 3],
        }
    }

    /// Park transformation: [u_d, u_q, u_0]^T = [P(θ)] * [u_a, u_b, u_c]^T
    #[inline(always)]
    pub fn park_transform(theta: f64, v_phase: &[f64; 3]) -> [f64; 3] {
        let two_thirds = 2.0 / 3.0;
        let cos_a = theta.cos();
        let sin_a = theta.sin();
        let theta_b = theta - 2.0 * std::f64::consts::PI / 3.0;
        let theta_c = theta + 2.0 * std::f64::consts::PI / 3.0;

        let ud = two_thirds * (v_phase[0] * cos_a + v_phase[1] * theta_b.cos() + v_phase[2] * theta_c.cos());
        let uq = -two_thirds * (v_phase[0] * sin_a + v_phase[1] * theta_b.sin() + v_phase[2] * theta_c.sin());
        let u0 = (1.0 / 3.0) * (v_phase[0] + v_phase[1] + v_phase[2]);

        [ud, uq, u0]
    }

    /// Inverse Park transformation: [u_a, u_b, u_c]^T = [P(θ)]^{-1} * [u_d, u_q, u_0]^T
    #[inline(always)]
    pub fn inverse_park_transform(theta: f64, u_dq0: &[f64; 3]) -> [f64; 3] {
        let ud = u_dq0[0];
        let uq = u_dq0[1];
        let u0 = u_dq0[2];

        let cos_a = theta.cos();
        let sin_a = theta.sin();
        let theta_b = theta - 2.0 * std::f64::consts::PI / 3.0;
        let theta_c = theta + 2.0 * std::f64::consts::PI / 3.0;

        let ua = ud * cos_a - uq * sin_a + u0;
        let ub = ud * theta_b.cos() - uq * theta_b.sin() + u0;
        let uc = ud * theta_c.cos() - uq * theta_c.sin() + u0;

        [ua, ub, uc]
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
                rhs.add(node, self.i_inj_phase[i]);
            }
        }
    }

    /// Advance machine dynamic state variables (swing equation & flux linkages)
    pub fn step_dynamics(&mut self, v_phase: &[f64; 3], dt: f64) {
        let omega_base = 2.0 * std::f64::consts::PI * self.freq_nom;
        let v_dq0 = Self::park_transform(self.rotor_angle_rad, v_phase);

        let v_d = v_dq0[0];
        let v_q = v_dq0[1];

        // Stator subtransient currents
        let i_d = (self.psi_d - self.psi_1d) / self.x_d_pprime;
        let i_q = (self.psi_q - self.psi_1q) / self.x_q_pprime;

        // Air-gap electrical torque: T_e = psi_d * i_q - psi_q * i_d
        self.t_elec_pu = self.psi_d * i_q - self.psi_q * i_d;
        self.p_elec_pu = self.t_elec_pu * self.rotor_speed_pu;

        // Swing Equation: 2*H * d(omega_r)/dt = P_m - P_e - D*(omega_r - 1)
        let d_omega = (self.p_mech_pu - self.p_elec_pu - self.damping_d * (self.rotor_speed_pu - 1.0))
            / (2.0 * self.inertia_h);
        self.rotor_speed_pu += d_omega * dt;

        // Rotor angle integration: d(theta_r)/dt = omega_r * omega_base
        self.rotor_angle_rad += self.rotor_speed_pu * omega_base * dt;
        self.rotor_angle_rad %= 2.0 * std::f64::consts::PI;

        // Simple flux decay integration
        let d_psi_d = omega_base * (v_d + self.rotor_speed_pu * self.psi_q - self.r_stator * i_d);
        let d_psi_q = omega_base * (v_q - self.rotor_speed_pu * self.psi_d - self.r_stator * i_q);
        let d_psi_f = (self.v_fd_pu - self.psi_f) / 4.0; // Field time constant ~4.0 s

        self.psi_d += d_psi_d * dt;
        self.psi_q += d_psi_q * dt;
        self.psi_f += d_psi_f * dt;

        // Convert Norton current injections back to phase domain
        let i_inj_dq0 = [-i_d, -i_q, 0.0];
        self.i_inj_phase = Self::inverse_park_transform(self.rotor_angle_rad, &i_inj_dq0);
    }
}
