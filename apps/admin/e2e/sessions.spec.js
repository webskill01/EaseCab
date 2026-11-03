import { test, expect } from '@playwright/test'

const ADMIN = { id: 'a1', email: 'a@x.com', role: 'super' }
const now = Date.now()
const SESSIONS = [
  { id: '11111111-1111-1111-1111-111111111111', slot: 'slot-1', name: 'Punjab main', enabled: true, phone: '919876543210', ridesSaved: 1840, status: 'live', lastMsgAt: now - 40_000, groups: { total: 212, unique: 140 }, rides24h: 96, reconnects: 2, botStartedAt: now - 3 * 86_400_000, statusSince: now - 5 * 3_600_000, outcomes: { saved: 1840, duplicate: 610, claimed_elsewhere: 220, not_ride: 4300 } },
  { id: '22222222-2222-2222-2222-222222222222', slot: 'wa-1a2b3c4d', name: 'Ambala groups', enabled: true, phone: null, ridesSaved: 0, status: 'not_paired', lastMsgAt: null, groups: { total: 0, unique: 0 }, rides24h: 0, outcomes: {} },
  { id: '33333333-3333-3333-3333-333333333333', slot: 'wa-9f8e7d6c', name: 'Backup number', enabled: false, phone: '919812345678', ridesSaved: 312, status: 'paused', lastMsgAt: now - 7_200_000, groups: { total: 160, unique: 12 }, rides24h: 0, outcomes: { saved: 312, duplicate: 900 } },
]
const QR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 3"><rect width="3" height="3" fill="#fff"/><path d="M0 0h1v1h-1z"/></svg>'
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

test('sessions tab shows live status + stats and links a number by QR', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) => r.fulfill(ok({ admin: ADMIN })))
  await page.route('**/api/v1/admin/stats**', (r) => r.fulfill(ok({})))
  let paired = false
  await page.route('**/api/v1/admin/wa-sessions**', (route) => {
    const url = route.request().url()
    if (url.endsWith('/pair') && route.request().method() === 'POST') {
      paired = true
      return route.fulfill(ok({ status: 'starting' }))
    }
    if (url.endsWith('/pair')) return route.fulfill(ok(paired ? { status: 'qr', qrSvg: QR } : { status: null }))
    return route.fulfill(ok({ sessions: SESSIONS, totals: { groups: 360, max: 20 } }))
  })
  await page.context().addCookies([{ name: 'ec_admin_rt', value: 'test-session', url: 'http://localhost:3101' }])
  await page.goto('/sessions')

  await expect(page.getByText('Punjab main')).toBeVisible()
  await expect(page.getByText('Live', { exact: true })).toBeVisible()
  await expect(page.getByText('140 only this number')).toBeVisible()
  await page.getByRole('button', { name: 'Link number' }).click()
  await page.getByRole('button', { name: 'Start linking' }).click()
  await expect(page.getByAltText('WhatsApp pairing QR')).toBeVisible()
})

test('stats panel shows rides by city per period, outcomes, connection; groups panel lists groups', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/me', (r) => r.fulfill(ok({ admin: ADMIN })))
  await page.route('**/api/v1/admin/stats**', (r) => r.fulfill(ok({})))
  await page.route('**/api/v1/admin/wa-sessions**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/analytics')) {
      const week = url.searchParams.get('period') === 'week'
      return route.fulfill(ok({ period: 'day', total: week ? 640 : 96, from: now - 86_400_000, until: now,
        cities: [{ city: 'Ambala', count: week ? 400 : 60 }, { city: null, count: week ? 240 : 36 }] }))
    }
    if (url.pathname.endsWith('/groups')) {
      return route.fulfill(ok({ groups: [{ jid: 'g1@g.us', name: 'Ambala Taxi Service', participants: 412, enabled: true }, { jid: 'g2@g.us', name: null, participants: null, enabled: false }] }))
    }
    return route.fulfill(ok({ sessions: SESSIONS, totals: { groups: 360, max: 20 } }))
  })
  await page.context().addCookies([{ name: 'ec_admin_rt', value: 'test-session', url: 'http://localhost:3101' }])
  await page.goto('/sessions')

  await page.getByRole('button', { name: 'Stats' }).first().click()
  await expect(page.getByText('96 rides')).toBeVisible()
  await expect(page.getByText('Unknown city')).toBeVisible()
  await expect(page.getByText('Taken by another number')).toBeVisible()
  await page.getByRole('button', { name: '7 days' }).click()
  await expect(page.getByText('640 rides')).toBeVisible()
  await page.getByRole('button', { name: 'Groups' }).first().click()
  await expect(page.getByText('Ambala Taxi Service')).toBeVisible()
  await expect(page.getByText('ignored')).toBeVisible()
})

test('public share page needs no login and shows the pairing code', async ({ page }) => {
  let started = false
  await page.route('**/api/v1/wa-pair/**', (route) => {
    if (route.request().method() === 'POST') {
      started = true
      return route.fulfill(ok({ status: 'starting' }))
    }
    return route.fulfill(ok(started ? { name: 'Ambala groups', status: 'code', code: 'K7QX-92LM' } : { name: 'Ambala groups', status: null }))
  })
  await page.goto('/pair/AbCdEfGhIjKlMnOpQrStUvWx')
  await expect(page.getByText('Ambala groups')).toBeVisible()
  await page.getByRole('button', { name: 'Use phone number' }).click()
  await page.getByPlaceholder(/WhatsApp number/).fill('98765 43210')
  await page.getByRole('button', { name: 'Start linking' }).click()
  await expect(page.getByText('K7QX-92LM')).toBeVisible()
})
