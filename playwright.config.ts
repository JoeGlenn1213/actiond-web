import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production static export (scripts/serve.mjs mirrors
// ActionD's --web-dir serving, including the /actions/* SPA fallback) —
// testing what actually gets deployed, not the dev server.
// Ports: 3100 for e2e; ActionD owns :3000, `npm run dev` uses :3001.
// API calls are intercepted with page.route mocks in the specs.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Use the system Chrome — avoids the (large) Playwright browser download.
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run build && node scripts/serve.mjs',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3100',
      NEXT_PUBLIC_ACTIOND_BASE_URL: '',
    },
  },
});
