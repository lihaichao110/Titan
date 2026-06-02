import type { ExecutionContext, ExecutionStep, LogEntry } from "@/types";
import type { DeviceState, LogState, UiState } from "./types";

const initialSteps: ExecutionStep[] = [];
const initialLogs: LogEntry[] = [];

// 测试控制台的默认执行上下文，保持与原 executionStore 初始值一致。
export const initialExecutionContext: ExecutionContext = {
  // 当前展示的任务名称。
  taskName: "用户登录流程测试",
  // 当前展示的设备信息文案。
  deviceInfo: "iPhone 15 Pro (iOS 17.4.1)",
  // 默认进入运行中状态，沿用原页面展示。
  status: "running",
  // 默认开始时间，仅用于页面初始展示。
  startTime: "2024-05-20 14:30:22",
  // 默认已运行时长，仅用于页面初始展示。
  elapsedTime: "00:01:32",
  // 执行步骤列表，运行器启动后会整体替换。
  steps: initialSteps,
  // 执行日志列表，后续由 logSlice 追加或清空。
  logs: initialLogs,
  stats: {
    // 执行进度卡片数据。
    progress: { percent: 0, detail: "0/0" },
    // 通过率卡片数据。
    passRate: { rate: "0%", detail: "0/0" },
    // 步骤总数和完成数卡片数据。
    steps: { total: 0, completed: 0 },
    // 运行时长卡片数据。
    runtime: { time: "00:00:00", device: "iPhone 15 Pro" },
  },
};

// 日志终端默认展示全部日志，并在新日志出现时自动滚动到底部。
export const initialLogState: LogState = {
  // ALL 表示初始不过滤日志等级。
  logFilter: "ALL",
  // 初始开启自动滚动，便于实时查看最新日志。
  autoScroll: true,
};

// 默认进入移动端视图；deviceUrl 目前承载移动设备 udid。
export const initialDeviceState: DeviceState = {
  // 默认展示手机端控制台。
  deviceType: "mobile",
  // 初始未选择设备。
  deviceUrl: "",
  // 初始未选中具体 iOS 设备。
  selectedDeviceUdid: null,
  // 初始无截图。
  currentScreenshot: "",
};

// 侧边栏默认选中任务列表，实际高亮仍由路由路径共同决定。
export const initialUiState: UiState = {
  // 默认激活测试任务菜单。
  activeMenuId: "tasks",
};
