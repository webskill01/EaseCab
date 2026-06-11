import { test, expect } from '@playwright/test'

/**
 * My Rides E2E (Step 19). AuthGuard probe + the posted/contacted endpoints are
 * network-mocked. Covers: Posted tab loads, the mark-done confirm sheet, and the
 * switch to the Contacted tab with its revealed-phone call link.
 */
const ok = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })
const nowIso = () => new Date().toISOString()

async function mockMine(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/posted-rides/mine', (r) =>
    r.fulfill(ok({ posts: [{ id: 'p1', fromCityName: 'Mohali', toCityName: 'Manali', fromCityRaw: null, toCityRaw: null, vehicleType: 'Innova', fare: 4200, rideDate: null, status: 'active', isClosed: false, createdAt: nowIso() }] })))
  await page.route('**/api/v1/posted-rides/*/close', (r) => r.fulfill(ok({ id: 'p1', status: 'done' })))
  await page.route('**/api/v1/me/contacted**', (r) =>
    r.fulfill(ok({ contacts: [{ id: 'k1', source: 'bot', fromCityName: 'Ludhiana', toCityName: 'Delhi', vehicleType: 'Sedan', phoneNumber: '+919876500000', contactedAt: nowIso(), rideId: null, postedRideId: null }] }, { nextCursor: null })))
}

test('my rides shows posted, confirms mark-done, and switches to contacted', async ({ page }) => {
  await mockMine(page)
  await page.goto('/mine')
  await expect(page.getByText('Mohali')).toBeVisible()
  await page.getByRole('button', { name: /^mark done$/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /yes, mark done/i }).click()
  await page.getByRole('tab', { name: /contacted/i }).click()
  await expect(page.getByText('Ludhiana')).toBeVisible()
  await expect(page.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+919876500000')
})
