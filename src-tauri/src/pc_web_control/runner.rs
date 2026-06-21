use std::time::{Duration, Instant};

use serde_json::Value;
use tauri::{AppHandle, Webview, Wry};

use super::diagnostics::page_error;
use super::eval::{compact_json, error_value, eval_json, json_field_text, ok_value, truncate_text};
use super::events::emit_debug_log;
use super::scripts::step_script;
use super::types::{PcWebLocator, PcWebLogEntry, PcWebStep};

const STEP_TIMEOUT: Duration = Duration::from_secs(20);
const STEP_POLL_INTERVAL: Duration = Duration::from_millis(80);

pub(crate) fn step_timeout(step: &PcWebStep) -> Duration {
    step.timeout_ms
        .map(Duration::from_millis)
        .unwrap_or(STEP_TIMEOUT)
}

pub(crate) fn step_locators(step: &PcWebStep) -> &[PcWebLocator] {
    step.locators.as_deref().unwrap_or(&[])
}

pub(crate) fn step_value_summary(value: &Value) -> String {
    let mut parts = Vec::new();
    for key in [
        "ok",
        "error",
        "detail",
        "currentUrl",
        "beforeUrl",
        "afterUrl",
        "expectedUrlPart",
        "element",
        "matchedLocator",
        "visibleCandidateCount",
        "currentLength",
        "expectedLength",
        "currentValue",
        "beforeLength",
        "valueSnippet",
        "activeElement",
        "attempts",
        "stableCount",
        "inputDebug",
        "searchFallbackUrl",
    ] {
        if let Some(text) = json_field_text(value, key) {
            parts.push(format!("{}={}", key, truncate_text(&text, 160)));
        }
    }

    if parts.is_empty() {
        return compact_json(value, 500);
    }
    parts.join("，")
}

pub(crate) fn run_step(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    webview: &Webview<Wry>,
    step: &PcWebStep,
) -> Result<Value, String> {
    let deadline = Instant::now() + step_timeout(step);
    let locators = step_locators(step);
    let script = step_script(step)?;
    let mut last_error = format!("步骤执行失败: {}", step.instruction);
    let mut last_error_logged = String::new();
    let mut has_logged_first_result = false;

    while Instant::now() < deadline {
        let value = match eval_json(webview, script.clone(), Duration::from_secs(2)) {
            Ok(value) => value,
            Err(error) => {
                emit_debug_log(
                    app_handle,
                    logs,
                    format!("步骤 {} 脚本执行异常: {}", step.step, error),
                )?;
                return Err(error);
            }
        };
        if !has_logged_first_result {
            emit_debug_log(
                app_handle,
                logs,
                format!(
                    "步骤 {} 首次执行返回: {}",
                    step.step,
                    step_value_summary(&value)
                ),
            )?;
            has_logged_first_result = true;
        }
        if ok_value(&value) {
            return Ok(value);
        }
        if let Some(error) = error_value(&value) {
            last_error = error;
            if last_error != last_error_logged {
                emit_debug_log(
                    app_handle,
                    logs,
                    format!("步骤 {} 等待中: {}", step.step, step_value_summary(&value)),
                )?;
                last_error_logged = last_error.clone();
            }
        }
        std::thread::sleep(STEP_POLL_INTERVAL);
    }

    let diagnostic = page_error(webview, &last_error, locators);
    emit_debug_log(
        app_handle,
        logs,
        format!("步骤 {} 超时诊断: {}", step.step, diagnostic),
    )?;
    Err(diagnostic)
}
