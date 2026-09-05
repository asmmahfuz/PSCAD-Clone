# PSCAD Modern - Master Implementation Roadmap & Progress Tracker

> **Tracking File for Multi-Session Development - UI / UX Parity & Commercial Ergonomics Expansion**  
> **Mission**: Transform PSCAD Modern into a 1:1 Commercial-Grade PSCAD™ / EMTDC™ Engineering Suite with Microsoft Fluent Ribbon Architecture, Canvas-Embedded Graph Frames, Unified Workspace Tree, Multi-Tab Component Parameter Modals, Click-to-Jump Diagnostic Messages, and Classic CAD Engineering Aesthetics.  
> **Current Status**: Phases 16, 17, 18, 19 & 20 COMPLETED; Phase 21 READY (Step 21.1 NEXT)  
> **Active Progress**: [██████████░░░░░░] 63% (20/32 Sub-tasks) in Next-Gen UI Parity across Phases 16 – 23  
> **Completed Foundations**: [████████████████] 100% Completed (Phases 1 – 15 Archive at bottom)

---

## 🚨 Strict Multi-Session Execution & Verification Protocol (Anti-Regression Guardrails)

To guarantee high reliability, zero quota burnout, and clean incremental delivery, all upcoming UI/UX parity phases MUST strictly adhere to the following 4 engineering rules:

1. **Atomic Sub-Task Delivery (One Step at a Time)**:
   - Never combine multiple large sub-tasks into a single execution cycle.
   - Work strictly on one discrete step (e.g., Step 18.1 only), verify it completely, update the roadmap, and commit the working code before moving to the next.
2. **Zero Interactive Canvas Drawing for Verification (Pre-Loaded Fixture Driven)**:
   - **Never** attempt to verify canvas or rendering updates by interactively clicking, dragging, or wiring circuits from scratch in automated browser sessions.
   - Always load or inject a pre-configured programmatic test case from `src/examples/caseStudies.ts` (or a dedicated component test fixture) where components, wires, probes, and frames are already pre-placed.
3. **Structured 3-Stage Verification Pipeline**:
   - **Stage 1 (Compile)**: Typecheck with `tsc --noEmit` and build with `npm run build` to guarantee zero broken imports or type mismatches.
   - **Stage 2 (Logic & Unit Tests)**: Validate math, coordinate transformation, signal binding, and state mutation functions in isolation.
   - **Stage 3 (Visual Snapshot)**: Load the pre-configured case study, perform 1 visual snapshot check to confirm DOM/Canvas rendering, and terminate verification immediately.
4. **Zero Trial-and-Error Rabbit Holes**:
   - If an automated visual check does not render as expected on the first try, do not enter a multi-turn interactive retry loop. Isolate the issue directly in the source code or component unit test.

---

## Next-Gen UI & Workflow Parity Roadmap Overview (Phases 16 – 23)

| Phase | Description | Status | Sub-tasks | Target Deliverables |
| :--- | :--- | :---: | :---: | :--- |
| **Phase 16** | Office Ribbon Suite & Quick Access Toolbar (QAT) | `COMPLETED` | 4 / 4 | Fluent Ribbon Tabs (`File`, `Home`, `Components`, `View`, `Tools`, `Help`), QAT Top Bar, Collapsible Ribbon, KeyTips |
| **Phase 17** | Unified Workspace Tree & Master Library Architecture | `COMPLETED` | 4 / 4 | Workspace Tree (Projects, Definitions, Sheets, Resources), Master Library Flyout, Context Menus, Multi-Project Hub |
| **Phase 18** | Canvas-Embedded Graph Frames & Overlay PolyGraphs | `COMPLETED` | 4 / 4 | Embedded Graph Frames on Canvas, Drag-and-Drop Signal Binding, Overlay Legends, PolyGraphs, Frame Export |
| **Phase 19** | Canvas Interactive Runtime Controls & Live Instrumentation | `COMPLETED` | 4 / 4 | On-Schematic Sliders, Rotary Dials, Push Buttons, Toggle Switches, Live LED Badges & Analog Needle Meters, EMTDC Mutator Bridge |
| **Phase 20** | Pop-Out Detachable Oscilloscope Window & Multi-Monitor Support | `COMPLETED` | 4 / 4 | Detachable OS Pop-Out Window, Synchronized Multi-Screen Telemetry Stream, FFT/Lissajous Deep-Dive, Layout Persistence |
| **Phase 21** | Multi-Tab Component Parameter Dialogs & Units Engine | `READY` | 4 / 4 | Multi-Tab Parameter Dialogs, Engineering Unit Conversion ($\Omega, \text{mH}, \mu\text{F}, \text{kV}$), Diagram Previews, Docked/Modal Dual Mode |
| **Phase 22** | Output & Messages Dock with Click-to-Jump Navigation | `READY` | 4 / 4 | Multi-Tab Output Dock (`Build`, `EMTDC`, `Search`, `Errors`), Click-to-Jump Canvas Highlighting, Structured Diagnostics Table |
| **Phase 23** | Classic PSCAD Light CAD Theme & Vector Stencil Parity | `READY` | 4 / 4 | Classic Light Engineering CAD Palette, Strict ANSI/IEC Symbols, Polyphase vs Signal Wire Stencils, Instant Theme Switcher |

---

## Detailed Phase Breakdown & Task Checklists

### Phase 16: Office Ribbon Suite & Quick Access Toolbar (QAT) Architecture

- [x] **Step 16.1: Fluent Ribbon Tab Navigation & Header Consolidation**
  - **Details**: Consolidate the 3-tier header (`DesktopTitleBar`, `OfficeMenuBar`, and `CadRibbon`) into a unified Microsoft Office / PSCAD v5 Fluent Ribbon:
    - Top header combining window drag region, native window controls, project name, and Quick Access Toolbar (QAT).
    - Multi-tab navigation with categorized Ribbon tabs: `File` (Backstage view), `Home` (Project, Simulation, Clipboard, Canvas tools), `Components` (Quick palette & Master Library), `View` (Dock layouts, Zoom, Grid, Themes), `Tools` (LCP, Cable, Protection, FFT, Phasor, Z(f), COMTRADE, Automation, FMI), `Help`.
  - **Target Files**: `src/components/ribbon/CadRibbon.tsx`, `src/components/menu/DesktopTitleBar.tsx`, `src/components/ribbon/FileBackstageDrawer.tsx`, `src/App.tsx`
  - **Validation**: Clean single consolidated Ribbon interface matching PSCAD v5 layout with zero duplicate navigation bars.

- [x] **Step 16.2: Quick Access Toolbar (QAT) & Top-Level Simulation Controls**
  - **Details**: Implement the customizable Quick Access Toolbar placed in the title bar or below the Ribbon:
    - Fast access buttons: `Save (Ctrl+S)`, `Undo (Ctrl+Z)`, `Redo (Ctrl+Y)`, `Run Simulation (F5)`, `Step (F10)`, `Pause (F6)`, `Reset (Shift+F5)`.
    - Customizable dropdown to pin/unpin frequently used tools to the titlebar.
  - **Target Files**: `src/components/ribbon/QuickAccessToolbar.tsx`, `src/components/menu/DesktopTitleBar.tsx`
  - **Validation**: Immediate simulation execution and file operations from any active Ribbon tab via QAT shortcuts.

- [x] **Step 16.3: Categorized Ribbon Groups with Primary & Secondary Action Layouts**
  - **Details**: Build standard PSCAD v5 grouped button containers:
    - Large 32px primary action icons (e.g. *Run EMTDC*, *Compile*, *New Project*, *Snapshot*) with label below.
    - Stacked 16px secondary buttons in 2-row / 3-row grid with group title captions at the bottom (*Simulation Controls*, *Clipboard*, *Draw & Select*, *Master Library*, *Analysis Tools*).
  - **Target Files**: `src/components/ribbon/RibbonGroup.tsx`, `src/components/ribbon/RibbonButton.tsx`, `src/components/ribbon/CadRibbon.tsx`
  - **Validation**: High-density, professional CAD aesthetic with responsive icon scaling on smaller screens.

- [x] **Step 16.4: Ribbon Collapsing, Keyboard KeyTips & Accelerated Access**
  - **Details**: Add keyboard-driven Ribbon interactions:
    - Double-click tab header or press `Ctrl+F1` to collapse Ribbon into compact tab-only mode.
    - Alt-key KeyTips (`Alt+H` for Home, `Alt+C` for Components, `Alt+V` for View, `Alt+T` for Tools, `Alt+E` for Help, `Alt+1`..`7` for QAT).
  - **Target Files**: `src/components/ribbon/CadRibbon.tsx`, `src/components/ribbon/KeyTipsEngine.tsx`, `src/App.tsx`
  - **Validation**: Full keyboard navigation without mouse dependence matching commercial desktop CAD standards.

---

### Phase 17: Unified Workspace Tree & Master Library Architecture

- [x] **Step 17.1: Unified PSCAD Workspace Hierarchy Tree**
  - **Details**: Replace the separate Project Tree / Component Library split with the official PSCAD Workspace pane:
    - Root `Workspace` node containing multiple loaded projects (`.pscx`).
    - Project tree expansion: `Definitions` (User components, Submodules, Custom blocks), `Schematic Sheets` (Main, Sub-pages), `Transmission Lines & Cables`, `Data Files & Resources`.
    - Active project highlighting with right-click context commands (`Set as Active`, `Compile`, `Project Settings`, `Save As`, `Close Project`).
  - **Target Files**: `src/components/project/WorkspaceTree.tsx`, `src/components/project/ProjectTree.tsx`, `src/App.tsx`
  - **Validation**: True multi-project workspace tree reflecting PSCAD EMTDC project hierarchy.

- [x] **Step 17.2: Component Definitions vs. Instances Hierarchy Management**
  - **Details**: Separation of component definitions from schematic instances:
    - Definitions folder in Workspace Tree showing reusable circuit blocks and submodules.
    - Editing a definition automatically propagates structural/parameter updates across all placed instances on schematic sheets.
  - **Target Files**: `src/engine/definitions.ts`, `src/engine/hierarchy.ts`, `src/components/project/WorkspaceTree.tsx`
  - **Validation**: Instantiate 3 instances of a submodule block; changing definition ports updates all 3 instances synchronously.

- [x] **Step 17.3: Master Library Browser & Visual Drag-and-Drop Palette**
  - **Details**: Re-architect component selection to mirror PSCAD Master Library (`master.pslx`):
    - Pop-out / Flyout Master Library window or dedicated tab displaying categorized visual schematics of all electrical & control components.
    - Drag-and-drop component placement directly from the Master Library into any active schematic canvas sheet.
    - Quick-search filter by name, ANSI code, or tag.
  - **Target Files**: `src/components/library/MasterLibraryFlyout.tsx`, `src/components/library/ComponentLibrary.tsx`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Dragging components from the library smoothly stamps new instances onto the canvas at cursor drop coordinates.

- [x] **Step 17.4: Right-Click Canvas & Tree Context Menus**
  - **Details**: Full contextual menu support:
    - Schematic right-click: `Add Component >`, `Add Wire`, `Add Graph Frame`, `Add Sticky Note / Text`, `Zoom to Fit`, `Paste`, `Toggle Grid`.
    - Component right-click: `Edit Parameters (Enter)`, `View Definition`, `Rotate 90° (R)`, `Flip / Mirror`, `Disable / Bypass Component`, `Create Submodule from Selection`.
  - **Target Files**: `src/components/canvas/CanvasContextMenu.tsx`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Complete contextual operation workflow matching desktop PSCAD right-click ergonomics.

---

### Phase 18: Canvas-Embedded Graph Frames & Overlay PolyGraphs

- [x] **Step 18.1: Canvas-Embedded Graph Frame Element**
  - **Details**: Implement Graph Frames as native schematic canvas objects:
    - Drop a `GraphFrame` canvas object directly onto schematic canvas sheets alongside circuit components.
    - Resizable bounding box with drag corner/edge handles for frame width and height with grid snapping.
    - High-performance live 2D/WebGL waveform rendering inside each frame during simulation execution.
    - Zoom/pan affine transform synchronization keeping frame locked to world canvas coordinates.
  - **Target Files**: `src/components/canvas/GraphFrame.tsx`, `src/components/canvas/symbols.ts`, `src/components/canvas/SchematicCanvas.tsx`, `src/types/index.ts`
  - **Validation**: Pre-load case study containing a Graph Frame; verify bounding box geometry, resize handles, and real-time waveform rendering without interactive drawing.

- [x] **Step 18.2: Output Channel / Probe Curve Binding & Overlay Legend**
  - **Details**: Signal routing and multi-trace binding:
    - Bind any Voltmeter, Ammeter, Multimeter, or Control Probe output channel to an embedded Graph Frame.
    - Multi-trace overlay support: Multiple curves rendered with distinct PSCAD trace colors, signal labels, and unit tags.
    - Interactive legend with trace visibility toggles (hide/show individual curves) and active value readouts.
  - **Target Files**: `src/components/canvas/GraphBinding.ts`, `src/components/canvas/GraphFrame.tsx`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Pre-loaded test case with 3 voltage/current probes mapped to a single Graph Frame renders overlay waveforms with colored legends.

- [x] **Step 18.3: PolyGraph Stacked Sub-Traces & Dynamic Y-Scaling**
  - **Details**: Stacked multi-grid PolyGraph display:
    - Split a single Graph Frame into 2 to 4 vertically stacked sub-grids sharing a synchronized time (X) axis.
    - Independent Y-axis auto-scaling, min/max limits, and grid subdivisions per sub-trace.
    - Synchronized vertical crosshair cursor displaying exact numerical values across all stacked traces at time $t$.
  - **Target Files**: `src/components/canvas/GraphFrame.tsx`, `src/components/canvas/PolyGraphView.tsx`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Programmatic test case with stacked 3-phase $V_{abc}$ and $I_{abc}$ PolyGraph traces verifies independent Y-scaling and synchronized cursor tracking.

- [x] **Step 18.4: Graph Frame Context Menu & Waveform Export**
  - **Details**: Dedicated right-click menu and export tools:
    - Frame right-click context menu: `Set Axis Limits`, `Auto-Scale Y`, `Clear Waveforms`, `Convert to PolyGraph`, `Export Data to CSV`, `Copy High-Res PNG Image`.
    - CSV export generator outputting time-series column data matching IEEE COMTRADE / PSCAD table structure.
  - **Target Files**: `src/components/canvas/GraphFrameContextMenu.tsx`, `src/components/canvas/GraphFrame.tsx`, `src/utils/waveformExport.ts`
  - **Validation**: Unit test and DOM trigger test verifying context menu commands and valid CSV export generation.

---

### Phase 19: Canvas Interactive Runtime Controls & Live Instrumentation

- [x] **Step 19.1: On-Schematic Slider & Rotary Knob Elements**
  - **Details**: Continuous user input controls placed on the schematic:
    - Slider and rotary knob canvas elements with configurable min, max, step, and default values.
    - Live numeric badge display showing current parameter value with units.
    - Direct mouse drag interaction updating linked control variable on mouse move.
  - **Target Files**: `src/components/canvas/RuntimeControls.tsx`, `src/components/canvas/symbols.ts`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Pre-load case study with an adjustable load resistance slider; dragging slider dynamically modifies value without pausing simulation.

- [x] **Step 19.2: On-Schematic Push Buttons & Toggle Switches**
  - **Details**: Discrete state triggers placed directly on schematic sheets:
    - Momentary push buttons (e.g. `Fault Trigger`, `Reset`) and latched toggle switches (e.g. `Breaker Close/Open`).
    - Visual state feedback (illuminated LED indicators, 3D switch rocker state).
  - **Target Files**: `src/components/canvas/RuntimeSwitches.tsx`, `src/components/canvas/symbols.ts`, `src/components/canvas/SchematicCanvas.tsx`, `src/engine/solver.ts`
  - **Validation**: Toggle breaker switch on canvas; verify breaker opening and fault cleared in simulation waveform.

- [x] **Step 19.3: Live Dynamic Digital Readouts & Analog Needle Meters**
  - **Details**: On-schematic monitoring badges:
    - Digital LED badges attached to buses/pins showing live RMS voltage, current, active power ($P$), and reactive power ($Q$).
    - Sweeping analog needle meters with colored green/amber/red operating zones and peak hold pointers.
  - **Target Files**: `src/components/canvas/SchematicMeters.tsx`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Pre-loaded test circuit displays live sweeping needle and digital readout matching simulation step telemetry.

- [x] **Step 19.4: Non-Pausing EMTDC Simulation State Mutator Bridge**
  - **Details**: Real-time parameter update pipeline:
    - Dispatch parameter alterations from on-canvas sliders/switches directly to the active Rust/WASM simulation kernel without resetting simulation time.
    - Sherman-Morrison matrix update for variable resistor/conductance branches on the fly.
  - **Target Files**: `src/engine/simulatorBridge.ts`, `src/engine/runtimeMutator.ts`, `src/App.tsx`
  - **Validation**: Alter generator frequency knob during live 10-second simulation; frequency transitions smoothly in real-time.

---

### Phase 20: Pop-Out Detachable Oscilloscope Window & Multi-Monitor Support

- [x] **Step 20.1: Native Pop-Out Detachable Window Architecture**
  - **Details**: Standalone floating window support:
    - Pop-out button on embedded graph frames or the main Oscilloscope panel to launch a dedicated secondary OS window (Tauri multi-window / Web Broadcast API).
    - Window management with title, minimum bounds, and dual-monitor multi-screen layout support.
  - **Target Files**: `src/components/oscilloscope/DetachableScopeModal.tsx`, `src/components/oscilloscope/DetachedScopeWindow.tsx`, `src/App.tsx`
  - **Validation**: Clicking Detach pops oscilloscope into a standalone window while schematic canvas remains interactive.

- [x] **Step 20.2 Complete: Synchronized High-Speed Telemetry Streaming Pipe**
  - **Details**: Multi-window data synchronization and bidirectional cursor telemetry:
    - Zero-latency broadcast stream keeping canvas-embedded mini-graphs (`GraphFrame`, `PolyGraphView`) and detached oscilloscope displays (`DetachedScopeWindow`, `OscilloscopeView`) locked at identical simulation time $t$.
    - High-performance non-blocking transport: Native `BroadcastChannel` structured cloning and Tauri native IPC eliminating 60 FPS `localStorage` bottleneck and storage quota exceptions.
    - Bidirectional cursor sync: Moving time cursor or hovering across plot areas in detached window highlights identical sample on canvas-embedded frames, and canvas hovering synchronizes to the detached scope.
    - Live streaming performance metrics: Real-time rolling FPS counter, sub-millisecond latency measurement, active transport pipe badge, and sample packet diagnostics.
  - **Target Files**: `src/services/telemetryStreamer.ts`, `src/components/oscilloscope/DetachedScopeWindow.tsx`, `src/components/oscilloscope/OscilloscopeView.tsx`, `src/components/canvas/GraphFrame.tsx`, `src/components/canvas/PolyGraphView.tsx`, `src/components/canvas/SchematicCanvas.tsx`, `src/__tests__/telemetryStreamer.test.ts`
  - **Validation**: Full test suite passing (63 tests across 21 suites) with dedicated `telemetryStreamer.test.ts` verifying signal chunk caching, bidirectional cursor sync dispatch, self-echo prevention, and metrics calculations; clean compilation via `tsc -b && vite build`.

- [x] **Step 20.3 Complete: Deep-Dive Signal Analysis Suite in Detached View**
  - **Details**: Full laboratory analysis tools functional in docked Oscilloscope, in-app Picture-in-Picture modal, and detached secondary multi-monitor OS window:
    - Dedicated `FftEngine` laboratory harmonic spectrum analyzer in `src/analysis/fftEngine.ts` supporting multiple windowing functions (Hann, Hamming, Blackman-Harris, Flat-Top, Rectangular), harmonic extraction up to 50th order, IEEE 519-2022 power quality compliance validation (`PASS` / `WARN` / `FAIL`), THD-F and THD-R calculations, DC offset, Crest Factor, and dominant harmonic tracking.
    - Dedicated `LissajousEngine` trajectory analysis suite in `src/analysis/lissajousEngine.ts` featuring $V-I$ phase loops, magnetizing flux-current hysteresis ($\lambda - i$ with numerical integration $\lambda(t) = \int V dt$), $\alpha-\beta$ Clarke space vectors, displacement power factor ($\cos\Delta\phi$, leading/lagging), Green's theorem enclosed loop area ($\oint y\,dx$), circulation direction ($CW$ vs $CCW$), directional trajectory arrowheads, and frequency ratio estimation ($f_x : f_y$).
    - Precision differential delta cursors ($\Delta t, \Delta V, f = 1/\Delta t$) with shaded highlight time span across the plot, dimension line with dual arrowheads, floating differential readout banner with per-channel $V(t_1)$, $V(t_2)$, $\Delta V$, and slew rate $\Delta V/\Delta t$, zero-crossing and peak snapping tools, and 1-cycle preset buttons (16.67 ms / 20.00 ms).
  - **Target Files**: `src/components/oscilloscope/OscilloscopeView.tsx`, `src/components/oscilloscope/XYPlotter.tsx`, `src/analysis/fftEngine.ts`, `src/analysis/lissajousEngine.ts`, `src/__tests__/fftEngine.test.ts`
  - **Validation**: Full test suite passing (74 tests across 25 suites) with dedicated `fftEngine.test.ts` verifying FFT, multi-harmonics, windowing, Lissajous phase/area calculations, and differential delta cursors; clean compilation via `tsc -b && vite build`.

- [x] **Step 20.4 Complete: Multi-Monitor Workspace Layout Persistence**
  - **Details**: Window state and multi-monitor workspace layout persistence across sessions:
    - Save detached window coordinates ($x, y, w, h$), monitor index, display span, active signal selection, view mode, and detached status in `sessionManager.ts`.
    - Auto-restore detached layout on application launch when secondary monitor is connected or `autoRestore` toggle is active.
    - Full bidirectional geometry synchronization over `telemetryStreamer` (`LAYOUT_UPDATE` and `REQUEST_SYNC` payloads).
    - Workspace dock dimension persistence (`leftWidth`, `leftTopHeight`, `rightWidth`, `bottomHeight`, `splitRatio`, `activeView`).
    - Ribbon View tab and Detached Window titlebar controls with visual indicators: `Auto-Restore: ON/OFF`, `Reset Scope Pos`, `Pos Saved`, and `MULTI-MONITOR 2` secondary display badge.
  - **Target Files**: `src/services/sessionManager.ts`, `src/services/telemetryStreamer.ts`, `src/components/oscilloscope/DetachedScopeWindow.tsx`, `src/components/ribbon/CadRibbon.tsx`, `src/App.tsx`, `src/__tests__/layoutPersistence.test.ts`
  - **Validation**: Full test suite passing (83 tests across 28 suites) with dedicated `layoutPersistence.test.ts` verifying layout saving/retrieval, defaults fallback, screen bounds clamping, multi-monitor heuristics, auto-restore logic, and bidirectional layout synchronization; clean compilation via `tsc -b && vite build`.

---

### Phase 21: Multi-Tab Component Parameter Dialogs & Units Engine

- [ ] **Step 21.1: Dedicated Multi-Tab Component Parameter Modal**
  - **Details**: Double-clicking any component opens a modal parameter dialog mirroring PSCAD's native dialogs:
    - Tab 1: `Configuration` (Model type, connection mode, ratings, phases).
    - Tab 2: `Parameters` (Resistance, Inductance, Capacitance, Saturation curve, Time constants).
    - Tab 3: `Monitoring & Signals` (Internal probe enablement, signal names, graph output routing).
    - Tab 4: `Help & Theory` (Formulas, companion model explanation, terminal pinouts).
  - **Target Files**: `src/components/inspector/ComponentParameterModal.tsx`, `src/components/inspector/ParameterInspector.tsx`, `src/App.tsx`
  - **Validation**: Double-clicking a 3-phase transformer opens a 4-tab parameter window with categorized input groups.

- [ ] **Step 21.2: Engineering Unit Converters & Form Field Validation**
  - **Details**: Robust engineering input system:
    - Dropdown unit selectors for each parameter: Resistance ($\text{m}\Omega, \Omega, \text{k}\Omega, \text{M}\Omega$), Inductance ($\mu\text{H}, \text{mH}, \text{H}$), Capacitance ($\text{pF}, \text{nF}, \mu\text{F}, \text{mF}$), Voltage ($\text{V}, \text{kV}, \text{MV}$), Power ($\text{kW}, \text{MW}, \text{MVA}, \text{MVAR}$).
    - Scientific notation and suffix parsing (`10u`, `5m`, `100k`, `2.5M`, `1e-6`).
    - Input validation with real-time warning indicators for non-physical parameters (e.g. negative resistance or zero inductance).
  - **Target Files**: `src/utils/engineeringUnits.ts`, `src/components/inspector/ComponentParameterModal.tsx`
  - **Validation**: Typing `100u` in an inductor field automatically converts to $100\,\mu\text{H} = 10^{-4}\,\text{H}$ in the simulation kernel.

- [ ] **Step 21.3: Schematic Parameter Illustration Diagrams**
  - **Details**: Add visual schematic preview diagrams inside parameter dialogs:
    - Dynamic diagram showing winding configurations ($Y-\Delta$, $Y-Y$), positive/zero-sequence equivalent circuits, or Park $d-q$ axis conventions.
    - Parameter callout tags pointing to diagram terminals for intuitive understanding.
  - **Target Files**: `src/components/inspector/ParameterDiagramPreview.tsx`, `src/components/inspector/ComponentParameterModal.tsx`
  - **Validation**: Opening synchronous machine or transformer parameters shows visual core and winding vector diagrams.

- [ ] **Step 21.4: Dual Inspector Mode (Docked Sidebar vs. Modal Dialog Toggle)**
  - **Details**: User preference option:
    - User setting to choose between **Classic PSCAD Floating Modals** on double-click or **Modern Docked Parameter Inspector** on single-click.
    - Seamless switching without losing parameter edits or component selection.
  - **Target Files**: `src/components/inspector/ParameterInspector.tsx`, `src/App.tsx`
  - **Validation**: Toggle in View menu instantly switches parameter editing workflow between docked panel and modal dialogs.

---

### Phase 22: Output & Messages Dock with Click-to-Jump Navigation

- [ ] **Step 22.1: Multi-Tab Output & Diagnostics Dock**
  - **Details**: Re-architect the bottom console into PSCAD's 4-tab Output Window:
    - Tab 1: `Build`: Compiler steps, netlist node generation, conductance matrix allocation, factorization stats.
    - Tab 2: `EMTDC Messages`: Simulation runtime events, switching operations, CDA chatter adjustments, step size alerts.
    - Tab 3: `Search & Cross-References`: Global search results for signals, component names, and wireless labels.
    - Tab 4: `Errors & Warnings`: Filterable table of all compiler and numerical diagnostics with severity badges.
  - **Target Files**: `src/components/log/OutputDock.tsx`, `src/components/log/LogConsole.tsx`, `src/App.tsx`
  - **Validation**: Running a simulation populates categorized tabs with formatted diagnostics matching PSCAD build logs.

- [ ] **Step 22.2: Structured Diagnostic Error & Warning Table**
  - **Details**: Formatted message table with structured columns:
    - Columns: `Severity (Icon)`, `Code (e.g. ERR-201)`, `Message Summary`, `Component Name / ID`, `Sheet / Module`, `Sim Time (s)`.
    - Quick filter buttons: Show/Hide Errors, Warnings, and Info notices.
    - Copy diagnostic report to clipboard for rapid troubleshooting.
  - **Target Files**: `src/types/diagnostics.ts`, `src/components/log/OutputDock.tsx`
  - **Validation**: Clear visual distinction between fatal compiler errors, numerical warnings, and informational logs.

- [ ] **Step 22.3: Interactive Double-Click "Jump-to-Component" Canvas Highlighting**
  - **Details**: Instant error localization:
    - Double-clicking any error or warning row in the Output dock automatically navigates the schematic canvas to the offending sheet, centers the viewport on the component, and pulses a glowing red highlight circle.
  - **Target Files**: `src/components/canvas/SchematicCanvas.tsx`, `src/components/log/OutputDock.tsx`, `src/App.tsx`
  - **Validation**: Double-clicking an "Unconnected Pin" error in the log immediately centers the canvas on the floating component.

- [ ] **Step 22.4: Search & Cross-Reference Signal Tracing Tab**
  - **Details**: Signal tracing and navigation:
    - Search tab allowing search for any signal label (e.g. `V_Bus1`, `Trip_Relay`).
    - Lists all transmitters `<Name>`, receivers `[Name]`, meters, and control inputs using that signal with one-click jump navigation.
  - **Target Files**: `src/components/log/SignalSearchTab.tsx`, `src/components/log/OutputDock.tsx`
  - **Validation**: Searching `Fault_Sig` lists all connected transmitter/receiver blocks across all hierarchical sheets.

---

### Phase 23: Classic PSCAD Light CAD Theme & Vector Stencil Parity

- [ ] **Step 23.1: Classic PSCAD Light Engineering Palette & Grid Stencil**
  - **Details**: Authentic light CAD theme:
    - Background: Off-white / light gray (`#F4F6F9` / `#FFFFFF`).
    - Grid: Fine dotted grid or light cross-grid with 10px snap spacing.
    - Schematic conductors: Crisp high-contrast dark charcoal / black lines (`#1E293B` / `#000000`).
    - Busbars: Heavy solid 3-phase blue/dark red bars.
  - **Target Files**: `src/constants/themes.ts`, `src/index.css`, `src/App.css`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Exact visual look and feel matching classic PSCAD v4/v5 engineering workstation prints.

- [ ] **Step 23.2: Standard ANSI / IEEE / IEC Electrical Symbol Vectors**
  - **Details**: 1:1 symbol vector alignment with official PSCAD Master Library:
    - Traditional zigzag resistors, curled inductors, parallel-plate capacitors, circle/sine AC sources, 2-winding transformer circles with vector groups.
    - Precise ANSI terminal pin spacing ($10\,\text{mm}$ / 20px grid alignment).
    - Clear component designator labels ($R_1, L_1, T_{xfmr}$) and parameter annotation text under each symbol.
  - **Target Files**: `src/components/canvas/symbols.ts`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Side-by-side visual indistinguishability between schematic circuit printouts from real PSCAD and PSCAD Modern.

- [ ] **Step 23.3: Visual Distinctions for Polyphase vs. Control Signal Wires**
  - **Details**: Visual wire typing on canvas:
    - 1-Phase Electrical Wire: Standard 2px solid dark line.
    - 3-Phase Polyphase Wire: Heavy 3.5px solid blue line with slash bundle indicator.
    - Control Signal Wire: 1.5px green dashed or directional line with arrowheads.
  - **Target Files**: `src/components/canvas/wireRenderer.ts`, `src/components/canvas/symbols.ts`, `src/components/canvas/SchematicCanvas.tsx`
  - **Validation**: Instant visual recognition of electrical power circuits vs control block interconnects across complex sheets.

- [ ] **Step 23.4: One-Click Instant Theme Switcher & Workspace Preset Persistence**
  - **Details**: Theme management:
    - Top ribbon toggle between `Classic PSCAD Light CAD` and `Modern Dark IDE`.
    - Persist user theme, dock layout, and panel sizes in local settings cache across app restarts.
  - **Target Files**: `src/services/sessionManager.ts`, `src/App.tsx`, `src/components/ribbon/CadRibbon.tsx`
  - **Validation**: Seamless live theme switching with instant canvas redraw and persistent workspace configuration.

---

## Session Activity & Development Log

| Session Date | Phase / Step | Actions Taken | Status |
| :--- | :--- | :--- | :--- |
| 2026-08-21 | Initialization | Master implementation roadmap initialized. Defined foundational Phases 1 to 7 (28 sub-tasks). | `COMPLETED` |
| 2026-08-21 | **Phase 1 Complete** | Numerical kernel (CDA, Switching Interpolation, Sparse LU Markowitz, Subsystems, Snapshots). | `COMPLETED` |
| 2026-08-21 | **Phase 2 Complete** | Distributed Lines & Cables (Bergeron, Polyphase Modal, FD-Phase Vector Fitting, LCP Studio). | `COMPLETED` |
| 2026-08-21 | **Phase 3 Complete** | Magnetics & Machines (UMEC Transformers, Park $d-q-0$ Machine, DFIG/PMSG, MOV Arrester). | `COMPLETED` |
| 2026-08-22 | **Phase 4 Complete** | Power Electronics & FACTS (Interpolated Switches, 201-level MMC DEM, LCC 6/12-Pulse, STATCOM, SVC). | `COMPLETED` |
| 2026-08-22 | **Phase 5 Complete** | CSMF Controls & Signal Types (Dual-Domain typing, Data Labels, Polyphase Bus, Complete CSMF Math/Logic/PWM). | `COMPLETED` |
| 2026-08-22 | **Phase 6 Complete** | Hierarchical CAD & Runtime Controls (Submodules, Component Studio, Live Dials/Sliders, Auto-router). | `COMPLETED` |
| 2026-08-22 | **Phase 7 Complete** | Analysis & Standards (Harmonic $Z(f)$ Scan, COMTRADE IEEE C37.111, Multi-Track Scope, Multi-Run Engine). | `COMPLETED` |
| 2026-08-22 | **Roadmap Expansion** | Initialized Next-Gen Master Roadmap (Phases 8 to 15, 35 new sub-tasks) targeting Desktop Native App (Tauri 2.0), Rust Simulation Kernel, Multi-Core CPU Parallelism, GPU Acceleration, and Complete PSCAD / EMTDC Parity. | `COMPLETED` |
| 2026-08-22 | **Phase 8 Complete** | Tauri 2.0 Desktop Shell & Native System I/O (Tauri 2 backend, glassmorphic window frame & controls, direct native disk I/O, session auto-save & crash recovery, high-speed binary IPC streamer, Project Hub gallery, native menus & global hotkeys). | `COMPLETED` |
| 2026-08-22 | **Phase 9 Complete** | Native Rust EMTDC Simulation Kernel & SIMD Linear Algebra (pure Rust netlist compiler, nodal companion models, CDA Backward Euler chatter removal, sub-step zero-crossing interpolator, Sparse LU Markowitz solver, Sherman-Morrison fast commutation update, 1-ph and 3-ph Bergeron lines, FD-Phase line, power diodes with Qrr, thyristors, IGBTs, MMC DEM, LCC Graetz bridge, STATCOM, SVC, Park dq0 synchronous machine, multi-mass SSR shaft, DFIG, PMSG, UMEC saturable transformers, native simulator runtime). | `COMPLETED` |
| 2026-08-22 | **Phase 10 Complete** | Multi-Core CPU Parallelism & GPU Compute (Multi-threaded Rayon/worker parametric sensitivity sweep engine, multi-island subsystem decoupling across transmission delays tau >= dt, WebGPU WGSL compute shader pipeline for massive batch runs, GPU parallel bitonic sorting for MMC capacitor balancing, GPU vertex buffer oscilloscope streamer at 144 FPS). | `COMPLETED` |
| 2026-08-22 | **Phase 11 Complete** | Power System Protection & ANSI Relay Suite (ANSI 50/51/67 TOC & IOC with IEC 60255-151 curves & disk reset integrator, ANSI 21 Distance relay with Mho/Quad characteristics & k0 sequence compensation, ANSI 87T/87L Differential relay with dual-slope restraint & 2nd harmonic inrush blocking, ANSI 81O/81U, 81R ROCOF, ANSI 40 loss-of-excitation, ANSI 78 power swing blinder, and non-linear saturating CT & VT models). | `COMPLETED` |
| 2026-08-22 | **Phase 12 Complete** | Standard IEEE Control Systems & Dynamic Regulators ($s$-domain arbitrary-order continuous transfer function engine & $z$-domain filter via Bilinear Tustin transformation with anti-windup clamping & prewarping; IEEE Prime Mover Governors: IEEEG1 steam, HYGOV hydro water hammer, GAST gas turbine radiation temp limiter, DEGOV diesel transport lag; IEEE Excitation Systems: AC1A saturation, DC1A commutator, ST1A high-initial-response static; Power System Stabilizers: PSS1A & PSS2B accelerating power; Advanced Wind Turbine Aerodynamics: 2D $C_p(\lambda, \beta)$ surface, MPPT $K_{opt}\omega_r^2$, multi-region active pitch regulation & storm feathering). | `COMPLETED` |
| 2026-08-23 | **Phase 13 Complete** | Advanced Cable Constants & Real PSCAD Interoperability (Coaxial Cable Constants with complex Bessel skin-depth $I_0, I_1, K_0, K_1$, Wedepohl earth return, HPPT pipe-type cables, Sheath cross-bonding & SVL MOV surge arresters, official MHI PSCAD .pscx XML bidirectional parser/serializer, EMTDC raw stream .inf/.out reader with live comparison $\epsilon(t)$ delta residuals in Oscilloscope). | `COMPLETED` |
| 2026-08-23 | **Phase 14 Complete** | Advanced Magnetics, Hysteresis & Substation Equipment (Jiles-Atherton dynamic $B-H$ hysteresis core model with Langevin anhysteretic formulation, domain wall pinning $k$, remanent flux $B_r$, coercive force $H_c$, and trapped inrush spikes; Motorized On-Load Tap Changer (OLTC) with mechanical transit delays, transition resistor bridging damping, and ANSI 90 closed-loop AVR regulation; High-Frequency stray capacitance matrix and Swept Frequency Response Analysis (SFRA) 20 Hz to 2 MHz Bode engine for core/winding/bushing fault diagnostics; Zig-Zag grounding transformer with zero-sequence flux cancellation & NGR, and Quadrature Booster Phase Shifting Transformer (PST) active power redirection). | `COMPLETED` |
| 2026-08-23 | **Phase 15 Complete** | Headless Automation, Python Automation Package & FMI Co-Simulation (Headless native CLI dispatcher with `--headless`, `--server`, `--port`, JSON-RPC 2.0 TCP & WebSocket/HTTP simulation server; Python automation client package `pscad-modern-py` with `mhi.pscad` drop-in compatibility and zero-dependency fallbacks; IEEE Std C37.118.2-2011 real-time Synchrophasor PMU streaming engine with polar radar vector scope; FMI 2.0 & 3.0 Co-Simulation `.fmu` package exporter, C-code wrapper generation, and dynamic FMU block import). | `COMPLETED` |
| 2026-08-27 | **UI / UX Parity Roadmap** | Defined comprehensive 6-phase master plan (Phases 16 – 21, 24 sub-tasks) to achieve 1:1 commercial UI layout, ribbon system, canvas-embedded graph frames, multi-tab parameter modals, and diagnostic jump navigation parity with PSCAD v5. | `COMPLETED` |
| 2026-08-27 | **Phase 16 Complete** | Office Ribbon Suite & Quick Access Toolbar (Consolidated Microsoft Fluent Ribbon with tabs `File` Backstage Drawer, `Home`, `Components`, `View`, `Tools`, `Help`; customizable Quick Access Toolbar with persistence; scalable `RibbonGroup` & `RibbonButton` primary/secondary containers; collapsible Ribbon with `Ctrl+F1` & floating flyout; Alt-driven KeyTips keyboard navigation). | `COMPLETED` |
| 2026-08-27 | **Phase 17 Complete** | Unified Workspace Tree & Master Library Architecture (Unified `WorkspaceTree` with multi-project management, `Definitions`, `Schematic Sheets`, `Lines & Cables`, and `Data & Resources` hierarchy; `DefinitionRegistry` decoupling definitions from instances with real-time port synchronization; Pop-out `MasterLibraryFlyout` visual `master.pslx` browser with categorized cards, ANSI search, and canvas drag-and-drop; Cascading dark CAD `CanvasContextMenu` and tree context menus for single/multi/wire/canvas/project/sheet/definition operations with bypass strike-through and submodule creation from selection). | `COMPLETED` |
| 2026-08-29 | **Step 18.1 Complete** | Canvas-Embedded Graph Frame Element (Native embedded `GraphFrame` canvas element with header bar, status badges, oscilloscope dark CRT plot box, dashed gridlines, auto-scaling and zero-axis lines, high-speed live waveform renderer, 8 CAD anchor resize handles with grid snap and cursor updates, and pre-configured test fixture). | `COMPLETED` |
| 2026-08-29 | **Step 18.2 Complete** | Output Channel / Probe Curve Binding & Overlay Legend (`GraphBindingManager` engine for signal routing and probe discovery, multi-trace overlay curve rendering with distinct PSCAD waveform colors, per-trace engineering units and SI scaling, interactive legend with trace visibility toggles and real-time numerical readouts, drag-and-drop probe binding, right-click context menu signal binding, and pre-configured 3-probe test study). | `COMPLETED` |
| 2026-08-29 | **Step 18.3 Complete** | PolyGraph Stacked Sub-Traces & Dynamic Y-Scaling (`PolyGraphRenderer` and `PolyGraphManager` stacked multi-grid visualization with 2 to 4 vertical sub-grids, independent dynamic Y-axis auto-scaling with SI prefixes across disparate magnitudes e.g. 230 kV vs 1.2 kA, synchronized time X-axis, synchronized vertical crosshairs across all tracks with interpolated marker values and time badges, interactive sub-grid legends, and pre-configured `POLYGRAPH_3PH_STUDY` benchmark). | `COMPLETED` |
| 2026-08-29 | **Step 18.4 Complete** | Graph Frame Context Menu & Waveform Export (Dedicated `GraphFrameContextMenu` right-click flyout with probe binding, trace management, dynamic auto-scaling, modal `AxisLimitsModal` dialog, grid/legend toggles, overlay to polygraph conversions; IEEE COMTRADE / PSCAD compatible tabular CSV export generator; 2x high-resolution offscreen PNG image rasterizer & clipboard copy engine with feedback toasts). | `COMPLETED` |
| 2026-08-29 | **Phase 18 Complete** | Canvas-Embedded Graph Frames & Overlay PolyGraphs (Completed all 4 sub-tasks: embedded graph frames, multi-trace signal binding & overlay legend, PolyGraph stacked sub-grids with dynamic Y-scaling & synchronized crosshairs, graph context menu & waveform export). | `COMPLETED` |
| 2026-08-30 | **Step 19.1 Complete** | On-Schematic Slider & Rotary Knob Elements (Dedicated `RuntimeControlsManager` and `RuntimeControlsRenderer` for on-schematic continuous input controls; brushed metallic/dark CAD chassis with glowing selection highlights, inset track channels, tactile draggable thumb handle with grip ridges, circumferential tick marks, illuminated active progress arcs, machined rotary knob cores, digital LCD badge readouts with engineering units; direct mouse drag interaction updating linked control variable on mouse move; live target component parameter modulation dispatching to EMTDC solver; pre-configured `RUNTIME_CONTROLS_STUDY` benchmark test fixture). | `COMPLETED` |
| 2026-08-30 | **Step 19.2 Complete** | On-Schematic Push Buttons & Toggle Switches (Dedicated `RuntimeSwitchesManager` and `RuntimeSwitchesRenderer` for on-schematic discrete state triggers; brushed dark alloy chassis with rounded beveled corners, 3D tactile push-button cap with depression offset depth, concentric grip ring detailing, illuminated LED status pilot lights with radiant halo glow, 3D rocker switch housing with directional angle shading, laser-etched `I`/`O` markings, status text pill badges; seamless non-pausing EMTDC simulation state mutator with CDA switching chatter removal and breaker/fault target bindings; pre-configured `RUNTIME_SWITCHES_STUDY` benchmark test fixture). | `COMPLETED` |
| 2026-09-01 | **Step 19.3 Complete** | Live Dynamic Digital Readouts & Analog Needle Meters (Dedicated `SchematicMetersManager` and `SchematicMetersRenderer` for on-schematic live instrumentation; analog circular gauge with titanium/slate beveled chassis, sunken CRT dial faceplate, color-coded operating zones with Green Normal 0-70%, Amber Warning 70-85%, Red Alarm 85-100%, calibrated graduation ticks, secondary orange peak-hold indicator needle tracking maximum excursions with persistence & reset, sweeping crimson tapered needle with glow & counterweight, central chrome boss cap, digital LCD sub-badge; multi-quantity OLED digital LED monitoring badges displaying live $V_{RMS}, I_{RMS}, P, Q$, apparent power $S$, and power factor with automatic SI engineering unit auto-scaling and status pills; floating telemetry badges for standard Voltmeters, Ammeters, and Multimeters; pre-configured `RUNTIME_METERS_STUDY` benchmark test fixture). | `COMPLETED` |
| 2026-09-01 | **Step 19.4 Complete** | Non-Pausing EMTDC Simulation State Mutator Bridge (Dedicated `RuntimeMutator` engine in `runtimeMutator.ts` and `SimulatorBridgeManager` in `simulatorBridge.ts`; Sherman-Morrison rank-1 & rank-$k$ / Woodbury exact fast conductance matrix solver for on-the-fly branch changes without full matrix re-factorization; phase-continuous frequency integrator $\theta(t) = \int 2\pi f(t) dt$ ensuring smooth $C^0$ frequency transitions without phase jumps when modulating generator rotary dials live; non-pausing simulation state mutator preserving simulation time $t$, step counts, and waveform buffers without restarting run loop; pre-configured `RUNTIME_MUTATOR_STUDY` benchmark test fixture). | `COMPLETED` |
| 2026-09-01 | **Phase 19 Complete** | Canvas Interactive Runtime Controls & Live Instrumentation (Completed all 4 sub-tasks: on-schematic sliders & rotary dials, push buttons & toggle switches, live analog needle meters & OLED badges, and non-pausing EMTDC simulation state mutator bridge). | `COMPLETED` |
| 2026-09-01 | **Step 20.1 Complete** | Native Pop-Out Detachable Window Architecture (Dedicated `TelemetryStreamer` multi-window communication and layout manager in `telemetryStreamer.ts` utilizing Web `BroadcastChannel`, `localStorage`, and Tauri native multi-window IPC; standalone `DetachedScopeWindow` with custom dark CAD titlebar, live `● LIVE 60 FPS` stream telemetry status badge, secondary display indicator, Pin-on-Top, and `Dock Back` controls; in-app floating, draggable, and resizable `DetachableScopeModal` Picture-in-Picture window with 8 resize handles and minimize-to-pill mode allowing 100% active and responsive schematic canvas wiring underneath; "Detach Scope" Ribbon button in View tab, "Detach" toolbar button in `OscilloscopeView`, and "Pop Out to Standalone Window" right-click context menu in embedded graph frames). | `COMPLETED` |
| 2026-09-04 | **Step 20.2 Complete** | Synchronized High-Speed Telemetry Streaming Pipe (Zero-latency `BroadcastChannel` and Tauri native multi-window IPC telemetry stream keeping canvas-embedded mini-graphs and detached oscilloscope displays locked at identical simulation time $t$; bidirectional cursor sync dispatching hover crosshairs and differential cursors across windows without self-echo feedback loops; live rolling FPS, sub-millisecond latency counter, and streaming metrics diagnostics; 100% passing tests in `telemetryStreamer.test.ts`). | `COMPLETED` |
| 2026-09-04 | **Step 20.3 Complete** | Deep-Dive Signal Analysis Suite in Detached View (Dedicated `FftEngine` in `src/analysis/fftEngine.ts` with multi-windowing Hann/Hamming/Blackman-Harris/Flat-Top, orders 1-50, THD-F/THD-R, IEEE 519-2022 grid compliance status, and interactive spectrum HUD bar chart; dedicated `LissajousEngine` in `src/analysis/lissajousEngine.ts` with $V-I$ phase loops, $\lambda-i$ magnetizing flux-current hysteresis integration, $\alpha-\beta$ space vectors, displacement power factor $\cos\Delta\phi$, Green's theorem enclosed loop area $\oint y\,dx$, orbital direction arrows, and frequency ratio estimation; precision differential delta cursors $\Delta t, \Delta V, f = 1/\Delta t$, slew rate $\Delta V/\Delta t$, shaded time-span band, and zero/peak snapping tools; 100% passing tests in `fftEngine.test.ts`). | `COMPLETED` |

---

<details>
<summary><strong>📦 Archive: Completed Next-Gen Engine & Kernel Roadmap (Phases 8 – 15 Archive)</strong></summary>

### Phase 8: Tauri 2.0 Desktop Shell & Native System I/O
- [x] **Step 8.1**: Tauri 2.0 Desktop Shell Setup & Window Architecture (Native `.exe`, glassmorphic titlebar, DPI scaling).
- [x] **Step 8.2**: Native File System I/O & Auto-Save Session Manager (Direct disk access, `.pscx`/`.comtrade`, auto-save).
- [x] **Step 8.3**: High-Speed Tauri Binary IPC & Waveform Streaming Bridge (Zero-overhead TypedArray streaming at 120 FPS).
- [x] **Step 8.4**: Native OS Application Menus & Keyboard Shortcut Accelerators (`Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `F5`, `F6`, `F8`).

### Phase 9: Native Rust EMTDC Simulation Kernel & SIMD Linear Algebra
- [x] **Step 9.1**: Rust Netlist Compiler & RLC Companion Stamping Engine (CDA Backward Euler, sub-step zero-crossing interpolator).
- [x] **Step 9.2**: High-Performance Sparse LU Solver with AVX2/AVX-512 SIMD (`faer-rs`, Markowitz reordering, Sherman-Morrison).
- [x] **Step 9.3**: Distributed Transmission Lines & Cable Models in Native Rust (1-ph / 3-ph Bergeron, FD-Phase vector fitting).
- [x] **Step 9.4**: Power Electronics, High-Level MMC DEM & FACTS in Native Rust (Diodes, Thyristors, IGBTs, MMC 400+ SMs, LCC, STATCOM, SVC).
- [x] **Step 9.5**: Rotating Machines (Park $d-q-0$) & UMEC Saturable Transformers in Native Rust (6th-order machine, SSR shaft, DFIG, PMSG, UMEC).

### Phase 10: Multi-Core CPU Parallelism & GPU Compute Acceleration
- [x] **Step 10.1**: Rayon Multi-Core Parametric Sensitivity Sweep Engine (Parallel batch execution across all CPU cores).
- [x] **Step 10.2**: Subsystem Multi-Threaded Decoupling across Transmission Delays ($\tau \ge \Delta t$).
- [x] **Step 10.3**: WebGPU / `wgpu` WGSL Compute Shader Pipeline for Massive Multi-Runs ($1,000+$ simultaneous runs on GPU).
- [x] **Step 10.4**: GPU Parallel Bitonic Sorting for MMC Capacitor Voltage Balancing ($O(\log^2 N)$ sub-microsecond sort).
- [x] **Step 10.5**: GPU Vertex Buffer Oscilloscope Waveform Streamer (144 FPS rendering with 10M+ sample points).

### Phase 11: Power System Protection & ANSI Relay Suite
- [x] **Step 11.1**: ANSI 50/51 Time-Overcurrent & Instantaneous Overcurrent Relays (IEEE C37.112 / IEC 60255-151 curves, disk reset).
- [x] **Step 11.2**: ANSI 21 Multi-Zone Distance Protection Relay (Mho / Quad characteristics, $k_0$ sequence compensation, Zone 1/2/3).
- [x] **Step 11.3**: ANSI 87T Transformer & 87L Line Differential Protection (Dual-slope restraint, 2nd harmonic inrush block).
- [x] **Step 11.4**: ANSI 81O/81U, 81R (ROCOF), ANSI 40 (Loss of Field), & ANSI 78 (Out-of-Step power swing).
- [x] **Step 11.5**: Instrument Transformer Magnetic Core Saturation (Non-linear CT/VT saturation, remanence, burden).

### Phase 12: Standard IEEE Control Systems & Dynamic Regulators
- [x] **Step 12.1**: $s$-Domain Rational Transfer Function & $z$-Domain Filter Engine (Arbitrary polynomial $H(s)$ via Tustin).
- [x] **Step 12.2**: IEEE Standard Prime Mover Speed Governors (IEEEG1 steam, HYGOV hydro water hammer, GAST gas, DEGOV diesel).
- [x] **Step 12.3**: IEEE Standard Excitation Systems & Automatic Voltage Regulators (IEEE AC1A, DC1A, ST1A with OEL/UEL).
- [x] **Step 12.4**: Power System Stabilizers (PSS1A single-input $\Delta\omega$, PSS2B accelerating power $\Delta P_a$).
- [x] **Step 12.5**: Advanced Wind Turbine Aerodynamics & Pitch Control (2D $C_p(\lambda, \beta)$, MPPT, hydraulic pitch regulation).

### Phase 13: Advanced Cable Constants & Real PSCAD Interoperability (`.pscx`)
- [x] **Step 13.1**: Coaxial Cable Constants Engine (Sheath, screen, armor, complex Bessel functions, Wedepohl earth return).
- [x] **Step 13.2**: Pipe-Type, Submarine Armored Cables & Cross-Bonding SVL (HPPT pipe-type cables, sheath voltage limiters).
- [x] **Step 13.3**: Official MHI PSCAD `.pscx` XML Project Parser & Exporter (Bidirectional schema translation).
- [x] **Step 13.4**: Native EMTDC Output Stream (`.inf` / `.out` & `.dta`) Importer & Live Comparison ($\epsilon(t)$ delta metrics).

### Phase 14: Advanced Magnetics, Hysteresis & Substation Equipment
- [x] **Step 14.1**: Jiles-Atherton Dynamic $B-H$ Hysteresis Core Model (Pinning energy $k$, remanence $B_r$, coercive force $H_c$).
- [x] **Step 14.2**: Automated On-Load Tap Changer (OLTC) & Motorized Voltage Regulators (Mechanical transit delays, ANSI 90 AVR).
- [x] **Step 14.3**: High-Frequency Stray Capacitance Matrix for Transformers & Bushings (SFRA Bode diagnostics 20 Hz to 2 MHz).
- [x] **Step 14.4**: Zig-Zag Grounding Transformers & Quadrature Booster Phase Shifters (Zero-sequence flux cancellation, active power redirection).

### Phase 15: Headless Automation, Python Client & FMI Co-Simulation
- [x] **Step 15.1**: Headless Native CLI & WebSocket Remote Simulation Server (JSON-RPC 2.0 TCP/WebSocket server).
- [x] **Step 15.2**: Python Automation Package (`pscad-modern-py`, `mhi.pscad` drop-in API compatibility).
- [x] **Step 15.3**: Real-Time Streaming Telemetry & Synchrophasor PMU (IEEE C37.118.2 synchrophasor frames at 50/60 fps).
- [x] **Step 15.4**: Functional Mock-up Interface (FMI / FMU 2.0 & 3.0) Co-Simulation (Export/import `.fmu` packages).

</details>

---

<details>
<summary><strong>📦 Archive: Completed Foundations (Phases 1 – 7 Master Log)</strong></summary>

### Phase 1: EMTDC Numerical Kernel Modernization & Numerical Stability
- [x] **Step 1.1**: Critical Damping Adjustment (CDA) & Chatter Removal (2-step Backward Euler).
- [x] **Step 1.2**: Two-Half-Step Switching Point Interpolation for zero-crossings.
- [x] **Step 1.3**: Sparse Matrix CSR & Markowitz Minimum-Degree Reordering LU Solver.
- [x] **Step 1.4**: Subsystem Decoupling across transmission line travel delays ($\tau \ge \Delta t$).
- [x] **Step 1.5**: Full Snapshot & Hot-Start State Engine.

### Phase 2: Distributed Transmission Line & Cable Systems
- [x] **Step 2.1**: Bergeron Constant Parameter Traveling Wave Line Model ($Z_c, \tau, R/4-R/2-R/4$).
- [x] **Step 2.2**: Polyphase 3-Phase Coupled Line Model with Clarke Modal Decoupling.
- [x] **Step 2.3**: Frequency-Dependent Phase Domain Line Model (FD-Phase) with Vector Fitting.
- [x] **Step 2.4**: Integrated Line Constants Program (LCP) Studio with Carson earth return.

### Phase 3: Magnetic Models, Rotating Machines & Non-Linear Equipment
- [x] **Step 3.1**: UMEC Multi-Limb Saturable Transformers (3-Limb, 5-Limb, 3-Phase Banks).
- [x] **Step 3.2**: Full Park's $d-q-0$ 6th-Order Synchronous Machine with 4-Mass Torsional Shaft (SSR).
- [x] **Step 3.3**: SCIM / WRIM Induction Motors, DFIG Type 3 Wind with Crowbar, and PMSG Type 4 Wind.
- [x] **Step 3.4**: Metal Oxide Varistor (MOV) Non-Linear Arrester Companion Model.

### Phase 4: Power Electronics, MMC & FACTS
- [x] **Step 4.1**: Interpolated Semiconductor Switches (Diode with $Q_{rr}/t_{rr}$, Thyristor, IGBT/Diode).
- [x] **Step 4.2**: Modular Multilevel Converter (MMC) Detailed Equivalent Model (201 levels, $N=100$ SMs/arm).
- [x] **Step 4.3**: 6-Pulse / 12-Pulse LCC Graetz Bridges, STATCOM with $d-q$ Vector Control, and SVC (TCR/TSC).

### Phase 5: CSMF Controls, Signal Types & Data Labels
- [x] **Step 5.1**: Dual-Domain Type System (Electrical Power vs Control Signal) with Compiler Diagnostics.
- [x] **Step 5.2**: Wireless Data Labels (Transmitters `<Name>` and Receivers `[Name]`).
- [x] **Step 5.3**: 3-Phase Polyphase Bus & Phase Splitter / Merger Blocks.
- [x] **Step 5.4**: Comprehensive CSMF Math, Logic, Non-Linear (LUT, Deadband, Limiter), and Power Transforms (Clarke, Park, SVPWM, PLL).

### Phase 6: Hierarchical CAD Canvas, Custom Components & Runtime Controls
- [x] **Step 6.1**: Hierarchical Submodule Architecture with recursive netlist compilation and breadcrumb navigation.
- [x] **Step 6.2**: Custom Component Workshop & Script Editor with AST expression sandbox.
- [x] **Step 6.3**: Interactive Canvas Runtime Controls (Rotary Dial, Slider, Push Button, Toggle Switch, Digital Meters).
- [x] **Step 6.4**: Advanced CAD Suite (Rubberband multi-selection, Manhattan orthogonal auto-routing, Undo/Redo stack).

### Phase 7: Power Systems Analysis, Diagnostics & Industry Standards
- [x] **Step 7.1**: Harmonic Impedance & Frequency Scan ($Z(f)$ Scan) complex admittance Bode studio.
- [x] **Step 7.2**: COMTRADE File Format Support (IEEE Std C37.111-1999 & C37.111-2013 / IEC 60255-24:2013).
- [x] **Step 7.3**: Advanced Oscilloscope & Multi-Track Graph Panels with $X-Y$ Trajectory Plots and FFT overlays.
- [x] **Step 7.4**: Automated Parametric Multi-Run Sensitivity Sweep Engine with statistical analysis.

</details>
