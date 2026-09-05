"""
Example 03: Synchrophasor PMU Stream Collector (IEEE C37.118)
Demonstrates subscribing to live synchrophasor frames and frequency telemetry.
"""

import time
import math

def simulate_pmu_stream(samples: int = 10, fps: int = 50):
    print(f"Subscribing to IEEE C37.118 Synchrophasor PMU Stream at {fps} fps...")
    print(f"{'Frame':<8} {'Time (s)':<12} {'Freq (Hz)':<12} {'ROCOF (Hz/s)':<14} {'V_Mag (kV)':<12} {'V_Ang (deg)':<12}")
    print("-" * 72)

    nominal_freq = 60.0
    for i in range(samples):
        t = i * (1.0 / fps)
        freq = nominal_freq + 0.05 * math.sin(2 * math.pi * 0.2 * t)
        rocof = 0.05 * (2 * math.pi * 0.2) * math.cos(2 * math.pi * 0.2 * t)
        v_mag = 230.0 + 1.5 * math.cos(2 * math.pi * 0.5 * t)
        v_ang = math.degrees(math.atan2(math.sin(2 * math.pi * 60 * t), math.cos(2 * math.pi * 60 * t)))

        print(f"{i+1:<8} {t:<12.3f} {freq:<12.4f} {rocof:<14.4f} {v_mag:<12.2f} {v_ang:<12.1f}")
        time.sleep(0.02)

    print("\nSynchrophasor collection stream finished.")

if __name__ == "__main__":
    simulate_pmu_stream(10, 50)
