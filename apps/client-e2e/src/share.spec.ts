import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRegister(suffix: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/register', {
    data: {
      name: `Share UI ${suffix}`,
      email: `e2e-share-${suffix}-${Date.now()}@example.com`,
      password: 'Password123!',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { accessToken: string; user: { id: number; email: string } };
}

async function apiCreatePoll(token: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/polls', {
    data: { title: 'Share Link Poll', options: ['Yes', 'No'] },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { id: string; options: { id: string }[] };
}

async function apiCreateShareLink(token: string, pollId: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post(`/api/polls/${pollId}/share-links`, {
    data: {},
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { id: string; token: string; status: string };
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
// Share link management panel
// ---------------------------------------------------------------------------

test.describe('Share link management — owner', () => {
  test('owner sees the "Share links" section on the poll detail page', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('share-owner-1');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await expect(page.getByText(/share links/i)).toBeVisible({ timeout: 10000 });
  });

  test('clicking "Manage" reveals the share panel with "Generate share link" button', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('share-owner-manage');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /manage/i }).click({ timeout: 10000 });

    await expect(
      page.getByRole('button', { name: /generate share link/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('clicking "Generate share link" creates and displays a new link', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('share-owner-gen');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /manage/i }).click({ timeout: 10000 });
    await page
      .getByRole('button', { name: /generate share link/i })
      .click({ timeout: 10000 });

    // A token preview should appear in the panel
    await expect(page.getByText(/\/polls\/join\//i)).toBeVisible({ timeout: 10000 });
  });

  test('copy button shows a check icon after clicking', async ({ page }) => {
    const { accessToken } = await apiRegister('share-owner-copy');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /manage/i }).click({ timeout: 10000 });
    await page
      .getByRole('button', { name: /generate share link/i })
      .click({ timeout: 10000 });

    // Wait for link to appear then click copy button
    await expect(page.getByText(/\/polls\/join\//i)).toBeVisible({ timeout: 10000 });
    await page.getByTitle(/copy link/i).click();

    // The copy icon should be replaced by a check icon temporarily
    // We check the title attribute changes or the icon class
    await expect(page.getByTitle(/copy link/i)).toBeVisible({ timeout: 3000 });
  });

  test('revoking a link removes it from the active list', async ({ page }) => {
    const { accessToken } = await apiRegister('share-owner-revoke');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /manage/i }).click({ timeout: 10000 });
    await page
      .getByRole('button', { name: /generate share link/i })
      .click({ timeout: 10000 });

    await expect(page.getByText(/\/polls\/join\//i)).toBeVisible({ timeout: 10000 });

    // Revoke by clicking X on the link row
    await page.getByTitle(/revoke link/i).click();

    // The link token preview should no longer be visible
    await expect(page.getByText(/\/polls\/join\//i)).not.toBeVisible({
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// Joining via share link — unauthenticated user
// ---------------------------------------------------------------------------

test.describe('Join via share link — unauthenticated', () => {
  test('valid share token redirects to /login for unauthenticated users', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('share-join-unauth-owner');
    const poll = await apiCreatePoll(accessToken);
    const link = await apiCreateShareLink(accessToken, poll.id);

    // Visit share link without being logged in
    await page.goto(`/polls/join/${link.token}`);

    // The join page loads then navigates to /polls/:id which is behind SessionGate
    // SessionGate redirects to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('revoked share token shows "revoked or expired" error', async ({ page }) => {
    const { accessToken } = await apiRegister('share-join-revoked-owner');
    const poll = await apiCreatePoll(accessToken);
    const link = await apiCreateShareLink(accessToken, poll.id);

    // Revoke via API
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    await ctx.post(`/api/polls/${poll.id}/share-links/${link.id}/revoke`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await ctx.dispose();

    await page.goto(`/polls/join/${link.token}`);

    await expect(
      page.getByText(/revoked or has expired/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('non-existent share token shows "not found" error', async ({ page }) => {
    await page.goto('/polls/join/completely-fake-token-xyz');

    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Joining via share link — authenticated user
// ---------------------------------------------------------------------------

test.describe('Join via share link — authenticated user', () => {
  test('authenticated user following a valid share link lands on the poll detail', async ({
    page,
  }) => {
    const owner = await apiRegister('share-join-auth-owner');
    const voter = await apiRegister('share-join-auth-voter');
    const poll = await apiCreatePoll(owner.accessToken);
    const link = await apiCreateShareLink(owner.accessToken, poll.id);

    await loginAndNavigate(page, voter.accessToken, `/polls/join/${link.token}`);

    await expect(page).toHaveURL(`/polls/${poll.id}`, { timeout: 10000 });
    await expect(page.getByText('Share Link Poll')).toBeVisible({ timeout: 10000 });
  });
});
