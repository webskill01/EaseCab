import { test, expect } from '@playwright/test'

/**
 * Notifications E2E (Profile → Notifications, 2026-10-24 layout): one "Ride alerts" master
 * switch + "Alerts for my location". FCM + geolocation go through the E2E seams; AuthGuard
 * probe, /push/* and /cities/nearest are network-mocked. A mutable prefs object lets
 * PATCH → refetch reflect changes.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

test('master switch turns ride alerts on; location switch saves my city', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Notification', { value: { permission: 'granted', requestPermission: async () => 'granted' }, configurable: true })
    window.__ecFcmSeam = { requestPermissionAndToken: async () => ({ permission: 'granted', token: 'tok-e2e' }), onForegroundMessage: () => () => {} }
    window.__ecGeoSeam = { getCurrentPosition: async () => ({ lat: 30.7, lng: 76.78 }) }
  })
  const prefs = { notificationCities: [], cities: [], geoCity: null, notifyGeoCityId: null, notifyBotRides: false, notifyPostedRides: false }
  let registered = false

  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/push/subscriptions', (r) => { registered = true; return r.fulfill(ok({ registered: true })) })
  await page.route('**/api/v1/push/preferences', (r) => {
    if (r.request().method() === 'PATCH') {
      Object.assign(prefs, JSON.parse(r.request().postData() || '{}'))
      prefs.geoCity = prefs.notifyGeoCityId ? { id: prefs.notifyGeoCityId, name: 'Chandigarh' } : null
    }
    return r.fulfill(ok(prefs))
  })
  await page.route('**/api/v1/cities/nearest**', (r) => r.fulfill(ok({ city: { id: 'c9', canonicalName: 'Chandigarh', distanceKm: 4 } })))

  await page.goto('/notifications')

  const master = page.getByRole('switch', { name: 'Ride alerts' })
  const geo = page.getByRole('switch', { name: 'Alerts for my location' })
  await expect(master).toHaveAttribute('aria-checked', 'false')
  await expect(geo).toBeDisabled() // needs alerts on first

  await master.click()
  await expect(master).toHaveAttribute('aria-checked', 'true')
  expect(registered).toBe(true)
  expect(prefs).toMatchObject({ notifyBotRides: true, notifyPostedRides: true })

  await geo.click()
  await expect(geo).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/your city: chandigarh/i)).toBeVisible()
  expect(prefs.notifyGeoCityId).toBe('c9')
})
