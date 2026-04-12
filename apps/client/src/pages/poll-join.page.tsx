import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useJoinPollByTokenQuery } from '@libs/client-server-communication';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { ThemeToggle } from '../components/ui/theme-toggle';

export function PollJoinPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useJoinPollByTokenQuery(
    token ?? '',
    { skip: !token },
  );

  useEffect(() => {
    if (data?.poll.id) {
      navigate(`/polls/${data.poll.id}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="auth-canvas flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
      </div>
    );
  }

  const status = isError ? (error as { status?: number })?.status : undefined;

  const message =
    status === 403
      ? 'This share link has been revoked or has expired.'
      : status === 404
        ? 'Share link not found.'
        : 'Unable to load poll. Please check the link and try again.';

  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-4">
      <ThemeToggle className="fixed right-4 top-4 z-50" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Cannot access poll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
          <Link
            to="/"
            className="inline-block text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Back home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
