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
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 min-h-0">
        <DeviceSimulator />
        <StepListView />
        <LogTerminal />
      </div>
      <StatsGrid />
    </MainLayout>
  );
}

export default App;