use super::types::PcWebStep;

const DOM_SCRIPT: &str = include_str!("dom.js");
const INPUT_SCRIPT: &str = include_str!("input.js");
const QQ_MUSIC_SCRIPT: &str = include_str!("qq_music.js");
const ACTION_SCRIPT: &str = include_str!("actions.js");

pub(crate) fn step_script(step: &PcWebStep) -> Result<String, String> {
    let step_json = serde_json::to_string(step).map_err(|e| e.to_string())?;
    // 通用执行器只理解结构化 action/locator 数据，instruction 只保留给前端展示。
    Ok(format!(
        r##"
    (() => {{
      const step = __STEP__;
      const locators = step.locators || [];
      const expectedValue = step.value ?? "";

{dom}
{input}
{qq_music}
{actions}
    }})()
    "##,
        dom = DOM_SCRIPT,
        input = INPUT_SCRIPT,
        qq_music = QQ_MUSIC_SCRIPT,
        actions = ACTION_SCRIPT,
    )
    .replace("__STEP__", &step_json))
}
