/**
 * PSCAD CLONE - Default Component Parameters Repository
 * Ensures every placed or instantiated component is seeded with complete, physically realistic parameters.
 */

import { COMPONENT_TYPES } from '../constants';

export function getDefaultComponentParams(type: string): Record<string, any> {
  switch (type) {
    // 1. Sources
    case COMPONENT_TYPES.AC_SOURCE_1PH:
      return { voltage: 120, freq: 60, phaseDeg: 0, internalRs: 0.1, rampTime: 0.01 };
    case COMPONENT_TYPES.AC_SOURCE_3PH:
      return { voltage: 230000, freq: 60, phaseDeg: 0, internalRs: 0.1, rampTime: 0.015 };
    case COMPONENT_TYPES.DC_SOURCE:
      return { voltage: 100, internalRs: 0.01 };

    // 2. Passives
    case COMPONENT_TYPES.RESISTOR:
      return { resistance: 10 };
    case COMPONENT_TYPES.INDUCTOR:
      return { inductance: 0.05 };
    case COMPONENT_TYPES.CAPACITOR:
      return { capacitance: 10e-6 };
    case COMPONENT_TYPES.SERIES_RLC:
      return { resistance: 5, inductance: 0.02, capacitance: 50e-6 };
    case COMPONENT_TYPES.GROUND:
      return {};
    case COMPONENT_TYPES.SURGE_ARRESTER:
      return { V_ref: 250000, I_ref: 1000, alpha1: 5.0, alpha2: 30.0, alpha3: 15.0, energyRatingKJ: 500 };

    // 3. Switches & Faults
    case COMPONENT_TYPES.BREAKER_1PH:
    case COMPONENT_TYPES.BREAKER_3PH:
      return { initClosed: true, openTime: 0.15, closeTime: 0.35, Ron: 0.001, Roff: 1000000 };
    case COMPONENT_TYPES.TIMED_SWITCH:
      return { initClosed: true, openTime: 0.1, closeTime: 0.2, Ron: 0.001, Roff: 1000000 };
    case COMPONENT_TYPES.FAULT_BLOCK:
      return { faultType: '3PH', startTime: 0.1, duration: 0.05, faultResistance: 0.01 };

    // 4. Transformers & Lines
    case COMPONENT_TYPES.TRANSFORMER_1PH:
      return {
        V1_nom: 13800,
        V2_nom: 2400,
        MVA_rating: 25,
        enableSaturation: false,
        kneeFluxPu: 1.2,
      };
    case COMPONENT_TYPES.TRANSFORMER_3PH:
    case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH:
    case COMPONENT_TYPES.OLTC_TRANSFORMER_3PH:
      return {
        V1_nom: 230000,
        V2_nom: 69000,
        MVA_rating: 100,
        primaryConn: 'Yg',
        secondaryConn: 'Delta',
        coreType: '3limb',
        enableSaturation: false,
        kneeFluxPu: 1.2,
      };
    case COMPONENT_TYPES.PI_LINE:
      return { lengthKm: 100, R_per_km: 0.03, L_per_km: 0.001, C_per_km: 0.012e-6 };
    case COMPONENT_TYPES.BERGERON_LINE_1PH:
    case COMPONENT_TYPES.BERGERON_LINE_3PH:
    case COMPONENT_TYPES.FD_PHASE_LINE:
      return {
        lengthKm: 50,
        v_aerial: 295000,
        Zc_aerial: 350,
        R_per_km: 0.032,
        Zc_ground: 550,
        v_ground: 210000,
      };

    // 5. Machines & Drives
    case COMPONENT_TYPES.SYNC_GENERATOR:
    case COMPONENT_TYPES.SYNC_MACHINE_DQ:
      return {
        Xd: 1.8,
        Xq: 1.6,
        Xd_prime: 0.3,
        Xq_prime: 0.55,
        Xd_pp: 0.18,
        Xq_pp: 0.2,
        Td0_prime: 6.0,
        Td0_pp: 0.04,
        H: 3.5,
        D: 0.0,
        AVR_gain: 50,
        V_nom: 13800,
        MVA_rating: 100,
      };
    case COMPONENT_TYPES.MULTI_MASS_SHAFT:
      return {
        H_hp: 0.8,
        H_ip: 1.2,
        H_lp: 2.5,
        H_gen: 3.5,
        K_hp_ip: 25.0,
        K_ip_lp: 35.0,
        K_lp_gen: 45.0,
      };

    // 6. Power Electronics & FACTS
    case COMPONENT_TYPES.MMC_CONVERTER_3PH:
      return { numSubmodules: 20, Vdc_nom: 400000, C_submodule: 0.005, L_arm: 0.05, R_arm: 0.5 };
    case COMPONENT_TYPES.STATCOM:
      return { V_ac_nom: 230000, Q_rating_MVAR: 100, Cdc_F: 0.001, Vdc_nom: 50000 };
    case COMPONENT_TYPES.SVC:
      return { V_ac_nom: 230000, Q_rating_MVAR: 100, num_tsc_banks: 3, L_tcr: 0.05, C_tsc: 10e-6 };

    // 7. Control Blocks (CSMF)
    case COMPONENT_TYPES.CSMF_CONSTANT:
      return { value: 1.0 };
    case COMPONENT_TYPES.CSMF_GAIN:
      return { gain: 1.0, offset: 0.0 };
    case COMPONENT_TYPES.CSMF_PID:
      return { pidKp: 1.0, pidKi: 10.0, pidKd: 0.05, pidTf: 0.01, pidMin: -10.0, pidMax: 10.0 };
    case COMPONENT_TYPES.CSMF_INTEGRATOR:
      return { gain: 1.0, limitMin: -100.0, limitMax: 100.0 };
    case COMPONENT_TYPES.CSMF_MATH_FUNC:
      return { mathOp: 'sin' };
    case COMPONENT_TYPES.CSMF_LOGIC_GATE:
      return { logicOp: 'AND' };

    // 8. Runtime Controls & Meters
    case COMPONENT_TYPES.RUNTIME_SLIDER:
      return { minValue: 0, maxValue: 100, value: 50, step: 1, label: 'Control Slider', unitLabel: '%' };
    case COMPONENT_TYPES.RUNTIME_DIAL:
      return { minValue: 0, maxValue: 360, value: 0, step: 5, label: 'Phase Dial', unitLabel: '°' };
    case COMPONENT_TYPES.RUNTIME_BUTTON:
      return { label: 'Trigger', mode: 'momentary', buttonState: false };
    case COMPONENT_TYPES.RUNTIME_SWITCH:
      return { label: 'Main Breaker', switchState: true };
    case COMPONENT_TYPES.RUNTIME_GAUGE:
      return { gaugeMin: 0, gaugeMax: 300, value: 0, label: 'RMS Voltage', unitLabel: 'kV' };
    case COMPONENT_TYPES.RUNTIME_DIGITAL_DISPLAY:
      return { label: 'Bus Telemetry', displayFormat: 'RMS' };

    default:
      return {};
  }
}
