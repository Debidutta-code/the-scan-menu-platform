import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each test file gets its own Node.js process — prevents mongoose.disconnect()
    // in one file's afterAll from corrupting the DB connection for subsequent files.
    pool: 'forks',
    // Run test FILES sequentially (one worker at a time) to prevent shared-DB
    // data interference when test suites share the same MongoDB instance.
    fileParallelism: false,
    // Increase timeout for integration tests that spin up DB, seed data, and call real HTTP
    testTimeout: 60000,
    hookTimeout: 30000,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
  },
});
