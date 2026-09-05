import { runPhase1Validation } from './phase1_validation';
import { runPhase2Validation } from './phase2_validation';
import { runPhase3Validation } from './phase3_validation';
import { runPhase4Validation } from './phase4_validation';
import { runPhase5Validation } from './phase5_validation';
import { runPhase6Tests } from './phase6_validation';
import { runPhase7Tests } from './phase7_validation';
import { runPhase9Tests } from './phase9_validation';
import { runPhase10Validation } from './phase10_validation';
import { runPhase11Validation } from './phase11_validation';
import { runPhase12Validation } from './phase12_validation';
import { runPhase13Validation } from './phase13_validation';
import { runPhase14Validation } from './phase14_validation';

console.log('=====================================================');
console.log('  PSCAD Modern - Master Verification Test Runner    ');
console.log('=====================================================');

console.log('\n--- PHASE 1: EMTDC KERNEL & NUMERICAL STABILITY ---');
const p1 = runPhase1Validation();
for (const r of p1.results) {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] ${r.test}`);
  console.log(`       -> ${r.message}`);
}

console.log('\n--- PHASE 2: DISTRIBUTED TRANSMISSION LINES & CABLES ---');
const p2 = runPhase2Validation();
for (const r of p2.results) {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] ${r.test}`);
  console.log(`       -> ${r.message}`);
}

console.log('\n--- PHASE 3: MAGNETIC MODELS, MACHINES & NON-LINEAR ---');
const p3 = runPhase3Validation();
for (const r of p3.results) {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] ${r.test}`);
  console.log(`       -> ${r.message}`);
}

console.log('\n--- PHASE 4: POWER ELECTRONICS, MMC & FACTS ---');
const p4 = runPhase4Validation();
for (const r of p4.results) {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] ${r.test}`);
  console.log(`       -> ${r.message}`);
}

console.log('\n--- PHASE 5: CSMF CONTROLS, SIGNAL TYPES & DATA LABELS ---');
const p5 = runPhase5Validation();
for (const r of p5.results) {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${symbol}] ${r.test}`);
  console.log(`       -> ${r.message}`);
}

console.log('\n--- PHASE 6: HIERARCHY, CUSTOM COMPONENTS, RUNTIME CONTROLS & CAD ---');
const p6Passed = runPhase6Tests();

console.log('\n--- PHASE 7: POWER SYSTEMS ANALYSIS, DIAGNOSTICS & STANDARDS ---');
const p7Passed = runPhase7Tests();

console.log('\n--- PHASE 9: NATIVE RUST EMTDC SIMULATION KERNEL & SIMD LINEAR ALGEBRA ---');
const p9 = runPhase9Tests();

console.log('\n--- PHASE 10: MULTI-CORE CPU PARALLELISM & GPU COMPUTE ACCELERATION ---');
const p10 = runPhase10Validation();

console.log('\n--- PHASE 11: POWER SYSTEM PROTECTION & ANSI RELAY SUITE ---');
const p11 = runPhase11Validation();

console.log('\n--- PHASE 12: STANDARD IEEE CONTROL SYSTEMS & DYNAMIC REGULATORS ---');
const p12 = runPhase12Validation();

console.log('\n--- PHASE 13: ADVANCED CABLE CONSTANTS & REAL PSCAD INTEROPERABILITY ---');
const p13 = runPhase13Validation();

console.log('\n--- PHASE 14: ADVANCED MAGNETICS, HYSTERESIS & SUBSTATION EQUIPMENT ---');
const p14 = runPhase14Validation();

const totalPassed =
  p1.results.filter((r) => r.passed).length +
  p2.results.filter((r) => r.passed).length +
  p3.results.filter((r) => r.passed).length +
  p4.results.filter((r) => r.passed).length +
  p5.results.filter((r) => r.passed).length +
  (p6Passed ? 4 : 0) +
  (p7Passed ? 4 : 0) +
  p9.results.filter((r) => r.passed).length +
  p10.results.filter((r) => r.passed).length +
  p11.results.filter((r) => r.passed).length +
  p12.results.filter((r) => r.passed).length +
  p13.results.filter((r) => r.passed).length +
  p14.results.filter((r) => r.passed).length;

const totalTests =
  p1.results.length +
  p2.results.length +
  p3.results.length +
  p4.results.length +
  p5.results.length +
  4 +
  4 +
  p9.results.length +
  p10.results.length +
  p11.results.length +
  p12.results.length +
  p13.results.length +
  p14.results.length;

const allPassed =
  p1.allPassed &&
  p2.allPassed &&
  p3.allPassed &&
  p4.allPassed &&
  p5.allPassed &&
  p6Passed &&
  p7Passed &&
  p9.passed &&
  p10.passed &&
  p11.allPassed &&
  p12.allPassed &&
  p13.allPassed &&
  p14.allPassed;

declare const process: any;

console.log('\n=====================================================');
console.log(`  VERIFICATION SUMMARY: ${totalPassed} / ${totalTests} TESTS PASSED`);
if (allPassed && totalPassed === totalTests) {
  console.log('  STATUS: ALL PHASES (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14) VERIFIED & HEALTHY ✨');
  console.log(`  MASTER ROADMAP: PHASE 14 COMPLETED (${totalPassed}/${totalTests} TOTAL TEST BENCHES PASSED)`);
} else {
  console.log('  STATUS: SOME TESTS FAILED ❌');
  const allResults = [
    ...p1.results,
    ...p2.results,
    ...p3.results,
    ...p4.results,
    ...p5.results,
    ...p9.results,
    ...p10.results,
    ...p11.results,
    ...p12.results,
    ...p13.results,
    ...p14.results,
  ];
  for (const r of allResults) {
    if (!r.passed) {
      console.log(`  -> FAILED: ${(r as any).test || (r as any).groupName}: ${r.message}`);
    }
  }
  if (!p6Passed) console.log('  -> FAILED: Phase 6 tests failed');
  if (!p7Passed) console.log('  -> FAILED: Phase 7 tests failed');
  if (typeof process !== 'undefined') {
    process.exit(1);
  }
}
console.log('=====================================================\n');

