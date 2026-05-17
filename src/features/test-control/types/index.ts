export type StepStatus = 'passed' | 'executing' | 'pending';
export type LogLevel = 'INFO' | 'SUCCESS' | 'ERROR';
export type ExecutionStatus = 'running' | 'paused' | 'stopped';

export interface ExecutionStep {
  step: number;
  name: string;
  locator: string;
  status: StepStatus;
  duration: string | null;
  detail?: string;
}

export interface LogEntry {
  time: string;
  level: LogLevel;
  msg: string;
}

export interface StatsProgress {
  percent: number;
  detail: string;
}

export interface StatsPassRate {
  rate: string;
  detail: string;
}

export interface StatsSteps {
  total: number;
  completed: number;
}

export interface StatsRuntime {
  time: string;
  device: string;
}

export interface StatsData {
  progress: StatsProgress;
  passRate: StatsPassRate;
  steps: StatsSteps;
  runtime: StatsRuntime;
}

export interface ExecutionContext {
  taskName: string;
  deviceInfo: string;
  status: ExecutionStatus;
  startTime: string;
  elapsedTime: string;
  steps: ExecutionStep[];
  logs: LogEntry[];
  stats: StatsData;
}

export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}