import type { ReactNode } from 'react';

interface MainLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {sidebar}
      <main className="ml-[220px] flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}