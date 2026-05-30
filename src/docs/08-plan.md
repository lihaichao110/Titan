# Appium WDA 移动端控制方案

## Context
pymobiledevice3 没有 swipe 命令，无法控制设备触控。需要改用 Appium WebDriverAgent (WDA) 实现滑动控制。

## 架构
```
React 前端 ──▶ Rust 后端 ──▶ Appium WDA (iPhone)
   │              │                │
   │              │         执行触控指令
   ▼              ▼                ▼
点击/滑动坐标  tauri command   返回执行结果
```

## 技术方案

### 1. 依赖安装
```bash
# 全局安装 appium (用于 WDA)
npm i -g appium

# 项目安装 appium-webdriveragent (WDA client)
pnpm i appium-webdriveragent --save-dev

# 需要 nvm use 切换到 Node 20+
nvm use 20
```

### 2. Rust 后端 - `src-tauri/src/mobile_control.rs`
```rust
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

pub struct MobileState {
    pub session: Mutex<Option<WebDriverSession>>,
}

pub struct WebDriverSession {
    pub session_id: String,
    pub endpoint: String,  // http://localhost:8100
}

#[tauri::command]
async fn init_wda_session(udid: String, state: State<'_, MobileState>) -> Result<String, String>

#[tauri::command]
async fn swipe(x1: f64, y1: f64, x2: f64, y2: f64, duration: f64, udid: String, state: State<'_, MobileState>) -> Result<(), String>

#[tauri::command]
async fn tap(x: f64, y: f64, udid: String, state: State<'_, MobileState>) -> Result<(), String>
```

### 3. Appium WDA 启动逻辑
Rust 调用 Node.js 脚本启动 appium 并获取 session:
```javascript
// scripts/wda-launcher.js
const { WdaClient } = require('appium-webdriveragent');
// 连接设备，启动 WDA session
```

### 4. 前端 - `DeviceSimulator.tsx`
- 连接设备后初始化 WDA session
- `performSwipe` 调用 Rust 的 `swipe` 命令
- 复用现有的 swipe 触发逻辑

## 文件结构
```
src/
├── docs/
│   └── 08-plan.md              # 本方案文档
├── scripts/
│   └── wda-launcher.js         # Node.js WDA 启动脚本
src-tauri/
└── src/
    ├── lib.rs                  # 添加 mobile_control 模块
    └── mobile_control.rs       # WDA 控制命令
```

## 关键实现点

### WDA Session 管理
1. 首次连接时启动 appium server + WDA
2. 保存 session_id 供后续命令使用
3. 断开时清理 session

### Swipe 实现
通过 WDA 的 `touch.perform` 执行:
```javascript
await driver.performActions([{
  type: 'pointer',
  id: 'finger1',
  actions: [
    { type: 'pointerMove', x: x1, y: y1 },
    { type: 'pointerDown' },
    { type: 'pause', duration: duration * 1000 },
    { type: 'pointerUp' }
  ]
}]);
```

## 验证
1. `cargo check` - Rust 编译通过
2. `pnpm build` - 前端编译通过
3. 连接设备后观察 WDA session 初始化
4. 执行滑动时设备响应触控