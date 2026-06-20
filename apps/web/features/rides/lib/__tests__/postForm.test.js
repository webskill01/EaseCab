import { describe, it, expect } from 'vitest'
import { emptyForm, draftToForm, isPostable, toCreateBody, isFutureDateTime, todayStr, POST_VEHICLES, repostDraftFromPost } from '../postForm'

// Fixed reference clock so the future/past assertions don't depend on the wall clock.
const NOW = new Date('2026-06-18T12:00:00').getTime()

describe('postForm', () => {
  it('emptyForm has blank fields', () => {
    expect(emptyForm().phone).toBe('')
    expect(emptyForm().from).toBeNull()
  })

  it('POST_VEHICLES lists the canonical vehicle labels', () => {
    expect(POST_VEHICLES).toContain('Innova')
    expect(POST_VEHICLES).toContain('Tempo Traveller')
  })

  it('draftToForm maps resolved + raw cities, vehicle, phone', () => {
    const f = draftToForm({
      fromCityId: 'c1', fromCityName: 'Delhi', fromCityRaw: 'Delhi',
      toCityId: null, toCityName: null, toCityRaw: 'someplace',
      vehicleType: 'Innova', phone: '+919876543210',
    })
    expect(f.from).toEqual({ id: 'c1', name: 'Delhi' })
    expect(f.to).toEqual({ id: null, name: 'someplace' }) // raw fallback shows fragment
    expect(f.vehicle).toBe('Innova')
    expect(f.phone).toBe('9876543210') // +91 stripped for the 10-digit field
  })

  it('draftToForm leaves a side null when neither id nor raw present', () => {
    const f = draftToForm({ fromCityId: null, fromCityName: null, fromCityRaw: null, toCityId: 'c2', toCityName: 'Chd', toCityRaw: 'Chd', vehicleType: null, phone: null })
    expect(f.from).toBeNull()
    expect(f.to).toEqual({ id: 'c2', name: 'Chd' })
    expect(f.phone).toBe('')
  })

  it('isPostable requires from, to, vehicle, future date+time, 10-digit phone', () => {
    const base = { from: { id: 'a', name: 'A' }, to: { id: 'b', name: 'B' }, vehicle: 'Sedan', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '', notes: '' }
    expect(isPostable(base, NOW)).toBe(true)
    expect(isPostable({ ...base, phone: '12345' }, NOW)).toBe(false)
    expect(isPostable({ ...base, vehicle: '' }, NOW)).toBe(false)
    expect(isPostable({ ...base, to: null }, NOW)).toBe(false)
  })

  it('isPostable rejects a past date/time (#8)', () => {
    const base = { from: { id: 'a', name: 'A' }, to: { id: 'b', name: 'B' }, vehicle: 'Sedan', phone: '9876543210', fare: '', notes: '' }
    expect(isPostable({ ...base, date: '2026-06-10', time: '09:30' }, NOW)).toBe(false)
    expect(isPostable({ ...base, date: '2026-06-18', time: '11:00' }, NOW)).toBe(false) // earlier today
    expect(isPostable({ ...base, date: '2026-06-18', time: '13:00' }, NOW)).toBe(true)  // later today
  })

  it('isFutureDateTime needs both parts and a future instant', () => {
    expect(isFutureDateTime('2026-06-19', '08:00', NOW)).toBe(true)
    expect(isFutureDateTime('2026-06-17', '08:00', NOW)).toBe(false)
    expect(isFutureDateTime('', '08:00', NOW)).toBe(false)
    expect(isFutureDateTime('2026-06-19', '', NOW)).toBe(false)
  })

  it('todayStr formats local YYYY-MM-DD', () => {
    expect(todayStr(new Date('2026-06-18T12:00:00'))).toBe('2026-06-18')
  })

  it('toCreateBody prefers cityId, falls back to cityRaw, prefixes phone, coerces fare', () => {
    const body = toCreateBody({
      from: { id: 'c1', name: 'Delhi' }, to: { id: null, name: 'Pinjore' },
      vehicle: 'Innova', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '4200', notes: 'AC only',
    })
    expect(body).toEqual({
      fromCityId: 'c1', toCityRaw: 'Pinjore', phone: '+919876543210',
      vehicleType: 'Innova', rideDate: '2026-06-20', rideTime: '09:30', fare: 4200, notes: 'AC only',
    })
  })

  it('toCreateBody omits empty optionals', () => {
    const body = toCreateBody({
      from: { id: 'c1', name: 'Delhi' }, to: { id: 'c2', name: 'Chd' },
      vehicle: 'Sedan', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '', notes: '',
    })
    expect(body.fare).toBeUndefined()
    expect(body.notes).toBeUndefined()
    expect(body.fromCityRaw).toBeUndefined()
  })

  it('repostDraftFromPost builds resolved + raw city slots, vehicle, fare; drops date/time', () => {
    const d = repostDraftFromPost({
      id: 'p1', fromCityId: 'c1', from: 'Delhi', toCityId: null, to: 'Pinjore',
      vehicleType: 'Innova', fare: 4200, date: '2026-06-20', status: 'active',
    })
    expect(d).toEqual({ from: { id: 'c1', name: 'Delhi' }, to: { id: null, name: 'Pinjore' }, vehicle: 'Innova', fare: '4200' })
  })

  it('repostDraftFromPost blanks fare/vehicle when absent', () => {
    const d = repostDraftFromPost({ id: 'p2', fromCityId: 'c1', from: 'Delhi', toCityId: 'c2', to: 'Chd', vehicleType: null, fare: null })
    expect(d).toEqual({ from: { id: 'c1', name: 'Delhi' }, to: { id: 'c2', name: 'Chd' }, vehicle: '', fare: '' })
  })

  it('toCreateBody omits empty date/time so the free-text direct post does not 422 (#9)', () => {
    const body = toCreateBody({
      from: { id: 'c1', name: 'Delhi' }, to: { id: null, name: 'Pinjore' },
      vehicle: 'Innova', date: '', time: '', phone: '9876543210', fare: '', notes: '',
    })
    expect(body.rideDate).toBeUndefined()
    expect(body.rideTime).toBeUndefined()
    expect(body).toEqual({ fromCityId: 'c1', toCityRaw: 'Pinjore', phone: '+919876543210', vehicleType: 'Innova' })
  })
})
