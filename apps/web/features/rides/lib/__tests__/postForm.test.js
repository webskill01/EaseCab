import { describe, it, expect } from 'vitest'
import { emptyForm, draftToForm, isPostable, toCreateBody, POST_VEHICLES } from '../postForm'

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

  it('isPostable requires from, to, vehicle, date, time, 10-digit phone', () => {
    const base = { from: { id: 'a', name: 'A' }, to: { id: 'b', name: 'B' }, vehicle: 'Sedan', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '', notes: '' }
    expect(isPostable(base)).toBe(true)
    expect(isPostable({ ...base, phone: '12345' })).toBe(false)
    expect(isPostable({ ...base, vehicle: '' })).toBe(false)
    expect(isPostable({ ...base, to: null })).toBe(false)
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
})
