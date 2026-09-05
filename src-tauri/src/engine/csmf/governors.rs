/// PSCAD Modern - IEEE Standard Speed Governors in Native Rust (IEEEG1, HYGOV, GAST, DEGOV)

use super::transfer_function::TransferFunctionS;

#[derive(Debug, Clone)]
pub struct Ieeeg1Governor {
    pub k: f64,
    pub pmax: f64,
    pub pmin: f64,
    pub k1: f64,
    pub k3: f64,
    pub k5: f64,
    pub k7: f64,

    servo_lag: TransferFunctionS,
    hp_lag: TransferFunctionS,
    ip_lag: TransferFunctionS,
    lp1_lag: TransferFunctionS,
    lp2_lag: TransferFunctionS,

    pub valve_pos: f64,
    pub pmech: f64,
}

impl Ieeeg1Governor {
    pub fn new(k: f64, t3: f64, t4: f64, t5: f64, t6: f64) -> Self {
        Self {
            k,
            pmax: 1.05,
            pmin: 0.0,
            k1: 0.3,
            k3: 0.4,
            k5: 0.3,
            k7: 0.0,
            servo_lag: TransferFunctionS::first_order_lag(1.0, t3.max(1e-4), Some(0.0), Some(1.05)),
            hp_lag: TransferFunctionS::first_order_lag(1.0, t4.max(1e-4), None, None),
            ip_lag: TransferFunctionS::first_order_lag(1.0, t5.max(1e-4), None, None),
            lp1_lag: TransferFunctionS::first_order_lag(1.0, t6.max(1e-4), None, None),
            lp2_lag: TransferFunctionS::first_order_lag(1.0, 0.01, None, None),
            valve_pos: 0.8,
            pmech: 0.8,
        }
    }

    pub fn initialize(&mut self, pmech0: f64, dt: f64) {
        let p = pmech0.clamp(self.pmin, self.pmax);
        self.valve_pos = p;
        self.pmech = p;
        self.servo_lag.initialize_steady_state(p, dt);
        self.hp_lag.initialize_steady_state(p, dt);
        self.ip_lag.initialize_steady_state(p, dt);
        self.lp1_lag.initialize_steady_state(p, dt);
        self.lp2_lag.initialize_steady_state(p, dt);
    }

    pub fn step(&mut self, w_pu: f64, w_ref: f64, pref: f64, dt: f64) -> f64 {
        let delta_w = w_ref - w_pu;
        let valve_demand = pref + self.k * delta_w;
        self.valve_pos = self.servo_lag.step(valve_demand, dt);

        let x_hp = self.hp_lag.step(self.valve_pos, dt);
        let x_ip = self.ip_lag.step(x_hp, dt);
        let x_lp1 = self.lp1_lag.step(x_ip, dt);
        let x_lp2 = self.lp2_lag.step(x_lp1, dt);

        self.pmech = self.k1 * x_hp + self.k3 * x_ip + self.k5 * x_lp1 + self.k7 * x_lp2;
        self.pmech
    }
}

#[derive(Debug, Clone)]
pub struct HygovGovernor {
    pub r: f64,
    pub r_temp: f64,
    pub tr: f64,
    pub tg: f64,
    pub tw: f64,
    pub at: f64,
    pub qnl: f64,

    pub gate: f64,
    pub q: f64,
    pub h: f64,
    pub pmech: f64,

    temp_droop: TransferFunctionS,
}

impl HygovGovernor {
    pub fn new(r: f64, r_temp: f64, tr: f64, tg: f64, tw: f64) -> Self {
        Self {
            r,
            r_temp,
            tr,
            tg,
            tw,
            at: 1.2,
            qnl: 0.08,
            gate: 0.8,
            q: 0.8,
            h: 1.0,
            pmech: 0.8,
            temp_droop: TransferFunctionS::washout(tr.max(1e-3), None, None),
        }
    }

    pub fn initialize(&mut self, pmech0: f64, dt: f64) {
        let g0 = (pmech0 / self.at + self.qnl).clamp(0.0, 1.0);
        self.gate = g0;
        self.q = g0;
        self.h = 1.0;
        self.pmech = self.at * (g0 - self.qnl);
        self.temp_droop.initialize_steady_state(g0, dt);
    }

    pub fn step(&mut self, w_pu: f64, w_ref: f64, pref: f64, dt: f64) -> f64 {
        let delta_w = w_pu - w_ref;
        let delta_temp = self.r_temp * self.temp_droop.step(self.gate, dt);
        let speed_demand = pref - (delta_w / self.r.max(1e-4)) - delta_temp;

        let mut gate_err = (speed_demand - self.gate) / self.tg.max(1e-4);
        gate_err = gate_err.clamp(-0.14, 0.16);

        self.gate = (self.gate + gate_err * dt).clamp(0.0, 1.0);

        let g_eff = self.gate.max(0.01);
        self.h = (self.q / g_eff).powi(2).clamp(0.0, 3.0);
        let dqdt = (1.0 - self.h) / self.tw.max(1e-3);
        self.q = (self.q + dqdt * dt).max(0.0);

        let active_flow = (self.q - self.qnl).max(0.0);
        self.pmech = (self.at * self.h * active_flow).max(0.0);
        self.pmech
    }
}
