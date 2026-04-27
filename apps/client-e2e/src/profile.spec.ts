import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiRegister(suffix: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/register', {
    data: {
      name: `Profile E2E ${suffix}`,
      email: `e2e-profile-${suffix}-${Date.now()}@example.com`,
      password: 'Password123!',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body as { accessToken: string; user: { id: number; email: string } };
}

async function apiDeleteAccount(token: string) {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  await ctx.delete('/api/auth/account', {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ctx.dispose();
}

async function setAuthToken(
  page: import('@playwright/test').Page,
  token: string,
) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token);
}

// ---------------------------------------------------------------------------
// Unauthenticated redirect
// ---------------------------------------------------------------------------

test.describe('Profile page — unauthenticated', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Profile page load
// ---------------------------------------------------------------------------

test.describe('Profile page — load', () => {
  test('shows Profile Settings heading when authenticated', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('load');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await expect(
      page.getByRole('heading', { name: /profile settings/i }),
    ).toBeVisible({
      timeout: 10000,
    });

    await apiDeleteAccount(accessToken);
  });

  test('renders all three sections: Profile Information, Change Password, Delete Account', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('sections');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await expect(
      page.getByRole('heading', { name: /profile information/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /change password/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /delete account/i }),
    ).toBeVisible();

    await apiDeleteAccount(accessToken);
  });
});

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------

test.describe('Profile page — update profile', () => {
  test('saves updated name and shows success message', async ({ page }) => {
    const { accessToken } = await apiRegister('update-name');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.waitForSelector('#name');
    await page.fill('#name', 'New Display Name');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated successfully/i)).toBeVisible({
      timeout: 10000,
    });

    await apiDeleteAccount(accessToken);
  });

  test('shows error message when save fails (invalid avatar URL)', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('bad-avatar');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.waitForSelector('#avatarUrl');
    await page.fill('#avatarUrl', 'not-a-valid-url');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/failed to update profile/i)).toBeVisible({
      timeout: 10000,
    });

    await apiDeleteAccount(accessToken);
  });
});

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

test.describe('Profile page — change password', () => {
  test('shows error when current password is wrong', async ({ page }) => {
    const { accessToken } = await apiRegister('wrong-pw');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.waitForSelector('#currentPassword');
    await page.fill('#currentPassword', 'WrongPass999!');
    await page.fill('#newPassword', 'NewPass456!');
    await page.fill('#confirmPassword', 'NewPass456!');
    await page.getByRole('button', { name: /change password/i }).click();

    await expect(page.getByText(/current password is incorrect/i)).toBeVisible({
      timeout: 10000,
    });

    await apiDeleteAccount(accessToken);
  });

  test('shows client-side error when new passwords do not match', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('pw-mismatch');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.waitForSelector('#currentPassword');
    await page.fill('#currentPassword', 'Password123!');
    await page.fill('#newPassword', 'NewPass456!');
    await page.fill('#confirmPassword', 'DifferentPass789!');
    await page.getByRole('button', { name: /change password/i }).click();

    await expect(page.getByText(/new passwords do not match/i)).toBeVisible({
      timeout: 5000,
    });

    await apiDeleteAccount(accessToken);
  });

  test('successfully changes password', async ({ page }) => {
    const { accessToken } = await apiRegister('change-pw-ok');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.waitForSelector('#currentPassword');
    await page.fill('#currentPassword', 'Password123!');
    await page.fill('#newPassword', 'NewPass456!');
    await page.fill('#confirmPassword', 'NewPass456!');
    await page.getByRole('button', { name: /change password/i }).click();

    await expect(page.getByText(/password changed successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Token is revoked after password change; account is cleaned up by the DB
    // since the email is unique per test run.
  });
});

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

test.describe('Profile page — delete account', () => {
  test('shows confirmation modal when Delete Account button is clicked', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('delete-modal');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.getByRole('button', { name: /delete account/i }).click();

    await expect(page.getByText(/are you sure/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();

    await apiDeleteAccount(accessToken);
  });

  test('cancel button dismisses the confirmation modal', async ({ page }) => {
    const { accessToken } = await apiRegister('delete-cancel');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.getByRole('button', { name: /delete account/i }).click();
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(
      page.getByRole('button', { name: /delete account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).not.toBeVisible();

    await apiDeleteAccount(accessToken);
  });

  test('Confirm Delete button is disabled until "delete" is typed', async ({
    page,
  }) => {
    const { accessToken } = await apiRegister('delete-disabled');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.getByRole('button', { name: /delete account/i }).click();
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).toBeDisabled();

    await page.getByPlaceholder(/type "delete" to confirm/i).fill('delet');
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).toBeDisabled();

    await page.getByPlaceholder(/type "delete" to confirm/i).fill('delete');
    await expect(
      page.getByRole('button', { name: /confirm delete/i }),
    ).toBeEnabled();

    await apiDeleteAccount(accessToken);
  });

  test('confirms delete and redirects to /login', async ({ page }) => {
    const { accessToken } = await apiRegister('delete-confirm');
    await setAuthToken(page, accessToken);
    await page.goto('/profile');

    await page.getByRole('button', { name: /delete account/i }).click();
    await page.getByPlaceholder(/type "delete" to confirm/i).fill('delete');
    await page.getByRole('button', { name: /confirm delete/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
