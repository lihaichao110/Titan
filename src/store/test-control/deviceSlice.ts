import { initialDeviceState } from "./initialState";
import type { DeviceActions, DeviceState, StoreSlice } from "@/types/test-control-store";

// 设备 slice 只保存 UI 所需的设备选择、端类型和最新截图。
export const createDeviceSlice: StoreSlice<DeviceState & DeviceActions> = (set) => ({
  // 设备类型、设备标识、选中 udid 和截图的默认值。
  ...initialDeviceState,
  // 切换手机端/PC 端视图。
  setDeviceType: (type) => set({ deviceType: type }),
  // 设置当前连接目标；移动端场景下是设备 udid。
  setDeviceUrl: (url) => set({ deviceUrl: url }),
  // 单独记录设备选择器选中的 udid。
  setSelectedDeviceUdid: (udid) => set({ selectedDeviceUdid: udid }),
  // 更新当前截图内容。
  setScreenshot: (screenshot) => set({ currentScreenshot: screenshot }),
});
