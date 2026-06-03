use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, Webview, Wry};

const PC_BROWSER_LABEL: &str = "pc-browser-preview";
const STEP_TIMEOUT: Duration = Duration::from_secs(20);
const NAVIGATION_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcWebTestRequest {
    pub url: String,
    pub steps: Vec<PcWebStep>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcWebStep {
    pub step: u32,
    pub name: String,
    pub kind: String,
    pub action: String,
    pub locators: Option<Vec<PcWebLocator>>,
    pub value: Option<String>,
    pub timeout_ms: Option<u64>,
    pub instruction: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcWebLocator {
    pub r#type: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepResult {
    pub step: u32,
    pub status: String,
    pub duration: String,
    pub detail: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcWebLogEntry {
    pub time: String,
    pub level: String,
    pub msg: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcWebRunResult {
    pub success: bool,
    pub steps: Vec<StepResult>,
    pub logs: Vec<PcWebLogEntry>,
    pub screenshot: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PcWebRunnerEvent {
    event: String,
    payload: Value,
}

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

fn format_duration(started_at: Instant) -> String {
    format!("00:00:{:02}", started_at.elapsed().as_secs().min(99))
}

fn normalize_url(value: &str) -> Result<tauri::Url, String> {
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

fn emit_event(app_handle: &AppHandle, event: &str, payload: Value) -> Result<(), String> {
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

fn emit_log(
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

fn emit_step(app_handle: &AppHandle, payload: Value) -> Result<(), String> {
    emit_event(app_handle, "step", payload)
}

fn emit_step_result(
    app_handle: &AppHandle,
    results: &mut Vec<StepResult>,
    result: StepResult,
) -> Result<(), String> {
    emit_step(app_handle, json!(result))?;
    results.push(result);
    Ok(())
}

fn eval_json(webview: &Webview<Wry>, js: String, timeout: Duration) -> Result<Value, String> {
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

fn ok_value(value: &Value) -> bool {
    if value.get("ok").and_then(Value::as_bool).unwrap_or(false) {
        return true;
    }

    false
}

fn error_value(value: &Value) -> Option<String> {
    value
        .get("error")
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

fn ensure_ok(value: Value, fallback: &str) -> Result<(), String> {
    if ok_value(&value) {
        return Ok(());
    }

    Err(error_value(&value).unwrap_or_else(|| fallback.to_string()))
}

fn wait_for_current_page_ready(webview: &Webview<Wry>, timeout: Duration) -> Result<(), String> {
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

fn step_timeout(step: &PcWebStep) -> Duration {
    step.timeout_ms
        .map(Duration::from_millis)
        .unwrap_or(STEP_TIMEOUT)
}

fn step_locators(step: &PcWebStep) -> &[PcWebLocator] {
    step.locators.as_deref().unwrap_or(&[])
}

fn page_diagnostics_script(locators: &[PcWebLocator]) -> Result<String, String> {
    let locators_json = serde_json::to_string(locators).map_err(|e| e.to_string())?;
    // 运行态 DOM 诊断保留候选定位器，方便直接排查前端数据配置是否命中页面。
    Ok(r##"
    (() => {
      const locators = __LOCATORS__;
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const inputs = Array.from(document.querySelectorAll("input,textarea,select")).map((input) => ({
        type: input.type || "",
        className: input.className || "",
        id: input.id || "",
        name: input.name || "",
        placeholder: input.placeholder || "",
        visible: visible(input),
        valueLength: input.value?.length || 0
      }));
      const buttons = Array.from(document.querySelectorAll("button,[role='button'],a")).map((button) => ({
        type: button.type || "",
        className: button.className || "",
        text: (button.innerText || button.textContent || "").trim(),
        visible: visible(button)
      }));
      return {
        url: location.href,
        title: document.title,
        bodyText: (document.body?.innerText || "").slice(0, 500),
        locators: JSON.stringify(locators),
        textInputCount: document.querySelectorAll("input[type='text'], input:not([type]), textarea").length,
        passwordInputCount: document.querySelectorAll("input[type='password']").length,
        inputs: JSON.stringify(inputs),
        buttons: JSON.stringify(buttons)
      };
    })()
    "##
    .replace("__LOCATORS__", &locators_json))
}

fn page_error(webview: &Webview<Wry>, message: &str, locators: &[PcWebLocator]) -> String {
    match page_diagnostics_script(locators)
        .and_then(|script| eval_json(webview, script, Duration::from_secs(2)))
    {
        Ok(value) => format!(
            "{}。当前 URL: {}，标题: {}，页面文本: {}，候选定位器: {}，文本输入框: {}，密码输入框: {}，输入框: {}，按钮: {}",
            message,
            value.get("url").and_then(Value::as_str).unwrap_or("未知"),
            value.get("title").and_then(Value::as_str).unwrap_or("未知"),
            value.get("bodyText").and_then(Value::as_str).unwrap_or(""),
            value.get("locators").and_then(Value::as_str).unwrap_or("[]"),
            value
                .get("textInputCount")
                .and_then(Value::as_u64)
                .unwrap_or(0),
            value
                .get("passwordInputCount")
                .and_then(Value::as_u64)
                .unwrap_or(0),
            value.get("inputs").and_then(Value::as_str).unwrap_or("[]"),
            value.get("buttons").and_then(Value::as_str).unwrap_or("[]")
        ),
        Err(_) => message.to_string(),
    }
}

fn step_script(step: &PcWebStep) -> Result<String, String> {
    let step_json = serde_json::to_string(step).map_err(|e| e.to_string())?;
    // 通用执行器只理解结构化 action/locator 数据，instruction 只保留给前端展示。
    Ok(r##"
    (() => {
      const step = __STEP__;
      const locators = step.locators || [];
      const expectedValue = step.value ?? "";

      const visible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };

      const textOf = (element) => element?.innerText || element?.textContent || element?.value || "";
      const describe = (element) => {
        if (!element) return "";
        const id = element.id ? `#${element.id}` : "";
        const name = element.name ? `[name="${element.name}"]` : "";
        const placeholder = element.placeholder ? `[placeholder="${element.placeholder}"]` : "";
        return `${element.tagName.toLowerCase()}${id}${name}${placeholder}`;
      };

      const byCss = (value) => {
        try {
          return Array.from(document.querySelectorAll(value));
        } catch {
          return [];
        }
      };
      const byText = (value) => {
        const interactive = Array.from(document.querySelectorAll("button,a,[role='button'],label"));
        const fallback = Array.from(document.querySelectorAll("span,div,p,h1,h2,h3,h4,h5,h6"));
        return [...interactive, ...fallback].filter((element) => textOf(element).includes(value));
      };
      const byPlaceholder = (value) => Array.from(document.querySelectorAll("input,textarea"))
        .filter((element) => (element.placeholder || "").includes(value));
      const byName = (value) => Array.from(document.querySelectorAll("input,textarea,select,button"))
        .filter((element) => element.name === value);

      const findElement = () => {
        for (const locator of locators) {
          const value = locator.value || "";
          const candidates =
            locator.type === "css" ? byCss(value) :
            locator.type === "text" ? byText(value) :
            locator.type === "placeholder" ? byPlaceholder(value) :
            locator.type === "name" ? byName(value) :
            [];
          const element = candidates.find(visible);
          if (element) return { element, locator };
        }
        return { element: null, locator: null };
      };

      // 受控表单要走原生 value setter，避免 React/AntD 状态没有同步。
      const nativeValueDescriptor = (element) => {
        const tagName = element.tagName?.toLowerCase();
        if (tagName === "textarea") {
          return Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        }
        if (tagName === "select") {
          return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
        }
        return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
          || Object.getOwnPropertyDescriptor(element.constructor.prototype, "value");
      };

      const setValue = (element, value) => {
        const descriptor = nativeValueDescriptor(element);
        element.focus?.();
        if (descriptor?.set) {
          descriptor.set.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.blur?.();
      };

      const verifyValue = (element, value) => {
        const currentValue = element.value ?? "";
        return {
          ok: currentValue === value,
          currentValue,
          currentLength: String(currentValue).length,
          expectedLength: String(value).length,
        };
      };

      const action = step.action;
      if (action === "waitForUrl") {
        return {
          ok: location.href.includes(expectedValue),
          error: `当前 URL 未包含期望内容: ${expectedValue}`
        };
      }

      if (action === "assertText" && locators.length === 0) {
        return {
          ok: (document.body?.innerText || "").includes(expectedValue),
          error: `页面未包含期望文本: ${expectedValue}`
        };
      }

      const { element } = findElement();
      if (!element) return { ok: false, error: "候选定位器未命中可见元素" };

      if (action === "assertVisible" || action === "waitForVisible") {
        return { ok: true, detail: `命中元素: ${describe(element)}` };
      }
      if (action === "assertText") {
        return {
          ok: textOf(element).includes(expectedValue),
          error: `元素文本未包含期望内容: ${expectedValue}`,
          detail: `命中元素: ${describe(element)}`
        };
      }
      if (action === "fill") {
        setValue(element, expectedValue);
        const verification = verifyValue(element, expectedValue);
        return {
          ok: verification.ok,
          error: `输入后值校验失败: 当前长度 ${verification.currentLength}，期望长度 ${verification.expectedLength}`,
          detail: verification.ok
            ? `已输入并校验元素值: ${describe(element)}`
            : `已定位但输入未生效: ${describe(element)}`
        };
      }
      if (action === "clear") {
        setValue(element, "");
        const verification = verifyValue(element, "");
        return {
          ok: verification.ok,
          error: `清空后值校验失败: 当前长度 ${verification.currentLength}`,
          detail: verification.ok ? `已清空元素: ${describe(element)}` : `已定位但清空未生效: ${describe(element)}`
        };
      }
      if (action === "click") {
        element.click();
        return { ok: true, detail: `已点击元素，后续步骤继续等待页面结果: ${describe(element)}` };
      }
      if (action === "select") {
        setValue(element, expectedValue);
        return { ok: true, detail: `已选择元素: ${describe(element)}` };
      }

      return { ok: false, error: `不支持的 PC Web 动作: ${action}` };
    })()
    "##
    .replace("__STEP__", &step_json))
}

fn run_step(webview: &Webview<Wry>, step: &PcWebStep) -> Result<(), String> {
    let deadline = Instant::now() + step_timeout(step);
    let locators = step_locators(step);
    let script = step_script(step)?;
    let mut last_error = format!("步骤执行失败: {}", step.instruction);

    while Instant::now() < deadline {
        let value = eval_json(webview, script.clone(), Duration::from_secs(2))?;
        if ok_value(&value) {
            return ensure_ok(value, "步骤执行失败");
        }
        if let Some(error) = error_value(&value) {
            last_error = error;
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    Err(page_error(webview, &last_error, locators))
}

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

    for (index, step) in request.steps.iter().enumerate() {
        let started_at = Instant::now();
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

        let step_result = if index == 0 {
            wait_for_current_page_ready(&webview, NAVIGATION_TIMEOUT)
                .and_then(|_| run_step(&webview, step))
        } else {
            run_step(&webview, step)
        };

        match step_result {
            Ok(()) => {
                let duration = format_duration(started_at);
                emit_step_result(
                    &app_handle,
                    &mut results,
                    StepResult {
                        step: step.step,
                        status: "passed".to_string(),
                        duration: duration.clone(),
                        detail: "执行通过".to_string(),
                    },
                )?;
                emit_log(
                    &app_handle,
                    &mut logs,
                    "SUCCESS",
                    format!("步骤 {} 执行通过 (耗时: {})", step.step, duration),
                )?;
            }
            Err(error) => {
                let duration = format_duration(started_at);
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
