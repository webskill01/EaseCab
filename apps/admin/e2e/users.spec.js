import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }
const USER_ID = '22222222-2222-2222-2222-222222222222'
const USER = {
  id: USER_ID, name: 'Gurpreet', phoneMasked: '••••3210', aadhaarVerified: true,
  verificationStatus: 'approved', baseCity: 'Amritsar', vehicleType: 'sedan',
  createdAt: new Date().toISOString(), isDeleted: false, deletedAt: null,
  subscription: { status: 'trial', validUntil: new Date('2026-07-01').toISOString() },
}

test('users directory lists a user and soft-deletes them', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { admin: ADMIN } }) }))

  let deleted = false
  await page.route('**/api/v1/admin/users**', (route) => {
    if (route.request().method() === 'PATCH') {
      deleted = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: { ...USER, isDeleted: true } } }) })
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, meta: { page: 1, limit: 20, total: 1 }, data: { users: [USER] } }),
    })
  })

  await page.goto('/users')
  await expect(page.getByText('••••3210')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible()
  await page.getByRole('button', { name: /delete/i }).click()
  await expect.poll(() => deleted).toBe(true)
})
