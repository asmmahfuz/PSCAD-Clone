use super::diode::SwitchState;
use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thyristor {
    pub id: String,
    pub anode: NodeId,
    pub cathode: NodeId,
    pub v_fwd: f64,
    pub r_on: f64,
    pub r_off: f64,
    pub i_holding: f64,    // Holding current (e.g. 50 mA)
    pub t_q: f64,          // Turn-off recovery time (e.g. 30 µs)
    pub state: SwitchState,
    pub gate_signal: bool,
    pub i_thy: f64,
    pub v_thy: f64,
    pub off_timer: f64,
}

impl Thyristor {
    pub fn new(
        id: &str,
        anode: NodeId,
        cathode: NodeId,
        v_fwd: f64,
        r_on: f64,
        r_off: f64,
        i_holding: f64,
        t_q: f64,
    ) -> Self {
        Self {
            id: id.to_string(),
            anode,
            cathode,
            v_fwd,
            r_on: if r_on < 1e-6 { 1e-6 } else { r_on },
            r_off: if r_off < 100.0 { 1e6 } else { r_off },
            i_holding,
            t_q,
            state: SwitchState::Open,
            gate_signal: false,
            i_thy: 0.0,
            v_thy: 0.0,
            off_timer: 0.0,
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
            let i_inj = self.v_fwd / self.r_on;
            rhs.stamp_current_source(self.anode, self.cathode, i_inj);
        }
    }

    pub fn set_gate(&mut self, gate: bool) {
        self.gate_signal = gate;
    }

    pub fn update_state(&mut self, v_anode: f64, v_cathode: f64, dt: f64) -> bool {
        self.v_thy = v_anode - v_cathode;
        let g = self.conductance();
        self.i_thy = g * (self.v_thy - if self.state == SwitchState::Closed { self.v_fwd } else { 0.0 });

        let prev_state = self.state;

        match self.state {
            SwitchState::Open => {
                if self.gate_signal && self.v_thy > self.v_fwd && self.off_timer <= 0.0 {
                    self.state = SwitchState::Closed;
                }
                if self.off_timer > 0.0 {
                    self.off_timer -= dt;
                }
            }
            SwitchState::Closed => {
                if self.i_thy < self.i_holding {
                    self.state = SwitchState::Open;
                    self.off_timer = self.t_q;
                }
            }
        }

        prev_state != self.state
    }
}
