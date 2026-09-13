import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce',
    trace: 'on-first-retry', screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env.TEST_PRODUCTION ? 'npm run preview -- --port 4173 --strictPort' : 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI && !process.env.TEST_PRODUCTION,
  },
  reporter: 'list',
});
