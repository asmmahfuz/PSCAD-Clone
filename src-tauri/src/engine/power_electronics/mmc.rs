use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SubmoduleState {
    Inserted,
    Bypassed,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submodule {
    pub id: usize,
    pub c_sm: f64,
    pub v_cap: f64,
    pub state: SubmoduleState,
    pub r_on: f64,
    pub r_off: f64,
}

/// Detailed Equivalent Model (DEM) for an MMC Arm
/// Replaces N discrete submodules with a single time-varying Thévenin / Norton equivalent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MmcArmDem {
    pub id: String,
    pub node_top: NodeId,
    pub node_bottom: NodeId,
    pub num_submodules: usize,
    pub submodules: Vec<Submodule>,
    pub l_arm: f64,          // Arm reactor inductance
    pub r_arm: f64,          // Arm reactor resistance
    pub r_eq: f64,           // Aggregated Thévenin resistance
    pub e_eq: f64,           // Aggregated Thévenin voltage
    pub g_eq: f64,           // Norton equivalent conductance
    pub i_arm: f64,          // Current through the arm (top -> bottom)
    pub v_arm: f64,          // Total voltage drop across arm
    pub i_hist_reactor: f64, // Reactor Trapezoidal history
}

impl MmcArmDem {
    pub fn new(
        id: &str,
        node_top: NodeId,
        node_bottom: NodeId,
        num_submodules: usize,
        c_sm: f64,
        v_dc_nom: f64,
        l_arm: f64,
        r_arm: f64,
        dt: f64,
    ) -> Self {
        let v_cap_init = v_dc_nom / (num_submodules as f64);
        let mut submodules = Vec::with_capacity(num_submodules);

        for i in 0..num_submodules {
            submodules.push(Submodule {
                id: i,
                c_sm,
                v_cap: v_cap_init,
                state: SubmoduleState::Bypassed,
                r_on: 1e-3,
                r_off: 1e6,
            });
        }

        let mut arm = Self {
            id: id.to_string(),
            node_top,
            node_bottom,
            num_submodules,
            submodules,
            l_arm: if l_arm < 1e-6 { 1e-6 } else { l_arm },
            r_arm: if r_arm < 1e-4 { 1e-4 } else { r_arm },
            r_eq: 0.0,
            e_eq: 0.0,
            g_eq: 0.0,
            i_arm: 0.0,
            v_arm: 0.0,
            i_hist_reactor: 0.0,
        };

        arm.recalculate_thevenin(dt);
        arm
    }

    /// Calculate equivalent Thévenin resistance and voltage across the N submodules + reactor
    pub fn recalculate_thevenin(&mut self, dt: f64) {
        let mut r_sm_sum = 0.0;
        let mut e_sm_sum = 0.0;

        for sm in &self.submodules {
            match sm.state {
                SubmoduleState::Inserted => {
                    // Trapezoidal companion for SM capacitor: R_c = dt / (2 * C)
                    let r_c = dt / (2.0 * sm.c_sm);
                    let r_sm = sm.r_on + r_c;
                    r_sm_sum += r_sm;
                    // E_sm = V_cap(t-dt)
                    e_sm_sum += sm.v_cap;
                }
                SubmoduleState::Bypassed => {
                    r_sm_sum += sm.r_on;
                }
                SubmoduleState::Blocked => {
                    r_sm_sum += sm.r_off;
                }
            }
        }

        // Arm reactor companion: R_L = 2*L / dt + R_arm
        let r_l = (2.0 * self.l_arm) / dt + self.r_arm;
        self.r_eq = r_sm_sum + r_l;
        self.e_eq = e_sm_sum;
        self.g_eq = 1.0 / self.r_eq;
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        g_matrix.stamp_branch(self.node_top, self.node_bottom, self.g_eq);
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        // Norton equivalent current injection: I_norton = (E_eq + E_reactor_hist) / R_eq
        let i_norton = (self.e_eq - self.i_hist_reactor * (2.0 * self.l_arm / 1.0)) * self.g_eq;
        rhs.stamp_current_source(self.node_top, self.node_bottom, i_norton);
    }

    /// Voltage Balancing Control: Fast sorting of submodule capacitor voltages
    pub fn apply_insertion_index(&mut self, n_inserted: usize, dt: f64) {
        let n_clamped = n_inserted.min(self.num_submodules);

        if self.i_arm >= 0.0 {
            // Charging arm: insert submodules with LOWEST capacitor voltages
            self.submodules.sort_by(|a, b| a.v_cap.partial_cmp(&b.v_cap).unwrap_or(std::cmp::Ordering::Equal));
        } else {
            // Discharging arm: insert submodules with HIGHEST capacitor voltages
            self.submodules.sort_by(|a, b| b.v_cap.partial_cmp(&a.v_cap).unwrap_or(std::cmp::Ordering::Equal));
        }

        for i in 0..self.num_submodules {
            if i < n_clamped {
                self.submodules[i].state = SubmoduleState::Inserted;
            } else {
                self.submodules[i].state = SubmoduleState::Bypassed;
            }
        }

        self.recalculate_thevenin(dt);
    }

    /// Update individual capacitor voltages and arm reactor history at step completion
    pub fn update_step(&mut self, v_top: f64, v_bottom: f64, dt: f64) {
        self.v_arm = v_top - v_bottom;
        self.i_arm = self.g_eq * (self.v_arm - self.e_eq);

        // Update each submodule capacitor voltage: dV_cap/dt = i_arm / C_sm
        for sm in &mut self.submodules {
            if sm.state == SubmoduleState::Inserted {
                sm.v_cap += (self.i_arm / sm.c_sm) * dt;
            }
        }

        // Update reactor history: i_hist_L = i_arm + (dt / (2*L)) * v_L
        let v_l = (2.0 * self.l_arm / dt) * self.i_arm;
        self.i_hist_reactor = self.i_arm + (dt / (2.0 * self.l_arm)) * v_l;
    }
}
