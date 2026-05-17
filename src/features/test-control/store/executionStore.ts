import { create } from 'zustand';
import type { ExecutionContext, ExecutionStep, LogEntry, LogLevel } from '../types';

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
  context: {
    taskName: '用户登录流程测试',
    environment: 'iPhone 15 Pro (iOS 17.4.1)',
    status: 'running',
    startTime: '2024-05-20 14:30:22',
    elapsedTime: '00:01:32',
    steps: initialSteps,
    logs: initialLogs,
    stats: {
      executionProgress: { percentage: 37.5, detail: '3/8' },
      passRate: { rate: '100%', detail: '2/2' },
      stepsInfo: { total: 8, completed: 2 },
      deviceFooter: { name: 'iPhone 15 Pro', os: 'iOS 17.4.1' },
    },
  },
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