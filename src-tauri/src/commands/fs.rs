use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFileInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub last_modified: u64,
    pub is_pscx: bool,
}

#[tauri::command]
pub async fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read project file at '{}': {}", path, e))
}

#[tauri::command]
pub async fn write_project_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write project file at '{}': {}", path, e))
}

#[tauri::command]
pub async fn export_comtrade_files(
    cfg_path: String,
    dat_path: String,
    cfg_content: String,
    dat_content: Vec<u8>,
) -> Result<(), String> {
    fs::write(&cfg_path, cfg_content).map_err(|e| format!("Failed to write COMTRADE .cfg: {}", e))?;
    fs::write(&dat_path, dat_content).map_err(|e| format!("Failed to write COMTRADE .dat: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn export_data_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Failed to export data file: {}", e))
}

#[tauri::command]
pub async fn list_directory_projects(dir_path: String) -> Result<Vec<ProjectFileInfo>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Directory '{}' does not exist or is not a directory", dir_path));
    }

    let mut results = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_file() {
            let ext = entry_path.extension().and_then(|s| s.to_str()).unwrap_or("");
            if ext.eq_ignore_ascii_case("json") || ext.eq_ignore_ascii_case("pscx") {
                let metadata = entry.metadata().ok();
                let size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                let last_modified = metadata
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                results.push(ProjectFileInfo {
                    name: entry_path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    size_bytes,
                    last_modified,
                    is_pscx: ext.eq_ignore_ascii_case("pscx"),
                });
            }
        }
    }

    results.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(results)
}

#[tauri::command]
pub async fn get_app_cache_dir() -> Result<String, String> {
    std::env::temp_dir()
        .join("pscad_clone_cache")
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to get temp directory path".to_string())
}
