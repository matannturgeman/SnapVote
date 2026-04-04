import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('h2')).toContainText('Sign in to your workspace');
});
