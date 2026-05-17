# StepListView 时间线组件重构方案

## Context

当前 StepListView 组件的时间线使用 flex 布局实现，但随着内容增加导致高度变化时，连接线会出现断连问题。需要重新设计为更稳定的三列布局，完全按照参考图的高保真设计实现。

## 设计规格

### 整体布局
- 外层卡片：圆角白色卡片，背景 `#f7f8fa`
- 三列布局：`w-12 | flex-1 | w-48`
- 左侧列：步骤编号圆形 + 垂直进度连接线
- 中间列：步骤名称 + 操作详情文本
- 右侧列：执行状态图标文字 + 步骤耗时
- 字体：无衬线（Inter/PingFang SC）

### 状态样式

| 状态 | 编号背景 | 进度线 | 行背景 | 边框 | 状态图标 | 状态文字 |
|------|---------|--------|--------|------|---------|---------|
| 通过 | #00b42a | #00b42a | 白色 | 无 | ✓ 对勾 | #00b42a |
| 执行中 | #4080ff | #4080ff | #e8f3ff | #4080ff 1px | 加载动画 | #4080ff |
| 等待中 | #f2f3f5 | #f2f3f5 | 白色 | 无 | ○ 空心圆 | #86909c |

### 间距规范
- 卡片内边距：16px
- 行高度：自适配，最小 72px
- 行内间距：16px
- 行间距：0（连续）
- 编号圆形：32px × 32px
- 编号内文字：14px 白色粗体

## 文件修改

**src/features/test-control/components/StepListView.tsx**

完整重写内容区域结构：

```tsx
{steps.map((step, index) => {
  const config = statusConfig[step.status];
  const Icon = config.icon;
  const isExecuting = step.status === 'executing';
  const isPassed = step.status === 'passed';
  const isPending = step.status === 'pending';
  const isLast = index === steps.length - 1;

  return (
    <div key={step.step} className="relative flex items-center">
      {/* 左侧：编号 + 连接线 */}
      <div className="w-12 flex-shrink-0 flex flex-col items-center">
        {/* 编号圆形 */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.stepBg}`}>
          <span className={`text-sm font-medium ${isPassed ? 'text-white' : isExecuting ? 'text-white' : 'text-[#86909c]'}`}>
            {step.step}
          </span>
        </div>
        {/* 连接线 */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 min-h-[40px]"
            style={{ backgroundColor: config.lineColor }}
          />
        )}
      </div>

      {/* 中间：名称 + 详情 */}
      <div className="flex-1 min-w-0 px-4">
        <div className={`text-base font-medium ${isExecuting ? 'text-[#4080ff]' : 'text-[#1f2937]'}`}>
          {step.name}
        </div>
        <div className="text-sm text-[#86909c] mt-1">{step.locator}</div>
      </div>

      {/* 右侧：状态 + 耗时 */}
      <div className="w-48 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.statusColor}`} />
          <span className={`text-sm font-medium ${config.statusColor}`}>
            {step.status === 'passed' ? '通过' : step.status === 'executing' ? '执行中' : '等待中'}
          </span>
        </div>
        <span className="text-sm text-[#86909c]">
          {step.duration || '--:--:--'}
        </span>
      </div>
    </div>
  );
})}
```

## 状态配置映射

```tsx
const statusConfig = {
  passed: {
    stepBg: 'bg-[#00b42a]',
    lineColor: '#00b42a',
    statusColor: 'text-[#00b42a]',
  },
  executing: {
    stepBg: 'bg-[#4080ff]',
    lineColor: '#4080ff',
    statusColor: 'text-[#4080ff]',
  },
  pending: {
    stepBg: 'bg-[#f2f3f5]',
    lineColor: '#f2f3f5',
    statusColor: 'text-[#86909c]',
  },
};
```

## 验证

运行 `pnpm dev`，检查：
- 三列布局正确显示
- 通过状态：绿色圆形，绿色连接线，绿色对勾+文字
- 执行中状态：蓝色圆形，整行浅蓝背景+蓝色边框，蓝色加载图标
- 等待中状态：灰色圆形，灰色空心圆，耗时显示"--:--:--"
- 所有文字清晰可读，无截断