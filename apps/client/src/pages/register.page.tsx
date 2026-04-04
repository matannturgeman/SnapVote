import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  selectIsAuthenticated,
  setCredentials,
  useAppDispatch,
  useAppSelector,
} from '@libs/client-store';
import { useRegisterMutation } from '@libs/client-server-communication';
import { AuthShell } from '../components/auth-shell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { persistToken } from '../lib/token';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [register, { isLoading, error }] = useRegisterMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await register({ name, email, password }).unwrap();
      persistToken(response.accessToken);
      dispatch(
        setCredentials({ user: response.user, token: response.accessToken }),
      );
      navigate('/', { replace: true });
    } catch {
      // RTK Query exposes error state.
    }
  };

  return (
    <AuthShell
      eyebrow="New Workspace"
      title="Create your account"
      description="Register with your name, email, and password to access protected routes."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            placeholder="Your full name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {error ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Registration failed. Please try a different email.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          className="font-semibold text-cyan-700 hover:text-cyan-600"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
