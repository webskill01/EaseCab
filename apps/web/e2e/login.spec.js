import { test, expect } from '@playwright/test'

/**
 * E2E runs with NEXT_PUBLIC_E2E=true (otpClient bypasses Firebase). We network-mock
 * our own /api/v1/auth endpoints. The 201 on verify-otp drives the new-user "Done"
 * screen; refresh 401 drives the AuthGuard redirect.
 */
test('phone → OTP → trial screen → feed (new user)', async ({ page }) => {
  await page.route('**/api/v1/auth/send-otp', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { sent: true } }) }),
  )
  await page.route('**/api/v1/auth/verify-otp', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { id: 'u1', phone: '+919876543210' } } }) }),
  )
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { refreshed: true } }) }),
  )

  await page.goto('/login')
  await page.getByLabel(/phone number/i).fill('9876543210')
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel(/verification code/i).fill('123456')
  await page.getByRole('button', { name: /verify/i }).click()

  // new-user onboarding now includes the permissions step
  await expect(page.getByRole('heading', { name: /allow a few permissions/i })).toBeVisible()
  await page.getByRole('button', { name: /not now/i }).click()

  await expect(page.getByText(/you're all set/i)).toBeVisible()
  await page.getByRole('button', { name: /enter easecab/i }).click()
  await expect(page).toHaveURL(/\/feed$/)
  await expect(page.getByText(/live duties/i)).toBeVisible()
})

test('unauthed visit to /feed redirects to /login', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'nope' } }) }),
  )
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/login$/)
})
