import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRegister(suffix: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/register', {
    data: {
      name: `Vote UI ${suffix}`,
      email: `e2e-vote-${suffix}-${Date.now()}@example.com`,
      password: 'Password123!',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { accessToken: string; user: { id: number; email: string } };
}

async function apiCreatePoll(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/polls', {
    data: {
      title: 'Voting Test Poll',
      options: ['Red', 'Green', 'Blue'],
      visibilityMode: 'PRIVATE',
      allowMultipleAnswers: false,
      ...overrides,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as {
    id: string;
    options: { id: string; text: string }[];
    status: string;
  };
}

async function loginAndNavigate(
  page: import('@playwright/test').Page,
  token: string,
  path: string,
) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token);
  await page.goto(path);
}

// ---------------------------------------------------------------------------
// Non-owner voting UI
// ---------------------------------------------------------------------------

test.describe('Voting UI — non-owner participant', () => {
  test('non-owner sees "Cast your vote" section on an open poll', async ({
    page,
  }) => {
    const owner = await apiRegister('vote-owner-1');
    const voter = await apiRegister('voter-1');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    await expect(page.getByText(/cast your vote/i)).toBeVisible({ timeout: 10000 });
  });

  test('clicking an option selects it and shows it as voted', async ({ page }) => {
    const owner = await apiRegister('vote-owner-select');
    const voter = await apiRegister('voter-select');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    // Find and click the first votable option button
    const optionBtn = page.getByRole('button', { name: 'Red' });
    await optionBtn.click({ timeout: 10000 });

    // After voting the option row should indicate it is selected (cyan styling)
    // and the deselect button (X) should appear
    await expect(
      page.getByTitle(/remove vote/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('after voting, percentage and count are displayed', async ({ page }) => {
    const owner = await apiRegister('vote-owner-pct');
    const voter = await apiRegister('voter-pct');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);
    await page.getByRole('button', { name: 'Red' }).click({ timeout: 10000 });

    // Percentage text should appear (100% for single voter)
    await expect(page.getByText('100%')).toBeVisible({ timeout: 10000 });
  });

  test('single-select: voting for a different option replaces the previous vote', async ({
    page,
  }) => {
    const owner = await apiRegister('vote-owner-replace');
    const voter = await apiRegister('voter-replace');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    // Vote Red
    await page.getByRole('button', { name: 'Red' }).click({ timeout: 10000 });
    await expect(page.getByTitle(/remove vote/i)).toBeVisible({ timeout: 10000 });

    // Remove vote by clicking X
    await page.getByTitle(/remove vote/i).click();

    // Then vote Green
    await page.getByRole('button', { name: 'Green' }).click({ timeout: 10000 });

    // Red should no longer have the deselect icon; Green should
    // totalVotes should remain 1
    await expect(page.getByText(/1 vote total/i)).toBeVisible({ timeout: 10000 });
  });

  test('clicking the deselect button (X) removes the vote', async ({ page }) => {
    const owner = await apiRegister('vote-owner-desel');
    const voter = await apiRegister('voter-desel');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: 'Red' }).click({ timeout: 10000 });
    await expect(page.getByTitle(/remove vote/i)).toBeVisible({ timeout: 10000 });

    await page.getByTitle(/remove vote/i).click();

    // After deselect, the "Cast your vote" heading should reappear
    await expect(page.getByText(/cast your vote/i)).toBeVisible({ timeout: 10000 });
  });

  test('multi-select poll shows "Cast your votes" and allows multiple selections', async ({
    page,
  }) => {
    const owner = await apiRegister('vote-owner-multi');
    const voter = await apiRegister('voter-multi');
    const poll = await apiCreatePoll(owner.accessToken, {
      allowMultipleAnswers: true,
    });

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    await expect(page.getByText(/cast your votes/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Red' }).click({ timeout: 10000 });
    await page.getByRole('button', { name: 'Green' }).click({ timeout: 5000 });

    // Both X (deselect) buttons should now be visible
    const deselectBtns = page.getByTitle(/remove vote/i);
    await expect(deselectBtns).toHaveCount(2, { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Owner results view
// ---------------------------------------------------------------------------

test.describe('Results view — owner', () => {
  test('owner sees "Results" section, not the voting UI', async ({ page }) => {
    const owner = await apiRegister('results-owner-ui');
    const poll = await apiCreatePoll(owner.accessToken);

    await loginAndNavigate(page, owner.accessToken, `/polls/${poll.id}`);

    await expect(page.getByText(/^Results$/)).toBeVisible({ timeout: 10000 });
    // Voting section should not be shown to the owner
    await expect(page.getByText(/cast your vote/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Closed poll
// ---------------------------------------------------------------------------

test.describe('Closed poll', () => {
  test('shows Results section but no voting UI for any user', async ({ page }) => {
    const owner = await apiRegister('closed-owner');
    const voter = await apiRegister('closed-voter');
    const poll = await apiCreatePoll(owner.accessToken);

    // Close via API
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    await ctx.post(`/api/polls/${poll.id}/close`, {
      headers: { Authorization: `Bearer ${owner.accessToken}` },
    });
    await ctx.dispose();

    await loginAndNavigate(page, voter.accessToken, `/polls/${poll.id}`);

    await expect(page.getByText('CLOSED')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^Results$/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/cast your vote/i)).not.toBeVisible();
  });
});
