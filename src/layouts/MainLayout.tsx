import type { ReactNode } from 'react';

interface MainLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 flex-shrink-0">{sidebar}</aside>
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}