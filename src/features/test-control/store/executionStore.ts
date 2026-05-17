import { create } from 'zustand';
import type { ExecutionContext, ExecutionStep, LogEntry, LogLevel } from '../types';

const initialSteps: ExecutionStep[] = [
  { step: 1, name: '启动应用', locator: 'com.example.app', status: 'passed', duration: '00:00:02' },
  { step: 2, name: '点击登录按钮', locator: 'id: btn_login', status: 'passed', duration: '00:00:01' },
  { step: 3, name: '输入手机号', locator: '138****8888', status: 'executing', duration: '00:00:03', detail: '正在执行...' },
  { step: 4, name: '输入密码', locator: '**********', status: 'pending', duration: null },
  { step: 5, name: '点击登录', locator: 'id: btn_submit', status: 'pending', duration: null },
  { step: 6, name: '验证登录结果', locator: '检查首页元素', status: 'pending', duration: null },
  { step: 7, name: '截图保存', locator: '保存登录成功页面', status: 'pending', duration: null },
  { step: 8, name: '结束应用', locator: '关闭应用进程', status: 'pending', duration: null },
];

const initialLogs: LogEntry[] = [
  { time: '14:30:22', level: 'INFO', msg: '开始执行测试任务：用户登录流程测试' },
  { time: '14:30:23', level: 'INFO', msg: '设备连接成功：iPhone 15 Pro (iOS 17.4.1)' },
  { time: '14:30:25', level: 'INFO', msg: '启动应用：com.example.app' },
  { time: '14:30:27', level: 'INFO', msg: '应用启动成功' },
  { time: '14:30:28', level: 'INFO', msg: '执行步骤 1：启动应用' },
  { time: '14:30:30', level: 'SUCCESS', msg: '步骤 1 执行通过 (耗时: 2.0s)' },
  { time: '14:30:30', level: 'INFO', msg: '执行步骤 2：点击登录按钮' },
  { time: '14:30:31', level: 'SUCCESS', msg: '步骤 2 执行通过 (耗时: 1.2s)' },
  { time: '14:30:32', level: 'INFO', msg: '执行步骤 3：输入手机号' },
  { time: '14:30:32', level: 'INFO', msg: '找到输入框：id=input_phone' },
  { time: '14:30:33', level: 'INFO', msg: '输入框内容：138****8888' },
  { time: '14:30:33', level: 'INFO', msg: '正在验证输入结果...' },
];

interface ExecutionStore {
  context: ExecutionContext;
  activeMenuId: string;
  logFilter: LogLevel | 'ALL';
  autoScroll: boolean;
  setActiveMenu: (id: string) => void;
  setLogFilter: (filter: LogLevel | 'ALL') => void;
  setAutoScroll: (enabled: boolean) => void;
  updateStepStatus: (step: number, status: ExecutionStep['status']) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  context: {
    taskName: '用户登录流程测试',
    deviceInfo: 'iPhone 15 Pro (iOS 17.4.1)',
    status: 'running',
    startTime: '2024-05-20 14:30:22',
    elapsedTime: '00:01:32',
    steps: initialSteps,
    logs: initialLogs,
    stats: {
      progress: { percent: 37.5, detail: '2/2' },
      passRate: { rate: '100%', detail: '2/2' },
      steps: { total: 8, completed: 2 },
      runtime: { time: '00:01:32', device: 'iPhone 15 Pro' },
    },
  },
  activeMenuId: 'control',
  logFilter: 'ALL',
  autoScroll: true,
  setActiveMenu: (id) => set({ activeMenuId: id }),
  setLogFilter: (filter) => set({ logFilter: filter }),
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  updateStepStatus: (stepNum, status) =>
    set((state) => ({
      context: {
        ...state.context,
        steps: state.context.steps.map((s) =>
          s.step === stepNum ? { ...s, status } : s
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
  clearLogs: () =>
    set((state) => ({
      context: {
        ...state.context,
        logs: [],
      },
    })),
}));