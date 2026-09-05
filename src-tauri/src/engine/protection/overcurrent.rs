//! ANSI 50/51/67 Time-Overcurrent & Instantaneous Overcurrent Relay
//!
//! Complies with IEEE C37.112 and IEC 60255-151 standard curves.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CurveFamily {
    IecStandardInverse,
    IecVeryInverse,
    IecExtremelyInverse,
    IecLongTimeInverse,
    IeeeModeratelyInverse,
    IeeeVeryInverse,
    IeeeExtremelyInverse,
    IeeeShortTimeInverse,
    DefiniteTime,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CurveParameters {
    pub a: f64,
    pub p: f64,
    pub b: f64,
    pub tr: f64,
}

impl CurveFamily {
    pub fn get_parameters(&self) -> CurveParameters {
        match self {
            CurveFamily::IecStandardInverse => CurveParameters { a: 0.14, p: 0.02, b: 0.0, tr: 13.5 },
            CurveFamily::IecVeryInverse => CurveParameters { a: 13.5, p: 1.0, b: 0.0, tr: 47.3 },
            CurveFamily::IecExtremelyInverse => CurveParameters { a: 80.0, p: 2.0, b: 0.0, tr: 80.0 },
            CurveFamily::IecLongTimeInverse => CurveParameters { a: 120.0, p: 1.0, b: 0.0, tr: 120.0 },
            CurveFamily::IeeeModeratelyInverse => CurveParameters { a: 0.0515, p: 0.02, b: 0.114, tr: 4.85 },
            CurveFamily::IeeeVeryInverse => CurveParameters { a: 19.61, p: 2.0, b: 0.491, tr: 21.6 },
            CurveFamily::IeeeExtremelyInverse => CurveParameters { a: 28.2, p: 2.0, b: 0.1217, tr: 29.1 },
            CurveFamily::IeeeShortTimeInverse => CurveParameters { a: 0.00342, p: 0.02, b: 0.00262, tr: 0.097 },
            CurveFamily::DefiniteTime => CurveParameters { a: 0.0, p: 0.0, b: 1.0, tr: 0.1 },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OvercurrentRelaySettings {
    pub curve_type: CurveFamily,
    pub pickup_current: f64,
    pub time_dial: f64,
    pub definite_time_delay: f64,
    pub dropout_ratio: f64,
    pub enable_50: bool,
    pub instantaneous_pickup: f64,
    pub instantaneous_delay: f64,
    pub is_directional: bool,
    pub max_torque_angle_deg: f64,
}

impl Default for OvercurrentRelaySettings {
    fn default() -> Self {
        Self {
            curve_type: CurveFamily::IecStandardInverse,
            pickup_current: 5.0,
            time_dial: 1.0,
            definite_time_delay: 0.5,
            dropout_ratio: 0.95,
            enable_50: true,
            instantaneous_pickup: 25.0,
            instantaneous_delay: 0.0,
            is_directional: false,
            max_torque_angle_deg: 45.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OvercurrentRelayState {
    pub disk_travel: f64,
    pub is_51_picked_up: bool,
    pub is_50_picked_up: bool,
    pub is_tripped: bool,
    pub trip_source: String,
    pub instantaneous_timer: f64,
    pub measured_current: f64,
    pub operating_time_estimate: f64,
}

impl Default for OvercurrentRelayState {
    fn default() -> Self {
        Self {
            disk_travel: 0.0,
            is_51_picked_up: false,
            is_50_picked_up: false,
            is_tripped: false,
            trip_source: "NONE".to_string(),
            instantaneous_timer: 0.0,
            measured_current: 0.0,
            operating_time_estimate: f64::INFINITY,
        }
    }
}

pub struct OvercurrentRelay {
    pub id: String,
    pub settings: OvercurrentRelaySettings,
    pub state: OvercurrentRelayState,
}

impl OvercurrentRelay {
    pub fn new(id: &str, settings: OvercurrentRelaySettings) -> Self {
        Self {
            id: id.to_string(),
            settings,
            state: OvercurrentRelayState::default(),
        }
    }

    pub fn calculate_trip_time(&self, current_mag: f64) -> f64 {
        let i = current_mag;
        let is = self.settings.pickup_current;
        let td = self.settings.time_dial;

        if i <= is {
            return f64::INFINITY;
        }

        if self.settings.curve_type == CurveFamily::DefiniteTime {
            return self.settings.definite_time_delay;
        }

        let params = self.settings.curve_type.get_parameters();
        let m = i / is;
        let denom = m.powf(params.p) - 1.0;
        if denom <= 0.0 {
            return f64::INFINITY;
        }

        td * (params.a / denom + params.b)
    }

    pub fn calculate_reset_time(&self, current_mag: f64) -> f64 {
        let i = current_mag;
        let is = self.settings.pickup_current;
        let td = self.settings.time_dial;
        let params = self.settings.curve_type.get_parameters();

        let m = (i / is).min(0.999);
        let denom = 1.0 - m.powi(2);
        if denom <= 0.0 {
            return td * params.tr;
        }

        td * (params.tr / denom)
    }

    pub fn step(&mut self, current_mag: f64, dt: f64) -> &OvercurrentRelayState {
        self.state.measured_current = current_mag;
        let is = self.settings.pickup_current;
        let i_dropout = is * self.settings.dropout_ratio;

        // 50 Instantaneous
        if self.settings.enable_50 && current_mag >= self.settings.instantaneous_pickup {
            self.state.is_50_picked_up = true;
            self.state.instantaneous_timer += dt;
            if self.state.instantaneous_timer >= self.settings.instantaneous_delay {
                self.state.is_tripped = true;
                self.state.trip_source = "50".to_string();
                return &self.state;
            }
        } else {
            self.state.is_50_picked_up = false;
            self.state.instantaneous_timer = 0.0;
        }

        // 51 Time-Overcurrent
        if current_mag >= is {
            self.state.is_51_picked_up = true;
            let t_trip = self.calculate_trip_time(current_mag);
            self.state.operating_time_estimate = t_trip;
            if t_trip.is_finite() && t_trip > 0.0 {
                self.state.disk_travel += dt / t_trip;
            }
        } else if current_mag < i_dropout {
            self.state.is_51_picked_up = false;
            self.state.operating_time_estimate = f64::INFINITY;
            let t_reset = self.calculate_reset_time(current_mag);
            if t_reset.is_finite() && t_reset > 0.0 {
                self.state.disk_travel -= dt / t_reset;
            } else {
                self.state.disk_travel -= dt / 1.0;
            }
        }

        self.state.disk_travel = self.state.disk_travel.clamp(0.0, 1.0);

        if self.state.disk_travel >= 1.0 {
            self.state.is_tripped = true;
            self.state.trip_source = "51".to_string();
        }

        &self.state
    }
}
