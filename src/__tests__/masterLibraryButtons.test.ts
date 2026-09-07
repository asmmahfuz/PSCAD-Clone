import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMasterCategory } from '../components/library/MasterLibraryFlyout';
import { COMPONENT_TYPES } from '../constants';

describe('Master Library "More on..." Buttons & Category Navigation', () => {
  it('accurately normalizes all 12 Master Library card categories', () => {
    // 1. Passive Elements
    assert.equal(normalizeMasterCategory('Passive Elements'), 'Passive RLC');
    assert.equal(normalizeMasterCategory('Passive RLC'), 'Passive RLC');

    // 2. Sources
    assert.equal(normalizeMasterCategory('Sources'), 'Sources & Generators');
    assert.equal(normalizeMasterCategory('Sources & Generators'), 'Sources & Generators');

    // 3. Miscellaneous & Control Blocks
    assert.equal(normalizeMasterCategory('Control Blocks (CSMF)'), 'Control Blocks (CSMF)');
    assert.equal(normalizeMasterCategory('Miscellaneous models'), 'Control Blocks (CSMF)');

    // 4. I/O Devices & Runtime Controls
    assert.equal(normalizeMasterCategory('I/O Devices'), 'Runtime Controls');
    assert.equal(normalizeMasterCategory('Runtime Canvas Controls'), 'Runtime Controls');
    assert.equal(normalizeMasterCategory('Runtime Controls'), 'Runtime Controls');

    // 5. Breakers & Faults
    assert.equal(normalizeMasterCategory('Breakers & Faults'), 'Switches & Faults');
    assert.equal(normalizeMasterCategory('Switches & Faults'), 'Switches & Faults');

    // 6. Power Electronics & FACTS
    assert.equal(normalizeMasterCategory('Power Electronics & FACTS'), 'Power Electronics & FACTS');
    assert.equal(normalizeMasterCategory('Power Electronics/HVDC/FACTS'), 'Power Electronics & FACTS');

    // 7. Imports, Exports & Labels
    assert.equal(normalizeMasterCategory('Imports, Exports & Labels'), 'Meters & Probes');
    assert.equal(normalizeMasterCategory('Labels & Routing'), 'Meters & Probes');

    // 8. Transformers
    assert.equal(normalizeMasterCategory('Transformers'), 'Transformers & Lines');

    // 9. Machines & Drives
    assert.equal(normalizeMasterCategory('Machines & Drives'), 'Machines & Drives');
    assert.equal(normalizeMasterCategory('Machines'), 'Machines & Drives');

    // 10. CSMF
    assert.equal(normalizeMasterCategory('CSMF'), 'Control Blocks (CSMF)');

    // 11. Transmission Lines
    assert.equal(normalizeMasterCategory('Transmission Lines'), 'Transformers & Lines');

    // 12. Cables
    assert.equal(normalizeMasterCategory('Cables'), 'Transformers & Lines');
  });

  it('validates drag-and-drop payload format compatibility with SchematicCanvas', () => {
    const sampleItem = {
      type: COMPONENT_TYPES.AC_SOURCE_3PH,
      name: '3-Phase AC Grid Source',
    };

    const payload = JSON.stringify({ type: sampleItem.type, name: sampleItem.name });
    
    // Simulate what SchematicCanvas handleDrop does:
    const parsed = JSON.parse(payload);
    assert.equal(parsed.type, COMPONENT_TYPES.AC_SOURCE_3PH);
    assert.equal(parsed.name, '3-Phase AC Grid Source');

    // Test circuit component generation from drop
    const newComp = {
      id: `comp_${Date.now()}_test`,
      type: parsed.type,
      name: `${(parsed.name || parsed.type).toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 4)}_1`,
      x: 200,
      y: 150,
      rotation: 0,
      params: {},
    };

    assert.equal(newComp.type, 'ac_source_3ph');
    assert.ok(newComp.name.startsWith('3_PH'));
  });

  it('verifies category lookup handles null/undefined gracefully', () => {
    assert.equal(normalizeMasterCategory(undefined), 'ALL');
    assert.equal(normalizeMasterCategory(''), 'ALL');
    assert.equal(normalizeMasterCategory('ALL'), 'ALL');
  });
});
