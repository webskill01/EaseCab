import { test, expect } from '@playwright/test'

/**
 * Settings E2E (Step 21d). AuthGuard probe + /push/preferences + /cities are
 * network-mocked. A small mutable prefs object lets PATCH → refetch reflect changes.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

test('toggles a ride-alert preference and adds an alert city', async ({ page }) => {
  const prefs = { notificationCities: [], cities: [], notifyBotRides: true, notifyPostedRides: false }

  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/push/preferences', (r) => {
    if (r.request().method() === 'PATCH') {
      const body = JSON.parse(r.request().postData() || '{}')
      Object.assign(prefs, body)
      if (body.notificationCities) prefs.cities = body.notificationCities.map((id) => ({ id, name: id === 'c2' ? 'Mohali' : id }))
      return r.fulfill(ok({ notificationCities: prefs.notificationCities, notifyBotRides: prefs.notifyBotRides, notifyPostedRides: prefs.notifyPostedRides }))
    }
    return r.fulfill(ok(prefs))
  })
  await page.route('**/api/v1/cities**', (r) => r.fulfill(ok({ cities: [{ id: 'c2', canonicalName: 'Mohali' }] })))

  await page.goto('/settings')

  // Toggle "Verified ride alerts" on.
  const postedToggle = page.getByRole('switch', { name: 'Verified ride alerts' })
  await expect(postedToggle).toHaveAttribute('aria-checked', 'false')
  await postedToggle.click()
  await expect(postedToggle).toHaveAttribute('aria-checked', 'true')

  // Add an alert city via the picker.
  await page.getByRole('button', { name: 'Add a city' }).click()
  await page.getByLabel(/search/i).fill('Moh')
  await page.getByRole('button', { name: 'Mohali' }).click()
  await expect(page.getByText('Mohali')).toBeVisible()
})
