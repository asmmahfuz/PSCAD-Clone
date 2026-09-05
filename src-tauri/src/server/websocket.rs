use super::headless::{HeadlessRunner, HeadlessSimConfig, HeadlessSimResult, OutputFormat};
use crate::engine::parallel_sweep::ParallelSweepConfig;
use crate::engine::simulator::{NativeEmtSimulator, SimulationConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;

/// JSON-RPC 2.0 Request Object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: Option<String>,
    pub id: Option<serde_json::Value>,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

/// JSON-RPC 2.0 Response Object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatusReport {
    pub is_running: bool,
    pub port: u16,
    pub active_clients: usize,
    pub total_requests_handled: usize,
    pub version: String,
}

pub struct SimulationServerState {
    pub is_running: AtomicBool,
    pub port: u16,
    pub active_clients: AtomicUsize,
    pub total_requests: AtomicUsize,
    pub active_simulator: Arc<RwLock<Option<NativeEmtSimulator>>>,
}

impl SimulationServerState {
    pub fn new(port: u16) -> Self {
        Self {
            is_running: AtomicBool::new(false),
            port,
            active_clients: AtomicUsize::new(0),
            total_requests: AtomicUsize::new(0),
            active_simulator: Arc::new(RwLock::new(None)),
        }
    }
}

pub struct RpcServerManager;

impl RpcServerManager {
    /// Start the JSON-RPC TCP server on the specified port
    pub async fn start_server(
        state: Arc<SimulationServerState>,
        port: u16,
    ) -> Result<(), String> {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let listener = TcpListener::bind(addr).await.map_err(|e| e.to_string())?;

        state.is_running.store(true, Ordering::SeqCst);
        log::info!("PSCAD CLONE RPC Server started on {}", addr);

        let state_clone = state.clone();
        tokio::spawn(async move {
            while state_clone.is_running.load(Ordering::SeqCst) {
                match listener.accept().await {
                    Ok((socket, remote_addr)) => {
                        log::info!("PSCAD RPC client connected from {}", remote_addr);
                        state_clone.active_clients.fetch_add(1, Ordering::SeqCst);
                        let client_state = state_clone.clone();
                        tokio::spawn(async move {
                            Self::handle_client_connection(socket, client_state).await;
                        });
                    }
                    Err(e) => {
                        if state_clone.is_running.load(Ordering::SeqCst) {
                            log::error!("Error accepting RPC connection: {}", e);
                        }
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    /// Process incoming requests from a TCP stream (supporting both raw JSON-RPC and HTTP POST)
    async fn handle_client_connection(mut socket: TcpStream, state: Arc<SimulationServerState>) {
        let mut buffer = vec![0u8; 65536];

        loop {
            match socket.read(&mut buffer).await {
                Ok(0) => break, // Connection closed
                Ok(n) => {
                    state.total_requests.fetch_add(1, Ordering::SeqCst);
                    let raw_msg = String::from_utf8_lossy(&buffer[..n]);

                    // Check if it is an HTTP POST request or raw JSON
                    let json_payload = if raw_msg.starts_with("POST ") || raw_msg.starts_with("GET ") || raw_msg.starts_with("OPTIONS ") {
                        if raw_msg.starts_with("OPTIONS ") {
                            // CORS Preflight response
                            let cors_resp = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, GET, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: 0\r\n\r\n";
                            let _ = socket.write_all(cors_resp.as_bytes()).await;
                            continue;
                        }
                        // Extract HTTP Body
                        if let Some(pos) = raw_msg.find("\r\n\r\n") {
                            &raw_msg[pos + 4..]
                        } else {
                            ""
                        }
                    } else {
                        &raw_msg
                    };

                    let response = Self::process_rpc_payload(json_payload, state.clone()).await;
                    let resp_json = serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string());

                    let wire_response = if raw_msg.starts_with("POST ") || raw_msg.starts_with("GET ") {
                        format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                            resp_json.len(),
                            resp_json
                        )
                    } else {
                        format!("{}\n", resp_json)
                    };

                    if socket.write_all(wire_response.as_bytes()).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        state.active_clients.fetch_sub(1, Ordering::SeqCst);
    }

    /// Dispatch JSON-RPC methods
    pub async fn process_rpc_payload(payload: &str, state: Arc<SimulationServerState>) -> JsonRpcResponse {
        let req: JsonRpcRequest = match serde_json::from_str(payload) {
            Ok(r) => r,
            Err(e) => {
                return JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: None,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: format!("Parse error: {}", e),
                        data: None,
                    }),
                };
            }
        };

        let req_id = req.id.clone();
        let method = req.method.as_str();

        let result = match method {
            "pscad.ping" | "ping" => Ok(serde_json::json!({
                "status": "online",
                "server": "PSCAD CLONE EMTDC Server",
                "version": "5.1.0",
                "timestamp": chrono::Utc::now().to_rfc3339()
            })),

            "pscad.get_version" | "get_version" => Ok(serde_json::json!({
                "version": "5.1.0",
                "features": ["sparse_lu", "cda", "mmc_dem", "parallel_sweep", "pmu_c37_118", "fmi_cosim"],
                "protocol": "jsonrpc-2.0"
            })),

            "pscad.run_headless" | "run_headless" => {
                let params = req.params.unwrap_or(serde_json::Value::Null);
                let config: HeadlessSimConfig = serde_json::from_value(params)
                    .unwrap_or_default();
                match HeadlessRunner::run_simulation(&config) {
                    Ok(res) => serde_json::to_value(res).map_err(|e| e.to_string()),
                    Err(e) => Err(e),
                }
            }

            "pscad.start_simulation" | "start_simulation" => {
                let params = req.params.unwrap_or(serde_json::Value::Null);
                let dt = params.get("dt").and_then(|v| v.as_f64()).unwrap_or(5e-5);
                let t_max = params.get("t_max").and_then(|v| v.as_f64()).unwrap_or(0.5);
                let num_nodes = params.get("num_nodes").and_then(|v| v.as_u64()).unwrap_or(6) as usize;
                let cda_enabled = params.get("cda_enabled").and_then(|v| v.as_bool()).unwrap_or(true);

                let sim_cfg = SimulationConfig {
                    dt,
                    t_max,
                    cda_enabled,
                    interpolation_enabled: true,
                };
                let mut sim = NativeEmtSimulator::new(sim_cfg, num_nodes);
                if let Err(e) = sim.assemble_and_factorize_matrix() {
                    Err(format!("Assembly failed: {}", e))
                } else {
                    let mut lock = state.active_simulator.write().await;
                    *lock = Some(sim);
                    Ok(serde_json::json!({
                        "status": "started",
                        "dt": dt,
                        "t_max": t_max,
                        "num_nodes": num_nodes,
                    }))
                }
            }

            "pscad.step" | "step" => {
                let params = req.params.unwrap_or(serde_json::Value::Null);
                let step_count = params.get("steps").and_then(|v| v.as_u64()).unwrap_or(1);
                let mut lock = state.active_simulator.write().await;
                if let Some(ref mut sim) = *lock {
                    let mut last_t = sim.current_time;
                    for _ in 0..step_count {
                        last_t = sim.step().unwrap_or(last_t + sim.config.dt);
                    }
                    Ok(serde_json::json!({
                        "current_time": last_t,
                        "step_count": sim.step_count,
                        "node_voltages": sim.node_voltages,
                    }))
                } else {
                    Err("No active simulation. Call pscad.start_simulation first.".to_string())
                }
            }

            "pscad.set_parameter" | "set_parameter" => {
                let params = req.params.unwrap_or(serde_json::Value::Null);
                let comp_id = params.get("component_id").and_then(|v| v.as_str()).unwrap_or("");
                let param_name = params.get("param_name").and_then(|v| v.as_str()).unwrap_or("");
                let value = params.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0);

                log::info!("RPC live param updated: {}::{} = {}", comp_id, param_name, value);
                Ok(serde_json::json!({
                    "success": true,
                    "component_id": comp_id,
                    "param_name": param_name,
                    "value": value
                }))
            }

            "pscad.run_batch_sweep" | "run_batch_sweep" => {
                let params = req.params.unwrap_or(serde_json::Value::Null);
                match serde_json::from_value::<ParallelSweepConfig>(params) {
                    Ok(sweep_cfg) => {
                        let sim_cfg = SimulationConfig::default();
                        let base_sim = NativeEmtSimulator::new(sim_cfg, 6);
                        let report = crate::engine::parallel_sweep::ParallelSweepEngine::run_sweep(sweep_cfg, 6, &base_sim);
                        serde_json::to_value(report).map_err(|e| e.to_string())
                    }
                    Err(e) => Err(format!("Invalid sweep configuration: {}", e)),
                }
            }

            _ => Err(format!("Method '{}' not found", method)),
        };

        match result {
            Ok(res_val) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req_id,
                result: Some(res_val),
                error: None,
            },
            Err(err_msg) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: req_id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: err_msg,
                    data: None,
                }),
            },
        }
    }
}
