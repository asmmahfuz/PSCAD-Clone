mod commands;
pub mod engine;
pub mod gpu;
mod menu;
pub mod server;

use commands::{
    fs::{
        export_comtrade_files, export_data_file, get_app_cache_dir, list_directory_projects,
        read_project_file, write_project_file,
    },
    session::{
        add_recent_project, clear_session_cache, get_recent_projects, load_session_cache,
        remove_recent_project, save_session_cache,
    },
    simulation::{
        get_rpc_server_status, native_parallel_sweep, native_sim_get_telemetry, native_sim_pause,
        native_sim_set_param, native_sim_start, native_sim_step, native_sim_stop,
        run_headless_simulation, serialize_waveform_binary, start_rpc_server, stop_rpc_server,
        SimulationRuntime,
    },
    window::{
        window_close, window_is_maximized, window_minimize, window_set_always_on_top,
        window_set_fullscreen, window_start_dragging, window_toggle_maximize,
    },
};
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::RwLock;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sim_runtime = Arc::new(RwLock::new(SimulationRuntime::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(sim_runtime)
        .setup(|app| {
            // Build and set native window menu
            if let Ok(app_menu) = menu::create_app_menu(app.handle()) {
                let _ = app.set_menu(app_menu);
            }

            // Handle native menu events
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let event_id = event.id().as_ref();
                let _ = app_handle.emit("menu_action", event_id);
            });

            log::info!("PSCAD CLONE Tauri 2.0 shell initialized successfully.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File System Commands
            read_project_file,
            write_project_file,
            export_comtrade_files,
            export_data_file,
            list_directory_projects,
            get_app_cache_dir,
            // Session Commands
            save_session_cache,
            load_session_cache,
            clear_session_cache,
            get_recent_projects,
            add_recent_project,
            remove_recent_project,
            // Native Simulation Commands
            native_sim_start,
            native_sim_pause,
            native_sim_stop,
            native_sim_step,
            native_sim_set_param,
            native_sim_get_telemetry,
            serialize_waveform_binary,
            native_parallel_sweep,
            // Automation & RPC Server Commands
            start_rpc_server,
            stop_rpc_server,
            get_rpc_server_status,
            run_headless_simulation,
            // Native Window Control Commands
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_set_always_on_top,
            window_set_fullscreen,
            window_is_maximized,
            window_start_dragging,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PSCAD CLONE Tauri application");
}

