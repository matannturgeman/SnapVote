import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { selectCurrentUser, useAppSelector } from '@libs/client-store';
import {
  useClosePollMutation,
  useGetPollQuery,
  useUpdatePollMutation,
} from '@libs/client-server-communication';
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

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-slate-100 text-slate-700',
  CLOSED: 'bg-red-100 text-red-800',
};

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
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [closeError, setCloseError] = useState(false);

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
            <p className="text-slate-700">Poll not found.</p>
            <Link
              to="/"
              className="mt-3 inline-block text-sm font-semibold text-cyan-700 hover:text-cyan-600"
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
              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${STATUS_COLORS[poll.status] ?? STATUS_COLORS['DRAFT']}`}
              >
                {poll.status}
              </span>
              <Link
                to="/"
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Back
              </Link>
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
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      {opt.text}
                    </li>
                  ))}
                </ul>
                {closeError && (
                  <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
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
                          className="text-slate-400 hover:text-slate-600"
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
                      className="flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add option
                    </button>
                  )}
                  {nonEmptyEditOptions.length < 2 && (
                    <p className="text-xs text-slate-500">
                      Fill in at least 2 options to save.
                    </p>
                  )}
                </div>
                {updateError ? (
                  <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
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
            {!isOwner && poll.status === 'OPEN' && (
              <p className="text-xs text-slate-500">
                Voting will be available in a future update.
              </p>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400">Poll ID: {poll.id}</p>
      </div>
    </div>
  );
}
