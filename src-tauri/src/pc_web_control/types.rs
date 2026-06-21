use serde::{Deserialize, Serialize};
use serde_json::Value;

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
pub(crate) struct PcWebRunnerEvent {
    pub event: String,
    pub payload: Value,
}
