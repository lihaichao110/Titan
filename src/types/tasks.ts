// 任务页共享类型：任务数据、统计卡片数据和页面组件 props 都从这里导出。
/** 任务列表中支持展示和筛选的测试任务类型。 */
export type TaskType =
  /** 面向业务功能流程的测试任务。 */
  | "功能测试"
  /** 面向后端接口调用和响应校验的测试任务。 */
  | "接口测试"
  /** 面向吞吐、响应时间等性能指标的测试任务。 */
  | "性能测试";

/** 任务在列表中的执行状态。 */
export type TaskStatus =
  /** 任务正在执行中。 */
  | "running"
  /** 任务已经执行完成。 */
  | "completed"
  /** 任务执行失败，需要排查错误。 */
  | "failed"
  /** 任务被手动或系统暂停。 */
  | "paused";

/** 任务列表中单条任务的展示数据。 */
export interface Task {
  /** 任务唯一标识，用于列表渲染和后续操作定位。 */
  id: string;
  /** 任务名称，展示在任务列表主标题位置。 */
  name: string;
  /** 任务说明，用于补充当前任务的测试目标。 */
  description: string;
  /** 任务所属测试类型。 */
  type: TaskType;
  /** 当前任务执行状态。 */
  status: TaskStatus;
  /** 任务运行或归属的测试环境。 */
  environment: string;
  /** 创建任务的人员名称。 */
  creator: string;
  /** 最近更新时间，直接用于列表展示。 */
  updatedAt: string;
}

/** 任务页顶部统计卡片的展示数据。 */
export interface StatsCardData {
  /** 统计指标名称。 */
  label: string;
  /** 统计指标数值。 */
  value: number;
  /** 指标变化值，用于展示趋势方向和幅度。 */
  trend: number;
  /** 趋势说明文案。 */
  trendLabel: string;
  /** 卡片主题色，对应统计卡片组件中的颜色样式。 */
  color: "blue" | "green" | "red" | "orange" | "gray";
}

/** 任务列表组件需要的筛选状态和任务数据。 */
export interface TaskListProps {
  /** 当前激活的任务分类或状态页签。 */
  activeTab: string;
  /** 切换任务页签时触发的回调。 */
  onTabChange: (tab: string) => void;
  /** 当前页签下需要展示的任务集合。 */
  tasks: Task[];
}

/** 统计卡片组组件的输入数据。 */
export interface StatsCardsProps {
  /** 按展示顺序排列的统计卡片数据。 */
  data: StatsCardData[];
}

/** 任务列表分页组件的状态和翻页回调。 */
export interface PaginationProps {
  /** 当前页码，从 1 开始。 */
  currentPage: number;
  /** 总页数。 */
  totalPages: number;
  /** 页码变化时触发的回调。 */
  onPageChange: (page: number) => void;
}
