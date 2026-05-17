import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '../store/executionStore';

export function HeaderToolbar() {
  const { context } = useExecutionStore();
  const { taskName, deviceInfo, status, startTime, elapsedTime } = context;

  return (
    <header className="h-[72px] px-6 flex items-center justify-between border-b border-[#E5E7EB] bg-white">
      {/* Left: Task info */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-base font-semibold text-[#1F2937]">{taskName}</h1>
          <p className="text-sm text-[#9CA3AF]">{deviceInfo}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-[#2563FF]' : status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
            <Badge
              variant={status === 'running' ? 'default' : 'secondary'}
              className={status === 'running' ? 'bg-[#2563FF]' : ''}
            >
              {status === 'running' ? '运行中' : status === 'paused' ? '已暂停' : '已停止'}
            </Badge>
          </div>

          <div className="text-sm text-[#6B7280]">
            已执行: <span className="font-medium text-[#1F2937]">{elapsedTime}</span>
          </div>

          <div className="text-sm text-[#6B7280]">
            开始时间: <span className="font-medium text-[#1F2937]">{startTime}</span>
          </div>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-[#EF4444] text-[#EF4444] hover:bg-red-50 hover:text-[#EF4444] hover:border-[#EF4444]"
        >
          停止
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[#E5E7EB] text-[#374151] hover:bg-gray-50"
        >
          暂停
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[#E5E7EB] text-[#374151] hover:bg-gray-50"
        >
          重新执行
        </Button>
      </div>
    </header>
  );
}