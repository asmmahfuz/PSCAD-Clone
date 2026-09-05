# PSCAD Clone
### High-Performance Electromagnetic Transient (EMTDC) Simulation & Power Systems CAD Suite

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat-square)](https://github.com/asmmahfuz/PSCAD-Clone)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=black)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![WebGPU](https://img.shields.io/badge/Graphics-WebGPU%20%2F%20Canvas-FF5722?style=flat-square)](https://www.w3.org/TR/webgpu/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**PSCAD Clone** is a next-generation Electromagnetic Transient (EMTDC) power systems simulation suite and circuit CAD environment. Engineered for researchers, utility engineers, students, and power system designers, it combines a high-throughput native Rust numerical simulation kernel with an interactive desktop CAD interface built on React 19, TypeScript, and Tauri 2.0.

---

## Quick Start: Standalone Desktop App (No Coding Required)

**You do not need to know how to code, install programming languages, or use a terminal to use PSCAD Clone.**

PSCAD Clone is available as a single portable Windows executable (`.exe`):

1. **Download**: Download the pre-compiled `pscad-modern.exe` (or `pscad-clone.exe`) from the [`dist-exe/`](dist-exe/) directory or from the GitHub Releases section.
2. **Double-Click to Run**: Simply double-click the file to launch the application.
3. **No Setup or Dependencies**:
   - No Node.js, Rust, Python, or terminal commands are required.
   - The entire visual interface, schematic editor, power component library, and high-speed simulation engine are self-contained inside the executable.
   - The application is portable: you can copy the `.exe` to a USB flash drive or another Windows 10/11 computer and run it immediately.

---

## Highlights and Key Capabilities

### Fluent Ribbon CAD and Schematic Studio
- **Office-Style Fluent CAD Ribbon**: Tabbed command ribbon with KeyTips keyboard shortcuts, customizable Quick Access Toolbar (QAT), and File Backstage view.
- **Orthogonal Wire Auto-Router**: Smart Manhattan bus routing with live collision avoidance, multi-junction netlist binding, and instant node labeling.
- **Master Component Library**: Categorized library flyout with live search for passive elements, sources, transmission lines, machines, transformers, power electronics, and control blocks.
- **Multi-Window Desktop Workspace**: Floating, dockable, and detachable oscilloscope windows with multi-monitor support.

### Native EMTDC Numerical Kernel
- **Modified Augmented Nodal Analysis (MANA)**: Companion modeling of inductors, capacitors, coupled magnetic circuits, and nonlinear impedances.
- **Sparse LU Solver with CDA**: High-performance sparse matrix factorization with **Critical Damping Adjustment (CDA)** to eliminate numerical chattering across hard switching events.
- **Subsystem Coordinator**: Partition large power networks into decoupled subsystems solved in parallel across CPU threads.

### Comprehensive Power Equipment Library
- **Transmission Lines and Cables**:
  - Polyphase Bergeron distributed parameter model with modal transformation.
  - Frequency-Dependent Phase Domain Line (**FD-Phase**) with automated **Vector Fitting**.
  - Carson earth return equations, skin effect correction, coaxial cable cross-bonding solvers.
- **Rotating Machines and Renewable Generation**:
  - Synchronous Machine $dq0$ Park equations with subtransient reactances and magnetic saturation.
  - Doubly-Fed Induction Generator (**DFIG**) with decoupled active/reactive power control.
  - Permanent Magnet Synchronous Generator (**PMSG**) with Field-Oriented Control (FOC).
  - Multi-mass turbine shaft models for subsynchronous resonance (SSR) analysis.
  - Aerodynamic wind turbine blade dynamics and pitch angle controllers.
- **Advanced Magnetic and Transformer Modeling**:
  - **Jiles-Atherton** dynamic core hysteresis and residual flux tracking for transformer inrush studies.
  - **UMEC (Unified Magnetic Equivalent Circuit)** 3-phase 3-limb and 5-limb transformer core models.
  - On-Load Tap Changers (**OLTC**), phase-shifting transformers, and zigzag grounding transformers.
- **Power Electronics and HVDC**:
  - Modular Multilevel Converters (**MMC**) with Nearest Level Control (NLC) and capacitor voltage sorting.
  - Line-Commutated Converter (**LCC**) 12-pulse bridges for classic HVDC links.
  - **STATCOM** and Static Var Compensators (**SVC**).
  - Detailed valve companion models for IGBTs, MOSFETs, Thyristors, and Diodes.
- **Control Systems (CSMF) and Protection**:
  - Standard IEEE Excitation Systems (**AC1A, DC1A, ST1A**).
  - Turbine Governors (**IEEEG1, DEGOV, GAST, HYGOV**).
  - Power System Stabilizers (**PSS**).
  - **Protection Studio**: IEEE 21 Distance protection (mho and quadrilateral zones), IEEE 87 Differential protection with dual-slope restraint, and IEEE 50/51 Inverse-Time Overcurrent relays.

### WebGPU Oscilloscope and Analytics
- **WebGPU Waveform Rendering**: Hardware-accelerated bitonic sort compute shaders and rendering pipelines capable of rendering millions of simulation points at 60+ FPS.
- **Phasor and Harmonic Analysis**: Real-time vector phasor diagrams, Fast Fourier Transform (FFT) harmonic spectrum breakdown, and Lissajous X-Y trajectories.
- **Frequency Response Scanning**: Automated AC impedance vs. frequency sweep for harmonic resonance identification.
- **Industry Standard Interoperability**:
  - **IEEE C37.111 COMTRADE** export and waveform viewer.
  - **IEEE C37.118** Synchrophasor PMU real-time telemetry streaming.
  - **FMI 2.0** Model Exchange & Co-Simulation export.
  - Native PSCAD **`.pscx`** XML project format import and export.

---

## Architecture Overview

```
PSCAD-Clone/
├── dist-exe/                    # Standalone portable Windows executable
│   └── pscad-modern.exe         # Self-contained desktop app (double-click to run)
├── src/                         # Frontend Application (React 19 + TypeScript + Tailwind)
│   ├── components/              # CAD canvas, ribbon, oscilloscopes, parameter inspector, modals
│   ├── analysis/                # FFT, COMTRADE reader, PMU streamer, frequency scan, multi-run
│   ├── engine/                  # Browser EMT fallback engine & companion modeling
│   │   ├── csmf/                # IEEE exciters, governors, PSS, math & logic transfer functions
│   │   ├── lines/               # Bergeron, FD-Phase, Vector Fitting, Cable Constants
│   │   ├── machines/            # Synchronous (dq0), DFIG, PMSG, multi-mass shafts, wind aero
│   │   ├── powerElectronics/   # MMC, LCC, STATCOM, SVC, thyristors, IGBTs
│   │   ├── protection/          # Distance (IEEE 21), Differential (IEEE 87), Overcurrent
│   │   └── transformers/        # Jiles-Atherton, UMEC 3-phase, OLTC, Phase Shifters
│   ├── gpu/                     # WebGPU WGSL compute shaders & waveform renderers
│   └── services/                # Tauri IPC bridge, native file system, simulation telemetry
├── src-tauri/                   # Desktop Host & Native Simulation Kernel (Rust)
│   └── src/
│       ├── engine/              # High-performance native EMTDC solver & sparse LU engine
│       ├── gpu/                 # SIMD vectorization & GPU compute acceleration
│       ├── server/              # Headless batch runner & JSON-RPC automation server
│       ├── lib.rs               # Tauri 2.0 application setup & IPC bindings
│       └── main.rs              # Multi-mode entry point (GUI / Headless / Server)
└── python-client/               # Python Automation Client SDK (pscad_clone)
    ├── pscad_clone/             # JSON-RPC / WebSocket client & batch sweep wrapper
    └── examples/                # Automated batch simulation scripts
```

---

## Developer Setup and Building from Source

For developers who want to modify the source code or build from scratch:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust Toolchain](https://rustup.rs/) (v1.75 or higher)
- Modern operating system (Windows 10/11, macOS, or Linux)

### 1. Web Development Mode
To run the browser-based development environment with Hot Module Replacement (HMR):
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 2. Desktop Development Mode (Tauri)
To run the desktop application with native window controls and Rust IPC bindings:
```bash
npm run tauri dev
```

### 3. Compiling the Standalone Executable
To compile the standalone production binary:
```bash
npm run build:exe
```
The compiled binary will be placed in `src-tauri/target/release/`.

---

## Headless Simulation Runner and Python Automation

PSCAD Clone includes a headless simulation runner and a JSON-RPC automation server designed for automated batch testing, cluster computing, and parametric sweeps.

### Headless CLI Mode
Simulate any `.pscx` project file directly from the command line without opening a window:
```bash
pscad-clone --headless --dt 0.00005 --t-max 0.1 --project my_circuit.pscx --format csv --output results.csv
```

#### Command-Line Options
| Option | Description | Default |
|---|---|---|
| `--headless`, `-h` | Runs simulation in non-GUI terminal mode | `false` |
| `--dt <seconds>` | Integration time step (e.g. `0.00005` for 50 µs) | `0.00005` |
| `--t-max <seconds>` | Total simulation stop time | `0.1` |
| `--project <path>` | Path to `.pscx` circuit project file | *Optional* |
| `--output <path>` | Destination file for recorded waveforms | *Optional* |
| `--format <type>` | Output format (`csv`, `json`, `comtrade`) | `json` |
| `--nodes <count>` | Network electrical node count | `6` |

---

### Python Automation SDK (`pscad_clone`)

Start the simulation engine as an automation server:
```bash
pscad-clone --server --port 8080
```

Control the simulation programmatically from Python:

```python
from pscad_clone import PSCadClient

# Connect to the local PSCAD Clone automation server
client = PSCadClient(host="localhost", port=8080)

# Load a project and configure parameters
client.load_project("transmission_fault.pscx")
client.set_parameter(component_id="fault_switch", param="closing_time", value=0.04)

# Execute simulation
results = client.run_simulation(dt=5e-5, t_max=0.15)

# Inspect telemetry
time_steps = results["time"]
bus1_voltage = results["channels"]["BUS_1_VOLTAGE"]
print(f"Simulation completed with {len(time_steps)} time steps.")
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Space</kbd> | Start / Pause simulation |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save current project |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open `.pscx` project file |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo last schematic action |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo last schematic action |
| <kbd>R</kbd> | Rotate selected component 90° clockwise |
| <kbd>Delete</kbd> | Delete selected component or wire |
| <kbd>Alt</kbd> | Display Office-style KeyTips navigation badges |
| <kbd>F11</kbd> | Toggle fullscreen mode |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Open detached oscilloscope window |

---

## Pre-Bundled Case Studies

PSCAD Clone includes pre-packaged industrial benchmark models:
- **IEEE 9-Bus System**: Multi-generator transmission test system with dynamic governors and exciters.
- **MMC-HVDC Transmission Link**: Modular Multilevel Converter back-to-back link with submodule capacitor balancing.
- **DFIG Wind Turbine Grid Integration**: Doubly-fed induction generator under three-phase asymmetrical voltage sag.
- **Transformer Energization and Inrush**: Core saturation, residual flux, and ferroresonance using the Jiles-Atherton model.
- **Transmission Line Fault and Auto-Reclose**: Single line-to-ground fault clearing with high-speed distance protection tripping.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions, feature requests, and bug reports are welcome. Feel free to open an issue or submit a pull request.

