import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExecutionStore } from '../store/executionStore';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const statusConfig = {
  passed: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-green-600',
  },
  executing: {
    icon: Loader2,
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-600',
  },
  pending: {
    icon: Circle,
    bgColor: 'bg-slate-50 border-slate-200',
    textColor: 'text-slate-400',
  },
};

export function StepListView() {
  const { context } = useExecutionStore();
  const { steps } = context;

  const completedCount = steps.filter((s) => s.status === 'passed').length;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-900">执行步骤</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          共 {steps.length} 步，已完成 {completedCount}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isExecuting = step.status === 'executing';

            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isExecuting ? config.bgColor : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                      isExecuting ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isExecuting ? 'text-blue-600' : 'text-slate-900'
                        }`}
                      >
                        {step.name}
                      </span>
                      {isExecuting && (
                        <Icon className="w-3 h-3 text-blue-600 animate-spin" />
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 truncate">{step.locator}</div>

                    {step.detail && (
                      <div className="text-xs text-blue-600 mt-1">{step.detail}</div>
                    )}
                  </div>

                  {step.duration && (
                    <Badge variant="secondary" className="text-xs">
                      {step.duration}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}