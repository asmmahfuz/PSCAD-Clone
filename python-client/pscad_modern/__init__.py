"""
PSCAD Modern Python Client & Automation SDK
High-performance automation and co-simulation interface for PSCAD Modern EMTDC Kernel.
"""

from .models import Component, Wire, SimulationConfig, SimulationResult
from .client import RpcClient
from .controller import PSCad, Project, Canvas
from . import mhi_compat

__version__ = "5.1.0"
__all__ = [
    "PSCad",
    "Project",
    "Canvas",
    "Component",
    "Wire",
    "SimulationConfig",
    "SimulationResult",
    "RpcClient",
    "mhi_compat",
]
