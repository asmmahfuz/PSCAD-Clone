"""
PSCAD Modern - Python Automation Data Models
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

try:
    import numpy as np  # type: ignore
    HAS_NUMPY = True
except ImportError:
    np = None  # type: ignore
    HAS_NUMPY = False


@dataclass
class Component:
    id: str
    type: str
    name: str
    x: float = 0.0
    y: float = 0.0
    rotation: int = 0
    parameters: Dict[str, Any] = field(default_factory=dict)

    def set_param(self, name: str, value: Any):
        self.parameters[name] = value

    def get_param(self, name: str, default: Any = None) -> Any:
        return self.parameters.get(name, default)


@dataclass
class Wire:
    from_node: str
    to_node: str
    from_pin: int = 0
    to_pin: int = 0


@dataclass
class SimulationConfig:
    dt: float = 5e-5
    t_max: float = 0.5
    cda_enabled: bool = True
    solver_type: str = "sparse_lu"
    num_nodes: int = 6


class SimulationResult:
    """
    Simulation output container supporting conversion to NumPy arrays, Pandas DataFrame, and Matplotlib plotting.
    """
    def __init__(
        self,
        time_vector: Any,
        signals: Dict[str, Any],
        steps_completed: int,
        total_sim_time: float,
        compute_time_ms: float = 0.0
    ):
        if HAS_NUMPY and np is not None:
            self.time = np.asarray(time_vector, dtype=np.float64)
            self.signals = {k: np.asarray(v, dtype=np.float64) for k, v in signals.items()}
        else:
            self.time = list(time_vector)
            self.signals = {k: list(v) for k, v in signals.items()}

        self.steps_completed = steps_completed
        self.total_sim_time = total_sim_time
        self.compute_time_ms = compute_time_ms

    def get_signal(self, name: str) -> Optional[Any]:
        return self.signals.get(name)

    def channel_names(self) -> List[str]:
        return list(self.signals.keys())

    def to_numpy(self) -> Dict[str, Any]:
        if not HAS_NUMPY or np is None:
            raise ImportError("NumPy is required for to_numpy(). Install via 'pip install numpy'.")
        res = {"Time": np.asarray(self.time, dtype=np.float64)}
        for k, v in self.signals.items():
            res[k] = np.asarray(v, dtype=np.float64)
        return res

    def to_dict(self) -> Dict[str, List[float]]:
        res = {"Time": list(self.time)}
        for k, v in self.signals.items():
            res[k] = list(v)
        return res

    def to_dataframe(self):
        """
        Convert to Pandas DataFrame if pandas is installed.
        """
        try:
            import pandas as pd  # type: ignore
            data = {"Time_s": self.time}
            for k, v in self.signals.items():
                data[k] = v
            return pd.DataFrame(data)
        except ImportError:
            raise ImportError("Pandas is required for to_dataframe(). Install via 'pip install pandas'.")

    def plot(self, channels: Optional[List[str]] = None, title: str = "PSCAD Modern Waveform Simulation"):
        """
        Render quick interactive plot of simulated channels using Matplotlib.
        """
        try:
            import matplotlib.pyplot as plt  # type: ignore
            plt.figure(figsize=(10, 5))
            target_channels = channels if channels is not None else list(self.signals.keys())[:6]

            time_ms = [t * 1000.0 for t in self.time]
            for ch in target_channels:
                if ch in self.signals:
                    plt.plot(time_ms, self.signals[ch], label=ch)

            plt.title(title)
            plt.xlabel("Time (ms)")
            plt.ylabel("Voltage / Current (kV / kA)")
            plt.grid(True, linestyle="--", alpha=0.6)
            plt.legend()
            plt.tight_layout()
            plt.show()
        except ImportError:
            raise ImportError("Matplotlib is required for plot(). Install via 'pip install matplotlib'.")
