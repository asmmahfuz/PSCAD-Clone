/**
 * PSCAD CLONE - Canvas-Embedded Graph Frame Signal & Probe Binding Engine
 * Phase 18 - Step 18.2
 *
 * Provides comprehensive signal routing, multi-trace overlay resolution,
 * probe channel discovery, distinct PSCAD waveform color assignment,
 * engineering unit inference, and interactive trace visibility toggling.
 */

import { COMPONENT_TYPES, WAVEFORM_COLORS } from '../../constants';
import type { CircuitComponentData } from '../../types';

export interface BoundTrace {
  /** Unique trace identifier */
  id: string;
  /** Simulation kernel telemetry signal identifier (e.g. 'V_Load_PhaseA', 'I_Bus1') */
  signalName: string;
  /** Source component ID if linked to a schematic probe */
  probeId?: string;
  /** Source component type (e.g. 'voltmeter', 'ammeter', 'multimeter') */
  probeType?: string;
  /** User-facing display label */
  label: string;
  /** Engineering unit string (e.g. 'V', 'kV', 'A', 'kA', 'MW', 'MVAR', 'Hz', 'p.u.') */
  unit?: string;
  /** Curve hex color */
  color: string;
  /** Trace visibility toggle state */
  visible: boolean;
  /** Optional gain factor for unit scaling */
  gain?: number;
  /** Optional offset */
  offset?: number;
  /** Optional custom Y range limits */
  yMin?: number;
  yMax?: number;
  /** Sub-grid index (0-indexed) for PolyGraph stacked tracks */
  subGridIndex?: number;
}

export interface ProbeChannelInfo {
  id: string;
  componentId: string;
  componentName: string;
  componentType: string;
  signalName: string;
  label: string;
  unit: string;
  category: string;
}

export interface LegendItemGeometry {
  trace: BoundTrace;
  x: number;
  y: number;
  w: number;
  h: number;
  valueStr: string;
  unitStr: string;
  color: string;
  visible: boolean;
}

export class GraphBindingManager {
  /**
   * Check if a component type is a measurement probe, meter, or signal source
   */
  static isProbeComponent(type: string): boolean {
    return (
      type === COMPONENT_TYPES.VOLTMETER ||
      type === COMPONENT_TYPES.AMMETER ||
      type === COMPONENT_TYPES.MULTIMETER ||
      type === COMPONENT_TYPES.SIGNAL_PROBE ||
      type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER ||
      type === COMPONENT_TYPES.DATA_LABEL_RECEIVER ||
      type.startsWith('csmf_')
    );
  }

  /**
   * Smart unit inference based on signal identifier name and component type
   */
  static inferUnitFromSignal(sigName: string, compType?: string): string {
    const s = sigName.toLowerCase();

    // Type-based inference first
    if (compType === COMPONENT_TYPES.VOLTMETER) return 'V';
    if (compType === COMPONENT_TYPES.AMMETER) return 'A';

    // 1. Per-unit / Duty / Generic
    if (s.includes('_pu') || s.endsWith('pu')) return 'p.u.';
    if (s.includes('duty') || s.includes('mod')) return '%';

    // 2. Reactive / Active / Apparent Power signatures
    if (s.includes('mvar') || s.includes('kvar') || s.includes('_var') || s.startsWith('q_') || s.includes('q_react')) return 'MVAR';
    if (s.includes('mw') || s.includes('kw') || s.startsWith('p_') || s.includes('p_act')) return 'MW';
    if (s.includes('mva') || s.includes('kva') || s.startsWith('s_')) return 'MVA';

    // 2. Frequency / Speed / Angle
    if (s.includes('freq') || s.includes('hz') || s.startsWith('f_')) return 'Hz';
    if (s.includes('omega') || s.includes('speed') || s.includes('rad')) return 'rad/s';
    if (s.includes('rpm')) return 'RPM';
    if (s.includes('deg') || s.includes('angle') || s.includes('theta') || s.includes('delta')) return 'deg';

    // 3. Voltage signatures
    if (
      s.startsWith('v_') ||
      s.startsWith('v(') ||
      s.startsWith('volt') ||
      s.endsWith('_v') ||
      s.includes('_va') ||
      s.includes('_vb') ||
      s.includes('_vc') ||
      s.startsWith('vload') ||
      s.startsWith('vsrc') ||
      s.startsWith('vbus') ||
      s.includes('kv')
    ) {
      if (s.includes('kv')) return 'kV';
      if (s.includes('mv')) return 'MV';
      return 'V';
    }

    // 4. Current signatures
    if (
      s.startsWith('i_') ||
      s.startsWith('i(') ||
      s.startsWith('curr') ||
      s.endsWith('_a') ||
      s.includes('_ia') ||
      s.includes('_ib') ||
      s.includes('_ic') ||
      s.startsWith('iload') ||
      s.startsWith('isrc') ||
      s.startsWith('ibrk') ||
      s.includes('ka')
    ) {
      if (s.includes('ka')) return 'kA';
      return 'A';
    }

    return 'p.u.';
  }

  /**
   * Discover all available probe measurement channels across all components on schematic
   */
  static getAvailableProbes(components: CircuitComponentData[]): ProbeChannelInfo[] {
    const channels: ProbeChannelInfo[] = [];

    for (const comp of components) {
      const type = comp.type;
      const compName = comp.name || comp.id;
      const sigName = comp.params?.signalName || compName;
      const customUnit = comp.params?.unit;

      if (type === COMPONENT_TYPES.VOLTMETER) {
        channels.push({
          id: `${comp.id}_volts`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: compName,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName, type),
          category: 'Voltage Probes',
        });
      } else if (type === COMPONENT_TYPES.AMMETER) {
        channels.push({
          id: `${comp.id}_amps`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: compName,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName, type),
          category: 'Current Probes',
        });
      } else if (type === COMPONENT_TYPES.MULTIMETER) {
        const baseName = sigName || compName;
        const mmChannels = [
          { key: 'Va', suffix: '_Va', label: `${baseName} (Va)`, unit: 'V' },
          { key: 'Vb', suffix: '_Vb', label: `${baseName} (Vb)`, unit: 'V' },
          { key: 'Vc', suffix: '_Vc', label: `${baseName} (Vc)`, unit: 'V' },
          { key: 'Ia', suffix: '_Ia', label: `${baseName} (Ia)`, unit: 'A' },
          { key: 'Ib', suffix: '_Ib', label: `${baseName} (Ib)`, unit: 'A' },
          { key: 'Ic', suffix: '_Ic', label: `${baseName} (Ic)`, unit: 'A' },
          { key: 'P', suffix: '_P', label: `${baseName} (P)`, unit: 'MW' },
          { key: 'Q', suffix: '_Q', label: `${baseName} (Q)`, unit: 'MVAR' },
          { key: 'Freq', suffix: '_Freq', label: `${baseName} (Freq)`, unit: 'Hz' },
        ];

        for (const ch of mmChannels) {
          channels.push({
            id: `${comp.id}${ch.suffix}`,
            componentId: comp.id,
            componentName: compName,
            componentType: type,
            signalName: `${baseName}${ch.suffix}`,
            label: ch.label,
            unit: ch.unit,
            category: 'Multimeters (3-Phase)',
          });
        }
      } else if (type === COMPONENT_TYPES.SIGNAL_PROBE) {
        channels.push({
          id: `${comp.id}_probe`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: compName,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName, type),
          category: 'Signal Probes',
        });
      } else if (type === COMPONENT_TYPES.DATA_LABEL_TRANSMITTER || type === COMPONENT_TYPES.DATA_LABEL_RECEIVER) {
        channels.push({
          id: `${comp.id}_label`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: `<${sigName}>`,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName),
          category: 'Wireless Data Labels',
        });
      } else if (comp.params?.monitored) {
        channels.push({
          id: `${comp.id}_monitored`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: `${compName} (monitored)`,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName),
          category: 'Monitored Components',
        });
      } else if (type.startsWith('csmf_')) {
        channels.push({
          id: `${comp.id}_csmf`,
          componentId: comp.id,
          componentName: compName,
          componentType: type,
          signalName: sigName,
          label: `${compName} [CSMF]`,
          unit: customUnit || GraphBindingManager.inferUnitFromSignal(sigName),
          category: 'Control Blocks (CSMF)',
        });
      }
    }

    return channels;
  }

  /**
   * Resolve complete BoundTrace list for a Graph Frame from its parameters,
   * matching with schematic probes and available signals.
   */
  static resolveTracesForFrame(
    frame: CircuitComponentData,
    allComponents: CircuitComponentData[] = [],
    signalsMap?: Map<string, number[]>
  ): BoundTrace[] {
    const params = frame.params || {};
    const hiddenSet = new Set<string>(params.graphHiddenSignals || []);

    // 1. If explicit `traces` array is configured in params
    if (Array.isArray(params.traces) && params.traces.length > 0) {
      return params.traces.map((tr: any, idx: number) => {
        const sigName = tr.signalName || tr.id || `Signal_${idx + 1}`;
        const color = tr.color || WAVEFORM_COLORS[idx % WAVEFORM_COLORS.length];
        const isHiddenBySet = hiddenSet.has(sigName);
        const visible = tr.visible !== undefined ? tr.visible && !isHiddenBySet : !isHiddenBySet;
        const probe = allComponents.find((c) => c.id === tr.probeId || c.name === sigName || c.params?.signalName === sigName);

        return {
          id: tr.id || `trace_${idx}_${sigName}`,
          signalName: sigName,
          probeId: tr.probeId || probe?.id,
          probeType: tr.probeType || probe?.type,
          label: tr.label || probe?.name || sigName,
          unit: tr.unit || probe?.params?.unit || GraphBindingManager.inferUnitFromSignal(sigName, probe?.type),
          color,
          visible,
          gain: tr.gain,
          offset: tr.offset,
          yMin: tr.yMin,
          yMax: tr.yMax,
          subGridIndex: tr.subGridIndex,
        };
      });
    }

    // 2. Extract signal names from `graphSignals` or fallback `signalName`
    let signalNames: string[] = [];
    if (Array.isArray(params.graphSignals) && params.graphSignals.length > 0) {
      signalNames = [...params.graphSignals];
    } else if (params.signalName) {
      signalNames = [params.signalName];
    } else if (signalsMap && signalsMap.size > 1) {
      // Pick first 3 non-time signals if available
      for (const k of signalsMap.keys()) {
        if (k !== 'Time') {
          signalNames.push(k);
          if (signalNames.length >= 3) break;
        }
      }
    }

    // Map into BoundTrace list
    return signalNames.map((sigName, idx) => {
      const probe = allComponents.find((c) => c.params?.signalName === sigName || c.name === sigName || c.id === sigName);
      const isHidden = hiddenSet.has(sigName);
      const color = WAVEFORM_COLORS[idx % WAVEFORM_COLORS.length];

      return {
        id: `trace_${idx}_${sigName}`,
        signalName: sigName,
        probeId: probe?.id,
        probeType: probe?.type,
        label: probe?.name || sigName,
        unit: probe?.params?.unit || GraphBindingManager.inferUnitFromSignal(sigName, probe?.type),
        color,
        visible: !isHidden,
      };
    });
  }

  /**
   * Bind a probe or signal channel to a Graph Frame
   */
  static bindProbeToFrame(
    frame: CircuitComponentData,
    probeOrChannel: CircuitComponentData | ProbeChannelInfo | { signalName: string; label?: string; unit?: string; id?: string },
    allComponents: CircuitComponentData[] = []
  ): CircuitComponentData {
    const existingTraces = GraphBindingManager.resolveTracesForFrame(frame, allComponents);

    let signalName = '';
    let label = '';
    let unit = '';
    let probeId: string | undefined;
    let probeType: string | undefined;

    if ('componentType' in probeOrChannel) {
      // ProbeChannelInfo
      signalName = probeOrChannel.signalName;
      label = probeOrChannel.label;
      unit = probeOrChannel.unit;
      probeId = probeOrChannel.componentId;
      probeType = probeOrChannel.componentType;
    } else if ('type' in probeOrChannel) {
      // CircuitComponentData
      signalName = probeOrChannel.params?.signalName || probeOrChannel.name || probeOrChannel.id;
      label = probeOrChannel.name || signalName;
      unit = probeOrChannel.params?.unit || GraphBindingManager.inferUnitFromSignal(signalName, probeOrChannel.type);
      probeId = probeOrChannel.id;
      probeType = probeOrChannel.type;
    } else {
      // Raw signal descriptor
      signalName = probeOrChannel.signalName;
      label = probeOrChannel.label || signalName;
      unit = probeOrChannel.unit || GraphBindingManager.inferUnitFromSignal(signalName);
      probeId = probeOrChannel.id;
    }

    if (!signalName) return frame;

    // Check if already present
    const existingIndex = existingTraces.findIndex((t) => t.signalName === signalName);
    let nextTraces = [...existingTraces];

    if (existingIndex >= 0) {
      // Make sure it is set visible
      nextTraces[existingIndex] = {
        ...nextTraces[existingIndex],
        visible: true,
      };
    } else {
      const nextColor = WAVEFORM_COLORS[nextTraces.length % WAVEFORM_COLORS.length];
      const newTrace: BoundTrace = {
        id: `trace_${nextTraces.length}_${signalName}`,
        signalName,
        probeId,
        probeType,
        label,
        unit,
        color: nextColor,
        visible: true,
      };
      nextTraces.push(newTrace);
    }

    const nextGraphSignals = nextTraces.map((t) => t.signalName);
    const nextHidden = nextTraces.filter((t) => !t.visible).map((t) => t.signalName);

    return {
      ...frame,
      params: {
        ...frame.params,
        traces: nextTraces,
        graphSignals: nextGraphSignals,
        graphHiddenSignals: nextHidden,
      },
    };
  }

  /**
   * Remove a signal or trace from a Graph Frame
   */
  static unbindTraceFromFrame(
    frame: CircuitComponentData,
    signalNameOrId: string,
    allComponents: CircuitComponentData[] = []
  ): CircuitComponentData {
    const existingTraces = GraphBindingManager.resolveTracesForFrame(frame, allComponents);
    const nextTraces = existingTraces.filter((t) => t.signalName !== signalNameOrId && t.id !== signalNameOrId);
    const nextGraphSignals = nextTraces.map((t) => t.signalName);
    const nextHidden = nextTraces.filter((t) => !t.visible).map((t) => t.signalName);

    return {
      ...frame,
      params: {
        ...frame.params,
        traces: nextTraces,
        graphSignals: nextGraphSignals,
        graphHiddenSignals: nextHidden,
      },
    };
  }

  /**
   * Toggle visibility of a specific curve on a Graph Frame
   */
  static toggleTraceVisibility(
    frame: CircuitComponentData,
    signalNameOrId: string,
    allComponents: CircuitComponentData[] = []
  ): CircuitComponentData {
    const existingTraces = GraphBindingManager.resolveTracesForFrame(frame, allComponents);
    const nextTraces = existingTraces.map((t) => {
      if (t.signalName === signalNameOrId || t.id === signalNameOrId) {
        return { ...t, visible: !t.visible };
      }
      return t;
    });

    const nextHidden = nextTraces.filter((t) => !t.visible).map((t) => t.signalName);

    return {
      ...frame,
      params: {
        ...frame.params,
        traces: nextTraces,
        graphHiddenSignals: nextHidden,
      },
    };
  }

  /**
   * Set custom trace color
   */
  static setTraceColor(
    frame: CircuitComponentData,
    signalNameOrId: string,
    color: string,
    allComponents: CircuitComponentData[] = []
  ): CircuitComponentData {
    const existingTraces = GraphBindingManager.resolveTracesForFrame(frame, allComponents);
    const nextTraces = existingTraces.map((t) => {
      if (t.signalName === signalNameOrId || t.id === signalNameOrId) {
        return { ...t, color };
      }
      return t;
    });

    return {
      ...frame,
      params: {
        ...frame.params,
        traces: nextTraces,
      },
    };
  }

  /**
   * Find Graph Frame component at given world coordinates
   */
  static findGraphFrameAt(components: CircuitComponentData[], wx: number, wy: number): CircuitComponentData | null {
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      if (c.type === COMPONENT_TYPES.GRAPH_FRAME) {
        const w = c.params?.graphWidth || 360;
        const h = c.params?.graphHeight || 200;
        if (wx >= c.x && wx <= c.x + w && wy >= c.y && wy <= c.y + h) {
          return c;
        }
      }
    }
    return null;
  }
}
