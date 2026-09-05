/**
 * PSCAD Modern - TypeScript Type Definitions
 */

export type ThemeType = 'dark' | 'light' | 'blueprint';

export type ComponentCategory = 
  | 'Sources & Generators'
  | 'Passive RLC'
  | 'Switches & Breakers'
  | 'Transformers & Lines'
  | 'Power Electronics'
  | 'Machines & Drives'
  | 'Control Blocks (CSMF)'
  | 'Meters & Probes'
  | 'Busbars & Connectors';

export type PinDomain = 'electrical' | 'control' | 'polyphase';
export type PinDirection = 'in' | 'out' | 'bidirectional';
export type SignalDataType = 'real' | 'integer' | 'boolean' | 'vector3' | 'polyphase';

export interface Pin {
  id: string;
  name: string;
  x: number;
  y: number;
  localX: number;
  localY: number;
  componentId: string;
  isConnected?: boolean;
  domain?: PinDomain;
  direction?: PinDirection;
  dataType?: SignalDataType;
}

export interface CompilerDiagnostic {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  componentId?: string;
  pinId?: string;
  wireId?: string;
}

export interface ComponentParams {
  resistance?: number;
  inductance?: number;
  capacitance?: number;
  voltage?: number;
  isRms?: boolean;
  freq?: number;
  phaseDeg?: number;
  rampTime?: number;
  internalRs?: number;
  initClosed?: boolean;
  openTime?: number;
  closeTime?: number;
  Ron?: number;
  Roff?: number;
  faultType?: '3LG' | 'SLG_A' | 'LL_AB';
  startTime?: number;
  duration?: number;
  faultResistance?: number;
  V1_nom?: number;
  V2_nom?: number;
  MVA_rating?: number;
  leakageReactancePu?: number;
  windingLossPu?: number;
  enableSaturation?: boolean;
  kneeFluxPu?: number;
  lengthKm?: number;
  R_per_km?: number;
  L_per_km?: number;
  C_per_km?: number;
  R_self_per_km?: number;
  R_mutual_per_km?: number;
  L_self_per_km?: number;
  L_mutual_per_km?: number;
  C_self_per_km?: number;
  C_mutual_per_km?: number;
  Zc_aerial?: number;
  Zc_ground?: number;
  v_aerial?: number;
  v_ground?: number;
  signalName?: string;
  unit?: string;
  monitored?: boolean;
  Sn_MVA?: number;
  Vn_kV?: number;
  H?: number;
  D?: number;
  Xd?: number;
  Xq?: number;
  Xd_prime?: number;
  Xq_prime?: number;
  Xd_pp?: number;
  Xq_pp?: number;
  Xl?: number;
  Ra?: number;
  Rs?: number;
  Rr?: number;
  Xls?: number;
  Xlr?: number;
  Xm?: number;
  Td0_prime?: number;
  Tq0_prime?: number;
  Td0_pp?: number;
  Tq0_pp?: number;
  useMultiMassShaft?: boolean;
  H_hp?: number;
  H_ip?: number;
  H_lp?: number;
  H_gen?: number;
  K_hp_ip?: number;
  K_ip_lp?: number;
  K_lp_gen?: number;
  coreType?: string;
  primaryConn?: string;
  secondaryConn?: string;
  satSlopeRatio?: number;
  zeroSeqReluctance?: number;
  machineType?: string;
  windSpeed?: number;
  Pref_pu?: number;
  Qref_pu?: number;
  Cdc_F?: number;
  Vdc_ref_pu?: number;
  R_crowbar_pu?: number;
  crowbarThreshold_pu?: number;
  lambda_pm?: number;
  poles?: number;
  V_ref?: number;
  I_ref?: number;
  alpha1?: number;
  alpha2?: number;
  alpha3?: number;
  // Power Electronics & FACTS
  Vf?: number;
  Qrr?: number;
  trr?: number;
  I_holding?: number;
  firingAngleDeg?: number;
  alphaDeg?: number;
  gammaMinDeg?: number;
  numSubmodules?: number;
  C_submodule?: number;
  Vdc_nom?: number;
  Pac_ref?: number;
  Qac_ref?: number;
  L_arm?: number;
  R_arm?: number;
  modulationIndex?: number;
  carrierFreq?: number;
  Q_rating_MVAR?: number;
  V_ac_nom?: number;
  Kp_v?: number;
  Ki_v?: number;
  Kp_i?: number;
  Ki_i?: number;
  B_max_pu?: number;
  B_min_pu?: number;
  num_tsc_banks?: number;
  L_tcr?: number;
  C_tsc?: number;
  // CSMF Controls (Phase 5)
  gain?: number;
  offset?: number;
  mathOp?: 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan2' | 'ln' | 'exp' | 'sqrt' | 'abs' | 'square' | 'inv' | 'log10';
  minMaxMode?: 'min' | 'max';
  logicOp?: 'AND' | 'OR' | 'XOR' | 'NOT' | 'NAND' | 'NOR';
  threshold?: number;
  edgeType?: 'rising' | 'falling' | 'both';
  flipFlopType?: 'RS' | 'D' | 'JK' | 'T';
  compOp?: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ';
  hysteresisWidth?: number;
  limitMin?: number;
  limitMax?: number;
  rateUp?: number;
  rateDown?: number;
  deadbandWidth?: number;
  backlashGap?: number;
  lutX?: number[];
  lutY?: number[];
  lutZ?: number[][];
  numInputs?: number;
  signs?: string[];
  intMin?: number;
  intMax?: number;
  pidKp?: number;
  pidKi?: number;
  pidKd?: number;
  pidTf?: number;
  pidMin?: number;
  pidMax?: number;
  pllFreq?: number;
  pllKp?: number;
  pllKi?: number;
  deadTimeSec?: number;
  spwmCarrierFreq?: number;
  svpwmSampleTime?: number;
  fir6AlphaDeg?: number;
  polyphaseOrder?: number;
  // Phase 6: Submodules & Hierarchical Ports
  childSheetId?: string;
  portId?: string;
  portDirection?: 'in' | 'out' | 'bidirectional';
  portDomain?: PinDomain;
  portDataType?: SignalDataType;
  // Phase 6: Runtime Controls
  minValue?: number;
  maxValue?: number;
  step?: number;
  value?: number;
  label?: string;
  unitLabel?: string;
  knobAngle?: number;
  orientation?: 'horizontal' | 'vertical';
  buttonState?: boolean;
  switchState?: boolean;
  dialPrecision?: number;
  gaugeMax?: number;
  gaugeMin?: number;
  gaugeLowAlarm?: number;
  gaugeHighAlarm?: number;
  displayFormat?: 'fixed' | 'scientific' | 'hex' | 'binary';
  customDefId?: string;
  // Phase 18: Canvas-Embedded Graph Frames & PolyGraphs
  graphWidth?: number;
  graphHeight?: number;
  graphTitle?: string;
  graphSignals?: string[];
  graphHiddenSignals?: string[];
  traces?: any[];
  graphTimeSpan?: [number, number];
  graphYRange?: [number, number];
  graphAutoScale?: boolean;
  graphShowGrid?: boolean;
  graphShowLegend?: boolean;
  graphShowCrosshair?: boolean;
  graphMode?: 'overlay' | 'stacked' | 'polygraph';
  isPolyGraph?: boolean;
  numSubGrids?: number;
  subGrids?: any[];
  crosshairTime?: number;
  [key: string]: any;
}

export interface CircuitComponentData {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  flippedH?: boolean;
  flippedV?: boolean;
  bypassed?: boolean;
  definitionId?: string;
  params: ComponentParams;
  selected?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface WireData {
  id: string;
  startPin: string | null;
  endPin: string | null;
  points: Point[];
  phase?: 'normal' | 'phaseA' | 'phaseB' | 'phaseC' | 'neutral';
  domain?: PinDomain;
  dataType?: SignalDataType;
  selected?: boolean;
}

// Phase 6: Hierarchical Sheet System
export interface CircuitSheet {
  id: string;
  name: string;
  parentSheetId?: string | null;
  parentComponentId?: string | null;
  components: CircuitComponentData[];
  wires: WireData[];
}

export interface TitleBlockData {
  title: string;
  docNumber: string;
  rev: string;
  author: string;
  company: string;
  date: string;
  sheetIndex: number;
  sheetTotal: number;
  showBorder: boolean;
  showTitleBlock: boolean;
  borderStandard: 'ANSI_A' | 'ANSI_B' | 'ANSI_C' | 'ISO_A4' | 'ISO_A3';
}

// Phase 6: Custom User Component Workshop
export interface CustomShapeDef {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'polyline' | 'text' | 'path';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  points?: Point[];
  text?: string;
  pathData?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
}

export interface CustomPinDef {
  id: string;
  name: string;
  localX: number;
  localY: number;
  domain: PinDomain;
  direction: PinDirection;
  dataType?: SignalDataType;
}

export interface CustomParamDef {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  default: any;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
}

export interface CustomComponentDef {
  id: string;
  name: string;
  category: string;
  description: string;
  shapes: CustomShapeDef[];
  pins: CustomPinDef[];
  parameters: CustomParamDef[];
  scriptCode: string; // e.g. (inputs, params, state, dt, t) => { outputs, state }
  createdAt: number;
  updatedAt: number;
}

// Phase 17: Official PSCAD Component Definition Hierarchy
export type DefinitionCategory = 'submodule' | 'custom' | 'master' | 'macro' | 'primitive';

export interface ComponentDefinition {
  id: string;
  name: string;
  category: DefinitionCategory;
  description?: string;
  baseType: string;
  ports: CustomPinDef[];
  parameters: CustomParamDef[];
  defaultParams: ComponentParams;
  childSheetId?: string;
  scriptCode?: string;
  shapes?: CustomShapeDef[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  filePath?: string;
  active: boolean;
  dt: number;
  tMax: number;
  components: CircuitComponentData[];
  wires: WireData[];
  sheets: Record<string, CircuitSheet>;
  rootSheetId: string;
  activeSheetId: string;
  definitions?: Record<string, ComponentDefinition>;
  customComponents?: CustomComponentDef[];
  titleBlock?: TitleBlockData;
  resources?: {
    lcpFiles?: string[];
    cableModels?: string[];
    snapshots?: string[];
    comtradeLogs?: string[];
    scripts?: string[];
  };
}

export interface CircuitProject {
  name: string;
  version: string;
  dt: number;
  tMax: number;
  components: CircuitComponentData[];
  wires: WireData[];
  sheets?: Record<string, CircuitSheet>;
  rootSheetId?: string;
  definitions?: Record<string, ComponentDefinition>;
  customComponents?: CustomComponentDef[];
  titleBlock?: TitleBlockData;
  resources?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  type: 'info' | 'warning' | 'error';
  text: string;
  time: string;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  t: number;
  tMax: number;
  dt: number;
  stepCount: number;
  speedMultiplier: number;
  nodeCount: number;
}

export interface HarmonicItem {
  order: number;
  freq: number;
  mag: number;
  percent: number;
}

export interface FftResult {
  thdPercent: number;
  fundamentalMag: number;
  harmonics: HarmonicItem[];
  dcMag: number;
  freqBinResolution: number;
}

export interface PhasorVector {
  name: string;
  mag: number;
  phaseDeg: number;
  color: string;
}

export type AlignAction = 
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignTop'
  | 'alignMiddle'
  | 'alignBottom'
  | 'distributeHorizontally'
  | 'distributeVertically';

