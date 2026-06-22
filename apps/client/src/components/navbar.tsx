import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, User, Vote, X } from 'lucide-react';
import {
  clearCredentials,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useLogoutMutation } from '@libs/client-server-communication';
import { clearPersistedToken } from '../lib/token';
import { ThemeToggle } from './ui/theme-toggle';

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Navbar({ sidebarOpen, onToggleSidebar }: NavbarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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

  return (
    <nav className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-cyan-700 hover:text-cyan-600"
        >
          <Vote className="h-5 w-5" />
          SnapVote
        </Link>
      </div>

      <div className="flex items-center gap-2">
{user?.name && (
          <Link
            to="/profile"
            className="hidden text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400 sm:block"
          >
            {user.name}
          </Link>
        )}

        <Link
          to="/profile"
          className="rounded-lg p-2 text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
          title="Profile"
        >
          <User className="h-4 w-4" />
        </Link>

        <ThemeToggle />

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </nav>
  );
}
