import { initialUiState } from "./initialState";
import type { StoreSlice, UiActions, UiState } from "@/types/test-control-store";

// UI slice 保存跨组件共享但不属于执行数据的界面状态。
export const createUiSlice: StoreSlice<UiState & UiActions> = (set) => ({
  // 侧边栏菜单默认状态。
  ...initialUiState,
  // 更新侧边栏当前激活菜单。
  setActiveMenu: (id) => set({ activeMenuId: id }),
});
