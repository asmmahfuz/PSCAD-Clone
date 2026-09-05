/// PSCAD Modern - Advanced Wind Turbine Aerodynamics & Pitch Control in Native Rust

#[derive(Debug, Clone)]
pub struct WindTurbineAerodynamics {
    pub rated_power_mw: f64,
    pub rotor_radius: f64,
    pub air_density: f64,
    pub gearbox_ratio: f64,
    pub rated_rotor_speed_rpm: f64,
    pub rated_wind_speed: f64,
    pub cut_in_wind_speed: f64,
    pub cut_out_wind_speed: f64,

    pub swept_area: f64,
    pub k_opt: f64,

    pub pitch_angle_deg: f64,
    pub pitch_demand_deg: f64,
    pub pitch_integ_state: f64,
    pub paero_mw: f64,
    pub taero_mnm: f64,
    pub thrust_kn: f64,
}

impl WindTurbineAerodynamics {
    pub fn new(rated_power_mw: f64, rotor_radius: f64, rated_rotor_speed_rpm: f64) -> Self {
        let swept_area = std::f64::consts::PI * rotor_radius * rotor_radius;
        let air_density = 1.225;
        let cp_max = 0.48;
        let lambda_opt: f64 = 8.1;

        let k_opt = 0.5 * air_density * std::f64::consts::PI * rotor_radius.powi(5) * (cp_max / lambda_opt.powi(3));

        Self {
            rated_power_mw,
            rotor_radius,
            air_density,
            gearbox_ratio: 97.0,
            rated_rotor_speed_rpm,
            rated_wind_speed: 11.4,
            cut_in_wind_speed: 3.5,
            cut_out_wind_speed: 25.0,
            swept_area,
            k_opt,
            pitch_angle_deg: 0.0,
            pitch_demand_deg: 0.0,
            pitch_integ_state: 0.0,
            paero_mw: 0.0,
            taero_mnm: 0.0,
            thrust_kn: 0.0,
        }
    }

    pub fn calculate_cp(&self, lambda: f64, beta_deg: f64) -> f64 {
        if lambda <= 0.01 {
            return 0.0;
        }
        let beta = beta_deg.max(0.0);
        let inv_lambda_i = 1.0 / (lambda + 0.08 * beta) - 0.035 / (beta.powi(3) + 1.0);
        if inv_lambda_i <= 0.0 {
            return 0.0;
        }

        let term = 116.0 * inv_lambda_i - 0.4 * beta - 5.0;
        let cp = 0.5176 * term * (-21.0 * inv_lambda_i).exp() + 0.0068 * lambda;
        cp.clamp(0.0, 0.593)
    }

    pub fn step(&mut self, v_wind: f64, w_rotor_rad_sec: f64, dt: f64) -> (f64, f64, f64) {
        let v = v_wind.max(0.1);
        let w_rotor = w_rotor_rad_sec.max(0.01);
        let w_rated = (self.rated_rotor_speed_rpm * 2.0 * std::f64::consts::PI) / 60.0;

        if v < self.cut_in_wind_speed {
            self.pitch_demand_deg = 0.0;
        } else if v > self.cut_out_wind_speed {
            self.pitch_demand_deg = 90.0;
        } else if w_rotor < w_rated && v < self.rated_wind_speed {
            self.pitch_demand_deg = 0.0;
            self.pitch_integ_state = 0.0;
        } else {
            let speed_err = w_rotor - w_rated;
            self.pitch_integ_state = (self.pitch_integ_state + 5.0 * speed_err * dt).clamp(0.0, 90.0);
            self.pitch_demand_deg = (15.0 * speed_err + self.pitch_integ_state).clamp(0.0, 90.0);
        }

        // Pitch rate limit (10 deg/s)
        let pitch_err = (self.pitch_demand_deg - self.pitch_angle_deg) / 0.25;
        let clamped_rate = pitch_err.clamp(-10.0, 10.0);
        self.pitch_angle_deg = (self.pitch_angle_deg + clamped_rate * dt).clamp(0.0, 90.0);

        let lambda = (w_rotor * self.rotor_radius) / v;
        let cp = self.calculate_cp(lambda, self.pitch_angle_deg);
        let ct = if lambda > 0.1 { (1.33 * cp / lambda).clamp(0.0, 1.2) } else { 0.0 };

        let p_watts = 0.5 * self.air_density * self.swept_area * v.powi(3) * cp;
        self.paero_mw = p_watts / 1e6;
        self.taero_mnm = (p_watts / w_rotor) / 1e6;
        self.thrust_kn = (0.5 * self.air_density * self.swept_area * v.powi(2) * ct) / 1e3;

        (self.paero_mw, self.taero_mnm, self.pitch_angle_deg)
    }
}
