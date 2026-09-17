import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  /**
   * Vite answers the webServer health check as soon as it serves index.html, but keeps
   * transforming modules for a while after. On a cold start every worker's first navigation
   * queues behind that, which used to blow the 30s default and fail a random spec. Warm runs
   * finish the whole suite in well under 10s, so this ceiling only ever absorbs the cold start.
   */
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
