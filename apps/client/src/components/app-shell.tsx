import type { ReactNode } from 'react';
import { Navbar } from './navbar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
