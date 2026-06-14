import { defineConfig, devices } from '@playwright/test'

/**
 * E2E runs against `next dev` on port 3101. The specs network-mock our own
 * /api/v1/admin/auth endpoints — no real API or DB is needed.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3101', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run dev -- -p 3101',
    url: 'http://localhost:3101',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
    },
  },
})
