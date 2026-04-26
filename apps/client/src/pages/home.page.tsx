import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Vote,
} from 'lucide-react';
import { formatDate } from '@libs/client-shared';
import { useListMyPollsQuery } from '@libs/client-server-communication';
import type { PollListQueryDto } from '@libs/shared-dto';
import { POLL_STATUS_COLORS } from '../lib/poll-ui';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

type StatusFilter = NonNullable<PollListQueryDto['status']> | 'ALL';

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Draft', value: 'DRAFT' },
];

const LIMIT = 10;

export function HomePage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListMyPollsQuery({
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(fromDate ? { from: new Date(fromDate) } : {}),
    ...(toDate ? { to: new Date(toDate) } : {}),
    page,
    limit: LIMIT,
  });

  const polls = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalVotes = polls.reduce((sum, p) => sum + (p.totalVotes ?? 0), 0);

  function handleFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleDateFilterChange() {
    setPage(1);
  }

  function handleFromDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFromDate(e.target.value);
    handleDateFilterChange();
  }

  function handleToDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setToDate(e.target.value);
    handleDateFilterChange();
  }

  const filterLabel = statusFilter !== 'ALL' ? statusFilter.toLowerCase() : '';

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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Polls</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {data?.total ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Votes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalVotes}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Open Polls</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {polls.filter((p) => p.status === 'OPEN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Closed Polls</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
              {polls.filter((p) => p.status === 'CLOSED').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleFilterChange(tab.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            type="date"
            value={fromDate}
            onChange={handleFromDateChange}
            className="w-36"
          />
        </div>
        <span className="text-slate-400 dark:text-slate-500">to</span>
        <Input
          type="date"
          value={toDate}
          onChange={handleToDateChange}
          className="w-36"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-700 dark:text-cyan-400" />
        </div>
      ) : polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Vote className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <CardTitle className="text-base text-slate-600 dark:text-slate-300">
              {statusFilter === 'ALL'
                ? 'No polls yet'
                : `No ${filterLabel} polls`}
            </CardTitle>
            <CardDescription>
              {statusFilter === 'ALL'
                ? 'Create your first poll to get started.'
                : `You have no ${filterLabel} polls.`}
            </CardDescription>
            {statusFilter === 'ALL' && (
              <Link to="/polls/new" className="mt-2">
                <Button variant="secondary">
                  <Plus className="h-4 w-4" />
                  Create Poll
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
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
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${POLL_STATUS_COLORS[poll.status] ?? POLL_STATUS_COLORS['DRAFT']}`}
                          >
                            {poll.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span>
                          {poll.options.length} option
                          {poll.options.length !== 1 ? 's' : ''}
                        </span>
                        {poll.totalVotes !== undefined && (
                          <span className="flex items-center gap-1">
                            <BarChart2 className="h-3 w-3" />
                            {poll.totalVotes} vote
                            {poll.totalVotes !== 1 ? 's' : ''}
                          </span>
                        )}
                        {poll.status === 'CLOSED' && poll.closedAt && (
                          <span>Closed {formatDate(poll.closedAt)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
