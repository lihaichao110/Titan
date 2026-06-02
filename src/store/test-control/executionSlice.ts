import { initialExecutionContext } from "./initialState";
import { createStepStats } from "./stats";
import type { ExecutionActions, ExecutionState, StoreSlice } from "@/types/test-control-store";

// 执行 slice 管理任务上下文中会随运行变化的部分：步骤、结果和运行时长。
export const createExecutionSlice: StoreSlice<ExecutionState & ExecutionActions> = (set) => ({
  // 完整执行上下文，供步骤、日志、统计卡片和头部任务信息读取。
  context: initialExecutionContext,
  // 更新运行时长卡片，不影响步骤和日志。
  setRuntimeTime: (time) =>
    set((state) => ({
      context: {
        ...state.context,
        stats: {
          ...state.context.stats,
          runtime: {
            ...state.context.stats.runtime,
            time,
          },
        },
      },
    })),
  // 初始化或替换步骤列表，并根据新步骤同步统计卡片。
  setExecutionSteps: (steps) =>
    set((state) => ({
      context: {
        ...state.context,
        steps,
        stats: {
          ...state.context.stats,
          ...createStepStats(steps),
        },
      },
    })),
  // 轻量更新步骤状态；当前调用方需要时会通过 updateStepResult 重算统计。
  updateStepStatus: (stepNum, status) =>
    set((state) => ({
      context: {
        ...state.context,
        steps: state.context.steps.map((step) =>
          step.step === stepNum ? { ...step, status } : step
        ),
      },
    })),
  // step/result 更新会影响通过率和进度，因此这里同步刷新统计卡片数据。
  updateStepResult: (stepNum, result) =>
    set((state) => {
      const steps = state.context.steps.map((step) =>
        step.step === stepNum ? { ...step, ...result } : step
      );

      return {
        context: {
          ...state.context,
          steps,
          stats: {
            ...state.context.stats,
            ...createStepStats(steps),
          },
        },
      };
    }),
});
