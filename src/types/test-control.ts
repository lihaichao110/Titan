// 测试控制台共享类型：执行上下文、日志、统计数据和 Tauri 事件都从这里导出。
/** 执行步骤在步骤列表和统计计算中的状态。 */
export type StepStatus =
  /** 步骤已通过。 */
  | "passed"
  /** 步骤正在执行。 */
  | "executing"
  /** 步骤尚未开始。 */
  | "pending"
  /** 步骤执行失败。 */
  | "failed";

/** 日志终端支持展示和过滤的日志等级。 */
export type LogLevel =
  /** 普通执行信息。 */
  | "INFO"
  /** 成功类执行信息。 */
  | "SUCCESS"
  /** 错误类执行信息。 */
  | "ERROR";

/** 当前测试任务的整体执行状态。 */
export type ExecutionStatus =
  /** 测试任务正在运行。 */
  | "running"
  /** 测试任务已暂停。 */
  | "paused"
  /** 测试任务已停止。 */
  | "stopped";

/** 步骤列表中的单个执行步骤。 */
export interface ExecutionStep {
  /** 步骤序号，用于排序、定位和更新单步结果。 */
  step: number;
  /** 步骤名称，展示在步骤列表中。 */
  name: string;
  /** 面向执行器或用户的步骤指令说明。 */
  instruction: string;
  /** 当前步骤执行状态。 */
  status: StepStatus;
  /** 步骤耗时；未执行完成时可以为空。 */
  duration: string | null;
  /** 步骤执行详情，通常用于展示错误或补充结果。 */
  detail?: string;
}

/** 日志终端中的单条执行日志。 */
export interface LogEntry {
  /** 日志发生时间，按 UI 需要直接展示。 */
  time: string;
  /** 日志等级，用于颜色样式和过滤。 */
  level: LogLevel;
  /** 日志正文。 */
  msg: string;
}

/** 执行进度统计卡片数据。 */
export interface StatsProgress {
  /** 当前执行进度百分比。 */
  percent: number;
  /** 进度补充说明。 */
  detail: string;
}

/** 通过率统计卡片数据。 */
export interface StatsPassRate {
  /** 当前通过率展示文案。 */
  rate: string;
  /** 通过率补充说明。 */
  detail: string;
}

/** 步骤数量统计卡片数据。 */
export interface StatsSteps {
  /** 总步骤数量。 */
  total: number;
  /** 已完成步骤数量。 */
  completed: number;
}

/** 运行时长统计卡片数据。 */
export interface StatsRuntime {
  /** 当前累计运行时长。 */
  time: string;
  /** 当前运行设备或环境说明。 */
  device: string;
}

/** 测试控制台统计区的完整数据。 */
export interface StatsData {
  /** 执行进度统计。 */
  progress: StatsProgress;
  /** 通过率统计。 */
  passRate: StatsPassRate;
  /** 步骤数量统计。 */
  steps: StatsSteps;
  /** 运行时长和设备统计。 */
  runtime: StatsRuntime;
}

/** 根据步骤结果重算时需要更新的统计字段。 */
export type StepStats = Pick<StatsData, "progress" | "passRate" | "steps">;

/** 当前测试任务的完整执行上下文。 */
export interface ExecutionContext {
  /** 当前测试任务名称。 */
  taskName: string;
  /** 当前测试设备或执行环境信息。 */
  deviceInfo: string;
  /** 当前任务整体执行状态。 */
  status: ExecutionStatus;
  /** 任务开始时间。 */
  startTime: string;
  /** 任务已运行时长。 */
  elapsedTime: string;
  /** 当前任务的执行步骤列表。 */
  steps: ExecutionStep[];
  /** 当前任务产生的日志列表。 */
  logs: LogEntry[];
  /** 当前任务的统计卡片数据。 */
  stats: StatsData;
}

/** 测试控制台侧边栏菜单项。 */
export interface MenuItem {
  /** 菜单唯一标识。 */
  id: string;
  /** 菜单展示名称。 */
  name: string;
  /** 菜单图标名称或资源标识。 */
  icon: string;
  /** 菜单是否处于激活状态。 */
  active: boolean;
}

/** 顶部用户信息区域展示的数据。 */
export interface UserProfile {
  /** 用户名称。 */
  name: string;
  /** 用户角色。 */
  role: string;
  /** 用户头像地址。 */
  avatarUrl: string;
}

/** Tauri 设备发现命令返回的 iOS 设备信息。 */
export interface IOSDevice {
  /** iOS 设备唯一标识。 */
  udid: string;
  /** iOS 设备展示名称。 */
  name: string;
}

/** 移动端屏幕流启动后返回的连接信息。 */
export interface ScreenStreamInfo {
  /** 屏幕流会话地址。 */
  sessionUrl: string;
  /** MJPEG 或截图流访问地址。 */
  streamUrl: string;
  /** 当前投屏设备的 udid。 */
  udid: string;
  /** 本地 MJPEG 服务端口。 */
  mjpegPort: number;
}

/** 移动端投屏连接状态。 */
export type StreamStatus =
  /** 尚未建立投屏连接。 */
  | "idle"
  /** 正在连接投屏服务。 */
  | "connecting"
  /** 投屏连接已建立。 */
  | "connected"
  /** 投屏不可用时回退到静态截图展示。 */
  | "fallback"
  /** 投屏连接失败。 */
  | "error";

/** PC Web 执行步骤的业务分类。 */
export type PcWebStepKind =
  /** 会改变页面状态的操作步骤。 */
  | "act"
  /** 只校验页面状态的断言步骤。 */
  | "assert";

/** PC Web 执行器支持的具体步骤动作。 */
export type PcWebStepAction =
  /** 向输入框填入文本。 */
  | "fill"
  /** 清空输入框内容。 */
  | "clear"
  /** 点击目标元素。 */
  | "click"
  /** 在目标元素上触发回车键。 */
  | "pressEnter"
  /** 断言目标元素可见。 */
  | "assertVisible"
  /** 断言目标元素文本符合预期。 */
  | "assertText"
  /** 等待目标元素可见。 */
  | "waitForVisible"
  /** 等待页面地址匹配预期。 */
  | "waitForUrl"
  /** 选择下拉框或选择控件中的选项。 */
  | "select";

/** PC Web 执行器定位页面元素的方式。 */
export type PcWebLocatorType =
  /** 使用 CSS 选择器定位元素。 */
  | "css"
  /** 使用可见文本定位元素。 */
  | "text"
  /** 使用输入框 placeholder 定位元素。 */
  | "placeholder"
  /** 使用元素 name 属性定位元素。 */
  | "name";

/** PC Web 执行步骤中的单个元素定位器。 */
export interface PcWebLocator {
  /** 定位方式。 */
  type: PcWebLocatorType;
  /** 定位值，含义由 type 决定。 */
  value: string;
}

/** 发送给 PC Web 执行器的单个自动化步骤。 */
export interface PcWebStep {
  /** 步骤序号，用于执行顺序和结果回填。 */
  step: number;
  /** 步骤名称，展示在控制台步骤列表中。 */
  name: string;
  /** 步骤业务分类。 */
  kind: PcWebStepKind;
  /** 执行器需要执行的具体动作。 */
  action: PcWebStepAction;
  /** 页面元素定位器列表；部分动作可以不需要定位器。 */
  locators?: PcWebLocator[];
  /** 动作输入值或断言期望值。 */
  value?: string;
  /** 单步骤超时时间，单位毫秒。 */
  timeoutMs?: number;
  /** 展示给用户或执行器的自然语言步骤说明。 */
  instruction: string;
}

/** PC Web 执行器回传的单步执行结果。 */
export interface PcWebStepResult {
  /** 对应的步骤序号。 */
  step: number;
  /** 当前步骤执行状态。 */
  status: StepStatus;
  /** 当前步骤耗时。 */
  duration: string;
  /** 当前步骤执行详情。 */
  detail: string;
}

/** PC Web 执行器完整运行结果。 */
export interface PcWebRunResult {
  /** 整体执行是否成功。 */
  success: boolean;
  /** 每个步骤的最终执行结果。 */
  steps: PcWebStepResult[];
  /** 执行过程中产生的日志。 */
  logs: LogEntry[];
  /** 执行结束时的截图，可能不存在。 */
  screenshot?: string | null;
  /** 执行失败时的错误信息。 */
  error?: string | null;
}

/** 前端 PC Web 预览区域在窗口中的位置和缩放信息。 */
export interface BrowserBounds {
  /** 预览区域左上角相对窗口的横坐标。 */
  x: number;
  /** 预览区域左上角相对窗口的纵坐标。 */
  y: number;
  /** 预览区域宽度。 */
  width: number;
  /** 预览区域高度。 */
  height: number;
  /** 当前页面缩放比例。 */
  zoom: number;
}

/** 后端 PC Web runner 通过 Tauri 推送给前端的事件。 */
export type PcWebRunnerEvent =
  /** 追加一条执行日志。 */
  | { event: "log"; payload: LogEntry }
  /** 更新指定步骤的部分执行结果。 */
  | { event: "step"; payload: Partial<PcWebStepResult> & { step: number } }
  /** 更新当前执行截图。 */
  | { event: "screenshot"; payload: { screenshot: string } }
  /** 返回本次 PC Web 执行的最终结果。 */
  | { event: "result"; payload: PcWebRunResult };

/** 步骤列表组件的展示配置。 */
export interface StepListViewProps {
  /** 步骤列表高度样式类；不传时组件使用默认高度。 */
  height?: string;
}

/** 日志终端组件的展示配置。 */
export interface LogTerminalProps {
  /** 日志终端高度样式类；不传时组件使用默认高度。 */
  height?: string;
}
