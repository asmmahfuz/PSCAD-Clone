//! ANSI 21 Multi-Zone Distance Protection Relay
//!
//! Implements 6 apparent loop impedance calculations (AG, BG, CG, AB, BC, CA)
//! with Mho circles and Quadrilateral characteristics.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Complex {
    pub r: f64,
    pub i: f64,
}

impl Complex {
    pub fn new(r: f64, i: f64) -> Self {
        Self { r, i }
    }

    pub fn add(&self, other: &Self) -> Self {
        Self {
            r: self.r + other.r,
            i: self.i + other.i,
        }
    }

    pub fn sub(&self, other: &Self) -> Self {
        Self {
            r: self.r - other.r,
            i: self.i - other.i,
        }
    }

    pub fn mul(&self, other: &Self) -> Self {
        Self {
            r: self.r * other.r - self.i * other.i,
            i: self.r * other.i + self.i * other.r,
        }
    }

    pub fn scale(&self, s: f64) -> Self {
        Self {
            r: self.r * s,
            i: self.i * s,
        }
    }

    pub fn div(&self, other: &Self) -> Self {
        let denom = other.r * other.r + other.i * other.i;
        if denom == 0.0 {
            return Self { r: 1e9, i: 1e9 };
        }
        Self {
            r: (self.r * other.r + self.i * other.i) / denom,
            i: (self.i * other.r - self.r * other.i) / denom,
        }
    }

    pub fn mag(&self) -> f64 {
        self.r.hypot(self.i)
    }

    pub fn ang(&self) -> f64 {
        self.i.atan2(self.r)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FaultLoop {
    Ag,
    Bg,
    Cg,
    Ab,
    Bc,
    Ca,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CharacteristicType {
    Mho,
    Quadrilateral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistanceZoneSettings {
    pub enabled: bool,
    pub reach_z1_mag: f64,
    pub reach_z1_ang_deg: f64,
    pub time_delay: f64,
    pub characteristic: CharacteristicType,
    pub reach_x: f64,
    pub reach_r_right: f64,
    pub reach_r_left: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistanceRelaySettings {
    pub line_z1: Complex,
    pub line_z0: Complex,
    pub zone1: DistanceZoneSettings,
    pub zone2: DistanceZoneSettings,
    pub zone3: DistanceZoneSettings,
    pub enable_load_encroachment: bool,
    pub load_encroachment_r: f64,
    pub load_encroachment_angle_deg: f64,
}

pub struct DistanceRelay {
    pub id: String,
    pub settings: DistanceRelaySettings,
    pub k0: Complex,
    pub is_tripped: bool,
    pub trip_zone: String,
    pub faulted_loop: Option<FaultLoop>,
    pub zone_timers: [f64; 3],
}

impl DistanceRelay {
    pub fn new(id: &str, settings: DistanceRelaySettings) -> Self {
        // k0 = (Z0 - Z1) / (3 * Z1)
        let num = settings.line_z0.sub(&settings.line_z1);
        let den = settings.line_z1.scale(3.0);
        let k0 = num.div(&den);

        Self {
            id: id.to_string(),
            settings,
            k0,
            is_tripped: false,
            trip_zone: "NONE".to_string(),
            faulted_loop: None,
            zone_timers: [0.0; 3],
        }
    }

    pub fn is_inside_zone(&self, z: &Complex, zone: &DistanceZoneSettings) -> bool {
        if !zone.enabled {
            return false;
        }

        if self.settings.enable_load_encroachment {
            let z_mag = z.mag();
            let z_ang_deg = (z.ang() * 180.0 / std::f64::consts::PI).abs();
            if z_mag <= self.settings.load_encroachment_r && z_ang_deg <= self.settings.load_encroachment_angle_deg {
                return false;
            }
        }

        match zone.characteristic {
            CharacteristicType::Mho => {
                let phi_reach_rad = zone.reach_z1_ang_deg.to_radians();
                let z_fwd = Complex::new(
                    zone.reach_z1_mag * phi_reach_rad.cos(),
                    zone.reach_z1_mag * phi_reach_rad.sin(),
                );
                let center = z_fwd.scale(0.5);
                let radius = z_fwd.mag() / 2.0;

                z.sub(&center).mag() <= radius + 1e-6
            }
            CharacteristicType::Quadrilateral => {
                let is_above_dir = z.i >= -0.1 * zone.reach_x;
                let is_below_x = z.i <= zone.reach_x;
                let is_right_ok = z.r <= zone.reach_r_right;
                let is_left_ok = z.r >= -zone.reach_r_left;

                is_above_dir && is_below_x && is_right_ok && is_left_ok
            }
        }
    }

    pub fn step(
        &mut self,
        va: Complex,
        vb: Complex,
        vc: Complex,
        ia: Complex,
        ib: Complex,
        ic: Complex,
        dt: f64,
    ) {
        // 3*I0
        let three_i0 = ia.add(&ib).add(&ic);
        let i0_comp = self.k0.mul(&three_i0);

        // Ground loops
        let z_ag = va.div(&ia.add(&i0_comp));
        let z_bg = vb.div(&ib.add(&i0_comp));
        let z_cg = vc.div(&ic.add(&i0_comp));

        // Phase loops
        let z_ab = va.sub(&vb).div(&ia.sub(&ib));
        let z_bc = vb.sub(&vc).div(&ib.sub(&ic));
        let z_ca = vc.sub(&va).div(&ic.sub(&ia));

        let loops = [
            (FaultLoop::Ag, z_ag),
            (FaultLoop::Bg, z_bg),
            (FaultLoop::Cg, z_cg),
            (FaultLoop::Ab, z_ab),
            (FaultLoop::Bc, z_bc),
            (FaultLoop::Ca, z_ca),
        ];

        let mut in_z1 = false;
        let mut in_z2 = false;
        let mut in_z3 = false;

        for (_lp, z) in &loops {
            if self.is_inside_zone(z, &self.settings.zone1) {
                in_z1 = true;
            }
            if self.is_inside_zone(z, &self.settings.zone2) {
                in_z2 = true;
            }
            if self.is_inside_zone(z, &self.settings.zone3) {
                in_z3 = true;
            }
        }

        if in_z1 {
            self.zone_timers[0] += dt;
            if self.zone_timers[0] >= self.settings.zone1.time_delay {
                self.is_tripped = true;
                self.trip_zone = "ZONE1".to_string();
                return;
            }
        } else {
            self.zone_timers[0] = 0.0;
        }

        if in_z2 {
            self.zone_timers[1] += dt;
            if self.zone_timers[1] >= self.settings.zone2.time_delay {
                self.is_tripped = true;
                self.trip_zone = "ZONE2".to_string();
                return;
            }
        } else {
            self.zone_timers[1] = 0.0;
        }

        if in_z3 {
            self.zone_timers[2] += dt;
            if self.zone_timers[2] >= self.settings.zone3.time_delay {
                self.is_tripped = true;
                self.trip_zone = "ZONE3".to_string();
                return;
            }
        } else {
            self.zone_timers[2] = 0.0;
        }
    }
}
