mod error;
mod screenshot;
mod mobile_control;
mod pc_web_control;
mod pc_browser_control;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};

use screenshot::{
    check_pymobiledevice_installed, check_tunneld_running,
    list_devices as list_pymobile_devices, capture_screen,
    DeviceInfo as ScreenshotDeviceInfo, dvt_swipe as run_dvt_swipe,
    auto_pair_device,
};
use mobile_control::{init_wda_session, start_screen_stream, swipe, close_wda_session, MobileState};
use pc_web_control::run_pc_web_test;
use pc_browser_control::{
    close_pc_browser, create_pc_browser, hide_pc_browser, navigate_pc_browser,
    set_pc_browser_bounds, show_pc_browser,
};

pub struct AppState {
    pub udid: Arc<Mutex<Option<String>>>,
    pub mobile_state: MobileState,
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

#[tauri::command]
async fn dvt_swipe(x1: f64, y1: f64, x2: f64, y2: f64, duration: f64, udid: String, state: State<'_, AppState>) -> Result<(), String> {
    let _ = state;
    run_dvt_swipe(x1, y1, x2, y2, duration, &udid).map_err(|e| e.to_string())
}

#[tauri::command]
async fn pair_device(state: State<'_, AppState>) -> Result<(), String> {
    let _ = state;
    auto_pair_device().map_err(|e| e.to_string())
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
            mobile_state: mobile_control::MobileState::default(),
        })
        .invoke_handler(tauri::generate_handler![
            check_pymobiledevice,
            check_tunneld,
            list_devices,
            get_screenshot,
            dvt_swipe,
            pair_device,
            start_screen_stream,
            init_wda_session,
            swipe,
            close_wda_session,
            run_pc_web_test,
            create_pc_browser,
            navigate_pc_browser,
            set_pc_browser_bounds,
            show_pc_browser,
            hide_pc_browser,
            close_pc_browser,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
