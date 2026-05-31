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
    pub instruction: String,
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

fn baidu_check_script(condition: &str) -> String {
    format!(
        r##"
        (() => {{
          const hasCaptcha = () => /安全验证|验证一下|拖动滑块|请完成下方验证/.test(document.body?.innerText || "");
          const findSearchInput = () => {{
            const selectors = ["#kw", "input[name='wd']", "input[aria-label*='搜索']", "input[placeholder*='搜索']"];
            for (const selector of selectors) {{
              for (const element of document.querySelectorAll(selector)) {{
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none") {{
                  return element;
                }}
              }}
            }}
            return null;
          }};
          const hasResults = () => document.querySelectorAll("#content_left .result, #content_left .c-container, #content_left h3 a").length > 0;
          if (hasCaptcha()) return {{ ok: false, error: "百度触发安全验证，无法继续自动执行搜索" }};
          return {{ ok: Boolean({condition}) }};
        }})()
        "##,
    )
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

fn wait_for_baidu_condition(
    webview: &Webview<Wry>,
    condition: &str,
    timeout: Duration,
    fallback: &str,
) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        let value = eval_json(
            webview,
            baidu_check_script(condition),
            Duration::from_secs(2),
        )?;
        if ok_value(&value) {
            return Ok(());
        }
        if let Some(error) = error_value(&value) {
            return Err(error);
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    Err(fallback.to_string())
}

fn wait_for_ready(webview: &Webview<Wry>, timeout: Duration) -> Result<(), String> {
    wait_for_baidu_condition(
        webview,
        "document.readyState === 'interactive' || document.readyState === 'complete'",
        timeout,
        "页面加载超时",
    )
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

fn assert_baidu_home_ready(webview: &Webview<Wry>) -> Result<(), String> {
    wait_for_baidu_condition(
        webview,
        "Boolean(findSearchInput())",
        STEP_TIMEOUT,
        "未找到可见的百度搜索框",
    )
}

fn run_baidu_search(webview: &Webview<Wry>) -> Result<(), String> {
    let value = eval_json(
        webview,
        r##"
        (() => {
          const hasCaptcha = () => /安全验证|验证一下|拖动滑块|请完成下方验证/.test(document.body?.innerText || "");
          const findSearchInput = () => {
            const selectors = ["#kw", "input[name='wd']", "input[aria-label*='搜索']", "input[placeholder*='搜索']"];
            for (const selector of selectors) {
              for (const element of document.querySelectorAll(selector)) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none") {
                  return element;
                }
              }
            }
            return null;
          };
          if (hasCaptcha()) return { ok: false, error: "百度触发安全验证，无法继续自动执行搜索" };
          const input = findSearchInput();
          if (!input) return { ok: false, error: "未找到可见的百度搜索框" };
          input.focus();
          input.value = "今日新闻";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          window.location.href = `/s?wd=${encodeURIComponent("今日新闻")}`;
          return { ok: true };
        })()
        "##
        .to_string(),
        STEP_TIMEOUT,
    )?;
    ensure_ok(value, "提交百度搜索失败")?;
    wait_for_ready(webview, NAVIGATION_TIMEOUT)
}

fn assert_baidu_search_results_ready(webview: &Webview<Wry>) -> Result<(), String> {
    wait_for_baidu_condition(
        webview,
        "Boolean(findSearchInput()) && hasResults() && /baidu\\.com\\/s|wd=/.test(location.href)",
        STEP_TIMEOUT,
        "未找到“今日新闻”相关搜索结果列表",
    )
}

fn open_first_baidu_news_result(webview: &Webview<Wry>) -> Result<(), String> {
    let value = eval_json(
        webview,
        r##"
        (() => {
          const hasCaptcha = () => /安全验证|验证一下|拖动滑块|请完成下方验证/.test(document.body?.innerText || "");
          if (hasCaptcha()) return { ok: false, error: "百度触发安全验证，无法继续自动执行搜索" };
          const link = document.querySelector("#content_left .result h3 a, #content_left .c-container h3 a, #content_left h3 a");
          if (link?.href) {
            link.removeAttribute("target");
            window.location.href = link.href;
            return { ok: true };
          }
          return { ok: false, error: "未找到第一条新闻结果" };
        })()
        "##
        .to_string(),
        STEP_TIMEOUT + Duration::from_secs(2),
    )?;
    ensure_ok(value, "打开第一条新闻失败")?;
    wait_for_ready(webview, NAVIGATION_TIMEOUT)
}

fn intra_page_diagnostics_script() -> &'static str {
    // 运行态 DOM 诊断用于排查 WebView 页面状态，清理代码时不要删除。
    r##"
    (() => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const inputs = Array.from(document.querySelectorAll("input")).map((input) => ({
        type: input.type || "",
        className: input.className || "",
        id: input.id || "",
        name: input.name || "",
        placeholder: input.placeholder || "",
        visible: visible(input),
        valueLength: input.value?.length || 0
      }));
      const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({
        type: button.type || "",
        className: button.className || "",
        text: button.innerText.trim(),
        visible: visible(button)
      }));
      return {
        url: location.href,
        title: document.title,
        bodyText: (document.body?.innerText || "").slice(0, 500),
        textInputCount: document.querySelectorAll("input.ant-input[type='text'], input[placeholder*='用户名'], input[placeholder*='邮箱']").length,
        passwordInputCount: document.querySelectorAll("input[type='password']").length,
        inputs: JSON.stringify(inputs),
        buttons: JSON.stringify(buttons)
      };
    })()
    "##
}

fn intra_error(webview: &Webview<Wry>, message: &str) -> String {
    // 保留完整页面诊断，避免只看到“未找到输入框”而无法定位真实 DOM。
    match eval_json(
        webview,
        intra_page_diagnostics_script().to_string(),
        Duration::from_secs(2),
    ) {
        Ok(value) => format!(
            "{}。当前 URL: {}，标题: {}，页面文本: {}，文本输入框: {}，密码输入框: {}，输入框: {}，按钮: {}",
            message,
            value.get("url").and_then(Value::as_str).unwrap_or("未知"),
            value.get("title").and_then(Value::as_str).unwrap_or("未知"),
            value.get("bodyText").and_then(Value::as_str).unwrap_or(""),
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

fn intra_login_dom_helpers() -> &'static str {
    // CodeVortex 登录页核心定位逻辑，账号/密码/登录按钮选择器不可按重复 JS 清理。
    r##"
          const visible = (element) => {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
          };
          const firstVisible = (selectors) => {
            for (const selector of selectors) {
              for (const element of document.querySelectorAll(selector)) {
                if (visible(element)) return element;
              }
            }
            return null;
          };
          const findUsernameInput = () => firstVisible([
            "input.ant-input[type='text']",
            "input[placeholder*='用户名']",
            "input[placeholder*='邮箱']"
          ]);
          const findPasswordInput = () => firstVisible([
            "input.ant-input[type='password']",
            "input[type='password']",
            "input[placeholder*='密码']"
          ]);
          const findLoginButton = () => firstVisible([
            ".submit-btn",
            "button.submit-btn",
            "button[type='submit']"
          ]);
    "##
}

fn intra_login_match_summary(webview: &Webview<Wry>) -> Result<String, String> {
    let value = eval_json(
        webview,
        r##"
        (() => {
__HELPERS__
          const usernameInput = findUsernameInput();
          const passwordInput = findPasswordInput();
          const describe = (input) => input ? `${input.tagName.toLowerCase()}.${input.className || ""}[type="${input.type || ""}"][placeholder="${input.placeholder || ""}"]` : "未命中";
          return {
            ok: true,
            summary: `账号框: ${describe(usernameInput)}；密码框: ${describe(passwordInput)}`
          };
        })()
        "##
        .replace("__HELPERS__", intra_login_dom_helpers()),
        Duration::from_secs(2),
    )?;

    Ok(value
        .get("summary")
        .and_then(Value::as_str)
        .unwrap_or("账号框/密码框摘要不可用")
        .to_string())
}

fn intra_check_script(condition: &str) -> String {
    format!(
        r##"
        (() => {{
{helpers}
          const hasLoginForm = () => Boolean(document.querySelector(".login-form")) || document.body.innerText.includes("欢迎登录");
          const hasUsernameInput = () => Boolean(findUsernameInput());
          const hasPasswordInput = () => Boolean(findPasswordInput());
          const hasToken = () => Boolean(sessionStorage.getItem("lihaichao_token"));
          const isLoggedIn = () => hasToken() || (!location.pathname.includes("/login") && document.body.innerText.includes("创作平台"));
          return {{ ok: Boolean({condition}) }};
        }})()
        "##,
        helpers = intra_login_dom_helpers(),
        condition = condition,
    )
}

fn wait_for_intra_condition(
    webview: &Webview<Wry>,
    condition: &str,
    timeout: Duration,
    fallback: &str,
) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        let value = eval_json(
            webview,
            intra_check_script(condition),
            Duration::from_secs(2),
        )?;
        if ok_value(&value) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(250));
    }

    Err(intra_error(webview, fallback))
}

fn assert_intra_login_ready(webview: &Webview<Wry>) -> Result<(), String> {
    wait_for_intra_condition(
        webview,
        "hasLoginForm() && hasUsernameInput() && hasPasswordInput()",
        STEP_TIMEOUT,
        "未找到 intra 登录表单",
    )
}

fn set_intra_input_value(webview: &Webview<Wry>, field: &str, value: &str) -> Result<(), String> {
    // AntD 表单可能异步渲染，必须保留等待重试，不能改回一次查找失败即报错。
    let field_json = serde_json::to_string(field).map_err(|e| e.to_string())?;
    let value_json = serde_json::to_string(value).map_err(|e| e.to_string())?;
    let script = r##"
    (() => {
      const field = __FIELD__;
      const nextValue = __VALUE__;
__HELPERS__
      const usernameInput = findUsernameInput();
      const passwordInput = findPasswordInput();
      const input = field === "username" ? usernameInput : passwordInput;
      if (!input) return { ok: false, error: field === "username" ? "未找到用户名输入框" : "未找到密码输入框" };
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      input.focus();
      descriptor?.set?.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    })()
    "##
    .replace("__HELPERS__", intra_login_dom_helpers())
    .replace("__FIELD__", &field_json)
    .replace("__VALUE__", &value_json);

    let deadline = Instant::now() + STEP_TIMEOUT;
    let mut last_error = if field == "username" {
        "未找到用户名输入框".to_string()
    } else {
        "未找到密码输入框".to_string()
    };

    while Instant::now() < deadline {
        let result = eval_json(webview, script.clone(), Duration::from_secs(2))?;
        if ok_value(&result) {
            return Ok(());
        }
        if let Some(error) = error_value(&result) {
            last_error = error;
        }
        std::thread::sleep(Duration::from_millis(200));
    }

    Err(intra_error(
        webview,
        &format!("输入账号密码失败: {}", last_error),
    ))
}

fn assert_intra_credentials_value(webview: &Webview<Wry>) -> Result<(), String> {
    let value = eval_json(
        webview,
        r##"
        (() => {
__HELPERS__
          const usernameInput = findUsernameInput();
          const passwordInput = findPasswordInput();
          if (!usernameInput || !passwordInput) return { ok: false, error: "未找到用户名或密码输入框" };
          return {
            ok: usernameInput.value === "test_user" && passwordInput.value === "test_password",
            error: "账号或密码输入结果不正确"
          };
        })()
        "##
        .replace("__HELPERS__", intra_login_dom_helpers()),
        STEP_TIMEOUT,
    )?;
    ensure_ok(value, &intra_error(webview, "账号密码输入校验失败"))
}

fn fill_intra_credentials(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    webview: &Webview<Wry>,
    step: &PcWebStep,
) -> Result<(), String> {
    // StepListView 第 2 步依赖逐字输入和最终校验来展示真实执行过程。
    emit_step(
        app_handle,
        json!({
            "step": step.step,
            "status": "executing",
            "duration": null,
            "detail": "正在输入账号..."
        }),
    )?;
    emit_log(
        app_handle,
        logs,
        "INFO",
        intra_login_match_summary(webview).unwrap_or_else(|error| format!("登录表单输入框摘要获取失败: {}", error)),
    )?;
    emit_log(app_handle, logs, "INFO", "输入账号: test_user")?;
    let mut username = String::new();
    for character in "test_user".chars() {
        username.push(character);
        set_intra_input_value(webview, "username", &username)?;
        std::thread::sleep(Duration::from_millis(90));
    }

    emit_step(
        app_handle,
        json!({
            "step": step.step,
            "status": "executing",
            "duration": null,
            "detail": "正在输入密码..."
        }),
    )?;
    emit_log(app_handle, logs, "INFO", "输入密码: *************")?;
    let mut password = String::new();
    for character in "test_password".chars() {
        password.push(character);
        set_intra_input_value(webview, "password", &password)?;
        std::thread::sleep(Duration::from_millis(90));
    }

    emit_step(
        app_handle,
        json!({
            "step": step.step,
            "status": "executing",
            "duration": null,
            "detail": "正在校验账号密码输入结果..."
        }),
    )?;
    emit_log(app_handle, logs, "INFO", "校验账号密码输入结果")?;
    assert_intra_credentials_value(webview)?;
    emit_log(app_handle, logs, "SUCCESS", "账号密码输入校验通过")?;
    Ok(())
}

fn submit_intra_login(webview: &Webview<Wry>) -> Result<(), String> {
    let value = eval_json(
        webview,
        r##"
        (() => {
__HELPERS__
          const button = findLoginButton();
          if (!button) return { ok: false, error: "未找到登录按钮" };
          button.click();
          return { ok: true };
        })()
        "##
        .replace("__HELPERS__", intra_login_dom_helpers()),
        STEP_TIMEOUT,
    )?;
    ensure_ok(value, &intra_error(webview, "点击登录按钮失败"))
}

fn assert_intra_logged_in(webview: &Webview<Wry>) -> Result<(), String> {
    wait_for_intra_condition(
        webview,
        "isLoggedIn()",
        STEP_TIMEOUT,
        "登录后未进入后台首页",
    )
}

fn is_baidu_home_assert_step(step: &PcWebStep) -> bool {
    step.kind == "assert"
        && step.instruction.contains("百度首页")
        && step.instruction.contains("搜索框")
}

fn is_baidu_search_step(step: &PcWebStep) -> bool {
    step.kind != "assert"
        && step.instruction.contains("百度搜索框")
        && step.instruction.contains("今日新闻")
}

fn is_baidu_search_result_assert_step(step: &PcWebStep) -> bool {
    step.kind == "assert"
        && step.instruction.contains("搜索结果")
        && step.instruction.contains("今日新闻")
}

fn is_baidu_open_first_news_step(step: &PcWebStep) -> bool {
    step.kind != "assert" && step.instruction.contains("第一条新闻")
}

fn is_intra_login_ready_step(step: &PcWebStep) -> bool {
    step.kind == "assert"
        && step.instruction.contains("CodeVortex 登录页")
        && step.instruction.contains("用户名")
        && step.instruction.contains("密码")
}

fn is_intra_fill_credentials_step(step: &PcWebStep) -> bool {
    step.kind != "assert"
        && step.instruction.contains("test_user")
        && step.instruction.contains("test_password")
}

fn is_intra_submit_login_step(step: &PcWebStep) -> bool {
    step.kind != "assert" && step.instruction.contains("登录按钮")
}

fn is_intra_logged_in_step(step: &PcWebStep) -> bool {
    step.kind == "assert"
        && step.instruction.contains("CodeVortex")
        && step.instruction.contains("后台首页")
}

fn run_step(
    app_handle: &AppHandle,
    logs: &mut Vec<PcWebLogEntry>,
    webview: &Webview<Wry>,
    step: &PcWebStep,
) -> Result<(), String> {
    // 这里的职责拆分对应前端 4 个步骤，清理时不要合并登录页、输入、点击和验证。
    if is_intra_login_ready_step(step) {
        assert_intra_login_ready(webview)?;
        emit_log(app_handle, logs, "SUCCESS", "登录表单已就绪")?;
        Ok(())
    } else if is_intra_fill_credentials_step(step) {
        fill_intra_credentials(app_handle, logs, webview, step)
    } else if is_intra_submit_login_step(step) {
        submit_intra_login(webview)
    } else if is_intra_logged_in_step(step) {
        assert_intra_logged_in(webview)
    } else if is_baidu_home_assert_step(step) {
        assert_baidu_home_ready(webview)
    } else if is_baidu_search_step(step) {
        run_baidu_search(webview)
    } else if is_baidu_search_result_assert_step(step) {
        assert_baidu_search_results_ready(webview)
    } else if is_baidu_open_first_news_step(step) {
        open_first_baidu_news_result(webview)
    } else {
        Err(format!(
            "不支持该 PC Web 步骤，请先实现 WebView 执行逻辑: {}",
            step.instruction
        ))
    }
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
                .and_then(|_| run_step(&app_handle, &mut logs, &webview, step))
        } else {
            run_step(&app_handle, &mut logs, &webview, step)
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
