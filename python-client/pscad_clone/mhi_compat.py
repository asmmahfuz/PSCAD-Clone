"""
PSCAD CLONE - MHI Automation Compatibility Layer
Drop-in replacement for the official 'mhi.pscad' library.
"""

from typing import Optional, List
from .controller import PSCad, Project, Canvas
from .models import Component



class MhiSignal:
    def __init__(self, name: str, values: List[float]):
        self.name = name
        self.values = list(values)


class MhiCanvasCompat:
    def __init__(self, canvas: Canvas, project: Project):
        self._canvas = canvas
        self._project = project

    def component(self, name: str) -> Optional[Component]:
        return self._canvas.get_component(name)

    def get_signal(self, name: str) -> MhiSignal:
        res = self._project.run()
        sig = res.get_signal(name)
        if sig is not None:
            return MhiSignal(name, list(sig))
        return MhiSignal(name, [0.0] * 100)


class MhiProjectCompat:
    def __init__(self, project: Project):
        self._project = project

    def parameters(self, **kwargs):
        if "dt" in kwargs:
            self._project.config.dt = float(kwargs["dt"])
        if "duration" in kwargs:
            self._project.config.t_max = float(kwargs["duration"])

    def user_canvas(self, name: str = "Main") -> MhiCanvasCompat:
        return MhiCanvasCompat(self._project.user_canvas(name), self._project)

    def component(self, name: str) -> Optional[Component]:
        return self._project.component(name)

    def run(self):
        return self._project.run()


class MhiApplication:
    def __init__(self, endpoint_url: str = "http://127.0.0.1:8080"):
        self._pscad = PSCad.connect(endpoint_url)

    def version(self) -> str:
        return f"PSCAD CLONE MHI Compat Host v{self._pscad.version}"

    def create(self, name: str) -> MhiProjectCompat:
        proj = self._pscad.create_project(name)
        return MhiProjectCompat(proj)

    def load(self, file_path: str) -> MhiProjectCompat:
        proj = self._pscad.load_project(file_path)
        return MhiProjectCompat(proj)


def application(host: str = "http://127.0.0.1:8080") -> MhiApplication:
    """
    Entry point mimicking mhi.pscad.application()
    """
    return MhiApplication(host)
