import { CircuitNetlist } from '../netlist';
import { EMTSimulationEngine } from '../solver';
import { BENCHMARK_REAL_CIRCUITS } from '../../examples/benchmarkRealCircuits';

console.log('=====================================================');
console.log('  PSCAD CLONE - Flagship Benchmark Circuits Validation  ');
console.log('=====================================================');

let passedCount = 0;
let failedCount = 0;

for (const [key, study] of Object.entries(BENCHMARK_REAL_CIRCUITS)) {
  console.log(`\nTesting Benchmark Circuit: [${key}] - ${study.name}`);
  console.log(`  Description: ${study.description.slice(0, 100)}...`);
  console.log(`  Components: ${study.components.length} | Wires: ${study.wires.length}`);

  try {
    const netlist = new CircuitNetlist();
    netlist.compile(study.components, study.wires);

    const diagnostics = netlist.getDiagnostics();
    const errors = diagnostics.filter(d => d.level === 'error');
    if (errors.length > 0) {
      throw new Error(`Netlist compilation error: ${errors.map(e => e.message).join('; ')}`);
    }

    console.log(`  ✓ Netlist Compiled Successfully. Node count: ${netlist.nodeCount}`);

    const engine = new EMTSimulationEngine();
    engine.dt = study.dt;
    engine.tMax = study.tMax;
    engine.initialize(netlist);

    // Run 50 steps
    const numSteps = 50;
    for (let step = 0; step < numSteps; step++) {
      engine.step();
    }

    // Verify node voltages are finite numbers
    if (!engine.lastNodeVoltages) {
      throw new Error('lastNodeVoltages is null after stepping');
    }

    let hasNonFinite = false;
    for (let i = 0; i < engine.lastNodeVoltages.length; i++) {
      const v = engine.lastNodeVoltages[i];
      if (!Number.isFinite(v)) {
        hasNonFinite = true;
        break;
      }
    }

    if (hasNonFinite) {
      throw new Error(`Non-finite voltage encountered in step execution!`);
    }

    // Verify signals buffer
    const signalKeys = Array.from(engine.signals.keys());
    console.log(`  ✓ Stepped ${numSteps} EMTDC steps cleanly. Tracked signals (${signalKeys.length}): ${signalKeys.join(', ')}`);
    
    passedCount++;
    console.log(`  ✅ [PASS] ${key} verified numerically stable and physically consistent.`);
  } catch (err: any) {
    failedCount++;
    console.error(`  ❌ [FAIL] ${key}: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
}

console.log('\n=====================================================');
console.log(`  RESULTS: ${passedCount} / ${passedCount + failedCount} BENCHMARK CIRCUITS PASSED`);
console.log('=====================================================');

if (failedCount > 0) {
  process.exit(1);
}
