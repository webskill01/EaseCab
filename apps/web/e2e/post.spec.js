import { test, expect } from '@playwright/test'

/**
 * Post a Ride E2E (Step 20). AuthGuard probe, /cities typeahead, /posted-rides/parse
 * and the create POST are network-mocked. Covers the structured path, the
 * paste→preview→post path, and the verification soft gate.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const err = (code, status) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code, message: code } }) })

const DRAFT = {
  fromCityId: null, fromCityName: null, fromCityRaw: 'Delhi',
  toCityId: null, toCityName: null, toCityRaw: 'Chandigarh',
  vehicleType: 'Innova', phone: '+919876543210',
}

async function mockBase(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/cities**', (r) =>
    r.fulfill(ok({ cities: [{ id: 'c-moh', canonicalName: 'Mohali' }, { id: 'c-man', canonicalName: 'Manali' }] })))
}

async function fillStructured(page) {
  await page.getByRole('button', { name: 'Pickup city' }).click()
  await page.getByLabel('Search city').fill('moh')
  await page.getByRole('button', { name: 'Mohali' }).click()
  await page.getByRole('button', { name: 'Drop city' }).click()
  await page.getByLabel('Search city').fill('man')
  await page.getByRole('button', { name: 'Manali' }).click()
  await page.getByRole('radio', { name: /innova/i }).click()
  await page.getByLabel('Date').fill('2026-06-20')
  await page.getByLabel('Time').fill('09:30')
  await page.getByLabel('Contact number').fill('9876543210')
}

test('structured path: fill the form and post', async ({ page }) => {
  await mockBase(page)
  await page.route('**/api/v1/posted-rides', (r) => r.fulfill(ok({ id: 'p1', status: 'active' }, 201)))
  await page.goto('/post')
  await fillStructured(page)
  const post = page.getByRole('button', { name: /post ride/i })
  await expect(post).toBeEnabled()
  await post.click()
  await expect(page.getByText(/duty posted/i)).toBeVisible()
})

test('paste path: read message, preview, post', async ({ page }) => {
  await mockBase(page)
  await page.route('**/api/v1/posted-rides/parse', (r) => r.fulfill(ok(DRAFT)))
  await page.route('**/api/v1/posted-rides', (r) => r.fulfill(ok({ id: 'p2', status: 'active' }, 201)))
  await page.goto('/post')
  await page.getByRole('tab', { name: /paste a message/i }).click()
  await page.getByLabel('Paste the ride message').fill('Delhi to Chandigarh Innova 9876543210')
  await page.getByRole('button', { name: /read message/i }).click()
  await expect(page.getByText('Delhi')).toBeVisible()
  await page.getByRole('button', { name: /looks good/i }).click()
  await expect(page.getByText(/duty posted/i)).toBeVisible()
})

test('verification gate: 403 shows the verify sheet', async ({ page }) => {
  await mockBase(page)
  await page.route('**/api/v1/posted-rides', (r) => r.fulfill(err('VERIFICATION_REQUIRED', 403)))
  await page.goto('/post')
  await fillStructured(page)
  await page.getByRole('button', { name: /post ride/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/get verified to post/i)).toBeVisible()
})
