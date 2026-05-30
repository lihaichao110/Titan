use serde::{Deserialize, Serialize};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};

const PC_BROWSER_LABEL: &str = "pc-browser-preview";
const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub zoom: f64,
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

fn bounds_position(bounds: BrowserBounds) -> LogicalPosition<f64> {
    LogicalPosition::new(bounds.x.max(0.0), bounds.y.max(0.0))
}

fn bounds_size(bounds: BrowserBounds) -> LogicalSize<f64> {
    LogicalSize::new(bounds.width.max(1.0), bounds.height.max(1.0))
}

fn bounds_zoom(bounds: BrowserBounds) -> f64 {
    bounds.zoom.max(0.2)
}

#[tauri::command]
pub async fn create_pc_browser(
    app_handle: AppHandle,
    url: String,
    bounds: BrowserBounds,
) -> Result<(), String> {
    let target_url = normalize_url(&url)?;

    if let Some(webview) = app_handle.get_webview(PC_BROWSER_LABEL) {
        webview
            .navigate(target_url)
            .map_err(|e| format!("PC 浏览器跳转失败: {}", e))?;
        webview
            .set_bounds(tauri::Rect {
                position: bounds_position(bounds).into(),
                size: bounds_size(bounds).into(),
            })
            .map_err(|e| format!("PC 浏览器调整位置失败: {}", e))?;
        webview
            .set_zoom(bounds_zoom(bounds))
            .map_err(|e| format!("PC 浏览器缩放失败: {}", e))?;
        webview
            .show()
            .map_err(|e| format!("PC 浏览器显示失败: {}", e))?;
        return Ok(());
    }

    let window = app_handle
        .get_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "找不到主窗口".to_string())?;
    let webview_builder = WebviewBuilder::new(PC_BROWSER_LABEL, WebviewUrl::External(target_url));

    let webview = window
        .add_child(
            webview_builder,
            bounds_position(bounds),
            bounds_size(bounds),
        )
        .map_err(|e| format!("PC 浏览器创建失败: {}", e))?;
    webview
        .set_zoom(bounds_zoom(bounds))
        .map_err(|e| format!("PC 浏览器缩放失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn navigate_pc_browser(app_handle: AppHandle, url: String) -> Result<(), String> {
    let target_url = normalize_url(&url)?;
    let webview = app_handle
        .get_webview(PC_BROWSER_LABEL)
        .ok_or_else(|| "PC 浏览器尚未创建".to_string())?;

    webview
        .navigate(target_url)
        .map_err(|e| format!("PC 浏览器跳转失败: {}", e))
}

#[tauri::command]
pub async fn set_pc_browser_bounds(
    app_handle: AppHandle,
    bounds: BrowserBounds,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(PC_BROWSER_LABEL) {
        webview
            .set_bounds(tauri::Rect {
                position: bounds_position(bounds).into(),
                size: bounds_size(bounds).into(),
            })
            .map_err(|e| format!("PC 浏览器调整位置失败: {}", e))?;
        webview
            .set_zoom(bounds_zoom(bounds))
            .map_err(|e| format!("PC 浏览器缩放失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn show_pc_browser(app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(PC_BROWSER_LABEL) {
        webview
            .show()
            .map_err(|e| format!("PC 浏览器显示失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn hide_pc_browser(app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(PC_BROWSER_LABEL) {
        webview
            .hide()
            .map_err(|e| format!("PC 浏览器隐藏失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn close_pc_browser(app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(PC_BROWSER_LABEL) {
        webview
            .close()
            .map_err(|e| format!("PC 浏览器关闭失败: {}", e))?;
    }

    Ok(())
}
