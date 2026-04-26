import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(suffix: string) {
  const res = await axios.post('/api/auth/register', {
    name: `Mod User ${suffix}`,
    email: `mod-${suffix}-${Date.now()}@example.com`,
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

async function createPoll(token: string) {
  const res = await axios.post(
    '/api/polls',
    { title: 'Moderation test poll', options: ['Yes', 'No'] },
    { headers: authHeader(token) },
  );
  return res.data as {
    id: string;
    status: string;
    options: { id: string }[];
  };
}

// ---------------------------------------------------------------------------
// POST /api/polls/:id/report
// ---------------------------------------------------------------------------

describe('POST /api/polls/:id/report', () => {
  it('succeeds for an authenticated user with a valid reason', async () => {
    const owner = await register('report-owner');
    const reporter = await register('reporter');
    const poll = await createPoll(owner.accessToken);

    const res = await axios.post(
      `/api/polls/${poll.id}/report`,
      { reason: 'SPAM' },
      { headers: authHeader(reporter.accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('succeeds with optional details field', async () => {
    const owner = await register('report-details-owner');
    const reporter = await register('report-detailer');
    const poll = await createPoll(owner.accessToken);

    const res = await axios.post(
      `/api/polls/${poll.id}/report`,
      { reason: 'INAPPROPRIATE', details: 'This content is harmful.' },
      { headers: authHeader(reporter.accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('returns 400 for an invalid report reason', async () => {
    const owner = await register('report-bad-reason-owner');
    const reporter = await register('report-bad-reasoner');
    const poll = await createPoll(owner.accessToken);

    await expect(
      axios.post(
        `/api/polls/${poll.id}/report`,
        { reason: 'INVALID_REASON' },
        { headers: authHeader(reporter.accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('report-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(
      axios.post(`/api/polls/${poll.id}/report`, { reason: 'SPAM' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

// ---------------------------------------------------------------------------
// POST /api/polls/:id/lock
// ---------------------------------------------------------------------------

describe('POST /api/polls/:id/lock', () => {
  it('owner can lock a poll — status becomes LOCKED', async () => {
    const { accessToken } = await register('lock-owner');
    const poll = await createPoll(accessToken);

    const res = await axios.post(
      `/api/polls/${poll.id}/lock`,
      {},
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.status).toBe('LOCKED');
  });

  it('returns 403 when a non-owner tries to lock', async () => {
    const owner = await register('lock-real-owner');
    const other = await register('lock-other');
    const poll = await createPoll(owner.accessToken);

    await expect(
      axios.post(
        `/api/polls/${poll.id}/lock`,
        {},
        { headers: authHeader(other.accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('lock-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(
      axios.post(`/api/polls/${poll.id}/lock`, {}),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('locked poll cannot receive votes — returns 403', async () => {
    const owner = await register('lock-no-vote-owner');
    const voter = await register('lock-no-voter');
    const poll = await createPoll(owner.accessToken);

    await axios.post(
      `/api/polls/${poll.id}/lock`,
      {},
      { headers: authHeader(owner.accessToken) },
    );

    await expect(
      axios.post(
        `/api/polls/${poll.id}/votes`,
        { optionId: poll.options[0].id },
        { headers: authHeader(voter.accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/polls/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/polls/:id', () => {
  it('owner can delete a poll — subsequent GET returns 404', async () => {
    const { accessToken } = await register('delete-owner');
    const poll = await createPoll(accessToken);

    const deleteRes = await axios.delete(`/api/polls/${poll.id}`, {
      headers: authHeader(accessToken),
    });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.data.success).toBe(true);

    await expect(
      axios.get(`/api/polls/${poll.id}`, { headers: authHeader(accessToken) }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it('returns 403 when a non-owner tries to delete', async () => {
    const owner = await register('delete-real-owner');
    const other = await register('delete-other');
    const poll = await createPoll(owner.accessToken);

    await expect(
      axios.delete(`/api/polls/${poll.id}`, {
        headers: authHeader(other.accessToken),
      }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('delete-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(axios.delete(`/api/polls/${poll.id}`)).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/polls — list own polls with filters and pagination
// ---------------------------------------------------------------------------

describe('GET /api/polls', () => {
  it('returns an empty paginated result when the user has no polls', async () => {
    const { accessToken } = await register('list-empty');

    const res = await axios.get('/api/polls', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
    expect(res.data.total).toBe(0);
    expect(res.data.page).toBe(1);
  });

  it('lists all own polls without filters', async () => {
    const { accessToken } = await register('list-all');

    await createPoll(accessToken);
    await createPoll(accessToken);

    const res = await axios.get('/api/polls', {
      headers: authHeader(accessToken),
    });

    expect(res.data.total).toBeGreaterThanOrEqual(2);
    expect(res.data.data.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by status=OPEN — only returns open polls', async () => {
    const { accessToken } = await register('list-status');
    const poll1 = await createPoll(accessToken);

    // Close poll1
    await axios.post(
      `/api/polls/${poll1.id}/close`,
      {},
      { headers: authHeader(accessToken) },
    );
    // poll2 stays OPEN
    await createPoll(accessToken);

    const res = await axios.get('/api/polls?status=OPEN', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.data.every((p: { status: string }) => p.status === 'OPEN')).toBe(
      true,
    );
  });

  it('filters by status=CLOSED — only returns closed polls', async () => {
    const { accessToken } = await register('list-closed');
    const poll = await createPoll(accessToken);

    await axios.post(
      `/api/polls/${poll.id}/close`,
      {},
      { headers: authHeader(accessToken) },
    );

    const res = await axios.get('/api/polls?status=CLOSED', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(
      res.data.data.every((p: { status: string }) => p.status === 'CLOSED'),
    ).toBe(true);
  });

  it('respects page and limit query parameters', async () => {
    const { accessToken } = await register('list-paginate');

    // Create 3 polls
    await createPoll(accessToken);
    await createPoll(accessToken);
    await createPoll(accessToken);

    const res = await axios.get('/api/polls?page=1&limit=2', {
      headers: authHeader(accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeLessThanOrEqual(2);
    expect(res.data.limit).toBe(2);
    expect(res.data.page).toBe(1);
    expect(res.data.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('returns 401 when unauthenticated', async () => {
    await expect(axios.get('/api/polls')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
