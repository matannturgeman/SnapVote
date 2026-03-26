import { useState } from 'react';
import { useListThemesQuery, useCreateThemeMutation } from '@libs/client-server-communication';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export function ThemeManagerPage() {
  const { data: themes, isLoading, refetch } = useListThemesQuery();
  const [createTheme, { isLoading: isCreating }] = useCreateThemeMutation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingId) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Theme name is required');
      return;
    }

    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }

    try {
      await createTheme({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || undefined,
      }).unwrap();

      setName('');
      setSlug('');
      setDescription('');
      setEditingId(null);
      refetch();
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to create theme');
    }
  };

  const handleEdit = (theme: any) => {
    setEditingId(theme.id);
    setName(theme.name);
    setSlug(theme.slug);
    setDescription(theme.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {editingId ? 'Edit Theme' : 'Create New Theme'}
          </CardTitle>
          <CardDescription>
            Themes categorize polls for better discovery and filtering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Theme Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Anime, Movies, Relationships"
                maxLength={50}
                disabled={isLoading || isCreating}
                required
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="e.g., anime, movies, relationships"
                maxLength={50}
                disabled={isLoading || isCreating || !!editingId}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and API filters. Auto-generated from name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this theme..."
                maxLength={500}
                rows={2}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isCreating}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading || isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update Theme' : 'Create Theme'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading || isCreating}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Themes</CardTitle>
          <CardDescription>
            {themes?.length || 0} theme{themes?.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : themes && themes.length > 0 ? (
            <div className="space-y-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{theme.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {theme.slug}
                      </span>
                    </div>
                    {theme.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created: {new Date(theme.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(theme)}
                      disabled={isCreating}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No themes created yet.</p>
              <p className="text-sm">Create your first theme above to start categorizing polls.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
