import { ScrollArea } from "@/components/scroll-area";
import { useExecutionStore } from "@/store/test-control";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { StepListViewProps } from "@/types/test-control";

const statusConfig = {
  passed: {
    icon: CheckCircle2,
    bgColor: "bg-[#DCFCE7]",
    borderColor: "border-[#16A34A]",
    textColor: "text-[#16A34A]",
    lineColor: "#16A34A",
  },
  executing: {
    icon: Loader2,
    bgColor: "bg-[#DBEAFE]",
    borderColor: "border-[#2563EB]",
    textColor: "text-[#2563EB]",
    lineColor: "#2563EB",
  },
  pending: {
    icon: Circle,
    bgColor: "bg-[#F3F4F6]",
    borderColor: "border-[#D1D5DB]",
    textColor: "text-[#D1D5DB]",
    lineColor: "#D1D5DB",
  },
  failed: {
    icon: Circle,
    bgColor: "bg-[#FEE2E2]",
    borderColor: "border-[#EF4444]",
    textColor: "text-[#EF4444]",
    lineColor: "#EF4444",
  },
};

export function StepListView({ height = "h-[640px]" }: StepListViewProps) {
  const { context } = useExecutionStore();
  const { steps } = context;

  const completedCount = steps.filter((s) => s.status === "passed").length;

  return (
    <div
      className={`${height} min-w-0 flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden`}
    >
      {/* Header */}
      <div className="h-14 px-5 flex items-center border-b border-[#E5E7EB]">
        <div>
          <h3 className="text-sm font-medium text-[#1F2937]">执行步骤</h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            共 {steps.length} 步，已完成 {completedCount} 步
          </p>
        </div>
      </div>

      {/* Step list */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="relative min-w-0 p-4">
          {steps.length === 0 ? (
            <div className="h-full min-h-[180px] flex items-center justify-center px-4 text-center">
              <span className="text-sm text-[#9CA3AF]">
                暂无待执行步骤
              </span>
            </div>
          ) : (
            <>
              {/* Single vertical connecting line - behind items */}
              <div className="absolute left-11 top-6 bottom-6 w-0.5 bg-[#E5E7EB]" />

              {steps.map((step) => {
                const config = statusConfig[step.status];
                const Icon = config.icon;
                const isExecuting = step.status === "executing";
                const isPassed = step.status === "passed";

                return (
                  <div
                    key={step.step}
                    className={`relative flex min-w-0 items-center mb-5 last:mb-0 pl-4 ${isExecuting ? "py-3 border border-[#2563EB] rounded-lg bg-[#EFF6FF]" : ""}`}
                  >
                    {/* Node circle - centered on the vertical line */}
                    <div
                      className={`shrink-0 w-6 h-6 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center z-10`}
                    >
                      {isPassed ? (
                        <Icon className="w-3 h-3 text-[#16A34A]" />
                      ) : isExecuting ? (
                        <Icon className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className={`text-xs font-medium ${config.textColor}`}>
                          {step.step}
                        </span>
                      )}
                    </div>

                    {/* Content row */}
                    <div className={`flex-1 min-w-0 ml-4 pr-4`}>
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span
                          className={`min-w-0 break-words text-sm font-medium ${isExecuting ? "text-[#2563EB]" : "text-[#1F2937]"}`}
                        >
                          {step.name}
                        </span>
                        {step.duration && (
                          <span className="text-xs font-mono text-[#6B7280] shrink-0">
                            {step.duration}
                          </span>
                        )}
                      </div>
                      {step.locator && (
                        <div className="min-w-0 break-words text-xs text-[#6B7280] mt-0.5">
                          {step.locator}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
