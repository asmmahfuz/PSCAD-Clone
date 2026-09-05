# PSCAD CLONE Python Automation SDK (`pscad-clone-py`)

High-performance Python client and automation SDK for **PSCAD CLONE - EMTDC Engineering CAD & Simulation Suite**.

---

## ⚡ Key Features

- **Object-Oriented Automation API**: Programmatically construct schematics, wire nodes, modify component parameters, and launch simulations.
- **Official `mhi.pscad` Drop-In Compatibility**: Execute existing legacy PSCAD Python automation scripts with zero code modifications.
- **Fast Batch Parametric Sweeps**: Run point-on-wave fault sweeps, cable impedance sensitivities, and Monte Carlo studies over high-speed JSON-RPC.
- **NumPy & Pandas Native Interop**: Instant extraction of simulation waveforms into standard Pandas DataFrames, NumPy multi-dimensional arrays, or Matplotlib plots.
- **IEEE C37.118 Synchrophasor PMU Streamer**: Subscribe to real-time 50/60 fps synchrophasor frames directly from Python.

---

## 📦 Installation

```bash
# Install local development package
pip install -e ./python-client

# Install with plotting & analysis dependencies
pip install -e "./python-client[all]"
```

---

## 🚀 Quickstart Example

```python
from pscad_clone import PSCad
import matplotlib.pyplot as plt

# 1. Connect to local PSCAD CLONE Desktop / Server
pscad = PSCad.connect("http://127.0.0.1:8080")

# 2. Load IEEE 14-bus Benchmark
project = pscad.load_project("models/ieee_14bus.pscx")

# 3. Parametric Sensitivity Run
project.set_parameters("Gen_1", {"voltage_setpoint": 1.05})
result = project.run(dt=50e-6, t_max=0.3)

# 4. Extract Waveforms to Pandas DataFrame
df = result.to_dataframe()
print(df.head())

# 5. Plot Results
result.plot(channels=["V_Node_1", "V_Node_2"], title="Bus Voltages")
```

---

## 🔄 Legacy MHI Migration Example

```python
import pscad_clone.mhi_compat as mhi

app = mhi.application()
project = app.load("projects/transmission_fault.pscx")
project.parameters(dt=5e-5, duration=0.5)

project.run()
canvas = project.user_canvas("Main")
signal = canvas.get_signal("V_Bus1")
print(f"Max Voltage: {max(signal.values):.2f} kV")
```
