# Midscene.js 集成到 DeviceSimulator 方案

## Context

在 Tauri 项目中集成 Midscene.js，实现 iOS 设备投屏到 DeviceSimulator 组件。Midscene.js 通过 WebDriverAgent (WDA) 控制 iOS 设备，获取截图并执行自动化操作。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri App                            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  DeviceSimulator │    │       Midscene.js            │  │
│  │  (WebView 显示)  │◄───│  - ai() 执行操作            │  │
│  │                  │    │  - aiQuery() 提取数据        │  │
│  │  <img src={...}/>│    │  - aiAssert() 断言          │  │
│  └──────────────────┘    └──────────────┬───────────────┘  │
│                                          │                  │
│  ┌───────────────────────────────────────▼───────────────┐  │
│  │              Tauri Commands (Rust)                    │  │
│  │  - get_screenshot(): 从 WDA 获取截图                 │  │
│  │  - execute_action(x, y): 执行点击/输入                │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   iOS 设备 (WDA Server)                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  WebDriverAgent                                        │ │
│  │  - GET /screenshot  获取截图                          │ │
│  │  - POST /element/{id}/click 点击元素                   │ │
│  │  - POST /wda/screen/stream 实时流(可选)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现步骤

### 步骤 1: 添加 Midscene.js 依赖

```bash
pnpm add @midscene/web
```

### 步骤 2: 添加 Tauri Rust 依赖

在 `src-tauri/Cargo.toml` 中添加：

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json"] }  # HTTP 请求
tokio = { version = "1", features = ["rt-multi-thread"] }  # 异步运行时
base64 = "0.22"  # 截图编解码
```

### 步骤 3: 创建 Tauri Commands

创建 `src-tauri/src/commands/mod.rs`:

```rust
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest;
use tauri::command;

#[command]
pub async fn get_device_screenshot(device_url: String) -> Result<String, String> {
    let url = format!("{}/screenshot", device_url);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?;

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let base64_str = STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[command]
pub async fn execute_tap(x: i32, y: i32, device_url: String) -> Result<(), String> {
    let url = format!("{}/wda/touch/perform", device_url);
    let body = serde_json::json!({
        "actions": [{"action": "tap", "x": x, "y": y}]
    });

    reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### 步骤 4: 更新 Store

在 `executionStore.ts` 中添加：

```typescript
interface ExecutionStore {
  // ... existing
  deviceUrl: string;  // e.g., "http://192.168.1.100:8100"
  currentScreenshot: string;
  setDeviceUrl: (url: string) => void;
  updateScreenshot: (screenshot: string) => void;
}
```

### 步骤 5: 更新 DeviceSimulator 组件

```tsx
import { MidsceneProvider, useMidscene } from '@midscene/web';

export function DeviceSimulator() {
  const { screenshot, action } = useMidscene({
    deviceUrl: 'http://192.168.1.100:8100'
  });

  return (
    <div className="h-[640px] flex flex-col bg-white rounded-2xl ...">
      {/* 显示截图 */}
      <div className="flex-1 flex items-center justify-center p-6">
        {screenshot ? (
          <img src={screenshot} className="max-w-full max-h-full" />
        ) : (
          <div>等待连接设备...</div>
        )}
      </div>
    </div>
  );
}
```

### 步骤 6: 初始化 Midscene

在 `TestControlPage` 或 `App` 中初始化：

```tsx
import { MidsceneProvider } from '@midscene/web';

function App() {
  return (
    <MidsceneProvider config={{
      modelName: 'qwen-vl-max',
      apiKey: process.env.OPENAI_API_KEY,
    }}>
      <YourApp />
    </MidsceneProvider>
  );
}
```

---

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `package.json` | 添加 `@midscene/web` |
| `src-tauri/Cargo.toml` | 添加 `reqwest`, `tokio`, `base64` |
| `src-tauri/src/commands/mod.rs` | 新建命令模块 |
| `src-tauri/src/lib.rs` | 注册命令 |
| `src/features/test-control/store/executionStore.ts` | 添加截图状态 |
| `src/features/test-control/components/DeviceSimulator.tsx` | 显示截图 |
| `src/app/App.tsx` | 添加 MidsceneProvider |

---

## 验证方式

1. 启动 Tauri 应用
2. 确认 iOS 设备已安装并运行 WDA Server
3. 在 DeviceSimulator 中看到 iOS 设备截图
4. 使用 `ai('点击登录按钮')` 测试 AI 控制

---

## 前置条件

用户需要在 iOS 设备上安装 WebDriverAgent：
- 通过 Xcode 安装（需要开发者账号）
- 或使用 altdeploy 等工具免 Xcode 安装