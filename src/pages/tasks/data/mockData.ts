import type { StatsCardData } from "@/types/tasks";

export const statsCardsData: StatsCardData[] = [
  {
    label: '全部任务',
    value: 128,
    trend: 12,
    trendLabel: '较昨日',
    color: 'blue',
  },
  {
    label: '运行中',
    value: 12,
    trend: 3,
    trendLabel: '较昨日',
    color: 'green',
  },
  {
    label: '已完成',
    value: 95,
    trend: 8,
    trendLabel: '较昨日',
    color: 'blue',
  },
  {
    label: '失败',
    value: 8,
    trend: -2,
    trendLabel: '较昨日',
    color: 'red',
  },
  {
    label: '已暂停',
    value: 13,
    trend: 0,
    trendLabel: '较昨日',
    color: 'orange',
  },
];
