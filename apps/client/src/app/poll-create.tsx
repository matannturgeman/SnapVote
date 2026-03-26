import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useCreatePollMutation } from '@libs/client-server-communication';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { cn } from '../lib/utils';

export function PollCreatePage() {
  const navigate = useNavigate();
  const [createPoll, { isLoading }] = useCreatePollMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [visibilityMode, setVisibilityMode] = useState<
    'TRANSPARENT' | 'ANONYMOUS' | 'PRIVATE'
  >('TRANSPARENT');
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [themeIds, setThemeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (title.length > 200) {
      setError('Title must be at most 200 characters');
      return;
    }

    if (description.length > 1000) {
      setError('Description must be at most 1000 characters');
      return;
    }

    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    if (validOptions.length > 10) {
      setError('Maximum 10 options allowed');
      return;
    }

    try {
      const result = await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        options: validOptions.map((text) => ({ text: text.trim() })),
        visibilityMode,
        allowMultipleAnswers,
        themeIds: themeIds.length > 0 ? themeIds : undefined,
      }).unwrap();

      navigate(`/poll/${result.id}`);
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create poll');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Poll</CardTitle>
          <CardDescription>
            Create a new poll in under a minute. Add options and customize
            settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Poll Question</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question?"
                maxLength={200}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context to your poll..."
                maxLength={1000}
                rows={3}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= 10 || isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      disabled={isLoading}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {options.filter((o) => o.trim()).length}/10 options (minimum 2)
              </p>
            </div>

            {/* Visibility Mode */}
            <div className="space-y-2">
              <Label>Visibility Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['TRANSPARENT', 'ANONYMOUS', 'PRIVATE'] as const).map(
                  (mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={visibilityMode === mode ? 'default' : 'outline'}
                      onClick={() => setVisibilityMode(mode)}
                      disabled={isLoading}
                      className="capitalize"
                    >
                      {mode.toLowerCase()}
                    </Button>
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {visibilityMode === 'TRANSPARENT' &&
                  'Everyone can see who voted for each option.'}
                {visibilityMode === 'ANONYMOUS' &&
                  'Vote counts are visible but voter identities are hidden.'}
                {visibilityMode === 'PRIVATE' &&
                  'Only you can see the results.'}
              </p>
            </div>

            {/* Multiple Answers */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowMultipleAnswers"
                checked={allowMultipleAnswers}
                onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400"
              />
              <Label htmlFor="allowMultipleAnswers" className="cursor-pointer">
                Allow multiple answers (WhatsApp-style)
              </Label>
            </div>

            {/* Theme Selection */}
            <div className="space-y-2">
              <Label>Themes (optional)</Label>
              {isLoadingThemes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading themes...
                </div>
              ) : themes && themes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className="flex items-center space-x-2 rounded-md border p-3"
                    >
                      <input
                        type="checkbox"
                        id={`theme-${theme.id}`}
                        checked={themeIds.includes(theme.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setThemeIds([...themeIds, theme.id]);
                          } else {
                            setThemeIds(
                              themeIds.filter((id) => id !== theme.id),
                            );
                          }
                        }}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400"
                      />
                      <Label
                        htmlFor={`theme-${theme.id}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {theme.name}

                        <span className="ml-1 text-xs text-muted-foreground">
                          ({theme.slug})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No themes available. Create themes in the theme manager.
                </p>
              )}
              {themeIds.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Selected: {themeIds.length} theme
                    {themeIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Poll
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
