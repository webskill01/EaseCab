import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }

test('login → dashboard, with the guarded route staying in', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/login', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { admin: ADMIN } }),
    }))
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { admin: ADMIN } }),
    }))

  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('a@x.com')
  await page.getByPlaceholder('Password').fill('admin-pass-123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verifications' })).toBeVisible()
})

test('unauthenticated visit to / redirects to /login', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'x' } }),
    }))

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})
