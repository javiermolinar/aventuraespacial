import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' },
  webServer: {
    command: process.env.TEST_PRODUCTION ? 'npm run preview -- --port 4173 --strictPort' : 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI && !process.env.TEST_PRODUCTION,
  },
  reporter: 'list',
});
