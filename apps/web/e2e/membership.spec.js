import { test, expect } from '@playwright/test'

/**
 * Membership E2E (Step 21d). AuthGuard probe + /subscriptions/* are network-mocked;
 * the Razorpay popup is bypassed by the NEXT_PUBLIC_E2E seam in razorpayClient.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const okMeta = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })

test('expired member upgrades via Razorpay and sees the success panel', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok({ status: 'expired', isActive: false, trialExpiresAt: null, expiresAt: null })))
  await page.route('**/api/v1/subscriptions/payments**', (r) => r.fulfill(okMeta({ payments: [] }, { nextCursor: null })))
  await page.route('**/api/v1/subscriptions/checkout', (r) => r.fulfill(ok({ orderId: 'order_1', amount: 14900, currency: 'INR', keyId: 'rzp_test_x' })))
  let verified = false
  await page.route('**/api/v1/subscriptions/verify', (r) => { verified = true; return r.fulfill(ok({ credited: true })) })

  await page.goto('/membership')
  await expect(page.getByText('Expired')).toBeVisible()
  await page.getByRole('button', { name: /subscribe now/i }).click()
  await expect(page.getByText("You're all set!")).toBeVisible()
  expect(verified).toBe(true)
})

test('trial member sees days-left and the payment-history empty state', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok({ status: 'trial', isActive: true, trialExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), expiresAt: null })))
  await page.route('**/api/v1/subscriptions/payments**', (r) => r.fulfill(okMeta({ payments: [] }, { nextCursor: null })))

  await page.goto('/membership')
  await expect(page.getByText('Free trial')).toBeVisible()
  await expect(page.getByText(/day(s)? left/)).toBeVisible()
  await expect(page.getByText('No payments yet.')).toBeVisible()
})
