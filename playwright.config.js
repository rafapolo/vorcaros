import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.js',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5174',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'bun tests/server.js',
    port: 5174,
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
