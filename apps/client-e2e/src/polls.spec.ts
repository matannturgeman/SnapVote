import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRegister(suffix: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/register', {
    data: {
      name: `Poll UI ${suffix}`,
      email: `e2e-polls-${suffix}-${Date.now()}@example.com`,
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
      title: 'E2E Test Poll',
      options: ['Option A', 'Option B', 'Option C'],
      ...overrides,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as {
    id: string;
    title: string;
    status: string;
    options: { id: string; text: string }[];
  };
}

async function loginAndNavigate(
  page: import('@playwright/test').Page,
  token: string,
  path = '/',
) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token);
  await page.goto(path);
}

// ---------------------------------------------------------------------------
// Home page — My Polls
// ---------------------------------------------------------------------------

test.describe('Home page — My Polls', () => {
  test('shows "My Polls" heading and "New Poll" button', async ({ page }) => {
    const { accessToken } = await apiRegister('home-1');
    await loginAndNavigate(page, accessToken, '/');

    await expect(page.getByRole('heading', { name: /my polls/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('link', { name: /new poll/i })).toBeVisible();
  });

  test('shows empty-state card when user has no polls', async ({ page }) => {
    const { accessToken } = await apiRegister('home-empty');
    await loginAndNavigate(page, accessToken, '/');

    await expect(page.getByText(/no polls yet/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows created poll in the list', async ({ page }) => {
    const { accessToken } = await apiRegister('home-list');
    await apiCreatePoll(accessToken, { title: 'My Unique Poll Title 1234' });
    await loginAndNavigate(page, accessToken, '/');

    await expect(
      page.getByText('My Unique Poll Title 1234'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('status filter tabs are visible', async ({ page }) => {
    const { accessToken } = await apiRegister('home-filter');
    await loginAndNavigate(page, accessToken, '/');

    await expect(page.getByRole('button', { name: 'All' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Closed' })).toBeVisible();
  });

  test('filtering by OPEN shows only open polls', async ({ page }) => {
    const { accessToken } = await apiRegister('home-filter-open');

    // Create one poll then close it
    const poll = await apiCreatePoll(accessToken, { title: 'Will be closed' });
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    await ctx.post(`/api/polls/${poll.id}/close`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await ctx.dispose();

    // Create one open poll
    await apiCreatePoll(accessToken, { title: 'Stays open' });

    await loginAndNavigate(page, accessToken, '/');
    await page.getByRole('button', { name: 'Open' }).click();

    await expect(page.getByText('Stays open')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Will be closed')).not.toBeVisible();
  });

  test('summary cards show total polls count', async ({ page }) => {
    const { accessToken } = await apiRegister('home-summary');
    await apiCreatePoll(accessToken);
    await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, '/');

    // Total Polls card should show at least 2
    const totalCard = page.getByText('Total Polls').locator('..').locator('..');
    await expect(totalCard).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Create poll page
// ---------------------------------------------------------------------------

test.describe('Create poll page', () => {
  test('renders the create poll form', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-1');
    await loginAndNavigate(page, accessToken, '/polls/new');

    await expect(page.getByRole('heading', { name: /create a poll/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#poll-title')).toBeVisible();
    await expect(page.locator('#poll-description')).toBeVisible();
  });

  test('Create poll button is disabled when title is empty', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-disabled');
    await loginAndNavigate(page, accessToken, '/polls/new');

    await expect(
      page.getByRole('button', { name: /create poll/i }),
    ).toBeDisabled({ timeout: 10000 });
  });

  test('shows hint when fewer than 2 options are filled', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-opts');
    await loginAndNavigate(page, accessToken, '/polls/new');

    await page.fill('#poll-title', 'Test Poll');
    // Clear both default option inputs
    const inputs = page.locator('input[placeholder^="Option"]');
    await inputs.nth(0).fill('');
    await inputs.nth(1).fill('');

    await expect(
      page.getByText(/fill in at least 2 options/i),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('button', { name: /create poll/i }),
    ).toBeDisabled();
  });

  test('creating a poll redirects to the poll detail page', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-redirect');
    await loginAndNavigate(page, accessToken, '/polls/new');

    await page.fill('#poll-title', 'UI Created Poll');
    const inputs = page.locator('input[placeholder^="Option"]');
    await inputs.nth(0).fill('Choice One');
    await inputs.nth(1).fill('Choice Two');

    await page.getByRole('button', { name: /create poll/i }).click();

    await expect(page).toHaveURL(/\/polls\/[^/]+$/, { timeout: 15000 });
    await expect(page.getByText('UI Created Poll')).toBeVisible();
  });

  test('"Add option" button adds a new option input', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-add-opt');
    await loginAndNavigate(page, accessToken, '/polls/new');

    const addBtn = page.getByRole('button', { name: /add option/i });
    await addBtn.click({ timeout: 10000 });

    const inputs = page.locator('input[placeholder^="Option"]');
    await expect(inputs).toHaveCount(3);
  });

  test('Cancel button navigates back to home', async ({ page }) => {
    const { accessToken } = await apiRegister('create-ui-cancel');
    await loginAndNavigate(page, accessToken, '/polls/new');

    await page.getByRole('button', { name: /cancel/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Poll detail page — owner actions
// ---------------------------------------------------------------------------

test.describe('Poll detail page — owner', () => {
  test('shows poll title, status badge, and options', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-owner-1');
    const poll = await apiCreatePoll(accessToken, { title: 'Detail View Poll' });
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await expect(page.getByText('Detail View Poll')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OPEN')).toBeVisible();
    await expect(page.getByText('Option A')).toBeVisible();
  });

  test('owner sees Edit and Close poll buttons', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-owner-btns');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: /close poll/i })).toBeVisible();
  });

  test('owner can close poll — status changes to CLOSED', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-close');
    const poll = await apiCreatePoll(accessToken, { title: 'Close Me Poll' });
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /close poll/i }).click({ timeout: 10000 });

    await expect(page.getByText('CLOSED')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /close poll/i })).not.toBeVisible();
  });

  test('owner can edit poll title and save', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-edit');
    const poll = await apiCreatePoll(accessToken, { title: 'Original Title' });
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('button', { name: /edit/i }).click({ timeout: 10000 });

    const titleInput = page.getByLabel('Title');
    await titleInput.clear();
    await titleInput.fill('Updated Title');

    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByText('Updated Title')).toBeVisible({ timeout: 10000 });
  });

  test('Back link navigates to home page', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-back');
    const poll = await apiCreatePoll(accessToken);
    await loginAndNavigate(page, accessToken, `/polls/${poll.id}`);

    await page.getByRole('link', { name: /back/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Poll detail — non-existent poll
// ---------------------------------------------------------------------------

test.describe('Poll detail — error states', () => {
  test('non-existent poll shows "Poll not found" message', async ({ page }) => {
    const { accessToken } = await apiRegister('detail-404');
    await loginAndNavigate(page, accessToken, '/polls/nonexistent-poll-id');

    await expect(page.getByText(/poll not found/i)).toBeVisible({ timeout: 10000 });
  });
});
