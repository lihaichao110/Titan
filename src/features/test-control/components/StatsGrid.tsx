import { Progress } from '@/components/ui/progress';
import { useExecutionStore } from '../store/executionStore';

export function StatsGrid() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-white border-t border-slate-200">
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">执行进度</div>
        <Progress value={stats.executionProgress.percentage} className="h-2" />
        <div className="text-sm font-medium text-slate-900 mt-2">
          {stats.executionProgress.detail}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">通过率</div>
        <div className="text-2xl font-bold text-green-600">{stats.passRate.rate}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.passRate.detail}</div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">总步骤/已完成</div>
        <div className="text-2xl font-bold text-slate-900">
          {stats.stepsInfo.completed}
          <span className="text-base font-normal text-slate-400">/{stats.stepsInfo.total}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">步骤数</div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">运行时长</div>
        <div className="text-2xl font-bold text-slate-900">{context.elapsedTime}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.deviceFooter.name}</div>
      </div>
    </div>
  );
}