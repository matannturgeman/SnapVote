import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import {
  useExplorePollsQuery,
  useListThemesQuery,
} from '@libs/client-server-communication';
import type { PollExploreQueryDto } from '@libs/shared-dto';
import { formatDate } from '@libs/client-shared';
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

type StatusFilter = NonNullable<PollExploreQueryDto['status']> | 'ALL';

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Draft', value: 'DRAFT' },
];

const LIMIT = 10;

export function ExplorePage() {
  const [selectedTheme, setSelectedTheme] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [voterIdInput, setVoterIdInput] = useState('');
  const [ownerIdInput, setOwnerIdInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: themes, isLoading: themesLoading } = useListThemesQuery();

  const voterId = voterIdInput ? Number(voterIdInput) : undefined;
  const ownerId = ownerIdInput ? Number(ownerIdInput) : undefined;

  const { data, isLoading } = useExplorePollsQuery({
    ...(selectedTheme ? { theme: selectedTheme } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(voterId ? { voterId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(fromDate ? { from: new Date(fromDate) } : {}),
    ...(toDate ? { to: new Date(toDate) } : {}),
    page,
    limit: LIMIT,
  });

  const totalPages = data?.totalPages ?? 1;

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Explore Polls
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Browse and filter polls by theme, participant, or status.
        </p>
      </div>

      {/* Theme chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedTheme(undefined);
            resetPage();
          }}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            selectedTheme === undefined
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          All Themes
        </button>
        {themesLoading && (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        )}
        {themes?.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => {
              setSelectedTheme(t.slug);
              resetPage();
            }}
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
              selectedTheme === t.slug
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              resetPage();
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="number"
            placeholder="Owner ID"
            value={ownerIdInput}
            onChange={(e) => {
              setOwnerIdInput(e.target.value);
              resetPage();
            }}
            className="pl-8"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="number"
            placeholder="Voter ID"
            value={voterIdInput}
            onChange={(e) => {
              setVoterIdInput(e.target.value);
              resetPage();
            }}
            className="pl-8"
          />
        </div>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            resetPage();
          }}
          title="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            resetPage();
          }}
          title="To date"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : !data?.data.length ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          No polls match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((poll) => (
            <Link key={poll.id} to={`/polls/${poll.id}`} className="block">
              <Card className="cursor-pointer transition-shadow hover:shadow-md dark:bg-slate-800/90 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-slate-900 dark:text-slate-100">
                      {poll.title}
                    </CardTitle>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${POLL_STATUS_COLORS[poll.status]}`}
                    >
                      {poll.status}
                    </span>
                  </div>
                  {poll.description && (
                    <CardDescription className="line-clamp-2 dark:text-slate-400">
                      {poll.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>{poll.options.length} options</span>
                    {poll.totalVotes !== undefined && (
                      <span>{poll.totalVotes} votes</span>
                    )}
                    <span>{formatDate(poll.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
