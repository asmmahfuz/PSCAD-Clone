"""
Unit tests for pscad_modern Python Automation SDK
"""

import unittest
import math
import sys
import os

# Ensure package is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pscad_modern import PSCad, Project, Component, Wire, SimulationResult
from pscad_modern.mhi_compat import application


class TestPSCadAutomation(unittest.TestCase):
    def test_project_creation_and_components(self):
        pscad = PSCad()
        project = pscad.create_project("TestCircuit")

        comp1 = project.canvas.add_component("Resistor", "R1", 100, 100, {"resistance": 50.0})
        comp2 = project.canvas.add_component("Capacitor", "C1", 200, 100, {"capacitance": 10e-6})
        wire = project.canvas.add_wire("R1", "C1")

        self.assertEqual(len(project.canvas.components), 2)
        self.assertEqual(len(project.canvas.wires), 1)
        self.assertEqual(comp1.get_param("resistance"), 50.0)

    def test_parameter_mutation(self):
        project = Project("ParamTest")
        comp = project.canvas.add_component("Transformer", "TX1", parameters={"ratio": 1.0})
        self.assertEqual(comp.get_param("ratio"), 1.0)

        project.set_parameters("TX1", {"ratio": 2.5, "losses": 0.01})
        self.assertEqual(comp.get_param("ratio"), 2.5)
        self.assertEqual(comp.get_param("losses"), 0.01)

    def test_simulation_result_conversion(self):
        steps = 500
        t = [i * 0.0001 for i in range(steps)]
        v1 = [100.0 * math.sin(2 * math.pi * 60 * val) for val in t]
        v2 = [50.0 * math.cos(2 * math.pi * 60 * val) for val in t]

        res = SimulationResult(
            time_vector=t,
            signals={"V1": v1, "V2": v2},
            steps_completed=steps,
            total_sim_time=0.05,
            compute_time_ms=5.2
        )

        self.assertEqual(len(res.channel_names()), 2)
        self.assertIn("V1", res.channel_names())
        self.assertAlmostEqual(max(res.get_signal("V1")), 100.0, places=1)

        dict_data = res.to_dict()
        self.assertIn("Time", dict_data)
        self.assertEqual(len(dict_data["Time"]), steps)

    def test_mhi_compatibility_api(self):
        app = application()
        self.assertTrue("PSCad Modern" in app.version())

        project = app.create("MhiTest")
        project.parameters(dt=25e-6, duration=0.05)
        self.assertEqual(project._project.config.dt, 25e-6)
        self.assertEqual(project._project.config.t_max, 0.05)


if __name__ == "__main__":
    unittest.main()
