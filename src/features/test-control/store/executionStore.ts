import { create } from 'zustand';
import type { ExecutionContext, ExecutionStep, LogEntry, LogLevel } from '../types';

const initialSteps: ExecutionStep[] = [];
const initialLogs: LogEntry[] = [];

interface ExecutionStore {
  context: ExecutionContext;
  activeMenuId: string;
  logFilter: LogLevel | 'ALL';
  autoScroll: boolean;
  deviceType: 'mobile' | 'pc';
  deviceUrl: string;
  selectedDeviceUdid: string | null;
  currentScreenshot: string;
  setActiveMenu: (id: string) => void;
  setLogFilter: (filter: LogLevel | 'ALL') => void;
  setAutoScroll: (enabled: boolean) => void;
  setDeviceType: (type: 'mobile' | 'pc') => void;
  setDeviceUrl: (url: string) => void;
  setSelectedDeviceUdid: (udid: string | null) => void;
  setScreenshot: (screenshot: string) => void;
  setExecutionSteps: (steps: ExecutionStep[]) => void;
  updateStepStatus: (step: number, status: ExecutionStep['status']) => void;
  updateStepResult: (step: number, result: Partial<ExecutionStep>) => void;
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
      progress: { percent: 0, detail: '0/0' },
      passRate: { rate: '0%', detail: '0/0' },
      steps: { total: 0, completed: 0 },
      runtime: { time: '00:00:00', device: 'iPhone 15 Pro' },
    },
  },
  activeMenuId: 'tasks',
  logFilter: 'ALL',
  autoScroll: true,
  deviceType: 'mobile',
  deviceUrl: '',
  selectedDeviceUdid: null,
  currentScreenshot: '',
  setActiveMenu: (id) => set({ activeMenuId: id }),
  setLogFilter: (filter) => set({ logFilter: filter }),
  setAutoScroll: (enabled) => set({ autoScroll: enabled }),
  setDeviceType: (type) => set({ deviceType: type }),
  setDeviceUrl: (url) => set({ deviceUrl: url }),
  setSelectedDeviceUdid: (udid) => set({ selectedDeviceUdid: udid }),
  setScreenshot: (screenshot) => set({ currentScreenshot: screenshot }),
  setExecutionSteps: (steps) =>
    set((state) => ({
      context: {
        ...state.context,
        steps,
        stats: {
          ...state.context.stats,
          progress: {
            percent: steps.length ? (steps.filter((s) => s.status === 'passed').length / steps.length) * 100 : 0,
            detail: `${steps.filter((s) => s.status === 'passed').length}/${steps.length}`,
          },
          passRate: {
            rate: steps.length ? `${Math.round((steps.filter((s) => s.status === 'passed').length / steps.length) * 100)}%` : '0%',
            detail: `${steps.filter((s) => s.status === 'passed').length}/${steps.length}`,
          },
          steps: { total: steps.length, completed: steps.filter((s) => s.status === 'passed').length },
        },
      },
    })),
  updateStepStatus: (stepNum, status) =>
    set((state) => ({
      context: {
        ...state.context,
        steps: state.context.steps.map((s) =>
          s.step === stepNum ? { ...s, status } : s
        ),
      },
    })),
  updateStepResult: (stepNum, result) =>
    set((state) => {
      const steps = state.context.steps.map((s) =>
        s.step === stepNum ? { ...s, ...result } : s
      );
      const passed = steps.filter((s) => s.status === 'passed').length;
      return {
        context: {
          ...state.context,
          steps,
          stats: {
            ...state.context.stats,
            progress: {
              percent: steps.length ? (passed / steps.length) * 100 : 0,
              detail: `${passed}/${steps.length}`,
            },
            passRate: {
              rate: steps.length ? `${Math.round((passed / steps.length) * 100)}%` : '0%',
              detail: `${passed}/${steps.length}`,
            },
            steps: { total: steps.length, completed: passed },
          },
        },
      };
    }),
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
