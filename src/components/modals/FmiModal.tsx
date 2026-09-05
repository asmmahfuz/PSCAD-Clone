import React, { useState } from 'react';
import {
  Box,
  Share2,
  Download,
  Upload,
  FileCode,
  Layers,
  Settings,
  Plus,
  Trash2,
  Cpu,
} from 'lucide-react';
import { FmiExporter, type FmiVariable, type FmuExportConfig } from '../../interop/fmiExport';
import { FmiImporter, type ParsedFmuModel } from '../../interop/fmiImport';
import type { CircuitComponentData } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  components?: CircuitComponentData[];
  onImportFmuBlock?: (comp: CircuitComponentData) => void;
}

export const FmiModal: React.FC<Props> = ({
  isOpen,
  onClose,
  components = [],
  onImportFmuBlock,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'preview'>('export');
  const [fmiVersion, setFmiVersion] = useState<'2.0' | '3.0'>('2.0');
  const [modelName, setModelName] = useState<string>('PSCad_Substation_Model');
  const [modelDesc, setModelDesc] = useState<string>(
    'PSCAD CLONE EMTDC Submodule Co-Simulation FMU'
  );
  const [authorName, setAuthorName] = useState<string>('Power Systems Engineering');

  // Variables state
  const [variables, setVariables] = useState<FmiVariable[]>([
    {
      name: 'V_grid_A',
      valueReference: 0,
      causality: 'input',
      variability: 'continuous',
      type: 'Real',
      startValue: 230.0,
      description: 'Grid Phase A Voltage Input (kV)',
      unit: 'kV',
    },
    {
      name: 'V_grid_B',
      valueReference: 1,
      causality: 'input',
      variability: 'continuous',
      type: 'Real',
      startValue: 230.0,
      description: 'Grid Phase B Voltage Input (kV)',
      unit: 'kV',
    },
    {
      name: 'V_grid_C',
      valueReference: 2,
      causality: 'input',
      variability: 'continuous',
      type: 'Real',
      startValue: 230.0,
      description: 'Grid Phase C Voltage Input (kV)',
      unit: 'kV',
    },
    {
      name: 'I_out_A',
      valueReference: 3,
      causality: 'output',
      variability: 'continuous',
      type: 'Real',
      startValue: 0.0,
      description: 'Converter Output Current Phase A (kA)',
      unit: 'kA',
    },
    {
      name: 'I_out_B',
      valueReference: 4,
      causality: 'output',
      variability: 'continuous',
      type: 'Real',
      startValue: 0.0,
      description: 'Converter Output Current Phase B (kA)',
      unit: 'kA',
    },
    {
      name: 'I_out_C',
      valueReference: 5,
      causality: 'output',
      variability: 'continuous',
      type: 'Real',
      startValue: 0.0,
      description: 'Converter Output Current Phase C (kA)',
      unit: 'kA',
    },
    {
      name: 'Filter_Inductance',
      valueReference: 6,
      causality: 'parameter',
      variability: 'tunable',
      type: 'Real',
      startValue: 0.005,
      description: 'Interface Filter Inductance (H)',
      unit: 'H',
    },
  ]);

  // Import state
  const [importXml, setImportXml] = useState<string>('');
  const [parsedModel, setParsedModel] = useState<ParsedFmuModel | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const exportConfig: FmuExportConfig = {
    modelName,
    fmiVersion,
    guid: `{${Array.from({ length: 4 }, () => Math.random().toString(16).substring(2, 10)).join('-')}}`,
    description: modelDesc,
    author: authorName,
    variables,
    components,
  };

  const handleAddVariable = () => {
    const nextVr = variables.length;
    setVariables([
      ...variables,
      {
        name: `Var_${nextVr + 1}`,
        valueReference: nextVr,
        causality: 'input',
        variability: 'continuous',
        type: 'Real',
        startValue: 0.0,
        description: 'New model variable',
      },
    ]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleExportFmuDownload = () => {
    setIsExporting(true);
    try {
      const fmuBytes = FmiExporter.buildFmuPackage(exportConfig);
      const blob = new Blob([new Uint8Array(fmuBytes)], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelName}.fmu`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export FMU:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleParseImportXml = () => {
    try {
      const parsed = FmiImporter.parseModelDescriptionXml(importXml);
      setParsedModel(parsed);
    } catch (err: any) {
      alert(`Failed to parse modelDescription.xml: ${err.message}`);
    }
  };

  const handleInstantiateImportedBlock = () => {
    if (parsedModel && onImportFmuBlock) {
      const comp = FmiImporter.createComponentFromFmu(parsedModel);
      onImportFmuBlock(comp);
      onClose();
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  const generatedXml = FmiExporter.generateModelDescriptionXml(exportConfig);
  const { cSource } = FmiExporter.generateCSourceWrapper(exportConfig);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#10141e] border border-amber-500/30 w-[1050px] max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#161b28] border-b border-[#222d42] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Functional Mock-up Interface (FMI / FMU) Co-Simulation Workshop
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  FMI 2.0 & 3.0 Co-Sim
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Export and import compiled EMTDC submodules as standard Functional Mock-up Units for MATLAB/Simulink, Python, and multi-physics co-simulation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportFmuDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 transition-all"
            >
              <Download className="w-4 h-4" /> Download .FMU Package
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center px-6 bg-[#131824] border-b border-[#222d42] gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" /> FMU Package Exporter
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" /> Code & XML Schema Inspector
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Import External FMU
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0d111a]">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Metadata Settings */}
              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" /> FMU Metadata & Standard Configuration
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Model Identifier</label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">FMI Specification Standard</label>
                    <select
                      value={fmiVersion}
                      onChange={(e) => setFmiVersion(e.target.value as any)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    >
                      <option value="2.0">FMI 2.0 for Co-Simulation (Widest Compatibility)</option>
                      <option value="3.0">FMI 3.0 for Co-Simulation (Modern Standard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Author / Organization</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Model Description</label>
                  <input
                    type="text"
                    value={modelDesc}
                    onChange={(e) => setModelDesc(e.target.value)}
                    className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Variables Table */}
              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" /> Exported Model Variables (Ports & Parameters)
                  </h3>
                  <button
                    onClick={handleAddVariable}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variable
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-[#202b3e]">
                        <th className="pb-2">VR</th>
                        <th className="pb-2">Variable Name</th>
                        <th className="pb-2">Causality</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Start Value</th>
                        <th className="pb-2">Unit</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2436]">
                      {variables.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-800/20">
                          <td className="py-2 text-slate-500 font-bold">{v.valueReference}</td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => {
                                const copy = [...variables];
                                copy[i].name = e.target.value;
                                setVariables(copy);
                              }}
                              className="bg-[#0e121a] border border-[#243048] rounded px-2 py-1 text-xs text-amber-300 w-32 font-mono"
                            />
                          </td>
                          <td className="py-2">
                            <select
                              value={v.causality}
                              onChange={(e) => {
                                const copy = [...variables];
                                copy[i].causality = e.target.value as any;
                                setVariables(copy);
                              }}
                              className="bg-[#0e121a] border border-[#243048] rounded px-2 py-1 text-xs text-slate-200 font-mono"
                            >
                              <option value="input">Input (Port)</option>
                              <option value="output">Output (Port)</option>
                              <option value="parameter">Parameter</option>
                            </select>
                          </td>
                          <td className="py-2 text-slate-400">{v.type}</td>
                          <td className="py-2">
                            <input
                              type="number"
                              value={v.startValue as number}
                              onChange={(e) => {
                                const copy = [...variables];
                                copy[i].startValue = parseFloat(e.target.value) || 0;
                                setVariables(copy);
                              }}
                              className="bg-[#0e121a] border border-[#243048] rounded px-2 py-1 text-xs text-white w-20 font-mono"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={v.unit || ''}
                              onChange={(e) => {
                                const copy = [...variables];
                                copy[i].unit = e.target.value;
                                setVariables(copy);
                              }}
                              className="bg-[#0e121a] border border-[#243048] rounded px-2 py-1 text-xs text-slate-400 w-14 font-mono"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={v.description || ''}
                              onChange={(e) => {
                                const copy = [...variables];
                                copy[i].description = e.target.value;
                                setVariables(copy);
                              }}
                              className="bg-[#0e121a] border border-[#243048] rounded px-2 py-1 text-xs text-slate-400 w-48 font-mono"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => handleRemoveVariable(i)}
                              className="p-1 hover:text-rose-400 text-slate-500"
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
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-400" /> modelDescription.xml (FMI {fmiVersion})
                  </h3>
                  <button
                    onClick={() => copyText(generatedXml, 'xml')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    {copiedCode === 'xml' ? 'Copied' : 'Copy XML'}
                  </button>
                </div>
                <pre className="flex-1 p-3 rounded-lg bg-[#090c12] border border-[#1e273a] text-[11px] font-mono text-amber-200 overflow-auto select-all">
                  {generatedXml}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-sky-400" /> sources/{modelName}.c (ANSI C Wrapper)
                  </h3>
                  <button
                    onClick={() => copyText(cSource, 'c')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    {copiedCode === 'c' ? 'Copied' : 'Copy C Code'}
                  </button>
                </div>
                <pre className="flex-1 p-3 rounded-lg bg-[#090c12] border border-[#1e273a] text-[11px] font-mono text-sky-200 overflow-auto select-all">
                  {cSource}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" /> Paste External `modelDescription.xml` Content
                </h3>

                <textarea
                  rows={8}
                  placeholder="Paste contents of external modelDescription.xml here..."
                  value={importXml}
                  onChange={(e) => setImportXml(e.target.value)}
                  className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleParseImportXml}
                    className="py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors"
                  >
                    Parse FMU Schema
                  </button>
                </div>
              </div>

              {parsedModel && (
                <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">{parsedModel.modelName}</h4>
                      <p className="text-xs text-slate-400">
                        Standard: FMI {parsedModel.fmiVersion} | GUID: {parsedModel.guid}
                      </p>
                    </div>

                    <button
                      onClick={handleInstantiateImportedBlock}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Instantiate FMU Block on Canvas
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-slate-400">Inputs ({parsedModel.inputs.length})</div>
                      <div className="text-sky-300 mt-1 truncate">
                        {parsedModel.inputs.map((v) => v.name).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-slate-400">Outputs ({parsedModel.outputs.length})</div>
                      <div className="text-emerald-300 mt-1 truncate">
                        {parsedModel.outputs.map((v) => v.name).join(', ') || 'None'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-slate-400">Parameters ({parsedModel.parameters.length})</div>
                      <div className="text-amber-300 mt-1 truncate">
                        {parsedModel.parameters.map((v) => v.name).join(', ') || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
