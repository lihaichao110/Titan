use std::process::Command;
use std::sync::Mutex;
use tauri::State;
use log::info;
use serde::{Deserialize, Serialize};

pub struct MobileState {
    pub session: Mutex<Option<SessionInfo>>,
}

impl Default for MobileState {
    fn default() -> Self {
        MobileState {
            session: Mutex::new(None),
        }
    }
}

pub struct SessionInfo {
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamInfo {
    pub session_url: String,
    pub stream_url: String,
    pub udid: String,
    pub mjpeg_port: u16,
}

fn run_node_script(script: &str, args: &[&str]) -> Result<String, String> {
    let node_path = std::env::var("HOME")
        .map(|h| format!("{}/.nvm/versions/node/v24.15.0/bin/node", h))
        .unwrap_or_else(|_| "node".to_string());

    let mut cmd = Command::new(&node_path);
    cmd.arg(script);
    cmd.args(args);

    let output = cmd.output()
        .map_err(|e| format!("Failed to execute node script: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

#[tauri::command]
pub async fn start_screen_stream(udid: String, _state: State<'_, crate::AppState>) -> Result<StreamInfo, String> {
    info!("Starting screen stream for udid: {}", udid);

    let script = std::env::var("HOME")
        .map(|h| format!("{}/Desktop/Titan/src/scripts/wda-launcher.mjs", h))
        .unwrap_or_default();

    let result = run_node_script(&script, &["stream", &udid])?;
    serde_json::from_str(&result).map_err(|e| format!("Failed to parse stream info: {}", e))
}

#[tauri::command]
pub async fn init_wda_session(udid: String, _state: State<'_, crate::AppState>) -> Result<String, String> {
    info!("Initializing WDA session for udid: {}", udid);

    let script = std::env::var("HOME")
        .map(|h| format!("{}/Desktop/Titan/src/scripts/wda-launcher.mjs", h))
        .unwrap_or_default();

    let result = run_node_script(&script, &["init", &udid])?;

    info!("WDA session created: {}", result);
    Ok(result)
}

#[tauri::command]
pub async fn swipe(
    x1: f64, y1: f64,
    x2: f64, y2: f64,
    duration: f64,
    _udid: String,
    _state: State<'_, crate::AppState>,
) -> Result<(), String> {
    info!("Swipe: ({}, {}) -> ({}, {}) duration: {}", x1, y1, x2, y2, duration);

    // Session is managed by the Node.js script via file, not by Rust state
    let script = std::env::var("HOME")
        .map(|h| format!("{}/Desktop/Titan/src/scripts/wda-launcher.mjs", h))
        .unwrap_or_default();

    let x1_str = x1.to_string();
    let y1_str = y1.to_string();
    let x2_str = x2.to_string();
    let y2_str = y2.to_string();
    let dur_str = duration.to_string();

    run_node_script(&script, &["swipe", &x1_str, &y1_str, &x2_str, &y2_str, &dur_str])?;

    Ok(())
}

#[tauri::command]
pub async fn close_wda_session(_state: State<'_, crate::AppState>) -> Result<(), String> {
    info!("Closing WDA session");

    let script = std::env::var("HOME")
        .map(|h| format!("{}/Desktop/Titan/src/scripts/wda-launcher.mjs", h))
        .unwrap_or_default();

    let _ = run_node_script(&script, &["close"]);

    Ok(())
}
