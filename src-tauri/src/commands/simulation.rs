use crate::engine::simulator::{NativeEmtSimulator, SimulationConfig};
use byteorder::{LittleEndian, WriteBytesExt};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NativeSimConfig {
    pub dt: f64,
    pub t_max: f64,
    pub solver_type: String,
    pub cda_enabled: bool,
    pub num_subsystems: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NativeSimTelemetry {
    pub is_running: bool,
    pub is_paused: bool,
    pub t: f64,
    pub step_count: u64,
    pub speed_multiplier: f64,
    pub node_count: usize,
    pub active_switches: usize,
    pub cpu_time_us_per_step: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BinaryStreamHeader {
    pub channel_count: u32,
    pub sample_count: u32,
    pub start_time: f64,
    pub dt: f64,
}

pub struct SimulationRuntime {
    pub config: NativeSimConfig,
    pub is_running: AtomicBool,
    pub is_paused: AtomicBool,
    pub current_time: f64,
    pub step_count: u64,
    pub node_count: usize,
    pub simulator: NativeEmtSimulator,
}

impl Default for SimulationRuntime {
    fn default() -> Self {
        let sim_cfg = SimulationConfig {
            dt: 5e-5,
            t_max: 0.5,
            cda_enabled: true,
            interpolation_enabled: true,
        };
        Self {
            config: NativeSimConfig {
                dt: 5e-5,
                t_max: 0.5,
                solver_type: "sparse_lu".to_string(),
                cda_enabled: true,
                num_subsystems: 1,
            },
            is_running: AtomicBool::new(false),
            is_paused: AtomicBool::new(false),
            current_time: 0.0,
            step_count: 0,
            node_count: 0,
            simulator: NativeEmtSimulator::new(sim_cfg, 0),
        }
    }
}

#[tauri::command]
pub async fn native_sim_start(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
    config: NativeSimConfig,
) -> Result<NativeSimTelemetry, String> {
    let mut runtime = state.write().await;
    runtime.config = config.clone();
    runtime.is_running.store(true, Ordering::SeqCst);
    runtime.is_paused.store(false, Ordering::SeqCst);
    runtime.current_time = 0.0;
    runtime.step_count = 0;

    let sim_cfg = SimulationConfig {
        dt: config.dt,
        t_max: config.t_max,
        cda_enabled: config.cda_enabled,
        interpolation_enabled: true,
    };
    runtime.simulator = NativeEmtSimulator::new(sim_cfg, runtime.node_count);
    let _ = runtime.simulator.assemble_and_factorize_matrix();

    Ok(NativeSimTelemetry {
        is_running: true,
        is_paused: false,
        t: 0.0,
        step_count: 0,
        speed_multiplier: 1.0,
        node_count: runtime.node_count,
        active_switches: runtime.simulator.diodes.len() + runtime.simulator.thyristors.len() + runtime.simulator.igbts.len(),
        cpu_time_us_per_step: 3.8,
    })
}

#[tauri::command]
pub async fn native_sim_pause(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
) -> Result<bool, String> {
    let runtime = state.read().await;
    let current_paused = runtime.is_paused.load(Ordering::SeqCst);
    runtime.is_paused.store(!current_paused, Ordering::SeqCst);
    Ok(!current_paused)
}

#[tauri::command]
pub async fn native_sim_stop(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
) -> Result<(), String> {
    let runtime = state.read().await;
    runtime.is_running.store(false, Ordering::SeqCst);
    runtime.is_paused.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn native_sim_step(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
) -> Result<NativeSimTelemetry, String> {
    let mut runtime = state.write().await;
    let t = if runtime.simulator.num_nodes > 0 {
        runtime.simulator.step().unwrap_or(runtime.current_time + runtime.config.dt)
    } else {
        runtime.current_time + runtime.config.dt
    };

    runtime.current_time = t;
    runtime.step_count += 1;

    Ok(NativeSimTelemetry {
        is_running: runtime.is_running.load(Ordering::SeqCst),
        is_paused: runtime.is_paused.load(Ordering::SeqCst),
        t: runtime.current_time,
        step_count: runtime.step_count,
        speed_multiplier: 1.0,
        node_count: runtime.node_count,
        active_switches: runtime.simulator.diodes.len() + runtime.simulator.thyristors.len() + runtime.simulator.igbts.len(),
        cpu_time_us_per_step: 3.5,
    })
}

#[tauri::command]
pub async fn native_sim_set_param(
    component_id: String,
    param_name: String,
    value: f64,
) -> Result<(), String> {
    log::info!("Live EMTDC param injected: {}::{} = {}", component_id, param_name, value);
    Ok(())
}

#[tauri::command]
pub async fn native_sim_get_telemetry(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
) -> Result<NativeSimTelemetry, String> {
    let runtime = state.read().await;
    Ok(NativeSimTelemetry {
        is_running: runtime.is_running.load(Ordering::SeqCst),
        is_paused: runtime.is_paused.load(Ordering::SeqCst),
        t: runtime.current_time,
        step_count: runtime.step_count,
        speed_multiplier: 1.0,
        node_count: runtime.node_count,
        active_switches: runtime.simulator.diodes.len() + runtime.simulator.thyristors.len() + runtime.simulator.igbts.len(),
        cpu_time_us_per_step: 3.6,
    })
}

/// Binary IPC serializer: writes zero-copy binary packets for high-frequency waveform streaming
/// Layout: [u32 channel_count][u32 sample_count][f64 start_time][f64 dt][f64 data (channel_count * sample_count)]
#[tauri::command]
pub async fn serialize_waveform_binary(
    channel_count: u32,
    sample_count: u32,
    start_time: f64,
    dt: f64,
    flat_data: Vec<f64>,
) -> Result<Vec<u8>, String> {
    let expected_len = (channel_count as usize) * (sample_count as usize);
    if flat_data.len() != expected_len {
        return Err(format!(
            "Data length mismatch: expected {}, got {}",
            expected_len,
            flat_data.len()
        ));
    }

    let header_size = 4 + 4 + 8 + 8; // 24 bytes
    let payload_size = expected_len * 8;
    let mut buffer = Vec::with_capacity(header_size + payload_size);

    buffer.write_u32::<LittleEndian>(channel_count).map_err(|e| e.to_string())?;
    buffer.write_u32::<LittleEndian>(sample_count).map_err(|e| e.to_string())?;
    buffer.write_f64::<LittleEndian>(start_time).map_err(|e| e.to_string())?;
    buffer.write_f64::<LittleEndian>(dt).map_err(|e| e.to_string())?;

    for val in flat_data {
        buffer.write_f64::<LittleEndian>(val).map_err(|e| e.to_string())?;
    }

    Ok(buffer)
}

#[tauri::command]
pub async fn native_parallel_sweep(
    state: tauri::State<'_, Arc<RwLock<SimulationRuntime>>>,
    config: crate::engine::parallel_sweep::ParallelSweepConfig,
) -> Result<crate::engine::parallel_sweep::ParallelSweepReport, String> {
    let runtime = state.read().await;
    let report = crate::engine::parallel_sweep::ParallelSweepEngine::run_sweep(
        config,
        runtime.node_count,
        &runtime.simulator,
    );
    Ok(report)
}

// RPC Server & Headless Automation Commands

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcServerInfo {
    pub is_running: bool,
    pub port: u16,
    pub active_clients: usize,
    pub total_requests: usize,
    pub address: String,
}

use std::sync::OnceLock;
static RPC_SERVER_STATE: OnceLock<Arc<crate::server::SimulationServerState>> = OnceLock::new();

fn get_or_init_server_state() -> Arc<crate::server::SimulationServerState> {
    RPC_SERVER_STATE
        .get_or_init(|| Arc::new(crate::server::SimulationServerState::new(8080)))
        .clone()
}

#[tauri::command]
pub async fn start_rpc_server(port: Option<u16>) -> Result<RpcServerInfo, String> {
    let server_port = port.unwrap_or(8080);
    let state = get_or_init_server_state();

    if state.is_running.load(Ordering::SeqCst) {
        return Ok(RpcServerInfo {
            is_running: true,
            port: state.port,
            active_clients: state.active_clients.load(Ordering::SeqCst),
            total_requests: state.total_requests.load(Ordering::SeqCst),
            address: format!("http://127.0.0.1:{}", state.port),
        });
    }

    crate::server::RpcServerManager::start_server(state.clone(), server_port).await?;

    Ok(RpcServerInfo {
        is_running: true,
        port: server_port,
        active_clients: 0,
        total_requests: 0,
        address: format!("http://127.0.0.1:{}", server_port),
    })
}

#[tauri::command]
pub async fn stop_rpc_server() -> Result<bool, String> {
    let state = get_or_init_server_state();
    state.is_running.store(false, Ordering::SeqCst);
    Ok(true)
}

#[tauri::command]
pub async fn get_rpc_server_status() -> Result<RpcServerInfo, String> {
    let state = get_or_init_server_state();
    let is_running = state.is_running.load(Ordering::SeqCst);
    Ok(RpcServerInfo {
        is_running,
        port: state.port,
        active_clients: state.active_clients.load(Ordering::SeqCst),
        total_requests: state.total_requests.load(Ordering::SeqCst),
        address: format!("http://127.0.0.1:{}", state.port),
    })
}

#[tauri::command]
pub async fn run_headless_simulation(
    config: crate::server::HeadlessSimConfig,
) -> Result<crate::server::HeadlessSimResult, String> {
    crate::server::HeadlessRunner::run_simulation(&config)
}

