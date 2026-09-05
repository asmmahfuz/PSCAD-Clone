import React, { useState, useEffect } from 'react';
import {
  Server,

  Terminal,
  Play,
  Square,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Code,
  Activity,
  FileText,
  Radio,
} from 'lucide-react';

import { remoteServerService, type RpcServerInfo } from '../../services/remoteServerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationServerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'server' | 'cli' | 'python' | 'rpc_test'>('server');
  const [serverInfo, setServerInfo] = useState<RpcServerInfo>({
    is_running: false,
    port: 8080,
    active_clients: 0,
    total_requests: 0,
    address: 'http://127.0.0.1:8080',
  });
  const [portInput, setPortInput] = useState<number>(8080);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

  // CLI Generator states
  const [cliProject, setCliProject] = useState<string>('models/ieee_14bus.pscx');
  const [cliDt, setCliDt] = useState<number>(50);
  const [cliTMax, setCliTMax] = useState<number>(0.5);
  const [cliNodes, setCliNodes] = useState<number>(14);
  const [cliFormat, setCliFormat] = useState<'csv' | 'json' | 'comtrade'>('csv');
  const [cliOutput, setCliOutput] = useState<string>('output/sim_results.csv');

  // RPC Tester states
  const [rpcMethod, setRpcMethod] = useState<string>('pscad.ping');
  const [rpcParams, setRpcParams] = useState<string>('{}');
  const [rpcResponse, setRpcResponse] = useState<string>('// RPC responses will appear here');
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      const interval = setInterval(checkStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const status = await remoteServerService.getServerStatus();
      setServerInfo(status);
    } catch (e) {}
  };

  const handleStartServer = async () => {
    setIsStarting(true);
    try {
      const res = await remoteServerService.startNativeServer(portInput);
      setServerInfo(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopServer = async () => {
    try {
      await remoteServerService.stopNativeServer();
      setServerInfo((prev) => ({ ...prev, is_running: false, active_clients: 0 }));
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRunRpcTest = async () => {
    setRpcLoading(true);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(rpcParams);
      } catch (e) {
        setRpcResponse(`// JSON Parse Error: ${(e as Error).message}`);
        setRpcLoading(false);
        return;
      }

      const res = await remoteServerService.sendRpcRequest(rpcMethod, parsed);
      setRpcResponse(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setRpcResponse(`// RPC Error: ${err.message}\n// Ensure PSCAD Modern RPC server is running on ${serverInfo.address}`);
    } finally {
      setRpcLoading(false);
    }
  };

  const generatedCliCmd = `pscad-modern --headless --project "${cliProject}" --dt ${cliDt * 1e-6} --t-max ${cliTMax} --nodes ${cliNodes} --output "${cliOutput}" --format ${cliFormat}`;
  const generatedServerCmd = `pscad-modern --server --port ${portInput}`;

  const pythonSnippet = `"""
PSCAD Modern Python Automation Client
Connect to PSCAD Modern Headless Server and run batch parametric sweeps.
"""
from pscad_modern import PSCad, Project
import matplotlib.pyplot as plt

# 1. Connect to local or remote PSCAD Modern Simulation Server
pscad = PSCad.connect("http://127.0.0.1:${portInput}")
print(f"Connected to {pscad.version}")

# 2. Load or build schematic project
project = pscad.load_project("${cliProject}")

# 3. Parametric Fault Impedance Sweep
fault_resistances = [0.01, 1.0, 5.0, 10.0, 25.0]
results = []

for rf in fault_resistances:
    print(f"Running simulation with Fault Resistance = {rf} Ohms...")
    project.set_parameters("Fault_1", {"resistance": rf, "duration": 0.08})
    sim_res = project.run(dt=${cliDt}e-6, t_max=${cliTMax})
    df = sim_res.to_dataframe()
    results.append((rf, df))

# 4. Extract and Plot Waveforms
fig, ax = plt.subplots(figsize=(10, 5))
for rf, df in results:
    ax.plot(df['Time_s'] * 1000, df['V_Node_1'], label=f"Rf = {rf} Ω")

ax.set_title("Parametric Fault Voltage Response")
ax.set_xlabel("Time (ms)")
ax.set_ylabel("Bus Voltage (kV)")
ax.grid(True)
ax.legend()
plt.tight_layout()
plt.show()
`;

  const mhiLegacySnippet = `"""
MHI PSCAD Legacy Script Drop-In Compatibility
Existing scripts using 'import mhi.pscad' execute seamlessly with PSCAD Modern.
"""
import pscad_modern.mhi_compat as mhi

# Initialize application controller
app = mhi.application()
print(f"MHI Compat Host: {app.version()}")

# Load workspace and project
project = app.load("${cliProject}")
project.parameters(dt=5e-5, duration=0.3)

# Run simulation
canvas = project.user_canvas("Main")
project.run()

# Retrieve signals
v_bus = canvas.get_signal("V_Bus1")
print(f"Simulated {len(v_bus.values)} points, Peak Voltage: {max(v_bus.values):.2f} kV")
`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#10141e] border border-sky-500/30 w-[1000px] max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#161b28] border-b border-[#222d42] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Headless Automation & RPC Server Hub
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
                  v5.1.0 JSON-RPC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Command-line batch simulation runner, WebSocket / REST RPC daemon, and Python automation controller.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {serverInfo.is_running ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Server Online ({serverInfo.address})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 border border-slate-700 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Server Offline
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 bg-[#131824] border-b border-[#222d42] gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'server'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" /> Server Control & Status
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'cli'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> Headless CLI Generator
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'python'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" /> Python Client (`pscad-modern-py`)
          </button>

          <button
            onClick={() => setActiveTab('rpc_test')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'rpc_test'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Live JSON-RPC Console
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0d111a]">
          {/* TAB 1: SERVER CONTROL */}
          {activeTab === 'server' && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-7 space-y-5">
                <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" /> Daemon Settings & Port Configuration
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">RPC TCP / HTTP Port</label>
                      <input
                        type="number"
                        value={portInput}
                        onChange={(e) => setPortInput(parseInt(e.target.value) || 8080)}
                        className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-sky-400"
                        disabled={serverInfo.is_running}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Protocol Binding</label>
                      <input
                        type="text"
                        value="127.0.0.1 (Localhost / IPv4)"
                        disabled
                        className="w-full bg-[#0e121a] border border-[#222c3d] rounded-lg px-3 py-2 text-sm font-mono text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {!serverInfo.is_running ? (
                      <button
                        onClick={handleStartServer}
                        disabled={isStarting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all"
                      >
                        <Play className="w-4 h-4" /> Start RPC Server
                      </button>
                    ) : (
                      <button
                        onClick={handleStopServer}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all"
                      >
                        <Square className="w-4 h-4" /> Stop RPC Server
                      </button>
                    )}

                    <button
                      onClick={checkStatus}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                      title="Refresh Status"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Supported JSON-RPC 2.0 API Methods
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.ping</span>
                      <span className="text-slate-400">Heartbeat & version telemetry</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.run_headless</span>
                      <span className="text-slate-400">Run full time-domain simulation batch</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.start_simulation</span>
                      <span className="text-slate-400">Initialize interactive stepped session</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.step</span>
                      <span className="text-slate-400">Step simulation forward by N intervals</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.set_parameter</span>
                      <span className="text-slate-400">Live parameter mutation without restart</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0f131d] border border-[#20293d]">
                      <span className="text-sky-300">pscad.run_batch_sweep</span>
                      <span className="text-slate-400">Multi-threaded Rayon Monte Carlo sweep</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status metrics */}
              <div className="col-span-5 space-y-4">
                <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                  <h3 className="text-sm font-bold text-slate-100">Live Telemetry & Diagnostics</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-xs text-slate-400">Status</div>
                      <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                        {serverInfo.is_running ? 'RUNNING' : 'STOPPED'}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-xs text-slate-400">Port</div>
                      <div className="text-base font-bold font-mono text-sky-400 mt-1">
                        :{serverInfo.port}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-xs text-slate-400">Active Clients</div>
                      <div className="text-base font-bold font-mono text-amber-400 mt-1">
                        {serverInfo.active_clients}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0e131d] border border-[#222d42]">
                      <div className="text-xs text-slate-400">Requests Processed</div>
                      <div className="text-base font-bold font-mono text-purple-400 mt-1">
                        {serverInfo.total_requests}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs text-slate-400 mb-1.5">Standalone CLI Server Command</div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0a0d14] border border-[#20293d] font-mono text-xs text-slate-300">
                      <span className="truncate flex-1">{generatedServerCmd}</span>
                      <button
                        onClick={() => copyToClipboard(generatedServerCmd, 'srv_cmd')}
                        className="p-1 hover:text-white text-slate-400"
                        title="Copy Command"
                      >
                        {copied === 'srv_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLI GENERATOR */}
          {activeTab === 'cli' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" /> Headless Execution Parameter Builder
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Target Project (.pscx / .json)</label>
                    <input
                      type="text"
                      value={cliProject}
                      onChange={(e) => setCliProject(e.target.value)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Simulation Time Step (Δt in μs)</label>
                    <input
                      type="number"
                      value={cliDt}
                      onChange={(e) => setCliDt(parseFloat(e.target.value) || 50)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Total Duration (t_max in s)</label>
                    <input
                      type="number"
                      value={cliTMax}
                      onChange={(e) => setCliTMax(parseFloat(e.target.value) || 0.5)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Number of Nodes</label>
                    <input
                      type="number"
                      value={cliNodes}
                      onChange={(e) => setCliNodes(parseInt(e.target.value) || 14)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Output Format</label>
                    <select
                      value={cliFormat}
                      onChange={(e) => setCliFormat(e.target.value as any)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    >
                      <option value="csv">CSV (Comma Separated Values)</option>
                      <option value="json">JSON (Full Data Structure)</option>
                      <option value="comtrade">IEEE C37.111 COMTRADE (.cfg / .dat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Output File Destination</label>
                    <input
                      type="text"
                      value={cliOutput}
                      onChange={(e) => setCliOutput(e.target.value)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Generated Command Line Execution String</span>
                    <button
                      onClick={() => copyToClipboard(generatedCliCmd, 'cli_cmd')}
                      className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                    >
                      {copied === 'cli_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Command
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#090c12] border border-[#1e273a] text-xs font-mono text-emerald-300 overflow-x-auto select-all">
                    {generatedCliCmd}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PYTHON CLIENT */}
          {activeTab === 'python' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Code className="w-4 h-4 text-sky-400" /> Python Automation (`pscad-modern-py`)
                  </h3>
                  <button
                    onClick={() => copyToClipboard(pythonSnippet, 'py_code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 text-xs font-semibold"
                  >
                    {copied === 'py_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Python Script
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-[#090c12] border border-[#1e273a] text-xs font-mono text-slate-200 overflow-x-auto max-h-72 select-all">
                  {pythonSnippet}
                </pre>
              </div>

              <div className="p-5 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" /> Legacy MHI PSCAD Drop-In Migration (`mhi.pscad`)
                  </h3>
                  <button
                    onClick={() => copyToClipboard(mhiLegacySnippet, 'mhi_code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 text-xs font-semibold"
                  >
                    {copied === 'mhi_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Legacy Script
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-[#090c12] border border-[#1e273a] text-xs font-mono text-slate-300 overflow-x-auto max-h-56 select-all">
                  {mhiLegacySnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: RPC TESTER */}
          {activeTab === 'rpc_test' && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-3">
                  <h3 className="text-sm font-bold text-slate-100">Send JSON-RPC Request</h3>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">RPC Method</label>
                    <select
                      value={rpcMethod}
                      onChange={(e) => {
                        setRpcMethod(e.target.value);
                        if (e.target.value === 'pscad.ping') setRpcParams('{}');
                        if (e.target.value === 'pscad.get_version') setRpcParams('{}');
                        if (e.target.value === 'pscad.start_simulation') setRpcParams('{\n  "dt": 0.00005,\n  "t_max": 0.2,\n  "num_nodes": 6\n}');
                        if (e.target.value === 'pscad.step') setRpcParams('{\n  "steps": 10\n}');
                        if (e.target.value === 'pscad.set_parameter') setRpcParams('{\n  "component_id": "Src_1",\n  "param_name": "voltage",\n  "value": 230.0\n}');
                      }}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg px-3 py-2 text-xs font-mono text-white"
                    >
                      <option value="pscad.ping">pscad.ping</option>
                      <option value="pscad.get_version">pscad.get_version</option>
                      <option value="pscad.start_simulation">pscad.start_simulation</option>
                      <option value="pscad.step">pscad.step</option>
                      <option value="pscad.set_parameter">pscad.set_parameter</option>
                      <option value="pscad.run_headless">pscad.run_headless</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Parameters (JSON Object)</label>
                    <textarea
                      rows={6}
                      value={rpcParams}
                      onChange={(e) => setRpcParams(e.target.value)}
                      className="w-full bg-[#0e121a] border border-[#2d3a54] rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <button
                    onClick={handleRunRpcTest}
                    disabled={rpcLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
                  >
                    <Zap className="w-4 h-4" /> {rpcLoading ? 'Executing...' : 'Dispatch RPC Call'}
                  </button>
                </div>
              </div>

              <div className="col-span-7">
                <div className="p-4 rounded-xl bg-[#161c2a] border border-[#232f48] space-y-2 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100">Response Payload</h3>
                    <button
                      onClick={() => copyToClipboard(rpcResponse, 'rpc_resp')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {copied === 'rpc_resp' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="flex-1 p-4 rounded-xl bg-[#090c12] border border-[#1e273a] text-xs font-mono text-sky-300 overflow-auto select-all">
                    {rpcResponse}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
