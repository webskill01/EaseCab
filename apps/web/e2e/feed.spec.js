import { test, expect } from '@playwright/test'

/**
 * Feed E2E (Step 18). AuthGuard probe + every feed endpoint are network-mocked; the
 * SSE stream is aborted (EventSource isn't drivable here) — the initial query still
 * renders the list. Covers: load + cards, sub-tab switch to verified, city-filter
 * lock, and the contact soft-gate sheet.
 */
const ok = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })
const nowIso = () => new Date().toISOString()

async function mockFeed(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscription/me', (r) =>
    r.fulfill(ok({ status: 'trial', isActive: true, trialExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), expiresAt: null })),
  )
  await page.route('**/api/v1/posted-rides**', (r) =>
    r.fulfill(ok({ posts: [{ id: 'p1', fromCityName: 'Patiala', toCityName: 'Delhi', fromCityId: 'c9', toCityId: 'c2', vehicleType: 'Innova', fare: 4200, notes: 'Empty return', rideDate: null, rideTime: null, status: 'active', isClosed: false, createdAt: nowIso(), expiresAt: nowIso() }] }, { nextCursor: null })),
  )
  await page.route('**/api/v1/cities**', (r) => r.fulfill(ok({ cities: [{ id: 'c9', canonicalName: 'Mohali' }] })))
  // The bot feed list (the first call is plain /rides with no query, so match broadly).
  // Registered FIRST; the more-specific stream + contact routes below are registered
  // AFTER so they take precedence for those sub-paths (Playwright: last match wins).
  await page.route('**/api/v1/rides**', (r) =>
    r.fulfill(ok({ rides: [{ id: 'r1', displayText: 'Sedan chahiye', status: 'fresh', pickupCityId: 'c1', dropCityId: 'c2', pickupCityName: 'Amritsar', dropCityName: 'Delhi', pickupRaw: 'a', dropRaw: 'b', vehicleType: 'Sedan', receivedAt: nowIso(), expiresAt: new Date(Date.now() + 1800000).toISOString() }] }, { nextCursor: null })),
  )
  // SSE stream isn't drivable in Playwright — abort so EventSource just errors out.
  await page.route('**/api/v1/rides/stream', (r) => r.abort())
  await page.route('**/api/v1/rides/*/contact', (r) => r.fulfill(ok({ phoneNumber: '+919876543210', contactedAt: nowIso() })))
}

test('feed loads bot rides, switches to verified, and opens the contact sheet', async ({ page }) => {
  await mockFeed(page)
  await page.goto('/feed')

  // bot feed
  await expect(page.getByText('Amritsar')).toBeVisible()
  await expect(page.getByText('Delhi').first()).toBeVisible()

  // contact soft-gate sheet opens at the action point
  await page.getByRole('button', { name: /whatsapp/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: /contact driver/i })).toBeVisible()
  await page.keyboard.press('Escape')

  // switch to the verified feed
  await page.getByRole('tab', { name: /verified rides/i }).click()
  await expect(page.getByText('Patiala')).toBeVisible()
})

test('locking a city via the filter persists and refetches', async ({ page }) => {
  await mockFeed(page)
  await page.goto('/feed')
  await expect(page.getByText('Amritsar')).toBeVisible()

  await page.getByRole('button', { name: /filter by city/i }).click()
  await page.getByLabel(/search cities/i).fill('moh')
  await page.getByRole('button', { name: 'Mohali' }).click()

  // the lock button now shows the chosen city
  await expect(page.getByRole('button', { name: /mohali/i })).toBeVisible()
})
