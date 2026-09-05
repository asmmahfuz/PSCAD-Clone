# PSCAD Modern — High-Performance EMTDC Engineering CAD & Simulation Suite

**PSCAD Modern** is a next-generation Electromagnetic Transient (EMTDC) power systems simulation suite and circuit CAD environment, built with a native Rust numerical simulation kernel and a responsive desktop user interface powered by Tauri 2.0 and React.

---

## 🚀 Standalone Executable (.exe)

### Location
- **Portable Binary**: [`dist-exe/pscad-modern.exe`](file:///c:/Users/Mahfuz/Desktop/Test%20Runs/PSCad/dist-exe/pscad-modern.exe)
- **Tauri Release Target**: [`src-tauri/target/release/pscad-modern.exe`](file:///c:/Users/Mahfuz/Desktop/Test%20Runs/PSCad/src-tauri/target/release/pscad-modern.exe)

---

## ❓ Portability & Running on a New Computer

> **Yes! You can copy `pscad-modern.exe` onto a USB drive or send it to another computer, and it will run as a standalone app without needing any other files, folders, Node.js, or source code.**

### Why it works:
1. **Embedded Frontend**: The complete web UI (HTML, JavaScript, CSS stylesheets, icons, WebGL shaders, and Canvas renderers) is compiled directly into the binary during the build process.
2. **Embedded Simulation Engine**: The high-performance Rust EMTDC solver, matrix factorization algorithms, companion models, and GPU bitonic sorters are statically linked into the `.exe`.
3. **Target System Requirement**: Any modern **Windows 10 or Windows 11** machine. Windows 10/11 comes with the Microsoft Edge WebView2 runtime pre-installed as a core OS component. If run on a fresh Windows Server or older Windows 7/8 machine, it only requires the standard free Microsoft WebView2 Evergreen Runtime.

---

## 🖥️ How to Run PSCAD Modern

### 1. Desktop GUI Application (Default)
Simply **double-click** `pscad-modern.exe` or execute it from PowerShell / Command Prompt:
```powershell
.\dist-exe\pscad-modern.exe
```

#### GUI Highlights:
- **Custom Frameless Title Bar**: Native window controls (Minimize, Maximize/Restore, Fullscreen, Pin-on-Top, Close) with titlebar double-click support and drag-to-move.
- **Native OS Menus**: Integrated top menu bar for File, Edit, View, Project, Simulation, Component, Tools, Window, and Help actions.
- **Schematic Canvas & Oscilloscopes**: High-FPS interactive multi-bus CAD canvas, real-time waveform monitors, phasor viewers, and harmonic spectrum analyzers.
- **Local Project Storage**: Native file dialogs for opening and saving `.pscx` projects, COMTRADE IEEE C37.111 records, and CSV exports.

---

### 2. Headless CLI Simulation Runner
Run lightning-fast batch simulations directly from the command line without launching the GUI:
```powershell
.\dist-exe\pscad-modern.exe --headless --dt 0.00005 --t-max 0.05 --nodes 6
```

#### CLI Parameters:
| Flag | Description | Default |
|---|---|---|
| `--headless`, `-h` | Runs the simulation in headless terminal mode | `false` |
| `--dt <seconds>` | Integration time step (e.g., `0.00005` for 50 µs) | `0.00005` |
| `--t-max <seconds>` | Total simulation duration (e.g., `0.1` for 100 ms) | `0.1` |
| `--nodes <count>` | Number of electrical network nodes | `6` |
| `--project <path>` | Path to a `.pscx` project file to simulate | *Optional* |
| `--output <path>` | Destination path for simulation output | *Optional* |
| `--format <type>` | Output format: `json`, `csv`, or `comtrade` | `json` |

---

### 3. Remote JSON-RPC Automation Server Mode
Start the high-throughput TCP/HTTP JSON-RPC backend for remote automation and Python control:
```powershell
.\dist-exe\pscad-modern.exe --server --port 8080
```
This enables programmatic control from Python via `pscad_modern.PSCadClient` to:
- Load projects and adjust live parameters on the fly
- Start, step, pause, and stop simulations
- Stream telemetry and waveform buffers at microsecond intervals
- Trigger parallel batch parameter sweeps across all CPU cores

---

## 🛠️ Building and Developing

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust Toolchain](https://rustup.rs/) (v1.75+)

### Development Mode (Browser / HMR)
```powershell
npm run dev
```

### Desktop Development Mode (Tauri)
```powershell
npm run tauri dev
```

### Compiling a New Standalone `.exe`
To rebuild the release executable after modifying code:
```powershell
npm run build:exe
```
or:
```powershell
$env:CARGO_TARGET_DIR="C:\Users\Mahfuz\.cargo_target\pscad"; npx @tauri-apps/cli build --no-bundle
Copy-Item "C:\Users\Mahfuz\.cargo_target\pscad\release\pscad-modern.exe" -Destination "dist-exe\pscad-modern.exe" -Force
```

---

## 🏗️ Architecture Overview

```
PSCAD Modern/
├── dist-exe/                    # Standalone portable Windows binary
│   └── pscad-modern.exe         # Single-file self-contained executable (~15 MB)
├── src/                         # Frontend Application (React 19 + TypeScript + Tailwind)
│   ├── components/              # Circuit canvas, oscilloscopes, titlebar, parameter dialogs
│   ├── services/                # Tauri IPC bridge, file system adapter, session cache
│   └── engine/                  # Browser-side fallback math & EMT engine
├── src-tauri/                   # Desktop Host & Native Simulation Kernel (Rust)
│   ├── src/
│   │   ├── commands/            # Native Tauri IPC handlers (window, fs, session, sim)
│   │   ├── engine/              # EMTDC matrix solver, Bergeron lines, synchronous machines, MMC
│   │   ├── gpu/                 # Bitonic sorting & SIMD acceleration
│   │   ├── server/              # Headless runner & JSON-RPC automation server
│   │   ├── lib.rs               # Tauri application runtime setup
│   │   └── main.rs              # Multi-mode entry point (GUI / Headless / Server)
│   ├── capabilities/            # Tauri 2.0 security permissions (window, fs, dialog)
│   ├── icons/                   # Multi-resolution application icons (.ico, .png, .icns)
│   ├── Cargo.toml               # Rust dependencies & optimization profiles
│   └── tauri.conf.json          # Desktop window & bundle configuration
└── python-client/               # Python automation SDK (pscad_modern)
```

---

## 📄 License & Team
**PSCAD Modern Engineering Team** © 2026. All rights reserved.
