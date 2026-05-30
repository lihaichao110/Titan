use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

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
    payload: serde_json::Value,
}

fn find_node_binary() -> String {
    std::env::var("HOME")
        .map(|home| format!("{}/.nvm/versions/node/v24.15.0/bin/node", home))
        .ok()
        .filter(|path| std::path::Path::new(path).exists())
        .unwrap_or_else(|| "node".to_string())
}

#[tauri::command]
pub async fn run_pc_web_test(
    app_handle: AppHandle,
    request: PcWebTestRequest,
) -> Result<PcWebRunResult, String> {
    let script = std::env::var("HOME")
        .map(|home| format!("{}/Desktop/Titan/src/scripts/pc-web-runner.mjs", home))
        .map_err(|e| format!("无法定位执行脚本: {}", e))?;

    let body = serde_json::to_vec(&request).map_err(|e| format!("执行请求序列化失败: {}", e))?;
    let mut child = Command::new(find_node_binary())
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动 PC Web 执行器: {}", e))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(&body)
            .map_err(|e| format!("写入执行请求失败: {}", e))?;
    }
    drop(child.stdin.take());

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取 PC Web 执行器输出".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法读取 PC Web 执行器错误输出".to_string())?;

    let stderr_handle = std::thread::spawn(move || {
        let mut content = String::new();
        let mut reader = BufReader::new(stderr);
        let _ = reader.read_to_string(&mut content);
        content
    });

    let mut final_result: Option<PcWebRunResult> = None;
    for line in BufReader::new(stdout).lines() {
        let line = line.map_err(|e| format!("读取 PC Web 执行器输出失败: {}", e))?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let event = match serde_json::from_str::<PcWebRunnerEvent>(trimmed) {
            Ok(event) => event,
            Err(_) => continue,
        };

        app_handle
            .emit("pc-web-runner-event", &event)
            .map_err(|e| format!("推送 PC Web 执行事件失败: {}", e))?;

        if event.event == "result" {
            final_result = Some(
                serde_json::from_value(event.payload)
                    .map_err(|e| format!("解析 PC Web 执行结果失败: {}", e))?,
            );
        }
    }

    let status = child
        .wait()
        .map_err(|e| format!("等待 PC Web 执行器失败: {}", e))?;
    let stderr = stderr_handle
        .join()
        .unwrap_or_else(|_| "读取 PC Web 执行器错误输出失败".to_string())
        .trim()
        .to_string();

    if !status.success() {
        return Err(if stderr.is_empty() {
            "PC Web 执行器异常退出".to_string()
        } else {
            stderr
        });
    }

    final_result.ok_or_else(|| "PC Web 执行器未返回最终结果".to_string())
}
