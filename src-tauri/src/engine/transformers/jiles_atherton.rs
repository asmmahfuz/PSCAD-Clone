use serde::{Deserialize, Serialize};

pub const MU_0: f64 = 4.0 * std::f64::consts::PI * 1e-7;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JilesAthertonParams {
    pub ms: f64,       // Saturation magnetization [A/m]
    pub a: f64,        // Domain parameter [A/m]
    pub alpha: f64,    // Interdomain coupling parameter
    pub k: f64,        // Pinning energy parameter [A/m]
    pub c: f64,        // Reversible coefficient
    pub a_core: f64,   // Core cross-sectional area [m^2]
    pub l_core: f64,   // Mean magnetic path length [m]
    pub n_turns: f64,  // Number of turns
    pub r_winding: f64,// Winding resistance [Ohm]
    pub l_leakage: f64,// Leakage inductance [H]
}

impl Default for JilesAthertonParams {
    fn default() -> Self {
        Self {
            ms: 1.65e6,
            a: 1100.0,
            alpha: 1.5e-3,
            k: 450.0,
            c: 0.18,
            a_core: 0.08,
            l_core: 2.2,
            n_turns: 500.0,
            r_winding: 0.15,
            l_leakage: 0.005,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JilesAthertonState {
    pub h: f64,
    pub m: f64,
    pub m_irr: f64,
    pub b: f64,
    pub flux: f64,
    pub mu_diff: f64,
    pub l_inc: f64,
    pub prev_v: f64,
    pub prev_i: f64,
    pub remanent_b: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JilesAthertonCore {
    pub id: String,
    pub params: JilesAthertonParams,
    pub state: JilesAthertonState,
}

impl JilesAthertonCore {
    pub fn new(id: &str, params: JilesAthertonParams, initial_b: f64) -> Self {
        let initial_m = initial_b / MU_0;
        let mut core = Self {
            id: id.to_string(),
            params,
            state: JilesAthertonState {
                h: 0.0,
                m: initial_m,
                m_irr: initial_m,
                b: initial_b,
                flux: initial_b * 0.08,
                mu_diff: MU_0 * 1000.0,
                l_inc: 1.0,
                prev_v: 0.0,
                prev_i: 0.0,
                remanent_b: initial_b,
            },
        };
        core.state.flux = initial_b * core.params.a_core;
        core.state.mu_diff = core.compute_differential_permeability(0.0, initial_m, initial_m, 1);
        core.state.l_inc = (core.params.n_turns * core.params.n_turns * core.params.a_core * core.state.mu_diff) / core.params.l_core;
        core
    }

    #[inline]
    pub fn langevin(z: f64) -> f64 {
        let abs_z = z.abs();
        if abs_z < 1e-4 {
            let z2 = z * z;
            return z * (1.0 / 3.0 - z2 / 45.0 + (2.0 * z2 * z2) / 945.0);
        }
        if abs_z > 100.0 {
            return if z > 0.0 { 1.0 - 1.0 / z } else { -1.0 - 1.0 / z };
        }
        let exp2z = (2.0 * z).exp();
        let coth = (exp2z + 1.0) / (exp2z - 1.0);
        coth - 1.0 / z
    }

    #[inline]
    pub fn d_langevin(z: f64) -> f64 {
        let abs_z = z.abs();
        if abs_z < 1e-4 {
            let z2 = z * z;
            return 1.0 / 3.0 - (2.0 * z2) / 45.0 + (2.0 * z2 * z2) / 189.0;
        }
        if abs_z > 100.0 {
            return 1.0 / (z * z);
        }
        let sinh_z = z.sinh();
        1.0 / (z * z) - 1.0 / (sinh_z * sinh_z)
    }

    #[inline]
    pub fn compute_man(&self, he: f64) -> f64 {
        let z = he / self.params.a;
        self.params.ms * Self::langevin(z)
    }

    #[inline]
    pub fn compute_dman_dhe(&self, he: f64) -> f64 {
        let z = he / self.params.a;
        (self.params.ms / self.params.a) * Self::d_langevin(z)
    }

    pub fn compute_differential_permeability(&self, h: f64, m: f64, m_irr: f64, delta: i32) -> f64 {
        let he = h + self.params.alpha * m;
        let man = self.compute_man(he);
        let dman_dhe = self.compute_dman_dhe(he);

        let mut dmirr_dh = 0.0;
        let diff = man - m_irr;
        let denom = self.params.k * (delta as f64) - self.params.alpha * diff;

        if delta != 0 && denom.abs() > 1e-12 && (delta as f64) * diff > 0.0 {
            dmirr_dh = diff / denom;
        }

        let numerator = (1.0 - self.params.c) * dmirr_dh + self.params.c * dman_dhe;
        let denominator = (1.0 - self.params.c * self.params.alpha * dman_dhe).max(1e-6);
        let dm_dh = (numerator / denominator).max(0.0);

        (MU_0 * (1.0 + dm_dh)).max(MU_0)
    }

    pub fn step_h(&mut self, new_h: f64) {
        let dh = new_h - self.state.h;
        let delta = if dh > 1e-9 { 1 } else if dh < -1e-9 { -1 } else { 0 };

        if delta == 0 {
            self.state.h = new_h;
            self.state.flux = self.state.b * self.params.a_core;
            self.state.mu_diff = self.compute_differential_permeability(self.state.h, self.state.m, self.state.m_irr, 1);
            self.state.l_inc = (self.params.n_turns * self.params.n_turns * self.params.a_core * self.state.mu_diff) / self.params.l_core;
            return;
        }

        // RK4 step for dMirr/dH
        let eval_deriv = |curr_h: f64, curr_mirr: f64| -> f64 {
            let he = curr_h + self.params.alpha * (curr_mirr + self.params.c * (self.compute_man(curr_h + self.params.alpha * curr_mirr) - curr_mirr));
            let man = self.compute_man(he);
            let diff = man - curr_mirr;
            let denom = self.params.k * (delta as f64) - self.params.alpha * diff;
            if denom.abs() < 1e-12 || (delta as f64) * diff <= 0.0 {
                0.0
            } else {
                diff / denom
            }
        };

        let k1 = eval_deriv(self.state.h, self.state.m_irr);
        let k2 = eval_deriv(self.state.h + 0.5 * dh, self.state.m_irr + 0.5 * dh * k1);
        let k3 = eval_deriv(self.state.h + 0.5 * dh, self.state.m_irr + 0.5 * dh * k2);
        let k4 = eval_deriv(self.state.h + dh, self.state.m_irr + dh * k3);

        let dmirr = (dh / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
        self.state.m_irr += dmirr;
        self.state.h = new_h;

        let he = self.state.h + self.params.alpha * self.state.m;
        let man = self.compute_man(he);
        let m_rev = self.params.c * (man - self.state.m_irr);
        self.state.m = self.state.m_irr + m_rev;

        self.state.b = MU_0 * (self.state.h + self.state.m);
        self.state.flux = self.state.b * self.params.a_core;

        self.state.mu_diff = self.compute_differential_permeability(self.state.h, self.state.m, self.state.m_irr, delta);
        self.state.l_inc = ((self.params.n_turns * self.params.n_turns * self.params.a_core * self.state.mu_diff) / self.params.l_core).max(1e-5);

        if self.state.h.abs() < 5.0 {
            self.state.remanent_b = self.state.b;
        }
    }

    pub fn get_norton_conductance(&self, dt: f64, is_be: bool) -> f64 {
        let total_l = self.state.l_inc + self.params.l_leakage;
        let factor = if is_be { 1.0 / dt } else { 2.0 / dt };
        1.0 / (factor * total_l + self.params.r_winding)
    }

    pub fn get_norton_history_current(&self, dt: f64, is_be: bool) -> f64 {
        let g_eq = self.get_norton_conductance(dt, is_be);
        if is_be {
            -self.state.prev_i
        } else {
            -self.state.prev_i - g_eq * self.state.prev_v
        }
    }

    pub fn update_emt_step(&mut self, v_term: f64, dt: f64, is_be: bool) -> f64 {
        let g_eq = self.get_norton_conductance(dt, is_be);
        let i_hist = self.get_norton_history_current(dt, is_be);
        let current = g_eq * v_term + i_hist;

        let target_h = (self.params.n_turns * current) / self.params.l_core;
        self.step_h(target_h);

        self.state.prev_v = v_term;
        self.state.prev_i = current;
        current
    }
}
