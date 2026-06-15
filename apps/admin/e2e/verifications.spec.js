import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }
const ITEM = {
  id: 's1', docType: 'dl', verifiedName: 'A B',
  user: { id: 'u1', name: 'A B', phoneMasked: '••••3210', carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB01', verificationStatus: 'submitted' },
  images: { dp: null, licence: null, rc: null, carFront: null, carBack: null },
}

test('verifications queue lists a submission and approves it', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { admin: ADMIN } }) }))

  let approved = false
  await page.route('**/api/v1/admin/verifications**', (route) => {
    if (route.request().method() === 'PATCH') {
      approved = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { verification: { id: 's1', status: 'approved' } } }) })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, meta: { page: 1, limit: 20, total: 1 }, data: { verifications: [ITEM] } }),
    })
  })

  await page.context().addCookies([{ name: 'ec_admin_rt', value: 'test-session', url: 'http://localhost:3101' }])
  await page.goto('/verifications')
  await expect(page.getByText('••••3210')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Verifications/i })).toBeVisible()
  await page.getByRole('button', { name: /approve/i }).click()
  await expect.poll(() => approved).toBe(true)
})
