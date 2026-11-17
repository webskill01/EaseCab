import { test, expect, devices } from '@playwright/test'

/** Profile nudge: incomplete profiles get the "1 step left" popup and can't open the WhatsApp group steps. */
test.use({ ...devices['Pixel 5'] })
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
const shot = async (page, name) => { if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) }
const PROFILE = { id: 'u1', phone: '+919876543210', name: 'Gurpreet', baseCity: 'Ludhiana', bio: '', vehicleType: null, profilePicUrl: null, profileComplete: false, verification: { aadhaarVerified: true } }

test('incomplete profile: popup → Later; WhatsApp group shows the profile steps instead', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/me/profile', (r) => r.fulfill(ok(PROFILE)))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok({ status: 'active', isActive: true, expiresAt: new Date(Date.now() + 20 * 86_400_000).toISOString() })))
  await page.goto('/seva')
  const gate = page.getByRole('dialog', { name: /1 step left/i })
  await expect(gate).toBeVisible()
  await expect(gate.getByText('2 of 5 done')).toBeVisible()
  await shot(page, 'profilegate')
  await gate.getByRole('button', { name: 'Later' }).click()
  await expect(gate).toBeHidden()

  await page.getByRole('button', { name: /whatsapp/i }).first().click()
  await expect(page.getByText(/complete your profile first/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /join/i })).toHaveCount(0)
  await shot(page, 'profilegate-wa')
  await page.getByRole('button', { name: /complete profile/i }).click()
  await expect(page).toHaveURL(/\/profile\/edit/)
})
