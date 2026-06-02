import { create } from "zustand";
import { createDeviceSlice } from "./deviceSlice";
import { createExecutionSlice } from "./executionSlice";
import { createLogSlice } from "./logSlice";
import { createUiSlice } from "./uiSlice";
import type { ExecutionStore } from "@/types/test-control-store";

// 统一组装测试控制台 store。组件只从这个入口导入，避免依赖具体 slice 文件。
export const useExecutionStore = create<ExecutionStore>()((...storeApi) => ({
  // 执行上下文和步骤更新能力。
  ...createExecutionSlice(...storeApi),
  // 日志面板状态和日志写入能力。
  ...createLogSlice(...storeApi),
  // 设备、截图和端类型切换能力。
  ...createDeviceSlice(...storeApi),
  // 侧边栏等界面状态。
  ...createUiSlice(...storeApi),
}));

export type { ExecutionStore };
