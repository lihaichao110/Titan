export type TaskType = '功能测试' | '接口测试' | '性能测试';
export type TaskStatus = 'running' | 'completed' | 'failed' | 'paused';

export interface Task {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  environment: string;
  creator: string;
  updatedAt: string;
}

export interface StatsCardData {
  label: string;
  value: number;
  trend: number;
  trendLabel: string;
  color: 'blue' | 'green' | 'red' | 'orange' | 'gray';
}