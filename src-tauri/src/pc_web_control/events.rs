use std::time::Instant;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

use super::types::{PcWebLogEntry, PcWebRunnerEvent, StepResult};

fn now_time() -> String {
    chrono::Local::now().format("%H:%M:%S").to_string()
}

fn make_log(level: &str, msg: impl Into<String>) -> PcWebLogEntry {
    PcWebLogEntry {
        time: now_time(),
        level: level.to_string(),
        msg: msg.into(),
    }
}

pub(crate) fn format_duration(started_at: Instant) -> String {
    format!("00:00:{:02}", started_at.elapsed().as_secs().min(99))
}

pub(crate) fn emit_event(
    app_handle: &AppHandle,
    event: &str,
    payload: Value,
) -> Result<(), String> {
    app_handle
        .emit(
            "pc-web-runner-event",
            &PcWebRunnerEvent {
                event: event.to_string(),
                payload,
            },
        )
        .map_err(|e| format!("推送 PC Web 执行事件失败: {}", e))
}

pub(crate) fn emit_log(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    level: &str,
    msg: impl Into<String>,
) -> Result<(), String> {
    let log = make_log(level, msg);
    emit_event(app_handle, "log", json!(log))?;
    logs.push(log);
    Ok(())
}

pub(crate) fn emit_debug_log(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    msg: impl Into<String>,
) -> Result<(), String> {
    let msg = msg.into();
    log::debug!("{}", msg);
    emit_log(app_handle, logs, "INFO", format!("[调试] {}", msg))
}

pub(crate) fn emit_step(app_handle: &AppHandle, payload: Value) -> Result<(), String> {
    emit_event(app_handle, "step", payload)
}

pub(crate) fn emit_step_result(
    app_handle: &AppHandle,
    results: &mut Vec<StepResult>,
    result: StepResult,
) -> Result<(), String> {
    emit_step(app_handle, json!(result))?;
    results.push(result);
    Ok(())
}
