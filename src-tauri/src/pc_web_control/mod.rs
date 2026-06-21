mod diagnostics;
mod eval;
mod events;
mod runner;
mod scripts;
mod types;

use std::time::Instant;

use serde_json::json;
use tauri::{AppHandle, Manager};

use diagnostics::page_snapshot;
use eval::{json_field_text, normalize_url, truncate_text, wait_for_current_page_ready};
use events::{emit_debug_log, emit_event, emit_log, emit_step, emit_step_result, format_duration};
use runner::{run_step, step_locators, step_timeout, step_value_summary};
use types::{PcWebRunResult, PcWebTestRequest, StepResult};

const PC_BROWSER_LABEL: &str = "pc-browser-preview";

#[tauri::command]
pub async fn run_pc_web_test(
    app_handle: AppHandle,
    request: PcWebTestRequest,
) -> Result<PcWebRunResult, String> {
    let target_url = normalize_url(&request.url)?;
    if request.steps.is_empty() {
        return Err("测试步骤不能为空".to_string());
    }

    let webview = app_handle
        .get_webview(PC_BROWSER_LABEL)
        .ok_or_else(|| "PC 浏览器尚未创建".to_string())?;

    let mut logs = Vec::new();
    let mut results = Vec::new();

    emit_log(
        &app_handle,
        &mut logs,
        "INFO",
        format!("使用嵌入 PC 浏览器执行测试: {}", target_url),
    )?;
    emit_debug_log(
        &app_handle,
        &mut logs,
        format!(
            "测试开始: targetUrl={}，steps={}",
            target_url,
            request.steps.len()
        ),
    )?;

    for (index, step) in request.steps.iter().enumerate() {
        let started_at = Instant::now();
        let locators_text =
            serde_json::to_string(step_locators(step)).unwrap_or_else(|_| "[]".to_string());

        emit_step(
            &app_handle,
            json!({
                "step": step.step,
                "status": "executing",
                "duration": null,
                "detail": "正在执行..."
            }),
        )?;
        emit_log(
            &app_handle,
            &mut logs,
            "INFO",
            format!("执行步骤 {}: {}", step.step, step.name),
        )?;
        emit_debug_log(
            &app_handle,
            &mut logs,
            format!(
                "步骤 {} 开始: name={}，action={}，value={}，timeoutMs={}，locators={}",
                step.step,
                step.name,
                step.action,
                step.value.as_deref().unwrap_or(""),
                step_timeout(step).as_millis(),
                truncate_text(&locators_text, 500)
            ),
        )?;
        emit_debug_log(
            &app_handle,
            &mut logs,
            format!(
                "步骤 {} 执行前页面快照: {}",
                step.step,
                page_snapshot(&webview, step_locators(step))
            ),
        )?;

        let step_result = if index == 0 {
            match wait_for_current_page_ready(&webview, eval::NAVIGATION_TIMEOUT) {
                Ok(()) => run_step(&app_handle, &mut logs, &webview, step),
                Err(error) => Err(error),
            }
        } else {
            run_step(&app_handle, &mut logs, &webview, step)
        };

        match step_result {
            Ok(value) => {
                let duration = format_duration(started_at);
                let detail =
                    json_field_text(&value, "detail").unwrap_or_else(|| "执行通过".to_string());
                emit_step_result(
                    &app_handle,
                    &mut results,
                    StepResult {
                        step: step.step,
                        status: "passed".to_string(),
                        duration: duration.clone(),
                        detail: detail.clone(),
                    },
                )?;
                emit_log(
                    &app_handle,
                    &mut logs,
                    "SUCCESS",
                    format!("步骤 {} 执行通过 (耗时: {})", step.step, duration),
                )?;
                emit_debug_log(
                    &app_handle,
                    &mut logs,
                    format!(
                        "步骤 {} 成功详情: {}，页面快照: {}",
                        step.step,
                        step_value_summary(&value),
                        page_snapshot(&webview, step_locators(step))
                    ),
                )?;
            }
            Err(error) => {
                let duration = format_duration(started_at);
                emit_debug_log(
                    &app_handle,
                    &mut logs,
                    format!(
                        "步骤 {} 失败详情: error={}，页面快照: {}",
                        step.step,
                        error,
                        page_snapshot(&webview, step_locators(step))
                    ),
                )?;
                emit_step_result(
                    &app_handle,
                    &mut results,
                    StepResult {
                        step: step.step,
                        status: "failed".to_string(),
                        duration,
                        detail: error.clone(),
                    },
                )?;
                emit_log(
                    &app_handle,
                    &mut logs,
                    "ERROR",
                    format!("步骤 {} 执行失败: {}", step.step, error),
                )?;
                break;
            }
        }
    }

    let success = results.len() == request.steps.len()
        && results.iter().all(|result| result.status == "passed");
    emit_log(
        &app_handle,
        &mut logs,
        if success { "SUCCESS" } else { "ERROR" },
        if success {
            "PC Web 测试执行完成"
        } else {
            "PC Web 测试执行失败"
        },
    )?;

    let result = PcWebRunResult {
        success,
        error: if success {
            None
        } else {
            Some(
                results
                    .iter()
                    .find(|result| result.status == "failed")
                    .map(|result| result.detail.clone())
                    .unwrap_or_else(|| "测试执行失败".to_string()),
            )
        },
        steps: results,
        logs,
        screenshot: None,
    };
    emit_event(&app_handle, "result", json!(result))?;

    Ok(result)
}
