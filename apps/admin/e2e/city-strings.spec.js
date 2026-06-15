import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }
const CS_ID = '22222222-2222-2222-2222-222222222222'
const ROW = { id: CS_ID, rawText: 'amballa', occurrenceCount: 3, suggestedCity: { id: 'city-amb', canonicalName: 'Ambala' } }

test('city-strings queue lists a string and resolves it', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { admin: ADMIN } }) }))

  let resolved = false
  await page.route('**/api/v1/admin/city-strings**', (route) => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      resolved = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: CS_ID, action: 'resolve' } }) })
    }
    if (req.url().includes('/city-strings/cities')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { cities: [] } }) })
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, meta: { page: 1, limit: 20, total: 1 }, data: { cityStrings: [ROW] } }),
    })
  })

  await page.context().addCookies([{ name: 'ec_admin_rt', value: 'test-session', url: 'http://localhost:3101' }])
  await page.goto('/city-strings')
  await expect(page.getByText('amballa')).toBeVisible()
  await expect(page.getByRole('heading', { name: /City Strings/i })).toBeVisible()
  await page.getByRole('button', { name: /resolve/i }).click()
  await expect.poll(() => resolved).toBe(true)
})
