import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Vote } from 'lucide-react';
import {
  clearCredentials,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useLogoutMutation } from '@libs/client-server-communication';
import { clearPersistedToken } from '../lib/token';
import { ThemeToggle } from './ui/theme-toggle';

export function Navbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Keep logout resilient even if server request fails.
    }
    clearPersistedToken();
    dispatch(clearCredentials(undefined));
    navigate('/login', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-cyan-700 hover:text-cyan-600"
        >
          <Vote className="h-5 w-5" />
          SnapVote
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/polls/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-600 dark:hover:text-cyan-400"
          >
            <Plus className="h-4 w-4" />
            New Poll
          </Link>

          {user?.name && (
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
              {user.name}
            </span>
          )}

          <ThemeToggle />

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
