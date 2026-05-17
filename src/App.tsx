import { MainLayout } from './layouts/MainLayout';
import { Sidebar } from './features/test-control/components/Sidebar';
import { HeaderToolbar } from './features/test-control/components/HeaderToolbar';
import { DeviceSimulator } from './features/test-control/components/DeviceSimulator';
import { StepListView } from './features/test-control/components/StepListView';
import { LogTerminal } from './features/test-control/components/LogTerminal';
import { StatsGrid } from './features/test-control/components/StatsGrid';

function App() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      <HeaderToolbar />
      <div className="flex-1 p-6 min-h-0 overflow-x-hidden">
        <div className="grid grid-cols-[34%_33%_33%] gap-5 h-full">
          <DeviceSimulator />
          <StepListView />
          <LogTerminal />
        </div>
      </div>
      <StatsGrid />
    </MainLayout>
  );
}

export default App;