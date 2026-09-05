use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SwitchState {
    Open,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerDiode {
    pub id: String,
    pub anode: NodeId,
    pub cathode: NodeId,
    pub v_fwd: f64,        // Forward threshold voltage (e.g. 0.8 V)
    pub r_on: f64,         // On-state resistance (e.g. 1e-4 Ohms)
    pub r_off: f64,        // Off-state resistance (e.g. 1e6 Ohms)
    pub q_rr: f64,         // Reverse recovery charge (C)
    pub state: SwitchState,
    pub i_diode: f64,
    pub v_diode: f64,
    pub recovered_charge: f64,
    pub in_recovery: bool,
}

impl PowerDiode {
    pub fn new(id: &str, anode: NodeId, cathode: NodeId, v_fwd: f64, r_on: f64, r_off: f64, q_rr: f64) -> Self {
        Self {
            id: id.to_string(),
            anode,
            cathode,
            v_fwd,
            r_on: if r_on < 1e-6 { 1e-6 } else { r_on },
            r_off: if r_off < 100.0 { 1e6 } else { r_off },
            q_rr,
            state: SwitchState::Open,
            i_diode: 0.0,
            v_diode: 0.0,
            recovered_charge: 0.0,
            in_recovery: false,
        }
    }

    #[inline(always)]
    pub fn conductance(&self) -> f64 {
        match self.state {
            SwitchState::Closed => 1.0 / self.r_on,
            SwitchState::Open => 1.0 / self.r_off,
        }
    }

    pub fn stamp_conductance(&self, g_matrix: &mut ConductanceMatrix) {
        g_matrix.stamp_branch(self.anode, self.cathode, self.conductance());
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        if self.state == SwitchState::Closed {
            // Forward drop compensation: I_inj = V_fwd / R_on
            let i_inj = self.v_fwd / self.r_on;
            rhs.stamp_current_source(self.anode, self.cathode, i_inj);
        }
    }

    /// Evaluates switching transitions and reverse recovery
    /// Returns true if switch state changed (triggering CDA or LU re-solve)
    pub fn update_state(&mut self, v_anode: f64, v_cathode: f64, dt: f64) -> bool {
        self.v_diode = v_anode - v_cathode;
        let g = self.conductance();
        self.i_diode = g * (self.v_diode - if self.state == SwitchState::Closed { self.v_fwd } else { 0.0 });

        let prev_state = self.state;

        match self.state {
            SwitchState::Open => {
                if self.v_diode >= self.v_fwd {
                    self.state = SwitchState::Closed;
                    self.in_recovery = false;
                    self.recovered_charge = 0.0;
                }
            }
            SwitchState::Closed => {
                if self.i_diode < 0.0 {
                    // Current reversal: enter reverse recovery
                    if self.q_rr > 1e-12 {
                        self.in_recovery = true;
                        self.recovered_charge += (-self.i_diode) * dt;
                        if self.recovered_charge >= self.q_rr {
                            self.state = SwitchState::Open;
                            self.in_recovery = false;
                        }
                    } else {
                        self.state = SwitchState::Open;
                    }
                }
            }
        }

        prev_state != self.state
    }
}
