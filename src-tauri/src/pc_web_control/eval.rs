use std::sync::mpsc;
use std::time::{Duration, Instant};

use serde_json::Value;
use tauri::{Webview, Wry};

pub(crate) const NAVIGATION_TIMEOUT: Duration = Duration::from_secs(60);

pub(crate) fn normalize_url(value: &str) -> Result<tauri::Url, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("目标 URL 不能为空".to_string());
    }

    let with_protocol = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };

    with_protocol
        .parse()
        .map_err(|_| "目标 URL 格式无效".to_string())
}

pub(crate) fn eval_json(
    webview: &Webview<Wry>,
    js: String,
    timeout: Duration,
) -> Result<Value, String> {
    let (tx, rx) = mpsc::channel();
    webview
        .eval_with_callback(js, move |result| {
            let _ = tx.send(result);
        })
        .map_err(|e| format!("PC 浏览器脚本执行失败: {}", e))?;

    let raw = rx
        .recv_timeout(timeout)
        .map_err(|_| "PC 浏览器脚本执行超时".to_string())?;
    serde_json::from_str(&raw).map_err(|e| format!("PC 浏览器脚本结果解析失败: {}", e))
}

pub(crate) fn ok_value(value: &Value) -> bool {
    value.get("ok").and_then(Value::as_bool).unwrap_or(false)
}

pub(crate) fn error_value(value: &Value) -> Option<String> {
    value
        .get("error")
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

pub(crate) fn truncate_text(value: &str, max_chars: usize) -> String {
    let mut output = String::new();
    for (index, ch) in value.chars().enumerate() {
        if index >= max_chars {
            output.push_str("...");
            return output;
        }
        output.push(ch);
    }
    output
}

pub(crate) fn json_field_text(value: &Value, key: &str) -> Option<String> {
    value.get(key).map(|field| {
        field
            .as_str()
            .map(ToString::to_string)
            .unwrap_or_else(|| field.to_string())
    })
}

pub(crate) fn compact_json(value: &Value, max_chars: usize) -> String {
    truncate_text(&value.to_string(), max_chars)
}

pub(crate) fn wait_for_current_page_ready(
    webview: &Webview<Wry>,
    timeout: Duration,
) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    let mut last_error = "页面仍在加载，无法执行脚本".to_string();

    while Instant::now() < deadline {
        match eval_json(
            webview,
            r##"
            (() => ({
              ok: document.readyState === "interactive" || document.readyState === "complete",
              readyState: document.readyState
            }))()
            "##
            .to_string(),
            Duration::from_secs(2),
        ) {
            Ok(value) if ok_value(&value) => return Ok(()),
            Ok(value) => {
                let ready_state = value
                    .get("readyState")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown");
                last_error = format!("页面仍在加载，当前 readyState: {}", ready_state);
            }
            Err(error) if error.contains("PC 浏览器脚本执行超时") => {
                last_error = "页面仍在加载，无法执行脚本".to_string();
            }
            Err(error) => return Err(error),
        }

        std::thread::sleep(Duration::from_millis(250));
    }

    Err(last_error)
}
