//! Non-Linear Instrument Transformers (CT & VT/PT) with Core Saturation

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTransformerSettings {
    pub ratio_primary: f64,
    pub ratio_secondary: f64,
    pub secondary_resistance: f64,
    pub secondary_leakage_l: f64,
    pub burden_resistance: f64,
    pub burden_inductance: f64,
    pub knee_flux: f64,
    pub linear_lm: f64,
    pub sat_l: f64,
    pub sat_exp: i32,
    pub remanence_pu: f64,
}

impl Default for CurrentTransformerSettings {
    fn default() -> Self {
        Self {
            ratio_primary: 1200.0,
            ratio_secondary: 5.0,
            secondary_resistance: 0.45,
            secondary_leakage_l: 0.5e-3,
            burden_resistance: 1.5,
            burden_inductance: 0.8e-3,
            knee_flux: 1.8,
            linear_lm: 60.0,
            sat_l: 0.04,
            sat_exp: 5,
            remanence_pu: 0.0,
        }
    }
}

pub struct CurrentTransformer {
    pub id: String,
    pub settings: CurrentTransformerSettings,
    pub turns_ratio: f64,
    pub flux_linkage: f64,
    pub actual_secondary_i: f64,
    pub magnetizing_i: f64,
    pub is_saturated: bool,
    pub prev_is: f64,
}

impl CurrentTransformer {
    pub fn new(id: &str, settings: CurrentTransformerSettings) -> Self {
        let turns_ratio = settings.ratio_primary / settings.ratio_secondary;
        let flux0 = settings.knee_flux * settings.remanence_pu;
        Self {
            id: id.to_string(),
            settings,
            turns_ratio,
            flux_linkage: flux0,
            actual_secondary_i: 0.0,
            magnetizing_i: 0.0,
            is_saturated: false,
            prev_is: 0.0,
        }
    }

    pub fn evaluate_im(&self, psi: f64) -> f64 {
        let psi_knee = self.settings.knee_flux;
        let lm0 = self.settings.linear_lm;
        let lsat = self.settings.sat_l;
        let n = self.settings.sat_exp;

        let sign = psi.signum();
        let abs_psi = psi.abs();

        if abs_psi <= psi_knee {
            psi / lm0
        } else {
            let delta = abs_psi - psi_knee;
            let lin = psi_knee / lm0;
            let sat_lin = delta / lsat;
            let high_order = (delta / psi_knee).powi(n) * 10.0;
            sign * (lin + sat_lin + high_order)
        }
    }

    pub fn step(&mut self, ip: f64, dt: f64) -> f64 {
        let ideal_is = ip / self.turns_ratio;
        let r_total = self.settings.secondary_resistance + self.settings.burden_resistance;
        let l_total = self.settings.secondary_leakage_l + self.settings.burden_inductance;

        let prev_psi = self.flux_linkage;
        let im_est = self.evaluate_im(prev_psi);
        let is_est = ideal_is - im_est;

        let disdt = if dt > 0.0 { (is_est - self.prev_is) / dt } else { 0.0 };
        let em = r_total * is_est + l_total * disdt;

        let new_psi = prev_psi + em * dt;
        let actual_im = self.evaluate_im(new_psi);
        let actual_is = ideal_is - actual_im;

        self.prev_is = actual_is;
        self.flux_linkage = new_psi;
        self.magnetizing_i = actual_im;
        self.actual_secondary_i = actual_is;
        self.is_saturated = new_psi.abs() >= self.settings.knee_flux;

        actual_is
    }
}
