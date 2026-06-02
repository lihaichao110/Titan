import type { StateCreator } from "zustand";
import type { ExecutionContext, ExecutionStep, LogEntry, LogLevel } from "@/types";

export type DeviceType = "mobile" | "pc";

// 执行上下文：任务信息、步骤、日志和统计卡片数据都挂在这里。
export interface ExecutionState {
  /** 当前测试任务的完整执行上下文。 */
  context: ExecutionContext;
}

// 执行步骤相关 action，由 PC Web 运行器和步骤列表共同消费。
export interface ExecutionActions {
  /** 批量设置执行步骤，通常在开始执行前初始化步骤列表。 */
  setExecutionSteps: (steps: ExecutionStep[]) => void;
  /** 更新统计卡片中的运行时长。 */
  setRuntimeTime: (time: string) => void;
  /** 只更新单个步骤的执行状态，不重算统计数据。 */
  updateStepStatus: (step: number, status: ExecutionStep["status"]) => void;
  /** 合并单个步骤的执行结果，并同步重算进度和通过率。 */
  updateStepResult: (step: number, result: Partial<ExecutionStep>) => void;
}

// 日志面板自身状态：过滤条件和是否自动滚动。
export interface LogState {
  /** 当前日志等级过滤条件，ALL 表示不过滤。 */
  logFilter: LogLevel | "ALL";
  /** 是否在日志变化后自动滚动到底部。 */
  autoScroll: boolean;
}

// 日志数据仍写入 context.logs，避免展示组件同时订阅多个日志来源。
export interface LogActions {
  /** 设置日志等级过滤条件。 */
  setLogFilter: (filter: LogLevel | "ALL") => void;
  /** 开关日志自动滚动。 */
  setAutoScroll: (enabled: boolean) => void;
  /** 追加一条执行日志。 */
  addLog: (log: LogEntry) => void;
  /** 清空当前执行上下文中的日志列表。 */
  clearLogs: () => void;
}

// 设备与截图状态：移动端设备、PC/移动端切换和当前截图预览共用。
export interface DeviceState {
  /** 当前控制台展示模式：手机端或 PC 端。 */
  deviceType: DeviceType;
  /** 当前选中的设备标识；移动端场景下对应 udid。 */
  deviceUrl: string;
  /** 当前选中的 iOS 设备 udid，保留给设备选择逻辑使用。 */
  selectedDeviceUdid: string | null;
  /** 当前展示的截图 base64 或图片地址。 */
  currentScreenshot: string;
}

// 设备 action 只负责更新 store，不直接调用 Tauri 命令。
export interface DeviceActions {
  /** 切换手机端/PC 端展示模式。 */
  setDeviceType: (type: DeviceType) => void;
  /** 设置当前设备标识或连接目标。 */
  setDeviceUrl: (url: string) => void;
  /** 记录当前选中的 iOS 设备 udid。 */
  setSelectedDeviceUdid: (udid: string | null) => void;
  /** 更新当前截图。 */
  setScreenshot: (screenshot: string) => void;
}

// 侧边栏当前菜单状态，和路由跳转逻辑保持解耦。
export interface UiState {
  /** 当前激活的侧边栏菜单 id。 */
  activeMenuId: string;
}

export interface UiActions {
  /** 设置当前激活的侧边栏菜单 id。 */
  setActiveMenu: (id: string) => void;
}

// Zustand 最终暴露给组件的完整 store 类型。
export type ExecutionStore =
  & ExecutionState
  & ExecutionActions
  & LogState
  & LogActions
  & DeviceState
  & DeviceActions
  & UiState
  & UiActions;

// 每个 slice 只返回自己负责的状态和 action，但可以读取完整 store。
export type StoreSlice<T> = StateCreator<ExecutionStore, [], [], T>;
