import type { ExecutionStep, StatsData } from "@/types";

type StepStats = Pick<StatsData, "progress" | "passRate" | "steps">;

// 根据步骤状态生成统计卡片数据，避免多个 action 各自重复计算。
export function createStepStats(steps: ExecutionStep[]): StepStats {
  // 只有 passed 状态计入完成数和通过数。
  const passed = steps.filter((step) => step.status === "passed").length;
  // 空步骤时进度固定为 0，避免除以 0。
  const percent = steps.length ? (passed / steps.length) * 100 : 0;

  return {
    progress: {
      percent,
      detail: `${passed}/${steps.length}`,
    },
    passRate: {
      rate: steps.length ? `${Math.round(percent)}%` : "0%",
      detail: `${passed}/${steps.length}`,
    },
    steps: {
      total: steps.length,
      completed: passed,
    },
  };
}
