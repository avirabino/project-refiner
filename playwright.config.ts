import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Extensions can't run in parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Required for extension testing
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:38470',
    reuseExistingServer: true,
    cwd: './tests/fixtures/target-app',
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // headless: false is set in the extension fixture itself
      },
    },
  ],
});
