"""
Example 02: Drop-in MHI PSCAD Legacy Script Migration
Demonstrates running scripts written for mhi.pscad without modifying script logic.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pscad_clone.mhi_compat as mhi

def main():
    print("============================================================")
    print("  PSCAD CLONE: MHI PSCAD Drop-In Migration Test Bench      ")
    print("============================================================")
    app = mhi.application()
    print(f"Connected: {app.version()}")

    project = app.create("Legacy_Case_14Bus")
    project.parameters(dt=5e-5, duration=0.2)

    canvas = project.user_canvas("Main")
    comp = canvas.component("Bus1")

    project.run()
    signal = canvas.get_signal("V_Node_1")
    print(f" Extracted {len(signal.values)} waveform samples from '{signal.name}' (Peak: {max(signal.values):.2f} kV).\n")

if __name__ == "__main__":
    main()
