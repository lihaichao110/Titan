use std::time::Duration;

use serde_json::Value;
use tauri::{Webview, Wry};

use super::eval::{compact_json, eval_json};
use super::types::PcWebLocator;

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

pub(crate) fn page_error(
    webview: &Webview<Wry>,
    message: &str,
    locators: &[PcWebLocator],
) -> String {
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

pub(crate) fn page_snapshot(webview: &Webview<Wry>, locators: &[PcWebLocator]) -> String {
    match page_diagnostics_script(locators)
        .and_then(|script| eval_json(webview, script, Duration::from_secs(2)))
    {
        Ok(value) => compact_json(&value, 1200),
        Err(error) => format!("获取页面快照失败: {}", error),
    }
}
