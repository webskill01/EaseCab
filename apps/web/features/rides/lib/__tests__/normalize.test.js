import { describe, it, expect } from 'vitest'
import { toBotVM, toVerifiedVM, matchesCity } from '../normalize'

describe('matchesCity', () => {
  const vm = { cityIds: ['c1', 'c2'] }
  it('passes everything when there is no lock', () => {
    expect(matchesCity(vm, null)).toBe(true)
    expect(matchesCity(vm, undefined)).toBe(true)
  })
  it('keeps rides touching the locked city on pickup or drop, drops others', () => {
    expect(matchesCity(vm, 'c1')).toBe(true)
    expect(matchesCity(vm, 'c2')).toBe(true)
    expect(matchesCity(vm, 'c9')).toBe(false)
    expect(matchesCity({ cityIds: [] }, 'c1')).toBe(false)
  })
})

describe('toBotVM', () => {
  const apiRide = {
    id: 'r1', displayText: 'Amritsar to Delhi ████', status: 'fresh',
    pickupCityId: 'c1', dropCityId: 'c2', pickupCityName: 'Amritsar', dropCityName: 'Delhi',
    pickupRaw: 'amritsar', dropRaw: 'delhi', vehicleType: 'Sedan',
    receivedAt: '2026-06-06T10:00:00.000Z', expiresAt: '2026-06-06T10:30:00.000Z',
  }
  it('maps to the common card VM with kind=bot and clean city labels', () => {
    const vm = toBotVM(apiRide)
    expect(vm).toMatchObject({
      kind: 'bot', id: 'r1', status: 'fresh', from: 'Amritsar', to: 'Delhi',
      vehicleType: 'Sedan', message: 'Amritsar to Delhi ████',
      cityIds: ['c1', 'c2'], receivedAt: '2026-06-06T10:00:00.000Z',
    })
  })
  it('falls back to the raw fragment, and "—" target when drop is unknown', () => {
    const vm = toBotVM({ ...apiRide, dropCityName: null, dropCityId: null, dropRaw: null, pickupCityName: null, pickupRaw: 'ludhiana airport' })
    expect(vm.from).toBe('Ludhiana Airport')
    expect(vm.to).toBeNull()
    expect(vm.cityIds).toEqual(['c1'])
  })
})

describe('toVerifiedVM', () => {
  const post = {
    id: 'p1', fromCityName: 'Patiala', toCityName: 'Delhi', fromCityRaw: 'patiala', toCityRaw: 'delhi',
    fromCityId: 'c9', toCityId: 'c2', vehicleType: 'Innova', fare: 4200, notes: 'Empty return, evening.',
    rideDate: '2026-06-07', rideTime: '18:00', status: 'active', createdAt: '2026-06-06T09:00:00.000Z',
  }
  it('maps to the common VM with kind=verified, fare/date carried through', () => {
    const vm = toVerifiedVM(post)
    expect(vm).toMatchObject({
      kind: 'verified', id: 'p1', status: 'verified', from: 'Patiala', to: 'Delhi',
      vehicleType: 'Innova', message: 'Empty return, evening.', fare: 4200,
      cityIds: ['c9', 'c2'], receivedAt: '2026-06-06T09:00:00.000Z',
    })
  })
})
