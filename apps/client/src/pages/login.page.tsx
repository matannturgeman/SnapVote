import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  selectIsAuthenticated,
  setCredentials,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useLoginMutation } from '@libs/client-server-communication';
import { AuthShell } from '../components/auth-shell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { persistToken } from '../lib/token';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading, error }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await login({ email, password }).unwrap();
      persistToken(response.accessToken);
      dispatch(setCredentials({ user: response.user, token: response.accessToken }));
      navigate('/', { replace: true });
    } catch {
      // RTK Query exposes error state.
    }
  };

  return (
    <AuthShell
      eyebrow="Secure Access"
      title="Sign in to your workspace"
      description="Use your credentials to continue. Invalid or expired sessions are redirected here automatically."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {error ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Login failed. Please check your credentials.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        Forgot your password?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-600" to="/forgot-password">
          Reset it here
        </Link>
      </p>
      <p className="text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-600" to="/register">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
