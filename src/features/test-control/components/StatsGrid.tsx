import { Progress } from '@/components/ui/progress';
import { useExecutionStore } from '../store/executionStore';

export function StatsGrid() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="grid grid-cols-4 gap-4 p-6 pt-0">
      {/* Card 1: 执行进度 */}
      <div className="h-[140px] bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] p-5">
        <div className="text-xs text-[#6B7280] mb-3">执行进度</div>
        <div className="text-[36px] font-bold text-[#1F2937] leading-none">{stats.progress.percent}%</div>
        <Progress value={stats.progress.percent} className="h-1.5 mt-3" />
        <div className="text-xs text-[#9CA3AF] mt-2">{stats.progress.detail}</div>
      </div>

      {/* Card 2: 通过率 */}
      <div className="h-[140px] bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] p-5">
        <div className="text-xs text-[#6B7280] mb-3">通过率</div>
        <div className="text-[36px] font-bold text-[#16A34A] leading-none">{stats.passRate.rate}</div>
        <div className="text-xs text-[#9CA3AF] mt-3">{stats.passRate.detail}</div>
      </div>

      {/* Card 3: 总步骤 */}
      <div className="h-[140px] bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] p-5">
        <div className="text-xs text-[#6B7280] mb-3">总步骤</div>
        <div className="text-[36px] font-bold text-[#1F2937] leading-none">{stats.steps.total}</div>
        <div className="text-xs text-[#9CA3AF] mt-3">已完成 {stats.steps.completed}</div>
      </div>

      {/* Card 4: 运行时长 */}
      <div className="h-[140px] bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] p-5">
        <div className="text-xs text-[#6B7280] mb-3">运行时长</div>
        <div className="text-[36px] font-bold text-[#1F2937] leading-none">{stats.runtime.time}</div>
        <div className="text-xs text-[#9CA3AF] mt-3">{stats.runtime.device}</div>
      </div>
    </div>
  );
}