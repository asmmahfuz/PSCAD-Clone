/**
 * PSCAD CLONE - EMTDC Companion Model Theory & Numerical Discretization Engine
 * Phase 21 - Step 21.1: Multi-Tab Component Parameter Dialogs & Theory Models
 */

import { COMPONENT_TYPES } from '../../constants';
import type { CircuitComponentData } from '../../types';

export interface CompanionEquation {
  label: string;
  formula: string;
  explanation: string;
}

export interface ParameterRange {
  param: string;
  name: string;
  range: string;
  typical: string;
  unit: string;
  notes: string;
}

export interface InternalProbeConfig {
  id: string;
  name: string;
  unit: string;
  description: string;
  defaultSignalName: string;
}

export interface CompanionModelTheory {
  title: string;
  category: string;
  companionType: 'Norton' | 'Thevenin' | 'CoupledMatrix' | 'TravelingWave' | 'StateSpace' | 'NonLinear' | 'CSMF';
  discretizationMethod: string;
  description: string;
  geqFormula: string;
  ihistFormula: string;
  calculatedGeq?: number;
  calculatedGeqUnit?: string;
  equations: CompanionEquation[];
  typicalRanges: ParameterRange[];
  availableProbes: InternalProbeConfig[];
}

/**
 * Computes Dommel companion model formulas and discretization data for a given circuit component.
 * @param comp Component data
 * @param dtSec Time step in seconds (default 50 microseconds)
 */
export function getCompanionModelTheory(comp: CircuitComponentData, dtSec: number = 50e-6): CompanionModelTheory {
  const p = comp.params || {};

  switch (comp.type) {
    case COMPONENT_TYPES.RESISTOR: {
      const R = Math.max(1e-6, Number(p.resistance ?? 10));
      const Geq = 1 / R;
      return {
        title: 'Ideal Linear Resistor',
        category: 'Passive RLC',
        companionType: 'Norton',
        discretizationMethod: 'Instantaneous Algebraic (Ohmic)',
        description:
          'Resistive branches do not store energy and possess zero memory. The companion model consists solely of an equivalent conductance Geq with zero history current source.',
        geqFormula: 'G_{eq} = \\frac{1}{R}',
        ihistFormula: 'I_{hist}(t) = 0',
        calculatedGeq: Geq,
        calculatedGeqUnit: 'S (Ω⁻¹)',
        equations: [
          {
            label: "Ohm's Law",
            formula: 'i(t) = \\frac{v(t)}{R} = G_{eq} \\cdot v(t)',
            explanation: 'Instantaneous voltage-current proportionality in branch conductance matrix.',
          },
        ],
        typicalRanges: [
          { param: 'resistance', name: 'Resistance', range: '1 mΩ – 1 MΩ', typical: '10 Ω', unit: 'Ω', notes: 'Zero resistance causes singular admittance matrix.' },
        ],
        availableProbes: [
          { id: 'probe_V', name: 'Branch Voltage', unit: 'V', description: 'Voltage drop across resistor', defaultSignalName: `${comp.name}_V` },
          { id: 'probe_I', name: 'Branch Current', unit: 'A', description: 'Current flowing through resistor', defaultSignalName: `${comp.name}_I` },
          { id: 'probe_P', name: 'Power Dissipation', unit: 'W', description: 'Instantaneous Joule heating loss P = I²R', defaultSignalName: `${comp.name}_P` },
        ],
      };
    }

    case COMPONENT_TYPES.INDUCTOR: {
      const L = Math.max(1e-9, Number(p.inductance ?? 0.05));
      const Geq = dtSec / (2 * L);
      return {
        title: 'Lumped Linear Inductor',
        category: 'Passive RLC',
        companionType: 'Norton',
        discretizationMethod: 'Dommel Trapezoidal Integration',
        description:
          'In EMTDC, magnetic energy storage v(t) = L di/dt is discretized using the trapezoidal rule, yielding a fixed Norton equivalent conductance Geq in parallel with a history current source Ihist updated each time step.',
        geqFormula: 'G_{eq} = \\frac{\\Delta t}{2L}',
        ihistFormula: 'I_{hist}(t) = i(t - \\Delta t) + \\frac{\\Delta t}{2L} v(t - \\Delta t)',
        calculatedGeq: Geq,
        calculatedGeqUnit: 'S (Ω⁻¹)',
        equations: [
          {
            label: 'Faraday Differential Law',
            formula: 'v(t) = L \\frac{di(t)}{dt}',
            explanation: 'Time-domain differential relationship for magnetic flux linkage change.',
          },
          {
            label: 'Trapezoidal Discretization',
            formula: 'i(t) - i(t-\\Delta t) = \\frac{\\Delta t}{2L} \\left[ v(t) + v(t-\\Delta t) \\right]',
            explanation: 'Numerical integration over discrete time step interval [t-Δt, t].',
          },
          {
            label: 'Norton Companion Model',
            formula: 'i(t) = G_{eq} v(t) + I_{hist}(t)',
            explanation: 'Parallel admittance branch stamped into global conductance matrix [G].',
          },
        ],
        typicalRanges: [
          { param: 'inductance', name: 'Inductance', range: '1 μH – 10 H', typical: '50 mH', unit: 'H', notes: 'Higher inductance yields smaller companion conductance Geq.' },
        ],
        availableProbes: [
          { id: 'probe_V', name: 'Inductor Voltage', unit: 'V', description: 'Induced terminal voltage v(t)', defaultSignalName: `${comp.name}_V` },
          { id: 'probe_I', name: 'Inductor Current', unit: 'A', description: 'Branch current flowing through L', defaultSignalName: `${comp.name}_I` },
          { id: 'probe_Flux', name: 'Flux Linkage λ', unit: 'Wb-t', description: 'Magnetic flux linkage λ = L * i', defaultSignalName: `${comp.name}_Flux` },
          { id: 'probe_Energy', name: 'Magnetic Energy', unit: 'J', description: 'Stored magnetic energy W = 0.5 * L * i²', defaultSignalName: `${comp.name}_W` },
        ],
      };
    }

    case COMPONENT_TYPES.CAPACITOR: {
      const C = Math.max(1e-12, Number(p.capacitance ?? 10e-6));
      const Geq = (2 * C) / dtSec;
      return {
        title: 'Lumped Linear Capacitor',
        category: 'Passive RLC',
        companionType: 'Norton',
        discretizationMethod: 'Dommel Trapezoidal Integration',
        description:
          'Electrostatic charge storage i(t) = C dv/dt is integrated using trapezoidal discretization, forming an equivalent Norton conductance Geq = 2C/Δt in parallel with a history current source reflecting prior terminal voltage and current.',
        geqFormula: 'G_{eq} = \\frac{2C}{\\Delta t}',
        ihistFormula: 'I_{hist}(t) = -i(t - \\Delta t) - \\frac{2C}{\\Delta t} v(t - \\Delta t)',
        calculatedGeq: Geq,
        calculatedGeqUnit: 'S (Ω⁻¹)',
        equations: [
          {
            label: 'Capacitive Current Law',
            formula: 'i(t) = C \\frac{dv(t)}{dt}',
            explanation: 'Constitutive differential equation for electrostatic charge accumulation.',
          },
          {
            label: 'Trapezoidal Integration',
            formula: 'v(t) - v(t-\\Delta t) = \\frac{\\Delta t}{2C} \\left[ i(t) + i(t-\\Delta t) \\right]',
            explanation: 'Discretized voltage increment over simulation time step Δt.',
          },
          {
            label: 'Norton Companion Model',
            formula: 'i(t) = G_{eq} v(t) + I_{hist}(t)',
            explanation: 'Injected history current and equivalent conductance stamped into node equations.',
          },
        ],
        typicalRanges: [
          { param: 'capacitance', name: 'Capacitance', range: '10 pF – 100 mF', typical: '10 μF', unit: 'F', notes: 'Larger capacitance creates larger companion conductance Geq.' },
        ],
        availableProbes: [
          { id: 'probe_V', name: 'Capacitor Voltage', unit: 'V', description: 'Instantaneous terminal voltage v(t)', defaultSignalName: `${comp.name}_V` },
          { id: 'probe_I', name: 'Capacitor Current', unit: 'A', description: 'Displacement current i(t)', defaultSignalName: `${comp.name}_I` },
          { id: 'probe_Q', name: 'Charge Q', unit: 'C', description: 'Accumulated dielectric charge Q = C * v', defaultSignalName: `${comp.name}_Q` },
          { id: 'probe_Energy', name: 'Electrostatic Energy', unit: 'J', description: 'Stored electrostatic energy W = 0.5 * C * v²', defaultSignalName: `${comp.name}_W` },
        ],
      };
    }

    case COMPONENT_TYPES.TRANSFORMER_1PH:
    case COMPONENT_TYPES.TRANSFORMER_3PH:
    case COMPONENT_TYPES.UMEC_TRANSFORMER_3PH: {
      const is3Ph = comp.type !== COMPONENT_TYPES.TRANSFORMER_1PH;
      const mva = Number(p.MVA_rating ?? (is3Ph ? 100 : 25));
      const v1 = Number(p.V1_nom ?? (is3Ph ? 230000 : 13800));
      const v2 = Number(p.V2_nom ?? (is3Ph ? 69000 : 2400));
      const turnsRatio = v1 / Math.max(1, v2);

      return {
        title: is3Ph ? '3-Phase Power Transformer' : 'Single-Phase 2-Winding Transformer',
        category: 'Transformers & Lines',
        companionType: 'CoupledMatrix',
        discretizationMethod: 'Coupled Inductance Matrix Discretization',
        description:
          'Modeled via coupled magnetic flux equations inverted into an inverse inductance matrix [L]⁻¹. Discretization produces a multi-port Norton conductance matrix [Geq] linking primary and secondary windings with internal saturation modeling.',
        geqFormula: '[G_{eq}] = \\frac{\\Delta t}{2} [L]^{-1}',
        ihistFormula: '\\mathbf{I}_{hist}(t) = \\mathbf{i}(t-\\Delta t) + [G_{eq}] \\mathbf{v}(t-\\Delta t)',
        equations: [
          {
            label: 'Coupled Flux Equations',
            formula: '\\begin{bmatrix} v_1(t) \\\\ v_2(t) \\end{bmatrix} = \\begin{bmatrix} R_1 & 0 \\\\ 0 & R_2 \\end{bmatrix} \\begin{bmatrix} i_1 \\\\ i_2 \\end{bmatrix} + \\frac{d}{dt}\\begin{bmatrix} L_{11} & M \\\\ M & L_{22} \\end{bmatrix} \\begin{bmatrix} i_1 \\\\ i_2 \\end{bmatrix}',
            explanation: 'Multi-port coupled electromagnetic differential system.',
          },
          {
            label: 'Turns Ratio & Magnetizing Reactance',
            formula: 'a = \\frac{N_1}{N_2} = \\frac{V_{1,nom}}{V_{2,nom}}, \\quad L_m = \\frac{\\lambda_m}{i_m}',
            explanation: `Nominal turns ratio a = ${turnsRatio.toFixed(3)}. Non-linear iron core saturation is accounted for via piecewise knee-point curve.`,
          },
        ],
        typicalRanges: [
          { param: 'MVA_rating', name: 'Rated Capacity', range: '0.1 MVA – 1200 MVA', typical: `${mva} MVA`, unit: 'MVA', notes: 'Basis for per-unit leakage reactance.' },
          { param: 'V1_nom', name: 'Primary Voltage', range: '1 kV – 1100 kV', typical: `${(v1 / 1000).toFixed(1)} kV`, unit: 'V', notes: 'Nominal RMS line-to-line voltage.' },
          { param: 'V2_nom', name: 'Secondary Voltage', range: '120 V – 500 kV', typical: `${(v2 / 1000).toFixed(1)} kV`, unit: 'V', notes: 'Secondary nominal voltage rating.' },
          { param: 'kneeFluxPu', name: 'Knee Flux Point', range: '1.10 – 1.35 pu', typical: '1.20 pu', unit: 'pu', notes: 'Saturation inflection point on flux curve.' },
        ],
        availableProbes: [
          { id: 'probe_Vpri', name: 'Primary Voltage V1', unit: 'V', description: 'Primary winding terminal voltage', defaultSignalName: `${comp.name}_Vpri` },
          { id: 'probe_Vsec', name: 'Secondary Voltage V2', unit: 'V', description: 'Secondary winding terminal voltage', defaultSignalName: `${comp.name}_Vsec` },
          { id: 'probe_Ipri', name: 'Primary Current I1', unit: 'A', description: 'Primary winding line current', defaultSignalName: `${comp.name}_Ipri` },
          { id: 'probe_Isec', name: 'Secondary Current I2', unit: 'A', description: 'Secondary winding line current', defaultSignalName: `${comp.name}_Isec` },
          { id: 'probe_Isat', name: 'Saturation Magnetizing Current', unit: 'A', description: 'Core saturation current component', defaultSignalName: `${comp.name}_Isat` },
          { id: 'probe_P', name: 'Transferred Real Power P', unit: 'MW', description: 'Real power through primary terminals', defaultSignalName: `${comp.name}_P` },
          { id: 'probe_Q', name: 'Reactive Power Q', unit: 'MVAR', description: 'Magnetizing & leakage reactive power', defaultSignalName: `${comp.name}_Q` },
        ],
      };
    }

    case COMPONENT_TYPES.PI_LINE:
    case COMPONENT_TYPES.BERGERON_LINE_1PH:
    case COMPONENT_TYPES.BERGERON_LINE_3PH:
    case COMPONENT_TYPES.FD_PHASE_LINE: {
      const lenKm = Number(p.lengthKm ?? 50);
      const isBergeron = comp.type !== COMPONENT_TYPES.PI_LINE;

      return {
        title: isBergeron ? 'Bergeron Traveling Wave Transmission Line' : 'Nominal π-Section Line Model',
        category: 'Transformers & Lines',
        companionType: isBergeron ? 'TravelingWave' : 'Norton',
        discretizationMethod: isBergeron ? "Method of Characteristics (d'Alembert Traveling Wave)" : 'Lumped π-Network Conductance',
        description: isBergeron
          ? "EMTDC Bergeron model solves lossless wave propagation along distributed conductors with lumped resistance (R/4, R/2, R/4). Terminal conditions at sending end (k) and receiving end (m) are coupled via pure time delay τ = length / ν."
          : 'Lumped parameter π-section representing distributed series R-L with shunt line-charging capacitive admittance split equally at both terminals.',
        geqFormula: isBergeron ? 'G_{eq} = \\frac{1}{Z_c + R/4}' : 'G_{eq} = \\frac{\\Delta t}{2L} + \\frac{2(C/2)}{\\Delta t}',
        ihistFormula: isBergeron
          ? 'I_{hk}(t - \\tau) = -\\frac{v_m(t-\\tau)}{Z_c} - i_m(t-\\tau)'
          : 'I_{hist}(t) = I_{hist,L}(t) + I_{hist,C}(t)',
        equations: [
          {
            label: 'Characteristic Impedance & Wave Speed',
            formula: 'Z_c = \\sqrt{\\frac{L}{C}}, \\quad \\nu = \\frac{1}{\\sqrt{LC}} \\approx 300\\,000\\text{ km/s}',
            explanation: 'Natural wave surge impedance and electromagnetic propagation velocity along speed of light in dielectric.',
          },
          {
            label: 'Wave Travel Transit Delay',
            formula: '\\tau = \\frac{d}{\\nu} = d \\sqrt{L C}',
            explanation: `For d = ${lenKm} km line, propagation delay τ determines buffer window depth for ring buffers.`,
          },
        ],
        typicalRanges: [
          { param: 'lengthKm', name: 'Line Length', range: '1 km – 1000 km', typical: `${lenKm} km`, unit: 'km', notes: 'Short lines (<15 km) should use π-section or small Δt to avoid τ < Δt.' },
          { param: 'Zc_aerial', name: 'Surge Impedance Zc', range: '200 Ω – 450 Ω', typical: '350 Ω', unit: 'Ω', notes: 'Aerial positive-sequence surge impedance.' },
          { param: 'R_per_km', name: 'Conductor Resistance', range: '0.01 – 0.5 Ω/km', typical: '0.032 Ω/km', unit: 'Ω/km', notes: 'Series Joule ohmic loss per kilometer.' },
        ],
        availableProbes: [
          { id: 'probe_Vsend', name: 'Sending End Voltage Vk', unit: 'kV', description: 'Terminal voltage at sending bus', defaultSignalName: `${comp.name}_Vk` },
          { id: 'probe_Vrec', name: 'Receiving End Voltage Vm', unit: 'kV', description: 'Terminal voltage at receiving bus', defaultSignalName: `${comp.name}_Vm` },
          { id: 'probe_Isend', name: 'Sending Current Ik', unit: 'A', description: 'Injected line current at sending port', defaultSignalName: `${comp.name}_Ik` },
          { id: 'probe_Irec', name: 'Receiving Current Im', unit: 'A', description: 'Received line current at far port', defaultSignalName: `${comp.name}_Im` },
          { id: 'probe_Psend', name: 'Sending Power P', unit: 'MW', description: 'Active power injected into line', defaultSignalName: `${comp.name}_Psend` },
          { id: 'probe_Losses', name: 'Ohmic Line Losses', unit: 'MW', description: 'Total Joule heating losses along line', defaultSignalName: `${comp.name}_Ploss` },
        ],
      };
    }

    case COMPONENT_TYPES.SYNC_GENERATOR:
    case COMPONENT_TYPES.SYNC_MACHINE_DQ: {
      return {
        title: 'Synchronous Machine (Park d-q-0 Reference Frame)',
        category: 'Machines & Drives',
        companionType: 'StateSpace',
        discretizationMethod: 'Phase-Domain Interfaced Norton Companion (V-I Formulation)',
        description:
          'Stator and rotor flux linkages are formulated in Park d-q reference frame aligned with rotor angle θ. Solved in phase coordinates via subtransient inductance matrix [L"] and internal voltage source behind subtransient reactance.',
        geqFormula: 'G_{eq} = \\frac{\\Delta t}{2 L_{d}^{\\prime\\prime}}',
        ihistFormula: 'I_{hist}(t) = \\mathbf{i}_{stator}(t-\\Delta t) + \\mathbf{G}_{eq} \\mathbf{e}_{sub}^{\\prime\\prime}(t)',
        equations: [
          {
            label: 'Park Transformation',
            formula: '\\mathbf{v}_{dq0} = \\mathbf{P}(\\theta) \\mathbf{v}_{abc}, \\quad \\theta = \\int \\omega(t) dt + \\theta_0',
            explanation: 'Projects time-varying stator windings into orthogonal rotating axes aligned with rotor magnetic pole.',
          },
          {
            label: 'Electromechanical Swing Equation',
            formula: '2H \\frac{d\\omega}{dt} = T_m - T_e - D(\\omega - 1.0)',
            explanation: 'Rotor inertia H governs frequency response against mechanical and electrical torque imbalance.',
          },
        ],
        typicalRanges: [
          { param: 'H', name: 'Inertia Constant H', range: '1.0 s – 8.0 s', typical: '3.5 s', unit: 's', notes: 'Stored kinetic energy at synchronous speed per rated MVA.' },
          { param: 'Xd', name: 'Xd Synchronous Reactance', range: '1.2 – 2.5 pu', typical: '1.8 pu', unit: 'pu', notes: 'Steady-state d-axis reactance.' },
          { param: 'Xd_pp', name: "Xd'' Subtransient Reactance", range: '0.12 – 0.28 pu', typical: '0.18 pu', unit: 'pu', notes: 'Determines initial subtransient fault current.' },
        ],
        availableProbes: [
          { id: 'probe_Speed', name: 'Rotor Speed ω', unit: 'pu', description: 'Per-unit rotational speed of generator shaft', defaultSignalName: `${comp.name}_Speed` },
          { id: 'probe_Angle', name: 'Rotor Angle δ', unit: 'deg', description: 'Rotor load angle relative to reference bus', defaultSignalName: `${comp.name}_Delta` },
          { id: 'probe_Te', name: 'Electrical Torque Te', unit: 'pu', description: 'Electromagnetic counter-torque on rotor', defaultSignalName: `${comp.name}_Te` },
          { id: 'probe_P', name: 'Active Power P', unit: 'MW', description: 'Real electrical power delivered to grid', defaultSignalName: `${comp.name}_P` },
          { id: 'probe_Q', name: 'Reactive Power Q', unit: 'MVAR', description: 'Reactive power delivered/absorbed', defaultSignalName: `${comp.name}_Q` },
          { id: 'probe_Efd', name: 'Field Voltage Efd', unit: 'V', description: 'DC excitation field voltage from AVR', defaultSignalName: `${comp.name}_Efd` },
        ],
      };
    }

    case COMPONENT_TYPES.BREAKER_1PH:
    case COMPONENT_TYPES.BREAKER_3PH:
    case COMPONENT_TYPES.TIMED_SWITCH: {
      return {
        title: 'Circuit Breaker / Interrupter Switch',
        category: 'Switches & Breakers',
        companionType: 'NonLinear',
        discretizationMethod: 'Variable Branch Conductance with Chatter Detection (CDA)',
        description:
          'Represented as a variable resistance branch: Ron (closed contact, typically 1 mΩ) or Roff (open contact, typically 1 MΩ). Switching operations trigger Critical Damping Adjustment (CDA) in EMTDC to suppress trapezoidal numerical chatter.',
        geqFormula: 'G_{eq} = \\frac{1}{R_{contact}}, \\quad R_{contact} \\in \\{R_{on}, R_{off}\\}',
        ihistFormula: 'I_{hist}(t) = 0',
        equations: [
          {
            label: 'Contact Branch Characteristic',
            formula: 'i(t) = \\frac{v(t)}{R_{on}} \\quad \\text{(Closed)}, \\qquad i(t) = \\frac{v(t)}{R_{off}} \\quad \\text{(Open)}',
            explanation: 'Matrix inversion is avoided via Sherman-Morrison rank-1 update during switching.',
          },
          {
            label: 'Current Zero Arc Extinction',
            formula: 'i(t) \\cdot i(t - \\Delta t) \\le 0 \\implies \\text{Interrupt at Current Zero}',
            explanation: 'AC breaker contacts interrupt precisely when sinusoidal current crosses zero to extinguish the plasma arc.',
          },
        ],
        typicalRanges: [
          { param: 'Ron', name: 'Closed Resistance Ron', range: '0.1 mΩ – 10 mΩ', typical: '1 mΩ', unit: 'Ω', notes: 'Keep small to minimize contact insertion losses.' },
          { param: 'Roff', name: 'Open Resistance Roff', range: '100 kΩ – 100 MΩ', typical: '1 MΩ', unit: 'Ω', notes: 'Finite open resistance maintains matrix conditioning.' },
          { param: 'openTime', name: 'Trip Time', range: '0.0 s – 10.0 s', typical: '0.10 s', unit: 's', notes: 'Scheduled opening instant for timed test sequence.' },
        ],
        availableProbes: [
          { id: 'probe_State', name: 'Mechanical State', unit: 'bin', description: 'Breaker status (1=Closed, 0=Open)', defaultSignalName: `${comp.name}_State` },
          { id: 'probe_Icontact', name: 'Contact Current', unit: 'A', description: 'Current traversing breaker poles', defaultSignalName: `${comp.name}_I` },
          { id: 'probe_Vtrv', name: 'Transient Recovery Voltage', unit: 'kV', description: 'Voltage across open contacts (TRV)', defaultSignalName: `${comp.name}_TRV` },
        ],
      };
    }

    default: {
      return {
        title: comp.name || comp.type,
        category: 'General Component',
        companionType: 'Norton',
        discretizationMethod: 'Standard EMTDC Nodal Admittance Stamp',
        description:
          'Component parameters are stamped into the system conductance matrix [G] and updated dynamically at each simulation time step.',
        geqFormula: 'G_{eq} = f(\\Delta t, \\text{params})',
        ihistFormula: 'I_{hist}(t) = f(v(t-\\Delta t), i(t-\\Delta t))',
        equations: [
          {
            label: 'Nodal Voltage Equation',
            formula: '[G] \\mathbf{v}(t) = \\mathbf{i}_{source}(t) - \\mathbf{I}_{hist}(t)',
            explanation: 'Solved via LU / Cholesky factorization in EMTDC solver core.',
          },
        ],
        typicalRanges: [],
        availableProbes: [
          { id: 'probe_V', name: 'Terminal Voltage', unit: 'V', description: 'Instantaneous terminal voltage', defaultSignalName: `${comp.name}_V` },
          { id: 'probe_I', name: 'Terminal Current', unit: 'A', description: 'Instantaneous terminal current', defaultSignalName: `${comp.name}_I` },
        ],
      };
    }
  }
}
