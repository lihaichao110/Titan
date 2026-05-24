mod error;
mod screenshot;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};

use screenshot::{
    check_pymobiledevice_installed, check_tunneld_running,
    start_tunneld, list_devices as list_pymobile_devices, capture_screen,
    DeviceInfo as ScreenshotDeviceInfo,
};

pub struct AppState {
    pub udid: Arc<Mutex<Option<String>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub udid: String,
    pub name: String,
}

impl From<ScreenshotDeviceInfo> for DeviceInfo {
    fn from(d: ScreenshotDeviceInfo) -> Self {
        DeviceInfo { udid: d.udid, name: d.name }
    }
}

#[tauri::command]
fn check_pymobiledevice(state: State<AppState>) -> Result<bool, String> {
    let _ = state;
    Ok(check_pymobiledevice_installed())
}

#[tauri::command]
fn check_tunneld(state: State<AppState>) -> Result<bool, String> {
    let _ = state;
    Ok(check_tunneld_running())
}

#[tauri::command]
async fn start_tunnel(state: State<'_, AppState>) -> Result<(), String> {
    let _ = state;
    start_tunneld().map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    let _ = state;
    let devices = list_pymobile_devices().map_err(|e| e.to_string())?;
    Ok(devices.into_iter().map(DeviceInfo::from).collect())
}

#[tauri::command]
async fn get_screenshot(udid: String, state: State<'_, AppState>) -> Result<String, String> {
    let _ = state;
    capture_screen(&udid).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger for debugging
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("debug"))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            udid: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            check_pymobiledevice,
            check_tunneld,
            start_tunnel,
            list_devices,
            get_screenshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}