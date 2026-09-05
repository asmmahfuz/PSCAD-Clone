use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaftMass {
    pub name: String,
    pub inertia_h: f64,    // Inertia constant H (s)
    pub damping_d: f64,    // Self-damping coefficient D_i (pu)
    pub angle_rad: f64,    // Rotor angle delta_i
    pub speed_pu: f64,     // Rotor speed omega_i (pu)
    pub torque_mech_pu: f64, // Mechanical driving torque (turbine stages)
}

/// Multi-Mass Torsional Shaft System (e.g. HP -> IP -> LPA -> LPB -> GEN -> EXC)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiMassShaft {
    pub masses: Vec<ShaftMass>,
    pub k_spring: Vec<f64>, // Torsional shaft spring stiffness between mass i and i+1 (pu/rad)
    pub d_mut: Vec<f64>,    // Mutual damping coefficient between mass i and i+1
}

impl MultiMassShaft {
    /// Create standard 4-mass turbine-generator shaft (HP, LP, GEN, EXC)
    pub fn new_standard_4mass() -> Self {
        let masses = vec![
            ShaftMass {
                name: "HP".to_string(),
                inertia_h: 0.15,
                damping_d: 0.1,
                angle_rad: 0.0,
                speed_pu: 1.0,
                torque_mech_pu: 0.3,
            },
            ShaftMass {
                name: "LP".to_string(),
                inertia_h: 1.20,
                damping_d: 0.2,
                angle_rad: 0.0,
                speed_pu: 1.0,
                torque_mech_pu: 0.7,
            },
            ShaftMass {
                name: "GEN".to_string(),
                inertia_h: 0.90,
                damping_d: 0.2,
                angle_rad: 0.0,
                speed_pu: 1.0,
                torque_mech_pu: 0.0, // Driven by electrical torque T_e
            },
            ShaftMass {
                name: "EXC".to_string(),
                inertia_h: 0.05,
                damping_d: 0.05,
                angle_rad: 0.0,
                speed_pu: 1.0,
                torque_mech_pu: 0.0,
            },
        ];

        let k_spring = vec![30.0, 50.0, 5.0]; // HP-LP, LP-GEN, GEN-EXC stiffness
        let d_mut = vec![0.5, 0.8, 0.1];

        Self {
            masses,
            k_spring,
            d_mut,
        }
    }

    /// Step multi-mass torsional dynamic differential equations
    pub fn step(&mut self, t_elec_gen_pu: f64, omega_base: f64, dt: f64) {
        let n = self.masses.len();
        let mut t_shaft = vec![0.0; n - 1];

        // Compute shaft torsional torques: T_ij = K_ij * (delta_i - delta_j) + D_mut_ij * (omega_i - omega_j)
        for i in 0..(n - 1) {
            let delta_diff = self.masses[i].angle_rad - self.masses[i + 1].angle_rad;
            let omega_diff = (self.masses[i].speed_pu - self.masses[i + 1].speed_pu) * omega_base;
            t_shaft[i] = self.k_spring[i] * delta_diff + self.d_mut[i] * omega_diff;
        }

        // Accelerate individual masses: 2*H_i * d(omega_i)/dt = T_m,i - T_e,i - T_shaft_right + T_shaft_left - D_i*(omega_i - 1)
        for i in 0..n {
            let mut net_torque = self.masses[i].torque_mech_pu;

            // Generator mass (index 2) experiences electrical load torque
            if i == 2 {
                net_torque -= t_elec_gen_pu;
            }

            if i > 0 {
                net_torque += t_shaft[i - 1]; // Received from left mass
            }
            if i < n - 1 {
                net_torque -= t_shaft[i]; // Transmitted to right mass
            }

            let self_damp = self.masses[i].damping_d * (self.masses[i].speed_pu - 1.0);
            let d_omega = (net_torque - self_damp) / (2.0 * self.masses[i].inertia_h);

            self.masses[i].speed_pu += d_omega * dt;
            self.masses[i].angle_rad += (self.masses[i].speed_pu - 1.0) * omega_base * dt;
        }
    }
}
