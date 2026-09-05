/**
 * PSCAD Modern - Advanced Wind Turbine Aerodynamics & Hydraulic Pitch Controller
 * 
 * Complies with:
 * - IEC 61400 / NREL Standard Wind Turbine Aerodynamic Models
 * 
 * Features:
 * - 2D/3D non-linear aerodynamic conversion Cp(lambda, beta) and Ct(lambda, beta):
 *     lambda = (w_rotor * R) / v_wind
 *     1 / lambda_i = 1 / (lambda + 0.08*beta) - 0.035 / (beta^3 + 1)
 *     Cp(lambda, beta) = c1 * (c2/lambda_i - c3*beta - c4) * exp(-c5/lambda_i) + c6*lambda
 *     P_aero = 0.5 * rho * pi * R^2 * v_wind^3 * Cp(lambda, beta)
 *     T_aero = P_aero / w_rotor
 *     Thrust = 0.5 * rho * pi * R^2 * v_wind^2 * Ct(lambda, beta)
 * - Hydraulic pitch servo actuator:
 *     1st-order dynamic lag T_pitch with rate limiter (|d_beta/dt| <= 10 deg/s) and position limits [0 deg, 90 deg]
 * - Multi-Region Supervisory Turbine Controller:
 *     - Region I: Sub-cut-in standby (v_wind < v_cut_in)
 *     - Region II: Partial load MPPT (K_opt * w_r^2 tracking, beta = 0 deg)
 *     - Region III: Rated full load active pitch PI regulation (beta > 0 deg)
 *     - Region IV: Cut-out storm protection (emergency pitch feathering to 90 deg)
 */

export interface WindTurbineParams {
  ratedPowerMW: number; // Rated aerodynamic/electrical power [MW] (e.g. 5.0 MW)
  rotorRadius: number; // Rotor blade radius R [m] (e.g. 63.0 m for 5MW NREL)
  airDensity: number; // Air density rho [kg/m^3] (nominal 1.225)
  gearboxRatio: number; // Gearbox gear ratio N_gear (e.g. 97.0 for DFIG, 1.0 for PMSG direct drive)
  ratedRotorSpeedRpm: number; // Rated rotor speed [rpm] (e.g. 12.1 rpm)
  ratedWindSpeed: number; // Rated wind speed [m/s] (e.g. 11.4 m/s)
  cutInWindSpeed: number; // Cut-in wind speed [m/s] (e.g. 3.5 m/s)
  cutOutWindSpeed: number; // Cut-out wind speed [m/s] (e.g. 25.0 m/s)
  
  // Aerodynamic coefficients c1 to c6 (NREL / Heier model)
  c1: number; // Default: 0.5176
  c2: number; // Default: 116.0
  c3: number; // Default: 0.4
  c4: number; // Default: 5.0
  c5: number; // Default: 21.0
  c6: number; // Default: 0.0068

  // Pitch actuator parameters
  pitchTimeConstant: number; // Pitch servo lag T_pitch [s] (e.g. 0.25 s)
  maxPitchRateDegPerSec: number; // Max normal pitch rate [deg/s] (e.g. 10.0 deg/s)
  emergencyPitchRateDegPerSec: number; // Emergency feathering rate [deg/s] (e.g. 20.0 deg/s)
  minPitchDeg: number; // Minimum pitch angle [deg] (e.g. 0.0 deg)
  maxPitchDeg: number; // Maximum pitch angle [deg] (e.g. 90.0 deg)

  // Pitch controller PI gains
  pitchKp: number; // Pitch controller proportional gain (e.g. 50.0)
  pitchKi: number; // Pitch controller integral gain (e.g. 25.0)
}

export type TurbineOperatingRegion = 'REGION_1_PARKED' | 'REGION_2_MPPT' | 'REGION_3_PITCH' | 'REGION_4_CUTOUT';

export interface WindTurbineState {
  region: TurbineOperatingRegion;
  vWind: number; // Instantaneous wind speed [m/s]
  wRotorRpm: number; // Rotor speed in rpm
  wRotorRadSec: number; // Rotor mechanical angular speed [rad/s]
  wGenRadSec: number; // Generator shaft speed [rad/s]
  lambda: number; // Tip speed ratio lambda
  Cp: number; // Aerodynamic power coefficient Cp
  Ct: number; // Thrust coefficient Ct
  PaeroMW: number; // Aerodynamic power captured [MW]
  TaeroMNm: number; // Aerodynamic torque on low-speed shaft [MN*m]
  thrustKN: number; // Rotor aerodynamic thrust force [kN]
  pitchAngleDeg: number; // Actual blade pitch angle beta [deg]
  pitchDemandDeg: number; // Commanded blade pitch angle [deg]
  pitchRateDegPerSec: number; // Rate of pitch change [deg/s]
  mpptTorqueDemandMNm: number; // Generator electromagnetic torque reference [MN*m]
  pitchIntegState: number; // Pitch PI integrator accumulator
}

export class WindTurbineAerodynamics {
  public id: string;
  public params: WindTurbineParams;
  public state: WindTurbineState;

  // Swept area A = pi * R^2
  public sweptArea: number;
  // Optimal tip-speed ratio and Cp max
  public lambdaOpt: number = 8.1;
  public CpMax: number = 0.48;
  public Kopt: number = 0.0; // Optimal MPPT torque gain: 0.5 * rho * A * R^3 * CpMax / lambdaOpt^3

  constructor(id: string, customParams: Partial<WindTurbineParams> = {}) {
    this.id = id;
    this.params = {
      ratedPowerMW: customParams.ratedPowerMW ?? 5.0,
      rotorRadius: customParams.rotorRadius ?? 63.0,
      airDensity: customParams.airDensity ?? 1.225,
      gearboxRatio: customParams.gearboxRatio ?? 97.0,
      ratedRotorSpeedRpm: customParams.ratedRotorSpeedRpm ?? 12.1,
      ratedWindSpeed: customParams.ratedWindSpeed ?? 11.4,
      cutInWindSpeed: customParams.cutInWindSpeed ?? 3.5,
      cutOutWindSpeed: customParams.cutOutWindSpeed ?? 25.0,
      c1: customParams.c1 ?? 0.5176,
      c2: customParams.c2 ?? 116.0,
      c3: customParams.c3 ?? 0.4,
      c4: customParams.c4 ?? 5.0,
      c5: customParams.c5 ?? 21.0,
      c6: customParams.c6 ?? 0.0068,
      pitchTimeConstant: customParams.pitchTimeConstant ?? 0.25,
      maxPitchRateDegPerSec: customParams.maxPitchRateDegPerSec ?? 10.0,
      emergencyPitchRateDegPerSec: customParams.emergencyPitchRateDegPerSec ?? 20.0,
      minPitchDeg: customParams.minPitchDeg ?? 0.0,
      maxPitchDeg: customParams.maxPitchDeg ?? 90.0,
      pitchKp: customParams.pitchKp ?? 50.0,
      pitchKi: customParams.pitchKi ?? 25.0,
    };

    this.sweptArea = Math.PI * this.params.rotorRadius * this.params.rotorRadius;
    this.calculateOptimumParameters();

    this.state = {
      region: 'REGION_2_MPPT',
      vWind: 10.0,
      wRotorRpm: this.params.ratedRotorSpeedRpm * 0.8,
      wRotorRadSec: (this.params.ratedRotorSpeedRpm * 0.8 * 2 * Math.PI) / 60,
      wGenRadSec: ((this.params.ratedRotorSpeedRpm * 0.8 * 2 * Math.PI) / 60) * this.params.gearboxRatio,
      lambda: 8.0,
      Cp: 0.45,
      Ct: 0.7,
      PaeroMW: 2.5,
      TaeroMNm: 2.0,
      thrustKN: 350.0,
      pitchAngleDeg: 0.0,
      pitchDemandDeg: 0.0,
      pitchRateDegPerSec: 0.0,
      mpptTorqueDemandMNm: 2.0,
      pitchIntegState: 0.0,
    };
  }

  /**
   * Pre-calculate optimal MPPT coefficient Kopt
   */
  private calculateOptimumParameters(): void {
    let bestCp = 0;
    let bestLambda = 8.0;
    for (let lam = 4.0; lam <= 14.0; lam += 0.05) {
      const cp = this.calculateCp(lam, 0.0);
      if (cp > bestCp) {
        bestCp = cp;
        bestLambda = lam;
      }
    }
    this.CpMax = bestCp;
    this.lambdaOpt = bestLambda;

    // Kopt on low-speed rotor shaft:
    // T_opt = 0.5 * rho * pi * R^5 * (CpMax / lambdaOpt^3) * w_rotor^2
    this.Kopt =
      0.5 *
      this.params.airDensity *
      Math.PI *
      Math.pow(this.params.rotorRadius, 5) *
      (this.CpMax / Math.pow(this.lambdaOpt, 3));
  }

  /**
   * Evaluate non-linear aerodynamic power coefficient Cp(lambda, beta)
   */
  public calculateCp(lambda: number, betaDeg: number): number {
    if (lambda <= 0.01) return 0.0;
    const beta = Math.max(0.0, betaDeg);

    // 1 / lambda_i = 1 / (lambda + 0.08*beta) - 0.035 / (beta^3 + 1)
    const invLambdaI = 1.0 / (lambda + 0.08 * beta) - 0.035 / (Math.pow(beta, 3) + 1.0);
    if (invLambdaI <= 0.0) return 0.0;

    // Cp = c1 * (c2 * invLambdaI - c3*beta - c4) * exp(-c5 * invLambdaI) + c6 * lambda
    const term = this.params.c2 * invLambdaI - this.params.c3 * beta - this.params.c4;
    const cp = this.params.c1 * term * Math.exp(-this.params.c5 * invLambdaI) + this.params.c6 * lambda;
    return Math.max(0.0, Math.min(0.593, cp));
  }

  /**
   * Evaluate aerodynamic thrust coefficient Ct(lambda, beta)
   */
  public calculateCt(lambda: number, betaDeg: number): number {
    const cp = this.calculateCp(lambda, betaDeg);
    if (lambda <= 0.1) return 0.0;
    const ct = (1.33 * cp) / lambda;
    return Math.max(0.0, Math.min(1.2, ct));
  }

  /**
   * Step the wind turbine aerodynamics & supervisory pitch controller
   * @param vWind Wind speed in m/s
   * @param wRotorRadSec Low-speed rotor shaft speed in rad/s
   * @param dt Time step in seconds
   */
  public step(vWind: number, wRotorRadSec: number, dt: number = 0.0001): WindTurbineState {
    const v = Math.max(0.1, vWind);
    const wRotor = Math.max(0.01, wRotorRadSec);
    this.state.vWind = v;
    this.state.wRotorRadSec = wRotor;
    this.state.wRotorRpm = (wRotor * 60) / (2 * Math.PI);
    this.state.wGenRadSec = wRotor * this.params.gearboxRatio;

    // Rated rotor speed in rad/s
    const wRatedRotor = (this.params.ratedRotorSpeedRpm * 2 * Math.PI) / 60;

    // 1. Determine Operating Region
    if (v < this.params.cutInWindSpeed) {
      this.state.region = 'REGION_1_PARKED';
      this.state.pitchDemandDeg = 0.0;
      this.state.mpptTorqueDemandMNm = 0.0;
    } else if (v > this.params.cutOutWindSpeed) {
      this.state.region = 'REGION_4_CUTOUT';
      this.state.pitchDemandDeg = 90.0; // Emergency feathering
      this.state.mpptTorqueDemandMNm = 0.0;
    } else if (wRotor <= wRatedRotor && v <= this.params.ratedWindSpeed) {
      // Region II: Partial load MPPT
      this.state.region = 'REGION_2_MPPT';
      this.state.pitchDemandDeg = 0.0;
      const tOptNm = this.Kopt * wRotor * wRotor;
      this.state.mpptTorqueDemandMNm = tOptNm / 1e6;
      this.state.pitchIntegState = 0.0;
    } else {
      // Region III: Full load rated speed pitch regulation
      this.state.region = 'REGION_3_PITCH';
      const speedError = (wRotor - wRatedRotor) / wRatedRotor;
      const windExcess = Math.max(0.0, (v - this.params.ratedWindSpeed) / this.params.ratedWindSpeed);
      const errorSignal = speedError > 0 ? speedError : windExcess;

      this.state.pitchIntegState += this.params.pitchKi * errorSignal * dt;
      this.state.pitchIntegState = Math.max(0.0, Math.min(this.params.maxPitchDeg, this.state.pitchIntegState));

      const pitchPI = this.params.pitchKp * errorSignal + this.state.pitchIntegState;
      this.state.pitchDemandDeg = Math.max(this.params.minPitchDeg, Math.min(this.params.maxPitchDeg, pitchPI));
      
      this.state.mpptTorqueDemandMNm = this.params.ratedPowerMW / Math.max(0.1, wRotor);
    }

    // 2. Hydraulic Pitch Servo Actuator Dynamics with Slew Rate Limiter
    const isEmergency = this.state.region === 'REGION_4_CUTOUT';
    const maxRate = isEmergency ? this.params.emergencyPitchRateDegPerSec : this.params.maxPitchRateDegPerSec;

    const pitchError = (this.state.pitchDemandDeg - this.state.pitchAngleDeg) / Math.max(1e-3, this.params.pitchTimeConstant);
    const clampedRate = Math.max(-maxRate, Math.min(maxRate, pitchError));
    this.state.pitchRateDegPerSec = clampedRate;

    let newPitch = this.state.pitchAngleDeg + clampedRate * dt;
    newPitch = Math.max(this.params.minPitchDeg, Math.min(this.params.maxPitchDeg, newPitch));
    this.state.pitchAngleDeg = newPitch;

    // 3. Tip-Speed Ratio (lambda = w_rotor * R / v_wind)
    this.state.lambda = (wRotor * this.params.rotorRadius) / v;

    // 4. Aerodynamic Power & Thrust Coefficients
    this.state.Cp = this.calculateCp(this.state.lambda, this.state.pitchAngleDeg);
    this.state.Ct = this.calculateCt(this.state.lambda, this.state.pitchAngleDeg);

    // 5. Aerodynamic Power Captured: P_aero = 0.5 * rho * A * v^3 * Cp [Watts]
    const pAeroWatts = 0.5 * this.params.airDensity * this.sweptArea * Math.pow(v, 3) * this.state.Cp;
    this.state.PaeroMW = pAeroWatts / 1e6;

    // 6. Aerodynamic Torque on Low-Speed Rotor Shaft: T_aero = P_aero / w_rotor [N*m]
    const tAeroNm = pAeroWatts / wRotor;
    this.state.TaeroMNm = tAeroNm / 1e6;

    // 7. Aerodynamic Thrust Force: F_thrust = 0.5 * rho * A * v^2 * Ct [N]
    const thrustN = 0.5 * this.params.airDensity * this.sweptArea * Math.pow(v, 2) * this.state.Ct;
    this.state.thrustKN = thrustN / 1e3;

    return this.state;
  }
}
