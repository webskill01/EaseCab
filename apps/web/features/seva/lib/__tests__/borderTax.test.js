import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'
import {
  formFrom, resumable, BT_FAIL_FIX_FIRST, BT_FAIL_VEHICLE_PENDING, prepStep, prepDeadline, markPayOpened, BT_CAPTCHA_SEC, BT_PREP_SEC,
  BT_STATES, BT_STATUS, BT_FINAL, BT_SEATS, BT_MAX_DAYS, BT_MAX_AHEAD_DAYS, BT_VEHICLE_RE,
  defaultStart, validUpto, BT_RECEIPT_KEEP_SEC, receiptGone, isFilable, isStarted, toCreateBody, emptyForm, createErrorKey, submitHandoff, toLocalInput, gettingReceipt,
  canUnlock, unlocking,
} from '../borderTax'
import { BT_LIVE_STATES } from '../states'

const shared = createRequire(import.meta.url)('../../../../../../packages/shared/constants/borderTax.js')
const NOW = new Date('2026-11-05T10:02:00')
const form = (o = {}) => ({ ...emptyForm(NOW), vehicleNo: 'pb01 c9079', stateCd: 'HP', checkpost: 'PARWANOO', declare: true, ...o })

describe('mirror of @easecab/shared', () => {
  it('matches states, statuses, seats and limits', () => {
    const states = Object.fromEntries(Object.values(shared.BORDER_TAX_STATES).map((s) => [s.code, { name: s.name, needsDistance: s.needsDistance, calendarDays: s.calendarDays, taxModes: [...s.taxModes], checkposts: [...s.checkposts] }]))
    expect(BT_STATES).toEqual(states)
    expect(BT_LIVE_STATES).toEqual(shared.BORDER_TAX_LIVE_STATES)
    expect(BT_STATUS).toEqual(shared.BORDER_TAX_STATUS)
    expect(BT_FINAL).toEqual(shared.BORDER_TAX_FINAL_STATUSES)
    expect(Object.values(shared.BORDER_TAX_FAILURE)).toEqual(expect.arrayContaining([...BT_FAIL_FIX_FIRST, BT_FAIL_VEHICLE_PENDING]))
    expect(BT_SEATS).toEqual(shared.BORDER_TAX_SEATS)
    expect(BT_RECEIPT_KEEP_SEC).toBe(shared.BORDER_TAX.RECEIPT_KEEP_SEC)
    expect([BT_MAX_DAYS, BT_MAX_AHEAD_DAYS, String(BT_VEHICLE_RE), BT_CAPTCHA_SEC]).toEqual([shared.BORDER_TAX.MAX_DAYS, shared.BORDER_TAX.MAX_START_AHEAD_DAYS, String(shared.BORDER_TAX.VEHICLE_NO_REGEX), shared.BORDER_TAX.CAPTCHA_TIMEOUT_SEC])
  })

  it('validUpto matches borderTaxWindow', () => {
    const start = new Date('2026-11-05T19:00:00')
    expect(validUpto(start, 2)).toEqual(shared.borderTaxWindow(start, 2).upto)
  })
})

describe('form', () => {
  it('default start is 15+ min ahead on a 5-min step', () => {
    expect(defaultStart(NOW)).toBe('2026-11-05T10:20')
  })

  it('isFilable: needs declaration, valid RC, HR distance, start within 7 days', () => {
    expect(isFilable(form(), NOW)).toBe(true)
    expect(isFilable(form({ declare: false }), NOW)).toBe(false)
    expect(isFilable(form({ vehicleNo: 'PB' }), NOW)).toBe(false)
    expect(isFilable(form({ checkpost: '' }), NOW)).toBe(false) // border required
    expect(isFilable(form({ stateCd: 'HR', checkpost: 'PANCHKULA' }), NOW)).toBe(false)
    expect(isFilable(form({ stateCd: 'HR', checkpost: 'PANCHKULA', distanceKm: '50' }), NOW)).toBe(true)
    expect(isFilable(form({ startAt: toLocalInput(new Date(NOW.getTime() + 8 * 86_400_000)) }), NOW)).toBe(false)
    expect(isFilable(form({ days: 31 }), NOW)).toBe(false)
  })

  it('isStarted: rest of the form opens on a valid RC + state', () => {
    expect(isStarted(form())).toBe(true)
    expect(isStarted(form({ stateCd: '' }))).toBe(false)
    expect(isStarted(form({ vehicleNo: 'PB' }))).toBe(false)
  })

  it('receiptGone: 24h after validity ends, paid with a receipt only', () => {
    const f = { status: 'paid', receiptNo: 'R1', taxUpto: '2026-11-12T18:29:00Z' }
    expect(receiptGone(f, Date.parse('2026-11-13T18:28:00Z'))).toBe(false)
    expect(receiptGone(f, Date.parse('2026-11-13T18:29:00Z'))).toBe(true)
    expect(receiptGone({ ...f, receiptNo: null }, Date.parse('2027-01-01'))).toBe(false)
  })

  it('validUpto: 24h blocks; calendar-day states (UP) end 23:59 of the last date', () => {
    expect(validUpto('2026-11-12T11:40', 1)).toEqual(new Date('2026-11-13T11:39'))
    expect(validUpto('2026-11-12T11:40', 1, true)).toEqual(new Date('2026-11-12T23:59'))
    expect(validUpto('2026-11-12T11:40', 2, true)).toEqual(new Date('2026-11-13T23:59'))
  })

  it('tax period: only the periods the state offers; days ignored outside DAYS', () => {
    expect(isFilable(form({ taxMode: '4' }), NOW)).toBe(false) // HP: DAYS only
    expect(isFilable(form({ stateCd: 'UP', checkpost: 'SAHARANPUR', taxMode: '4', days: 99 }), NOW)).toBe(true)
    expect(isFilable(form({ stateCd: 'UP', taxMode: '7' }), NOW)).toBe(false) // UP: no yearly
    const body = JSON.parse(JSON.stringify(toCreateBody(form({ stateCd: 'UP', taxMode: '5' }))))
    expect([body.taxMode, body.days]).toEqual(['5', undefined])
  })

  it('toCreateBody: normalised RC, ISO start, optional fields dropped', () => {
    const body = JSON.parse(JSON.stringify(toCreateBody(form())))
    expect(body).toEqual({ vehicleNo: 'PB01C9079', stateCd: 'HP', checkpost: 'PARWANOO', seats: '4+1', startAt: new Date('2026-11-05T10:20').toISOString(), taxMode: '1', days: 1, declare: true })
    expect(toCreateBody(form({ stateCd: 'HR', distanceKm: '50', checkpost: 'AMBALA' }))).toMatchObject({ distanceKm: 50, checkpost: 'AMBALA' })
  })

  it('createErrorKey maps 409 / rate limit', () => {
    expect([createErrorKey({ status: 409 }), createErrorKey({ code: 'RATE_LIMITED', status: 429 }), createErrorKey({})]).toEqual(['vehicleBusy', 'rateLimited', 'generic'])
    expect(createErrorKey({ code: 'RATE_LIMITED', status: 429, meta: { retryAfter: 90 } })).toBe('busy')
  })
})

describe('submitHandoff', () => {
  it('posts the captured fields to the bank page; refuses non-https', () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {})
    submitHandoff({ method: 'POST', action: 'https://bank.example/pay', fields: [['encdata', 'a+b='], ['m', '1']] })
    const f = document.body.lastElementChild
    expect([f.method, f.action, f.target, new FormData(f).get('encdata')]).toEqual(['post', 'https://bank.example/pay', '_blank', 'a+b='])
    expect(submit).toHaveBeenCalledOnce()
    expect(() => submitHandoff({ method: 'POST', action: 'http://bank.example', fields: [] })).toThrow()
    submit.mockRestore()
  })
})

describe('formFrom (try again)', () => {
  const now = new Date('2026-11-05T10:00:00+05:30')
  const f = { vehicleNo: 'PB01C9079', seats: '6+1', stateCd: 'HR', checkpost: 'PANCHKULA', taxFrom: '2026-11-05T09:00:00+05:30', taxUpto: '2026-11-07T08:59:00+05:30' }
  it('keeps cab, state, border and days; past start → default start; declaration unticked', () => {
    const r = formFrom(f, now)
    expect([r.vehicleNo, r.seats, r.stateCd, r.checkpost, r.days, r.declare]).toEqual(['PB01C9079', '6+1', 'HR', 'PANCHKULA', 2, false])
    expect(r.startAt).toBe(defaultStart(now))
  })
  it('drops a state that is not live now (driver picks again)', () => {
    const r = formFrom({ ...f, stateCd: 'RJ', checkpost: 'SADHUWALI' }, now)
    expect([r.stateCd, r.checkpost, r.vehicleNo]).toEqual(['', '', 'PB01C9079'])
  })
  it('keeps a start that is still ahead', () => {
    const later = { ...f, taxFrom: '2026-11-06T09:00:00+05:30', taxUpto: '2026-11-07T08:59:00+05:30' }
    expect(formFrom(later, now).startAt).toBe(toLocalInput(new Date(later.taxFrom)))
  })
})

describe('resume + preparing progress', () => {
  const at = (min) => new Date(NOW.getTime() - min * 60_000).toISOString()
  it('reopens a running filing, or one that finished in the last 15 min — not older ones', () => {
    expect(resumable([{ id: 'a', status: 'filling', createdAt: at(60) }], NOW)?.id).toBe('a')
    expect(resumable([{ id: 'b', status: 'failed', createdAt: at(5) }], NOW)?.id).toBe('b')
    expect(resumable([{ id: 'c', status: 'handed_off', createdAt: at(20) }], NOW)).toBeNull()
    expect(resumable([], NOW)).toBeNull()
    expect(resumable([{ id: 'd', status: 'handed_off', createdAt: at(2) }], NOW, ['d'])).toBeNull() // paid from already
    markPayOpened('e')
    expect(resumable([{ id: 'e', status: 'handed_off', createdAt: at(2) }], NOW)).toBeNull()
  })
  it('ticks evenly (25s each) from the worker pick-up, not from queueing; hand-off ticks the last', () => {
    const sec = (s) => new Date(NOW.getTime() - s * 1000).toISOString()
    const f = (o) => ({ status: 'filling', createdAt: at(5), live: { step: 'filling', started: sec(0) }, ...o })
    expect(prepStep(f({ status: 'queued', live: { started: null, progress: 2 } }))).toBe(0) // not picked up yet
    expect(prepStep(f({ live: { step: 'filling', started: sec(300) } }))).toBe(0) // time alone never ticks a step
    expect([0, 1, 2, 3, 4].map((progress) => prepStep(f({ live: { step: 'filling', started: sec(5), progress } })))).toEqual([0, 1, 2, 3, 3])
    expect(prepStep(f({ status: 'handed_off' }))).toBe(4)
    expect(prepStep(f({ status: 'awaiting_payment' }))).toBe(4)
  })
  it('ring: none while queued, BT_PREP_SEC from pick-up, the captcha deadline while one waits', () => {
    const started = '2026-11-05T10:00:00.000Z'
    expect(prepDeadline({ status: 'queued', live: { started: null } })).toBeNull()
    expect(new Date(prepDeadline({ status: 'filling', live: { started } })) - new Date(started)).toBe(BT_PREP_SEC * 1000)
    expect(prepDeadline({ status: 'awaiting_captcha', live: { started, captcha: 'x', deadline: 'D' } })).toBe('D')
  })
})

describe('gettingReceipt', () => {
  const paid = { status: 'paid', paidAt: '2026-11-11T12:00:00Z', live: { step: 'receipt' } }
  const at = (min) => new Date('2026-11-11T12:00:00Z').getTime() + min * 60_000
  it('true only while paid + receipt step, capped at 10 min', () => {
    expect([gettingReceipt(paid, at(2)), gettingReceipt(paid, at(11)), gettingReceipt({ ...paid, live: { step: 'paid' } }, at(2)), gettingReceipt({ ...paid, status: 'failed' }, at(2))])
      .toEqual([true, false, false, false])
  })
})

describe('pending-lock clear', () => {
  const vp = { failureCode: 'vehicle_pending' }
  it('offers Clear lock only for vehicle_pending with no clear running or done', () => {
    expect(canUnlock(vp)).toBe(true)
    expect(canUnlock({ ...vp, unlock: { status: 'failed' } })).toBe(true)
    for (const status of ['queued', 'waiting', 'cleared', 'paid']) expect(canUnlock({ ...vp, unlock: { status } })).toBe(false)
    expect(canUnlock({ failureCode: 'payment_timeout' })).toBe(false)
  })
  it('keeps polling while a clear is queued or waiting', () => {
    expect(unlocking({ unlock: { status: 'waiting' } })).toBe(true)
    expect(unlocking({ unlock: { status: 'cleared' } })).toBe(false)
    expect(unlocking({ unlock: null })).toBe(false)
  })
})
