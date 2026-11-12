import { test, expect, devices } from '@playwright/test'

/**
 * Seva → Border Tax E2E (Phase 26). API network-mocked: the filing walks
 * awaiting_captcha → filling → handed_off on one preparing screen, then Payment Details, and the
 * hand-off form must POST to the (mocked) bank page in a NEW tab. Also: non-member gate, failure
 * result + Try again, and a running filing reopening when the driver comes back.
 * SHOTS=<dir> saves a screenshot per step (visual review).
 */
test.use({ ...devices['Pixel 5'] })

const ok = (data, meta) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) })
const BANK = 'https://bank.example.test/pay'
const HOUR = 3_600_000
const shot = async (page, name) => { if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) }

function filingState(step) {
  const taxFrom = new Date(Date.now() + HOUR)
  const base = { id: 'f1', vehicleNo: 'PB01C9079', stateCd: 'HR', checkpost: 'PANCHKULA', seats: '4+1', taxFrom, taxUpto: new Date(taxFrom.getTime() + 86_340_000), taxPaise: null, failureCode: null, createdAt: new Date() }
  const deadline = new Date(Date.now() + 200_000)
  if (step === 0) return { ...base, status: 'awaiting_captcha', live: { step: 'vahan', captcha: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', canRefresh: true, deadline, started: new Date(), handoff: null } }
  if (step === 1) return { ...base, status: 'filling', live: { step: 'filling', captcha: null, deadline: null, started: new Date(), handoff: null } }
  if (step === 3) return { ...base, status: 'failed', failureCode: filingState.failureCode, live: null }
  return { ...base, status: 'handed_off', taxPaise: 23000, live: { step: 'filling', captcha: null, deadline: null, started: new Date(), handoff: { method: 'POST', action: BANK, fields: [['encdata', 'e1']] } } }
}

async function mockSeva(page, { member = true, failed = false, running = false, failureCode = 'portal_error' } = {}) {
  filingState.failureCode = failureCode
  let step = failed ? 3 : running ? 1 : 0
  let created = failed || running
  const bankPosts = []
  const refreshes = []
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/subscriptions/me', (r) => r.fulfill(ok(member
    ? { status: 'active', isActive: true, expiresAt: new Date(Date.now() + 20 * 86_400_000).toISOString() }
    : { status: 'expired', isActive: false, expiresAt: null })))
  await page.route('**/api/v1/border-tax/rates', (r) => r.fulfill(ok({ rates: [{ stateCd: 'HR', checkpost: 'PANCHKULA', seats: '4+1', days: 1, taxPaise: 23000, at: '2026-11-07T06:00:00.000Z' }] })))
  await page.route('**/api/v1/border-tax?**', (r) => r.fulfill(ok({ filings: created ? [filingState(step)] : [] }, { nextCursor: null })))
  await page.route('**/api/v1/border-tax', (r) => { created = true; return r.fulfill({ ...ok({ filing: filingState(0) }), status: 201 }) })
  await page.route('**/api/v1/border-tax/f1', (r) => {
    const body = ok({ filing: filingState(step) })
    if (step === 1 && !running) step = 2 // one poll of 'filling', then the payment page is ready
    return r.fulfill(body)
  })
  await page.route('**/api/v1/border-tax/f1/captcha/refresh', (r) => { refreshes.push(1); return r.fulfill(ok({ id: 'f1' })) })
  await page.route('**/api/v1/border-tax/f1/captcha', (r) => { step = 1; return r.fulfill(ok({ id: 'f1' })) })
  await page.context().route(BANK, (r) => { bankPosts.push(r.request().postData()); return r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Bank page</h1>' }) })
  return { bankPosts, refreshes }
}

async function fillForm(page) {
  await page.getByLabel(/rc number/i).fill('pb01 c9079')
  await page.getByRole('combobox', { name: /^state/i }).selectOption('HR')
  await page.getByRole('combobox', { name: /^border/i }).selectOption('PANCHKULA')
  await page.getByLabel(/distance/i).fill('50')
  await page.getByRole('checkbox').check()
}

test('border tax tab: one preparing screen (captcha inline) → Payment Details → bank page in a new tab', async ({ page }) => {
  const { bankPosts, refreshes } = await mockSeva(page)
  await page.goto('/seva') // parked hub redirects to the form
  await expect(page.getByRole('heading', { name: 'Pay Border Tax' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Border Tax' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel(/date for apply/i)).toHaveCount(0) // step 1: RC, seats, state, border only
  await shot(page, '1-form-step1')
  await fillForm(page)
  await expect(page.getByText(/latest fee at this border: ₹230 for 1 day/i)).toBeVisible() // real quote from an earlier filing
  await shot(page, '2-form')
  await page.getByRole('button', { name: /^pay now$/i }).click()

  await expect(page.getByRole('heading', { name: 'Preparing your border tax payment' })).toBeVisible()
  await expect(page.getByText('Keep this page open')).toBeVisible()
  await expect(page.getByText('Type the code', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /new code/i }).click()
  await expect.poll(() => refreshes.length).toBe(1)
  await page.getByPlaceholder('Code').fill('x7 k#2@')
  await expect(page.getByPlaceholder('Code')).toHaveValue('x7k#2@') // symbols kept, spaces dropped
  await shot(page, '3-captcha')
  await page.getByRole('button', { name: /submit code/i }).click()

  await expect(page.getByRole('heading', { name: 'Payment Details' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Amount Payable')).toBeVisible()
  await expect(page.getByRole('link', { name: /print payment receipt/i })).toHaveCount(0) // receipt link dropped
  await shot(page, '5-handoff')
  const tab = page.waitForEvent('popup')
  await page.getByRole('button', { name: /pay border tax ₹230/i }).click()
  await expect((await tab).getByRole('heading', { name: 'Bank page' })).toBeVisible()
  expect(bankPosts).toEqual(['encdata=e1'])
  await expect(page.getByRole('heading', { name: 'Payment Details' })).toHaveCount(0) // paid from → sheet closes, done
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pay Border Tax' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Payment Details' })).toHaveCount(0) // doesn't pop up again on return
})

test('non-member sees the form but gets the members gate on submit', async ({ page }) => {
  await mockSeva(page, { member: false })
  await page.goto('/seva/border-tax')
  await fillForm(page)
  await page.getByRole('button', { name: /^pay now$/i }).click()
  await expect(page.getByText('Seva is for members')).toBeVisible()
  await shot(page, '6-gate')
})

test('just-failed filing reopens on arrival with the reason → Try again refills the form', async ({ page }) => {
  await mockSeva(page, { failed: true })
  await page.goto('/seva/border-tax')
  await expect(page.getByRole('dialog').getByText(/govt portal had a problem/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /contact support/i })).toBeVisible()
  await shot(page, '7-failed')
  await page.getByRole('button', { name: /try again/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel(/rc number/i)).toHaveValue('PB01C9079')
  await expect(page.getByRole('combobox', { name: /^state/i })).toHaveValue('HR')
  await expect(page.getByRole('combobox', { name: /^border/i })).toHaveValue('PANCHKULA')
})

test('expired PUC: says renew it first, no Try again (retrying cannot help)', async ({ page }) => {
  await mockSeva(page, { failed: true, failureCode: 'pucc_expired' })
  await page.goto('/seva/border-tax')
  await expect(page.getByRole('dialog').getByText(/pollution certificate \(PUC\) has expired/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /contact support/i })).toBeVisible()
  await shot(page, '7b-pucc')
})

test('saved RC numbers are offered as the RC box suggestions (no chips)', async ({ page }) => {
  await mockSeva(page, { failed: true })
  await page.goto('/seva/border-tax')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  const box = page.getByLabel(/rc number/i)
  const list = await box.getAttribute('list')
  expect(list).toBeTruthy()
  await expect(page.locator(`datalist#${list} option`)).toHaveAttribute('value', 'PB01C9079')
  await expect(page.getByRole('button', { name: 'PB01C9079', exact: true })).toHaveCount(0)
})

test('driver comes back while the filing runs → preparing screen again, not a blank form', async ({ page }) => {
  await mockSeva(page, { running: true })
  await page.goto('/seva/border-tax')
  await expect(page.getByRole('heading', { name: 'Preparing your border tax payment' })).toBeVisible()
  await expect(page.getByText('PB01C9079', { exact: true })).toBeVisible()
  await shot(page, '8-resume')
})
