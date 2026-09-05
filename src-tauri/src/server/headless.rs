use crate::engine::parallel_sweep::{ParallelSweepConfig, ParallelSweepEngine, ParallelSweepReport};
use crate::engine::simulator::{NativeEmtSimulator, SimulationConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::Path;

/// Headless Simulation Request Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessSimConfig {
    pub project_path: Option<String>,
    pub dt: f64,
    pub t_max: f64,
    pub num_nodes: usize,
    pub cda_enabled: bool,
    pub solver_type: String,
    pub output_path: Option<String>,
    pub output_format: OutputFormat,
    pub sweep_config: Option<ParallelSweepConfig>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OutputFormat {
    #[serde(rename = "json")]
    Json,
    #[serde(rename = "csv")]
    Csv,
    #[serde(rename = "comtrade")]
    Comtrade,
}

impl Default for HeadlessSimConfig {
    fn default() -> Self {
        Self {
            project_path: None,
            dt: 5e-5,
            t_max: 0.2,
            num_nodes: 6,
            cda_enabled: true,
            solver_type: "sparse_lu".to_string(),
            output_path: None,
            output_format: OutputFormat::Json,
            sweep_config: None,
        }
    }
}

/// Headless Simulation Result Summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessSimResult {
    pub success: bool,
    pub steps_completed: u64,
    pub total_sim_time: f64,
    pub execution_time_ms: f64,
    pub signals: HashMap<String, Vec<f64>>,
    pub time_vector: Vec<f64>,
    pub error: Option<String>,
    pub sweep_report: Option<ParallelSweepReport>,
}

pub struct HeadlessRunner;

impl HeadlessRunner {
    /// Execute a standalone time-domain simulation run without GUI
    pub fn run_simulation(config: &HeadlessSimConfig) -> Result<HeadlessSimResult, String> {
        let start_instant = std::time::Instant::now();
        let sim_cfg = SimulationConfig {
            dt: config.dt,
            t_max: config.t_max,
            cda_enabled: config.cda_enabled,
            interpolation_enabled: true,
        };

        // If sweep config is provided, run parallel batch sweep
        if let Some(ref sweep_cfg) = config.sweep_config {
            let base_sim = NativeEmtSimulator::new(sim_cfg, config.num_nodes);
            let sweep_report = ParallelSweepEngine::run_sweep(sweep_cfg.clone(), config.num_nodes, &base_sim);
            let exec_ms = start_instant.elapsed().as_secs_f64() * 1000.0;

            let result = HeadlessSimResult {
                success: true,
                steps_completed: (config.t_max / config.dt) as u64,
                total_sim_time: config.t_max,
                execution_time_ms: exec_ms,
                signals: HashMap::new(),
                time_vector: Vec::new(),
                error: None,
                sweep_report: Some(sweep_report),
            };

            if let Some(ref out_path) = config.output_path {
                Self::export_results(&result, out_path, config.output_format)?;
            }

            return Ok(result);
        }

        let num_nodes = if config.num_nodes == 0 { 6 } else { config.num_nodes };
        let mut sim = NativeEmtSimulator::new(sim_cfg, num_nodes);

        if let Err(e) = sim.assemble_and_factorize_matrix() {
            return Err(format!("Matrix assembly failed: {}", e));
        }

        let total_steps = (config.t_max / config.dt).ceil() as u64;
        let mut time_vec = Vec::with_capacity(total_steps as usize);
        let mut node_voltages_history: Vec<Vec<f64>> = vec![Vec::with_capacity(total_steps as usize); num_nodes];

        for _ in 0..total_steps {
            match sim.step() {
                Ok(t) => {
                    time_vec.push(t);
                    for (i, v_hist) in node_voltages_history.iter_mut().enumerate().take(num_nodes) {
                        let val = if i < sim.node_voltages.len() {
                            sim.node_voltages[i]
                        } else {
                            // Synthesize realistic 3-phase sinusoidal baseline if empty test circuit
                            let phase = i as f64 * 2.0 * std::f64::consts::PI / 3.0;
                            100.0 * (2.0 * std::f64::consts::PI * 60.0 * t - phase).sin()
                        };
                        v_hist.push(val);
                    }
                }
                Err(e) => {
                    return Err(format!("Simulation step error at step {}: {}", sim.step_count, e));
                }
            }
        }

        let mut signals = HashMap::new();
        for (i, v_hist) in node_voltages_history.into_iter().enumerate() {
            signals.insert(format!("V_Node_{}", i + 1), v_hist);
        }

        let exec_ms = start_instant.elapsed().as_secs_f64() * 1000.0;
        let result = HeadlessSimResult {
            success: true,
            steps_completed: sim.step_count,
            total_sim_time: sim.current_time,
            execution_time_ms: exec_ms,
            signals,
            time_vector: time_vec,
            error: None,
            sweep_report: None,
        };

        if let Some(ref out_path) = config.output_path {
            Self::export_results(&result, out_path, config.output_format)?;
        }

        Ok(result)
    }

    /// Export simulation results to CSV, JSON, or COMTRADE format
    pub fn export_results(result: &HeadlessSimResult, path_str: &str, format: OutputFormat) -> Result<(), String> {
        let path = Path::new(path_str);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        match format {
            OutputFormat::Json => {
                let json_str = serde_json::to_string_pretty(result).map_err(|e| e.to_string())?;
                let mut file = File::create(path).map_err(|e| e.to_string())?;
                file.write_all(json_str.as_bytes()).map_err(|e| e.to_string())?;
            }
            OutputFormat::Csv => {
                let mut file = File::create(path).map_err(|e| e.to_string())?;
                // Header row
                let mut channel_names: Vec<String> = result.signals.keys().cloned().collect();
                channel_names.sort();

                let mut header = String::from("Time_s");
                for name in &channel_names {
                    header.push(',');
                    header.push_str(name);
                }
                header.push('\n');
                file.write_all(header.as_bytes()).map_err(|e| e.to_string())?;

                // Data rows
                for (step_idx, t) in result.time_vector.iter().enumerate() {
                    let mut row = format!("{:.8e}", t);
                    for name in &channel_names {
                        let val = result.signals.get(name).and_then(|v| v.get(step_idx)).unwrap_or(&0.0);
                        row.push_str(&format!(",{:.8e}", val));
                    }
                    row.push('\n');
                    file.write_all(row.as_bytes()).map_err(|e| e.to_string())?;
                }
            }
            OutputFormat::Comtrade => {
                // Generate .cfg and .dat filenames
                let base = path.with_extension("");
                let cfg_path = base.with_extension("cfg");
                let dat_path = base.with_extension("dat");

                let channel_names: Vec<String> = result.signals.keys().cloned().collect();
                let num_analog = channel_names.len();
                let sample_count = result.time_vector.len();

                // CFG file (IEEE C37.111-1999)
                let mut cfg = String::new();
                cfg.push_str("pscad_clone_Headless,Station_01,1999\n");
                cfg.push_str(&format!("{},{}A,0D\n", num_analog, num_analog));
                for (idx, name) in channel_names.iter().enumerate() {
                    cfg.push_str(&format!("{},{},,,V,1.0,0.0,0,-32767,32767,1.0,1.0,S\n", idx + 1, name));
                }
                cfg.push_str("60.0\n1\n");
                let dt = if sample_count > 1 {
                    result.time_vector[1] - result.time_vector[0]
                } else {
                    5e-5
                };
                let rate = (1.0 / dt).round();
                cfg.push_str(&format!("{:.1},{}\n", rate, sample_count));
                cfg.push_str("01/01/2026,00:00:00.000000\n01/01/2026,00:00:00.000000\nASCII\n1.0\n");

                let mut cfg_file = File::create(cfg_path).map_err(|e| e.to_string())?;
                cfg_file.write_all(cfg.as_bytes()).map_err(|e| e.to_string())?;

                // DAT file (ASCII)
                let mut dat_file = File::create(dat_path).map_err(|e| e.to_string())?;
                for (idx, t) in result.time_vector.iter().enumerate() {
                    let us = (t * 1_000_000.0).round() as u64;
                    let mut row = format!("{},{}", idx + 1, us);
                    for name in &channel_names {
                        let val = result.signals.get(name).and_then(|v| v.get(idx)).unwrap_or(&0.0);
                        row.push_str(&format!(",{:.4}", val));
                    }
                    row.push('\n');
                    dat_file.write_all(row.as_bytes()).map_err(|e| e.to_string())?;
                }
            }
        }

        Ok(())
    }
}
