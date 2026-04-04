import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useCreatePollMutation } from '@libs/client-server-communication';
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

export function CreatePollPage() {
  const navigate = useNavigate();
  const [createPoll, { isLoading, error }] = useCreatePollMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length < 10) setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2)
      setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const nonEmptyOptions = options.filter((o) => o.trim().length > 0);
  const canSubmit = title.trim().length > 0 && nonEmptyOptions.length >= 2;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      const poll = await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        options: nonEmptyOptions,
      }).unwrap();
      navigate(`/polls/${poll.id}`);
    } catch {
      // RTK Query exposes error state.
    }
  };

  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
              New Poll
            </span>
            <CardTitle>Create a poll</CardTitle>
            <CardDescription>
              Add a question and at least 2 options. The poll opens immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="poll-title">Question / Title</Label>
                <Input
                  id="poll-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What should we build next?"
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-description">Description (optional)</Label>
                <Input
                  id="poll-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any extra context..."
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      maxLength={200}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add option
                  </button>
                )}
                {nonEmptyOptions.length < 2 && (
                  <p className="text-xs text-slate-500">
                    Fill in at least 2 options to continue.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !canSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create poll'
                  )}
                </Button>
                <Link to="/">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
            {error ? (
              <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                Could not create poll. Please try again.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
