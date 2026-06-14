import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }
const REPORT = {
  id: '11111111-1111-1111-1111-111111111111',
  reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date().toISOString(),
  reporter: { id: 'u1', name: 'Reporter', phoneMasked: '••••3210' },
  target: { kind: 'bot', id: 'ride1', status: 'fresh', displayText: 'A to B', fromCity: 'Amritsar', toCity: 'Delhi', posterName: null },
}

test('reports queue lists a report and removes the ride', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { admin: ADMIN } }) }))

  let removed = false
  await page.route('**/api/v1/admin/reports**', (route) => {
    if (route.request().method() === 'PATCH') {
      removed = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { report: { id: REPORT.id, action: 'remove', resolved: 1 } } }) })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, meta: { page: 1, limit: 20, total: 1 }, data: { reports: [REPORT] } }),
    })
  })

  await page.goto('/reports')
  await expect(page.getByText('••••3210')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible()
  await page.getByRole('button', { name: /remove ride/i }).click()
  await expect.poll(() => removed).toBe(true)
})
