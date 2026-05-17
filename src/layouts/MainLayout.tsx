import { Outlet } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import { Sidebar } from "@/features/test-control/components/Sidebar";

export function MainLayout() {
  return (
    <Theme>
      <div className="min-h-screen bg-[#F5F7FB]">
        <Sidebar />
        <main className="ml-[220px] flex flex-col min-h-screen overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </Theme>
  );
}