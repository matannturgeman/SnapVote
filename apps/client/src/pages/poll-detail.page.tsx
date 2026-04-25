import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  Flag,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { selectCurrentUser, useAppSelector } from '@libs/client-store';
import {
  useCastVoteMutation,
  useClosePollMutation,
  useCreateShareLinkMutation,
  useDeletePollMutation,
  useGetPollQuery,
  useGetPollResultsQuery,
  useListShareLinksQuery,
  useLockPollMutation,
  usePollStream,
  useReportPollMutation,
  useRevokeShareLinkMutation,
  useUpdatePollMutation,
} from '@libs/client-server-communication';
import { POLL_STATUS_COLORS } from '../lib/poll-ui';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function PollDetailPage() {
  const { id } = useParams<{ id?: string }>();
  const {
    data: poll,
    isLoading,
    isError,
  } = useGetPollQuery(id ?? '', { skip: !id });
  const [closePoll, { isLoading: isClosing }] = useClosePollMutation();
  const user = useAppSelector(selectCurrentUser);

  const [updatePoll, { isLoading: isUpdating, error: updateError }] =
    useUpdatePollMutation();
  const [lockPoll, { isLoading: isLocking }] = useLockPollMutation();
  const [deletePoll, { isLoading: isDeleting }] = useDeletePollMutation();
  const [reportPoll, { isLoading: isReporting }] = useReportPollMutation();

  const ownerCheck = user?.id === poll?.ownerId;
  const { data: shareLinks = [] } = useListShareLinksQuery(id ?? '', {
    skip: !id || !ownerCheck,
  });
  const [createShareLink, { isLoading: isCreatingLink }] =
    useCreateShareLinkMutation();
  const [revokeShareLink] = useRevokeShareLinkMutation();
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [closeError, setCloseError] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [castVote, { isLoading: isVoting }] = useCastVoteMutation();
  const [voteError, setVoteError] = useState(false);
  const { data: results } = useGetPollResultsQuery(id ?? '', { skip: !id });
  const { presence, isConnected } = usePollStream(
    poll?.status === 'OPEN' ? id : undefined,
  );

  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (poll && !isEditing) {
      setEditTitle(poll.title);
      setEditDescription(poll.description ?? '');
      setEditOptions(poll.options.map((o) => o.text));
    }
  }, [poll, isEditing]);

  if (isLoading) {
    return (
      <div className="auth-canvas flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
      </div>
    );
  }

  if (isError || !poll) {
    return (
      <div className="auth-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6">
            <p className="text-slate-700 dark:text-slate-300">
              Poll not found.
            </p>
            <Link
              to="/"
              className="mt-3 inline-block text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              Back home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user?.id === poll.ownerId;
  const canEdit = isOwner && poll.status !== 'CLOSED';

  const onCopyLink = (token: string, linkId: string) => {
    const url = `${window.location.origin}/polls/join/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const onGenerateLink = async () => {
    if (!id) return;
    await createShareLink({ id, body: {} });
    setShowShare(true);
  };

  const onRevoke = async (linkId: string) => {
    if (!id) return;
    await revokeShareLink({ id, linkId });
  };

  const onReport = async () => {
    if (!id || !reportReason) return;
    try {
      await reportPoll({
        id,
        body: { reason: reportReason, details: reportDetails || undefined },
      }).unwrap();
      setReportSuccess(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSuccess(false);
      }, 2000);
    } catch {
      // error state
    }
  };

  const onDelete = async () => {
    if (!id) return;
    await deletePoll(id).unwrap();
  };

  const onLock = async () => {
    if (!id) return;
    await lockPoll(id).unwrap();
  };

  const activeLinks = shareLinks.filter((l) => l.status === 'ACTIVE');

  const onClose = async () => {
    if (!id) return;
    setCloseError(false);
    try {
      await closePoll(id).unwrap();
    } catch {
      setCloseError(true);
    }
  };

  const nonEmptyEditOptions = editOptions.filter((o) => o.trim().length > 0);
  const canSaveEdit =
    editTitle.trim().length > 0 && nonEmptyEditOptions.length >= 2;

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !canSaveEdit) return;
    try {
      await updatePoll({
        id,
        body: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          options: nonEmptyEditOptions,
        },
      }).unwrap();
      setIsEditing(false);
    } catch {
      // updateError state is surfaced in the UI below.
    }
  };

  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${POLL_STATUS_COLORS[poll.status] ?? POLL_STATUS_COLORS['DRAFT']}`}
                >
                  {poll.status}
                </span>
                {poll.status === 'OPEN' && presence !== null && isConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {presence} viewing
                  </span>
                )}
              </div>
              <Link
                to="/"
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Back
              </Link>
              {isOwner && !isEditing && poll.status !== 'LOCKED' && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              )}
              {!isOwner && !isEditing && poll.status !== 'LOCKED' && (
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Report
                </button>
              )}
            </div>
            {!isEditing ? (
              <>
                <CardTitle>{poll.title}</CardTitle>
                {poll.description ? (
                  <CardDescription>{poll.description}</CardDescription>
                ) : null}
              </>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <>
                <ul className="space-y-2">
                  {poll.options.map((opt) => (
                    <li
                      key={opt.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-300"
                    >
                      {opt.text}
                    </li>
                  ))}
                </ul>
                {closeError && (
                  <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300">
                    Could not close the poll. Please try again.
                  </p>
                )}
                {canEdit && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={onClose}
                      disabled={isClosing}
                      className="flex-1"
                    >
                      {isClosing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Close poll'
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={onSaveEdit} className="space-y-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) =>
                          setEditOptions((prev) =>
                            prev.map((o, idx) =>
                              idx === i ? e.target.value : o,
                            ),
                          )
                        }
                        placeholder={`Option ${i + 1}`}
                        maxLength={200}
                      />
                      {editOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditOptions((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setEditOptions((prev) => [...prev, ''])}
                      className="flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add option
                    </button>
                  )}
                  {nonEmptyEditOptions.length < 2 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Fill in at least 2 options to save.
                    </p>
                  )}
                </div>
                {updateError ? (
                  <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300">
                    Could not save changes. Please try again.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isUpdating || !canSaveEdit}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {isOwner && !isEditing && (
              <div className="border-t border-slate-100 pt-4 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Share links{' '}
                    {activeLinks.length > 0 && (
                      <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                        {activeLinks.length}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowShare((v) => !v)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {showShare ? 'Hide' : 'Manage'}
                  </button>
                </div>
                {showShare && (
                  <div className="mt-3 space-y-2">
                    {activeLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-700/50"
                      >
                        <span className="truncate font-mono text-slate-600 dark:text-slate-300">
                          /polls/join/{link.token.slice(0, 12)}…
                        </span>
                        <div className="ml-2 flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => onCopyLink(link.token, link.id)}
                            className="rounded p-1 text-slate-400 hover:text-cyan-700"
                            title="Copy link"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRevoke(link.id)}
                            className="rounded p-1 text-slate-400 hover:text-red-600"
                            title="Revoke link"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onGenerateLink}
                      disabled={isCreatingLink}
                      className="w-full"
                    >
                      {isCreatingLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Generate share link'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {poll.status === 'OPEN' && !isOwner && (
              <div className="border-t border-slate-100 pt-4 space-y-3 dark:border-slate-700/50">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {results?.myVote ? 'Your vote' : 'Cast your vote'}
                </p>
                {voteError && (
                  <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-300">
                    Could not submit vote. Please try again.
                  </p>
                )}
                <ul className="space-y-2">
                  {poll.options.map((opt) => {
                    const voted = results?.myVote?.optionId === opt.id;
                    const count =
                      results?.options.find((o) => o.id === opt.id)
                        ?.voteCount ?? 0;
                    const total = results?.totalVotes ?? 0;
                    const pct =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          disabled={!!results?.myVote || isVoting}
                          onClick={async () => {
                            if (!id) return;
                            setVoteError(false);
                            try {
                              await castVote({
                                id,
                                body: { optionId: opt.id },
                              }).unwrap();
                            } catch {
                              setVoteError(true);
                            }
                          }}
                          className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            voted
                              ? 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                              : results?.myVote
                                ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-default dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt.text}</span>
                            {results?.myVote && (
                              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                                {pct}% ({count})
                              </span>
                            )}
                          </div>
                          {results?.myVote && (
                            <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                              <div
                                className={`h-1 rounded-full ${voted ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {results?.myVote && (
                  <p className="text-xs text-slate-400 text-center dark:text-slate-500">
                    {results.totalVotes} vote
                    {results.totalVotes !== 1 ? 's' : ''} total
                  </p>
                )}
              </div>
            )}
            {(isOwner || poll.status === 'CLOSED') && results && (
              <div className="border-t border-slate-100 pt-4 space-y-3 dark:border-slate-700/50">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Results
                </p>
                <ul className="space-y-2">
                  {results.options.map((opt) => {
                    const pct =
                      results.totalVotes > 0
                        ? Math.round((opt.voteCount / results.totalVotes) * 100)
                        : 0;
                    return (
                      <li key={opt.id}>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700/50">
                          <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300">
                            <span>{opt.text}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {pct}% ({opt.voteCount})
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                            <div
                              className="h-1 rounded-full bg-cyan-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-slate-400 text-center dark:text-slate-500">
                  {results.totalVotes} vote{results.totalVotes !== 1 ? 's' : ''}{' '}
                  total
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Poll ID: {poll.id}
        </p>
      </div>
    </div>
  );
}
