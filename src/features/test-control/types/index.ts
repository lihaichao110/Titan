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