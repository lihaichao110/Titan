import type { ReactNode } from "react";
import { Theme } from "@radix-ui/themes";

interface MainLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <Theme>
      <div className="min-h-screen bg-[#F5F7FB]">
        {sidebar}
        <main className="ml-[220px] flex flex-col min-h-screen overflow-x-hidden">
          {children}
        </main>
      </div>
    </Theme>
  );
}
