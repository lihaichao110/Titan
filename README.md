# 泰坦 Titan

> 下一代跨平台自动化测试控制台

![Tauri](https://img.shields.io/badge/Tauri-2.0-2E3440?style=flat-square&logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-1.75-DEA584?style=flat-square&logo=rust)

## 愿景

泰坦是自动化测试领域的掌控者 —— 一个现代化、高性能的跨平台桌面应用，为测试工程师和开发团队提供流畅、直观的测试流程管理体验。

## 核心特性

### 🎮 设备模拟器
- 支持多设备并行连接与状态监控
- 实时设备信息展示（系统版本、分辨率、状态）
- 直观的设备切换与配置管理

### 📊 执行步骤追踪
- 可视化时间线展示测试进度
- 实时状态更新（完成/执行中/待执行）
- 智能耗时统计与性能分析

### 📝 实时日志
- 秒级日志刷新与展示
- 多级日志过滤（INFO / SUCCESS / ERROR）
- 超长日志智能换行与自动滚动

### 🎨 现代化 UI
- 深色主题设计，减少视觉疲劳
- 流畅的动画与交互反馈
- 响应式布局，适配各种屏幕尺寸

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri 2.0 + React 19 + TypeScript |
| 状态管理 | Zustand 5.0 |
| 样式 | Tailwind CSS + shadcn/ui |
| 组件库 | Radix UI (无头组件) |
| 构建工具 | Vite 7.0 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

```
src/
├── components/ui/      # UI 基础组件
├── features/            # 功能模块
│   └── test-control/     # 测试控制台
│       ├── components/  # 功能组件
│       ├── store/       # 状态管理
│       └── types/       # 类型定义
└── layouts/             # 布局组件
```

## License

MIT
