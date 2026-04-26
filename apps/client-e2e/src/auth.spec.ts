import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRegister(suffix: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/register', {
    data: {
      name: `E2E User ${suffix}`,
      email: `e2e-auth-${suffix}-${Date.now()}@example.com`,
      password: 'Password123!',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { accessToken: string; user: { id: number; email: string } };
}

async function setAuthToken(page: import('@playwright/test').Page, token: string) {
  // Navigate to any page first so we have an origin to set localStorage against
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token);
}

// ---------------------------------------------------------------------------
// Unauthenticated redirects
// ---------------------------------------------------------------------------

test.describe('Unauthenticated redirects', () => {
  test('visiting / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /polls/new redirects to /login', async ({ page }) => {
    await page.goto('/polls/new');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the sign-in heading', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Sign in to your workspace');
  });

  test('has email, password inputs and sign-in button', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error message on wrong credentials', async ({ page }) => {
    await page.fill('#email', 'nobody@example.com');
    await page.fill('#password', 'WrongPassword99!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(
      page.getByText(/login failed/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('navigates to register page via "Create one" link', async ({ page }) => {
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('navigates to forgot-password page', async ({ page }) => {
    await page.getByRole('link', { name: /reset it here/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('successful login redirects to /', async ({ page }) => {
    const { user } = await apiRegister('login-ui');
    // Register already done via API; now login via UI
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { email: user.email, password: 'Password123!' },
    });
    const loginBody = await loginRes.json();
    await ctx.dispose();

    await page.fill('#email', user.email);
    await page.fill('#password', 'Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    // Verify the token is present
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    expect(loginBody.accessToken).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders the create account heading', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Create your account');
  });

  test('has name, email, password inputs and create button', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /create account/i }),
    ).toBeVisible();
  });

  test('successful registration redirects to / and sets token', async ({ page }) => {
    const unique = `ui-reg-${Date.now()}`;
    await page.fill('#name', 'UI Reg User');
    await page.fill('#register-email', `${unique}@example.com`);
    await page.fill('#register-password', 'Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('shows error when email is already taken', async ({ page }) => {
    const { user } = await apiRegister('dup-reg-ui');

    await page.fill('#name', 'Dup User');
    await page.fill('#register-email', user.email);
    await page.fill('#register-password', 'Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(
      page.getByText(/registration failed/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('navigates to login page via "Sign in" link', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Authenticated user on auth pages
// ---------------------------------------------------------------------------

test.describe('Authenticated user on auth pages', () => {
  test('authenticated user visiting /login is redirected to /', async ({ page }) => {
    const { accessToken } = await apiRegister('authed-on-login');
    await setAuthToken(page, accessToken);
    await page.goto('/login');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('authenticated user visiting /register is redirected to /', async ({ page }) => {
    const { accessToken } = await apiRegister('authed-on-register');
    await setAuthToken(page, accessToken);
    await page.goto('/register');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
