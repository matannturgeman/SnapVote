import { Link } from 'react-router-dom';
import { ChevronRight, Loader2, Plus, Vote } from 'lucide-react';
import { useGetMyPollsQuery } from '@libs/client-server-communication';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  CLOSED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export function HomePage() {
  const { data: polls, isLoading } = useGetMyPollsQuery();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            My Polls
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage and track your polls
          </p>
        </div>
        <Link to="/polls/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Poll
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-700 dark:text-cyan-400" />
        </div>
      ) : !polls || polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Vote className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <CardTitle className="text-base text-slate-600 dark:text-slate-300">
              No polls yet
            </CardTitle>
            <CardDescription>
              Create your first poll to get started.
            </CardDescription>
            <Link to="/polls/new" className="mt-2">
              <Button variant="secondary">
                <Plus className="h-4 w-4" />
                Create Poll
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link to={`/polls/${poll.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">
                          {poll.title}
                        </CardTitle>
                        {poll.description && (
                          <CardDescription className="mt-0.5 truncate">
                            {poll.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[poll.status] ?? STATUS_COLORS['DRAFT']}`}
                        >
                          {poll.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {poll.options.length} option
                      {poll.options.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
