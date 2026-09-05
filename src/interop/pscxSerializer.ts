/**
 * PSCAD CLONE - Official MHI PSCAD .pscx XML Project Serializer
 * 
 * Generates official MHI PSCAD v4 / v5 compliant .pscx XML files from PSCAD CLONE CircuitProjects:
 * - Emits valid XML headers, <project>, <paramlist>, <definitions>, <schematic>, <User>, <Wire>
 * - Bidirectional translation mapping to PSCAD standard master library components
 * - Encodes schematic coordinates, rotations, component parameter sets, and multi-segment wire nets
 */

import { COMPONENT_TYPES } from '../constants';
import type { CircuitProject } from '../types';


/**
 * Reverse mapping from PSCAD CLONE component types to PSCAD Master library definitions
 */
const TYPE_TO_PSCAD_MASTER: Record<string, string> = {
  [COMPONENT_TYPES.AC_SOURCE_1PH]: 'master:source_1p',
  [COMPONENT_TYPES.AC_SOURCE_3PH]: 'master:source_3p',
  [COMPONENT_TYPES.DC_SOURCE]: 'master:dc_source',
  [COMPONENT_TYPES.RESISTOR]: 'master:resistor',
  [COMPONENT_TYPES.INDUCTOR]: 'master:inductor',
  [COMPONENT_TYPES.CAPACITOR]: 'master:capacitor',
  [COMPONENT_TYPES.GROUND]: 'master:ground',
  [COMPONENT_TYPES.SERIES_RLC]: 'master:series_rlc',
  [COMPONENT_TYPES.SURGE_ARRESTER]: 'master:surge_arrester',
  [COMPONENT_TYPES.BREAKER_1PH]: 'master:breaker_1p',
  [COMPONENT_TYPES.BREAKER_3PH]: 'master:breaker_3p',
  [COMPONENT_TYPES.TIMED_SWITCH]: 'master:timed_switch',
  [COMPONENT_TYPES.FAULT_BLOCK]: 'master:fault_3p',
  [COMPONENT_TYPES.IDEAL_SWITCH]: 'master:ideal_switch',
  [COMPONENT_TYPES.TRANSFORMER_1PH]: 'master:transformer_1p',
  [COMPONENT_TYPES.TRANSFORMER_3PH]: 'master:transformer_3p',
  [COMPONENT_TYPES.UMEC_TRANSFORMER_3PH]: 'master:umec_transformer',
  [COMPONENT_TYPES.PI_LINE]: 'master:pi_section',
  [COMPONENT_TYPES.BERGERON_LINE_1PH]: 'master:bergeron_line_1ph',
  [COMPONENT_TYPES.BERGERON_LINE_3PH]: 'master:tline',
  [COMPONENT_TYPES.FD_PHASE_LINE]: 'master:fd_phase_line',
  [COMPONENT_TYPES.DIODE]: 'master:diode',
  [COMPONENT_TYPES.THYRISTOR]: 'master:thyristor',
  [COMPONENT_TYPES.IGBT_DIODE]: 'master:igbt',
  [COMPONENT_TYPES.MMC_CONVERTER_3PH]: 'master:mmc_dem',
  [COMPONENT_TYPES.LCC_BRIDGE_6PULSE]: 'master:graetz_bridge',
  [COMPONENT_TYPES.STATCOM]: 'master:statcom',
  [COMPONENT_TYPES.SVC]: 'master:svc',
  [COMPONENT_TYPES.SYNC_GENERATOR]: 'master:sync_gen',
  [COMPONENT_TYPES.SYNC_MACHINE_DQ]: 'master:sync_machine',
  [COMPONENT_TYPES.INDUCTION_MACHINE]: 'master:ind_machine',
  [COMPONENT_TYPES.DFIG_GENERATOR]: 'master:dfig',
  [COMPONENT_TYPES.PMSG_GENERATOR]: 'master:pmsg',
  [COMPONENT_TYPES.WIND_TURBINE_AERO]: 'master:wind_turbine',
  [COMPONENT_TYPES.VOLTMETER]: 'master:voltmeter',
  [COMPONENT_TYPES.AMMETER]: 'master:ammeter',
  [COMPONENT_TYPES.MULTIMETER]: 'master:multimeter',
  [COMPONENT_TYPES.SIGNAL_PROBE]: 'master:probe',
  [COMPONENT_TYPES.CSMF_CONSTANT]: 'master:constant',
  [COMPONENT_TYPES.CSMF_GAIN]: 'master:gain',
  [COMPONENT_TYPES.CSMF_INTEGRATOR]: 'master:integrator',
  [COMPONENT_TYPES.CSMF_PID]: 'master:pid',
  [COMPONENT_TYPES.CSMF_SUM]: 'master:sum',
  [COMPONENT_TYPES.CSMF_MULTIPLIER]: 'master:multiplier',
  [COMPONENT_TYPES.CSMF_DIVIDER]: 'master:divider',
  [COMPONENT_TYPES.CSMF_COMPARATOR]: 'master:comparator',
  [COMPONENT_TYPES.CSMF_LIMITER]: 'master:limiter',
  [COMPONENT_TYPES.CSMF_RATE_LIMITER]: 'master:rate_limiter',
  [COMPONENT_TYPES.CSMF_DEADBAND]: 'master:deadband',
  [COMPONENT_TYPES.CSMF_HYSTERESIS]: 'master:hysteresis',
  [COMPONENT_TYPES.CSMF_TRANSFER_FUNCTION_S]: 'master:transfer_function',
  [COMPONENT_TYPES.CSMF_FILTER_Z]: 'master:filter_z',
  [COMPONENT_TYPES.CSMF_PLL]: 'master:pll',
  [COMPONENT_TYPES.CSMF_SPWM]: 'master:spwm',
  [COMPONENT_TYPES.CSMF_SVPWM]: 'master:svpwm',
  [COMPONENT_TYPES.CSMF_CLARKE]: 'master:clarke',
  [COMPONENT_TYPES.CSMF_PARK]: 'master:park',
  [COMPONENT_TYPES.GOV_IEEEG1]: 'master:gov_ieeeg1',
  [COMPONENT_TYPES.GOV_HYGOV]: 'master:gov_hygov',
  [COMPONENT_TYPES.AVR_AC1A]: 'master:avr_ac1a',
  [COMPONENT_TYPES.AVR_ST1A]: 'master:avr_st1a',
  [COMPONENT_TYPES.PSS_PSS1A]: 'master:pss_pss1a',
  [COMPONENT_TYPES.PSS_PSS2B]: 'master:pss_pss2b',
  [COMPONENT_TYPES.RELAY_OVERCURRENT_50_51]: 'master:relay_overcurrent',
  [COMPONENT_TYPES.RELAY_DISTANCE_21]: 'master:relay_distance',
  [COMPONENT_TYPES.RELAY_DIFFERENTIAL_87]: 'master:relay_differential',
  [COMPONENT_TYPES.SUBMODULE]: 'master:submodule',
  [COMPONENT_TYPES.RUNTIME_SLIDER]: 'master:slider',
  [COMPONENT_TYPES.RUNTIME_DIAL]: 'master:dial',
  [COMPONENT_TYPES.RUNTIME_BUTTON]: 'master:button',
  [COMPONENT_TYPES.RUNTIME_SWITCH]: 'master:switch',
  [COMPONENT_TYPES.RUNTIME_GAUGE]: 'master:gauge',
  [COMPONENT_TYPES.DATA_LABEL_TRANSMITTER]: 'master:data_transmitter',
  [COMPONENT_TYPES.DATA_LABEL_RECEIVER]: 'master:data_receiver',
};

export class PscxSerializer {
  /**
   * Serializes a CircuitProject into standard PSCAD .pscx XML
   */
  public static serialize(project: CircuitProject, pscadVersion: string = '5.0.0'): string {
    const dtMicro = (project.dt * 1e6).toFixed(2);
    const totalTime = project.tMax.toFixed(3);
    const projName = escapeXml(project.name || 'PSCAD_Project');

    const lines: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<project name="${projName}" version="${pscadVersion}" schema="1.0">`,
      `  <paramlist name="Settings">`,
      `    <param name="time_step" value="${dtMicro}" />`,
      `    <param name="total_time" value="${totalTime}" />`,
      `    <param name="frequency" value="60.0" />`,
      `    <param name="plot_step" value="${dtMicro}" />`,
      `    <param name="start_time" value="0.0" />`,
      `  </paramlist>`,
      `  <definitions>`,
      `    <definition name="Main" type="schematic">`,
      `      <schematic>`,
      `        <components>`,
    ];

    // Emit components
    for (let i = 0; i < project.components.length; i++) {
      const comp = project.components[i];
      const pscadMaster = TYPE_TO_PSCAD_MASTER[comp.type] || `master:${comp.type}`;
      const compId = comp.id.replace(/^c_/i, '') || `${i + 101}`;

      lines.push(
        `          <User classid="UserCmp" name="${pscadMaster}" id="${compId}" x="${comp.x}" y="${comp.y}" rot="${comp.rotation || 0}">`
      );
      lines.push(`            <paramlist name="Parameters">`);

      if (comp.name) {
        lines.push(`              <param name="Name" value="${escapeXml(comp.name)}" />`);
      }

      for (const [key, val] of Object.entries(comp.params || {})) {
        if (val !== undefined && val !== null) {
          lines.push(`              <param name="${key}" value="${escapeXml(String(val))}" />`);
        }
      }

      lines.push(`            </paramlist>`);
      lines.push(`          </User>`);
    }

    lines.push(`        </components>`);
    lines.push(`        <wires>`);

    // Emit wires
    for (let i = 0; i < project.wires.length; i++) {
      const wire = project.wires[i];
      const wireId = wire.id.replace(/^w_/i, '') || `${i + 201}`;

      lines.push(`          <Wire id="${wireId}">`);
      lines.push(`            <Nodes>`);
      for (const pt of wire.points) {
        lines.push(`              <Node x="${Math.round(pt.x)}" y="${Math.round(pt.y)}" />`);
      }
      lines.push(`            </Nodes>`);
      lines.push(`          </Wire>`);
    }

    lines.push(`        </wires>`);
    lines.push(`      </schematic>`);
    lines.push(`    </definition>`);
    lines.push(`  </definitions>`);
    lines.push(`</project>`);

    return lines.join('\n');
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
