/**
 * auth.spec.ts
 * Tests authentication flows:
 * - Login page renders correctly
 * - Successful login with valid credentials → redirects to /manager
 * - Login with wrong password shows error
 * - Unauthenticated users redirected away from /manager routes
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Auth spec runs without any pre-loaded storage state (fresh context per test)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  let managerEmail: string;
  let managerPassword: string;

  test.beforeAll(() => {
    const state = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'seed-state.json'), 'utf8')
    );
    managerEmail = state.managerEmail;
    managerPassword = state.managerPassword;
  });

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('successful login redirects to manager dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(managerEmail);
    await page.locator('input[type="password"]').fill(managerPassword);
    await page.locator('button[type="submit"]').click();

    // Should navigate to a manager route after login
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });
  });

  test('wrong password shows an error message', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(managerEmail);
    await page.locator('input[type="password"]').fill('WrongPass!999');
    await page.locator('button[type="submit"]').click();

    // Error message should appear — match common error patterns
    const errorLocator = page.locator(
      '[role="alert"], .error, [data-testid="login-error"], .text-red-500, .text-destructive'
    );
    await expect(errorLocator.first()).toBeVisible({ timeout: 8_000 });
  });

  test('navigating to /manager without auth redirects to /login', async ({ page }) => {
    // Fresh context with no auth
    await page.goto('/manager/orders');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
