/// PSCAD Modern - IEEE Standard Power System Stabilizers in Native Rust (PSS1A & PSS2B)

use super::transfer_function::TransferFunctionS;

#[derive(Debug, Clone)]
pub struct Pss1aStabilizer {
    pub kpss: f64,
    pub vst_max: f64,
    pub vst_min: f64,

    washout: TransferFunctionS,
    lead_lag1: TransferFunctionS,
    lead_lag2: TransferFunctionS,

    pub vst: f64,
}

impl Pss1aStabilizer {
    pub fn new(kpss: f64, tw: f64, t1: f64, t2: f64, t3: f64, t4: f64) -> Self {
        Self {
            kpss,
            vst_max: 0.10,
            vst_min: -0.10,
            washout: TransferFunctionS::washout(tw.max(1e-3), None, None),
            lead_lag1: TransferFunctionS::lead_lag(1.0, t1, t2.max(1e-4), None, None),
            lead_lag2: TransferFunctionS::lead_lag(1.0, t3, t4.max(1e-4), None, None),
            vst: 0.0,
        }
    }

    pub fn initialize(&mut self, u0: f64, dt: f64) {
        self.washout.initialize_steady_state(u0, dt);
        self.lead_lag1.initialize_steady_state(0.0, dt);
        self.lead_lag2.initialize_steady_state(0.0, dt);
        self.vst = 0.0;
    }

    pub fn step(&mut self, input_signal: f64, dt: f64) -> f64 {
        let w_out = self.washout.step(input_signal, dt);
        let s1 = self.lead_lag1.step(self.kpss * w_out, dt);
        let s2 = self.lead_lag2.step(s1, dt);
        self.vst = s2.clamp(self.vst_min, self.vst_max);
        self.vst
    }
}
