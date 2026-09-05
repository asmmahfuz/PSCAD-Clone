/**
 * PSCAD Modern - Multi-Mass Torsional Elastic Shaft Mechanics (TypeScript)
 * 
 * Supports:
 * - N-mass torsional spring-damper train (HP turbine, IP turbine, LP turbine, Generator rotor, Exciter)
 * - Sub-Synchronous Resonance (SSR) torsional mode analysis
 * - Accurate shaft twist angles and inter-mass shear torque calculation
 * - Coupled mechanical swing integration
 */

import type { ComponentParams } from '../../types';

export interface MassElement {
  name: string;
  H: number;            // Inertia constant [s]
  D: number;            // Self-damping [pu]
  Tm_fraction: number;  // Fraction of total mechanical torque
}

export interface ShaftCoupling {
  K: number;            // Torsional spring stiffness [pu torque / rad]
  D: number;            // Torsional mutual damping [pu torque / (rad/s)]
}

export interface MultiMassState {
  omega: Float64Array;  // Speeds [pu] for each mass
  theta: Float64Array;  // Angle [rad] for each mass
  torques: Float64Array;// Inter-mass shaft torques [pu]
}

export class MultiMassShaft {
  id: string;
  numMasses: number;
  masses: MassElement[];
  couplings: ShaftCoupling[];
  omega0: number;       // Base angular speed [rad/s]

  constructor(id: string, params: ComponentParams = {}) {
    this.id = id;
    const freq = params.freq ?? 60;
    this.omega0 = 2 * Math.PI * freq;

    // Default 4-Mass Shaft System: HP -> IP -> LP -> Generator
    this.masses = [
      { name: 'HP_Turbine', H: params.H_hp ?? 0.88, D: 0.1, Tm_fraction: 0.30 },
      { name: 'IP_Turbine', H: params.H_ip ?? 0.77, D: 0.1, Tm_fraction: 0.25 },
      { name: 'LP_Turbine', H: params.H_lp ?? 1.45, D: 0.2, Tm_fraction: 0.45 },
      { name: 'Generator',  H: params.H_gen ?? 0.85, D: 0.2, Tm_fraction: 0.00 }
    ];

    this.numMasses = this.masses.length;

    this.couplings = [
      { K: params.K_hp_ip ?? 19.3, D: 0.05 },  // HP - IP
      { K: params.K_ip_lp ?? 35.8, D: 0.05 },  // IP - LP
      { K: params.K_lp_gen ?? 45.2, D: 0.05 }  // LP - GEN
    ];
  }

  initState(): MultiMassState {
    return {
      omega: new Float64Array(this.numMasses).fill(1.0), // 1.0 pu speed
      theta: new Float64Array(this.numMasses).fill(0.0),
      torques: new Float64Array(this.numMasses - 1).fill(0.0)
    };
  }

  /**
   * Compute shaft torques between adjacent masses
   */
  computeShaftTorques(state: MultiMassState): Float64Array {
    const torques = new Float64Array(this.numMasses - 1);
    for (let i = 0; i < this.numMasses - 1; i++) {
      const dTheta = state.theta[i] - state.theta[i + 1];
      const dOmega = (state.omega[i] - state.omega[i + 1]) * this.omega0;
      torques[i] = this.couplings[i].K * dTheta + this.couplings[i].D * dOmega;
    }
    return torques;
  }

  /**
   * Integrate 1 time step using RK4 for high-frequency torsional accuracy
   */
  step(totalTm_pu: number, Te_gen_pu: number, dt: number, state: MultiMassState): MultiMassState {
    const n = this.numMasses;

    const calcDerivs = (omega: Float64Array, theta: Float64Array) => {
      const dOmega = new Float64Array(n);
      const dTheta = new Float64Array(n);

      // Compute shaft torques for this state
      const T_shaft = new Float64Array(n - 1);
      for (let i = 0; i < n - 1; i++) {
        const dTh = theta[i] - theta[i + 1];
        const dOm = (omega[i] - omega[i + 1]) * this.omega0;
        T_shaft[i] = this.couplings[i].K * dTh + this.couplings[i].D * dOm;
      }

      for (let i = 0; i < n; i++) {
        const Tm_i = totalTm_pu * this.masses[i].Tm_fraction;
        const Te_i = (i === n - 1) ? Te_gen_pu : 0.0; // Electrical torque applies to generator

        let netTorque = Tm_i - Te_i - this.masses[i].D * (omega[i] - 1.0);

        if (i > 0) {
          netTorque -= T_shaft[i - 1]; // Pull from previous mass
        }
        if (i < n - 1) {
          netTorque += T_shaft[i]; // Push towards next mass
        }

        dOmega[i] = netTorque / (2.0 * this.masses[i].H);
        dTheta[i] = (omega[i] - 1.0) * this.omega0;
      }

      return { dOmega, dTheta, T_shaft };
    };

    // RK4 Integration
    const k1 = calcDerivs(state.omega, state.theta);

    const w_k2 = new Float64Array(n);
    const th_k2 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      w_k2[i] = state.omega[i] + 0.5 * dt * k1.dOmega[i];
      th_k2[i] = state.theta[i] + 0.5 * dt * k1.dTheta[i];
    }
    const k2 = calcDerivs(w_k2, th_k2);

    const w_k3 = new Float64Array(n);
    const th_k3 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      w_k3[i] = state.omega[i] + 0.5 * dt * k2.dOmega[i];
      th_k3[i] = state.theta[i] + 0.5 * dt * k2.dTheta[i];
    }
    const k3 = calcDerivs(w_k3, th_k3);

    const w_k4 = new Float64Array(n);
    const th_k4 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      w_k4[i] = state.omega[i] + dt * k3.dOmega[i];
      th_k4[i] = state.theta[i] + dt * k3.dTheta[i];
    }
    const k4 = calcDerivs(w_k4, th_k4);

    for (let i = 0; i < n; i++) {
      state.omega[i] += (dt / 6.0) * (k1.dOmega[i] + 2 * k2.dOmega[i] + 2 * k3.dOmega[i] + k4.dOmega[i]);
      state.theta[i] += (dt / 6.0) * (k1.dTheta[i] + 2 * k2.dTheta[i] + 2 * k3.dTheta[i] + k4.dTheta[i]);
    }

    state.torques = this.computeShaftTorques(state);
    return state;
  }

  /**
   * Calculates torsional natural frequencies [Hz] of the shaft system
   */
  calculateTorsionalModes(): number[] {
    // 3 degrees of freedom for 4 masses
    const K1 = this.couplings[0].K;
    const K2 = this.couplings[1].K;
    const K3 = this.couplings[2].K;
    const H1 = this.masses[0].H;
    const H2 = this.masses[1].H;
    const H3 = this.masses[2].H;
    const H4 = this.masses[3].H;

    const f1 = (1.0 / (2 * Math.PI)) * Math.sqrt((K3 * this.omega0 * (H3 + H4)) / (2 * H3 * H4));
    const f2 = (1.0 / (2 * Math.PI)) * Math.sqrt((K2 * this.omega0 * (H2 + H3)) / (2 * H2 * H3));
    const f3 = (1.0 / (2 * Math.PI)) * Math.sqrt((K1 * this.omega0 * (H1 + H2)) / (2 * H1 * H2));

    return [Math.round(f1 * 10) / 10, Math.round(f2 * 10) / 10, Math.round(f3 * 10) / 10];
  }
}
