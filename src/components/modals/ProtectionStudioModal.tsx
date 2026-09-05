import React, { useState, useMemo } from 'react';
import {
  Shield,
  Activity,
  Sliders,
  Zap,
  X,
  BarChart3,
  TrendingUp,
  Compass,
} from 'lucide-react';
import {
  OvercurrentRelay,
  type CurveFamily,
} from '../../engine/protection/overcurrentRelay';
import {
  DistanceRelay,
  type Complex,
} from '../../engine/protection/distanceRelay';
import {
  DifferentialRelay,
  type VectorGroup,
} from '../../engine/protection/differentialRelay';
import { GeneratorProtectionRelay } from '../../engine/protection/generatorProtection';
import { CurrentTransformer } from '../../engine/passives/instrumentTransformers';

interface ProtectionStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtectionStudioModal: React.FC<ProtectionStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tcc' | 'distance' | 'differential' | 'ct' | 'generator'>('tcc');

  // 1. TCC Overcurrent State
  const [curveType, setCurveType] = useState<CurveFamily>('IEC_STANDARD_INVERSE');
  const [pickupI, setPickupI] = useState<number>(5.0);
  const [timeDial, setTimeDial] = useState<number>(1.0);
  const [enable50, setEnable50] = useState<boolean>(true);
  const [instPickup, setInstPickup] = useState<number>(25.0);
  const [testCurrent, setTestCurrent] = useState<number>(15.0);

  // 2. Distance Relay State
  const [charTypeZ1, setCharTypeZ1] = useState<'MHO' | 'QUADRILATERAL'>('MHO');
  const [z1Reach, setZ1Reach] = useState<number>(8.0);
  const [z2Reach, setZ2Reach] = useState<number>(12.0);
  const [z3Reach, setZ3Reach] = useState<number>(16.0);
  const [lineAngleDeg, setLineAngleDeg] = useState<number>(80.0);
  const [faultR, setFaultR] = useState<number>(2.0);
  const [faultX, setFaultX] = useState<number>(5.0);
  const [enableLoadEncroach, setEnableLoadEncroach] = useState<boolean>(true);

  // 3. Differential Relay State
  const [diffPickup, setDiffPickup] = useState<number>(0.3);
  const [slope1, setSlope1] = useState<number>(0.25);
  const [slope2, setSlope2] = useState<number>(0.65);
  const [kneeI, setKneeI] = useState<number>(2.0);
  const [unrestrainedPickup, setUnrestrainedPickup] = useState<number>(8.0);
  const [testI1, setTestI1] = useState<number>(1.0);
  const [testI2, setTestI2] = useState<number>(1.0);
  const [test2ndHarmonic, setTest2ndHarmonic] = useState<number>(0.05); // 5%
  const [test5thHarmonic, setTest5thHarmonic] = useState<number>(0.02); // 2%
  const [vectorGroup, setVectorGroup] = useState<VectorGroup>('Yd1');

  // 4. CT Saturation State
  const [ctRatioPrimary, setCtRatioPrimary] = useState<number>(1200);
  const [ctRatioSecondary, setCtRatioSecondary] = useState<number>(5);
  const [ctBurdenR, setCtBurdenR] = useState<number>(2.0);
  const [ctKneeFlux, setCtKneeFlux] = useState<number>(1.8);
  const [ctRemanencePu, setCtRemanencePu] = useState<number>(0.4);
  const [ctDcOffsetPu, setCtDcOffsetPu] = useState<number>(0.8);
  const [primaryFaultCurrent, setPrimaryFaultCurrent] = useState<number>(12000); // 10x rated

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn select-none font-sans text-xs">
      <div className="w-[1020px] h-[680px] bg-[#121620] border border-[#263147] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-10 px-4 bg-[#181f2f] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-sky-500/20 rounded-md border border-sky-500/40 text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                Protection Studio & ANSI Relay Suite
                <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] rounded font-mono">
                  IEEE C37 / IEC 60255
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="h-9 px-4 bg-[#151a27] border-b border-[#263147] flex items-center gap-1 shrink-0">
          <TabButton
            active={activeTab === 'tcc'}
            onClick={() => setActiveTab('tcc')}
            icon={<Sliders className="w-3.5 h-3.5 text-sky-400" />}
            label="ANSI 50/51 TCC Curves"
          />
          <TabButton
            active={activeTab === 'distance'}
            onClick={() => setActiveTab('distance')}
            icon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
            label="ANSI 21 Distance & R-X Plane"
          />
          <TabButton
            active={activeTab === 'differential'}
            onClick={() => setActiveTab('differential')}
            icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            label="ANSI 87 Differential & Harmonics"
          />
          <TabButton
            active={activeTab === 'ct'}
            onClick={() => setActiveTab('ct')}
            icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
            label="CT Core Saturation Waveforms"
          />
          <TabButton
            active={activeTab === 'generator'}
            onClick={() => setActiveTab('generator')}
            icon={<Activity className="w-3.5 h-3.5 text-rose-400" />}
            label="ANSI 81/40/78 Generator Protection"
          />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0d111a]">
          {activeTab === 'tcc' && (
            <TccStudioTab
              curveType={curveType}
              setCurveType={setCurveType}
              pickupI={pickupI}
              setPickupI={setPickupI}
              timeDial={timeDial}
              setTimeDial={setTimeDial}
              enable50={enable50}
              setEnable50={setEnable50}
              instPickup={instPickup}
              setInstPickup={setInstPickup}
              testCurrent={testCurrent}
              setTestCurrent={setTestCurrent}
            />
          )}

          {activeTab === 'distance' && (
            <DistanceStudioTab
              charTypeZ1={charTypeZ1}
              setCharTypeZ1={setCharTypeZ1}
              z1Reach={z1Reach}
              setZ1Reach={setZ1Reach}
              z2Reach={z2Reach}
              setZ2Reach={setZ2Reach}
              z3Reach={z3Reach}
              setZ3Reach={setZ3Reach}
              lineAngleDeg={lineAngleDeg}
              setLineAngleDeg={setLineAngleDeg}
              faultR={faultR}
              setFaultR={setFaultR}
              faultX={faultX}
              setFaultX={setFaultX}
              enableLoadEncroach={enableLoadEncroach}
              setEnableLoadEncroach={setEnableLoadEncroach}
            />
          )}

          {activeTab === 'differential' && (
            <DifferentialStudioTab
              diffPickup={diffPickup}
              setDiffPickup={setDiffPickup}
              slope1={slope1}
              setSlope1={setSlope1}
              slope2={slope2}
              setSlope2={setSlope2}
              kneeI={kneeI}
              setKneeI={setKneeI}
              unrestrainedPickup={unrestrainedPickup}
              setUnrestrainedPickup={setUnrestrainedPickup}
              testI1={testI1}
              setTestI1={setTestI1}
              testI2={testI2}
              setTestI2={setTestI2}
              test2ndHarmonic={test2ndHarmonic}
              setTest2ndHarmonic={setTest2ndHarmonic}
              test5thHarmonic={test5thHarmonic}
              setTest5thHarmonic={setTest5thHarmonic}
              vectorGroup={vectorGroup}
              setVectorGroup={setVectorGroup}
            />
          )}

          {activeTab === 'ct' && (
            <CtSaturationStudioTab
              ctRatioPrimary={ctRatioPrimary}
              setCtRatioPrimary={setCtRatioPrimary}
              ctRatioSecondary={ctRatioSecondary}
              setCtRatioSecondary={setCtRatioSecondary}
              ctBurdenR={ctBurdenR}
              setCtBurdenR={setCtBurdenR}
              ctKneeFlux={ctKneeFlux}
              setCtKneeFlux={setCtKneeFlux}
              ctRemanencePu={ctRemanencePu}
              setCtRemanencePu={setCtRemanencePu}
              ctDcOffsetPu={ctDcOffsetPu}
              setCtDcOffsetPu={setCtDcOffsetPu}
              primaryFaultCurrent={primaryFaultCurrent}
              setPrimaryFaultCurrent={setPrimaryFaultCurrent}
            />
          )}

          {activeTab === 'generator' && <GeneratorStudioTab />}
        </div>
      </div>
    </div>
  );
};

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium text-xs transition-all border-b-2 ${
        active
          ? 'bg-[#1a2233] text-white border-sky-400 font-semibold shadow-sm'
          : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#181f2f]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// =========================================================================
// TAB 1: TCC Overcurrent Curve Studio (ANSI 50/51)
// =========================================================================
function TccStudioTab({
  curveType,
  setCurveType,
  pickupI,
  setPickupI,
  timeDial,
  setTimeDial,
  enable50,
  setEnable50,
  instPickup,
  setInstPickup,
  testCurrent,
  setTestCurrent,
}: {
  curveType: CurveFamily;
  setCurveType: (v: CurveFamily) => void;
  pickupI: number;
  setPickupI: (v: number) => void;
  timeDial: number;
  setTimeDial: (v: number) => void;
  enable50: boolean;
  setEnable50: (v: boolean) => void;
  instPickup: number;
  setInstPickup: (v: number) => void;
  testCurrent: number;
  setTestCurrent: (v: number) => void;
}) {
  const relay = useMemo(() => {
    return new OvercurrentRelay('relay_tcc', {
      curveType,
      pickupCurrent: pickupI,
      timeDial,
      enable50,
      instantaneousPickup: instPickup,
    });
  }, [curveType, pickupI, timeDial, enable50, instPickup]);

  const tripTimeAtTest = relay.calculateTripTime(testCurrent);
  const is50Tripped = enable50 && testCurrent >= instPickup;

  // Generate Log-Log TCC SVG Points
  // Range: I = 1.05 * pickup to 50 * pickup
  const svgWidth = 560;
  const svgHeight = 360;

  const logMinI = Math.log10(pickupI * 0.9);
  const logMaxI = Math.log10(pickupI * 40);
  const logMinT = Math.log10(0.01); // 10 ms
  const logMaxT = Math.log10(100.0); // 100 s

  const iToX = (iVal: number) => {
    const logI = Math.log10(Math.max(1e-3, iVal));
    return 40 + ((logI - logMinI) / (logMaxI - logMinI)) * (svgWidth - 60);
  };

  const tToY = (tVal: number) => {
    const logT = Math.log10(Math.max(1e-3, tVal));
    return svgHeight - 30 - ((logT - logMinT) / (logMaxT - logMinT)) * (svgHeight - 50);
  };

  // Build curve path
  const curvePoints: string[] = [];
  const numSteps = 80;
  for (let s = 1; s <= numSteps; s++) {
    const mult = 1.02 + Math.pow(s / numSteps, 2) * 38;
    const current = pickupI * mult;
    if (enable50 && current >= instPickup) break;
    const t = relay.calculateTripTime(current);
    if (isFinite(t) && t > 0.005) {
      const x = iToX(current);
      const y = tToY(t);
      curvePoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  const polylineStr = curvePoints.join(' ');

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Left Column: Settings Panel */}
      <div className="col-span-4 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-[#263147] pb-1.5">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Relay Settings & Curves</span>
        </h3>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">TCC Curve Family</label>
            <select
              value={curveType}
              onChange={(e) => setCurveType(e.target.value as CurveFamily)}
              className="w-full bg-[#0d111a] border border-[#263147] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="IEC_STANDARD_INVERSE">IEC Standard Inverse (Class A)</option>
              <option value="IEC_VERY_INVERSE">IEC Very Inverse (Class B)</option>
              <option value="IEC_EXTREMELY_INVERSE">IEC Extremely Inverse (Class C)</option>
              <option value="IEC_LONG_TIME_INVERSE">IEC Long-Time Inverse</option>
              <option value="IEEE_MODERATELY_INVERSE">IEEE Moderately Inverse (US)</option>
              <option value="IEEE_VERY_INVERSE">IEEE Very Inverse (US)</option>
              <option value="IEEE_EXTREMELY_INVERSE">IEEE Extremely Inverse (US)</option>
              <option value="IEEE_SHORT_TIME_INVERSE">IEEE Short-Time Inverse (US)</option>
              <option value="DEFINITE_TIME">Definite Time</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Pickup Current (Is):</span>
              <span className="text-sky-300 font-mono font-bold">{pickupI.toFixed(1)} A</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={pickupI}
              onChange={(e) => setPickupI(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Time Dial / Multiplier (TD / TMS):</span>
              <span className="text-sky-300 font-mono font-bold">{timeDial.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="5.0"
              step="0.05"
              value={timeDial}
              onChange={(e) => setTimeDial(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-[#263147]">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={enable50}
                  onChange={(e) => setEnable50(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                <span>Enable ANSI 50 (Instantaneous)</span>
              </label>
              <span className="text-rose-400 font-mono font-bold">{instPickup.toFixed(1)} A</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              disabled={!enable50}
              value={instPickup}
              onChange={(e) => setInstPickup(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer disabled:opacity-30"
            />
          </div>
        </div>

        {/* Test Injection Probe */}
        <div className="mt-auto bg-[#0f141f] p-2.5 rounded border border-[#263147] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Fault Current Injection</span>
            </span>
            <span className="text-amber-400 font-mono font-bold text-xs">{testCurrent.toFixed(1)} A</span>
          </div>
          <input
            type="range"
            min="1"
            max="60"
            step="0.5"
            value={testCurrent}
            onChange={(e) => setTestCurrent(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#0a0d14] rounded accent-amber-400 cursor-pointer"
          />

          <div className="p-2 bg-[#090d14] rounded text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Multiple of Pickup:</span>
              <span className="font-mono text-slate-200">{(testCurrent / pickupI).toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trip Operating Time:</span>
              <span className="font-mono font-bold text-emerald-400">
                {is50Tripped
                  ? '< 0.010 s (50 Inst)'
                  : isFinite(tripTimeAtTest)
                  ? `${tripTimeAtTest.toFixed(3)} s`
                  : 'No Trip (I < Is)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Log-Log TCC Plot */}
      <div className="col-span-8 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span>Time-Current Characteristic (TCC Log-Log Plot)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">IEEE Std C37.112 / IEC 60255-151</span>
        </div>

        <div className="flex-1 bg-[#090c14] border border-[#263147] rounded flex items-center justify-center p-2 relative overflow-hidden">
          <svg width={svgWidth} height={svgHeight} className="overflow-visible select-none">
            {/* Grid lines (Log axes) */}
            {/* Decade grid lines for Time: 0.01, 0.1, 1, 10, 100 */}
            {[0.01, 0.1, 1.0, 10.0, 100.0].map((tVal) => {
              const y = tToY(tVal);
              return (
                <g key={tVal}>
                  <line x1={40} y1={y} x2={svgWidth - 20} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={35} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                    {tVal >= 1 ? tVal.toFixed(0) : tVal.toFixed(2)}s
                  </text>
                </g>
              );
            })}

            {/* Current vertical ticks */}
            {[pickupI, pickupI * 2, pickupI * 5, pickupI * 10, pickupI * 20].map((iVal) => {
              const x = iToX(iVal);
              return (
                <g key={iVal}>
                  <line x1={x} y1={20} x2={x} y2={svgHeight - 30} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={x} y={svgHeight - 15} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                    {iVal.toFixed(0)}A
                  </text>
                </g>
              );
            })}

            {/* 51 Time-Overcurrent Curve */}
            {polylineStr && (
              <polyline
                points={polylineStr}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* 50 Instantaneous Step Line */}
            {enable50 && (
              <g>
                <line
                  x1={iToX(instPickup)}
                  y1={tToY(relay.calculateTripTime(instPickup))}
                  x2={iToX(instPickup)}
                  y2={tToY(0.01)}
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                />
                <line
                  x1={iToX(instPickup)}
                  y1={tToY(0.01)}
                  x2={svgWidth - 20}
                  y2={tToY(0.01)}
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                />
                <text x={iToX(instPickup) + 4} y={tToY(0.015)} fill="#f43f5e" fontSize="9" fontWeight="bold">
                  50 INST ({instPickup}A)
                </text>
              </g>
            )}

            {/* Test Current Marker */}
            {testCurrent >= pickupI && isFinite(tripTimeAtTest) && (
              <g>
                <circle
                  cx={iToX(testCurrent)}
                  y={tToY(is50Tripped ? 0.01 : tripTimeAtTest)}
                  r="5"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <line
                  x1={iToX(testCurrent)}
                  y1={20}
                  x2={iToX(testCurrent)}
                  y2={svgHeight - 30}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: ANSI 21 Distance Protection & R-X Plane Studio
// =========================================================================
function DistanceStudioTab({
  charTypeZ1,
  setCharTypeZ1,
  z1Reach,
  setZ1Reach,
  z2Reach,
  setZ2Reach,
  z3Reach,
  setZ3Reach,
  lineAngleDeg,
  setLineAngleDeg,
  faultR,
  setFaultR,
  faultX,
  setFaultX,
  enableLoadEncroach,
  setEnableLoadEncroach,
}: {
  charTypeZ1: 'MHO' | 'QUADRILATERAL';
  setCharTypeZ1: (v: 'MHO' | 'QUADRILATERAL') => void;
  z1Reach: number;
  setZ1Reach: (v: number) => void;
  z2Reach: number;
  setZ2Reach: (v: number) => void;
  z3Reach: number;
  setZ3Reach: (v: number) => void;
  lineAngleDeg: number;
  setLineAngleDeg: (v: number) => void;
  faultR: number;
  setFaultR: (v: number) => void;
  faultX: number;
  setFaultX: (v: number) => void;
  enableLoadEncroach: boolean;
  setEnableLoadEncroach: (v: boolean) => void;
}) {
  const lineRad = (lineAngleDeg * Math.PI) / 180;
  const lineZ1: Complex = { r: Math.cos(lineRad) * 10.0, i: Math.sin(lineRad) * 10.0 };
  const lineZ0: Complex = { r: lineZ1.r * 3.0, i: lineZ1.i * 3.0 };

  const relay = useMemo(() => {
    return new DistanceRelay('relay_dist', {
      lineZ1,
      lineZ0,
      zone1: {
        enabled: true,
        reachZ1Mag: z1Reach,
        reachZ1AngDeg: lineAngleDeg,
        timeDelay: 0.0,
        characteristic: charTypeZ1,
        reachX: z1Reach * Math.sin(lineRad),
        reachRRight: z1Reach * Math.cos(lineRad) + 4.0,
        reachRLeft: z1Reach * Math.cos(lineRad) + 4.0,
      },
      zone2: {
        enabled: true,
        reachZ1Mag: z2Reach,
        reachZ1AngDeg: lineAngleDeg,
        timeDelay: 0.3,
        characteristic: 'MHO',
      },
      zone3: {
        enabled: true,
        reachZ1Mag: z3Reach,
        reachZ1AngDeg: lineAngleDeg,
        timeDelay: 0.8,
        characteristic: 'MHO',
      },
      enableLoadEncroachment: enableLoadEncroach,
      loadEncroachmentR: 12.0,
      loadEncroachmentAngleDeg: 30.0,
    });
  }, [z1Reach, z2Reach, z3Reach, lineAngleDeg, charTypeZ1, enableLoadEncroach]);

  const faultZ: Complex = { r: faultR, i: faultX };
  const inZ1 = relay.isInsideZone(faultZ, relay.settings.zone1);
  const inZ2 = relay.isInsideZone(faultZ, relay.settings.zone2);
  const inZ3 = relay.isInsideZone(faultZ, relay.settings.zone3);

  // SVG R-X coordinate conversion
  const svgSize = 360;
  const scale = 11.0; // pixels per Ohm
  const originX = svgSize / 2;
  const originY = svgSize / 2 + 60;

  const rxToSvg = (r: number, x: number) => ({
    x: originX + r * scale,
    y: originY - x * scale,
  });

  const z1Center = rxToSvg(
    (z1Reach / 2) * Math.cos(lineRad),
    (z1Reach / 2) * Math.sin(lineRad)
  );
  const z1Radius = (z1Reach / 2) * scale;

  const z2Center = rxToSvg(
    (z2Reach / 2) * Math.cos(lineRad),
    (z2Reach / 2) * Math.sin(lineRad)
  );
  const z2Radius = (z2Reach / 2) * scale;

  const z3Center = rxToSvg(
    (z3Reach / 2) * Math.cos(lineRad),
    (z3Reach / 2) * Math.sin(lineRad)
  );
  const z3Radius = (z3Reach / 2) * scale;

  const faultSvg = rxToSvg(faultR, faultX);

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Left: Distance Settings */}
      <div className="col-span-5 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-[#263147] pb-1.5">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span>Zone Reach & Characteristic</span>
        </h3>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Zone 1 Characteristic</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setCharTypeZ1('MHO')}
                className={`py-1 rounded text-xs font-semibold ${
                  charTypeZ1 === 'MHO'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#0d111a] text-slate-400 hover:text-white'
                }`}
              >
                Mho Circle
              </button>
              <button
                onClick={() => setCharTypeZ1('QUADRILATERAL')}
                className={`py-1 rounded text-xs font-semibold ${
                  charTypeZ1 === 'QUADRILATERAL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#0d111a] text-slate-400 hover:text-white'
                }`}
              >
                Quadrilateral
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Zone 1 Reach (Instantaneous):</span>
              <span className="text-indigo-300 font-mono font-bold">{z1Reach.toFixed(1)} Ω</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={z1Reach}
              onChange={(e) => setZ1Reach(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Zone 2 Reach (+300ms Delay):</span>
              <span className="text-indigo-300 font-mono font-bold">{z2Reach.toFixed(1)} Ω</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="0.5"
              value={z2Reach}
              onChange={(e) => setZ2Reach(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Zone 3 Reach (+800ms Backup):</span>
              <span className="text-indigo-300 font-mono font-bold">{z3Reach.toFixed(1)} Ω</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="0.5"
              value={z3Reach}
              onChange={(e) => setZ3Reach(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Line Impedance Angle:</span>
              <span className="text-indigo-300 font-mono font-bold">{lineAngleDeg.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="1"
              value={lineAngleDeg}
              onChange={(e) => setLineAngleDeg(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-[#263147]">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={enableLoadEncroach}
                onChange={(e) => setEnableLoadEncroach(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <span>Load Encroachment Blinder Exclusion</span>
            </label>
          </div>
        </div>

        {/* Fault Impedance Injection Probe */}
        <div className="mt-auto bg-[#0f141f] p-2.5 rounded border border-[#263147] space-y-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Apparent Fault Impedance (Z = R + jX)</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Resistance R: {faultR.toFixed(1)} Ω</span>
              <input
                type="range"
                min="-10"
                max="15"
                step="0.5"
                value={faultR}
                onChange={(e) => setFaultR(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0a0d14] rounded accent-amber-400 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Reactance X: {faultX.toFixed(1)} Ω</span>
              <input
                type="range"
                min="-5"
                max="25"
                step="0.5"
                value={faultX}
                onChange={(e) => setFaultX(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0a0d14] rounded accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-2 bg-[#090d14] rounded text-[11px] grid grid-cols-3 gap-1 text-center">
            <div className={`p-1 rounded font-semibold ${inZ1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              Z1: {inZ1 ? 'TRIP (0s)' : 'CLEAR'}
            </div>
            <div className={`p-1 rounded font-semibold ${inZ2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              Z2: {inZ2 ? 'TRIP (0.3s)' : 'CLEAR'}
            </div>
            <div className={`p-1 rounded font-semibold ${inZ3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              Z3: {inZ3 ? 'TRIP (0.8s)' : 'CLEAR'}
            </div>
          </div>
        </div>
      </div>

      {/* Right: R-X Impedance Plane Plot */}
      <div className="col-span-7 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col items-center justify-center">
        <h4 className="font-semibold text-slate-200 text-xs mb-1">R-X Complex Impedance Operating Plane</h4>
        <div className="w-[360px] h-[360px] bg-[#090c14] border border-[#263147] rounded relative flex items-center justify-center">
          <svg width={svgSize} height={svgSize} className="overflow-visible select-none">
            {/* R and X Axes */}
            <line x1={0} y1={originY} x2={svgSize} y2={originY} stroke="#334155" strokeWidth="1.5" />
            <line x1={originX} y1={0} x2={originX} y2={svgSize} stroke="#334155" strokeWidth="1.5" />
            <text x={svgSize - 15} y={originY - 5} fill="#64748b" fontSize="10" fontWeight="bold">+R (Ω)</text>
            <text x={originX + 5} y={15} fill="#64748b" fontSize="10" fontWeight="bold">+jX (Ω)</text>

            {/* Zone 3 Circle */}
            <circle cx={z3Center.x} cy={z3Center.y} r={z3Radius} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />
            {/* Zone 2 Circle */}
            <circle cx={z2Center.x} cy={z2Center.y} r={z2Radius} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="4 2" />

            {/* Zone 1 Circle or Quad */}
            {charTypeZ1 === 'MHO' ? (
              <circle cx={z1Center.x} cy={z1Center.y} r={z1Radius} fill="#10b98115" stroke="#10b981" strokeWidth="2.2" />
            ) : (
              <polygon
                points={`
                  ${originX - 4 * scale},${originY}
                  ${originX + 8 * scale},${originY}
                  ${originX + 8 * scale},${originY - z1Reach * Math.sin(lineRad) * scale}
                  ${originX - 4 * scale},${originY - z1Reach * Math.sin(lineRad) * scale}
                `}
                fill="#10b98115"
                stroke="#10b981"
                strokeWidth="2.2"
              />
            )}

            {/* Injected Fault Impedance Marker */}
            <circle cx={faultSvg.x} cy={faultSvg.y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
            <text x={faultSvg.x + 8} y={faultSvg.y - 5} fill="#ef4444" fontSize="10" fontWeight="bold">
              Z_fault ({faultR}, {faultX})
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 3: ANSI 87 Differential Protection & Harmonics Studio
// =========================================================================
function DifferentialStudioTab({
  diffPickup,
  setDiffPickup,
  slope1,
  setSlope1,
  slope2,
  setSlope2,
  kneeI,
  setKneeI,
  unrestrainedPickup,
  setUnrestrainedPickup,
  testI1,
  setTestI1,
  testI2,
  setTestI2,
  test2ndHarmonic,
  setTest2ndHarmonic,
  test5thHarmonic,
  setTest5thHarmonic,
  vectorGroup,
  setVectorGroup,
}: {
  diffPickup: number;
  setDiffPickup: (v: number) => void;
  slope1: number;
  setSlope1: (v: number) => void;
  slope2: number;
  setSlope2: (v: number) => void;
  kneeI: number;
  setKneeI: (v: number) => void;
  unrestrainedPickup: number;
  setUnrestrainedPickup: (v: number) => void;
  testI1: number;
  setTestI1: (v: number) => void;
  testI2: number;
  setTestI2: (v: number) => void;
  test2ndHarmonic: number;
  setTest2ndHarmonic: (v: number) => void;
  test5thHarmonic: number;
  setTest5thHarmonic: (v: number) => void;
  vectorGroup: VectorGroup;
  setVectorGroup: (v: VectorGroup) => void;
}) {
  const relay = useMemo(() => {
    return new DifferentialRelay('relay_diff', {
      pickupCurrent: diffPickup,
      slope1,
      slope2,
      kneeCurrent: kneeI,
      unrestrainedPickup,
      vectorGroup,
    });
  }, [diffPickup, slope1, slope2, kneeI, unrestrainedPickup, vectorGroup]);

  // Evaluate test condition
  const iOp = Math.abs(testI1 - testI2);
  const iRes = (testI1 + testI2) / 2.0;
  const tripThreshold = relay.calculateRestraintThreshold(iRes);

  const is2ndBlocked = test2ndHarmonic >= 0.15;
  const is5thBlocked = test5thHarmonic >= 0.35;
  const isUnrestrained = iOp >= unrestrainedPickup;
  const isRestrained = !is2ndBlocked && !is5thBlocked && iOp >= tripThreshold;
  const isTripped = isUnrestrained || isRestrained;

  const svgWidth = 440;
  const svgHeight = 300;
  const maxI = 10.0;

  const iToX = (i: number) => 40 + (i / maxI) * (svgWidth - 60);
  const iToY = (i: number) => svgHeight - 30 - (i / maxI) * (svgHeight - 50);

  // Build dual-slope boundary line
  const p0 = { x: iToX(0), y: iToY(diffPickup) };
  const pKnee = { x: iToX(kneeI), y: iToY(diffPickup + slope1 * kneeI) };
  const pEnd = { x: iToX(maxI), y: iToY(diffPickup + slope1 * kneeI + slope2 * (maxI - kneeI)) };

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Settings */}
      <div className="col-span-5 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-[#263147] pb-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Dual-Slope Restraint & Restraints</span>
        </h3>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Minimum Pickup (I_pickup):</span>
              <span className="text-amber-300 font-mono font-bold">{diffPickup.toFixed(2)} pu</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={diffPickup}
              onChange={(e) => setDiffPickup(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Slope 1: {(slope1 * 100).toFixed(0)}%</span>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={slope1}
                onChange={(e) => setSlope1(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0d111a] rounded accent-amber-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Slope 2: {(slope2 * 100).toFixed(0)}%</span>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={slope2}
                onChange={(e) => setSlope2(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0d111a] rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Knee Breakpoint (I_knee):</span>
              <span className="text-amber-300 font-mono font-bold">{kneeI.toFixed(1)} pu</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.2"
              value={kneeI}
              onChange={(e) => setKneeI(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Unrestrained Pickup:</span>
              <span className="text-rose-400 font-mono font-bold">{unrestrainedPickup.toFixed(1)} pu</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="15.0"
              step="0.5"
              value={unrestrainedPickup}
              onChange={(e) => setUnrestrainedPickup(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">Vector Group:</span>
              <span className="text-amber-300 font-mono font-bold">{vectorGroup}</span>
            </div>
            <select
              value={vectorGroup}
              onChange={(e) => setVectorGroup(e.target.value as VectorGroup)}
              className="w-full bg-[#0d111a] border border-[#263147] rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="Yy0">Yy0 (0° Shift)</option>
              <option value="Yd1">Yd1 (-30° Shift)</option>
              <option value="Yd11">Yd11 (+30° Shift)</option>
              <option value="Dy1">Dy1 (-30° Shift)</option>
              <option value="Dy11">Dy11 (+30° Shift)</option>
              <option value="Dd0">Dd0 (0° Shift)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-[#263147] space-y-2">
            <span className="text-[11px] font-semibold text-slate-200 block">Harmonic Restraint & Test Currents</span>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>2nd Harmonic (Inrush Restraint):</span>
                <span className={is2ndBlocked ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {(test2ndHarmonic * 100).toFixed(0)}% {is2ndBlocked ? '(BLOCKED >= 15%)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.02"
                value={test2ndHarmonic}
                onChange={(e) => setTest2ndHarmonic(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>5th Harmonic (Overexcitation Restraint):</span>
                <span className={is5thBlocked ? 'text-purple-400 font-bold' : 'text-slate-300'}>
                  {(test5thHarmonic * 100).toFixed(0)}% {is5thBlocked ? '(BLOCKED >= 35%)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.02"
                value={test5thHarmonic}
                onChange={(e) => setTest5thHarmonic(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#0d111a] rounded accent-purple-500 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400">Test Primary I1: {testI1.toFixed(1)} pu</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.2"
                  value={testI1}
                  onChange={(e) => setTestI1(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0d111a] rounded accent-sky-400 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Test Secondary I2: {testI2.toFixed(1)} pu</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.2"
                  value={testI2}
                  onChange={(e) => setTestI2(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0d111a] rounded accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Plane */}
      <div className="col-span-7 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col items-center">
        <h4 className="font-semibold text-slate-200 text-xs mb-1">Dual-Slope Operating Characteristic Plane</h4>
        <div className="w-[440px] h-[300px] bg-[#090c14] border border-[#263147] rounded relative flex items-center justify-center">
          <svg width={svgWidth} height={svgHeight} className="overflow-visible select-none">
            {/* Axes */}
            <line x1={40} y1={svgHeight - 30} x2={svgWidth - 20} y2={svgHeight - 30} stroke="#334155" strokeWidth="1.5" />
            <line x1={40} y1={20} x2={40} y2={svgHeight - 30} stroke="#334155" strokeWidth="1.5" />
            <text x={svgWidth - 20} y={svgHeight - 15} fill="#64748b" fontSize="9" textAnchor="end">I_res (pu)</text>
            <text x={35} y={25} fill="#64748b" fontSize="9" textAnchor="end">I_op (pu)</text>

            {/* Trip Region Polygon */}
            <polygon
              points={`
                ${p0.x},${p0.y}
                ${pKnee.x},${pKnee.y}
                ${pEnd.x},${pEnd.y}
                ${pEnd.x},${iToY(maxI)}
                ${p0.x},${iToY(maxI)}
              `}
              fill="#10b98115"
            />

            {/* Boundary Lines */}
            <line x1={p0.x} y1={p0.y} x2={pKnee.x} y2={pKnee.y} stroke="#f59e0b" strokeWidth="2.5" />
            <line x1={pKnee.x} y1={pKnee.y} x2={pEnd.x} y2={pEnd.y} stroke="#f59e0b" strokeWidth="2.5" />

            {/* Operating Point */}
            <circle cx={iToX(iRes)} cy={iToY(iOp)} r="6" fill={isTripped ? '#ef4444' : '#22c55e'} stroke="#ffffff" strokeWidth="2" />
          </svg>
        </div>

        <div className="mt-2 text-center text-xs">
          <span className={`px-2 py-0.5 rounded font-bold ${isTripped ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
            Status: {isTripped ? (isUnrestrained ? 'UNRESTRAINED TRIP ⚡' : 'RESTRAINED TRIP 🛡️') : 'STABLE RESTRAINED (NO TRIP) ✓'}
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 4: CT Saturation & Non-Linear Magnetics Waveform Studio
// =========================================================================
function CtSaturationStudioTab({
  ctRatioPrimary,
  setCtRatioPrimary,
  ctRatioSecondary,
  setCtRatioSecondary,
  ctBurdenR,
  setCtBurdenR,
  ctKneeFlux,
  setCtKneeFlux,
  ctRemanencePu,
  setCtRemanencePu,
  ctDcOffsetPu,
  setCtDcOffsetPu,
  primaryFaultCurrent,
  setPrimaryFaultCurrent,
}: {
  ctRatioPrimary: number;
  setCtRatioPrimary: (v: number) => void;
  ctRatioSecondary: number;
  setCtRatioSecondary: (v: number) => void;
  ctBurdenR: number;
  setCtBurdenR: (v: number) => void;
  ctKneeFlux: number;
  setCtKneeFlux: (v: number) => void;
  ctRemanencePu: number;
  setCtRemanencePu: (v: number) => void;
  ctDcOffsetPu: number;
  setCtDcOffsetPu: (v: number) => void;
  primaryFaultCurrent: number;
  setPrimaryFaultCurrent: (v: number) => void;
}) {
  const ct = useMemo(() => {
    return new CurrentTransformer('ct_studio', {
      ratioPrimary: ctRatioPrimary,
      ratioSecondary: ctRatioSecondary,
      burdenResistance: ctBurdenR,
      kneeFluxLinkage: ctKneeFlux,
      remanenceFluxPu: ctRemanencePu,
    });
  }, [ctRatioPrimary, ctRatioSecondary, ctBurdenR, ctKneeFlux, ctRemanencePu]);

  // Simulate 3 cycles of fault current with DC offset
  const dt = 1e-4; // 100 µs
  const numSteps = 400; // 40 ms
  const timePoints: number[] = [];
  const idealIsPoints: number[] = [];
  const actualIsPoints: number[] = [];
  const fluxPoints: number[] = [];

  ct.reset();
  const turnsRatio = ctRatioPrimary / ctRatioSecondary;

  for (let step = 0; step < numSteps; step++) {
    const t = step * dt;
    // Primary current with DC offset decay (tau = 40 ms)
    const acPart = Math.sqrt(2) * primaryFaultCurrent * Math.sin(2 * Math.PI * 60 * t);
    const dcPart = Math.sqrt(2) * primaryFaultCurrent * ctDcOffsetPu * Math.exp(-t / 0.04);
    const ip = acPart + dcPart;

    const state = ct.step(ip, dt);
    timePoints.push(t);
    idealIsPoints.push(ip / turnsRatio);
    actualIsPoints.push(state.actualSecondaryCurrent);
    fluxPoints.push(state.fluxLinkage);
  }

  // Render Waveform Canvas SVG
  const svgW = 600;
  const svgH = 280;
  const maxI = Math.max(1, ...idealIsPoints.map(Math.abs));

  const yCenter = svgH / 2;
  const tToX = (t: number) => 30 + (t / 0.04) * (svgW - 50);
  const iToY = (i: number) => yCenter - (i / (maxI * 1.2)) * (svgH / 2 - 20);

  const idealPath = idealIsPoints
    .map((val, idx) => `${tToX(timePoints[idx]).toFixed(1)},${iToY(val).toFixed(1)}`)
    .join(' ');

  const actualPath = actualIsPoints
    .map((val, idx) => `${tToX(timePoints[idx]).toFixed(1)},${iToY(val).toFixed(1)}`)
    .join(' ');

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      <div className="col-span-4 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-2.5">
        <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-[#263147] pb-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>CT Core & Burden Setup</span>
        </h3>

        <div className="space-y-2 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400">CT Primary:</span>
              <select
                value={ctRatioPrimary}
                onChange={(e) => setCtRatioPrimary(parseFloat(e.target.value))}
                className="w-full bg-[#0d111a] border border-[#263147] rounded px-1.5 py-0.5 text-xs text-slate-200"
              >
                <option value="600">600 A</option>
                <option value="1200">1200 A</option>
                <option value="2000">2000 A</option>
                <option value="4000">4000 A</option>
              </select>
            </div>
            <div>
              <span className="text-slate-400">CT Secondary:</span>
              <select
                value={ctRatioSecondary}
                onChange={(e) => setCtRatioSecondary(parseFloat(e.target.value))}
                className="w-full bg-[#0d111a] border border-[#263147] rounded px-1.5 py-0.5 text-xs text-slate-200"
              >
                <option value="1">1 A</option>
                <option value="5">5 A</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Knee Flux Linkage (ψ_k):</span>
              <span className="text-emerald-300 font-mono font-bold">{ctKneeFlux.toFixed(1)} Wb-t</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={ctKneeFlux}
              onChange={(e) => setCtKneeFlux(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Primary Fault Magnitude:</span>
              <span className="text-emerald-300 font-mono font-bold">{primaryFaultCurrent} A</span>
            </div>
            <input
              type="range"
              min="2000"
              max="30000"
              step="1000"
              value={primaryFaultCurrent}
              onChange={(e) => setPrimaryFaultCurrent(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Initial DC Offset:</span>
              <span className="text-emerald-300 font-mono font-bold">{(ctDcOffsetPu * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={ctDcOffsetPu}
              onChange={(e) => setCtDcOffsetPu(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Remanence Flux ψ_r:</span>
              <span className="text-emerald-300 font-mono font-bold">{(ctRemanencePu * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={ctRemanencePu}
              onChange={(e) => setCtRemanencePu(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Connected Burden Resistance (Rb):</span>
              <span className="text-emerald-300 font-mono font-bold">{ctBurdenR.toFixed(1)} Ω</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.5"
              value={ctBurdenR}
              onChange={(e) => setCtBurdenR(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="col-span-8 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col">
        <div className="flex items-center justify-between mb-1 text-xs">
          <span className="font-semibold text-slate-200">Secondary Waveform Distortion & Saturation Collapse</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-sky-400"><span className="w-2.5 h-0.5 bg-sky-400"></span> Ideal i_s</span>
            <span className="flex items-center gap-1 text-rose-400"><span className="w-2.5 h-0.5 bg-rose-400"></span> Saturated i_s</span>
          </div>
        </div>

        <div className="flex-1 bg-[#090c14] border border-[#263147] rounded flex items-center justify-center p-2">
          <svg width={svgW} height={svgH} className="overflow-visible select-none">
            <line x1={30} y1={yCenter} x2={svgW - 20} y2={yCenter} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            <polyline points={idealPath} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
            <polyline points={actualPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 5: Generator & Frequency Protection (ANSI 81 / 40 / 78)
// =========================================================================
function GeneratorStudioTab() {
  const [freq, setFreq] = useState<number>(58.8);
  const [genR, setGenR] = useState<number>(0.1);
  const [genX, setGenX] = useState<number>(-0.8);

  const relay = useMemo(() => {
    return new GeneratorProtectionRelay('gen_studio');
  }, []);

  const state = relay.step(freq, 1.0, { r: genR, i: genX }, 0.05);

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      <div className="col-span-5 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-3">
        <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-[#263147] pb-1.5">
          <Activity className="w-4 h-4 text-rose-400" />
          <span>Generator & Grid Protection Testing</span>
        </h3>

        <div className="space-y-3 text-[11px]">
          <div>
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Grid Frequency (Hz):</span>
              <span className="text-rose-400 font-mono font-bold text-xs">{freq.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="55.0"
              max="65.0"
              step="0.1"
              value={freq}
              onChange={(e) => setFreq(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Generator Impedance (ANSI 40 LOE Injection):</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">R: {genR.toFixed(2)} pu</span>
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step="0.05"
                  value={genR}
                  onChange={(e) => setGenR(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">X: {genX.toFixed(2)} pu</span>
                <input
                  type="range"
                  min="-2.5"
                  max="1.0"
                  step="0.05"
                  value={genX}
                  onChange={(e) => setGenX(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0d111a] rounded accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-7 bg-[#161b26] p-3 rounded-lg border border-[#263147] flex flex-col gap-2">
        <h4 className="font-semibold text-slate-200 text-xs border-b border-[#263147] pb-1">Relay Element Status & Diagnostics</h4>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-[#0d111a] rounded border border-[#263147] flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">ANSI 81U Under-Frequency</div>
              <div className="text-[10px] text-slate-400">Stage 1 (59.3Hz/0.5s), Stage 2 (58.5Hz/0.2s), Stage 3 (57.5Hz/0.05s)</div>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${state.underFreqActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {state.underFreqActive ? 'PICKED UP' : 'NORMAL'}
            </span>
          </div>

          <div className="p-2.5 bg-[#0d111a] rounded border border-[#263147] flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">ANSI 40 Loss of Field (LOE)</div>
              <div className="text-[10px] text-slate-400">Circle 1 (Fast Zone), Circle 2 (Steady-State Offset Mho)</div>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${state.isLoeCircle1Inside || state.isLoeCircle2Inside ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {state.isLoeCircle1Inside || state.isLoeCircle2Inside ? 'INSIDE LOE ZONE' : 'STABLE'}
            </span>
          </div>

          <div className="p-2.5 bg-[#0d111a] rounded border border-[#263147] flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">ANSI 78 Out-of-Step / Power Swing</div>
              <div className="text-[10px] text-slate-400">Double-Blinder Transit Time Timer (PSB vs OST)</div>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${state.powerSwingActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {state.powerSwingActive ? 'PSB ACTIVE' : 'NO SWING'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
