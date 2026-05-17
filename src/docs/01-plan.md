# Titan 自动化测试平台 - 页面实现方案

**版本**: 1.0.0
**日期**: 2026-05-17
**状态**: 已批准

---

## 1. 概述

实现一个 Tauri + React + TypeScript 的自动化测试平台页面，采用企业级目录结构和可迭代开发模式。

### 1.1 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | Tauri v2 + React 19 + TypeScript | 现有项目 |
| UI 组件库 | shadcn/ui + Tailwind CSS | 企业级设计 |
| 图标 | lucide-react | shadcn/ui 默认搭配 |
| 样式 | Tailwind CSS | 支持自定义主题色 |
| 状态管理 | Zustand | 轻量级、TypeScript 友好 |

### 1.2 视觉风格

**写实风格** — 模拟真实 iPhone 设备外观，深色侧边栏带微妙渐变，阴影和边框较重，视觉上更丰富，体现专业测试工具的控制感。

---

## 2. 目录结构

```
src/
├── docs/01-plan.md              ← 本方案文档
├── features/
│   └── test-control/
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── HeaderToolbar.tsx
│       │   ├── DeviceSimulator.tsx
│       │   ├── StepListView.tsx
│       │   ├── LogTerminal.tsx
│       │   └── StatsGrid.tsx
│       ├── store/
│       │   └── executionStore.ts    ← Zustand store
│       └── types/
│           └── index.ts
├── shared/
│   ├── components/               ← 通用 UI 组件 (基于 shadcn/ui)
│   └── lib/
│       └── utils.ts
├── layouts/
│   └── MainLayout.tsx
├── App.tsx
└── main.tsx
```

---

## 3. 组件架构

```
App
└── MainLayout (横向 Flex: sidebar + main)
    ├── Sidebar
    │   ├── Logo
    │   ├── MenuList (带 active 状态)
    │   └── UserProfile
    └── MainContent (垂直 Flex)
        ├── HeaderToolbar (任务名、环境、状态、按钮组)
        ├── ContentGrid (CSS Grid 3 列)
        │   ├── DeviceSimulator (iPhone 模拟框)
        │   ├── StepListView (步骤列表)
        │   └── LogTerminal (日志终端)
        └── StatsGrid (4 个统计卡片)
```

---

## 4. shadcn/ui 组件 + 依赖清单

```bash
# 安装 zustand
pnpm add zustand

# shadcn/ui 组件
npx shadcn@latest add button badge scroll-area separator select switch progress tooltip
```

---

## 5. 布局规格

### 5.1 整体布局

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar (240px fixed) │         MainContent Area               │
│                        │  ┌──────────────────────────────────┐  │
│  - Logo                │  │     HeaderToolbar (60px)         │  │
│  - Menu Items          │  ├─────────┬─────────┬──────────────┤  │
│  - User Profile        │  │ Device  │  Steps  │    Logs      │  │
│                        │  │(1/3)    │ (1/3)   │   (1/3)      │  │
│                        │  ├─────────┴─────────┴──────────────┤  │
│                        │  │       StatsGrid (80px)           │  │
│                        │  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 颜色规格

| 用途 | 色值 | Tailwind |
|------|------|----------|
| 主色/品牌色 | #2563EB | blue-600 |
| 成功/通过 | #16A34A | green-600 |
| 运行中/警告 | #2563EB | blue-500 |
| 等待中 | #9CA3AF | gray-400 |
| 侧边栏背景 | #0F172A | slate-900 |
| 主内容区背景 | #F8FAFC | slate-50 |
| 日志 SUCCESS | #10B981 | emerald-500 |
| 日志 INFO | #3B82F6 | blue-500 |

---

## 6. 数据结构

```typescript
interface ExecutionContext {
  taskName: string;
  environment: string;
  status: 'running' | 'paused' | 'stopped';
  startTime: string;
  elapsedTime: string;
  steps: ExecutionStep[];
  logs: LogEntry[];
  stats: StatsData;
}

interface ExecutionStep {
  id: number;
  name: string;
  locator: string;
  status: 'passed' | 'executing' | 'pending';
  duration: string | null;
  detail: string;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'ERROR';
  message: string;
}

interface StatsData {
  executionProgress: { percentage: number; detail: string };
  passRate: { rate: string; detail: string };
  stepsInfo: { total: number; completed: number };
  deviceFooter: { name: string; os: string };
}
```

---

## 7. 实现计划

### Sub-Plan 1: 项目基础搭建

**验证标准**: shadcn/ui 组件可以正常渲染，Tailwind 主题色生效

1. 安装 shadcn/ui CLI
2. 初始化 shadcn/ui 配置
3. 添加组件: `button badge scroll-area separator select switch progress tooltip`
4. 验证基础组件渲染

### Sub-Plan 2: 布局层

**验证标准**: 页面整体骨架呈现，Flex 布局正确

1. 创建 `MainLayout` 组件
2. 创建 `Sidebar` 组件（深色背景、Logo、菜单列表、用户信息）
3. 创建 `HeaderToolbar` 组件（任务信息栏 + 按钮组）
4. 组装完整布局

### Sub-Plan 3: 内容区组件

**验证标准**: 三个区域各自渲染正确，样式符合设计稿

1. 创建 `DeviceSimulator` 组件
   - iPhone 15 Pro 模拟框
   - 应用登录界面内容
   - 工具栏（缩放、旋转、截图）

2. 创建 `StepListView` 组件
   - 步骤列表渲染
   - 状态标识（passed/executing/pending）
   - 当前执行步骤高亮

3. 创建 `LogTerminal` 组件
   - 日志列表渲染
   - 日志级别筛选
   - 自动滚动开关

### Sub-Plan 4: 底部统计 + 数据接入

**验证标准**: 所有数据按 ui_data JSON 正确渲染，交互功能可用

1. 创建 `StatsGrid` 组件
   - 4 个统计卡片
   - 进度条组件

2. 创建 `executionStore` (Zustand store)
   - 状态管理
   - 数据初始化
   - Actions: startExecution, pauseExecution, stopExecution, addLog 等

3. 集成 ui_data 数据
4. 验证所有组件数据渲染正确

---

## 8. UI 数据 (用于开发验证)

```json
{
  "app_info": {
    "name": "Titan 自动化测试平台",
    "version": "1.0.0"
  },
  "sidebar_menu": [
    { "id": "test_control", "label": "测试控制台", "icon": "PlaySquare", "active": true },
    { "id": "tasks", "label": "测试任务", "icon": "Task", "active": false },
    { "id": "scripts", "label": "测试编排", "icon": "NodeExpand", "active": false },
    { "id": "devices", "label": "设备管理", "icon": "Database", "active": false },
    { "id": "reports", "label": "测试报告", "icon": "FileText", "active": false },
    { "id": "api_mgmt", "label": "接口管理", "icon": "Api", "active": false },
    { "id": "projects", "label": "项目管理", "icon": "Box", "active": false },
    { "id": "settings", "label": "设置中心", "icon": "Settings", "active": false }
  ],
  "user_profile": {
    "name": "TestMaster",
    "role": "管理员",
    "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=TestMaster"
  },
  "execution_context": {
    "task_name": "用户登录流程测试",
    "environment": "iPhone 15 Pro (iOS 17.4.1)",
    "status": "running",
    "start_time": "2024-05-20 14:30:22",
    "elapsed_time": "00:01:32",
    "actions": ["停止", "暂停", "重新执行"]
  },
  "device_simulator": {
    "model": "iPhone 15 Pro",
    "orientation": "portrait",
    "scale": 100,
    "current_screen": "login_screen",
    "content": {
      "title": "欢迎回来",
      "fields": [
        { "label": "手机号码", "value": "138****8888" },
        { "label": "密码", "value": "**********" }
      ],
      "action_button": "登录",
      "third_party_login": ["微信", "QQ", "Apple"]
    }
  },
  "execution_steps": [
    { "id": 1, "name": "启动应用", "locator": "com.example.app", "status": "passed", "duration": "00:00:02", "detail": "" },
    { "id": 2, "name": "点击登录按钮", "locator": "id: btn_login", "status": "passed", "duration": "00:00:01", "detail": "" },
    { "id": 3, "name": "输入手机号", "locator": "138****8888", "status": "executing", "duration": "00:00:03", "detail": "正在执行..." },
    { "id": 4, "name": "输入密码", "locator": "**********", "status": "pending", "duration": null, "detail": "等待中" },
    { "id": 5, "name": "点击登录", "locator": "id: btn_submit", "status": "pending", "duration": null, "detail": "等待中" },
    { "id": 6, "name": "验证登录结果", "locator": "检查首页元素", "status": "pending", "duration": null, "detail": "等待中" },
    { "id": 7, "name": "截图保存", "locator": "保存登录成功页面", "status": "pending", "duration": null, "detail": "等待中" },
    { "id": 8, "name": "结束应用", "locator": "关闭应用进程", "status": "pending", "duration": null, "detail": "等待中" }
  ],
  "real_time_logs": [
    { "timestamp": "14:30:22", "level": "INFO", "message": "开始执行测试任务：用户登录流程测试" },
    { "timestamp": "14:30:23", "level": "INFO", "message": "设备连接成功：iPhone 15 Pro (iOS 17.4.1)" },
    { "timestamp": "14:30:25", "level": "INFO", "message": "启动应用：com.example.app" },
    { "timestamp": "14:30:27", "level": "INFO", "message": "应用启动成功" },
    { "timestamp": "14:30:28", "level": "INFO", "message": "执行步骤 1：启动应用" },
    { "timestamp": "14:30:30", "level": "SUCCESS", "message": "步骤 1 执行通过 (耗时: 2.0s)" },
    { "timestamp": "14:30:30", "level": "INFO", "message": "执行步骤 2：点击登录按钮" },
    { "timestamp": "14:30:31", "level": "SUCCESS", "message": "步骤 2 执行通过 (耗时: 1.2s)" },
    { "timestamp": "14:30:32", "level": "INFO", "message": "执行步骤 3：输入手机号" },
    { "timestamp": "14:30:32", "level": "INFO", "message": "找到输入框：id=input_phone" },
    { "timestamp": "14:30:33", "level": "INFO", "message": "输入框内容：138****8888" },
    { "timestamp": "14:30:33", "level": "INFO", "message": "正在验证输入结果..." }
  ],
  "stats_card": {
    "execution_progress": { "percentage": 37.5, "detail": "3/8" },
    "pass_rate": { "rate": "100%", "detail": "2/2" },
    "steps_info": { "total": 8, "completed": 2 },
    "device_footer": { "name": "iPhone 15 Pro", "os": "iOS 17.4.1" }
  }
}
```

---

## 9. 验收标准

1. 侧边栏：深色背景、Logo、8 个菜单项（带图标）、用户信息，正确高亮当前激活项
2. HeaderToolbar：任务名、环境信息、运行状态、已用时间、3 个操作按钮
3. DeviceSimulator：iPhone 15 Pro 模拟框，显示登录界面内容
4. StepListView：8 个步骤，状态正确显示（passed/executing/pending）
5. LogTerminal：12 条日志，级别颜色正确，有筛选和自动滚动控制
6. StatsGrid：4 个卡片，进度条 37.5%，通过率 100%
7. 整体布局：横向 Flex + CSS Grid 三列，响应式正常

---

**下一步**: 开始实现 Sub-Plan 1 (项目基础搭建)