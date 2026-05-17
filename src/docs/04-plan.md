# Titan 测试平台 - 页面修改方案 (v4)

**版本**: 4.0.0
**日期**: 2026-05-17
**状态**: 待审批

---

## 1. 修改概述

基于 v3 实现，修复布局与细节问题。重点：侧边栏固定、页面滚动控制、执行步骤改为连续流程样式。

**无需安装新组件**，所有修改通过样式调整完成。

---

## 2. 侧边栏修复

### 2.1 规格参数

```css
width: 220px
position: fixed
left: 0
top: 0
bottom: 0
z-index: 100
overflow: hidden
```

### 2.2 布局变化

- 侧边栏脱离文档流，使用 fixed 定位
- 主内容区域增加 `margin-left: 220px`
- 侧边栏自身禁止滚动
- 底部用户信息固定在侧边栏底部

---

## 3. 页面滚动与横向溢出修复

### 3.1 全局容器

```css
html, body {
  overflow-x: hidden;
}
```

### 3.2 主容器

```css
.main-wrapper {
  margin-left: 220px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}
```

### 3.3 Flex/Grid 子元素

```css
/* 所有子元素添加 */
min-width: 0
box-sizing: border-box
```

### 3.4 适配分辨率

- 1920px
- 1440px
- 1280px

---

## 4. 执行步骤模块样式修复（核心）

### 4.1 整体设计

改为 "连续纵向流程样式"，参考 Jenkins Pipeline / GitHub Actions / Linear Timeline

### 4.2 新结构

```
┌─────────────────────────────────┐
│  执行步骤                        │  ← 标题区 56px
│  共 8 步，已完成 2 步            │  ← 副标题
├─────────────────────────────────┤
│                                 │
│  ○──── 启动应用                  │  ← 已完成（绿色节点）
│  │    com.example.app            │
│  │    00:00:02                   │
│  │                               │
│  ●──── 点击登录按钮               │  ← 执行中（蓝色节点+高亮）
│  │    id: btn_login              │
│  │    00:00:01                   │
│  │                               │
│  ○──── 输入手机号                 │  ← 等待中（灰色节点）
│        138****8888               │
│                                 │
└─────────────────────────────────┘
```

### 4.3 步骤节点样式

```css
/* 圆形节点 */
width: 20px
height: 20px
border-radius: 50%

/* 已完成：绿色边框 + 白色填充 */
border: 2px solid #16A34A
bg: white

/* 执行中：蓝色填充 + 白色图标 */
border: 2px solid #2563FF
bg: #2563FF

/* 等待中：灰色边框 + 灰色填充 */
border: 2px solid #D1D5DB
bg: #F3F4F6
```

### 4.4 纵向连接线

```css
width: 2px
height: 100%
bg: #E5E7EB
position: absolute
left: 9px
top: 20px
```

### 4.5 步骤项结构

```css
display: flex
align-items: flex-start
gap: 16px
padding: 16px 20px
```

### 4.6 状态样式

**执行中**：
- 背景：#F0F5FF（浅蓝）
- 左侧节点高亮
- 蓝色节点

**已完成**：
- 无背景高亮
- 绿色 CheckCircle2 图标

**等待中**：
- 无背景高亮
- 灰色文字

---

## 5. 执行步骤模块布局

### 5.1 标题区域

```css
height: 56px
padding: 0 20px
border-bottom: 1px solid #E5E7EB
```

### 5.2 内容区域

```css
padding: 16px 20px
```

### 5.3 步骤项

```css
min-height: 72px
gap: 16px
```

---

## 6. 设备屏幕模块微调

### 6.1 手机尺寸

整体缩小 5%：
```css
width: 228px  /* 原 240px */
height: 456px /* 原 480px */
```

### 6.2 布局

- 垂直水平居中
- 底部工具栏固定
- 不被压缩

---

## 7. 实时日志模块微调

### 7.1 日志样式

```css
font-size: 13px
line-height: 28px
padding-top/bottom: 减少
```

### 7.2 标签尺寸

```css
font-size: 10px
padding: 2px 6px
```

---

## 8. 整体布局比例优化

### 8.1 三列比例

| 模块 | 占比 |
|------|------|
| 设备屏幕 | 34% |
| 执行步骤 | 33% |
| 实时日志 | 33% |

### 8.2 间距

```css
gap: 20px
```

---

## 9. 组件修改清单

### 9.1 MainLayout

修改：
- 移除侧边栏宽度设置（改由 sidebar 自己控制）
- 主内容增加 `margin-left: 220px`

### 9.2 Sidebar

修改：
- `position: fixed`
- `width: 220px`
- `z-index: 100`
- `overflow: hidden`
- 内部布局调整

### 9.3 App.tsx / MainLayout

修改：
- 全局页面禁止横向滚动
- 主容器 `overflow-x: hidden`

### 9.4 StepListView（核心重构）

重构为连续流程样式：
- 移除卡片式设计
- 改为节点+连接线布局
- 左侧状态节点，右侧内容

### 9.5 DeviceSimulator

微调：
- 手机尺寸缩小 5%

### 9.6 LogTerminal

微调：
- 字体 13px
- 行高 28px

---

## 10. 实现计划

### Sub-Plan 1: 侧边栏固定 + 主容器调整

1. Sidebar：position fixed, width 220px, overflow hidden
2. MainLayout/App：主内容增加 margin-left: 220px
3. 页面容器：overflow-x: hidden

### Sub-Plan 2: 执行步骤模块重构

1. 移除卡片式设计
2. 实现节点+连接线布局
3. 状态样式调整

### Sub-Plan 3: 微调

1. DeviceSimulator：手机缩小 5%
2. LogTerminal：字体行高调整
3. 三列比例 34/33/33

---

## 11. 验收标准

1. [ ] 侧边栏固定不滚动，220px 宽
2. [ ] 页面无横向滚动条
3. [ ] 执行步骤为连续流程样式（节点+连接线）
4. [ ] 三列比例 34/33/33
5. [ ] 设备屏幕手机缩小 5%
6. [ ] 日志字体 13px，行高 28px
7. [ ] 适配 1920px/1440px/1280px

---

**下一步**: 审批后执行实现