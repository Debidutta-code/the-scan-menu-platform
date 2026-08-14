/**
 * auth.setup.ts
 * Playwright "setup" project: logs in as the seeded E2E manager once
 * and saves cookies/localStorage to e2e/.auth/manager.json so all
 * subsequent test projects can skip the login step.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const STORAGE_STATE = path.resolve(__dirname, '.auth/manager.json');

setup('authenticate as E2E manager', async ({ page }) => {
  const stateFile = path.resolve(__dirname, 'seed-state.json');
  const { managerEmail, managerPassword } = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

  await page.goto('/login');

  // Fill login form — robust selectors using data attributes or input types
  await page.locator('input[type="email"]').fill(managerEmail);
  await page.locator('input[type="password"]').fill(managerPassword);
  await page.locator('button[type="submit"]').click();

  // After login the app redirects to a manager route — wait for navigation
  await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 });

  // Save auth state (cookies + localStorage) for reuse
  await page.context().storageState({ path: STORAGE_STATE });
  console.log('[E2E Setup] Manager auth state saved to', STORAGE_STATE);
});
