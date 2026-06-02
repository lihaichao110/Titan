// 测试控制台共享类型：执行上下文、日志、统计数据和 Tauri 事件都从这里导出。
export type StepStatus = "passed" | "executing" | "pending" | "failed";
export type LogLevel = "INFO" | "SUCCESS" | "ERROR";
export type ExecutionStatus = "running" | "paused" | "stopped";

export interface ExecutionStep {
  step: number;
  name: string;
  locator: string;
  status: StepStatus;
  duration: string | null;
  detail?: string;
}

export interface LogEntry {
  time: string;
  level: LogLevel;
  msg: string;
}

export interface StatsProgress {
  percent: number;
  detail: string;
}

export interface StatsPassRate {
  rate: string;
  detail: string;
}

export interface StatsSteps {
  total: number;
  completed: number;
}

export interface StatsRuntime {
  time: string;
  device: string;
}

export interface StatsData {
  progress: StatsProgress;
  passRate: StatsPassRate;
  steps: StatsSteps;
  runtime: StatsRuntime;
}

export type StepStats = Pick<StatsData, "progress" | "passRate" | "steps">;

export interface ExecutionContext {
  taskName: string;
  deviceInfo: string;
  status: ExecutionStatus;
  startTime: string;
  elapsedTime: string;
  steps: ExecutionStep[];
  logs: LogEntry[];
  stats: StatsData;
}

export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface IOSDevice {
  udid: string;
  name: string;
}

export interface ScreenStreamInfo {
  sessionUrl: string;
  streamUrl: string;
  udid: string;
  mjpegPort: number;
}

export type StreamStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "fallback"
  | "error";

export type PcWebStepKind = "act" | "assert";

export interface PcWebStep {
  step: number;
  name: string;
  kind: PcWebStepKind;
  instruction: string;
}

export interface PcWebStepResult {
  step: number;
  status: StepStatus;
  duration: string;
  detail: string;
}

export interface PcWebRunResult {
  success: boolean;
  steps: PcWebStepResult[];
  logs: LogEntry[];
  screenshot?: string | null;
  error?: string | null;
}

export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export type PcWebRunnerEvent =
  | { event: "log"; payload: LogEntry }
  | { event: "step"; payload: Partial<PcWebStepResult> & { step: number } }
  | { event: "screenshot"; payload: { screenshot: string } }
  | { event: "result"; payload: PcWebRunResult };

export interface StepListViewProps {
  height?: string;
}

export interface LogTerminalProps {
  height?: string;
}
