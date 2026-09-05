// Prevents additional console window on Windows in release (unless run with CLI flags)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pscad_modern_lib::server::{HeadlessRunner, HeadlessSimConfig, OutputFormat, RpcServerManager, SimulationServerState};
use std::env;
use std::sync::Arc;

fn main() {
    let args: Vec<String> = env::args().collect();

    // Check if running in headless CLI mode
    if args.iter().any(|a| a == "--headless" || a == "-h" || a == "--server" || a == "-s") {
        env_logger::init();
        let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

        if args.iter().any(|a| a == "--server" || a == "-s") {
            // Server mode
            let port = args.windows(2)
                .find(|w| w[0] == "--port" || w[0] == "-p")
                .and_then(|w| w[1].parse::<u16>().ok())
                .unwrap_or(8080);

            println!("============================================================");
            println!("   PSCAD Modern - High-Performance EMTDC Remote RPC Server  ");
            println!("   Version 5.1.0 (c) 2026 PSCAD Modern Engineering Team      ");
            println!("============================================================");
            println!("Listening on JSON-RPC TCP/HTTP: http://127.0.0.1:{}", port);
            println!("Press Ctrl+C to terminate server.");

            rt.block_on(async {
                let state = Arc::new(SimulationServerState::new(port));
                if let Err(e) = RpcServerManager::start_server(state, port).await {
                    eprintln!("Failed to start RPC server: {}", e);
                    std::process::exit(1);
                }
                // Keep server running until interrupted
                tokio::signal::ctrl_c().await.unwrap();
                println!("RPC Server stopped.");
            });
            return;
        }

        // Headless simulation run mode
        let mut config = HeadlessSimConfig::default();

        for i in 0..args.len() {
            match args[i].as_str() {
                "--project" if i + 1 < args.len() => {
                    config.project_path = Some(args[i + 1].clone());
                }
                "--dt" if i + 1 < args.len() => {
                    if let Ok(val) = args[i + 1].parse::<f64>() {
                        config.dt = val;
                    }
                }
                "--t-max" if i + 1 < args.len() => {
                    if let Ok(val) = args[i + 1].parse::<f64>() {
                        config.t_max = val;
                    }
                }
                "--nodes" if i + 1 < args.len() => {
                    if let Ok(val) = args[i + 1].parse::<usize>() {
                        config.num_nodes = val;
                    }
                }
                "--output" if i + 1 < args.len() => {
                    config.output_path = Some(args[i + 1].clone());
                }
                "--format" if i + 1 < args.len() => {
                    config.output_format = match args[i + 1].to_lowercase().as_str() {
                        "csv" => OutputFormat::Csv,
                        "comtrade" => OutputFormat::Comtrade,
                        _ => OutputFormat::Json,
                    };
                }
                _ => {}
            }
        }

        println!("============================================================");
        println!("   PSCAD Modern - Headless EMTDC Simulation Kernel Runner    ");
        println!("============================================================");
        println!("Configuration: dt = {:.2e} s, t_max = {:.3} s, nodes = {}", config.dt, config.t_max, config.num_nodes);
        if let Some(ref p) = config.project_path {
            println!("Target Project: {}", p);
        }
        if let Some(ref out) = config.output_path {
            println!("Output Destination: {} ({:?})", out, config.output_format);
        }

        match HeadlessRunner::run_simulation(&config) {
            Ok(result) => {
                println!(" Simulation completed successfully!");
                println!("  - Steps Executed : {}", result.steps_completed);
                println!("  - Sim Duration   : {:.4} s", result.total_sim_time);
                println!("  - Compute Time   : {:.2} ms", result.execution_time_ms);
                println!("  - Recorded Nodes : {}", result.signals.len());
            }
            Err(e) => {
                eprintln!("❌ Simulation failed: {}", e);
                std::process::exit(1);
            }
        }
        return;
    }

    // Default: GUI Application Launcher
    pscad_modern_lib::run();
}
