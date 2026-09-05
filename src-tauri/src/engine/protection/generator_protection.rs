//! ANSI 81O/81U, 81R (ROCOF), ANSI 40 (Loss of Field), & ANSI 78 (Out-of-Step) Protection

use super::distance::Complex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrequencyStage {
    pub enabled: bool,
    pub frequency_hz: f64,
    pub time_delay_sec: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratorProtectionSettings {
    pub under_freq_stages: Vec<FrequencyStage>,
    pub over_freq_stages: Vec<FrequencyStage>,
    pub enable_rocof: bool,
    pub rocof_threshold: f64,
    pub rocof_delay: f64,
    pub enable_loe: bool,
    pub xd: f64,
    pub xd_prime: f64,
    pub loe_c1_delay: f64,
    pub loe_c2_delay: f64,
    pub enable_power_swing: bool,
    pub outer_blinder_r: f64,
    pub inner_blinder_r: f64,
    pub swing_time_thresh: f64,
}

impl Default for GeneratorProtectionSettings {
    fn default() -> Self {
        Self {
            under_freq_stages: vec![
                FrequencyStage { enabled: true, frequency_hz: 59.3, time_delay_sec: 0.5 },
                FrequencyStage { enabled: true, frequency_hz: 58.5, time_delay_sec: 0.2 },
            ],
            over_freq_stages: vec![
                FrequencyStage { enabled: true, frequency_hz: 60.5, time_delay_sec: 2.0 },
            ],
            enable_rocof: true,
            rocof_threshold: 1.2,
            rocof_delay: 0.05,
            enable_loe: true,
            xd: 1.8,
            xd_prime: 0.3,
            loe_c1_delay: 0.1,
            loe_c2_delay: 0.75,
            enable_power_swing: true,
            outer_blinder_r: 12.0,
            inner_blinder_r: 6.0,
            swing_time_thresh: 0.035,
        }
    }
}

pub struct GeneratorProtectionRelay {
    pub id: String,
    pub settings: GeneratorProtectionSettings,
    pub is_tripped: bool,
    pub trip_reasons: Vec<String>,
    pub prev_freq: f64,
    pub under_freq_timers: Vec<f64>,
    pub loe_c1_timer: f64,
    pub loe_c2_timer: f64,
    pub swing_timer: f64,
    pub power_swing_active: bool,
}

impl GeneratorProtectionRelay {
    pub fn new(id: &str, settings: GeneratorProtectionSettings) -> Self {
        let n_under = settings.under_freq_stages.len();
        Self {
            id: id.to_string(),
            settings,
            is_tripped: false,
            trip_reasons: Vec::new(),
            prev_freq: 60.0,
            under_freq_timers: vec![0.0; n_under],
            loe_c1_timer: 0.0,
            loe_c2_timer: 0.0,
            swing_timer: 0.0,
            power_swing_active: false,
        }
    }

    pub fn step(&mut self, freq: f64, z_gen: Complex, dt: f64) {
        let dfdt = if dt > 0.0 { (freq - self.prev_freq) / dt } else { 0.0 };
        self.prev_freq = freq;

        // Under-frequency
        for (i, stage) in self.settings.under_freq_stages.iter().enumerate() {
            if stage.enabled && freq <= stage.frequency_hz {
                self.under_freq_timers[i] += dt;
                if self.under_freq_timers[i] >= stage.time_delay_sec {
                    self.is_tripped = true;
                    self.trip_reasons.push(format!("ANSI_81U_STAGE_{}", i + 1));
                }
            } else {
                self.under_freq_timers[i] = 0.0;
            }
        }

        // ROCOF
        if self.settings.enable_rocof && dfdt.abs() >= self.settings.rocof_threshold {
            self.is_tripped = true;
            self.trip_reasons.push("ANSI_81R_ROCOF".to_string());
        }

        // ANSI 40 LOE
        if self.settings.enable_loe {
            let center1 = Complex::new(0.0, -(self.settings.xd_prime / 2.0 + 0.5));
            let center2 = Complex::new(0.0, -(self.settings.xd_prime / 2.0 + self.settings.xd / 2.0));

            let in_c1 = z_gen.sub(&center1).mag() <= 0.5;
            let in_c2 = z_gen.sub(&center2).mag() <= self.settings.xd / 2.0;

            if in_c1 {
                self.loe_c1_timer += dt;
                if self.loe_c1_timer >= self.settings.loe_c1_delay {
                    self.is_tripped = true;
                    self.trip_reasons.push("ANSI_40_LOE_C1".to_string());
                }
            } else {
                self.loe_c1_timer = 0.0;
            }

            if in_c2 {
                self.loe_c2_timer += dt;
                if self.loe_c2_timer >= self.settings.loe_c2_delay {
                    self.is_tripped = true;
                    self.trip_reasons.push("ANSI_40_LOE_C2".to_string());
                }
            } else {
                self.loe_c2_timer = 0.0;
            }
        }

        // ANSI 78 Power Swing
        if self.settings.enable_power_swing {
            let abs_r = z_gen.r.abs();
            let in_outer = abs_r <= self.settings.outer_blinder_r;
            let in_inner = abs_r <= self.settings.inner_blinder_r;

            if in_outer && !in_inner {
                self.swing_timer += dt;
            } else if in_inner {
                if self.swing_timer >= self.settings.swing_time_thresh {
                    self.power_swing_active = true;
                }
            } else {
                self.swing_timer = 0.0;
                self.power_swing_active = false;
            }
        }
    }
}
