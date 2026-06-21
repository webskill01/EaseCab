import { test, expect } from '@playwright/test'

/**
 * Verification E2E (Step 21c). AuthGuard probe, /me/profile, /verification/*,
 * /uploads/presign and the R2 POST are network-mocked.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const BASE_PROFILE = {
  id: 'u1', phone: '+919876543210', name: '', bio: '', baseCity: '', vehicleType: null,
  profilePicUrl: null, languagesSpoken: [], profileComplete: false,
  verification: { aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'none', aadhaarLast4: null },
}

async function mockBase(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
}

test('L1: Aadhaar → OTP → complete profile → routed to /profile', async ({ page }) => {
  await mockBase(page)
  await page.route('**/api/v1/verification/aadhaar/otp', (r) => r.fulfill(ok({ clientId: 'c1' })))
  await page.route('**/api/v1/verification/aadhaar/verify', (r) => r.fulfill(ok({ verified: true, name: 'Amrit Singh', dob: '1990-05-20', gender: 'M', address: 'Ludhiana' })))
  await page.route('**/api/v1/uploads/presign', (r) => r.fulfill(ok({ url: 'https://r2.example/upload', fields: { key: 'k1' }, key: 'k1', publicUrl: 'https://cdn.example/k1' })))
  await page.route('https://r2.example/upload', (r) => r.fulfill({ status: 204, body: '' }))
  let patched = false
  await page.route('**/api/v1/me/profile', (r) => {
    if (r.request().method() === 'PATCH') { patched = true; return r.fulfill(ok({ ...BASE_PROFILE, name: 'Amrit Singh', bio: 'driver', baseCity: 'Ludhiana', vehicleType: 'Sedan', languagesSpoken: ['Punjabi'], profilePicUrl: 'https://cdn.example/k1', profileComplete: true })) }
    return r.fulfill(ok(BASE_PROFILE))
  })

  await page.goto('/verify?intent=l1')
  await page.getByLabel('Aadhaar number').fill('123456789012')
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel(/enter the otp/i).fill('123456')
  await page.getByRole('button', { name: /^verify$/i }).click()
  await expect(page.getByText(/aadhaar verified/i)).toBeVisible()
  // complete the profile
  await page.setInputFiles('input[type="file"]', { name: 'dp.png', mimeType: 'image/png', buffer: Buffer.from('x') })
  await page.getByLabel('Full name').fill('Amrit Singh')
  await page.getByLabel('Base city').fill('Ludhiana')
  await page.getByLabel('About me').fill('Sedan driver')
  await page.getByRole('radio', { name: /sedan/i }).click()
  await page.getByRole('button', { name: 'Punjabi' }).click()
  await page.getByRole('button', { name: /save profile/i }).click()
  await expect(page).toHaveURL(/\/profile/)
  expect(patched).toBe(true)
})

test('L2: DL submit shows the result', async ({ page }) => {
  await mockBase(page)
  await page.route('**/api/v1/me/profile', (r) => r.fulfill(ok(BASE_PROFILE)))
  await page.route('**/api/v1/verification/dl', (r) => r.fulfill(ok({ verified: true, name: 'Amrit', validUpto: '2030-01-01', cov: 'LMV' })))
  await page.goto('/verify?intent=dl')
  await page.getByLabel('DL number').fill('PB1020200012345')
  await page.getByLabel('Date of birth').fill('1990-05-20')
  await page.getByRole('button', { name: /^verify$/i }).first().click()
  await expect(page.getByText(/LMV/)).toBeVisible()
})
