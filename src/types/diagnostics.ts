/**
 * PSCAD CLONE - Output Window & Diagnostics Data Structures
 * 
 * Defines structured types for PSCAD's 4-Tab Output Window:
 * - Tab 1: Build (Compiler steps, nodal analysis, sparse LU factorization)
 * - Tab 2: EMTDC Messages (Runtime events, switching, CDA chatter adjustments)
 * - Tab 3: Search & Cross-References (Signal tracing, wireless label pairing)
 * - Tab 4: Errors & Warnings (Filterable diagnostic table with severity badges)
 */

export type OutputTabId = 'build' | 'emtdc' | 'search' | 'errors';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCategory = 'build' | 'emtdc' | 'compiler' | 'numerical';

export interface BuildPhaseStats {
  phase: number;
  name: string;
  durationMs: number;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error';
  details?: string;
}

export interface BuildReport {
  timestamp: string;
  projectName: string;
  sheetCount: number;
  totalComponents: number;
  totalWires: number;
  electricalNodes: number;
  conductanceMatrixDim: number;
  nonZeroElements: number;
  sparsityPercent: number;
  markowitzFillIns: number;
  luFactorizationTimeMs: number;
  phases: BuildPhaseStats[];
  success: boolean;
  warningsCount: number;
  errorsCount: number;
  rawLogs: string[];
}

export interface EMTDCEvent {
  id: string;
  timestamp: string;
  simTime: number; // Simulation time in seconds (e.g. 0.0520)
  stepNumber: number;
  type: 'switch' | 'cda' | 'step_size' | 'refactor' | 'info' | 'warning' | 'fault';
  code: string; // e.g. 'EMT-101', 'CDA-201', 'SW-301'
  message: string;
  componentId?: string;
  componentName?: string;
  details?: string;
}

export type CrossReferenceType = 
  | 'signal' 
  | 'component' 
  | 'wireless_transmitter' 
  | 'wireless_receiver' 
  | 'probe' 
  | 'bus';

export interface CrossReferenceItem {
  id: string;
  name: string;
  type: CrossReferenceType;
  sheetId: string;
  sheetName: string;
  componentId?: string;
  componentType?: string;
  details: string;
  pairedWith?: string;
}

export interface DiagnosticItem {
  id: string;
  timestamp: string;
  simTime?: number;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  code: string; // e.g. 'BLD-101', 'NET-201', 'WRN-301', 'ERR-401'
  message: string;
  componentId?: string;
  componentName?: string;
  sheetId?: string;
  sheetName?: string;
  details?: string;
  remedy?: string; // Step-by-step engineering fix / recommended remedy
}

export type DiagnosticSortField = 'severity' | 'code' | 'message' | 'component' | 'sheet' | 'simTime';
export type SortDirection = 'asc' | 'desc';

export interface SeverityFiltersState {
  error: boolean;
  warning: boolean;
  info: boolean;
}

export interface JumpTarget {
  componentId: string;
  sheetId?: string;
  severity?: DiagnosticSeverity;
  timestamp: number;
  code?: string;
  message?: string;
}

// =========================================================================
// Step 22.4: Signal Tracing & Cross-Reference Data Structures
// =========================================================================

export type SignalRole = 
  | 'transmitter' 
  | 'receiver' 
  | 'probe' 
  | 'control_input' 
  | 'monitored_source' 
  | 'bus';

export type SignalNetworkStatus = 
  | 'healthy' 
  | 'orphaned_receiver' 
  | 'floating_transmitter' 
  | 'control_linked' 
  | 'monitored_only';

export interface SignalEndpoint {
  id: string;
  role: SignalRole;
  signalName: string;
  componentId: string;
  componentName: string;
  componentType: string;
  sheetId: string;
  sheetName: string;
  x: number;
  y: number;
  details: string;
  isOrphaned?: boolean;
  paramKey?: string;
}

export interface SignalNetwork {
  signalName: string;
  status: SignalNetworkStatus;
  endpoints: SignalEndpoint[];
  stats: {
    transmitters: number;
    receivers: number;
    probes: number;
    controls: number;
    total: number;
    sheetCount: number;
  };
  sheetNames: string[];
}

/**
 * Generates an authentic tabular ASCII PSCAD Signal Tracing & Cross-Reference Report
 */
export function formatSignalTracingReportText(
  networks: SignalNetwork[],
  projectName: string = 'Active Project',
  timestamp: string = new Date().toLocaleTimeString()
): string {
  const healthyCount = networks.filter((n) => n.status === 'healthy').length;
  const orphanedCount = networks.filter((n) => n.status === 'orphaned_receiver').length;
  const floatingCount = networks.filter((n) => n.status === 'floating_transmitter').length;
  const totalEndpoints = networks.reduce((acc, n) => acc + n.endpoints.length, 0);

  const header = [
    '====================================================================================================',
    'PSCAD™ / EMTDC™ SIGNAL TRACING & CROSS-REFERENCE REPORT',
    `Project: ${projectName} | Generated: ${timestamp}`,
    `Total Signal Networks: ${networks.length} | Endpoints: ${totalEndpoints} | Paired: ${healthyCount} | Orphaned: ${orphanedCount} | Floating: ${floatingCount}`,
    '====================================================================================================',
    sprintfColumns(['SIGNAL NAME', 'ROLE', 'STATUS', 'SHEET / MODULE', 'COMPONENT', 'DETAILS']),
    '----------------------------------------------------------------------------------------------------',
  ];

  const rows: string[] = [];

  networks.forEach((net) => {
    net.endpoints.forEach((ep) => {
      const sigTag = (ep.role === 'transmitter' ? `<${net.signalName}>` : ep.role === 'receiver' ? `[${net.signalName}]` : net.signalName).slice(0, 16).padEnd(16);
      const roleStr = ep.role.toUpperCase().replace(/_/g, ' ').slice(0, 14).padEnd(14);
      const statusStr = (ep.isOrphaned ? 'ORPHANED' : net.status.toUpperCase().replace(/_/g, ' ')).slice(0, 12).padEnd(12);
      const sheetStr = ep.sheetName.slice(0, 16).padEnd(16);
      const compStr = (ep.componentName || ep.componentId).slice(0, 16).padEnd(16);
      const detailsStr = ep.details;

      rows.push(`${sigTag} | ${roleStr} | ${statusStr} | ${sheetStr} | ${compStr} | ${detailsStr}`);
    });
  });

  const footer = [
    '----------------------------------------------------------------------------------------------------',
    `End of PSCAD Signal Cross-Reference Report (${networks.length} signal network(s), ${totalEndpoints} endpoint(s))`,
    '====================================================================================================',
  ];

  return [...header, ...rows, ...footer].join('\n');
}

/**
 * Generates an authentic tabular ASCII PSCAD Diagnostic Report suitable for clipboard copying and troubleshooting
 */
export function formatDiagnosticReportText(
  diagnostics: DiagnosticItem[],
  projectName: string = 'Active Project',
  timestamp: string = new Date().toLocaleTimeString()
): string {
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  const header = [
    '========================================================================================',
    'PSCAD™ / EMTDC™ DIAGNOSTIC & COMPILATION REPORT',
    `Project: ${projectName} | Generated: ${timestamp}`,
    `Total Diagnostics: ${diagnostics.length} | Errors: ${errorCount} | Warnings: ${warningCount} | Info: ${infoCount}`,
    '========================================================================================',
    sprintfColumns(['SEVERITY', 'CODE', 'SIM TIME', 'SHEET / MODULE', 'COMPONENT', 'MESSAGE']),
    '----------------------------------------------------------------------------------------',
  ];

  const rows = diagnostics.map((d) => {
    const sev = d.severity.toUpperCase().padEnd(7);
    const code = (d.code || 'GEN-001').padEnd(9);
    const time = (d.simTime !== undefined ? `t=${d.simTime.toFixed(4)}s` : 'Static').padEnd(10);
    const sheet = (d.sheetName || 'Main Schematic').slice(0, 16).padEnd(16);
    const comp = (d.componentName || d.componentId || '—').slice(0, 14).padEnd(14);
    const msg = d.message + (d.remedy ? ` [Remedy: ${d.remedy}]` : '');

    return `${sev} | ${code} | ${time} | ${sheet} | ${comp} | ${msg}`;
  });

  const footer = [
    '----------------------------------------------------------------------------------------',
    `End of PSCAD Diagnostic Report (${diagnostics.length} record(s) processed)`,
    '========================================================================================',
  ];

  return [...header, ...rows, ...footer].join('\n');
}

function sprintfColumns(cols: string[]): string {
  const [sev, code, time, sheet, comp, msg] = cols;
  return `${sev.padEnd(7)} | ${code.padEnd(9)} | ${time.padEnd(10)} | ${sheet.padEnd(16)} | ${comp.padEnd(14)} | ${msg}`;
}

/**
 * Formats diagnostics array as a JSON string with metadata
 */
export function formatDiagnosticReportJson(
  diagnostics: DiagnosticItem[],
  projectName: string = 'Active Project',
  timestamp: string = new Date().toLocaleTimeString()
): string {
  const payload = {
    suite: 'PSCAD CLONE EMTDC Diagnostics',
    project: projectName,
    timestamp,
    counts: {
      total: diagnostics.length,
      errors: diagnostics.filter((d) => d.severity === 'error').length,
      warnings: diagnostics.filter((d) => d.severity === 'warning').length,
      info: diagnostics.filter((d) => d.severity === 'info').length,
    },
    diagnostics,
  };
  return JSON.stringify(payload, null, 2);
}


