import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LogOut, Plus, ShieldCheck } from 'lucide-react';
import {
  clearCredentials,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useLogoutMutation } from '@libs/client-server-communication';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { clearPersistedToken } from '../lib/token';

export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [logout, { isLoading }] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Keep logout resilient even if server request fails.
    }
    clearPersistedToken();
    dispatch(clearCredentials());
    navigate('/login', { replace: true });
  };

  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Session Active
          </span>
          <CardTitle className="text-3xl">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </CardTitle>
          <CardDescription>
            Your token is valid and your protected route is unlocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/50">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Authenticated Email
              </p>
              <p className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">
                {user?.email ?? 'unknown'}
              </p>
            </div>
            <Button
              onClick={onLogout}
              disabled={isLoading}
              variant="danger"
              className="sm:w-auto w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          </div>
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <Link to="/polls/new">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create Poll
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
