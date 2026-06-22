import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, LogOut, Plus, User, Vote, LayoutList } from 'lucide-react';
import {
  clearCredentials,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useLogoutMutation } from '@libs/client-server-communication';
import { clearPersistedToken } from '../lib/token';
import { ThemeToggle } from './ui/theme-toggle';

const NAV_LINKS = [
  { to: '/', label: 'My Polls', icon: LayoutList },
  { to: '/explore', label: 'Explore', icon: Compass },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // resilient logout
    }
    clearPersistedToken();
    dispatch(clearCredentials(undefined));
    navigate('/login', { replace: true });
  };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-700 dark:bg-slate-900',
          // Desktop: always visible (no transform needed)
          'lg:static lg:z-auto lg:translate-x-0',
          // Mobile: slide in/out
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-700">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 text-lg font-bold text-cyan-700 hover:text-cyan-600"
          >
            <Vote className="h-5 w-5" />
            SnapVote
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}

          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

          <Link
            to="/polls/new"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New Poll
          </Link>
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 space-y-1 border-t border-slate-200 px-2 py-4 dark:border-slate-700">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <User className="h-4 w-4 shrink-0" />
            {user?.name ?? 'Profile'}
          </Link>

          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Theme
            </span>
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
