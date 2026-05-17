import { Progress } from '@/components/ui/progress';
import { useExecutionStore } from '../store/executionStore';

export function StatsGrid() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-white border-t border-slate-200">
      {/* Card 1: 执行进度 */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">执行进度</div>
        <div className="text-2xl font-bold text-slate-900">{stats.progress.percent}%</div>
        <Progress value={stats.progress.percent} className="h-2 mt-2" />
        <div className="text-xs text-slate-500 mt-1">{stats.progress.detail}</div>
      </div>

      {/* Card 2: 通过率 */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">通过率</div>
        <div className="text-2xl font-bold text-green-600">{stats.passRate.rate}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.passRate.detail}</div>
      </div>

      {/* Card 3: 总步骤 */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">总步骤</div>
        <div className="text-2xl font-bold text-slate-900">{stats.steps.total}</div>
        <div className="text-xs text-slate-500 mt-1">已完成 {stats.steps.completed}</div>
      </div>

      {/* Card 4: 运行时长 */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="text-xs text-slate-500 mb-2">运行时长</div>
        <div className="text-2xl font-bold text-slate-900">{stats.runtime.time}</div>
        <div className="text-xs text-slate-500 mt-1">{stats.runtime.device}</div>
      </div>
    </div>
  );
}