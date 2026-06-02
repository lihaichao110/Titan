import { initialLogState } from "./initialState";
import type { LogActions, LogState, StoreSlice } from "./types";

// 日志 slice 管理日志终端的筛选/滚动状态，以及 context.logs 的写入。
export const createLogSlice: StoreSlice<LogState & LogActions> = (set) => ({
  // 日志过滤条件和自动滚动开关的默认值。
  ...initialLogState,
  // 设置日志等级过滤条件，只影响 LogTerminal 的展示。
  setLogFilter: (filter) => set({ logFilter: filter }),
  // 设置日志自动滚动开关，只影响 LogTerminal 的滚动行为。
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  // 追加实时执行日志，保留已有日志顺序。
  addLog: (log) =>
    set((state) => ({
      context: {
        ...state.context,
        logs: [...state.context.logs, log],
      },
    })),
  // 清空当前日志，保留执行上下文中的其他字段。
  clearLogs: () =>
    set((state) => ({
      context: {
        ...state.context,
        logs: [],
      },
    })),
});
