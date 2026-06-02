// 任务页共享类型：任务数据、统计卡片数据和页面组件 props 都从这里导出。
export type TaskType = "功能测试" | "接口测试" | "性能测试";
export type TaskStatus = "running" | "completed" | "failed" | "paused";

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
  color: "blue" | "green" | "red" | "orange" | "gray";
}

export interface TaskListProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tasks: Task[];
}

export interface StatsCardsProps {
  data: StatsCardData[];
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
