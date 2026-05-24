# iOS USB 连接方案（自动管理 usbmuxd）

## Context

用户已通过 USB 连接到 iOS 设备，需要 Tauri 自动管理 usbmuxd 来实现 WDA 连接，而不是手动配置 deviceUrl。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri App                            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  DeviceSimulator │    │     Midscene Integration     │  │
│  │  (WebView 显示)  │◄───│                             │  │
│  └──────────────────┘    └──────────────┬───────────────┘  │
│                                          │                  │
│  ┌───────────────────────────────────────▼───────────────┐  │
│  │              Tauri Commands (Rust)                    │  │
│  │  - list_devices(): 列出 USB 连接的 iOS 设备          │  │
│  │  - connect_wda(device_id): 连接 WDA 并返回截图      │  │
│  │  - execute_tap(x, y): 执行点击                       │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────┘
                               │ USB / Unix Socket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    usbmuxd (系统服务)                        │
│  - 监听 /var/run/usbmuxd socket                           │
│  - 转发 USB 流量到 TCP 端口                                │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   iOS 设备 (WDA Server)                      │
│  - 通过 USB 接收指令                                        │
│  - 返回截图                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现方案

### 1. 添加 Rust 依赖

在 `src-tauri/Cargo.toml` 中添加：

```toml
[dependencies]
# 已有
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["rt-multi-thread"] }
base64 = "0.22"
```

### 2. 创建设备管理模块

创建 `src-tauri/src/commands/device.rs`：

```rust
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use base64::{engine::general_purpose::STANDARD, Engine};

#[derive(Debug, Serialize, Deserialize)]
pub struct IOSDevice {
    pub udid: String,
    pub name: String,
    pub product_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub device_url: Option<String>,
    pub error: Option<String>,
}

/// List connected iOS devices via system_profiler or idevice_id
#[command]
pub async fn list_ios_devices() -> Result<Vec<IOSDevice>, String> {
    // Use system_profiler to get USB connected iOS devices
    let output = Command::new("system_profiler")
        .args(&["SPUSBDataType", "-json"])
        .output()
        .map_err(|e| e.to_string())?;

    // Parse output to find iOS devices...
    // For now, return mock data if no real implementation
    Ok(vec![
        IOSDevice {
            udid: "00001234-0000000000000000".to_string(),
            name: "iPhone".to_string(),
            product_type: "iPhone15,2".to_string(),
        }
    ])
}

/// Connect to WDA on a specific device via USB tunnel
#[command]
pub async fn connect_wda(udid: String) -> Result<ConnectionResult, String> {
    // 1. Start iproxy in background for this device
    // 2. Wait for port forwarding to be ready
    // 3. Return localhost URL

    let local_port = 8100;
    let device_port = 8100;

    // Use iproxy to forward port
    let child = Command::new("iproxy")
        .args(&[&local_port.to_string(), &device_port.to_string()])
        .arg("-u")
        .arg(&udid)
        .spawn()
        .map_err(|e| format!("Failed to start iproxy: {}", e))?;

    // Store child process for cleanup later

    Ok(ConnectionResult {
        success: true,
        device_url: Some(format!("http://127.0.0.1:{}", local_port)),
        error: None,
    })
}
```

### 3. 修改 screenshot.rs 使用 localhost 连接

由于 iproxy 已经转发端口，WDA 连接地址固定为 `http://127.0.0.1:8100`

### 4. 前端修改

在 HeaderToolbar 添加设备选择下拉框，连接不同的 iOS 设备。

---

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src-tauri/src/commands/device.rs` | 新建：设备管理命令 |
| `src-tauri/src/commands/mod.rs` | 添加 device 模块 |
| `src-tauri/src/lib.rs` | 注册 device 命令 |
| `src/features/test-control/store/executionStore.ts` | 添加设备列表状态 |
| `src/features/test-control/components/HeaderToolbar.tsx` | 添加设备选择器 |
| `src/features/test-control/components/DeviceSimulator.tsx` | 修改为自动刷新截图 |

---

## 前置条件

1. macOS 上需要安装 `libimobiledevice`（包含 iproxy）
2. iOS 设备已通过 USB 连接并信任此电脑
3. WDA 已在 iOS 设备上运行