use super::diode::SwitchState;
use crate::engine::netlist::{ConductanceMatrix, NodeId, RhsVector};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgbtSwitch {
    pub id: String,
    pub collector: NodeId,
    pub emitter: NodeId,
    pub r_on: f64,
    pub r_off: f64,
    pub v_fwd_igbt: f64,
    pub v_fwd_fwd: f64,
    pub state: SwitchState,
    pub gate_signal: bool,
    pub i_device: f64,
    pub v_device: f64,
}

impl IgbtSwitch {
    pub fn new(
        id: &str,
        collector: NodeId,
        emitter: NodeId,
        r_on: f64,
        r_off: f64,
        v_fwd_igbt: f64,
        v_fwd_fwd: f64,
    ) -> Self {
        Self {
            id: id.to_string(),
            collector,
            emitter,
            r_on: if r_on < 1e-6 { 1e-6 } else { r_on },
            r_off: if r_off < 100.0 { 1e6 } else { r_off },
            v_fwd_igbt,
            v_fwd_fwd,
            state: SwitchState::Open,
            gate_signal: false,
            i_device: 0.0,
            v_device: 0.0,
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
        g_matrix.stamp_branch(self.collector, self.emitter, self.conductance());
    }

    pub fn stamp_current(&self, rhs: &mut RhsVector) {
        if self.state == SwitchState::Closed {
            // Check if conducting in IGBT forward direction (C -> E) or FWD anti-parallel (E -> C)
            if self.v_device >= 0.0 {
                let i_inj = self.v_fwd_igbt / self.r_on;
                rhs.stamp_current_source(self.collector, self.emitter, i_inj);
            } else {
                let i_inj = self.v_fwd_fwd / self.r_on;
                rhs.stamp_current_source(self.emitter, self.collector, i_inj);
            }
        }
    }

    pub fn set_gate(&mut self, gate: bool) {
        self.gate_signal = gate;
    }

    pub fn update_state(&mut self, v_collector: f64, v_emitter: f64) -> bool {
        self.v_device = v_collector - v_emitter;
        let prev_state = self.state;

        // Conducting if gate is HIGH (forward IGBT) OR reverse diode is forward-biased (V_CE < -V_fwd_fwd)
        let is_on = self.gate_signal || (self.v_device < -self.v_fwd_fwd);

        self.state = if is_on { SwitchState::Closed } else { SwitchState::Open };
        let g = self.conductance();
        self.i_device = g * self.v_device;

        prev_state != self.state
    }
}
