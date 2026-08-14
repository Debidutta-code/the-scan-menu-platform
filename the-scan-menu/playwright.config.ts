import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Root directory for all E2E tests
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: false,

  // Fail fast in CI: no retries outside of CI
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter: human-readable + JUnit for CI pipelines
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Global setup & teardown for DB seeding
  globalSetup: path.resolve('./e2e/global.setup.ts'),
  globalTeardown: path.resolve('./e2e/global.teardown.ts'),

  // Shared settings for all tests
  use: {
    // Both servers are already running in dev mode
    baseURL: 'http://localhost:5173',

    // Always collect traces on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'on-first-retry',

    // Reasonable timeout per action (ms)
    actionTimeout: 10_000,

    // Navigation timeout
    navigationTimeout: 30_000,
  },

  // 30-second timeout per test
  timeout: 30_000,

  // Browser projects
  projects: [
    // Auth setup project: runs first to store login state
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },

    // Chromium: uses saved auth state for manager tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
      testIgnore: '**/health.spec.ts',
    },

    // Firefox: uses saved auth state for manager tests
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/health.spec.ts'],
    },

    // Health probe tests run without auth on both browsers
    {
      name: 'health-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/health.spec.ts',
    },
  ],
});
