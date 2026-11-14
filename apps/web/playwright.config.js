import { defineConfig, devices } from '@playwright/test'

/**
 * E2E runs against `next dev` with NEXT_PUBLIC_E2E=true — otpClient then bypasses
 * Firebase (reCAPTCHA/Google can't run headless), and the specs network-mock our
 * own /api/v1/auth endpoints. Firebase env vars are dummies (never called in E2E).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3100',
    ...devices['Desktop Chrome'],
    // Specs assert English copy; the app defaults to Hinglish, so pin an explicit English pick.
    storageState: { cookies: ['locale=en', 'locale_v2=1'].map((c) => { const [name, value] = c.split('='); return { name, value, domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' } }),
      // the once-a-day promo popup is a dice roll; mark it opened so it never covers a spec
      origins: [{ origin: 'http://localhost:3100', localStorage: [{ name: 'ec_promo', value: JSON.stringify({ opened: { 'border-tax-2026-11': true } }) }] }] },
  },
  webServer: {
    command: 'npm run dev -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'e2e',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'e2e.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'e2e',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'e2e',
      NEXT_PUBLIC_FIREBASE_APP_ID: 'e2e',
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'e2e',
    },
  },
})
