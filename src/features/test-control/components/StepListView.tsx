import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExecutionStore } from '../store/executionStore';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const statusConfig = {
  passed: {
    icon: CheckCircle2,
    nodeColor: 'border-[#16A34A] bg-white text-[#16A34A]',
    lineColor: '#16A34A',
  },
  executing: {
    icon: Loader2,
    nodeColor: 'border-[#2563FF] bg-[#2563FF] text-white',
    lineColor: '#2563FF',
  },
  pending: {
    icon: Circle,
    nodeColor: 'border-[#D1D5DB] bg-[#F3F4F6] text-[#D1D5DB]',
    lineColor: '#E5E7EB',
  },
};

export function StepListView() {
  const { context } = useExecutionStore();
  const { steps } = context;

  const completedCount = steps.filter((s) => s.status === 'passed').length;

  return (
    <div className="h-[640px] flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Header */}
      <div className="h-14 px-5 flex items-center border-b border-[#E5E7EB]">
        <div>
          <h3 className="text-sm font-medium text-[#1F2937]">执行步骤</h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            共 {steps.length} 步，已完成 {completedCount} 步
          </p>
        </div>
      </div>

      {/* Step list - continuous flow */}
      <ScrollArea className="flex-1">
        <div className="relative py-4">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isExecuting = step.status === 'executing';
            const isPassed = step.status === 'passed';
            const isLast = index === steps.length - 1;

            return (
              <div key={step.step} className="relative">
                {/* Step item */}
                <div className={`flex items-start gap-4 px-5 ${isExecuting ? 'bg-[#F0F5FF]' : ''}`}>
                  {/* Node and line container */}
                  <div className="relative flex flex-col items-center">
                    {/* Node circle */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${config.nodeColor}`}
                    >
                      {isPassed ? (
                        <Icon className="w-3 h-3" />
                      ) : isExecuting ? (
                        <Icon className="w-3 h-3 animate-spin" />
                      ) : null}
                    </div>
                    {/* Vertical line */}
                    {!isLast && (
                      <div
                        className="w-0.5 h-16 bg-[#E5E7EB]"
                        style={{ backgroundColor: isPassed ? config.lineColor : undefined }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isExecuting ? 'text-[#2563FF]' : 'text-[#1F2937]'}`}>
                        {step.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-1 truncate">{step.locator}</div>
                    {step.detail && (
                      <div className="text-xs text-[#2563FF] mt-1">{step.detail}</div>
                    )}
                    {step.duration && (
                      <Badge variant="secondary" className="text-xs bg-[#F9FAFB] text-[#6B7280] mt-2">
                        {step.duration}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}