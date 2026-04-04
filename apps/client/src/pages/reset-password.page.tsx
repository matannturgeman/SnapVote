import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useResetPasswordMutation } from '@libs/client-server-communication';
import { AuthShell } from '../components/auth-shell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await resetPassword({ token, password }).unwrap();
      setMessage(response.message);
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch {
      setMessage(null);
    }
  };

  return (
    <AuthShell
      eyebrow="Credential Reset"
      title="Set a new password"
      description="Use the reset token from your email and choose a fresh password."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Reset token</Label>
          <Input
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
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
              Resetting...
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message} Redirecting to login...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Reset failed. The token may be invalid or expired.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        <Link
          className="font-semibold text-cyan-700 hover:text-cyan-600"
          to="/login"
        >
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
