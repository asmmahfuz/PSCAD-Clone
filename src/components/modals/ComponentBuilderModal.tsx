import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Save,
  Plus,
  Trash2,
  Code2,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  Maximize2
} from 'lucide-react';
import type {
  CustomComponentDef,
  CustomShapeDef,
  CustomPinDef,
  CustomParamDef,
  PinDomain,
  PinDirection,
  SignalDataType,
} from '../../types';
import { customComponentRegistry, BUILTIN_CUSTOM_COMPONENTS } from '../../engine/customComponents';

interface ModalProps {
  initialDef?: CustomComponentDef | null;
  onClose: () => void;
  onSave: (def: CustomComponentDef) => void;
}

export const ComponentBuilderModal: React.FC<ModalProps> = ({ initialDef, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'symbol' | 'pins' | 'params' | 'script' | 'test'>('symbol');

  // Component Metadata
  const [compName, setCompName] = useState(initialDef?.name || 'My_Custom_Block');
  const [compCategory, setCompCategory] = useState(initialDef?.category || 'Custom Control Blocks');
  const [compDesc, setCompDesc] = useState(
    initialDef?.description || 'Custom mathematical transfer function or non-linear component.'
  );

  // Shapes
  const [shapes, setShapes] = useState<CustomShapeDef[]>(
    initialDef?.shapes || [
      { id: 'box', type: 'rect', x1: -35, y1: -25, x2: 35, y2: 25, stroke: '#61afef', strokeWidth: 2, fill: '#1e2533' },
      { id: 'txt', type: 'text', cx: 0, cy: 0, text: 'CUSTOM', fill: '#e6edf3', fontSize: 10 },
    ]
  );
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Pins
  const [pins, setPins] = useState<CustomPinDef[]>(
    initialDef?.pins || [
      { id: 'in1', name: 'In1', localX: -40, localY: 0, domain: 'control', direction: 'in', dataType: 'real' },
      { id: 'out1', name: 'Out1', localX: 40, localY: 0, domain: 'control', direction: 'out', dataType: 'real' },
    ]
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // Parameters
  const [parameters, setParameters] = useState<CustomParamDef[]>(
    initialDef?.parameters || [
      { name: 'gain', label: 'Proportional Gain K', type: 'number', default: 1.0 },
      { name: 'offset', label: 'Offset b', type: 'number', default: 0.0 },
    ]
  );

  // Script
  const [scriptCode, setScriptCode] = useState<string>(
    initialDef?.scriptCode ||
      `// Custom Equation Script
// inputs: { In1: number, ... }
// params: { gain: number, offset: number, ... }
// state: internal persistent state object
// dt: time step (s), t: simulation time (s)

const inVal = inputs.In1 || 0;
const K = params.gain !== undefined ? params.gain : 1.0;
const b = params.offset || 0.0;

const outVal = K * inVal + b;

return {
  outputs: {
    Out1: outVal
  },
  state: {
    lastInput: inVal
  }
};`
  );

  // Test Bench State
  const [testSignalType, setTestSignalType] = useState<'sine' | 'step' | 'ramp'>('sine');
  const [testResult, setTestResult] = useState<{ outputs: Record<string, number[]>; time: number[] } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw Symbol Editor Canvas
  const drawEditorCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 2.5;

    ctx.clearRect(0, 0, width, height);

    // Background & grid
    ctx.fillStyle = '#0c0f17';
    ctx.fillRect(0, 0, width, height);

    // Grid dots
    ctx.fillStyle = '#252d3d';
    for (let x = 0; x < width; x += 20) {
      for (let y = 0; y < height; y += 20) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Axes
    ctx.strokeStyle = 'rgba(56, 139, 253, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);

    // Draw Shapes
    shapes.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.stroke || '#61afef';
      ctx.fillStyle = s.fill || '#1e2533';
      ctx.lineWidth = (s.strokeWidth || 2) * (scale / 2);

      if (s.id === selectedShapeId) {
        ctx.shadowColor = '#388bfd';
        ctx.shadowBlur = 8;
      }

      if (s.type === 'rect' && s.x1 !== undefined && s.y1 !== undefined && s.x2 !== undefined && s.y2 !== undefined) {
        const x = Math.min(s.x1, s.x2) * scale;
        const y = Math.min(s.y1, s.y2) * scale;
        const w = Math.abs(s.x2 - s.x1) * scale;
        const h = Math.abs(s.y2 - s.y1) * scale;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (s.type === 'circle' && s.cx !== undefined && s.cy !== undefined && s.r !== undefined) {
        ctx.beginPath();
        ctx.arc(s.cx * scale, s.cy * scale, s.r * scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (s.type === 'line' && s.x1 !== undefined && s.y1 !== undefined && s.x2 !== undefined && s.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(s.x1 * scale, s.y1 * scale);
        ctx.lineTo(s.x2 * scale, s.y2 * scale);
        ctx.stroke();
      } else if (s.type === 'text' && s.cx !== undefined && s.cy !== undefined) {
        ctx.fillStyle = s.fill || '#e6edf3';
        ctx.font = `bold ${(s.fontSize || 10) * 1.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text || '', s.cx * scale, s.cy * scale);
      }
      ctx.restore();
    });

    // Draw Pins
    pins.forEach((pin) => {
      ctx.save();
      const px = pin.localX * scale;
      const py = pin.localY * scale;

      const isSelected = pin.id === selectedPinId;
      ctx.fillStyle = pin.domain === 'control' ? '#10b981' : pin.domain === 'polyphase' ? '#00e5ff' : '#61afef';
      ctx.strokeStyle = isSelected ? '#ff9800' : '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 1.5;

      ctx.beginPath();
      if (pin.domain === 'control') {
        ctx.rect(px - 5, py - 5, 10, 10);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.arc(px, py, 5.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      // Pin Name
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      ctx.textAlign = px < 0 ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pin.name, px < 0 ? px - 8 : px + 8, py);

      ctx.restore();
    });

    ctx.restore();
  }, [shapes, pins, selectedShapeId, selectedPinId]);

  useEffect(() => {
    drawEditorCanvas();
  }, [drawEditorCanvas]);

  // Run Test Bench Simulation
  const handleRunTestBench = () => {
    setTestError(null);
    try {
      // Evaluate custom script across 60 steps
      const dt = 1e-4;
      const N = 60;
      const timeArr: number[] = [];
      const outMap: Record<string, number[]> = {};

      pins
        .filter((p) => p.direction === 'out')
        .forEach((p) => {
          outMap[p.name] = [];
        });

      let simState: any = {};
      const paramsObj: Record<string, any> = {};
      parameters.forEach((p) => {
        paramsObj[p.name] = p.default;
      });

      for (let i = 0; i < N; i++) {
        const t = i * dt;
        timeArr.push(t);

        // Generate synthetic test input
        let u = 0;
        if (testSignalType === 'sine') {
          u = Math.sin(2 * Math.PI * 60 * t);
        } else if (testSignalType === 'step') {
          u = t >= 0.002 ? 1.0 : 0.0;
        } else if (testSignalType === 'ramp') {
          u = t * 200;
        }

        const inputObj: Record<string, number> = {};
        pins
          .filter((p) => p.direction === 'in')
          .forEach((p) => {
            inputObj[p.name] = u;
          });

        const res = customComponentRegistry.evaluate('temp_test', inputObj, paramsObj, simState, dt, t);
        simState = res.state;

        Object.keys(outMap).forEach((outName) => {
          const val = res.outputs[outName] !== undefined ? res.outputs[outName] : 0;
          outMap[outName].push(val);
        });
      }

      setTestResult({ outputs: outMap, time: timeArr });
    } catch (err: any) {
      setTestError(err.message || 'Error executing test script.');
    }
  };

  // Add new shape
  const handleAddShape = (type: 'rect' | 'circle' | 'line' | 'text') => {
    const id = `shape_${Date.now()}`;
    let newShape: CustomShapeDef;
    if (type === 'rect') {
      newShape = { id, type: 'rect', x1: -25, y1: -20, x2: 25, y2: 20, stroke: '#61afef', strokeWidth: 2, fill: '#1e2533' };
    } else if (type === 'circle') {
      newShape = { id, type: 'circle', cx: 0, cy: 0, r: 18, stroke: '#61afef', strokeWidth: 2, fill: '#1e2533' };
    } else if (type === 'line') {
      newShape = { id, type: 'line', x1: -25, y1: 0, x2: 25, y2: 0, stroke: '#e5c07b', strokeWidth: 2 };
    } else {
      newShape = { id, type: 'text', cx: 0, cy: 0, text: 'LABEL', fill: '#e6edf3', fontSize: 10 };
    }
    setShapes([...shapes, newShape]);
    setSelectedShapeId(id);
  };

  // Add new pin
  const handleAddPin = () => {
    const newId = `pin_${Date.now()}`;
    const newPin: CustomPinDef = {
      id: newId,
      name: `p${pins.length + 1}`,
      localX: pins.length % 2 === 0 ? -40 : 40,
      localY: (pins.length * 15) % 40 - 20,
      domain: 'control',
      direction: pins.length % 2 === 0 ? 'in' : 'out',
      dataType: 'real',
    };
    setPins([...pins, newPin]);
    setSelectedPinId(newId);
  };

  // Add new param
  const handleAddParam = () => {
    const newParam: CustomParamDef = {
      name: `param_${parameters.length + 1}`,
      label: `Parameter ${parameters.length + 1}`,
      type: 'number',
      default: 1.0,
    };
    setParameters([...parameters, newParam]);
  };

  // Save Component
  const handleSave = () => {
    const def: CustomComponentDef = {
      id: initialDef?.id || `custom_${Date.now()}_${compName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      name: compName,
      category: compCategory,
      description: compDesc,
      shapes,
      pins,
      parameters,
      scriptCode,
      createdAt: initialDef?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    customComponentRegistry.registerComponent(def, true);
    onSave(def);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans text-xs select-none">
      <div className="bg-[#161b26] border border-[#263147] rounded-lg shadow-2xl w-[920px] max-w-full h-[620px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-10 px-4 bg-[#1c2333] border-b border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm text-slate-100">Custom Component Workshop & Script Editor</span>
            <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 text-[10px] font-mono border border-purple-700/50">
              Phase 6 Studio
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#263147] text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="h-9 px-3 bg-[#121620] border-b border-[#263147] flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('symbol')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'symbol' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>1. Symbol Graphic</span>
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'pins' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>2. Pins & Ports ({pins.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'params' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>3. Parameters ({parameters.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'script' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>4. Equation Script</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('test');
              handleRunTestBench();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'test' ? 'bg-[#1f6feb] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2333]'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Live Test Bench</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* TAB 1: Visual Symbol Editor */}
          {activeTab === 'symbol' && (
            <div className="flex-1 flex gap-4">
              {/* Left Canvas Preview */}
              <div className="flex-1 bg-[#0c0f17] border border-[#263147] rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
                <canvas ref={canvasRef} width={420} height={340} className="w-full h-full block" />
                <span className="absolute bottom-2 left-2 text-[10px] text-slate-500 font-mono">
                  Scale: 2.5x | Grid: 20px Snap
                </span>
              </div>

              {/* Right Tools & Shapes Panel */}
              <div className="w-80 flex flex-col gap-3 overflow-y-auto">
                <div className="p-3 bg-[#1c2333] border border-[#263147] rounded space-y-2">
                  <span className="font-bold text-slate-200 block text-xs">General Metadata</span>
                  <div>
                    <label className="text-[10px] text-slate-400">Component Name</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#263147] rounded text-slate-200 text-xs focus:outline-none focus:border-[#1f6feb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Library Category</label>
                    <input
                      type="text"
                      value={compCategory}
                      onChange={(e) => setCompCategory(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#263147] rounded text-slate-200 text-xs focus:outline-none focus:border-[#1f6feb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Description</label>
                    <textarea
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      rows={2}
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#263147] rounded text-slate-200 text-xs focus:outline-none focus:border-[#1f6feb] resize-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#1c2333] border border-[#263147] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Add Symbol Shapes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleAddShape('rect')}
                      className="flex items-center gap-1 px-2 py-1 bg-[#263147] hover:bg-[#1f6feb] text-slate-200 rounded transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Rectangle</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('circle')}
                      className="flex items-center gap-1 px-2 py-1 bg-[#263147] hover:bg-[#1f6feb] text-slate-200 rounded transition-colors"
                    >
                      <CircleIcon className="w-3.5 h-3.5" />
                      <span>Circle</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('line')}
                      className="flex items-center gap-1 px-2 py-1 bg-[#263147] hover:bg-[#1f6feb] text-slate-200 rounded transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Line</span>
                    </button>
                    <button
                      onClick={() => handleAddShape('text')}
                      className="flex items-center gap-1 px-2 py-1 bg-[#263147] hover:bg-[#1f6feb] text-slate-200 rounded transition-colors"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>Text Label</span>
                    </button>
                  </div>
                </div>

                {/* Shape List */}
                <div className="p-3 bg-[#1c2333] border border-[#263147] rounded flex-1 overflow-y-auto space-y-1.5">
                  <span className="font-bold text-slate-200 text-xs">Graphic Elements ({shapes.length})</span>
                  {shapes.map((s, idx) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedShapeId(s.id)}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                        selectedShapeId === s.id ? 'bg-[#1f6feb] text-white' : 'bg-[#121620] text-slate-300 hover:bg-[#263147]'
                      }`}
                    >
                      <span className="font-mono capitalize">
                        {idx + 1}. {s.type} {s.text ? `("${s.text}")` : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShapes(shapes.filter((item) => item.id !== s.id));
                        }}
                        className="p-0.5 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Pins & Ports */}
          {activeTab === 'pins' && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm">Component Pin Interface Configuration</span>
                <button
                  onClick={handleAddPin}
                  className="flex items-center gap-1 px-3 py-1 bg-[#1f6feb] hover:bg-blue-600 text-white rounded font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pin</span>
                </button>
              </div>

              <div className="flex-1 bg-[#121620] border border-[#263147] rounded-lg overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1c2333] text-slate-400 border-b border-[#263147]">
                      <th className="p-2">Pin Name</th>
                      <th className="p-2">Domain</th>
                      <th className="p-2">Direction</th>
                      <th className="p-2">Data Type</th>
                      <th className="p-2">Local X</th>
                      <th className="p-2">Local Y</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263147] font-mono">
                    {pins.map((pin, idx) => (
                      <tr key={pin.id} className="hover:bg-[#1c2333]/50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={pin.name}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].name = e.target.value;
                              setPins(copy);
                            }}
                            className="w-24 px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={pin.domain}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].domain = e.target.value as PinDomain;
                              setPins(copy);
                            }}
                            className="px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          >
                            <option value="control">Control</option>
                            <option value="electrical">Electrical</option>
                            <option value="polyphase">Polyphase</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={pin.direction}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].direction = e.target.value as PinDirection;
                              setPins(copy);
                            }}
                            className="px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          >
                            <option value="in">Input</option>
                            <option value="out">Output</option>
                            <option value="bidirectional">Bi-directional</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={pin.dataType || 'real'}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].dataType = e.target.value as SignalDataType;
                              setPins(copy);
                            }}
                            className="px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          >
                            <option value="real">real</option>
                            <option value="integer">integer</option>
                            <option value="boolean">boolean</option>
                            <option value="vector3">vector3</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={pin.localX}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].localX = parseFloat(e.target.value) || 0;
                              setPins(copy);
                            }}
                            className="w-16 px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={pin.localY}
                            onChange={(e) => {
                              const copy = [...pins];
                              copy[idx].localY = parseFloat(e.target.value) || 0;
                              setPins(copy);
                            }}
                            className="w-16 px-1.5 py-0.5 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => setPins(pins.filter((p) => p.id !== pin.id))}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Dynamic Parameters */}
          {activeTab === 'params' && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm">Dynamic Parameter Schema Builder</span>
                <button
                  onClick={handleAddParam}
                  className="flex items-center gap-1 px-3 py-1 bg-[#1f6feb] hover:bg-blue-600 text-white rounded font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Parameter</span>
                </button>
              </div>

              <div className="flex-1 bg-[#121620] border border-[#263147] rounded-lg overflow-y-auto p-3 space-y-3">
                {parameters.map((param, idx) => (
                  <div key={idx} className="p-3 bg-[#1c2333] border border-[#263147] rounded grid grid-cols-4 gap-3 relative">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">Field Key Name</label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => {
                          const copy = [...parameters];
                          copy[idx].name = e.target.value;
                          setParameters(copy);
                        }}
                        className="w-full mt-0.5 px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-sans">Inspector Display Label</label>
                      <input
                        type="text"
                        value={param.label}
                        onChange={(e) => {
                          const copy = [...parameters];
                          copy[idx].label = e.target.value;
                          setParameters(copy);
                        }}
                        className="w-full mt-0.5 px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Data Type</label>
                      <select
                        value={param.type}
                        onChange={(e) => {
                          const copy = [...parameters];
                          copy[idx].type = e.target.value as any;
                          setParameters(copy);
                        }}
                        className="w-full mt-0.5 px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                      >
                        <option value="number">Number (Float)</option>
                        <option value="string">String (Text)</option>
                        <option value="boolean">Boolean (Toggle)</option>
                      </select>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400">Default Value</label>
                        <input
                          type="text"
                          value={param.default}
                          onChange={(e) => {
                            const copy = [...parameters];
                            copy[idx].default =
                              param.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                            setParameters(copy);
                          }}
                          className="w-full mt-0.5 px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs font-mono"
                        />
                      </div>
                      <button
                        onClick={() => setParameters(parameters.filter((_, i) => i !== idx))}
                        className="p-1.5 bg-red-900/40 text-red-400 hover:text-red-300 rounded mb-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Script Editor */}
          {activeTab === 'script' && (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm">TypeScript / JavaScript Transfer Function</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Signature: (inputs, params, state, dt, t) =&gt; &#123; outputs, state &#125;
                </span>
              </div>
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full bg-[#0c0f17] border border-[#263147] rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#1f6feb] leading-relaxed resize-none"
              />
            </div>
          )}

          {/* TAB 5: Live Test Bench */}
          {activeTab === 'test' && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between p-2 bg-[#1c2333] border border-[#263147] rounded">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200">Test Waveform:</span>
                  <select
                    value={testSignalType}
                    onChange={(e) => setTestSignalType(e.target.value as any)}
                    className="px-2 py-1 bg-[#0c0f17] border border-[#263147] rounded text-slate-200 text-xs"
                  >
                    <option value="sine">60 Hz Sine Wave (1.0 V Peak)</option>
                    <option value="step">Unit Step Function at t=2ms</option>
                    <option value="ramp">Linear Ramp (200 V/s)</option>
                  </select>
                  <button
                    onClick={handleRunTestBench}
                    className="flex items-center gap-1 px-3 py-1 bg-[#238636] hover:bg-green-600 text-white rounded font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Simulation</span>
                  </button>
                </div>

                {testError ? (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {testError}
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Compiled
                  </span>
                )}
              </div>

              {/* Waveform Output Display */}
              <div className="flex-1 bg-[#0c0f17] border border-[#263147] rounded-lg p-4 flex flex-col overflow-y-auto">
                <span className="font-bold text-slate-300 mb-2">Simulated Output Responses:</span>
                {testResult && (
                  <div className="space-y-3">
                    {Object.entries(testResult.outputs).map(([key, vals]) => {
                      const maxV = Math.max(...vals);
                      const minV = Math.min(...vals);
                      const latestV = vals[vals.length - 1] || 0;
                      return (
                        <div key={key} className="p-3 bg-[#161b26] border border-[#263147] rounded space-y-1 font-mono">
                          <div className="flex justify-between text-xs font-bold text-sky-400">
                            <span>Output Signal [{key}]</span>
                            <span>Latest: {latestV.toFixed(4)} | Min: {minV.toFixed(4)} | Max: {maxV.toFixed(4)}</span>
                          </div>
                          {/* Mini sparkline bar */}
                          <div className="h-10 bg-[#0c0f17] rounded flex items-center px-2 overflow-hidden gap-0.5">
                            {vals.slice(-50).map((v, i) => {
                              const range = maxV - minV || 1;
                              const norm = Math.max(0.1, Math.min(1.0, (v - minV) / range));
                              return (
                                <div
                                  key={i}
                                  style={{ height: `${norm * 100}%` }}
                                  className="flex-1 bg-[#1f6feb] rounded-t min-w-[2px]"
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 px-4 bg-[#1c2333] border-t border-[#263147] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Preset Templates:</span>
            {BUILTIN_CUSTOM_COMPONENTS.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  setCompName(tpl.name);
                  setCompCategory(tpl.category);
                  setCompDesc(tpl.description);
                  setShapes(JSON.parse(JSON.stringify(tpl.shapes)));
                  setPins(JSON.parse(JSON.stringify(tpl.pins)));
                  setParameters(JSON.parse(JSON.stringify(tpl.parameters)));
                  setScriptCode(tpl.scriptCode);
                }}
                className="px-2 py-0.5 bg-[#263147] hover:bg-[#1f6feb] text-slate-300 hover:text-white rounded text-[10px] transition-colors"
              >
                {tpl.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#263147] hover:bg-[#32415d] text-slate-300 rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1f6feb] hover:bg-blue-600 text-white rounded font-bold transition-colors shadow-lg shadow-blue-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to Component Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
