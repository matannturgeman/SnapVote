import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(suffix: string) {
  const res = await axios.post('/api/auth/register', {
    name: `Vote User ${suffix}`,
    email: `vote-${suffix}-${Date.now()}@example.com`,
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

async function createPoll(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await axios.post(
    '/api/polls',
    {
      title: 'Vote test poll',
      options: ['Alpha', 'Beta', 'Gamma'],
      visibilityMode: 'PRIVATE',
      allowMultipleAnswers: false,
      ...overrides,
    },
    { headers: authHeader(token) },
  );
  return res.data as {
    id: string;
    options: { id: string; text: string; order: number }[];
    status: string;
  };
}

// ---------------------------------------------------------------------------
// POST /api/polls/:id/votes — cast vote
// ---------------------------------------------------------------------------

describe('POST /api/polls/:id/votes', () => {
  it('casts a vote and returns results with totalVotes = 1', async () => {
    const { accessToken } = await register('cast-1');
    const poll = await createPoll(accessToken);
    const optionId = poll.options[0].id;

    const res = await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.pollId).toBe(poll.id);
    expect(res.data.totalVotes).toBe(1);
    expect(res.data.myVotes).toEqual([{ optionId }]);
    const opt = res.data.options.find((o: { id: string }) => o.id === optionId);
    expect(opt.voteCount).toBe(1);
  });

  it('single-select: voting again replaces the previous vote', async () => {
    const { accessToken } = await register('cast-replace');
    const poll = await createPoll(accessToken);
    const [first, second] = poll.options;

    // Vote for first option
    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: first.id },
      { headers: authHeader(accessToken) },
    );

    // Vote for second option — should replace first
    const res = await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: second.id },
      { headers: authHeader(accessToken) },
    );

    expect(res.data.totalVotes).toBe(1);
    expect(res.data.myVotes).toEqual([{ optionId: second.id }]);
    const firstOpt = res.data.options.find(
      (o: { id: string }) => o.id === first.id,
    );
    expect(firstOpt.voteCount).toBe(0);
  });

  it('multi-select: each option vote accumulates separately', async () => {
    const { accessToken } = await register('cast-multi');
    const poll = await createPoll(accessToken, { allowMultipleAnswers: true });
    const [first, second] = poll.options;

    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: first.id },
      { headers: authHeader(accessToken) },
    );

    const res = await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: second.id },
      { headers: authHeader(accessToken) },
    );

    expect(res.data.totalVotes).toBe(2);
    expect(res.data.myVotes).toHaveLength(2);
    expect(res.data.myVotes.map((v: { optionId: string }) => v.optionId)).toContain(
      first.id,
    );
    expect(res.data.myVotes.map((v: { optionId: string }) => v.optionId)).toContain(
      second.id,
    );
  });

  it('multi-select: voting for same option again is idempotent', async () => {
    const { accessToken } = await register('cast-multi-idem');
    const poll = await createPoll(accessToken, { allowMultipleAnswers: true });
    const optionId = poll.options[0].id;

    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(accessToken) },
    );
    const res = await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(accessToken) },
    );

    expect(res.data.totalVotes).toBe(1);
    expect(res.data.myVotes).toHaveLength(1);
  });

  it('returns 403 when the poll is closed', async () => {
    const { accessToken } = await register('cast-closed');
    const poll = await createPoll(accessToken);

    await axios.post(
      `/api/polls/${poll.id}/close`,
      {},
      { headers: authHeader(accessToken) },
    );

    await expect(
      axios.post(
        `/api/polls/${poll.id}/votes`,
        { optionId: poll.options[0].id },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 400 for an optionId that does not belong to the poll', async () => {
    const { accessToken } = await register('cast-bad-opt');
    const poll = await createPoll(accessToken);

    await expect(
      axios.post(
        `/api/polls/${poll.id}/votes`,
        { optionId: 'nonexistent-option-id' },
        { headers: authHeader(accessToken) },
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('cast-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(
      axios.post(`/api/polls/${poll.id}/votes`, {
        optionId: poll.options[0].id,
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/polls/:id/votes/my/:optionId — delete vote
// ---------------------------------------------------------------------------

describe('DELETE /api/polls/:id/votes/my/:optionId', () => {
  it('removes a previously cast vote and returns updated results', async () => {
    const { accessToken } = await register('del-vote-1');
    const poll = await createPoll(accessToken);
    const optionId = poll.options[0].id;

    // Vote first
    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(accessToken) },
    );

    const res = await axios.delete(
      `/api/polls/${poll.id}/votes/my/${optionId}`,
      { headers: authHeader(accessToken) },
    );

    expect(res.status).toBe(200);
    expect(res.data.totalVotes).toBe(0);
    expect(res.data.myVotes).toHaveLength(0);
  });

  it('returns 400 when there is no vote to remove', async () => {
    const { accessToken } = await register('del-vote-none');
    const poll = await createPoll(accessToken);
    const optionId = poll.options[0].id;

    await expect(
      axios.delete(`/api/polls/${poll.id}/votes/my/${optionId}`, {
        headers: authHeader(accessToken),
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns 403 when the poll is closed', async () => {
    const { accessToken } = await register('del-vote-closed');
    const poll = await createPoll(accessToken);
    const optionId = poll.options[0].id;

    // Vote then close
    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(accessToken) },
    );
    await axios.post(
      `/api/polls/${poll.id}/close`,
      {},
      { headers: authHeader(accessToken) },
    );

    await expect(
      axios.delete(`/api/polls/${poll.id}/votes/my/${optionId}`, {
        headers: authHeader(accessToken),
      }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('del-vote-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(
      axios.delete(`/api/polls/${poll.id}/votes/my/${poll.options[0].id}`),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});

// ---------------------------------------------------------------------------
// GET /api/polls/:id/results
// ---------------------------------------------------------------------------

describe('GET /api/polls/:id/results', () => {
  it('returns tallies and myVotes for the requesting user', async () => {
    const owner = await register('results-owner');
    const voter = await register('results-voter');
    const poll = await createPoll(owner.accessToken);
    const optionId = poll.options[1].id;

    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(voter.accessToken) },
    );

    const res = await axios.get(`/api/polls/${poll.id}/results`, {
      headers: authHeader(voter.accessToken),
    });

    expect(res.status).toBe(200);
    expect(res.data.pollId).toBe(poll.id);
    expect(res.data.totalVotes).toBe(1);
    expect(res.data.myVotes).toEqual([{ optionId }]);
    expect(res.data.visibilityMode).toBe('PRIVATE');
  });

  it('owner sees results with all vote counts', async () => {
    const owner = await register('results-owner-view');
    const voter1 = await register('results-v1');
    const voter2 = await register('results-v2');
    const poll = await createPoll(owner.accessToken);

    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: poll.options[0].id },
      { headers: authHeader(voter1.accessToken) },
    );
    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId: poll.options[1].id },
      { headers: authHeader(voter2.accessToken) },
    );

    const res = await axios.get(`/api/polls/${poll.id}/results`, {
      headers: authHeader(owner.accessToken),
    });

    expect(res.data.totalVotes).toBe(2);
    const opt0 = res.data.options.find(
      (o: { id: string }) => o.id === poll.options[0].id,
    );
    const opt1 = res.data.options.find(
      (o: { id: string }) => o.id === poll.options[1].id,
    );
    expect(opt0.voteCount).toBe(1);
    expect(opt1.voteCount).toBe(1);
  });

  it('transparent poll includes voter identities per option', async () => {
    const owner = await register('results-transparent-owner');
    const voter = await register('results-transparent-voter');
    const poll = await createPoll(owner.accessToken, {
      visibilityMode: 'TRANSPARENT',
    });
    const optionId = poll.options[0].id;

    await axios.post(
      `/api/polls/${poll.id}/votes`,
      { optionId },
      { headers: authHeader(voter.accessToken) },
    );

    const res = await axios.get(`/api/polls/${poll.id}/results`, {
      headers: authHeader(voter.accessToken),
    });

    expect(res.data.visibilityMode).toBe('TRANSPARENT');
    const opt = res.data.options.find((o: { id: string }) => o.id === optionId);
    expect(opt.voters).toBeDefined();
    expect(opt.voters.length).toBe(1);
    expect(opt.voters[0].id).toBe(voter.user.id);
  });

  it('returns 404 for a non-existent poll', async () => {
    const { accessToken } = await register('results-404');

    await expect(
      axios.get('/api/polls/nonexistent-poll-id/results', {
        headers: authHeader(accessToken),
      }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });

  it('returns 401 when unauthenticated', async () => {
    const { accessToken } = await register('results-unauth-owner');
    const poll = await createPoll(accessToken);

    await expect(
      axios.get(`/api/polls/${poll.id}/results`),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });
});
