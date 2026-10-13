import { test, expect } from '@playwright/test'

/**
 * Membership E2E (Step 21d). AuthGuard probe + /subscriptions/* are network-mocked;
 * the Cashfree modal is bypassed by the NEXT_PUBLIC_E2E seam in cashfreeClient.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const okMeta = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })

test('never-subscribed user subscribes via Cashfree and sees the success panel', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok({ status: 'expired', isActive: false, expiresAt: null })))
  await page.route('**/api/v1/subscriptions/payments**', (r) => r.fulfill(okMeta({ payments: [] }, { nextCursor: null })))
  await page.route('**/api/v1/subscriptions/checkout', (r) => r.fulfill(ok({ orderId: 'sub_1', paymentSessionId: 'session_1', amount: 14900 })))
  let verified = false
  await page.route('**/api/v1/subscriptions/verify', (r) => { verified = true; return r.fulfill(ok({ credited: true })) })

  await page.goto('/membership')
  await expect(page.getByText('EaseCab · Not subscribed')).toBeVisible()
  await page.getByRole('button', { name: /subscribe now/i }).click()
  await expect(page.getByText("You're all set!")).toBeVisible()
  expect(verified).toBe(true)
})

test('lapsed member sees Expired + Renew and the payment-history empty state', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok({ status: 'active', isActive: false, expiresAt: new Date(Date.now() - 5 * 86400000).toISOString() })))
  await page.route('**/api/v1/subscriptions/payments**', (r) => r.fulfill(okMeta({ payments: [] }, { nextCursor: null })))

  await page.goto('/membership')
  await expect(page.getByText('EaseCab · Expired')).toBeVisible()
  await expect(page.getByRole('button', { name: /renew membership/i })).toBeVisible()
  await expect(page.getByText('No payments yet.')).toBeVisible()
})
