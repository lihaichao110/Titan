# Titan 测试平台页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现自动化测试平台的完整页面，包括侧边栏、HeaderToolbar、DeviceSimulator、StepListView、LogTerminal、StatsGrid 六个组件，使用 Zustand 状态管理。

**Architecture:** 采用 feature-based 目录结构，组件按业务域划分，共享 UI 组件抽离到 shared/components/，状态管理使用 Zustand store，所有数据通过 props 或 store 传递。

**Tech Stack:** Tauri v2 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Zustand + lucide-react

---

## 文件结构

```
src/
├── docs/
│   ├── 01-plan.md
│   └── superpowers/plans/01-test-control-page.md    ← 本计划
├── features/test-control/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── HeaderToolbar.tsx
│   │   ├── DeviceSimulator.tsx
│   │   ├── StepListView.tsx
│   │   ├── LogTerminal.tsx
│   │   └── StatsGrid.tsx
│   ├── store/
│   │   └── executionStore.ts
│   └── types/
│       └── index.ts
├── shared/components/                               ← shadcn/ui 组件
├── layouts/
│   └── MainLayout.tsx
├── App.tsx
└── main.tsx
```

---

## Task 1: 项目依赖安装

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.js` (待创建)
- Modify: `src/App.tsx`

- [ ] **Step 1: 安装 Zustand**

Run: `cd /Users/lihaichao/Desktop/Titan && pnpm add zustand`

Expected: 成功安装，package.json 中新增 zustand 依赖

- [ ] **Step 2: 初始化 shadcn/ui**

Run: `npx shadcn@latest init`

Expected: 交互式选择配置，使用默认值或以下配置：
- Style: Default
- Base color: Slate
- CSS file: 使用 Tailwind CSS
- CSS 变量前缀: tw-
- 配置输出到 `components.json`

- [ ] **Step 3: 添加 shadcn/ui 组件**

Run: `npx shadcn@latest add button badge scroll-area separator select switch progress tooltip`

Expected: 在 `src/components/ui/` 下生成组件文件

- [ ] **Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml components.json src/components/ui/
git commit -m "feat: setup shadcn/ui and zustand dependencies"
```

---

## Task 2: 类型定义

**Files:**
- Create: `src/features/test-control/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

Create `src/features/test-control/types/index.ts`:

```typescript
export type StepStatus = 'passed' | 'executing' | 'pending';
export type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR';
export type ExecutionStatus = 'running' | 'paused' | 'stopped';

export interface ExecutionStep {
  id: number;
  name: string;
  locator: string;
  status: StepStatus;
  duration: string | null;
  detail: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface StatsData {
  executionProgress: { percentage: number; detail: string };
  passRate: { rate: string; detail: string };
  stepsInfo: { total: number; completed: number };
  deviceFooter: { name: string; os: string };
}

export interface ExecutionContext {
  taskName: string;
  environment: string;
  status: ExecutionStatus;
  startTime: string;
  elapsedTime: string;
  steps: ExecutionStep[];
  logs: LogEntry[];
  stats: StatsData;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  avatar_url: string;
}

export interface DeviceContent {
  title: string;
  fields: { label: string; value: string }[];
  action_button: string;
  third_party_login: string[];
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/types/index.ts
git commit -m "feat: add type definitions for test-control"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `src/features/test-control/store/executionStore.ts`

- [ ] **Step 1: 创建 Zustand Store**

Create `src/features/test-control/store/executionStore.ts`:

```typescript
import { create } from 'zustand';
import type { ExecutionContext, ExecutionStep, LogEntry, StatsData } from '../types';

const initialSteps: ExecutionStep[] = [
  { id: 1, name: '启动应用', locator: 'com.example.app', status: 'passed', duration: '00:00:02', detail: '' },
  { id: 2, name: '点击登录按钮', locator: 'id: btn_login', status: 'passed', duration: '00:00:01', detail: '' },
  { id: 3, name: '输入手机号', locator: '138****8888', status: 'executing', duration: '00:00:03', detail: '正在执行...' },
  { id: 4, name: '输入密码', locator: '**********', status: 'pending', duration: null, detail: '等待中' },
  { id: 5, name: '点击登录', locator: 'id: btn_submit', status: 'pending', duration: null, detail: '等待中' },
  { id: 6, name: '验证登录结果', locator: '检查首页元素', status: 'pending', duration: null, detail: '等待中' },
  { id: 7, name: '截图保存', locator: '保存登录成功页面', status: 'pending', duration: null, detail: '等待中' },
  { id: 8, name: '结束应用', locator: '关闭应用进程', status: 'pending', duration: null, detail: '等待中' },
];

const initialLogs: LogEntry[] = [
  { timestamp: '14:30:22', level: 'INFO', message: '开始执行测试任务：用户登录流程测试' },
  { timestamp: '14:30:23', level: 'INFO', message: '设备连接成功：iPhone 15 Pro (iOS 17.4.1)' },
  { timestamp: '14:30:25', level: 'INFO', message: '启动应用：com.example.app' },
  { timestamp: '14:30:27', level: 'INFO', message: '应用启动成功' },
  { timestamp: '14:30:28', level: 'INFO', message: '执行步骤 1：启动应用' },
  { timestamp: '14:30:30', level: 'SUCCESS', message: '步骤 1 执行通过 (耗时: 2.0s)' },
  { timestamp: '14:30:30', level: 'INFO', message: '执行步骤 2：点击登录按钮' },
  { timestamp: '14:30:31', level: 'SUCCESS', message: '步骤 2 执行通过 (耗时: 1.2s)' },
  { timestamp: '14:30:32', level: 'INFO', message: '执行步骤 3：输入手机号' },
  { timestamp: '14:30:32', level: 'INFO', message: '找到输入框：id=input_phone' },
  { timestamp: '14:30:33', level: 'INFO', message: '输入框内容：138****8888' },
  { timestamp: '14:30:33', level: 'INFO', message: '正在验证输入结果...' },
];

const initialStats: StatsData = {
  executionProgress: { percentage: 37.5, detail: '3/8' },
  passRate: { rate: '100%', detail: '2/2' },
  stepsInfo: { total: 8, completed: 2 },
  deviceFooter: { name: 'iPhone 15 Pro', os: 'iOS 17.4.1' },
};

const initialContext: ExecutionContext = {
  taskName: '用户登录流程测试',
  environment: 'iPhone 15 Pro (iOS 17.4.1)',
  status: 'running',
  startTime: '2024-05-20 14:30:22',
  elapsedTime: '00:01:32',
  steps: initialSteps,
  logs: initialLogs,
  stats: initialStats,
};

interface ExecutionStore {
  context: ExecutionContext;
  activeMenuId: string;
  logFilter: LogLevel | 'ALL';
  autoScroll: boolean;
  setActiveMenu: (id: string) => void;
  setLogFilter: (filter: LogLevel | 'ALL') => void;
  setAutoScroll: (enabled: boolean) => void;
  updateStepStatus: (stepId: number, status: ExecutionStep['status']) => void;
  addLog: (log: LogEntry) => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  context: initialContext,
  activeMenuId: 'test_control',
  logFilter: 'ALL',
  autoScroll: true,
  setActiveMenu: (id) => set({ activeMenuId: id }),
  setLogFilter: (filter) => set({ logFilter: filter }),
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  updateStepStatus: (stepId, status) =>
    set((state) => ({
      context: {
        ...state.context,
        steps: state.context.steps.map((step) =>
          step.id === stepId ? { ...step, status } : step
        ),
      },
    })),
  addLog: (log) =>
    set((state) => ({
      context: {
        ...state.context,
        logs: [...state.context.logs, log],
      },
    })),
}));
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/store/executionStore.ts
git commit -m "feat: add executionStore with zustand"
```

---

## Task 4: MainLayout 组件

**Files:**
- Create: `src/layouts/MainLayout.tsx`

- [ ] **Step 1: 创建 MainLayout 组件**

Create `src/layouts/MainLayout.tsx`:

```tsx
import type { ReactNode } from 'react';

interface MainLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - 240px fixed width */}
      <aside className="w-60 flex-shrink-0">{sidebar}</aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/layouts/MainLayout.tsx
git commit -m "feat: add MainLayout component"
```

---

## Task 5: Sidebar 组件

**Files:**
- Create: `src/features/test-control/components/Sidebar.tsx`

- [ ] **Step 1: 创建 Sidebar 组件**

Create `src/features/test-control/components/Sidebar.tsx`:

```tsx
import { PlaySquare, Task, NodeExpand, Database, FileText, Api, Box, Settings } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import type { MenuItem } from '../types';

const iconMap: Record<string, typeof PlaySquare> = {
  PlaySquare,
  Task,
  NodeExpand,
  Database,
  FileText,
  Api,
  Box,
  Settings,
};

const menuItems: MenuItem[] = [
  { id: 'test_control', label: '测试控制台', icon: 'PlaySquare', active: true },
  { id: 'tasks', label: '测试任务', icon: 'Task', active: false },
  { id: 'scripts', label: '测试编排', icon: 'NodeExpand', active: false },
  { id: 'devices', label: '设备管理', icon: 'Database', active: false },
  { id: 'reports', label: '测试报告', icon: 'FileText', active: false },
  { id: 'api_mgmt', label: '接口管理', icon: 'Api', active: false },
  { id: 'projects', label: '项目管理', icon: 'Box', active: false },
  { id: 'settings', label: '设置中心', icon: 'Settings', active: false },
];

export function Sidebar() {
  const { activeMenuId, setActiveMenu } = useExecutionStore();

  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Titan</div>
            <div className="text-slate-500 text-xs">自动化测试平台</div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = activeMenuId === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=TestMaster"
            alt="avatar"
            className="w-8 h-8 rounded-full bg-slate-700"
          />
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">TestMaster</div>
            <div className="text-slate-500 text-xs">管理员</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/Sidebar.tsx
git commit -m "feat: add Sidebar component"
```

---

## Task 6: HeaderToolbar 组件

**Files:**
- Create: `src/features/test-control/components/HeaderToolbar.tsx`

- [ ] **Step 1: 创建 HeaderToolbar 组件**

Create `src/features/test-control/components/HeaderToolbar.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '../store/executionStore';

export function HeaderToolbar() {
  const { context } = useExecutionStore();
  const { taskName, environment, status, elapsedTime } = context;

  const statusColors: Record<string, string> = {
    running: 'bg-blue-500',
    paused: 'bg-yellow-500',
    stopped: 'bg-red-500',
  };

  return (
    <header className="h-15 px-6 flex items-center justify-between border-b border-slate-200 bg-white">
      {/* Left: Task info */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{taskName}</h1>
          <p className="text-sm text-slate-500">{environment}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
          <Badge variant={status === 'running' ? 'default' : 'secondary'}>
            {status === 'running' ? '运行中' : status === 'paused' ? '已暂停' : '已停止'}
          </Badge>
        </div>

        <div className="text-sm text-slate-600">
          已执行: <span className="font-medium text-slate-900">{elapsedTime}</span>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="destructive" size="sm">
          停止
        </Button>
        <Button variant="secondary" size="sm">
          暂停
        </Button>
        <Button variant="outline" size="sm">
          重新执行
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/HeaderToolbar.tsx
git commit -m "feat: add HeaderToolbar component"
```

---

## Task 7: DeviceSimulator 组件

**Files:**
- Create: `src/features/test-control/components/DeviceSimulator.tsx`

- [ ] **Step 1: 创建 DeviceSimulator 组件**

Create `src/features/test-control/components/DeviceSimulator.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ZoomIn, ZoomOut, RotateCcw, Camera, Smartphone } from 'lucide-react';

export function DeviceSimulator() {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-900">iPhone 15 Pro</span>
        </div>
        <span className="text-xs text-slate-500">iOS 17.4.1</span>
      </div>

      {/* Device Frame */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="relative w-[260px] h-[560px] bg-slate-900 rounded-[40px] p-2 shadow-xl">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
            {/* Notch */}
            <div className="h-8 bg-slate-900 flex items-center justify-center">
              <div className="w-20 h-6 bg-black rounded-full" />
            </div>

            {/* App Content */}
            <div className="p-6 flex flex-col h-full">
              {/* Login Form */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 text-center mt-4">欢迎回来</h2>

                <div className="mt-8 space-y-4">
                  <div className="bg-slate-100 rounded-xl p-4">
                    <label className="text-xs text-slate-500 mb-1 block">手机号码</label>
                    <div className="text-sm text-slate-900">138****8888</div>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-4">
                    <label className="text-xs text-slate-500 mb-1 block">密码</label>
                    <div className="text-sm text-slate-900">**********</div>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">登录</Button>

                {/* Third-party login */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  {['微信', 'QQ', 'Apple'].map((provider) => (
                    <div
                      key={provider}
                      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
                    >
                      <span className="text-xs text-slate-600">{provider[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 border-t border-slate-200">
        <Separator className="mb-3" />
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-600 w-12 text-center">100%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/DeviceSimulator.tsx
git commit -m "feat: add DeviceSimulator component"
```

---

## Task 8: StepListView 组件

**Files:**
- Create: `src/features/test-control/components/StepListView.tsx`

- [ ] **Step 1: 创建 StepListView 组件**

Create `src/features/test-control/components/StepListView.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExecutionStore } from '../store/executionStore';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const statusConfig = {
  passed: {
    icon: CheckCircle2,
    badge: 'default' as const,
    textColor: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  executing: {
    icon: Loader2,
    badge: 'default' as const,
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  pending: {
    icon: Circle,
    badge: 'secondary' as const,
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200',
  },
};

export function StepListView() {
  const { context } = useExecutionStore();
  const { steps } = context;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-900">执行步骤</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          共 {steps.length} 步，已完成 {steps.filter((s) => s.status === 'passed').length}
        </p>
      </div>

      {/* Step List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isExecuting = step.status === 'executing';

            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isExecuting ? config.bgColor : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Step number */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                      isExecuting
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isExecuting ? 'text-blue-600' : 'text-slate-900'
                        }`}
                      >
                        {step.name}
                      </span>
                      {isExecuting && (
                        <Icon className="w-3 h-3 text-blue-600 animate-spin" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {step.locator}
                    </div>

                    {step.detail && (
                      <div className="text-xs text-blue-600 mt-1">{step.detail}</div>
                    )}
                  </div>

                  {/* Duration */}
                  {step.duration && (
                    <Badge variant="secondary" className="text-xs">
                      {step.duration}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/StepListView.tsx
git commit -m "feat: add StepListView component"
```

---

## Task 9: LogTerminal 组件

**Files:**
- Create: `src/features/test-control/components/LogTerminal.tsx`

- [ ] **Step 1: 创建 LogTerminal 组件**

Create `src/features/test-control/components/LogTerminal.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExecutionStore } from '../store/executionStore';
import type { LogLevel } from '../types';
import { Label } from '@/components/ui/label';

const levelColors: Record<LogLevel, string> = {
  INFO: 'text-blue-500',
  SUCCESS: 'text-emerald-500',
  ERROR: 'text-red-500',
};

export function LogTerminal() {
  const { context, logFilter, autoScroll, setLogFilter, setAutoScroll } = useExecutionStore();
  const { logs } = context;
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter((l) => l.level === logFilter);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-lg border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">实时日志</h3>

          <div className="flex items-center gap-4">
            {/* Log level filter */}
            <Select
              value={logFilter}
              onValueChange={(v) => setLogFilter(v as LogLevel | 'ALL')}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>

            {/* Auto-scroll toggle */}
            <div className="flex items-center gap-2">
              <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll" className="text-xs text-slate-600">
                自动滚动
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="flex-1 px-2 py-2" ref={scrollRef}>
        <div className="font-mono text-xs space-y-1">
          {filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 px-2 py-1 hover:bg-slate-100 rounded">
              <span className="text-slate-400">{log.timestamp}</span>
              <span className={`font-medium ${levelColors[log.level]}`}>
                [{log.level}]
              </span>
              <span className="text-slate-700">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/LogTerminal.tsx
git commit -m "feat: add LogTerminal component"
```

---

## Task 10: StatsGrid 组件

**Files:**
- Create: `src/features/test-control/components/StatsGrid.tsx`

- [ ] **Step 1: 创建 StatsGrid 组件**

Create `src/features/test-control/components/StatsGrid.tsx`:

```tsx
import { Progress } from '@/components/ui/progress';
import { useExecutionStore } from '../store/executionStore';

export function StatsGrid() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-white border-t border-slate-200">
      {/* Execution Progress */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">执行进度</div>
        <Progress value={stats.executionProgress.percentage} className="h-2" />
        <div className="text-sm font-medium text-slate-900 mt-2">
          {stats.executionProgress.detail}
        </div>
      </div>

      {/* Pass Rate */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">通过率</div>
        <div className="text-2xl font-bold text-green-600">{stats.passRate.rate}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.passRate.detail}</div>
      </div>

      {/* Steps Info */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">总步骤/已完成</div>
        <div className="text-2xl font-bold text-slate-900">
          {stats.stepsInfo.completed}
          <span className="text-base font-normal text-slate-400">/{stats.stepsInfo.total}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">步骤数</div>
      </div>

      {/* Device Info */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">运行时长</div>
        <div className="text-2xl font-bold text-slate-900">{context.elapsedTime}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.deviceFooter.name}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/features/test-control/components/StatsGrid.tsx
git commit -m "feat: add StatsGrid component"
```

---

## Task 11: 更新 App.tsx 并集成所有组件

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 更新 App.tsx**

```tsx
import { MainLayout } from './layouts/MainLayout';
import { Sidebar } from './features/test-control/components/Sidebar';
import { HeaderToolbar } from './features/test-control/components/HeaderToolbar';
import { DeviceSimulator } from './features/test-control/components/DeviceSimulator';
import { StepListView } from './features/test-control/components/StepListView';
import { LogTerminal } from './features/test-control/components/LogTerminal';
import { StatsGrid } from './features/test-control/components/StatsGrid';

function App() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      {/* HeaderToolbar */}
      <HeaderToolbar />

      {/* Content Grid - 3 columns */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 min-h-0">
        <DeviceSimulator />
        <StepListView />
        <LogTerminal />
      </div>

      {/* Stats Grid */}
      <StatsGrid />
    </MainLayout>
  );
}

export default App;
```

- [ ] **Step 2: 验证开发服务器启动**

Run: `pnpm dev`

Expected: 开发服务器启动成功，访问 http://localhost:5173 可以看到完整页面

- [ ] **Step 3: 提交**

```bash
git add src/App.tsx
git commit -m "feat: integrate all components in App"
```

---

## Task 12: 验证和测试

- [ ] **Step 1: 验证页面渲染**

打开浏览器访问 http://localhost:5173，验证：
1. 侧边栏：深色背景、Logo、8 个菜单项、用户信息，当前激活项高亮
2. HeaderToolbar：任务名、环境、运行状态、已用时间、3 个按钮
3. DeviceSimulator：iPhone 15 Pro 模拟框，登录界面
4. StepListView：8 个步骤，状态正确显示
5. LogTerminal：12 条日志，筛选和自动滚动功能正常
6. StatsGrid：4 个卡片，进度条显示

- [ ] **Step 2: 验证交互功能**

1. 点击侧边栏菜单，验证高亮切换
2. 选择日志级别筛选，验证过滤效果
3. 开关自动滚动，验证日志区域滚动行为

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: complete test-control page implementation"
```

---

## 验收标准

1. [ ] 侧边栏：深色背景(#0F172A)、Logo、8 个菜单项（带图标）、用户信息，正确高亮当前激活项(blue-600)
2. [ ] HeaderToolbar：任务名、环境信息、运行状态、已用时间、3 个操作按钮
3. [ ] DeviceSimulator：iPhone 15 Pro 模拟框(260x560)，圆角40px，显示登录界面内容
4. [ ] StepListView：8 个步骤，状态正确显示(passed/executing/pending)，executing 步骤高亮
5. [ ] LogTerminal：12 条日志，INFO(blue)/SUCCESS(emerald)/ERROR(red) 颜色区分，筛选和自动滚动可用
6. [ ] StatsGrid：4 个卡片，执行进度(37.5%)、通过率(100%)、步骤统计、运行时长
7. [ ] 整体布局：横向 Flex + CSS Grid 三列(1:1:1)，响应式正常

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?