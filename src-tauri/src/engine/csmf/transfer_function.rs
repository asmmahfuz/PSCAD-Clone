/// PSCAD Modern - s-Domain Rational Transfer Function & z-Domain Filters in Native Rust
///
/// Discretizes arbitrary H(s) = N(s) / D(s) via Bilinear (Tustin) transformation with optional
/// frequency pre-warping, anti-windup clamping, and slew rate limits.

#[derive(Debug, Clone)]
pub struct TransferFunctionS {
    pub num_desc: Vec<f64>,
    pub den_desc: Vec<f64>,
    pub min_val: f64,
    pub max_val: f64,
    pub slew_rate_max: f64,
    pub slew_rate_min: f64,
    pub prewarp_freq_rad: Option<f64>,

    b_disc: Vec<f64>,
    a_disc: Vec<f64>,
    order: usize,

    u_history: Vec<f64>,
    y_history: Vec<f64>,
    current_y: f64,
    current_u: f64,
    is_initialized: bool,
    last_dt: f64,
}

impl TransferFunctionS {
    pub fn new(
        num: Vec<f64>,
        den: Vec<f64>,
        min_val: Option<f64>,
        max_val: Option<f64>,
    ) -> Result<Self, &'static str> {
        if den.is_empty() || den[0].abs() < 1e-14 {
            return Err("Denominator cannot be empty or have zero leading coefficient");
        }
        if num.len() > den.len() {
            return Err("Transfer function must be proper (deg(num) <= deg(den))");
        }

        let min = min_val.unwrap_or(f64::NEG_INFINITY);
        let max = max_val.unwrap_or(f64::INFINITY);

        Ok(Self {
            num_desc: num,
            den_desc: den,
            min_val: min,
            max_val: max,
            slew_rate_max: f64::INFINITY,
            slew_rate_min: f64::NEG_INFINITY,
            prewarp_freq_rad: None,
            b_disc: Vec::new(),
            a_disc: Vec::new(),
            order: 0,
            u_history: Vec::new(),
            y_history: Vec::new(),
            current_y: 0.0,
            current_u: 0.0,
            is_initialized: false,
            last_dt: 0.0001,
        })
    }

    pub fn first_order_lag(k: f64, t: f64, min_val: Option<f64>, max_val: Option<f64>) -> Self {
        Self::new(vec![k], vec![t, 1.0], min_val, max_val).unwrap()
    }

    pub fn lead_lag(k: f64, t1: f64, t2: f64, min_val: Option<f64>, max_val: Option<f64>) -> Self {
        Self::new(vec![k * t1, k], vec![t2, 1.0], min_val, max_val).unwrap()
    }

    pub fn washout(tw: f64, min_val: Option<f64>, max_val: Option<f64>) -> Self {
        Self::new(vec![tw, 0.0], vec![tw, 1.0], min_val, max_val).unwrap()
    }

    pub fn discretize(&mut self, dt: f64) {
        if dt <= 0.0 {
            return;
        }
        self.last_dt = dt;

        let c = if let Some(w0) = self.prewarp_freq_rad {
            if w0 > 0.0 {
                w0 / (w0 * dt / 2.0).tan()
            } else {
                2.0 / dt
            }
        } else {
            2.0 / dt
        };

        let n = self.den_desc.len() - 1;
        self.order = n;

        let mut num_padded = vec![0.0; n + 1];
        let m = self.num_desc.len() - 1;
        for i in 0..=m {
            num_padded[n - m + i] = self.num_desc[i];
        }

        let mut b_z = vec![0.0; n + 1];
        let mut a_z = vec![0.0; n + 1];

        for k in 0..=n {
            let num_coeff = num_padded[n - k];
            let den_coeff = self.den_desc[n - k];

            if num_coeff != 0.0 || den_coeff != 0.0 {
                let poly = self.expand_bilinear_term(k, n - k, c);
                for j in 0..=n {
                    b_z[j] += num_coeff * poly[j];
                    a_z[j] += den_coeff * poly[j];
                }
            }
        }

        let a0 = a_z[0];
        if a0.abs() < 1e-15 {
            return;
        }

        self.a_disc = a_z.iter().map(|&v| v / a0).collect();
        self.b_disc = b_z.iter().map(|&v| v / a0).collect();

        self.u_history = vec![self.current_u; n + 1];
        self.y_history = vec![self.current_y; n.max(1)];
    }

    fn expand_bilinear_term(&self, k: usize, m: usize, c: f64) -> Vec<f64> {
        let p_minus = self.binomial_expansion(k, -1.0);
        let p_plus = self.binomial_expansion(m, 1.0);
        let mut prod = vec![0.0; p_minus.len() + p_plus.len() - 1];
        for i in 0..p_minus.len() {
            for j in 0..p_plus.len() {
                prod[i + j] += p_minus[i] * p_plus[j];
            }
        }
        let scale = c.powi(k as i32);
        prod.iter().map(|&v| v * scale).collect()
    }

    fn binomial_expansion(&self, n: usize, sign: f64) -> Vec<f64> {
        let mut res = vec![0.0; n + 1];
        for i in 0..=n {
            let mut combo = 1.0;
            for j in 0..i {
                combo = combo * (n - j) as f64 / (j + 1) as f64;
            }
            res[i] = combo * sign.powi(i as i32);
        }
        res
    }

    pub fn initialize_steady_state(&mut self, u0: f64, dt: f64) -> f64 {
        self.current_u = u0;
        let num0 = *self.num_desc.last().unwrap_or(&0.0);
        let den0 = *self.den_desc.last().unwrap_or(&1.0);

        if den0.abs() > 1e-14 {
            self.current_y = (num0 / den0) * u0;
        } else {
            self.current_y = 0.0;
        }

        self.current_y = self.current_y.clamp(self.min_val, self.max_val);
        self.discretize(dt);
        self.u_history.fill(u0);
        self.y_history.fill(self.current_y);
        self.is_initialized = true;
        self.current_y
    }

    pub fn step(&mut self, u: f64, dt: f64) -> f64 {
        if !self.is_initialized || (dt - self.last_dt).abs() > 1e-9 {
            self.discretize(dt);
            if !self.is_initialized {
                self.u_history.fill(u);
                self.y_history.fill(self.current_y);
                self.is_initialized = true;
            }
        }

        self.current_u = u;
        for i in (1..=self.order).rev() {
            self.u_history[i] = self.u_history[i - 1];
        }
        self.u_history[0] = u;

        let mut y_raw = 0.0;
        for i in 0..=self.order {
            y_raw += self.b_disc[i] * self.u_history[i];
        }
        for j in 1..=self.order {
            y_raw -= self.a_disc[j] * self.y_history[j - 1];
        }

        let prev_y = self.y_history[0];
        let max_chg = self.slew_rate_max * dt;
        let min_chg = self.slew_rate_min * dt;
        let mut y_rate = y_raw;
        if self.slew_rate_max.is_finite() && y_rate - prev_y > max_chg {
            y_rate = prev_y + max_chg;
        }
        if self.slew_rate_min.is_finite() && y_rate - prev_y < min_chg {
            y_rate = prev_y + min_chg;
        }

        let y_clamped = y_rate.clamp(self.min_val, self.max_val);
        self.current_y = y_clamped;

        for j in (1..self.order).rev() {
            self.y_history[j] = self.y_history[j - 1];
        }
        if self.order > 0 {
            self.y_history[0] = y_clamped;
        }

        self.current_y
    }

    pub fn get_output(&self) -> f64 {
        self.current_y
    }
}
