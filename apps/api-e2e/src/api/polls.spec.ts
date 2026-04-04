import axios, { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(suffix: string) {
  const res = await axios.post('/api/auth/register', {
    name: `Poll User ${suffix}`,
    email: `poll-user-${suffix}-${Date.now()}@example.com`,
    password: 'Password123!',
  });
  return res.data as {
    accessToken: string;
    user: { id: number; email: string };
  };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Poll CRUD
// ---------------------------------------------------------------------------

describe('POST /api/polls', () => {
  it('creates a poll and returns OPEN status with options', async () => {
    const { accessToken } = await register('create-1');

    const res = await axios.post(
      '/api/polls',
      { title: 'Best framework?', options: ['React', 'Vue', 'Angular'] },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(201);
    expect(res.data.title).toBe('Best framework?');
    expect(res.data.status).toBe('OPEN');
    expect(res.data.options).toHaveLength(3);
    expect(res.data.id).toBeDefined();
  });

  it('returns 400 for missing title', async () => {
    const { accessToken } = await register('create-2');

    await expect(
      axios.post(
        '/api/polls',
        { options: ['A', 'B'] },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 400 when fewer than 2 options are provided', async () => {
    const { accessToken } = await register('create-3');

    await expect(
      axios.post(
        '/api/polls',
        { title: 'Solo', options: ['Only one'] },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 401 for unauthenticated requests', async () => {
    await expect(
      axios.post('/api/polls', { title: 'Test', options: ['A', 'B'] }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

describe('GET /api/polls/:id', () => {
  it('returns poll by id', async () => {
    const { accessToken } = await register('get-1');

    const created = await axios.post(
      '/api/polls',
      { title: 'Get poll test', options: ['Yes', 'No'] },
      { headers: authHeader(accessToken) },
    );
    const pollId = created.data.id;

    const res = await axios.get(`/api/polls/${pollId}`, {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(pollId);
    expect(res.data.title).toBe('Get poll test');
    expect(res.data.options).toHaveLength(2);
  });

  it('returns 404 for a non-existent poll id', async () => {
    const { accessToken } = await register('get-2');

    await expect(
      axios.get('/api/polls/nonexistent-id', {
        headers: authHeader(accessToken),
      }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it('returns 401 for unauthenticated requests', async () => {
    await expect(axios.get('/api/polls/some-id')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe('PATCH /api/polls/:id', () => {
  it('owner can update title and description', async () => {
    const { accessToken } = await register('update-1');

    const created = await axios.post(
      '/api/polls',
      { title: 'Original title', options: ['A', 'B'] },
      { headers: authHeader(accessToken) },
    );
    const pollId = created.data.id;

    const res = await axios.patch(
      `/api/polls/${pollId}`,
      { title: 'Updated title', description: 'New desc' },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.title).toBe('Updated title');
    expect(res.data.description).toBe('New desc');
  });

  it('owner can replace options', async () => {
    const { accessToken } = await register('update-2');

    const created = await axios.post(
      '/api/polls',
      { title: 'Options poll', options: ['A', 'B'] },
      { headers: authHeader(accessToken) },
    );
    const pollId = created.data.id;

    const res = await axios.patch(
      `/api/polls/${pollId}`,
      { options: ['X', 'Y', 'Z'] },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.options.map((o: { text: string }) => o.text)).toEqual([
      'X',
      'Y',
      'Z',
    ]);
  });

  it('returns 403 when non-owner tries to update', async () => {
    const owner = await register('update-owner');
    const other = await register('update-other');

    const created = await axios.post(
      '/api/polls',
      { title: 'Ownership test', options: ['A', 'B'] },
      { headers: authHeader(owner.accessToken) },
    );
    const pollId = created.data.id;

    await expect(
      axios.patch(
        `/api/polls/${pollId}`,
        { title: 'Hijacked' },
        { headers: authHeader(other.accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 400 when options array has fewer than 2 items', async () => {
    const { accessToken } = await register('update-3');

    const created = await axios.post(
      '/api/polls',
      { title: 'Validation poll', options: ['A', 'B'] },
      { headers: authHeader(accessToken) },
    );

    await expect(
      axios.patch(
        `/api/polls/${created.data.id}`,
        { options: ['Solo'] },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

describe('POST /api/polls/:id/close', () => {
  it('owner can close an open poll', async () => {
    const { accessToken } = await register('close-1');

    const created = await axios.post(
      '/api/polls',
      { title: 'Close me', options: ['Yes', 'No'] },
      { headers: authHeader(accessToken) },
    );
    const pollId = created.data.id;

    const res = await axios.post(
      `/api/polls/${pollId}/close`,
      {},
      {
        headers: authHeader(accessToken),
      },
    );

    expect(res.status).toBe(200);
    expect(res.data.status).toBe('CLOSED');
    expect(res.data.closedAt).toBeDefined();
  });

  it('returns 403 when trying to update a closed poll', async () => {
    const { accessToken } = await register('close-2');

    const created = await axios.post(
      '/api/polls',
      { title: 'Already closed', options: ['A', 'B'] },
      { headers: authHeader(accessToken) },
    );
    const pollId = created.data.id;

    await axios.post(
      `/api/polls/${pollId}/close`,
      {},
      { headers: authHeader(accessToken) },
    );

    await expect(
      axios.patch(
        `/api/polls/${pollId}`,
        { title: 'Too late' },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 403 when non-owner tries to close', async () => {
    const owner = await register('close-owner');
    const other = await register('close-other');

    const created = await axios.post(
      '/api/polls',
      { title: 'My poll', options: ['A', 'B'] },
      { headers: authHeader(owner.accessToken) },
    );

    await expect(
      axios.post(
        `/api/polls/${created.data.id}/close`,
        {},
        { headers: authHeader(other.accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 401 for unauthenticated close attempt', async () => {
    await expect(
      axios.post('/api/polls/some-id/close', {}),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});
