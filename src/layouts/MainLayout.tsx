import { Outlet } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import { Sidebar } from "@/features/test-control/components/Sidebar";

export function MainLayout() {
  return (
    <Theme>
      <div className="h-screen bg-[#F5F7FB] overflow-hidden">
        <Sidebar />
        <main className="ml-[220px] flex h-full min-h-0 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </Theme>
  );
}
