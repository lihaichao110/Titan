import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExecutionStore } from '../store/executionStore';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const statusConfig = {
  passed: {
    icon: CheckCircle2,
    bgColor: 'bg-white border-[#E5E7EB]',
    textColor: 'text-[#1F2937]',
    numberBg: 'bg-[#16A34A] text-white',
  },
  executing: {
    icon: Loader2,
    bgColor: 'bg-[#F0F5FF] border-[#2563FF]',
    textColor: 'text-[#2563FF]',
    numberBg: 'bg-[#2563FF] text-white',
  },
  pending: {
    icon: Circle,
    bgColor: 'bg-white border-[#E5E7EB]',
    textColor: 'text-[#9CA3AF]',
    numberBg: 'bg-[#F3F4F6] text-[#9CA3AF]',
  },
};

export function StepListView() {
  const { context } = useExecutionStore();
  const { steps } = context;

  const completedCount = steps.filter((s) => s.status === 'passed').length;

  return (
    <div className="h-[640px] flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center border-b border-[#E5E7EB]">
        <div>
          <h3 className="text-sm font-medium text-[#1F2937]">执行步骤</h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            共 {steps.length} 步，已完成 {completedCount}
          </p>
        </div>
      </div>

      {/* Step list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {steps.map((step) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isExecuting = step.status === 'executing';
            const isPassed = step.status === 'passed';

            return (
              <div
                key={step.step}
                className={`min-h-[72px] p-4 rounded-2xl border transition-colors ${config.bgColor}`}
              >
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${config.numberBg}`}
                  >
                    {isPassed ? (
                      <Icon className="w-4 h-4" />
                    ) : isExecuting ? (
                      <Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      step.step
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${config.textColor}`}>
                        {step.name}
                      </span>
                    </div>

                    <div className="text-xs text-[#9CA3AF] mt-1 truncate">{step.locator}</div>

                    {step.detail && (
                      <div className="text-xs text-[#2563FF] mt-1">{step.detail}</div>
                    )}
                  </div>

                  {/* Duration */}
                  {step.duration && (
                    <Badge variant="secondary" className="text-xs bg-[#F9FAFB] text-[#6B7280]">
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