import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '../store/executionStore';

export function HeaderToolbar() {
  const { context } = useExecutionStore();
  const { taskName, environment, status, elapsedTime } = context;

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
    <header className="h-15 px-6 flex items-center justify-between border-b border-slate-200 bg-white">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{taskName}</h1>
          <p className="text-sm text-slate-500">{environment}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
          <Badge variant={status === 'running' ? 'default' : 'secondary'}>
            {statusLabels[status]}
          </Badge>
        </div>

        <div className="text-sm text-slate-600">
          已执行: <span className="font-medium text-slate-900">{elapsedTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="destructive" size="sm">
          停止
        </Button>
        <Button variant="secondary" size="sm">
          暂停
        </Button>
        <Button variant="outline" size="sm">
          重新执行
        </Button>
      </div>
    </header>
  );
}