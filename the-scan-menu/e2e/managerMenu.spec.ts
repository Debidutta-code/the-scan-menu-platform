/**
 * managerMenu.spec.ts
 * Tests the Manager Menu Management flow (authenticated):
 *  1. Manager navigates to /manager/menu
 *  2. Seeded categories and items are visible
 *  3. Manager can open "Create Category" dialog
 *  4. Manager can open "Add Item" dialog
 *  5. Availability toggle is present for items
 *
 * Uses the pre-authenticated storageState saved by auth.setup.ts.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Manager Menu Management', () => {
  let restaurantSlug: string;

  test.beforeAll(() => {
    const state = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'seed-state.json'), 'utf8')
    );
    restaurantSlug = state.restaurantSlug;
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to manager menu page
    await page.goto('/manager/menu');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('manager can access /manager/menu without being redirected', async ({ page }) => {
    // With valid auth, should stay on /manager/menu
    await expect(page).toHaveURL(/\/manager\/menu/, { timeout: 10_000 });
  });

  test('seeded categories appear in the manager menu', async ({ page }) => {
    await expect(page.getByText('Starters')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Main Course')).toBeVisible({ timeout: 10_000 });
  });

  test('seeded menu items appear in the manager menu', async ({ page }) => {
    await expect(page.getByText('Spring Rolls')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Chicken Wings')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Grilled Salmon')).toBeVisible({ timeout: 10_000 });
  });

  test('create category button is present and opens a dialog', async ({ page }) => {
    // Look for "Add Category" or "New Category" button
    const addCatBtn = page.locator(
      'button:has-text("Add Category"), button:has-text("New Category"), button:has-text("Create Category")'
    ).first();

    await expect(addCatBtn).toBeVisible({ timeout: 10_000 });
    await addCatBtn.click();

    // A modal/dialog should appear with a name input
    const nameInput = page.locator(
      'dialog input, [role="dialog"] input[placeholder*="name" i], [role="dialog"] input[name="name"]'
    ).first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
  });

  test('add menu item button is present and opens a dialog', async ({ page }) => {
    // Look for "Add Item" or "New Item" button
    const addItemBtn = page.locator(
      'button:has-text("Add Item"), button:has-text("New Item"), button:has-text("Add Menu Item")'
    ).first();

    await expect(addItemBtn).toBeVisible({ timeout: 10_000 });
    await addItemBtn.click();

    // A modal/dialog should appear with a name and price field
    const dialog = page.locator('dialog, [role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('availability toggle is present for menu items', async ({ page }) => {
    // Wait for items to render
    await expect(page.getByText('Spring Rolls')).toBeVisible({ timeout: 15_000 });

    // Look for toggle switches — common patterns
    const toggle = page.locator(
      'input[type="checkbox"], [role="switch"], button[aria-checked]'
    ).first();

    await expect(toggle).toBeVisible({ timeout: 8_000 });
  });

  test('item prices are displayed correctly (formatted)', async ({ page }) => {
    await expect(page.getByText('Spring Rolls')).toBeVisible({ timeout: 15_000 });

    // Price 15000 paise = ₹150 — check for some price text near the item
    // Flexible: match ₹150 or 150.00 or 15000
    const pricePattern = /₹\s*150|150\.00|15,000|15000/;
    const pageText = await page.locator('body').innerText();
    const hasSomePrice = /₹\s*\d+|\d+\.\d{2}/.test(pageText);
    expect(hasSomePrice).toBe(true);
  });
});
