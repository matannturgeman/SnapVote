import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

const SIDEBAR_KEY = 'snapvote:sidebar-expanded';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) !== 'false',
  );
  const [mobileOpen, setMobileOpen] = useState(false); // mobile: hidden vs visible

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar
        sidebarOpen={expanded}
        onToggleSidebar={() => {
          setExpanded((o) => {
            const next = !o;
            localStorage.setItem(SIDEBAR_KEY, String(next));
            return next;
          });
          setMobileOpen((o) => !o);
        }}
      />
      <div className="flex flex-1">
        <Sidebar
          expanded={expanded}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
