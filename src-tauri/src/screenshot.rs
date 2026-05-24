use std::process::Command;
use std::path::PathBuf;
use log::{info, warn, error};

use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub udid: String,
    pub name: String,
}

/// 查找 pymobiledevice3 的可执行路径
/// 按优先级尝试: 直接命令、pyenv shims、PATH 搜索
fn find_pymobiledevice3() -> Option<String> {
    info!("Starting find_pymobiledevice3 search...");

    // 1. 直接尝试 pymobiledevice3 命令（假设 PATH 已正确配置）
    info!("Trying direct 'pymobiledevice3' command...");
    if let Ok(output) = Command::new("pymobiledevice3").arg("--help").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        info!("  result: success={}, stdout contains pymobiledevice3: {}", output.status.success(), stdout.contains("pymobiledevice3") || stderr.contains("pymobiledevice3"));
        if output.status.success() || stderr.contains("pymobiledevice3") {
            return Some("pymobiledevice3".to_string());
        }
    }

    // 2. 尝试 pyenv shims (推荐，因为 pymobiledevice3 安装在 pyenv 环境中)
    if let Ok(home) = std::env::var("HOME") {
        let pyenv_shim = PathBuf::from(&home).join(".pyenv/shims/pymobiledevice3");
        info!("Trying pyenv shim at: {}", pyenv_shim.display());
        if pyenv_shim.exists() {
            let mut cmd = Command::new(&pyenv_shim);
            cmd.env("HOME", &home);
            if let Ok(output) = cmd.arg("--help").output() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                info!("  result: success={}, stderr contains pymobiledevice3: {}", output.status.success(), stderr.contains("pymobiledevice3"));
                if output.status.success() || stderr.contains("pymobiledevice3") {
                    return Some(pyenv_shim.to_string_lossy().to_string());
                }
            } else {
                error!("  failed to execute pyenv shim");
            }
        } else {
            warn!("  pyenv shim does not exist at expected path");
        }
    }

    // 3. 尝试 pyenv Python 完整路径
    if let Ok(home) = std::env::var("HOME") {
        let pyenv_python = PathBuf::from(&home).join(".pyenv/versions/3.11.0/bin/python");
        info!("Trying pyenv Python at: {}", pyenv_python.display());
        if pyenv_python.exists() {
            // 先用 --version 检查 Python 是否正常
            if let Ok(version_output) = Command::new(&pyenv_python).arg("--version").output() {
                info!("  Python version: {}", String::from_utf8_lossy(&version_output.stdout).trim());
            }
            // 用这个 Python 运行 pymobiledevice3
            let mut cmd = Command::new(&pyenv_python);
            cmd.arg("-m").arg("pymobiledevice3").arg("--help");
            if let Ok(output) = cmd.output() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                info!("  python -m result: success={}, stderr: {}", output.status.success(), stderr);
                if output.status.success() || stderr.contains("pymobiledevice3") {
                    // 返回 pyenv Python 路径和 -m 参数
                    return Some(format!("{} -m pymobiledevice3", pyenv_python.to_string_lossy()));
                }
            }
        }
    }

    // 4. 遍历 PATH 搜索 pymobiledevice3
    if let Ok(path_var) = std::env::var("PATH") {
        info!("Searching PATH for pymobiledevice3...");
        for dir in path_var.split(':') {
            let full_path = PathBuf::from(dir).join("pymobiledevice3");
            if full_path.exists() {
                info!("  Found at: {}, testing...", full_path.display());
                if let Ok(output) = Command::new(&full_path).arg("--help").output() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    info!("  result: success={}, stderr contains pymobiledevice3: {}", output.status.success(), stderr.contains("pymobiledevice3"));
                    if output.status.success() || stderr.contains("pymobiledevice3") {
                        return Some(full_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    error!("pymobiledevice3 not found by any method");
    None
}

pub fn check_pymobiledevice_installed() -> bool {
    find_pymobiledevice3().is_some()
}

pub fn check_tunneld_running() -> bool {
    Command::new("pgrep")
        .args(["-f", "tunneld"])
        .output()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(false)
}

pub fn start_tunneld() -> AppResult<()> {
    let pymobile = find_pymobiledevice3()
        .ok_or(AppError::NotInstalled)?;

    let parts: Vec<&str> = pymobile.split_whitespace().collect();
    let home = std::env::var("HOME").unwrap_or_default();
    let mut cmd = Command::new(parts[0]);
    if parts.len() > 1 {
        cmd.args(&parts[1..]);
    }
    cmd.env("HOME", &home);
    cmd.args(["remote", "tunneld"]);
    cmd.spawn().map_err(|_e| AppError::TunneldNotRunning)?;
    Ok(())
}

#[derive(Deserialize)]
struct UsbmuxDevice {
    #[serde(rename = "UniqueDeviceID")]
    udid: String,
    #[serde(rename = "DeviceName")]
    name: String,
}

pub fn list_devices() -> AppResult<Vec<DeviceInfo>> {
    info!("list_devices called");

    let pymobile = match find_pymobiledevice3() {
        Some(p) => {
            info!("Found pymobiledevice3: {}", p);
            p
        }
        None => {
            error!("Failed to find pymobiledevice3");
            return Err(AppError::NotInstalled);
        }
    };

    let parts: Vec<&str> = pymobile.split_whitespace().collect();
    let home = std::env::var("HOME").unwrap_or_default();
    info!("HOME: {}, parts: {:?}", home, parts);

    // 判断是 pyenv Python 完整路径（如 /path/to/python -m pymobiledevice3）
    let is_pyenv_python = parts[0].contains(".pyenv/versions");

    // 构建命令: pymobiledevice3 usbmux list
    let output = if is_pyenv_python {
        // /path/to/pyenv/python -m pymobiledevice3 usbmux list
        info!("Using pyenv Python approach");
        let mut cmd = Command::new(parts[0]);
        cmd.env("HOME", &home);
        // parts = ["/path/to/python", "-m", "pymobiledevice3"]
        cmd.args(["-m", "pymobiledevice3", "usbmux", "list"]);
        info!("Running: {} -m pymobiledevice3 usbmux list", parts[0]);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    } else if parts.len() > 2 && parts[1] == "-m" {
        // python3 -m pymobiledevice3 usbmux list
        info!("Using python -m approach");
        let mut cmd = Command::new(parts[0]);
        cmd.env("HOME", &home);
        // parts = ["python3", "-m", "pymobiledevice3"]
        cmd.args(["-m", "pymobiledevice3", "usbmux", "list"]);
        info!("Running: {} -m pymobiledevice3 usbmux list", parts[0]);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    } else {
        // 直接调用 pymobiledevice3 或完整路径
        info!("Using direct command approach: {}", pymobile);
        let mut cmd = Command::new(&pymobile);
        cmd.env("HOME", &home);
        cmd.args(["usbmux", "list"]);
        info!("Running: {} usbmux list", pymobile);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    };

    info!("Command exit status: {}", output.status);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    info!("stdout: {}", stdout);
    if !stderr.is_empty() {
        info!("stderr: {}", stderr);
    }

    if !output.status.success() {
        error!("Command failed with non-zero exit");
        return Err(AppError::ScreenshotFailed(stderr.to_string()));
    }
    let devices: Vec<UsbmuxDevice> = serde_json::from_str(&stdout)
        .map_err(|e| AppError::ScreenshotFailed(format!("JSON parse error: {}", e)))?;

    Ok(devices.into_iter().map(|d| DeviceInfo { udid: d.udid, name: d.name }).collect())
}

/// 固定的临时截图文件路径
static TEMP_SCREENSHOT: &str = "/tmp/titan_screenshot.png";

pub fn capture_screen(udid: &str) -> AppResult<String> {
    let pymobile = find_pymobiledevice3()
        .ok_or(AppError::NotInstalled)?;

    let parts: Vec<&str> = pymobile.split_whitespace().collect();
    let home = std::env::var("HOME").unwrap_or_default();

    let temp_path = TEMP_SCREENSHOT;

    let output = if parts[0].contains(".pyenv/versions") {
        let mut cmd = Command::new(parts[0]);
        cmd.env("HOME", &home);
        cmd.args(["-m", "pymobiledevice3", "developer", "dvt", "screenshot", "--udid", udid, temp_path]);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    } else if parts.len() > 2 && parts[1] == "-m" {
        let mut cmd = Command::new(parts[0]);
        cmd.env("HOME", &home);
        cmd.args(["-m", "pymobiledevice3", "developer", "dvt", "screenshot", "--udid", udid, temp_path]);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    } else {
        let mut cmd = Command::new(&pymobile);
        cmd.env("HOME", &home);
        cmd.args(["developer", "dvt", "screenshot", "--udid", udid, temp_path]);
        cmd.output()
            .map_err(|e| AppError::ScreenshotFailed(e.to_string()))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::ScreenshotFailed(stderr.to_string()));
    }

    // 读取临时文件
    let img_data = std::fs::read(temp_path)
        .map_err(|e| AppError::ScreenshotFailed(format!("Failed to read screenshot file: {}", e)))?;

    // 删除临时文件
    let _ = std::fs::remove_file(temp_path);

    let base64_str = STANDARD.encode(&img_data);
    Ok(format!("data:image/png;base64,{}", base64_str))
}