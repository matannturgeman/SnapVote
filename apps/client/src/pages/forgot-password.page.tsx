import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { useForgotPasswordMutation } from '@libs/client-server-communication';
import { AuthShell } from '../components/auth-shell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function ForgotPasswordPage() {
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await forgotPassword({ email }).unwrap();
      setMessage(response.message);
    } catch {
      setMessage(null);
    }
  };

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Forgot your password?"
      description="Request a reset link. For security, the response is generic regardless of account existence."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <Button type="submit" className="w-full" variant="secondary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      {message ? (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{message}</p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Could not submit request. Please try again.
        </p>
      ) : null}

      <p className="text-sm text-slate-600">
        <Link
          className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:text-cyan-600"
          to="/login"
        >
          <KeyRound className="h-4 w-4" />
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
