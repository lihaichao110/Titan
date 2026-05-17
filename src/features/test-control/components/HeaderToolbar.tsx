import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '../store/executionStore';

export function HeaderToolbar() {
  const { context } = useExecutionStore();
  const { taskName, deviceInfo, status, startTime, elapsedTime } = context;

  const statusColors: Record<string, string> = {
    running: 'bg-blue-500',
    paused: 'bg-yellow-500',
    stopped: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    running: '运行中',
    paused: '已暂停',
    stopped: '已停止',
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 bg-white">
      {/* Left: Task info */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{taskName}</h1>
          <p className="text-sm text-slate-500">{deviceInfo}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
            <Badge variant={status === 'running' ? 'default' : 'secondary'}>
              {statusLabels[status]}
            </Badge>
          </div>

          <div className="text-sm text-slate-600">
            已执行: <span className="font-medium text-slate-900">{elapsedTime}</span>
          </div>

          <div className="text-sm text-slate-600">
            开始时间: <span className="font-medium text-slate-900">{startTime}</span>
          </div>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          停止
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          暂停
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-400 text-slate-600 hover:bg-slate-100"
        >
          重新执行
        </Button>
      </div>
    </header>
  );
}