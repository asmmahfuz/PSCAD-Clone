use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubStepInterpolator {
    pub enabled: bool,
    pub max_sub_iterations: usize,
    pub tolerance: f64,
}

impl Default for SubStepInterpolator {
    fn default() -> Self {
        Self {
            enabled: true,
            max_sub_iterations: 8,
            tolerance: 1e-6,
        }
    }
}

impl SubStepInterpolator {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            max_sub_iterations: 8,
            tolerance: 1e-6,
        }
    }

    /// Calculate linear interpolation factor alpha in [0, 1] for zero-crossing
    /// alpha = (0 - v_prev) / (v_curr - v_prev)
    #[inline(always)]
    pub fn find_zero_crossing_factor(&self, val_prev: f64, val_curr: f64) -> Option<f64> {
        if (val_prev > 0.0 && val_curr <= 0.0) || (val_prev < 0.0 && val_curr >= 0.0) {
            let delta = val_curr - val_prev;
            if delta.abs() > self.tolerance {
                let alpha = (-val_prev) / delta;
                return Some(alpha.clamp(0.0, 1.0));
            }
        }
        None
    }

    /// Interpolate state variable at sub-step instant t = t_prev + alpha * dt
    #[inline(always)]
    pub fn interpolate_value(&self, prev: f64, curr: f64, alpha: f64) -> f64 {
        prev + alpha * (curr - prev)
    }
}
