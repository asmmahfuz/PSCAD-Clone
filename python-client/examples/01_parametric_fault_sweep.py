"""
Example 01: Automated Parametric Fault Impedance Sweep
Demonstrates multi-case batch simulation, statistical overvoltage extraction, and plotting.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pscad_clone import PSCad

def main():
    print("============================================================")
    print("  PSCAD CLONE Automation: Parametric Fault Impedance Sweep ")
    print("============================================================")
    pscad = PSCad.connect("http://127.0.0.1:8080")
    project = pscad.create_project("Transmission_Parametric_Sweep")

    # Add components
    project.canvas.add_component("Source3Phase", "Gen1", x=100, y=200, parameters={"voltage": 230.0})
    project.canvas.add_component("Fault3Phase", "Fault1", x=400, y=200, parameters={"resistance": 0.05})

    fault_resistances = [0.01, 0.1, 1.0, 5.0, 20.0]

    print(f"Executing {len(fault_resistances)} parametric sweep cases...")
    for rf in fault_resistances:
        project.set_parameters("Fault1", {"resistance": rf})
        res = project.run(dt=5e-5, t_max=0.1)
        v1 = res.get_signal("V_Node_1")
        v_peak = max([abs(x) for x in v1]) if v1 is not None else 0.0
        print(f"  - Rf = {rf:5.2f} Ohm -> Peak Bus Voltage = {v_peak:.2f} kV ({res.steps_completed} steps in {res.compute_time_ms:.1f} ms)")

    print(" Parametric fault sweep completed successfully.\n")

if __name__ == "__main__":
    main()
