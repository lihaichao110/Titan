import { HeaderToolbar } from "@/features/test-control/components/HeaderToolbar";
import { DeviceSimulator } from "@/features/test-control/components/DeviceSimulator";
import { StepListView } from "@/features/test-control/components/StepListView";
import { LogTerminal } from "@/features/test-control/components/LogTerminal";
import { StatsGrid } from "@/features/test-control/components/StatsGrid";
import { useExecutionStore } from "@/features/test-control/store/executionStore";

export function TestControlPage() {
  const { deviceType } = useExecutionStore();

  return (
    <>
      <HeaderToolbar />
      <div className="flex-1 p-6 min-h-0 overflow-x-hidden">
        {deviceType === "mobile" ? (
          <div className="grid grid-cols-[34fr_33fr_33fr] gap-5 h-full min-w-0">
            <DeviceSimulator />
            <div className="h-full">
              <StepListView height="h-full" />
            </div>
            <div className="h-full">
              <LogTerminal height="h-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[2fr_1fr] gap-5 h-full min-w-0">
            <DeviceSimulator />
            <div className="flex flex-col gap-5 h-full">
              <StepListView height="h-[308px]" />
              <LogTerminal height="h-[308px]" />
            </div>
          </div>
        )}
      </div>
      <StatsGrid />
    </>
  );
}
