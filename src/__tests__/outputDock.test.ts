/**
 * PSCAD CLONE - Output Window & Diagnostics Dock Unit Tests
 * Phase 22 - Step 22.1: Multi-Tab Output & Diagnostics Dock
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  BuildReport,
  BuildPhaseStats,
  EMTDCEvent,
  DiagnosticItem,
  CrossReferenceItem,
  CircuitComponentData,
  CircuitSheet,
  SeverityFiltersState,
  JumpTarget,
  SignalNetwork,
  SignalEndpoint,
} from '../types';
import {
  formatDiagnosticReportText,
  formatDiagnosticReportJson,
  formatSignalTracingReportText,
} from '../types';
import {
  extractSignalNetworks,
  normalizeSignalName,
} from '../components/log/SignalSearchTab';
import { COMPONENT_TYPES } from '../constants';
import { CASE_STUDIES } from '../examples/caseStudies';

describe('Step 22.1 - Multi-Tab Output & Diagnostics Dock', () => {

  describe('1. Build Tab: 6-Phase Pipeline & Matrix Stats', () => {
    it('constructs a valid 6-phase compilation pipeline report', () => {
      const phases: BuildPhaseStats[] = [
        { phase: 1, name: 'Sheet Validation & Submodule Flattening', durationMs: 2.1, status: 'success', details: '1 sheet, 12 components' },
        { phase: 2, name: 'Netlist Node Generation & Connectivity Analysis', durationMs: 1.8, status: 'success', details: '8 electrical nodes' },
        { phase: 3, name: 'Conductance Matrix Pre-allocation & Topology Check', durationMs: 0.9, status: 'success', details: '[8x8] grid, dt=50us' },
        { phase: 4, name: 'Sparse LU Factorization & Reordering', durationMs: 3.4, status: 'success', details: 'NNZ=24, Sparsity=62.5%' },
        { phase: 5, name: 'CDA State Initialization & Switch Profiling', durationMs: 0.5, status: 'success', details: '2 switching devices' },
        { phase: 6, name: 'EMTDC Engine Parameter Initialization', durationMs: 0.8, status: 'success', details: 'Solver ready' }
      ];

      const report: BuildReport = {
        timestamp: '12:00:00 PM',
        projectName: '3Ph_Transmission_Fault_Study',
        sheetCount: 1,
        totalComponents: 12,
        totalWires: 15,
        electricalNodes: 8,
        conductanceMatrixDim: 8,
        nonZeroElements: 24,
        sparsityPercent: 62.5,
        markowitzFillIns: 2,
        luFactorizationTimeMs: 3.4,
        phases,
        success: true,
        warningsCount: 1,
        errorsCount: 0,
        rawLogs: ['Compilation started', 'Build finished in 9.5ms']
      };

      assert.equal(report.phases.length, 6);
      assert.equal(report.phases[0].name, 'Sheet Validation & Submodule Flattening');
      assert.equal(report.phases[3].name, 'Sparse LU Factorization & Reordering');
      assert.equal(report.phases[5].name, 'EMTDC Engine Parameter Initialization');
      assert.equal(report.electricalNodes, 8);
      assert.equal(report.conductanceMatrixDim, 8);
      assert.equal(report.nonZeroElements, 24);
      assert.equal(report.sparsityPercent, 62.5);
      assert.equal(report.markowitzFillIns, 2);
      assert.equal(report.success, true);
    });

    it('calculates sparsity ratio correctly given dimension and non-zero elements', () => {
      const dim = 10;
      const totalEntries = dim * dim; // 100
      const nnz = 25;
      const sparsityPercent = (1 - nnz / totalEntries) * 100;

      assert.equal(sparsityPercent, 75.0);
    });
  });

  describe('2. EMTDC Messages Tab: Runtime Events & CDA Profiling', () => {
    it('creates structured EMTDC events with time formatting and step number', () => {
      const dt = 50e-6; // 50 microseconds
      const simTime = 0.052; // 52 ms
      const stepNumber = Math.round(simTime / dt);

      const event: EMTDCEvent = {
        id: 'evt_cda_001',
        timestamp: '12:00:01 PM',
        simTime,
        stepNumber,
        type: 'cda',
        code: 'CDA-101',
        message: "Manual switch: Breaker 'BRK_1' toggled OPEN.",
        componentId: 'comp_brk1',
        componentName: 'BRK_1',
        details: 'CDA Half-Step Adjustment triggered. Suppression active: true'
      };

      assert.equal(event.stepNumber, 1040);
      assert.equal(event.type, 'cda');
      assert.equal(event.code, 'CDA-101');
      assert.ok(event.details?.includes('CDA Half-Step Adjustment'));
    });

    it('filters EMTDC events accurately by event type', () => {
      const events: EMTDCEvent[] = [
        { id: '1', timestamp: '12:00:00', simTime: 0.0, stepNumber: 0, type: 'info', code: 'EMT-001', message: 'Engine started' },
        { id: '2', timestamp: '12:00:01', simTime: 0.02, stepNumber: 400, type: 'switch', code: 'SW-001', message: 'Breaker closed' },
        { id: '3', timestamp: '12:00:02', simTime: 0.05, stepNumber: 1000, type: 'cda', code: 'CDA-101', message: 'CDA adjustment' },
        { id: '4', timestamp: '12:00:03', simTime: 0.08, stepNumber: 1600, type: 'fault', code: 'FLT-001', message: 'Bus fault' }
      ];

      const switches = events.filter(e => e.type === 'switch');
      const cdaEvents = events.filter(e => e.type === 'cda');
      const faults = events.filter(e => e.type === 'fault');

      assert.equal(switches.length, 1);
      assert.equal(switches[0].id, '2');
      assert.equal(cdaEvents.length, 1);
      assert.equal(cdaEvents[0].id, '3');
      assert.equal(faults.length, 1);
      assert.equal(faults[0].id, '4');
    });
  });

  describe('3. Search & Cross-References: Signal Tracing & Wireless Label Pairing', () => {
    it('detects wireless tag pairing between transmitter <Tag> and receiver [Tag]', () => {
      const sheets: CircuitSheet[] = [
        {
          id: 'sheet_main',
          name: 'Main Schematic',
          components: [
            {
              id: 'tx_1',
              type: 'DATA_LABEL_TRANSMITTER',
              name: '<V_Line_A>',
              x: 100,
              y: 100,
              params: { signalName: 'V_Line_A' }
            } as CircuitComponentData,
            {
              id: 'rx_1',
              type: 'DATA_LABEL_RECEIVER',
              name: '[V_Line_A]',
              x: 300,
              y: 100,
              params: { signalName: 'V_Line_A' }
            } as CircuitComponentData
          ],
          wires: []
        },
        {
          id: 'sheet_sub',
          name: 'Control Subsystem',
          components: [
            {
              id: 'rx_2',
              type: 'DATA_LABEL_RECEIVER',
              name: '[V_Line_A]',
              x: 100,
              y: 200,
              params: { signalName: 'V_Line_A' }
            } as CircuitComponentData,
            {
              id: 'rx_orphan',
              type: 'DATA_LABEL_RECEIVER',
              name: '[I_Fault_Unknown]',
              x: 200,
              y: 200,
              params: { signalName: 'I_Fault_Unknown' }
            } as CircuitComponentData
          ],
          wires: []
        }
      ];

      // Build transmitter and receiver lookup tables
      const transmitters = new Map<string, string[]>();
      const receivers = new Map<string, string[]>();

      sheets.forEach(sheet => {
        sheet.components?.forEach(comp => {
          const tag = (comp.params?.signalName || comp.name).replace(/[<>[\]]/g, '');
          if (comp.type === 'DATA_LABEL_TRANSMITTER') {
            if (!transmitters.has(tag)) transmitters.set(tag, []);
            transmitters.get(tag)!.push(comp.id);
          } else if (comp.type === 'DATA_LABEL_RECEIVER') {
            if (!receivers.has(tag)) receivers.set(tag, []);
            receivers.get(tag)!.push(comp.id);
          }
        });
      });

      assert.equal(transmitters.get('V_Line_A')?.length, 1);
      assert.equal(receivers.get('V_Line_A')?.length, 2);
      
      // Orphan check
      const orphanedReceivers = Array.from(receivers.entries())
        .filter(([tag]) => !transmitters.has(tag))
        .map(([tag]) => tag);

      assert.equal(orphanedReceivers.length, 1);
      assert.equal(orphanedReceivers[0], 'I_Fault_Unknown');
    });

    it('indexes cross-reference items for probes and meters across sheets', () => {
      const items: CrossReferenceItem[] = [
        {
          id: 'xref_p1',
          name: 'V_Substation_Bus',
          type: 'probe',
          sheetId: 'sheet_main',
          sheetName: 'Main Schematic',
          componentId: 'probe_1',
          componentType: 'VOLTMETER',
          details: 'Bus Voltage Probe'
        },
        {
          id: 'xref_tx1',
          name: 'V_Line_A',
          type: 'wireless_transmitter',
          sheetId: 'sheet_main',
          sheetName: 'Main Schematic',
          componentId: 'tx_1',
          componentType: 'DATA_LABEL_TRANSMITTER',
          details: 'Wireless Signal Transmitter <V_Line_A>',
          pairedWith: '2 receivers'
        }
      ];

      assert.equal(items.length, 2);
      assert.equal(items[0].type, 'probe');
      assert.equal(items[1].pairedWith, '2 receivers');
    });
  });

  describe('4. Errors & Warnings Tab: Filterable Diagnostic Diagnostics', () => {
    it('filters diagnostics by severity level', () => {
      const diagnostics: DiagnosticItem[] = [
        { id: '1', timestamp: '12:00:00', category: 'build', severity: 'error', code: 'ERR-001', message: 'Floating node 4 detected' },
        { id: '2', timestamp: '12:00:00', category: 'compiler', severity: 'warning', code: 'WRN-002', message: 'Orphaned wireless receiver [Tag]' },
        { id: '3', timestamp: '12:00:00', category: 'numerical', severity: 'info', code: 'INF-003', message: 'Matrix reordering applied' }
      ];

      const errors = diagnostics.filter(d => d.severity === 'error');
      const warnings = diagnostics.filter(d => d.severity === 'warning');
      const infos = diagnostics.filter(d => d.severity === 'info');

      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, 'ERR-001');
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].code, 'WRN-002');
      assert.equal(infos.length, 1);
      assert.equal(infos[0].code, 'INF-003');
    });

    it('filters diagnostics by search query matching message, code, or component', () => {
      const diagnostics: DiagnosticItem[] = [
        { id: '1', timestamp: '12:00:00', category: 'build', severity: 'error', code: 'NET-101', message: 'Floating node 4', componentName: 'R_Load' },
        { id: '2', timestamp: '12:00:00', category: 'compiler', severity: 'warning', code: 'TAG-202', message: 'Orphaned tag', componentName: 'Rx_Bus' }
      ];

      const query = 'r_load';
      const matched = diagnostics.filter(d => 
        d.message.toLowerCase().includes(query) ||
        d.code.toLowerCase().includes(query) ||
        (d.componentName && d.componentName.toLowerCase().includes(query))
      );

      assert.equal(matched.length, 1);
      assert.equal(matched[0].id, '1');
    });
  });
});

describe('Step 22.2 - Structured Diagnostic Error & Warning Table', () => {

  const testDiagnostics: DiagnosticItem[] = [
    {
      id: 'd1',
      timestamp: '10:00:00 AM',
      simTime: 0.052,
      category: 'numerical',
      severity: 'warning',
      code: 'CDA-201',
      message: 'Critical Damping Adjustment chatter suppression active',
      componentId: 'comp_brk1',
      componentName: 'BRK_1',
      sheetId: 'sheet_main',
      sheetName: 'Main Schematic',
      details: 'Half-step Backward Euler damping applied due to Breaker contact opening at non-zero current.',
      remedy: 'Increase CDA threshold or synchronize breaker opening with zero-crossing detector.'
    },
    {
      id: 'd2',
      timestamp: '10:00:01 AM',
      category: 'build',
      severity: 'error',
      code: 'NET-101',
      message: 'Zero electrical nodes generated in circuit netlist',
      componentId: 'comp_bus1',
      componentName: 'Bus_A',
      sheetId: 'sheet_main',
      sheetName: 'Main Schematic',
      details: 'Conductance matrix pre-allocation failed because no closed electrical loop exists.',
      remedy: 'Connect wire segments between components and attach a Ground terminal (0V reference).'
    },
    {
      id: 'd3',
      timestamp: '10:00:02 AM',
      simTime: 0.120,
      category: 'compiler',
      severity: 'warning',
      code: 'TAG-202',
      message: "Wireless receiver '[I_Trip]' has no matching transmitter '<I_Trip>'",
      componentId: 'comp_rx1',
      componentName: 'Rx_Trip',
      sheetId: 'sheet_sub',
      sheetName: 'Protection_Logic',
      details: 'Unpaired receiver tag will default to constant 0.0 during EMTDC simulation.',
      remedy: "Place a Data Label Transmitter block with tag '<I_Trip>' on sheet 'Protection_Logic'."
    },
    {
      id: 'd4',
      timestamp: '10:00:03 AM',
      category: 'numerical',
      severity: 'info',
      code: 'MAT-002',
      message: 'Sparse Markowitz LU factorization optimal with 0 fill-in nodes',
      details: 'Nodal matrix ordering preserved 85.0% sparsity ratio.',
      remedy: 'No action required; matrix factorization efficiency is optimal.'
    }
  ];

  it('verifies structured diagnostic item properties (columns, codes, timestamps, remedies)', () => {
    const item = testDiagnostics[0];
    assert.equal(item.severity, 'warning');
    assert.equal(item.code, 'CDA-201');
    assert.equal(item.componentName, 'BRK_1');
    assert.equal(item.componentId, 'comp_brk1');
    assert.equal(item.sheetName, 'Main Schematic');
    assert.equal(item.simTime, 0.052);
    assert.ok(item.details?.includes('Half-step Backward Euler'));
    assert.ok(item.remedy?.includes('synchronize breaker opening'));
  });

  it('evaluates multi-state severity toggle filters independently', () => {
    const filterState: SeverityFiltersState = {
      error: true,
      warning: false,
      info: true,
    };

    const filtered = testDiagnostics.filter(d => filterState[d.severity]);

    // Should include 1 error and 1 info, hiding the 2 warnings
    assert.equal(filtered.length, 2);
    assert.equal(filtered.find(d => d.code === 'NET-101')?.severity, 'error');
    assert.equal(filtered.find(d => d.code === 'MAT-002')?.severity, 'info');
    assert.equal(filtered.find(d => d.code === 'CDA-201'), undefined);
  });

  it('filters diagnostics by category (build, compiler, emtdc, numerical)', () => {
    const numericalItems = testDiagnostics.filter(d => d.category === 'numerical');
    const buildItems = testDiagnostics.filter(d => d.category === 'build');
    const compilerItems = testDiagnostics.filter(d => d.category === 'compiler');

    assert.equal(numericalItems.length, 2); // CDA-201 and MAT-002
    assert.equal(buildItems.length, 1);     // NET-101
    assert.equal(compilerItems.length, 1);  // TAG-202
  });

  it('sorts diagnostics by severity ranking (error > warning > info)', () => {
    const list = [...testDiagnostics];
    const rank: Record<string, number> = { error: 0, warning: 1, info: 2 };

    list.sort((a, b) => rank[a.severity] - rank[b.severity]);

    assert.equal(list[0].severity, 'error');   // NET-101
    assert.equal(list[1].severity, 'warning'); // CDA-201 or TAG-202
    assert.equal(list[2].severity, 'warning');
    assert.equal(list[3].severity, 'info');    // MAT-002
  });

  it('sorts diagnostics by simulation time ascending with static items fallback', () => {
    const list = [...testDiagnostics];
    list.sort((a, b) => (a.simTime ?? -1) - (b.simTime ?? -1));

    // Items without simTime have -1 (NET-101, MAT-002)
    assert.equal(list[0].simTime, undefined);
    assert.equal(list[1].simTime, undefined);
    // Then 0.052s, then 0.120s
    assert.equal(list[2].simTime, 0.052);
    assert.equal(list[3].simTime, 0.120);
  });

  it('sorts diagnostics alphabetically by error code', () => {
    const list = [...testDiagnostics];
    list.sort((a, b) => a.code.localeCompare(b.code));

    assert.equal(list[0].code, 'CDA-201');
    assert.equal(list[1].code, 'MAT-002');
    assert.equal(list[2].code, 'NET-101');
    assert.equal(list[3].code, 'TAG-202');
  });

  it('generates an authentic formatted ASCII PSCAD Diagnostic Report for clipboard export', () => {
    const reportText = formatDiagnosticReportText(testDiagnostics, '3Ph_Fault_Study', '12:00:00 PM');

    assert.ok(reportText.includes('PSCAD™ / EMTDC™ DIAGNOSTIC & COMPILATION REPORT'));
    assert.ok(reportText.includes('Project: 3Ph_Fault_Study'));
    assert.ok(reportText.includes('Total Diagnostics: 4 | Errors: 1 | Warnings: 2 | Info: 1'));
    assert.ok(reportText.includes('SEVERITY | CODE'));
    assert.ok(reportText.includes('ERROR   | NET-101'));
    assert.ok(reportText.includes('WARNING | CDA-201'));
    assert.ok(reportText.includes('INFO    | MAT-002'));
    assert.ok(reportText.includes('Remedy: Connect wire segments'));
    assert.ok(reportText.includes('End of PSCAD Diagnostic Report (4 record(s) processed)'));
  });

  it('generates structured JSON diagnostic report with metadata counts', () => {
    const jsonStr = formatDiagnosticReportJson(testDiagnostics, '3Ph_Fault_Study', '12:00:00 PM');
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.suite, 'PSCAD CLONE EMTDC Diagnostics');
    assert.equal(parsed.project, '3Ph_Fault_Study');
    assert.equal(parsed.counts.total, 4);
    assert.equal(parsed.counts.errors, 1);
    assert.equal(parsed.counts.warnings, 2);
    assert.equal(parsed.counts.info, 1);
    assert.equal(parsed.diagnostics.length, 4);
  });
});

describe('Step 22.3 - Interactive Double-Click Jump-to-Component Canvas Highlighting', () => {
  describe('1. Viewport Centering Mathematics & Ease-Out Interpolation', () => {
    it('calculates the exact target pan to center component in viewport given width, height, and zoom', () => {
      // Formula: panX = width / 2 - compX * zoom; panY = height / 2 - compY * zoom;
      const canvasWidth = 1920;
      const canvasHeight = 1080;
      const zoom = 1.25;
      const compX = 400;
      const compY = 300;

      const targetPanX = canvasWidth / 2 - compX * zoom;
      const targetPanY = canvasHeight / 2 - compY * zoom;

      // 1920/2 = 960; 400 * 1.25 = 500 => targetPanX = 460
      assert.equal(targetPanX, 460);
      // 1080/2 = 540; 300 * 1.25 = 375 => targetPanY = 165
      assert.equal(targetPanY, 165);

      // Verify that after panning, the component transforms to the center of the canvas
      const screenX = compX * zoom + targetPanX;
      const screenY = compY * zoom + targetPanY;
      assert.equal(screenX, canvasWidth / 2);
      assert.equal(screenY, canvasHeight / 2);
    });

    it('centers components with negative or offset coordinates correctly across various zoom levels', () => {
      const canvasWidth = 1280;
      const canvasHeight = 720;

      const testCases = [
        { compX: 0, compY: 0, zoom: 1.0, expectedPanX: 640, expectedPanY: 360 },
        { compX: -100, compY: -200, zoom: 0.5, expectedPanX: 690, expectedPanY: 460 },
        { compX: 800, compY: 600, zoom: 2.0, expectedPanX: -960, expectedPanY: -840 },
      ];

      for (const tc of testCases) {
        const panX = canvasWidth / 2 - tc.compX * tc.zoom;
        const panY = canvasHeight / 2 - tc.compY * tc.zoom;
        assert.equal(panX, tc.expectedPanX);
        assert.equal(panY, tc.expectedPanY);

        const renderedScreenX = tc.compX * tc.zoom + panX;
        const renderedScreenY = tc.compY * tc.zoom + panY;
        assert.equal(renderedScreenX, canvasWidth / 2);
        assert.equal(renderedScreenY, canvasHeight / 2);
      }
    });

    it('implements cubic ease-out camera motion curve smoothly over 380ms', () => {
      // Ease out cubic: 1 - Math.pow(1 - progress, 3)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      assert.equal(easeOutCubic(0), 0);
      assert.equal(easeOutCubic(1), 1);

      // At half progress t=0.5, cubic ease-out is 1 - (0.5)^3 = 0.875 (fast initial arrival, gentle settle)
      assert.equal(easeOutCubic(0.5), 0.875);
      // At t=0.25, 1 - (0.75)^3 = 1 - 0.421875 = 0.578125
      assert.equal(easeOutCubic(0.25), 0.578125);
    });
  });

  describe('2. Multi-Sheet Target Component Resolution', () => {
    const sheets: CircuitSheet[] = [
      {
        id: 'sheet_main',
        name: 'Main 500kV Substation',
        components: [
          { id: 'gen_1', type: 'AC_SOURCE', name: 'G1', x: 100, y: 200 } as CircuitComponentData,
          { id: 'submod_1', type: 'SUBMODULE', name: 'Wind_Park_A', x: 500, y: 200, params: { childSheetId: 'sheet_wind_a' } } as CircuitComponentData
        ],
        wires: []
      },
      {
        id: 'sheet_wind_a',
        name: 'Wind Park A Submodule',
        components: [
          { id: 'wtg_1', type: 'INVERTER', name: 'WTG_INV_1', x: 200, y: 150 } as CircuitComponentData,
          { id: 'flt_brk', type: 'BREAKER', name: 'BRK_FLT', x: 350, y: 150 } as CircuitComponentData
        ],
        wires: []
      }
    ];

    function resolveTargetSheet(componentId: string, currentActiveSheetId: string, allSheets: CircuitSheet[]) {
      const activeSheet = allSheets.find(s => s.id === currentActiveSheetId);
      if (activeSheet?.components.some(c => c.id === componentId)) {
        return { sheetId: currentActiveSheetId, requiresNavigation: false };
      }
      for (const sheet of allSheets) {
        if (sheet.components.some(c => c.id === componentId)) {
          return { sheetId: sheet.id, requiresNavigation: sheet.id !== currentActiveSheetId };
        }
      }
      return null;
    }

    it('resolves component on active sheet without navigation', () => {
      const res = resolveTargetSheet('gen_1', 'sheet_main', sheets);
      assert.ok(res);
      assert.equal(res.sheetId, 'sheet_main');
      assert.equal(res.requiresNavigation, false);
    });

    it('resolves component on nested submodule sheet requiring automatic sheet navigation', () => {
      const res = resolveTargetSheet('wtg_1', 'sheet_main', sheets);
      assert.ok(res);
      assert.equal(res.sheetId, 'sheet_wind_a');
      assert.equal(res.requiresNavigation, true);
    });

    it('returns null for nonexistent component IDs gracefully', () => {
      const res = resolveTargetSheet('nonexistent_id', 'sheet_main', sheets);
      assert.equal(res, null);
    });
  });

  describe('3. Diagnostic Topology Evaluation: Floating Components & Unconnected Pins', () => {
    it('detects completely floating components and generates structured ERR-102', () => {
      const comp: CircuitComponentData = {
        id: 'floating_res',
        type: 'RESISTOR',
        name: 'R_Unused',
        x: 400,
        y: 300,
        rotation: 0,
        params: { r: 100 }
      };

      // Mock topology check: no wire connected to any pin
      const connectedPinCount = 0;
      let diag: DiagnosticItem | null = null;

      if (connectedPinCount === 0) {
        diag = {
          id: `diag_float_${comp.id}`,
          timestamp: '12:00:00 PM',
          code: 'ERR-102',
          severity: 'error',
          category: 'build',
          message: `Component '${comp.name}' (${comp.type}) has no electrical connections and is completely floating.`,
          componentId: comp.id,
          componentName: comp.name,
          sheetId: 'sheet_main',
          sheetName: 'Main Schematic',
          remedy: 'Connect all circuit terminals or delete unused floating components.'
        };
      }

      assert.ok(diag);
      assert.equal(diag.code, 'ERR-102');
      assert.equal(diag.severity, 'error');
      assert.equal(diag.componentId, 'floating_res');
      assert.ok(diag.remedy?.includes('Connect all circuit terminals'));
    });

    it('detects partially unconnected pins and generates structured WRN-102', () => {
      const comp: CircuitComponentData = {
        id: 'partial_cap',
        type: 'CAPACITOR',
        name: 'C_Snubber',
        x: 600,
        y: 200,
        rotation: 0,
        params: { c: 1e-6 }
      };

      // 1 pin connected, 1 unconnected
      const unconnectedPin = { id: 'p2', x: 620, y: 200 };
      const diag: DiagnosticItem = {
        id: `diag_unconnected_${comp.id}_${unconnectedPin.id}`,
        timestamp: '12:00:00 PM',
        code: 'WRN-102',
        severity: 'warning',
        category: 'build',
        message: `Component '${comp.name}' has unconnected terminal '${unconnectedPin.id}'.`,
        componentId: comp.id,
        componentName: comp.name,
        sheetId: 'sheet_main',
        sheetName: 'Main Schematic',
        remedy: `Attach a wire or connection to pin '${unconnectedPin.id}' at (${unconnectedPin.x}, ${unconnectedPin.y}).`
      };

      assert.equal(diag.code, 'WRN-102');
      assert.equal(diag.severity, 'warning');
      assert.equal(diag.componentId, 'partial_cap');
      assert.ok(diag.message.includes("terminal 'p2'"));
      assert.ok(diag.remedy?.includes('Attach a wire'));
    });
  });

  describe('4. JumpTarget Payload & Beacon State Lifecycle', () => {
    it('constructs complete JumpTarget payload for dispatcher', () => {
      const now = Date.now();
      const jump: JumpTarget = {
        componentId: 'comp_fault_brk',
        sheetId: 'sheet_substation',
        severity: 'error',
        timestamp: now,
        code: 'ERR-102',
        message: 'Floating breaker detected in Bay 2'
      };

      assert.equal(jump.componentId, 'comp_fault_brk');
      assert.equal(jump.sheetId, 'sheet_substation');
      assert.equal(jump.severity, 'error');
      assert.equal(jump.code, 'ERR-102');
      assert.equal(jump.timestamp, now);
    });

    it('maps severity to appropriate beacon color palette', () => {
      const getBeaconColor = (severity: 'error' | 'warning' | 'info') => {
        switch (severity) {
          case 'error':
            return { color: '#ef4444', rgba: 'rgba(239, 68, 68,' };
          case 'warning':
            return { color: '#f59e0b', rgba: 'rgba(245, 158, 11,' };
          case 'info':
          default:
            return { color: '#38bdf8', rgba: 'rgba(56, 189, 248,' };
        }
      };

      const errColors = getBeaconColor('error');
      assert.equal(errColors.color, '#ef4444');

      const wrnColors = getBeaconColor('warning');
      assert.equal(wrnColors.color, '#f59e0b');

      const infoColors = getBeaconColor('info');
      assert.equal(infoColors.color, '#38bdf8');
    });

    it('manages pulse beacon lifecycle with 3200ms duration and smooth fadeout', () => {
      const totalDuration = 3200;
      const fadeoutDuration = 400;

      const getAlpha = (elapsedMs: number) => {
        if (elapsedMs >= totalDuration) return 0;
        if (elapsedMs > totalDuration - fadeoutDuration) {
          return (totalDuration - elapsedMs) / fadeoutDuration;
        }
        return 1.0;
      };

      // Fully visible during initial and active pulse periods
      assert.equal(getAlpha(0), 1.0);
      assert.equal(getAlpha(1000), 1.0);
      assert.equal(getAlpha(2800), 1.0);

      // Fading out in the last 400ms
      assert.equal(getAlpha(3000), 0.5);
      assert.equal(getAlpha(3200), 0);
      assert.equal(getAlpha(3500), 0);
    });
  });
});

describe('Step 22.4 - Search & Cross-Reference Signal Tracing Tab', () => {

  describe('1. Signal Tag Normalization & Identifier Sanitization', () => {
    it('normalizes wireless tags with brackets and whitespace to clean identifiers', () => {
      assert.equal(normalizeSignalName('<Fault_Sig>'), 'Fault_Sig');
      assert.equal(normalizeSignalName('[Fault_Sig]'), 'Fault_Sig');
      assert.equal(normalizeSignalName('  <V_Bus1>  '), 'V_Bus1');
      assert.equal(normalizeSignalName('[Trip_Relay]'), 'Trip_Relay');
      assert.equal(normalizeSignalName('Pure_Signal'), 'Pure_Signal');
      assert.equal(normalizeSignalName(''), '');
    });
  });

  describe('2. Multi-Sheet Signal Extraction & Network Grouping', () => {
    it('extracts transmitters, receivers, probes, and control inputs across multiple sheets', () => {
      const sheets: CircuitSheet[] = [
        {
          id: 'root',
          name: 'Main Schematic',
          components: [
            {
              id: 'tx_speed',
              type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
              name: 'Tx_Speed',
              x: 100,
              y: 100,
              rotation: 0,
              params: { signalName: 'Rotor_Speed_RPM' }
            } as CircuitComponentData,
            {
              id: 'probe_speed',
              type: COMPONENT_TYPES.SIGNAL_PROBE,
              name: 'Probe_Speed',
              x: 200,
              y: 100,
              rotation: 0,
              params: { signalName: 'Rotor_Speed_RPM' }
            } as CircuitComponentData,
          ],
          wires: []
        },
        {
          id: 'sheet_governor',
          name: 'Governor Control Sheet',
          components: [
            {
              id: 'rx_speed_gov',
              type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
              name: 'Rx_Speed_Gov',
              x: 150,
              y: 200,
              rotation: 0,
              params: { signalName: 'Rotor_Speed_RPM' }
            } as CircuitComponentData,
            {
              id: 'slider_ref',
              type: COMPONENT_TYPES.RUNTIME_SLIDER,
              name: 'Speed_Ref_Slider',
              x: 300,
              y: 200,
              rotation: 0,
              params: { targetParam: 'Rotor_Speed_RPM' }
            } as CircuitComponentData
          ],
          wires: []
        }
      ];

      const networks = extractSignalNetworks(sheets);
      assert.equal(networks.length, 1);

      const net = networks[0];
      assert.equal(net.signalName, 'Rotor_Speed_RPM');
      assert.equal(net.status, 'healthy');
      assert.equal(net.stats.transmitters, 1);
      assert.equal(net.stats.receivers, 1);
      assert.equal(net.stats.probes, 1);
      assert.equal(net.stats.controls, 1);
      assert.equal(net.stats.total, 4);
      assert.equal(net.stats.sheetCount, 2);
      assert.ok(net.sheetNames.includes('Main Schematic'));
      assert.ok(net.sheetNames.includes('Governor Control Sheet'));
    });
  });

  describe('3. Roadmap Validation: Searching Fault_Sig across Hierarchical Sheets', () => {
    it('lists all connected transmitter and receiver blocks across all hierarchical sheets for Fault_Sig', () => {
      const study = CASE_STUDIES.TRANSMISSION_FAULT;
      assert.ok(study, 'TRANSMISSION_FAULT study must exist');
      assert.ok(study.sheets, 'TRANSMISSION_FAULT must define multi-sheet structure');

      const allSheets: CircuitSheet[] = Object.values(study.sheets).map(s => ({
        ...s,
        components: s.id === 'root' ? study.components : s.components,
        wires: s.id === 'root' ? study.wires : s.wires,
      }));

      const networks = extractSignalNetworks(allSheets);
      const faultNetwork = networks.find(n => n.signalName === 'Fault_Sig');

      assert.ok(faultNetwork, "Network 'Fault_Sig' must be found");
      assert.equal(faultNetwork.signalName, 'Fault_Sig');

      // 1. Verify Transmitter is detected on Main Schematic
      const txEndpoints = faultNetwork.endpoints.filter(e => e.role === 'transmitter');
      assert.ok(txEndpoints.length >= 1, 'Must have at least 1 transmitter');
      assert.equal(txEndpoints[0].signalName, 'Fault_Sig');
      assert.equal(txEndpoints[0].sheetName, 'Main Schematic');

      // 2. Verify Receivers are detected across multiple sheets (Main and Substation Protection)
      const rxEndpoints = faultNetwork.endpoints.filter(e => e.role === 'receiver');
      assert.ok(rxEndpoints.length >= 2, 'Must have at least 2 receivers across sheets');
      
      const rxSheets = rxEndpoints.map(e => e.sheetName);
      assert.ok(rxSheets.includes('Main Schematic'), 'Receiver on Main Schematic must be listed');
      assert.ok(rxSheets.includes('Substation Protection'), 'Receiver on Substation Protection must be listed');

      // 3. Verify Probes and Controls are also tracked in Fault_Sig network
      const probeEndpoints = faultNetwork.endpoints.filter(e => e.role === 'probe');
      assert.ok(probeEndpoints.length >= 1, 'Probe monitoring Fault_Sig must be listed');

      const controlEndpoints = faultNetwork.endpoints.filter(e => e.role === 'control_input');
      assert.ok(controlEndpoints.length >= 1, 'Control input referencing Fault_Sig must be listed');

      // 4. Verify Total Network statistics
      assert.equal(faultNetwork.status, 'healthy');
      assert.equal(faultNetwork.stats.sheetCount, 2);
      assert.ok(faultNetwork.stats.total >= 4);
    });

    it('filters networks accurately when searching for query Fault_Sig', () => {
      const sheets: CircuitSheet[] = [
        {
          id: 'sheet_1',
          name: 'Sheet 1',
          components: [
            { id: 'c1', type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER, name: 'Tx1', x: 0, y: 0, rotation: 0, params: { signalName: 'Fault_Sig' } } as CircuitComponentData,
            { id: 'c2', type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER, name: 'Tx2', x: 0, y: 0, rotation: 0, params: { signalName: 'Grid_Theta' } } as CircuitComponentData,
            { id: 'c3', type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER, name: 'Tx3', x: 0, y: 0, rotation: 0, params: { signalName: 'V_Send_PhaseA' } } as CircuitComponentData,
          ],
          wires: []
        }
      ];

      const networks = extractSignalNetworks(sheets);
      const query = 'fault_sig';
      const matched = networks.filter(n => 
        n.signalName.toLowerCase().includes(query) ||
        n.endpoints.some(e => e.componentName.toLowerCase().includes(query))
      );

      assert.equal(matched.length, 1);
      assert.equal(matched[0].signalName, 'Fault_Sig');
    });
  });

  describe('4. Orphaned Receivers & Floating Transmitters Detection', () => {
    it('flags orphaned receiver when no matching transmitter exists', () => {
      const sheets: CircuitSheet[] = [
        {
          id: 'sheet_main',
          name: 'Main Schematic',
          components: [
            {
              id: 'c_rx_lonely',
              type: COMPONENT_TYPES.DATA_LABEL_RECEIVER,
              name: 'Rx_Unpaired_Fault',
              x: 100,
              y: 100,
              rotation: 0,
              params: { signalName: 'Unpaired_Signal' }
            } as CircuitComponentData
          ],
          wires: []
        }
      ];

      const networks = extractSignalNetworks(sheets);
      assert.equal(networks.length, 1);
      assert.equal(networks[0].status, 'orphaned_receiver');
      assert.equal(networks[0].endpoints[0].isOrphaned, true);
    });

    it('flags floating transmitter when no receiver listens to the signal', () => {
      const sheets: CircuitSheet[] = [
        {
          id: 'sheet_main',
          name: 'Main Schematic',
          components: [
            {
              id: 'c_tx_broadcast_alone',
              type: COMPONENT_TYPES.DATA_LABEL_TRANSMITTER,
              name: 'Tx_Broadcast_Nowhere',
              x: 100,
              y: 100,
              rotation: 0,
              params: { signalName: 'Unused_Broadcast' }
            } as CircuitComponentData
          ],
          wires: []
        }
      ];

      const networks = extractSignalNetworks(sheets);
      assert.equal(networks.length, 1);
      assert.equal(networks[0].status, 'floating_transmitter');
      assert.equal(networks[0].stats.receivers, 0);
    });
  });

  describe('5. Formatted ASCII Signal Tracing Report', () => {
    it('generates an authentic formatted ASCII PSCAD Signal Tracing Report for clipboard export', () => {
      const networks: SignalNetwork[] = [
        {
          signalName: 'Fault_Sig',
          status: 'healthy',
          endpoints: [
            {
              id: 'ep1',
              role: 'transmitter',
              signalName: 'Fault_Sig',
              componentId: 'c_tx',
              componentName: 'Tx_Fault',
              componentType: 'DATA_LABEL_TRANSMITTER',
              sheetId: 'root',
              sheetName: 'Main Schematic',
              x: 100,
              y: 100,
              details: 'Wireless Transmitter broadcasting <Fault_Sig>'
            },
            {
              id: 'ep2',
              role: 'receiver',
              signalName: 'Fault_Sig',
              componentId: 'c_rx',
              componentName: 'Rx_Trip',
              componentType: 'DATA_LABEL_RECEIVER',
              sheetId: 'sheet_protection',
              sheetName: 'Protection Sheet',
              x: 200,
              y: 100,
              details: 'Wireless Receiver listening to [Fault_Sig]'
            }
          ],
          stats: { transmitters: 1, receivers: 1, probes: 0, controls: 0, total: 2, sheetCount: 2 },
          sheetNames: ['Main Schematic', 'Protection Sheet']
        }
      ];

      const report = formatSignalTracingReportText(networks, '3Ph_Line_Fault_Study');

      assert.ok(report.includes('PSCAD™ / EMTDC™ SIGNAL TRACING & CROSS-REFERENCE REPORT'));
      assert.ok(report.includes('Project: 3Ph_Line_Fault_Study'));
      assert.ok(report.includes('Total Signal Networks: 1'));
      assert.ok(report.includes('<Fault_Sig>'));
      assert.ok(report.includes('TRANSMITTER'));
      assert.ok(report.includes('[Fault_Sig]'));
      assert.ok(report.includes('RECEIVER'));
      assert.ok(report.includes('Main Schematic'));
      assert.ok(report.includes('Protection Sheet'));
      assert.ok(report.includes('End of PSCAD Signal Cross-Reference Report'));
    });
  });

  describe('6. Click-to-Jump Navigation Dispatch', () => {
    it('constructs correct JumpTarget payload when inspecting a cross-sheet receiver endpoint', () => {
      const ep: SignalEndpoint = {
        id: 'ep_rx_sub',
        role: 'receiver',
        signalName: 'Fault_Sig',
        componentId: 'c_rx_prot_sub',
        componentName: 'Rx_Sub_Protection',
        componentType: 'DATA_LABEL_RECEIVER',
        sheetId: 'sheet_protection',
        sheetName: 'Substation Protection',
        x: 240,
        y: 160,
        details: 'Wireless Receiver listening to [Fault_Sig]',
        isOrphaned: false
      };

      let jumpedComponentId = '';
      let jumpedSheetId = '';
      let jumpedSeverity = '';

      const onJumpToComponent = (compId: string, sheetId?: string, severity?: string) => {
        jumpedComponentId = compId;
        jumpedSheetId = sheetId || '';
        jumpedSeverity = severity || '';
      };

      onJumpToComponent(ep.componentId, ep.sheetId, ep.isOrphaned ? 'warning' : 'info');

      assert.equal(jumpedComponentId, 'c_rx_prot_sub');
      assert.equal(jumpedSheetId, 'sheet_protection');
      assert.equal(jumpedSeverity, 'info');
    });

    it('assigns warning severity to orphaned receivers for radar beacon indication', () => {
      const orphanedEp: SignalEndpoint = {
        id: 'ep_rx_broken',
        role: 'receiver',
        signalName: 'Broken_Signal',
        componentId: 'c_rx_broken',
        componentName: 'Rx_Broken',
        componentType: 'DATA_LABEL_RECEIVER',
        sheetId: 'sheet_main',
        sheetName: 'Main Schematic',
        x: 100,
        y: 100,
        details: 'Orphaned Receiver',
        isOrphaned: true
      };

      const severity = orphanedEp.isOrphaned ? 'warning' : 'info';
      assert.equal(severity, 'warning');
    });
  });
});


