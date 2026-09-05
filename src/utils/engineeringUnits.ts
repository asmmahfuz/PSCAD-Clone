/**
 * PSCAD CLONE - Engineering Unit Converters & Form Field Validation Engine
 * Phase 21 - Step 21.2: Multi-Tab Component Parameter Dialogs & Units Engine
 */

export type EngineeringUnitCategory =
  | 'resistance'
  | 'inductance'
  | 'capacitance'
  | 'voltage'
  | 'current'
  | 'power'
  | 'apparent_power'
  | 'reactive_power'
  | 'frequency'
  | 'time'
  | 'resistance_per_km'
  | 'inductance_per_km'
  | 'capacitance_per_km'
  | 'angle'
  | 'none';

export interface EngineeringUnitOption {
  label: string;
  symbol: string;
  multiplier: number; // Multiplier to convert displayed value to stored base value
  baseUnit: string;
}

export interface ParseResult {
  success: boolean;
  value: number; // Stored base value in SI / component standard units
  displayValue?: number; // Value in active unit
  matchedUnit?: string;
  unitMultiplier: number;
  errorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  severity: 'none' | 'warning' | 'error';
  message?: string;
}

// ============================================================================
// UNIT DEFINITIONS BY CATEGORY
// ============================================================================

export const ENGINEERING_UNITS: Record<EngineeringUnitCategory, EngineeringUnitOption[]> = {
  resistance: [
    { label: 'mΩ (Milliohm)', symbol: 'mΩ', multiplier: 1e-3, baseUnit: 'Ω' },
    { label: 'Ω (Ohm)', symbol: 'Ω', multiplier: 1, baseUnit: 'Ω' },
    { label: 'kΩ (Kilohm)', symbol: 'kΩ', multiplier: 1e3, baseUnit: 'Ω' },
    { label: 'MΩ (Megaohm)', symbol: 'MΩ', multiplier: 1e6, baseUnit: 'Ω' },
  ],
  inductance: [
    { label: 'µH (Microhenry)', symbol: 'µH', multiplier: 1e-6, baseUnit: 'H' },
    { label: 'mH (Millihenry)', symbol: 'mH', multiplier: 1e-3, baseUnit: 'H' },
    { label: 'H (Henry)', symbol: 'H', multiplier: 1, baseUnit: 'H' },
  ],
  capacitance: [
    { label: 'pF (Picofarad)', symbol: 'pF', multiplier: 1e-12, baseUnit: 'F' },
    { label: 'nF (Nanofarad)', symbol: 'nF', multiplier: 1e-9, baseUnit: 'F' },
    { label: 'µF (Microfarad)', symbol: 'µF', multiplier: 1e-6, baseUnit: 'F' },
    { label: 'mF (Millifarad)', symbol: 'mF', multiplier: 1e-3, baseUnit: 'F' },
    { label: 'F (Farad)', symbol: 'F', multiplier: 1, baseUnit: 'F' },
  ],
  voltage: [
    { label: 'mV (Millivolt)', symbol: 'mV', multiplier: 1e-3, baseUnit: 'V' },
    { label: 'V (Volt)', symbol: 'V', multiplier: 1, baseUnit: 'V' },
    { label: 'kV (Kilovolt)', symbol: 'kV', multiplier: 1e3, baseUnit: 'V' },
    { label: 'MV (Megavolt)', symbol: 'MV', multiplier: 1e6, baseUnit: 'V' },
  ],
  current: [
    { label: 'µA (Microamp)', symbol: 'µA', multiplier: 1e-6, baseUnit: 'A' },
    { label: 'mA (Milliamp)', symbol: 'mA', multiplier: 1e-3, baseUnit: 'A' },
    { label: 'A (Ampere)', symbol: 'A', multiplier: 1, baseUnit: 'A' },
    { label: 'kA (Kiloamp)', symbol: 'kA', multiplier: 1e3, baseUnit: 'A' },
  ],
  power: [
    { label: 'W (Watt)', symbol: 'W', multiplier: 1, baseUnit: 'W' },
    { label: 'kW (Kilowatt)', symbol: 'kW', multiplier: 1e3, baseUnit: 'W' },
    { label: 'MW (Megawatt)', symbol: 'MW', multiplier: 1e6, baseUnit: 'W' },
    { label: 'GW (Gigawatt)', symbol: 'GW', multiplier: 1e9, baseUnit: 'W' },
  ],
  apparent_power: [
    { label: 'VA (Volt-Amp)', symbol: 'VA', multiplier: 1, baseUnit: 'VA' },
    { label: 'kVA (Kilovolt-Amp)', symbol: 'kVA', multiplier: 1e3, baseUnit: 'VA' },
    { label: 'MVA (Megavolt-Amp)', symbol: 'MVA', multiplier: 1e6, baseUnit: 'VA' },
  ],
  reactive_power: [
    { label: 'var (Volt-Amp Reactive)', symbol: 'var', multiplier: 1, baseUnit: 'var' },
    { label: 'kvar (Kilovar)', symbol: 'kvar', multiplier: 1e3, baseUnit: 'var' },
    { label: 'MVAR (Megavar)', symbol: 'MVAR', multiplier: 1e6, baseUnit: 'var' },
  ],
  frequency: [
    { label: 'Hz (Hertz)', symbol: 'Hz', multiplier: 1, baseUnit: 'Hz' },
    { label: 'kHz (Kilohertz)', symbol: 'kHz', multiplier: 1e3, baseUnit: 'Hz' },
    { label: 'MHz (Megahertz)', symbol: 'MHz', multiplier: 1e6, baseUnit: 'Hz' },
  ],
  time: [
    { label: 'µs (Microsecond)', symbol: 'µs', multiplier: 1e-6, baseUnit: 's' },
    { label: 'ms (Millisecond)', symbol: 'ms', multiplier: 1e-3, baseUnit: 's' },
    { label: 's (Second)', symbol: 's', multiplier: 1, baseUnit: 's' },
  ],
  resistance_per_km: [
    { label: 'mΩ/km', symbol: 'mΩ/km', multiplier: 1e-3, baseUnit: 'Ω/km' },
    { label: 'Ω/km', symbol: 'Ω/km', multiplier: 1, baseUnit: 'Ω/km' },
    { label: 'kΩ/km', symbol: 'kΩ/km', multiplier: 1e3, baseUnit: 'Ω/km' },
  ],
  inductance_per_km: [
    { label: 'µH/km', symbol: 'µH/km', multiplier: 1e-6, baseUnit: 'H/km' },
    { label: 'mH/km', symbol: 'mH/km', multiplier: 1e-3, baseUnit: 'H/km' },
    { label: 'H/km', symbol: 'H/km', multiplier: 1, baseUnit: 'H/km' },
  ],
  capacitance_per_km: [
    { label: 'pF/km', symbol: 'pF/km', multiplier: 1e-12, baseUnit: 'F/km' },
    { label: 'nF/km', symbol: 'nF/km', multiplier: 1e-9, baseUnit: 'F/km' },
    { label: 'µF/km', symbol: 'µF/km', multiplier: 1e-6, baseUnit: 'F/km' },
    { label: 'F/km', symbol: 'F/km', multiplier: 1, baseUnit: 'F/km' },
  ],
  angle: [
    { label: '° (Degrees)', symbol: '°', multiplier: 1, baseUnit: '°' },
  ],
  none: [],
};

// ============================================================================
// PARAMETER TO CATEGORY MAP
// ============================================================================

export const PARAM_CATEGORY_MAP: Record<string, EngineeringUnitCategory> = {
  // Resistance
  resistance: 'resistance',
  Ron: 'resistance',
  Roff: 'resistance',
  internalRs: 'resistance',
  faultResistance: 'resistance',
  Ra: 'resistance',
  Rs: 'resistance',
  R_arm: 'resistance',
  Zc_aerial: 'resistance',
  Zc_ground: 'resistance',
  R_per_km: 'resistance_per_km',
  R_self_per_km: 'resistance_per_km',
  R_mutual_per_km: 'resistance_per_km',

  // Inductance
  inductance: 'inductance',
  L_arm: 'inductance',
  L_tcr: 'inductance',
  L_per_km: 'inductance_per_km',
  L_self_per_km: 'inductance_per_km',
  L_mutual_per_km: 'inductance_per_km',

  // Capacitance
  capacitance: 'capacitance',
  Cdc_F: 'capacitance',
  C_submodule: 'capacitance',
  C_tsc: 'capacitance',
  C_per_km: 'capacitance_per_km',
  C_self_per_km: 'capacitance_per_km',
  C_mutual_per_km: 'capacitance_per_km',

  // Voltage
  voltage: 'voltage',
  V1_nom: 'voltage',
  V2_nom: 'voltage',
  Vdc_nom: 'voltage',
  V_ac_nom: 'voltage',
  V_ref: 'voltage',
  Vf: 'voltage',

  // Current
  I_ref: 'current',
  I_holding: 'current',

  // Frequency
  freq: 'frequency',
  carrierFreq: 'frequency',
  pllFreq: 'frequency',

  // Time
  openTime: 'time',
  closeTime: 'time',
  startTime: 'time',
  duration: 'time',
  rampTime: 'time',
  deadTimeSec: 'time',
  trr: 'time',
  pidTf: 'time',
  Td0_prime: 'time',
  Td0_pp: 'time',
  H: 'time',
  H_hp: 'time',
  H_ip: 'time',
  H_lp: 'time',
  H_gen: 'time',

  // Angle
  phaseDeg: 'angle',
  firingAngleDeg: 'angle',
  alphaDeg: 'angle',
  gammaMinDeg: 'angle',

  // Power (W/MW)
  Pac_ref: 'power',
  Qac_ref: 'reactive_power',
  Q_rating_MVAR: 'reactive_power',
  MVA_rating: 'apparent_power',
};

/**
 * Normalizes floating point numbers to eliminate binary rounding errors
 * e.g. 100 * 1e-6 becoming 0.00009999999999999999 -> 0.0001
 */
export function cleanFloat(val: number): number {
  if (isNaN(val) || !isFinite(val) || val === 0) return val;
  return parseFloat(val.toPrecision(12));
}

/**
 * Parses user input string which may contain:
 * - Pure numbers (e.g. "100", "0.05", "-12.3")
 * - Scientific notation (e.g. "1e-6", "2.5e3", "1.2E-4")
 * - Engineering suffix alone (e.g. "100u", "5m", "100k", "2.5M", "47n", "500p")
 * - Engineering suffix + unit name (e.g. "100uH", "5mH", "100kOhm", "100kΩ", "230kV", "10mohm", "47nF")
 * 
 * Returns the exact numeric value converted to base unit, the matched unit option, and validation status.
 */
export function parseEngineeringInput(
  rawInput: string | number,
  category: EngineeringUnitCategory = 'none',
  activeUnitMultiplier: number = 1
): ParseResult {
  if (typeof rawInput === 'number') {
    if (isNaN(rawInput) || !isFinite(rawInput)) {
      return {
        success: false,
        value: 0,
        unitMultiplier: activeUnitMultiplier,
        errorMessage: 'Invalid numeric value (NaN or Infinite)',
      };
    }
    return {
      success: true,
      value: cleanFloat(rawInput),
      displayValue: cleanFloat(rawInput / activeUnitMultiplier),
      unitMultiplier: activeUnitMultiplier,
    };
  }

  const str = String(rawInput ?? '').trim();
  if (!str) {
    return {
      success: false,
      value: 0,
      unitMultiplier: activeUnitMultiplier,
      errorMessage: 'Value cannot be empty',
    };
  }

  // Check scientific notation or standard float: e.g. "1e-6", "-2.5e3", "0.005", "100"
  // Regex matches:
  // Group 1: Numeric part (including scientific notation e.g. 1e-6, -2.5E+3)
  // Group 2: Optional suffix / unit string (e.g. "u", "uH", "m", "k", "kV", "M", "Meg", "nF", "pF", "mohm")
  const match = str.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-ZµΩ°/_\-]*)$/);

  if (!match) {
    return {
      success: false,
      value: 0,
      unitMultiplier: activeUnitMultiplier,
      errorMessage: `Cannot parse "${str}" as an engineering number`,
    };
  }

  const numPart = parseFloat(match[1]);
  if (isNaN(numPart) || !isFinite(numPart)) {
    return {
      success: false,
      value: 0,
      unitMultiplier: activeUnitMultiplier,
      errorMessage: 'Invalid numeric portion',
    };
  }

  const rawSuffix = match[2];

  // Case A: No suffix provided. Use the active unit multiplier from dropdown.
  if (!rawSuffix) {
    const baseVal = cleanFloat(numPart * activeUnitMultiplier);
    return {
      success: true,
      value: baseVal,
      displayValue: numPart,
      unitMultiplier: activeUnitMultiplier,
    };
  }

  // Case B: Suffix provided. Parse metric prefix and unit.
  const resolved = resolveSuffixMultiplier(rawSuffix, category);
  if (resolved) {
    const baseVal = cleanFloat(numPart * resolved.multiplier);
    return {
      success: true,
      value: baseVal,
      displayValue: numPart,
      matchedUnit: resolved.symbol,
      unitMultiplier: resolved.multiplier,
    };
  }

  // Suffix could not be resolved
  return {
    success: false,
    value: 0,
    unitMultiplier: activeUnitMultiplier,
    errorMessage: `Unrecognized unit or suffix: "${rawSuffix}"`,
  };
}

/**
 * Resolves a suffix string (e.g. "u", "uH", "µF", "k", "kΩ", "kV", "M", "Meg", "m", "mohm", "p", "pF")
 * to its corresponding numerical multiplier and display symbol.
 */
export function resolveSuffixMultiplier(
  suffix: string,
  category: EngineeringUnitCategory
): { multiplier: number; symbol: string } | null {
  const clean = suffix.trim();
  if (!clean) return null;

  // 1. Direct match with defined units in category
  const categoryUnits = ENGINEERING_UNITS[category] || [];
  for (const opt of categoryUnits) {
    if (
      opt.symbol.toLowerCase() === clean.toLowerCase() ||
      opt.symbol === clean ||
      opt.baseUnit.toLowerCase() === clean.toLowerCase()
    ) {
      return { multiplier: opt.multiplier, symbol: opt.symbol };
    }
  }

  // 2. Special multi-character prefixes: "meg", "MEG", "Meg", "micro"
  const lower = clean.toLowerCase();
  if (lower.startsWith('meg')) {
    return findCategorySymbol(category, 1e6, clean);
  }
  if (lower.startsWith('micro')) {
    return findCategorySymbol(category, 1e-6, clean);
  }

  // 3. Single-char prefix detection:
  // Note: Case sensitivity matters for 'm' (milli 1e-3) vs 'M' (mega 1e6)
  const firstChar = clean[0];
  let mult: number | null = null;

  if (firstChar === 'p' || firstChar === 'P') {
    mult = 1e-12;
  } else if (firstChar === 'n' || firstChar === 'N') {
    mult = 1e-9;
  } else if (firstChar === 'u' || firstChar === 'U' || firstChar === 'µ') {
    mult = 1e-6;
  } else if (firstChar === 'm') {
    // lowercase m -> milli
    mult = 1e-3;
  } else if (firstChar === 'M') {
    // uppercase M -> Mega
    mult = 1e6;
  } else if (firstChar === 'k' || firstChar === 'K') {
    mult = 1e3;
  } else if (firstChar === 'G' || firstChar === 'g') {
    mult = 1e9;
  }

  if (mult !== null) {
    return findCategorySymbol(category, mult, clean);
  }

  // 4. Fallback: Base unit alone (e.g. "H", "F", "V", "A", "W", "Ohm", "Ω", "s", "Hz")
  const baseSymbols = ['h', 'f', 'v', 'a', 'w', 'ohm', 'ω', 's', 'hz', 'deg'];
  if (baseSymbols.includes(lower)) {
    return findCategorySymbol(category, 1, clean);
  }

  return null;
}

function findCategorySymbol(
  category: EngineeringUnitCategory,
  mult: number,
  fallbackSuffix: string
): { multiplier: number; symbol: string } {
  const options = ENGINEERING_UNITS[category] || [];
  const found = options.find((opt) => Math.abs(opt.multiplier - mult) < 1e-15);
  if (found) {
    return { multiplier: found.multiplier, symbol: found.symbol };
  }
  return { multiplier: mult, symbol: fallbackSuffix };
}

/**
 * Selects the optimal engineering unit option for a given base SI magnitude.
 * E.g.
 * - Inductance 0.0001 H -> selects 'µH' (100 µH)
 * - Inductance 0.05 H -> selects 'mH' (50 mH)
 * - Voltage 230000 V -> selects 'kV' (230 kV)
 * - Capacitance 20e-6 F -> selects 'µF' (20 µF)
 * - Capacitance 12e-9 F -> selects 'nF' (12 nF)
 * - Resistance 20000 Ω -> selects 'kΩ' (20 kΩ)
 */
export function getBestUnit(
  baseValue: number,
  category: EngineeringUnitCategory
): EngineeringUnitOption {
  const options = ENGINEERING_UNITS[category] || [];
  if (options.length === 0) {
    return { label: '', symbol: '', multiplier: 1, baseUnit: '' };
  }

  if (!baseValue || !isFinite(baseValue)) {
    // Return base unit (multiplier = 1) if available, or first option
    return options.find((o) => o.multiplier === 1) || options[0];
  }

  const absVal = Math.abs(baseValue);

  // Find the option whose normalized value (absVal / multiplier) is closest to [1, 999.99]
  let bestOpt = options[0];
  let bestScore = Infinity;

  for (const opt of options) {
    const scaled = absVal / opt.multiplier;
    if (scaled >= 0.999 && scaled < 1000) {
      return opt;
    }
    // Score based on distance from range [1, 1000]
    const distance = scaled < 1 ? 1 / (scaled + 1e-9) : scaled / 1000;
    if (distance < bestScore) {
      bestScore = distance;
      bestOpt = opt;
    }
  }

  return bestOpt;
}

/**
 * Formats a base numeric value for display in the given unit.
 * Strips floating point noise (e.g. 100.00000000000001 -> 100).
 */
export function formatDisplayValue(baseValue: number, unitMultiplier: number): string {
  if (baseValue === undefined || baseValue === null || isNaN(baseValue)) return '';
  const scaled = baseValue / (unitMultiplier || 1);
  if (scaled === 0) return '0';

  // Round to 8 significant figures to eliminate IEEE 754 precision artifacts
  const rounded = parseFloat(scaled.toPrecision(8));
  return String(rounded);
}

/**
 * Formats an SI base value to a concise engineering string (e.g. "100 µH", "230 kV", "10 Ω").
 */
export function formatEngineeringString(
  baseValue: number,
  category: EngineeringUnitCategory
): string {
  if (baseValue === undefined || baseValue === null || isNaN(baseValue)) return '—';
  const best = getBestUnit(baseValue, category);
  const displayVal = formatDisplayValue(baseValue, best.multiplier);
  return `${displayVal} ${best.symbol}`.trim();
}

// ============================================================================
// REAL-TIME PHYSICAL PARAMETER VALIDATION
// ============================================================================

/**
 * Validates a component parameter against power engineering laws and EMTDC numerical solver limits.
 * Checks for non-physical parameters such as negative resistance or zero inductance (which causes
 * Dommel Norton Geq = dt / (2L) to blow up to infinity).
 */
export function validateParameter(
  paramKey: string,
  baseValue: number,
  _compType?: string
): ValidationResult {
  if (baseValue === undefined || baseValue === null || isNaN(baseValue)) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Parameter value is undefined or NaN.',
    };
  }

  if (!isFinite(baseValue)) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Parameter value cannot be infinite.',
    };
  }

  const category = PARAM_CATEGORY_MAP[paramKey] || 'none';

  // 1. Resistance Validation
  if (category === 'resistance' || category === 'resistance_per_km') {
    // For ideal resistor, resistance must be strictly positive
    if (paramKey === 'resistance' && baseValue <= 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Resistance must be strictly positive (R > 0 Ω) to prevent infinite conductance (G = 1/R).',
      };
    }
    if (baseValue < 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Negative resistance violates thermodynamic passivity and causes matrix numerical instability.',
      };
    }
    if (baseValue > 1e9) {
      return {
        isValid: true,
        severity: 'warning',
        message: 'Very large resistance (> 1 GΩ) may cause ill-conditioned matrix factorization. Consider an open branch.',
      };
    }
  }

  // 2. Inductance Validation
  if (category === 'inductance' || category === 'inductance_per_km') {
    if (baseValue <= 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Inductance must be strictly positive (L > 0 H). Zero inductance yields infinite Dommel companion conductance Geq = Δt/(2L).',
      };
    }
    if (baseValue < 1e-9) {
      return {
        isValid: true,
        severity: 'warning',
        message: 'Extremely small inductance (< 1 nH) creates very large Norton conductance. Verify component rating.',
      };
    }
  }

  // 3. Capacitance Validation
  if (category === 'capacitance' || category === 'capacitance_per_km') {
    if (baseValue <= 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Capacitance must be strictly positive (C > 0 F). Zero or negative capacitance is non-physical.',
      };
    }
  }

  // 4. Voltage Validation
  if (category === 'voltage') {
    if (baseValue <= 0 && (paramKey === 'voltage' || paramKey === 'V1_nom' || paramKey === 'V2_nom')) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Nominal AC/DC voltage must be strictly positive (V > 0).',
      };
    }
  }

  // 5. Frequency Validation
  if (category === 'frequency') {
    if (baseValue <= 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Frequency must be strictly positive (f > 0 Hz).',
      };
    }
    if (baseValue > 100000) {
      return {
        isValid: true,
        severity: 'warning',
        message: 'Frequency exceeds typical power grid range (> 100 kHz). Ensure simulation step Δt is sufficiently small.',
      };
    }
  }

  // 6. Time Validation
  if (category === 'time') {
    if (baseValue < 0) {
      return {
        isValid: false,
        severity: 'error',
        message: 'Time duration or constant cannot be negative.',
      };
    }
  }

  // 7. Line Length
  if (paramKey === 'lengthKm' && baseValue <= 0) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Transmission line length must be strictly positive (km > 0).',
    };
  }

  // 8. Power Ratings
  if (paramKey === 'MVA_rating' && baseValue <= 0) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Transformer / machine MVA rating must be strictly positive.',
    };
  }

  return {
    isValid: true,
    severity: 'none',
  };
}
