import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4322);
process.env.PORT = String(PORT);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    // Headless Chromium reports `prefers-reduced-motion: reduce`, which would
    // switch off every animation the suite is meant to exercise.
    contextOptions: { reducedMotion: 'no-preference' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  // Tests run against the real production build — the thing that ships.
  webServer: {
    command: `npm run build && npm run preview:ci`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
