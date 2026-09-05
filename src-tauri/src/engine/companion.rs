use super::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

/// Companion model state for a two-terminal linear passive component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanionBranch {
    pub id: String,
    pub node_k: NodeId,
    pub node_m: NodeId,
    pub g_eq: f64,
    pub i_hist: f64,
    pub v_prev: f64,
    pub i_prev: f64,
    pub param_val: f64,
    pub branch_type: CompanionType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompanionType {
    Resistor,
    Inductor,
    Capacitor,
    VoltageSource,
    CurrentSource,
}

impl CompanionBranch {
    /// Resistor: G = 1/R, I_hist = 0
    pub fn new_resistor(id: &str, node_k: NodeId, node_m: NodeId, resistance: f64) -> Self {
        let r_safe = if resistance.abs() < 1e-6 { 1e-6 } else { resistance };
        Self {
            id: id.to_string(),
            node_k,
            node_m,
            g_eq: 1.0 / r_safe,
            i_hist: 0.0,
            v_prev: 0.0,
            i_prev: 0.0,
            param_val: r_safe,
            branch_type: CompanionType::Resistor,
        }
    }

    /// Inductor (Trapezoidal): G_eq = dt / (2*L), I_hist(t) = i_L(t-dt) + G_eq * v_L(t-dt)
    pub fn new_inductor(id: &str, node_k: NodeId, node_m: NodeId, inductance: f64, dt: f64) -> Self {
        let l_safe = if inductance.abs() < 1e-9 { 1e-9 } else { inductance };
        let g_eq = dt / (2.0 * l_safe);
        Self {
            id: id.to_string(),
            node_k,
            node_m,
            g_eq,
            i_hist: 0.0,
            v_prev: 0.0,
            i_prev: 0.0,
            param_val: l_safe,
            branch_type: CompanionType::Inductor,
        }
    }

    /// Capacitor (Trapezoidal): G_eq = 2*C / dt, I_hist(t) = -i_C(t-dt) - G_eq * v_C(t-dt)
    pub fn new_capacitor(id: &str, node_k: NodeId, node_m: NodeId, capacitance: f64, dt: f64) -> Self {
        let c_safe = if capacitance.abs() < 1e-12 { 1e-12 } else { capacitance };
        let g_eq = (2.0 * c_safe) / dt;
        Self {
            id: id.to_string(),
            node_k,
            node_m,
            g_eq,
            i_hist: 0.0,
            v_prev: 0.0,
            i_prev: 0.0,
            param_val: c_safe,
            branch_type: CompanionType::Capacitor,
        }
    }

    /// Stamping into conductance matrix [G]
    #[inline(always)]
    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        g_matrix.stamp_branch(self.node_k, self.node_m, self.g_eq);
    }

    /// Stamping history current injection into RHS vector [I]
    #[inline(always)]
    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        if self.i_hist.abs() > 1e-15 {
            // History current flows from node_k to node_m
            rhs.stamp_current_source(self.node_k, self.node_m, self.i_hist);
        }
    }

    /// Update companion history current after solving node voltages at time t
    pub fn update_history(&mut self, v_k: f64, v_m: f64) {
        let v_branch = v_k - v_m;
        match self.branch_type {
            CompanionType::Resistor => {
                self.v_prev = v_branch;
                self.i_prev = v_branch * self.g_eq;
                self.i_hist = 0.0;
            }
            CompanionType::Inductor => {
                // i_L(t) = G_eq * v_L(t) + I_hist(t-dt)
                let i_curr = self.g_eq * v_branch + self.i_hist;
                self.i_hist = i_curr + self.g_eq * v_branch; // next step history
                self.v_prev = v_branch;
                self.i_prev = i_curr;
            }
            CompanionType::Capacitor => {
                // i_C(t) = G_eq * v_C(t) + I_hist(t-dt)
                let i_curr = self.g_eq * v_branch + self.i_hist;
                self.i_hist = -i_curr - self.g_eq * v_branch; // next step history: -2*G_eq*v_C - I_hist
                self.v_prev = v_branch;
                self.i_prev = i_curr;
            }
            CompanionType::VoltageSource | CompanionType::CurrentSource => {
                self.v_prev = v_branch;
            }
        }
    }
}

/// Dynamic AC/DC Voltage Source Companion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DynamicVoltageSource {
    pub id: String,
    pub node_pos: NodeId,
    pub node_neg: NodeId,
    pub r_internal: f64,
    pub g_eq: f64,
    pub amplitude: f64,
    pub frequency: f64,
    pub phase_deg: f64,
    pub dc_offset: f64,
}

impl DynamicVoltageSource {
    pub fn new(
        id: &str,
        node_pos: NodeId,
        node_neg: NodeId,
        amplitude: f64,
        frequency: f64,
        phase_deg: f64,
        dc_offset: f64,
        r_internal: f64,
    ) -> Self {
        let r = if r_internal.abs() < 1e-4 { 1e-4 } else { r_internal };
        Self {
            id: id.to_string(),
            node_pos,
            node_neg,
            r_internal: r,
            g_eq: 1.0 / r,
            amplitude,
            frequency,
            phase_deg,
            dc_offset,
        }
    }

    #[inline(always)]
    pub fn get_voltage(&self, t: f64) -> f64 {
        if self.frequency.abs() < 1e-6 {
            self.amplitude + self.dc_offset
        } else {
            let phase_rad = self.phase_deg * std::f64::consts::PI / 180.0;
            self.amplitude * (2.0 * std::f64::consts::PI * self.frequency * t + phase_rad).sin()
                + self.dc_offset
        }
    }

    #[inline(always)]
    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        g_matrix.stamp_branch(self.node_pos, self.node_neg, self.g_eq);
    }

    #[inline(always)]
    pub fn stamp_current(&self, t: f64, rhs: &mut RhsVector) {
        let v_t = self.get_voltage(t);
        let i_norton = v_t * self.g_eq;
        rhs.stamp_current_source(self.node_pos, self.node_neg, i_norton);
    }
}
