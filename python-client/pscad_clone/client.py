"""
PSCAD CLONE - JSON-RPC Remote Client
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

try:
    import requests  # type: ignore
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False



class RpcClient:
    def __init__(self, endpoint_url: str = "http://127.0.0.1:8080"):
        self.endpoint_url = endpoint_url.rstrip('/')
        self._request_id = 1

    def call(self, method: str, params: Optional[Dict[str, Any]] = None, timeout: float = 2.0) -> Any:
        """
        Execute JSON-RPC 2.0 call over HTTP POST using requests or standard urllib
        """
        req_id = self._request_id
        self._request_id += 1

        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {}
        }
        json_bytes = json.dumps(payload).encode('utf-8')

        if HAS_REQUESTS:
            try:
                resp = requests.post(
                    self.endpoint_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=timeout
                )
                resp.raise_for_status()
                data = resp.json()

                if "error" in data and data["error"] is not None:
                    err = data["error"]
                    raise RuntimeError(f"PSCAD RPC Error [{err.get('code', -1)}]: {err.get('message', 'Unknown error')}")

                return data.get("result")
            except requests.exceptions.RequestException as e:
                raise ConnectionError(f"Failed to connect to PSCAD CLONE server at {self.endpoint_url}: {e}")
        else:
            # Fallback using urllib.request
            try:
                req = urllib.request.Request(
                    self.endpoint_url,
                    data=json_bytes,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    data = json.loads(resp.read().decode('utf-8'))

                if "error" in data and data["error"] is not None:
                    err = data["error"]
                    raise RuntimeError(f"PSCAD RPC Error [{err.get('code', -1)}]: {err.get('message', 'Unknown error')}")

                return data.get("result")
            except urllib.error.URLError as e:
                raise ConnectionError(f"Failed to connect to PSCAD CLONE server at {self.endpoint_url}: {e}")

    def ping(self) -> Dict[str, Any]:
        return self.call("pscad.ping", timeout=0.8)

    def get_version(self) -> Dict[str, Any]:
        return self.call("pscad.get_version", timeout=0.8)
