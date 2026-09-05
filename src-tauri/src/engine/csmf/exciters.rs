/// PSCAD Modern - IEEE Standard Excitation Systems & AVR in Native Rust (AC1A, DC1A, ST1A)

use super::transfer_function::TransferFunctionS;

#[derive(Debug, Clone)]
pub struct Ac1aExciter {
    pub ka: f64,
    pub ta: f64,
    pub te: f64,
    pub ke: f64,
    pub kd: f64,
    pub kc: f64,
    pub vrmax: f64,
    pub vrmin: f64,

    a_ex: f64,
    b_ex: f64,

    pub vt_filtered: f64,
    pub ve: f64,
    pub efd: f64,

    transducer_lag: TransferFunctionS,
    regulator_lag: TransferFunctionS,
    stabilizer_washout: TransferFunctionS,
}

impl Ac1aExciter {
    pub fn new(ka: f64, ta: f64, te: f64, ke: f64, kd: f64, kc: f64) -> Self {
        let e1: f64 = 3.0;
        let se1: f64 = 0.10;
        let e2: f64 = 4.0;
        let se2: f64 = 0.35;

        let b_ex = (se2 / se1).ln() / (e2 - e1);
        let a_ex = se1 / (b_ex * e1).exp();

        Self {
            ka,
            ta,
            te,
            ke,
            kd,
            kc,
            vrmax: 7.3,
            vrmin: -7.3,
            a_ex,
            b_ex,
            vt_filtered: 1.0,
            ve: 1.0,
            efd: 1.0,
            transducer_lag: TransferFunctionS::first_order_lag(1.0, 0.02, None, None),
            regulator_lag: TransferFunctionS::first_order_lag(ka, ta.max(1e-4), Some(-7.3), Some(7.3)),
            stabilizer_washout: TransferFunctionS::washout(1.0, None, None),
        }
    }

    pub fn get_saturation(&self, ve: f64) -> f64 {
        if ve <= 0.0 {
            0.0
        } else {
            self.a_ex * (self.b_ex * ve.abs()).exp()
        }
    }

    pub fn initialize(&mut self, efd0: f64, ifd0: f64, dt: f64) {
        self.efd = efd0;
        self.ve = efd0.max(0.1);
        let se = self.get_saturation(self.ve);
        let vr0 = (self.ke + se) * self.ve + self.kd * ifd0;

        self.vt_filtered = 1.0;
        self.transducer_lag.initialize_steady_state(1.0, dt);
        self.regulator_lag.initialize_steady_state(vr0 / self.ka, dt);
        self.stabilizer_washout.initialize_steady_state(self.ve, dt);
    }

    pub fn step(&mut self, vt_pu: f64, vref_pu: f64, ifd_pu: f64, vpss_pu: f64, dt: f64) -> f64 {
        self.vt_filtered = self.transducer_lag.step(vt_pu, dt);
        let stab_out = 0.03 * self.stabilizer_washout.step(self.ve, dt);

        let v_error = vref_pu - self.vt_filtered + vpss_pu - stab_out;
        let vr = self.regulator_lag.step(v_error, dt);

        let se = self.get_saturation(self.ve);
        let demag = self.kd * ifd_pu;
        let dvedt = (vr - (self.ke + se) * self.ve - demag) / self.te.max(1e-3);
        self.ve = (self.ve + dvedt * dt).max(0.01);

        let in_comm = (self.kc * ifd_pu.max(0.0)) / self.ve.max(1e-4);
        let fex = if in_comm <= 0.433 {
            1.0 - 0.577 * in_comm
        } else if in_comm <= 0.75 {
            (0.75 - in_comm * in_comm).max(0.0).sqrt()
        } else if in_comm <= 1.0 {
            1.732 * (1.0 - in_comm)
        } else {
            0.0
        };

        self.efd = self.ve * fex;
        self.efd
    }
}
