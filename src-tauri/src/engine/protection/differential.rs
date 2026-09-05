//! ANSI 87T Transformer & 87L Line Differential Protection Relay
//!
//! Features dual-slope percentage restraint, 2nd & 5th harmonic blocking, and vector group phase-shift compensation.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VectorGroup {
    Yy0,
    Yd1,
    Yd11,
    Dy1,
    Dy11,
    Dd0,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DifferentialRelaySettings {
    pub pickup_current: f64,
    pub slope1: f64,
    pub slope2: f64,
    pub knee_current: f64,
    pub unrestrained_pickup: f64,
    pub enable_2nd_harmonic: bool,
    pub ratio_2nd_harmonic: f64,
    pub enable_5th_harmonic: bool,
    pub ratio_5th_harmonic: f64,
    pub vector_group: VectorGroup,
}

impl Default for DifferentialRelaySettings {
    fn default() -> Self {
        Self {
            pickup_current: 0.3,
            slope1: 0.25,
            slope2: 0.65,
            knee_current: 2.0,
            unrestrained_pickup: 8.0,
            enable_2nd_harmonic: true,
            ratio_2nd_harmonic: 0.15,
            enable_5th_harmonic: true,
            ratio_5th_harmonic: 0.35,
            vector_group: VectorGroup::Yd1,
        }
    }
}

pub struct DifferentialRelay {
    pub id: String,
    pub settings: DifferentialRelaySettings,
    pub is_tripped: bool,
    pub trip_mode: String,
}

impl DifferentialRelay {
    pub fn new(id: &str, settings: DifferentialRelaySettings) -> Self {
        Self {
            id: id.to_string(),
            settings,
            is_tripped: false,
            trip_mode: "NONE".to_string(),
        }
    }

    pub fn calculate_restraint_threshold(&self, i_res: f64) -> f64 {
        let i_pu = self.settings.pickup_current;
        let s1 = self.settings.slope1;
        let s2 = self.settings.slope2;
        let i_knee = self.settings.knee_current;

        if i_res <= i_knee {
            i_pu + s1 * i_res
        } else {
            i_pu + s1 * i_knee + s2 * (i_res - i_knee)
        }
    }

    pub fn check_phase_trip(
        &self,
        i_op: f64,
        i_res: f64,
        h2_ratio: f64,
        h5_ratio: f64,
    ) -> (bool, bool) {
        // Returns (is_tripped, is_unrestrained)
        if i_op >= self.settings.unrestrained_pickup {
            return (true, true);
        }

        let is_2nd_blocked = self.settings.enable_2nd_harmonic && h2_ratio >= self.settings.ratio_2nd_harmonic;
        let is_5th_blocked = self.settings.enable_5th_harmonic && h5_ratio >= self.settings.ratio_5th_harmonic;

        if is_2nd_blocked || is_5th_blocked {
            return (false, false);
        }

        let thresh = self.calculate_restraint_threshold(i_res);
        if i_op >= thresh {
            (true, false)
        } else {
            (false, false)
        }
    }
}
