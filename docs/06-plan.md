# 项目目录重构与路由配置方案

## Context

当前 `src` 目录结构较为扁平，缺少路由机制，所有页面组件都堆在 App.tsx 中。项目需要企业级目录规范，并配置路由系统，默认展示首页（当前的 test-control 页面）。

## 现状分析

```
src/
├── App.tsx           # 入口组件，所有页面都在这里
├── main.tsx          # React DOM 挂载
├── layouts/          # 布局组件
│   └── MainLayout.tsx
├── components/       # 公共 UI 组件
│   └── ui/           # Radix UI 组件封装
├── features/         # 功能模块
│   └── test-control/ # 测试控制功能（含多个组件）
├── lib/              # 工具函数
└── assets/           # 静态资源
```

## 推荐方案

### 目录结构

```
src/
├── app/                      # 应用入口层
│   ├── App.tsx               # 路由配置 + 根布局
│   ├── routes.tsx             # 路由定义
│   └── root.tsx              # 根组件（外层 Provider）
├── pages/                    # 页面组件（路由目标）
│   ├── home/                 # 首页
│   │   └── HomePage.tsx
│   └── test-control/         # 测试控制页
│       └── TestControlPage.tsx
├── layouts/                  # 布局组件
│   └── MainLayout.tsx
├── components/                # 公共组件
│   └── ui/                    # UI 组件库
├── features/                  # 功能模块（可复用业务组件）
│   └── test-control/
│       ├── components/        # test-control 专属子组件
│       │   ├── DeviceSimulator.tsx
│       │   ├── StepListView.tsx
│       │   ├── LogTerminal.tsx
│       │   ├── StatsGrid.tsx
│       │   ├── Sidebar.tsx
│       │   └── HeaderToolbar.tsx
│       └── store/            # 功能模块状态
│           └── executionStore.ts
├── lib/                       # 工具函数
│   └── utils.ts
└── main.tsx                   # DOM 挂载（保持不变）
```

### 路由配置

使用 `react-router-dom` v7（最新稳定版）：

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页（当前 test-control 页面） |
| `/test-control` | TestControlPage | 测试控制（可扩展为多实例） |

### 关键文件改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/routes.tsx` | 新增 | 路由定义（使用 React Router v7） |
| `src/app/App.tsx` | 新增 | 路由配置 + 根布局包裹 |
| `src/pages/home/HomePage.tsx` | 新增 | 首页（当前 test-control 内容） |
| `src/pages/test-control/TestControlPage.tsx` | 新增 | 测试控制页面（聚合现有组件） |
| `src/main.tsx` | 修改 | 改为使用 BrowserRouter |
| `src/layouts/MainLayout.tsx` | 暂不变 | Sidebar 仍作为 prop 传入，后续可改为 Outlet |

### 技术选型

- **路由库**: `react-router-dom` v7（标准且成熟）
- **路由模式**: BrowserRouter（使用 history 模式，对 Tauri 友好）

## 实施步骤

1. 安装依赖：`pnpm add react-router-dom`
2. 创建 `src/app/routes.tsx` 定义路由
3. 创建 `src/pages/home/HomePage.tsx` 聚合 test-control 组件
4. 修改 `src/app/App.tsx` 配置路由和布局
5. 修改 `src/main.tsx` 使用 BrowserRouter
6. 可选：后续将 Sidebar 改为通过路由配置自动渲染

## 验证方式

```bash
pnpm dev
# 访问 http://localhost:14237 确认默认展示首页
# 访问 http://localhost:14237/test-control 确认测试控制页
```