use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, Webview, Wry};

const PC_BROWSER_LABEL: &str = "pc-browser-preview";
const STEP_TIMEOUT: Duration = Duration::from_secs(20);
const NAVIGATION_TIMEOUT: Duration = Duration::from_secs(60);
const STEP_POLL_INTERVAL: Duration = Duration::from_millis(80);

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

fn emit_debug_log(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    msg: impl Into<String>,
) -> Result<(), String> {
    let msg = msg.into();
    log::debug!("{}", msg);
    emit_log(app_handle, logs, "INFO", format!("[调试] {}", msg))
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

fn truncate_text(value: &str, max_chars: usize) -> String {
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

fn json_field_text(value: &Value, key: &str) -> Option<String> {
    value.get(key).map(|field| {
        field
            .as_str()
            .map(ToString::to_string)
            .unwrap_or_else(|| field.to_string())
    })
}

fn compact_json(value: &Value, max_chars: usize) -> String {
    truncate_text(&value.to_string(), max_chars)
}

fn step_value_summary(value: &Value) -> String {
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
        value: (input.value || "").slice(0, 80),
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
        readyState: document.readyState,
        activeElement: document.activeElement
          ? `${document.activeElement.tagName.toLowerCase()}#${document.activeElement.id || ""}.${document.activeElement.className || ""}`.slice(0, 160)
          : "",
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
            "{}。当前 URL: {}，标题: {}，readyState: {}，activeElement: {}，页面文本: {}，候选定位器: {}，文本输入框: {}，密码输入框: {}，输入框: {}，按钮: {}",
            message,
            value.get("url").and_then(Value::as_str).unwrap_or("未知"),
            value.get("title").and_then(Value::as_str).unwrap_or("未知"),
            value
                .get("readyState")
                .and_then(Value::as_str)
                .unwrap_or("未知"),
            value
                .get("activeElement")
                .and_then(Value::as_str)
                .unwrap_or(""),
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

fn page_snapshot(webview: &Webview<Wry>, locators: &[PcWebLocator]) -> String {
    match page_diagnostics_script(locators)
        .and_then(|script| eval_json(webview, script, Duration::from_secs(2)))
    {
        Ok(value) => compact_json(&value, 1200),
        Err(error) => format!("获取页面快照失败: {}", error),
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
      const locatorText = (locator) => locator ? `${locator.type}:${locator.value}` : "";
      const activeElementText = () => describe(document.activeElement);
      const valueSnippet = (element) => String(element?.value ?? "").slice(0, 80);
      const pushInputDebug = (message) => {
        window.__titanInputDebug = [
          ...(Array.isArray(window.__titanInputDebug) ? window.__titanInputDebug : []),
          message,
        ].slice(-12);
      };
      const inputDebugText = () => Array.isArray(window.__titanInputDebug)
        ? window.__titanInputDebug.join(" | ")
        : "";

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
          const visibleCandidates = candidates.filter(visible);
          const element = visibleCandidates[0];
          if (element) {
            return {
              element,
              locator,
              visibleCandidateCount: visibleCandidates.length,
              totalCandidateCount: candidates.length
            };
          }
        }
        return { element: null, locator: null, visibleCandidateCount: 0, totalCandidateCount: 0 };
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

      const setRawValue = (element, value) => {
        const descriptor = nativeValueDescriptor(element);
        if (descriptor?.set) {
          descriptor.set.call(element, value);
        } else {
          element.value = value;
        }
      };

      const dispatchInput = (element, data = null) => {
        try {
          element.dispatchEvent(new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: data === null ? "deleteContentBackward" : "insertText",
            data,
          }));
          element.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: data === null ? "deleteContentBackward" : "insertText",
            data,
          }));
        } catch {
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      const dispatchKeyboard = (element, type, key) => {
        element.dispatchEvent(new KeyboardEvent(type, {
          key,
          code: key === "Enter" ? "Enter" : undefined,
          keyCode: key === "Enter" ? 13 : undefined,
          which: key === "Enter" ? 13 : undefined,
          bubbles: true,
          cancelable: true,
        }));
      };

      const dispatchComposition = (element, type, data) => {
        try {
          element.dispatchEvent(new CompositionEvent(type, {
            bubbles: true,
            cancelable: true,
            data,
          }));
        } catch {
          element.dispatchEvent(new Event(type, { bubbles: true }));
        }
      };

      const dispatchMouse = (element, type) => {
        element.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      };

      const dispatchPointer = (element, type) => {
        if (typeof PointerEvent === "function") {
          element.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "mouse",
            isPrimary: true,
          }));
        }
      };

      const focusForInput = (element) => {
        dispatchPointer(element, "pointerdown");
        dispatchMouse(element, "mousedown");
        dispatchPointer(element, "pointerup");
        dispatchMouse(element, "mouseup");
        element.click?.();
        element.focus?.();
      };

      const setValue = (element, value) => {
        element.focus?.();
        setRawValue(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.blur?.();
      };

      const clearInputValue = (element) => {
        focusForInput(element);
        const currentValue = String(element.value ?? "");
        element.setSelectionRange?.(0, currentValue.length);
        dispatchKeyboard(element, "keydown", "Backspace");
        const canExecDelete = typeof document.execCommand === "function";
        const deletedByBrowser = canExecDelete && document.execCommand("delete", false);
        if (!deletedByBrowser || String(element.value ?? "").length > 0) {
          setRawValue(element, "");
          dispatchInput(element, null);
        }
        dispatchKeyboard(element, "keyup", "Backspace");
        pushInputDebug(`clear before=${currentValue.length} execDelete=${Boolean(deletedByBrowser)} after=${String(element.value ?? "").length}`);
      };

      const writeInputValue = (element, value) => {
        const nextValue = String(value);
        focusForInput(element);
        element.setSelectionRange?.(0, String(element.value ?? "").length);
        dispatchComposition(element, "compositionstart", "");
        dispatchKeyboard(element, "keydown", nextValue);
        dispatchKeyboard(element, "keypress", nextValue);

        // 优先使用浏览器原生编辑命令，让站点收到更接近真实键盘输入的事件链。
        const canExecInsert = typeof document.execCommand === "function";
        const insertedByBrowser = canExecInsert && document.execCommand("insertText", false, nextValue);
        const afterNativeInsert = String(element.value ?? "");
        if (!insertedByBrowser || String(element.value ?? "") !== nextValue) {
          setRawValue(element, nextValue);
          dispatchInput(element, nextValue);
        }

        dispatchKeyboard(element, "keyup", nextValue);
        dispatchComposition(element, "compositionend", nextValue);
        element.dispatchEvent(new Event("change", { bubbles: true }));
        pushInputDebug(`write expected=${nextValue} execInsert=${Boolean(insertedByBrowser)} afterNative=${afterNativeInsert} final=${String(element.value ?? "")}`);
      };

      const resetTypingState = () => {
        window.__titanTypingState = null;
      };

      const fillAndVerifyValue = (element, value) => {
        const nextValue = String(value);
        const signature = `${step.step}:${step.action}:${nextValue}:${describe(element)}`;
        const state = window.__titanTypingState;

        if (
          !state ||
          state.signature !== signature ||
          state.element !== element ||
          !state.element?.isConnected
        ) {
          clearInputValue(element);
          writeInputValue(element, nextValue);
          window.__titanLastFillValue = nextValue;
          window.__titanTypingState = {
            signature,
            element,
            attempts: 1,
            stableCount: 0,
          };
        }

        const currentState = window.__titanTypingState;
        const verification = verifyValue(element, nextValue);
        if (!verification.ok && currentState.attempts < 3) {
          currentState.attempts += 1;
          clearInputValue(element);
          writeInputValue(element, nextValue);
          window.__titanLastFillValue = nextValue;
          return {
            ...verifyValue(element, nextValue),
            typing: true,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        if (!verification.ok) {
          resetTypingState();
          return {
            ok: false,
            currentValue: verification.currentValue,
            currentLength: verification.currentLength,
            expectedLength: verification.expectedLength,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        currentState.stableCount += 1;
        if (currentState.stableCount >= 2) {
          resetTypingState();
          return {
            ...verification,
            attempts: currentState.attempts,
            stableCount: currentState.stableCount,
          };
        }

        return {
          ...verification,
          ok: false,
          typing: true,
          attempts: currentState.attempts,
          stableCount: currentState.stableCount,
        };
      };

      const triggerActionOnce = (signature, trigger) => {
        const state = window.__titanActionState;
        if (!state || state.signature !== signature) {
          trigger();
          window.__titanActionState = { signature, triggered: true };
        }
      };

      const resetActionState = () => {
        window.__titanActionState = null;
      };

      const actionUrlResult = ({ beforeUrl, elementText, matchedLocator, element, visibleCandidateCount, actionDetail, expectedUrlPart }) => {
        const afterUrl = location.href;
        const urlMatched = expectedUrlPart ? matchesExpectedUrl(afterUrl, expectedUrlPart) : true;
        if (urlMatched) {
          resetActionState();
        }

        return {
          ok: urlMatched,
          error: expectedUrlPart
            ? `搜索未触发，当前 URL 未包含期望内容: ${expectedUrlPart}`
            : "动作事件已派发",
          detail: urlMatched
            ? actionDetail
            : `已派发动作但页面结果未生效: ${elementText}`,
          beforeUrl,
          afterUrl,
          expectedUrlPart,
          matchedLocator,
          element: elementText,
          visibleCandidateCount,
          activeElement: activeElementText(),
          currentValue: valueSnippet(element),
          inputDebug: inputDebugText(),
          searchFallbackUrl: window.__titanSearchFallbackUrl || "",
        };
      };

      const qqMusicSearchFallbackUrl = () => {
        if (!location.hostname.endsWith("y.qq.com")) return "";
        const keyword = qqMusicSearchKeyword();
        if (!keyword) return "";
        // 旧版首页在 WebKit 内嵌环境里经常不响应搜索按钮，直接兜底到现代搜索结果页。
        return `https://y.qq.com/n/ryqq/search?w=${encodeURIComponent(keyword)}&t=song`;
      };

      const qqMusicSearchKeyword = () => String(
        document.querySelector(".search_input__input[type='text']")?.value
          || window.__titanLastFillValue
          || ""
      ).trim();

      const isQqMusicSearchResultPage = () => {
        if (!location.hostname.endsWith("y.qq.com")) return false;
        return /(^|\/)search(\.html)?$/i.test(location.pathname)
          || location.pathname.includes("/search");
      };

      const hasQqMusicSearchResultSignal = () => {
        if (!location.hostname.endsWith("y.qq.com")) return false;
        const keyword = qqMusicSearchKeyword();
        const bodyText = document.body?.innerText || "";
        return Boolean(document.querySelector(".mod_songlist, .songlist__list, .songlist__item"))
          || (keyword.length > 0 && bodyText.includes(keyword) && bodyText.includes("歌曲"));
      };

      const matchesExpectedUrl = (href, expectedPart) => {
        if (location.hostname.endsWith("y.qq.com") && expectedPart === "/search") {
          return isQqMusicSearchResultPage() && hasQqMusicSearchResultSignal();
        }
        return href.includes(expectedPart);
      };

      const ensureQqMusicSearchInputValue = () => {
        if (!location.hostname.endsWith("y.qq.com")) return true;
        const input = document.querySelector(".search_input__input[type='text']");
        const keyword = qqMusicSearchKeyword();
        if (!input || !keyword) return true;
        if (String(input.value ?? "") === keyword) return true;
        writeInputValue(input, keyword);
        pushInputDebug(`qq-search-refill keyword=${keyword} final=${String(input.value ?? "")}`);
        return String(input.value ?? "") === keyword;
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
        const currentUrl = location.href;
        return {
          ok: matchesExpectedUrl(currentUrl, expectedValue),
          error: `当前 URL 未包含期望内容: ${expectedValue}`,
          currentUrl,
          expectedUrlPart: expectedValue,
          detail: `当前 URL: ${currentUrl}`
        };
      }

      if (action === "assertText" && locators.length === 0) {
        return {
          ok: (document.body?.innerText || "").includes(expectedValue),
          error: `页面未包含期望文本: ${expectedValue}`
        };
      }

      const { element, locator, visibleCandidateCount, totalCandidateCount } = findElement();
      if (!element) {
        return {
          ok: false,
          error: "候选定位器未命中可见元素",
          currentUrl: location.href,
          visibleCandidateCount,
          totalCandidateCount
        };
      }
      const matchedLocator = locatorText(locator);
      const elementText = describe(element);

      if (action === "assertVisible" || action === "waitForVisible") {
        return {
          ok: true,
          detail: `命中元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "assertText") {
        return {
          ok: textOf(element).includes(expectedValue),
          error: `元素文本未包含期望内容: ${expectedValue}`,
          detail: `命中元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "fill") {
        if (!("value" in step) || expectedValue.length === 0) {
          resetTypingState();
          return {
            ok: false,
            error: "fill 动作缺少输入值，请在步骤 value 中配置要输入的内容",
            currentUrl: location.href,
            expectedLength: expectedValue.length
          };
        }
        const beforeValue = String(element.value ?? "");
        const verification = fillAndVerifyValue(element, expectedValue);
        return {
          ok: verification.ok,
          error: verification.typing
            ? `正在确认输入框内容: 当前长度 ${verification.currentLength}，期望长度 ${verification.expectedLength}`
            : `输入后值校验失败: 当前长度 ${verification.currentLength}，期望长度 ${verification.expectedLength}`,
          detail: verification.ok
            ? `已输入并校验元素值: ${elementText}`
            : `已定位但输入未生效: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount,
          beforeLength: beforeValue.length,
          currentValue: valueSnippet(element),
          currentLength: verification.currentLength,
          expectedLength: verification.expectedLength,
          attempts: verification.attempts,
          stableCount: verification.stableCount,
          inputDebug: inputDebugText()
        };
      }
      if (action === "clear") {
        setValue(element, "");
        const verification = verifyValue(element, "");
        return {
          ok: verification.ok,
          error: `清空后值校验失败: 当前长度 ${verification.currentLength}`,
          detail: verification.ok ? `已清空元素: ${elementText}` : `已定位但清空未生效: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }
      if (action === "click") {
        const beforeUrl = location.href;
        const isQqMusicSearchButton = location.hostname.endsWith("y.qq.com")
          && (element.matches?.(".search_input__btn") || elementText.includes("button"));
        const mayBeQqMusicPlayAction = location.hostname.endsWith("y.qq.com")
          && locators.some((locator) => String(locator.value || "").includes("songlist__item"));
        if (mayBeQqMusicPlayAction && !isQqMusicSearchResultPage()) {
          return {
            ok: false,
            error: "当前仍在 QQ 音乐首页，禁止点击首页播放按钮，等待搜索结果页",
            currentUrl: location.href,
            matchedLocator,
            element: elementText,
            visibleCandidateCount,
            inputDebug: inputDebugText()
          };
        }
        const expectedUrlPart = expectedValue || (isQqMusicSearchButton ? "/search" : "");
        const signature = `${step.step}:${step.action}:${expectedUrlPart}:${elementText}:${beforeUrl}`;
        // 配置了 value 时，动作步骤必须等到 URL 命中期望值才算通过。
        triggerActionOnce(signature, () => {
          if (isQqMusicSearchButton) {
            ensureQqMusicSearchInputValue();
          }
          element.focus?.();
          dispatchPointer(element, "pointerdown");
          dispatchMouse(element, "mousedown");
          dispatchPointer(element, "pointerup");
          dispatchMouse(element, "mouseup");
          element.click();
          const fallbackUrl = expectedUrlPart.includes("/search") ? qqMusicSearchFallbackUrl() : "";
          if (fallbackUrl) {
            window.__titanSearchFallbackUrl = fallbackUrl;
            location.href = fallbackUrl;
          }
        });
        return actionUrlResult({
          beforeUrl,
          elementText,
          matchedLocator,
          element,
          visibleCandidateCount,
          expectedUrlPart,
          actionDetail: expectedValue
            ? `已点击元素并等待到页面结果: ${elementText}`
            : `已点击元素，后续步骤继续等待页面结果: ${elementText}`,
        });
      }
      if (action === "pressEnter") {
        const beforeUrl = location.href;
        const expectedUrlPart = expectedValue || (location.hostname.endsWith("y.qq.com") ? "/search" : "");
        const signature = `${step.step}:${step.action}:${expectedUrlPart}:${elementText}:${beforeUrl}`;
        // 回车触发搜索时同样以页面结果为准，避免事件派发成功但业务没有发生。
        triggerActionOnce(signature, () => {
          element.focus?.();
          dispatchKeyboard(element, "keydown", "Enter");
          dispatchKeyboard(element, "keypress", "Enter");
          dispatchKeyboard(element, "keyup", "Enter");
          const fallbackUrl = expectedUrlPart.includes("/search") ? qqMusicSearchFallbackUrl() : "";
          if (fallbackUrl) {
            window.__titanSearchFallbackUrl = fallbackUrl;
            location.href = fallbackUrl;
          }
        });
        return actionUrlResult({
          beforeUrl,
          elementText,
          matchedLocator,
          element,
          visibleCandidateCount,
          expectedUrlPart,
          actionDetail: expectedValue
            ? `已触发回车并等待到页面结果: ${elementText}`
            : `已在元素上触发回车键: ${elementText}`,
        });
      }
      if (action === "select") {
        setValue(element, expectedValue);
        return {
          ok: true,
          detail: `已选择元素: ${elementText}`,
          currentUrl: location.href,
          matchedLocator,
          element: elementText,
          visibleCandidateCount
        };
      }

      return { ok: false, error: `不支持的 PC Web 动作: ${action}` };
    })()
    "##
    .replace("__STEP__", &step_json))
}

fn run_step(
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
            match wait_for_current_page_ready(&webview, NAVIGATION_TIMEOUT) {
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
