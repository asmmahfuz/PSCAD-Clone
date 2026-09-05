use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Rational pole/residue pair: f(s) = c / (s - a)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RationalPole {
    pub pole: f64,    // Real part of stable LHP pole (a < 0)
    pub residue: f64, // Real residue c
}

/// Frequency-Dependent Phase Domain Line (FD-Phase) Model
/// Models skin effect and ground return frequency dependence via recursive convolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FdPhaseLine {
    pub id: String,
    pub node_k: NodeId,
    pub node_m: NodeId,
    pub yc_poles: Vec<RationalPole>, // Characteristic admittance Y_c(s) poles/residues
    pub yc_d: f64,                   // High-frequency asymptotic conductance
    pub prop_delay: f64,             // Minimum propagation delay tau (s)
    pub delay_steps: usize,
    pub g_eq: f64,                   // Norton equivalent conductance
    pub yc_states_k: Vec<f64>,       // Recursive convolution state variables at sending end
    pub yc_states_m: Vec<f64>,       // Recursive convolution state variables at receiving end
    pub wave_buffer_k: Vec<f64>,     // Propagation wave buffer
    pub wave_buffer_m: Vec<f64>,
    pub ring_idx: usize,
    pub i_inj_k: f64,
    pub i_inj_m: f64,
}

impl FdPhaseLine {
    pub fn new(
        id: &str,
        node_k: NodeId,
        node_m: NodeId,
        yc_d: f64,
        poles: Vec<RationalPole>,
        prop_delay: f64,
        dt: f64,
    ) -> Self {
        let delay_steps = ((prop_delay / dt).round() as usize).max(1);
        let num_poles = poles.len();

        // Calculate Norton equivalent conductance G_eq = Y_c(∞) + sum(c_m * dt / 2)
        let mut g_eq = yc_d;
        for p in &poles {
            // Trapezoidal integration contribution of each pole
            let exp_term = (p.pole * dt).exp();
            let alpha = if p.pole.abs() > 1e-12 {
                (p.residue / p.pole) * (exp_term - 1.0)
            } else {
                p.residue * dt
            };
            g_eq += alpha / 2.0;
        }

        Self {
            id: id.to_string(),
            node_k,
            node_m,
            yc_poles: poles,
            yc_d,
            prop_delay,
            delay_steps,
            g_eq,
            yc_states_k: vec![0.0; num_poles],
            yc_states_m: vec![0.0; num_poles],
            wave_buffer_k: vec![0.0; delay_steps + 1],
            wave_buffer_m: vec![0.0; delay_steps + 1],
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

    /// Recursive convolution step update:
    /// x(t) = exp(a * dt) * x(t - dt) + b * v(t - dt)
    pub fn update_step(&mut self, v_k: f64, v_m: f64, dt: f64) {
        let delayed_idx = (self.ring_idx + 1) % (self.delay_steps + 1);

        // Convolution history current
        let mut conv_k = 0.0;
        let mut conv_m = 0.0;

        for (i, p) in self.yc_poles.iter().enumerate() {
            let exp_term = (p.pole * dt).exp();
            self.yc_states_k[i] = exp_term * self.yc_states_k[i] + p.residue * dt * v_k;
            self.yc_states_m[i] = exp_term * self.yc_states_m[i] + p.residue * dt * v_m;

            conv_k += self.yc_states_k[i];
            conv_m += self.yc_states_m[i];
        }

        let fwd_wave_from_m = self.wave_buffer_m[delayed_idx];
        let fwd_wave_from_k = self.wave_buffer_k[delayed_idx];

        self.i_inj_k = -conv_k - fwd_wave_from_m;
        self.i_inj_m = -conv_m - fwd_wave_from_k;

        // Store new waves
        self.wave_buffer_k[self.ring_idx] = 2.0 * self.yc_d * v_k - self.i_inj_k;
        self.wave_buffer_m[self.ring_idx] = 2.0 * self.yc_d * v_m - self.i_inj_m;

        self.ring_idx = (self.ring_idx + 1) % (self.delay_steps + 1);
    }
}
