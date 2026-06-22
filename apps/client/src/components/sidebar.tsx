import { Link, useLocation } from 'react-router-dom';
import { Compass, LayoutList, Plus } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'My Polls', icon: LayoutList },
  { to: '/explore', label: 'Explore', icon: Compass },
];

interface SidebarProps {
  expanded: boolean;   // desktop: full labels vs icons-only
  mobileOpen: boolean; // mobile: visible vs hidden
  onCloseMobile: () => void;
}

export function Sidebar({ expanded, mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Mobile overlay — does not affect desktop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 z-20 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-14 bottom-0 left-0 z-30 flex w-56 flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-700 dark:bg-slate-900',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, toggle width
          expanded ? 'lg:w-56' : 'lg:w-14',
          'lg:static lg:z-auto lg:translate-x-0',
        ].join(' ')}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onCloseMobile}
              title={!expanded ? label : undefined}
              className={[
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                expanded ? 'gap-3' : 'lg:justify-center lg:px-2',
                isActive(to)
                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={expanded ? '' : 'lg:hidden'}>{label}</span>
            </Link>
          ))}

          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

          <Link
            to="/polls/new"
            onClick={onCloseMobile}
            title={!expanded ? 'New Poll' : undefined}
            className={[
              'flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              expanded ? 'gap-3' : 'lg:justify-center lg:px-2',
            ].join(' ')}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className={expanded ? '' : 'lg:hidden'}>New Poll</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
