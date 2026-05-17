# Titan 测试平台 - 页面修改方案 (v2)

**版本**: 2.0.0
**日期**: 2026-05-17
**状态**: 待审批

---

## 1. 修改概述

基于第一版实现，根据新设计稿进行修正。主要修改：
- 数据结构调整（字段名匹配新数据）
- HeaderToolbar 新增开始时间，按钮样式调整
- DeviceSimulator 补充底部控制栏、输入框 placeholder
- StepListView 状态图标和样式优化
- LogTerminal 新增"清空"按钮
- StatsGrid 调整卡片内容和布局

---

## 2. 数据结构调整

### 2.1 类型定义变更

**文件**: `src/features/test-control/types/index.ts`

变更字段名：
- `LogEntry.timestamp` → `LogEntry.time`
- `LogEntry.message` → `LogEntry.msg`
- `ExecutionStep.id` → `ExecutionStep.step`
- `MenuItem.label` → `MenuItem.name`

新增字段：
- `ExecutionStep.detail` (执行中步骤的详细信息)

### 2.2 Zustand Store 变更

**文件**: `src/features/test-control/store/executionStore.ts`

新增 Actions：
- `clearLogs()` - 清空日志

数据字段调整：
- `context.stats.progress.percent` (原 percentage)
- `context.stats.passRate.rate` (保持不变)
- `context.stats.stepsInfo.total/completed` (保持不变)
- `context.stats.runtime.time/device` (新增)

---

## 3. 组件修改清单

### 3.1 Sidebar 组件

**文件**: `src/features/test-control/components/Sidebar.tsx`

修改内容：
- 菜单项字段 `label` → `name`
- 更新图标映射：
  - `CheckSquare` 替代 `Task`
  - `Code` 替代 `NodeExpand`
  - `Server` 替代 `Database`
  - `Link` 替代 `Api`
  - `Folder` 替代 `Box`

### 3.2 HeaderToolbar 组件

**文件**: `src/features/test-control/components/HeaderToolbar.tsx`

修改内容：
1. 新增显示「开始时间: 2024-05-20 14:30:22」
2. 按钮样式调整：
   - 停止：红色边框 (border-red-500 text-red-500)
   - 暂停：白底色 + 边框 (bg-white border-gray-300)
   - 重新执行：灰色边框 (border-gray-400)

### 3.3 DeviceSimulator 组件

**文件**: `src/features/test-control/components/DeviceSimulator.tsx`

修改内容：
1. 顶部工具栏：新增设备信息显示 `iPhone 15 Pro`
2. 输入框：
   - 手机号输入框 placeholder: "请输入手机号码"
   - 密码输入框 placeholder: "请输入密码"（替换当前静态值）
3. 底部控制栏：新增缩放控制 `- 100% +` 和工具图标（截图、翻转、适应屏幕等）

### 3.4 StepListView 组件

**文件**: `src/features/test-control/components/StepListView.tsx`

修改内容：
- 状态图标优化：
  - passed: 绿色勾选图标 (CheckCircle2, text-green-600)
  - executing: 蓝色加载动画 (Loader2, animate-spin)
  - pending: 灰色空心圆 (Circle, text-slate-400)
- 执行中步骤高亮：蓝色边框 + 浅蓝背景

### 3.5 LogTerminal 组件

**文件**: `src/features/test-control/components/LogTerminal.tsx`

修改内容：
1. 新增「清空」按钮（右上角）
2. 日志筛选下拉位置调整到标题右侧
3. 自动滚动开关保留在底部

### 3.6 StatsGrid 组件

**文件**: `src/features/test-control/components/StatsGrid.tsx`

修改布局为 4 列 Grid，每列卡片内容：

| 卡片 | 标题 | 数值 | 底部说明 |
|------|------|------|----------|
| 卡片1 | 执行进度 | 37.5% | 蓝色进度条 + 2/2 |
| 卡片2 | 通过率 | 100% | 2/2 |
| 卡片3 | 总步骤 | 8 | 已完成 2 |
| 卡片4 | 运行时长 | 00:01:32 | iPhone 15 Pro |

---

## 4. 实现计划

### Sub-Plan 1: 数据层更新

**验证标准**: 类型定义和 Store 符合新数据结构

1. 更新 `types/index.ts` - 字段名调整
2. 更新 `executionStore.ts` - 数据结构调整，新增 clearLogs action

### Sub-Plan 2: HeaderToolbar 修正

**验证标准**: 显示开始时间，按钮样式符合设计

1. 新增开始时间显示
2. 调整三个按钮的边框/颜色样式

### Sub-Plan 3: DeviceSimulator 补充

**验证标准**: 底部控制栏显示，输入框有 placeholder

1. 添加底部缩放控制栏
2. 输入框改为 placeholder 样式

### Sub-Plan 4: LogTerminal 补充

**验证标准**: 有清空按钮

1. 在右上角添加「清空」按钮

### Sub-Plan 5: StepListView 优化

**验证标准**: 状态图标正确，高亮样式正确

1. 优化 passed/executing/pending 的图标和颜色
2. 执行中步骤的蓝色高亮边框

### Sub-Plan 6: StatsGrid 调整

**验证标准**: 4 列布局，数值和说明正确

1. 调整卡片内容
2. 进度条显示在执行进度卡片中

---

## 5. 技术栈

| 类别 | 技术 |
|------|------|
| 图标库 | lucide-react (已安装) |
| 样式 | Tailwind CSS v3 (已配置) |
| 状态管理 | Zustand (已配置) |

---

## 6. 验收标准

1. [ ] 侧边栏：8 个菜单项，图标正确，高亮测试控制台
2. [ ] HeaderToolbar：显示任务名、设备、开始时间、状态、3 个样式正确的按钮
3. [ ] DeviceSimulator：iPhone 15 Pro 模拟框，登录 UI，底部控制栏
4. [ ] StepListView：8 个步骤，状态图标正确，executing 高亮
5. [ ] LogTerminal：筛选器、清空按钮、自动滚动开关
6. [ ] StatsGrid：4 列卡片，执行进度 37.5%、通过率 100%、总步骤 8、运行时长 00:01:32
7. [ ] 数据流：store 管理所有状态，组件通过 store 获取数据

---

**下一步**: 审批后执行 Sub-Plan 1 开始实现