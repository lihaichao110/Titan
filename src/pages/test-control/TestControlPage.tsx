import { HeaderToolbar } from "@/pages/test-control/components/HeaderToolbar";
import { DeviceSimulator } from "@/pages/test-control/components/DeviceSimulator";
import { PcWebRunnerPanel } from "@/pages/test-control/components/PcWebRunnerPanel";
import { StepListView } from "@/pages/test-control/components/StepListView";
import { LogTerminal } from "@/pages/test-control/components/LogTerminal";
import { StatsGrid } from "@/pages/test-control/components/StatsGrid";
import { useExecutionStore } from "@/store/test-control";

export function TestControlPage() {
  const { deviceType } = useExecutionStore();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <HeaderToolbar />
      <div className="flex-1 p-6 min-h-0 overflow-hidden">
        {deviceType === "mobile" ? (
          <div className="grid grid-cols-[minmax(0,34fr)_minmax(0,33fr)_minmax(0,33fr)] gap-5 h-full min-w-0">
            <div className="min-w-0 overflow-hidden">
              <DeviceSimulator />
            </div>
            <div className="h-full min-w-0 overflow-hidden">
              <StepListView height="h-full" />
            </div>
            <div className="h-full min-w-0 overflow-hidden">
              <LogTerminal height="h-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 h-full min-w-0">
            <div className="min-w-0 overflow-hidden">
              <PcWebRunnerPanel />
            </div>
            <div className="flex flex-col gap-5 h-full min-w-0 overflow-hidden">
              <StepListView height="h-[308px]" />
              <LogTerminal height="h-[308px]" />
            </div>
          </div>
        )}
      </div>
      <StatsGrid />
    </div>
  );
}
