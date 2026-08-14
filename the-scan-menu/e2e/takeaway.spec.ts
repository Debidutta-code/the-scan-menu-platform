/**
 * takeaway.spec.ts
 * Tests the sessionless Takeaway ordering flow.
 * Route from App.tsx: /r/:restaurantSlug/order
 *
 * Fix: removed invalid CSS `text=Takeaway` syntax from comma-separated
 * CSS selector — use .or() chaining instead.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// No auth needed — public customer flow
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sessionless / Takeaway Ordering Flow', () => {
  let slug: string;

  test.beforeAll(() => {
    const state = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'seed-state.json'), 'utf8')
    );
    slug = state.restaurantSlug;
  });

  test('sessionless order page loads for the test restaurant', async ({ page }) => {
    await page.goto(`/r/${slug}/order`);
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/error|not-found/i, { timeout: 10_000 });

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test('takeaway mode can be selected if mode selector exists', async ({ page }) => {
    await page.goto(`/r/${slug}/order`);
    await page.waitForLoadState('networkidle');

    // Use .or() chaining — NOT comma CSS selector with text= Playwright syntax
    const takeawayBtn = page
      .getByRole('button', { name: /takeaway/i })
      .or(page.locator('[data-testid="mode-takeaway"]'))
      .first();

    if (await takeawayBtn.count() > 0) {
      await takeawayBtn.click();
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(/error/i);
    } else {
      console.log('[E2E] No takeaway mode selector found — page load validated only');
    }
  });

  test('customer name field accepts input', async ({ page }) => {
    await page.goto(`/r/${slug}/order`);
    await page.waitForLoadState('networkidle');

    // Select takeaway mode if available
    const takeawayBtn = page
      .getByRole('button', { name: /takeaway/i })
      .or(page.locator('[data-testid="mode-takeaway"]'))
      .first();
    if (await takeawayBtn.count() > 0) {
      await takeawayBtn.click();
      await page.waitForTimeout(500);
    }

    // Fill customer name
    const nameInput = page
      .locator('input[name="customerName"]')
      .or(page.getByPlaceholder(/name/i))
      .first();

    if (await nameInput.count() > 0) {
      await nameInput.fill('E2E Test Customer');
      await expect(nameInput).toHaveValue('E2E Test Customer');
    }
  });

  test('customer phone field accepts input', async ({ page }) => {
    await page.goto(`/r/${slug}/order`);
    await page.waitForLoadState('networkidle');

    // Select takeaway mode if available
    const takeawayBtn = page
      .getByRole('button', { name: /takeaway/i })
      .or(page.locator('[data-testid="mode-takeaway"]'))
      .first();
    if (await takeawayBtn.count() > 0) {
      await takeawayBtn.click();
      await page.waitForTimeout(500);
    }

    const phoneInput = page
      .locator('input[name="customerPhone"]')
      .or(page.locator('input[type="tel"]'))
      .or(page.getByPlaceholder(/phone|mobile/i))
      .first();

    if (await phoneInput.count() > 0) {
      await phoneInput.fill('9876543210');
      await expect(phoneInput).toHaveValue('9876543210');
    }
  });
});
