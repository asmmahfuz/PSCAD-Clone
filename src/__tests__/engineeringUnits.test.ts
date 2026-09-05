/**
 * PSCAD CLONE - Engineering Unit Converters & Form Field Validation Unit Tests
 * Phase 21 - Step 21.2: Multi-Tab Component Parameter Dialogs & Units Engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEngineeringInput,
  resolveSuffixMultiplier,
  getBestUnit,
  formatDisplayValue,
  formatEngineeringString,
  validateParameter,
  ENGINEERING_UNITS,
  PARAM_CATEGORY_MAP,
} from '../utils/engineeringUnits';

describe('Engineering Units Engine - Prefix & Suffix Parsing', () => {
  it('parses scientific notation strings accurately', () => {
    const res1 = parseEngineeringInput('1e-6', 'capacitance', 1);
    assert.equal(res1.success, true);
    assert.equal(res1.value, 1e-6);

    const res2 = parseEngineeringInput('2.5e3', 'voltage', 1);
    assert.equal(res2.success, true);
    assert.equal(res2.value, 2500);

    const res3 = parseEngineeringInput('-1.5e-3', 'power', 1);
    assert.equal(res3.success, true);
    assert.equal(res3.value, -0.0015);
  });

  it('parses metric suffixes alone: u, m, k, M, meg, n, p', () => {
    // Inductor: 100u -> 100 * 1e-6 = 1e-4 H
    const ind1 = parseEngineeringInput('100u', 'inductance', 1);
    assert.equal(ind1.success, true);
    assert.equal(ind1.value, 1e-4);
    assert.equal(ind1.matchedUnit, 'µH');

    // Inductor: 5m -> 5 * 1e-3 = 0.005 H
    const ind2 = parseEngineeringInput('5m', 'inductance', 1);
    assert.equal(ind2.success, true);
    assert.equal(ind2.value, 0.005);
    assert.equal(ind2.matchedUnit, 'mH');

    // Resistor: 100k -> 100 * 1e3 = 100,000 Ω
    const res1 = parseEngineeringInput('100k', 'resistance', 1);
    assert.equal(res1.success, true);
    assert.equal(res1.value, 100000);
    assert.equal(res1.matchedUnit, 'kΩ');

    // Resistor: 2.5M -> 2.5 * 1e6 = 2,500,000 Ω
    const res2 = parseEngineeringInput('2.5M', 'resistance', 1);
    assert.equal(res2.success, true);
    assert.equal(res2.value, 2.5e6);
    assert.equal(res2.matchedUnit, 'MΩ');

    // Resistor: 10meg -> 10 * 1e6 = 10,000,000 Ω
    const res3 = parseEngineeringInput('10meg', 'resistance', 1);
    assert.equal(res3.success, true);
    assert.equal(res3.value, 1e7);

    // Capacitor: 47n -> 47 * 1e-9 F
    const cap1 = parseEngineeringInput('47n', 'capacitance', 1);
    assert.equal(cap1.success, true);
    assert.equal(cap1.value, 47e-9);
    assert.equal(cap1.matchedUnit, 'nF');

    // Capacitor: 500p -> 500 * 1e-12 F
    const cap2 = parseEngineeringInput('500p', 'capacitance', 1);
    assert.equal(cap2.success, true);
    assert.equal(cap2.value, 500e-12);
    assert.equal(cap2.matchedUnit, 'pF');
  });

  it('parses suffixes combined with unit symbols: uH, mH, kΩ, kV, mohm, nF, pF', () => {
    const l1 = parseEngineeringInput('100uH', 'inductance', 1);
    assert.equal(l1.success, true);
    assert.equal(l1.value, 1e-4);

    const l2 = parseEngineeringInput('50 mH', 'inductance', 1);
    assert.equal(l2.success, true);
    assert.equal(l2.value, 0.05);

    const v1 = parseEngineeringInput('230kV', 'voltage', 1);
    assert.equal(v1.success, true);
    assert.equal(v1.value, 230000);

    const r1 = parseEngineeringInput('10mohm', 'resistance', 1);
    assert.equal(r1.success, true);
    assert.equal(r1.value, 0.01);

    const c1 = parseEngineeringInput('22µF', 'capacitance', 1);
    assert.equal(c1.success, true);
    assert.equal(c1.value, 22e-6);
  });

  it('applies active unit multiplier when no suffix is entered', () => {
    // If active unit is mH (multiplier 1e-3) and user enters "50"
    const r1 = parseEngineeringInput('50', 'inductance', 1e-3);
    assert.equal(r1.success, true);
    assert.equal(r1.value, 0.05); // 50 * 1e-3 = 0.05 H
    assert.equal(r1.displayValue, 50);

    // If active unit is kV (multiplier 1e3) and user enters "230"
    const r2 = parseEngineeringInput('230', 'voltage', 1e3);
    assert.equal(r2.success, true);
    assert.equal(r2.value, 230000); // 230 * 1e3 = 230,000 V
    assert.equal(r2.displayValue, 230);
  });

  it('rejects invalid or unparseable input gracefully', () => {
    const r1 = parseEngineeringInput('abc', 'resistance', 1);
    assert.equal(r1.success, false);
    assert.ok(r1.errorMessage);

    const r2 = parseEngineeringInput('', 'inductance', 1);
    assert.equal(r2.success, false);

    const r3 = parseEngineeringInput('100xyz', 'voltage', 1);
    assert.equal(r3.success, false);
  });
});

describe('Engineering Units Engine - Auto-Best Unit Selector & Formatting', () => {
  it('selects best unit for given magnitudes', () => {
    // 100 µH (0.0001 H)
    const u1 = getBestUnit(0.0001, 'inductance');
    assert.equal(u1.symbol, 'µH');

    // 50 mH (0.05 H)
    const u2 = getBestUnit(0.05, 'inductance');
    assert.equal(u2.symbol, 'mH');

    // 2 H
    const u3 = getBestUnit(2, 'inductance');
    assert.equal(u3.symbol, 'H');

    // 230 kV (230,000 V)
    const u4 = getBestUnit(230000, 'voltage');
    assert.equal(u4.symbol, 'kV');

    // 20 µF (20e-6 F)
    const u5 = getBestUnit(20e-6, 'capacitance');
    assert.equal(u5.symbol, 'µF');

    // 12 nF (12e-9 F)
    const u6 = getBestUnit(12e-9, 'capacitance');
    assert.equal(u6.symbol, 'nF');
  });

  it('formats display value without floating point artifacts', () => {
    // 0.0001 / 1e-6 = 100
    const str1 = formatDisplayValue(0.0001, 1e-6);
    assert.equal(str1, '100');

    // 0.05 / 1e-3 = 50
    const str2 = formatDisplayValue(0.05, 1e-3);
    assert.equal(str2, '50');

    // 0.012e-6 / 1e-9 = 12
    const str3 = formatDisplayValue(0.012e-6, 1e-9);
    assert.equal(str3, '12');
  });

  it('formats engineering string correctly', () => {
    const s1 = formatEngineeringString(0.0001, 'inductance');
    assert.equal(s1, '100 µH');

    const s2 = formatEngineeringString(230000, 'voltage');
    assert.equal(s2, '230 kV');
  });
});

describe('Engineering Units Engine - Physical Parameter Validation', () => {
  it('detects non-physical negative or zero resistance on ideal resistors', () => {
    const v1 = validateParameter('resistance', -5);
    assert.equal(v1.isValid, false);
    assert.equal(v1.severity, 'error');
    assert.match(v1.message || '', /strictly positive|cannot be negative/);

    const v2 = validateParameter('resistance', 0);
    assert.equal(v2.isValid, false);
    assert.equal(v2.severity, 'error');

    const v3 = validateParameter('resistance', 10);
    assert.equal(v3.isValid, true);
    assert.equal(v3.severity, 'none');
  });

  it('detects non-physical zero or negative inductance', () => {
    const v1 = validateParameter('inductance', 0);
    assert.equal(v1.isValid, false);
    assert.equal(v1.severity, 'error');
    assert.match(v1.message || '', /strictly positive/);

    const v2 = validateParameter('inductance', -0.01);
    assert.equal(v2.isValid, false);
    assert.equal(v2.severity, 'error');

    const v3 = validateParameter('inductance', 0.1);
    assert.equal(v3.isValid, true);
    assert.equal(v3.severity, 'none');
  });

  it('detects non-physical zero or negative capacitance', () => {
    const v1 = validateParameter('capacitance', 0);
    assert.equal(v1.isValid, false);
    assert.equal(v1.severity, 'error');

    const v2 = validateParameter('capacitance', 20e-6);
    assert.equal(v2.isValid, true);
    assert.equal(v2.severity, 'none');
  });

  it('detects non-physical nominal voltage and frequency', () => {
    const v1 = validateParameter('voltage', 0);
    assert.equal(v1.isValid, false);
    assert.equal(v1.severity, 'error');

    const v2 = validateParameter('freq', -60);
    assert.equal(v2.isValid, false);
    assert.equal(v2.severity, 'error');

    const v3 = validateParameter('freq', 60);
    assert.equal(v3.isValid, true);
  });

  it('issues warnings for extreme parameters', () => {
    const v1 = validateParameter('resistance', 1e10);
    assert.equal(v1.isValid, true);
    assert.equal(v1.severity, 'warning');

    const v2 = validateParameter('freq', 200000);
    assert.equal(v2.isValid, true);
    assert.equal(v2.severity, 'warning');
  });

  it('validates suffix resolution, unit dictionary, and parameter category mappings', () => {
    // Test resolveSuffixMultiplier directly
    const uResolved = resolveSuffixMultiplier('uH', 'inductance');
    assert.ok(uResolved);
    assert.equal(uResolved.multiplier, 1e-6);
    assert.equal(uResolved.symbol, 'µH');

    const megResolved = resolveSuffixMultiplier('Meg', 'resistance');
    assert.ok(megResolved);
    assert.equal(megResolved.multiplier, 1e6);

    const mResolved = resolveSuffixMultiplier('m', 'resistance');
    assert.ok(mResolved);
    assert.equal(mResolved.multiplier, 1e-3);

    // Verify ENGINEERING_UNITS table completeness
    assert.ok(ENGINEERING_UNITS.resistance.length >= 4);
    assert.ok(ENGINEERING_UNITS.inductance.length >= 3);
    assert.ok(ENGINEERING_UNITS.capacitance.length >= 4);
    assert.ok(ENGINEERING_UNITS.voltage.length >= 4);

    // Verify PARAM_CATEGORY_MAP entries
    assert.equal(PARAM_CATEGORY_MAP.resistance, 'resistance');
    assert.equal(PARAM_CATEGORY_MAP.inductance, 'inductance');
    assert.equal(PARAM_CATEGORY_MAP.capacitance, 'capacitance');
    assert.equal(PARAM_CATEGORY_MAP.voltage, 'voltage');
  });
});
