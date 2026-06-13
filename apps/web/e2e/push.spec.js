import { test, expect } from '@playwright/test'

/**
 * Push permission flow E2E (Step 23). The FCM + Geolocation SDK boundaries are
 * driven by the deterministic `window.__ecFcmSeam` / `window.__ecGeoSeam` seams; the
 * OS Notification API is stubbed to `default`. IntersectionObserver isn't drivable
 * headless, so we seed localStorage with 3 viewed ride ids to surface the in-feed
 * pre-prompt deterministically. All API endpoints are network-mocked.
 */
const ok = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })
const nowIso = () => new Date().toISOString()

async function installSeams(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('ec_push_viewed_rides', JSON.stringify(['r1', 'r2', 'r3']))
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default', requestPermission: async () => 'granted' },
      configurable: true,
    })
    window.__ecFcmSeam = {
      requestPermissionAndToken: async () => ({ permission: 'granted', token: 'tok-e2e' }),
      onForegroundMessage: () => () => {},
    }
    window.__ecGeoSeam = { getCurrentPosition: async () => ({ lat: 30.7, lng: 76.78 }) }
  })
}

async function mockFeed(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) =>
    r.fulfill(ok({ status: 'trial', isActive: true, trialExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), expiresAt: null })),
  )
  await page.route('**/api/v1/posted-rides**', (r) => r.fulfill(ok({ posts: [] }, { nextCursor: null })))
  await page.route('**/api/v1/rides**', (r) =>
    r.fulfill(ok({ rides: [{ id: 'r1', displayText: 'Sedan chahiye', status: 'fresh', pickupCityId: 'c1', dropCityId: 'c2', pickupCityName: 'Amritsar', dropCityName: 'Delhi', pickupRaw: 'a', dropRaw: 'b', vehicleType: 'Sedan', receivedAt: nowIso(), expiresAt: new Date(Date.now() + 1800000).toISOString() }] }, { nextCursor: null })),
  )
  await page.route('**/api/v1/rides/stream', (r) => r.abort())
  await page.route('**/api/v1/cities**', (r) => r.fulfill(ok({ cities: [] })))
  // nearest registered AFTER the generic /cities route so it wins (last match wins).
  await page.route('**/api/v1/cities/nearest**', (r) => r.fulfill(ok({ city: { id: 'c9', canonicalName: 'Chandigarh', distanceKm: 4 } })))
}

test('in-feed pre-prompt enables alerts: registers token + saves nearest city', async ({ page }) => {
  await installSeams(page)
  await mockFeed(page)

  let registered = false
  let savedCities = null
  await page.route('**/api/v1/push/subscriptions', (r) => { registered = true; return r.fulfill(ok({ registered: true }, undefined)) })
  await page.route('**/api/v1/push/preferences', (r) => {
    if (r.request().method() === 'PATCH') savedCities = JSON.parse(r.request().postData() || '{}').notificationCities
    return r.fulfill(ok({ saved: true }))
  })

  await page.goto('/feed')

  // The soft pre-prompt is visible (3 rides already "viewed", permission undecided).
  await expect(page.getByText(/instant duty alerts/i)).toBeVisible()
  await page.getByRole('button', { name: 'Enable alerts' }).click()

  await expect.poll(() => registered).toBe(true)
  await expect.poll(() => savedCities).toEqual(['c9'])

  // Once enabled, the pre-prompt is gone.
  await expect(page.getByText(/instant duty alerts/i)).toHaveCount(0)
})
