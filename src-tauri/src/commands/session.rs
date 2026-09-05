use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentProjectItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: u64,
    pub component_count: usize,
    pub wire_count: usize,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoSaveSessionData {
    pub project_name: String,
    pub file_path: Option<String>,
    pub saved_at: u64,
    pub json_content: String,
}

fn get_session_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("pscad_clone_session");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

fn get_recent_projects_file() -> PathBuf {
    get_session_dir().join("recent_projects.json")
}

fn get_autosave_file() -> PathBuf {
    get_session_dir().join("autosave_session.json")
}

#[tauri::command]
pub async fn save_session_cache(data: AutoSaveSessionData) -> Result<(), String> {
    let path = get_autosave_file();
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write session cache: {}", e))
}

#[tauri::command]
pub async fn load_session_cache() -> Result<Option<AutoSaveSessionData>, String> {
    let path = get_autosave_file();
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read session cache: {}", e))?;
    let data = serde_json::from_str::<AutoSaveSessionData>(&content)
        .map_err(|e| format!("Deserialization error: {}", e))?;
    Ok(Some(data))
}

#[tauri::command]
pub async fn clear_session_cache() -> Result<(), String> {
    let path = get_autosave_file();
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_recent_projects() -> Result<Vec<RecentProjectItem>, String> {
    let path = get_recent_projects_file();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
    let list: Vec<RecentProjectItem> = serde_json::from_str(&content).unwrap_or_default();
    Ok(list)
}

#[tauri::command]
pub async fn add_recent_project(item: RecentProjectItem) -> Result<Vec<RecentProjectItem>, String> {
    let path = get_recent_projects_file();
    let mut list = get_recent_projects().await.unwrap_or_default();

    // Remove if already exists with same path or name
    list.retain(|p| p.path != item.path && p.name != item.name);
    // Prepend item to top
    list.insert(0, item);
    // Keep max 20 recent projects
    if list.len() > 20 {
        list.truncate(20);
    }

    let content = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to save recent projects: {}", e))?;

    Ok(list)
}

#[tauri::command]
pub async fn remove_recent_project(path_str: String) -> Result<Vec<RecentProjectItem>, String> {
    let file_path = get_recent_projects_file();
    let mut list = get_recent_projects().await.unwrap_or_default();
    list.retain(|p| p.path != path_str);

    let content = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&file_path, content).map_err(|e| format!("Failed to update recent projects: {}", e))?;

    Ok(list)
}
