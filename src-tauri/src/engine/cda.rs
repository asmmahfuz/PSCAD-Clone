use super::companion::{CompanionBranch, CompanionType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CdaPhase {
    Inactive,
    HalfStep1,
    HalfStep2,
}

/// Critical Damping Adjustment (CDA) Manager
/// Handles switching chatter suppression via two half-steps of Backward Euler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdaManager {
    pub enabled: bool,
    pub current_phase: CdaPhase,
    pub switching_detected: bool,
}

impl Default for CdaManager {
    fn default() -> Self {
        Self {
            enabled: true,
            current_phase: CdaPhase::Inactive,
            switching_detected: false,
        }
    }
}

impl CdaManager {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            current_phase: CdaPhase::Inactive,
            switching_detected: false,
        }
    }

    /// Notify manager that a discrete switching event occurred at the current time step
    pub fn trigger_switching_event(&mut self) {
        if self.enabled && self.current_phase == CdaPhase::Inactive {
            self.switching_detected = true;
            self.current_phase = CdaPhase::HalfStep1;
        }
    }

    /// Advance CDA state machine
    pub fn advance_step(&mut self) {
        match self.current_phase {
            CdaPhase::HalfStep1 => {
                self.current_phase = CdaPhase::HalfStep2;
            }
            CdaPhase::HalfStep2 => {
                self.current_phase = CdaPhase::Inactive;
                self.switching_detected = false;
            }
            CdaPhase::Inactive => {}
        }
    }

    pub fn is_cda_active(&self) -> bool {
        self.current_phase != CdaPhase::Inactive
    }

    /// Get effective integration time-step delta for current sub-step
    pub fn get_effective_dt(&self, base_dt: f64) -> f64 {
        if self.is_cda_active() {
            base_dt / 2.0
        } else {
            base_dt
        }
    }

    /// Transform companion model parameters to Backward Euler during CDA half-steps
    pub fn adjust_companion_for_cda(&self, branch: &mut CompanionBranch, dt_half: f64) {
        if !self.is_cda_active() {
            return;
        }

        match branch.branch_type {
            CompanionType::Inductor => {
                // Backward Euler for Inductor: G_BE = dt_half / L
                branch.g_eq = dt_half / branch.param_val;
                // In Backward Euler, I_hist = i_L(t - dt_half)
                branch.i_hist = branch.i_prev;
            }
            CompanionType::Capacitor => {
                // Backward Euler for Capacitor: G_BE = C / dt_half
                branch.g_eq = branch.param_val / dt_half;
                // In Backward Euler, I_hist = -G_BE * v_C(t - dt_half)
                branch.i_hist = -branch.g_eq * branch.v_prev;
            }
            _ => {}
        }
    }

    /// Restore standard Trapezoidal companion model parameters
    pub fn restore_trapezoidal(&self, branch: &mut CompanionBranch, base_dt: f64) {
        match branch.branch_type {
            CompanionType::Inductor => {
                branch.g_eq = base_dt / (2.0 * branch.param_val);
            }
            CompanionType::Capacitor => {
                branch.g_eq = (2.0 * branch.param_val) / base_dt;
            }
            _ => {}
        }
    }
}
