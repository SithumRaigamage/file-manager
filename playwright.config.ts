import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Run sequentially for Electron tests
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
});
