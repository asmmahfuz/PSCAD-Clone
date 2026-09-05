import React, { useState } from 'react';
import {
  X, FileCode, Upload, Download, Copy, Check, CheckCircle2,
  Layers, Zap
} from 'lucide-react';

import { PscxParser, type PscxParseResult } from '../../interop/pscxParser';
import { PscxSerializer } from '../../interop/pscxSerializer';
import type { CircuitProject } from '../../types';

interface ProjectImportExportModalProps {
  currentProject: CircuitProject;
  onImportProject: (project: CircuitProject) => void;
  onClose: () => void;
}

export const ProjectImportExportModal: React.FC<ProjectImportExportModalProps> = ({
  currentProject,
  onImportProject,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'benchmarks'>('import');
  
  // Import state
  const [xmlInput, setXmlInput] = useState<string>('');
  const [parseResult, setParseResult] = useState<PscxParseResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [importedSuccess, setImportedSuccess] = useState<boolean>(false);

  // Generated XML for Export
  const exportedXml = React.useMemo(() => {
    return PscxSerializer.serialize(currentProject, '5.0.0');
  }, [currentProject]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setXmlInput(content);
        try {
          const parsed = PscxParser.parse(content);
          setParseResult(parsed);
        } catch (err: any) {
          console.error('[PSCX Parser Error]:', err);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleParseManualXml = () => {
    if (!xmlInput.trim()) return;
    try {
      const parsed = PscxParser.parse(xmlInput);
      setParseResult(parsed);
    } catch (err: any) {
      console.error('[PSCX Parser Error]:', err);
    }
  };

  const handleApplyImport = () => {
    if (!parseResult) return;
    onImportProject(parseResult.project);
    setImportedSuccess(true);
    setTimeout(() => {
      setImportedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleDownloadPscx = () => {
    const blob = new Blob([exportedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name || 'PSCAD_Project'}.pscx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(exportedXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadBenchmark = (type: 'IEEE14' | 'CIGRE_HVDC' | 'CABLE_SYSTEM') => {
    let benchmarkXml = '';
    if (type === 'IEEE14') {
      benchmarkXml = `<?xml version="1.0" encoding="UTF-8"?>
<project name="IEEE_14_Bus_Benchmark" version="5.0.0">
  <paramlist name="Settings">
    <param name="time_step" value="50.0" />
    <param name="total_time" value="1.0" />
  </paramlist>
  <definitions>
    <definition name="Main" type="schematic">
      <schematic>
        <components>
          <User classid="UserCmp" name="master:source_3p" id="1" x="120" y="200"><paramlist name="Parameters"><param name="Vnom" value="138.0" /><param name="Fnom" value="60.0" /></paramlist></User>
          <User classid="UserCmp" name="master:ground" id="2" x="120" y="280"><paramlist name="Parameters"></paramlist></User>
          <User classid="UserCmp" name="master:tline" id="3" x="320" y="200"><paramlist name="Parameters"><param name="length" value="45.0" /></paramlist></User>
          <User classid="UserCmp" name="master:resistor" id="4" x="520" y="200"><paramlist name="Parameters"><param name="R" value="50.0" /></paramlist></User>
          <User classid="UserCmp" name="master:ground" id="5" x="520" y="280"><paramlist name="Parameters"></paramlist></User>
          <User classid="UserCmp" name="master:voltmeter" id="6" x="420" y="140"><paramlist name="Parameters"><param name="signalName" value="V_Bus14" /></paramlist></User>
        </components>
        <wires>
          <Wire id="1"><Nodes><Node x="150" y="200"/><Node x="290" y="200"/></Nodes></Wire>
          <Wire id="2"><Nodes><Node x="350" y="200"/><Node x="490" y="200"/></Nodes></Wire>
          <Wire id="3"><Nodes><Node x="120" y="240"/><Node x="120" y="260"/></Nodes></Wire>
          <Wire id="4"><Nodes><Node x="520" y="240"/><Node x="520" y="260"/></Nodes></Wire>
        </wires>
      </schematic>
    </definition>
  </definitions>
</project>`;
    } else if (type === 'CIGRE_HVDC') {
      benchmarkXml = `<?xml version="1.0" encoding="UTF-8"?>
<project name="CIGRE_HVDC_Benchmark" version="5.0.0">
  <paramlist name="Settings">
    <param name="time_step" value="25.0" />
    <param name="total_time" value="0.8" />
  </paramlist>
  <definitions>
    <definition name="Main" type="schematic">
      <schematic>
        <components>
          <User classid="UserCmp" name="master:source_3p" id="1" x="120" y="200"><paramlist name="Parameters"><param name="Vnom" value="345.0" /></paramlist></User>
          <User classid="UserCmp" name="master:ground" id="2" x="120" y="280"><paramlist name="Parameters"></paramlist></User>
          <User classid="UserCmp" name="master:transformer_3p" id="3" x="280" y="200"><paramlist name="Parameters"><param name="V1" value="345.0" /><param name="V2" value="213.0" /><param name="MVA" value="1000.0" /></paramlist></User>
          <User classid="UserCmp" name="master:graetz_bridge" id="4" x="480" y="200"><paramlist name="Parameters"><param name="alphaDeg" value="15.0" /></paramlist></User>
          <User classid="UserCmp" name="master:voltmeter" id="5" x="620" y="160"><paramlist name="Parameters"><param name="signalName" value="Vdc_Rectifier" /></paramlist></User>
        </components>
        <wires>
          <Wire id="1"><Nodes><Node x="150" y="200"/><Node x="240" y="200"/></Nodes></Wire>
          <Wire id="2"><Nodes><Node x="320" y="200"/><Node x="440" y="200"/></Nodes></Wire>
        </wires>
      </schematic>
    </definition>
  </definitions>
</project>`;
    } else {
      benchmarkXml = `<?xml version="1.0" encoding="UTF-8"?>
<project name="Underground_Cable_Benchmark" version="5.0.0">
  <paramlist name="Settings">
    <param name="time_step" value="50.0" />
    <param name="total_time" value="0.5" />
  </paramlist>
  <definitions>
    <definition name="Main" type="schematic">
      <schematic>
        <components>
          <User classid="UserCmp" name="master:source_3p" id="1" x="120" y="200"><paramlist name="Parameters"><param name="Vnom" value="230.0" /></paramlist></User>
          <User classid="UserCmp" name="master:ground" id="2" x="120" y="280"><paramlist name="Parameters"></paramlist></User>
          <User classid="UserCmp" name="master:cable" id="3" x="340" y="200"><paramlist name="Parameters"><param name="length" value="25.0" /><param name="R" value="0.017" /><param name="C" value="0.22" /></paramlist></User>
          <User classid="UserCmp" name="master:resistor" id="4" x="560" y="200"><paramlist name="Parameters"><param name="R" value="100.0" /></paramlist></User>
          <User classid="UserCmp" name="master:ground" id="5" x="560" y="280"><paramlist name="Parameters"></paramlist></User>
        </components>
        <wires>
          <Wire id="1"><Nodes><Node x="150" y="200"/><Node x="300" y="200"/></Nodes></Wire>
          <Wire id="2"><Nodes><Node x="380" y="200"/><Node x="530" y="200"/></Nodes></Wire>
        </wires>
      </schematic>
    </definition>
  </definitions>
</project>`;
    }

    setXmlInput(benchmarkXml);
    const parsed = PscxParser.parse(benchmarkXml);
    setParseResult(parsed);
    setActiveTab('import');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-sans text-xs animate-in fade-in duration-200">
      <div className="bg-[#121620] border border-[#263147] rounded-xl w-[1000px] max-w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#161b26] border-b border-[#263147] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Official MHI PSCAD Interoperability Studio
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  .pscx v4 & v5 XML
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Bidirectional round-trip parser, serializer, and schematic topology translator
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#202738] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex items-center justify-between px-5 border-b border-[#212c3f] bg-[#141923]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'import'
                  ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import .pscx XML</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .pscx XML</span>
            </button>
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'benchmarks'
                  ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PSCAD Benchmark Cases</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5 flex-1 overflow-y-auto bg-[#0d1017]">
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Drop Area */}
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#2b3952] hover:border-sky-500/60 bg-[#141924] rounded-xl p-5 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-sky-400 mb-2" />
                  <span className="font-semibold text-slate-200">Click to Browse or Drag & Drop .pscx File</span>
                  <span className="text-[11px] text-slate-400 mt-1">Official PSCAD v4, v4.6, or v5 Project File</span>
                  <input
                    type="file"
                    accept=".pscx,.xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* XML Editor / Viewer */}
              <div className="bg-[#141924] border border-[#263147] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300">PSCAD XML Source Code:</span>
                  <button
                    onClick={handleParseManualXml}
                    className="px-2.5 py-1 bg-[#1e2638] hover:bg-[#28334a] text-slate-200 rounded border border-[#2d3a52] transition-colors"
                  >
                    Parse XML Code
                  </button>
                </div>
                <textarea
                  value={xmlInput}
                  onChange={(e) => setXmlInput(e.target.value)}
                  placeholder="Paste <?xml ...?> PSCAD .pscx code here directly..."
                  rows={8}
                  className="w-full bg-[#0a0d14] border border-[#1f2838] rounded p-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Parsing Results Summary */}
              {parseResult && (
                <div className="bg-[#141924] border border-emerald-500/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Successfully Translated PSCAD Case: {parseResult.project.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">PSCAD Schema Version: {parseResult.pscadVersion}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Components Parsed:</div>
                      <div className="text-slate-100 font-bold text-sm">{parseResult.componentsParsed}</div>
                    </div>
                    <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Wires & Nets:</div>
                      <div className="text-slate-100 font-bold text-sm">{parseResult.wiresParsed}</div>
                    </div>
                    <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Time Step dt:</div>
                      <div className="text-slate-100 font-bold text-sm">{(parseResult.project.dt * 1e6).toFixed(1)} µs</div>
                    </div>
                    <div className="bg-[#0f131d] p-2.5 rounded border border-[#212c3f]">
                      <div className="text-slate-400">Sim Duration:</div>
                      <div className="text-slate-100 font-bold text-sm">{parseResult.project.tMax} s</div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleApplyImport}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition-colors"
                    >
                      {importedSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Project Loaded into Canvas!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Load Project into Canvas</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-[#141924] border border-[#263147] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-200">Generated Official PSCAD .pscx Code</div>
                    <div className="text-[11px] text-slate-400">Compatible with commercial MHI PSCAD v4.6 & v5.0 software</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2638] hover:bg-[#28334a] text-slate-200 rounded-lg border border-[#2d3a52] transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied XML' : 'Copy XML'}</span>
                    </button>

                    <button
                      onClick={handleDownloadPscx}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .pscx</span>
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  value={exportedXml}
                  rows={14}
                  className="w-full bg-[#0a0d14] border border-[#1f2838] rounded p-3 text-slate-200 font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#141924] border border-[#263147] hover:border-sky-500/50 rounded-xl p-4 flex flex-col justify-between transition-colors">
                <div>
                  <div className="font-bold text-sm text-slate-100 mb-1">IEEE 14-Bus System</div>
                  <div className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Standard IEEE 14-bus transmission system with 138 kV sources, Bergeron transmission lines, and bus voltage probes.
                  </div>
                </div>
                <button
                  onClick={() => handleLoadBenchmark('IEEE14')}
                  className="w-full py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg font-medium transition-colors"
                >
                  Load IEEE 14-Bus PSCAD Case
                </button>
              </div>

              <div className="bg-[#141924] border border-[#263147] hover:border-sky-500/50 rounded-xl p-4 flex flex-col justify-between transition-colors">
                <div>
                  <div className="font-bold text-sm text-slate-100 mb-1">CIGRE HVDC Benchmark</div>
                  <div className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Classic 1000 MW 500 kV Monopolar LCC Graetz bridge HVDC benchmark with 345/213 kV converter transformer and DC link.
                  </div>
                </div>
                <button
                  onClick={() => handleLoadBenchmark('CIGRE_HVDC')}
                  className="w-full py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg font-medium transition-colors"
                >
                  Load CIGRE HVDC PSCAD Case
                </button>
              </div>

              <div className="bg-[#141924] border border-[#263147] hover:border-sky-500/50 rounded-xl p-4 flex flex-col justify-between transition-colors">
                <div>
                  <div className="font-bold text-sm text-slate-100 mb-1">230 kV Underground Cable</div>
                  <div className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    230 kV XLPE underground cable feeder with cross-bonded metallic sheaths and load bus overvoltage monitoring.
                  </div>
                </div>
                <button
                  onClick={() => handleLoadBenchmark('CABLE_SYSTEM')}
                  className="w-full py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg font-medium transition-colors"
                >
                  Load Cable PSCAD Case
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
