import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { searchCities, nearestCity } from '../citiesApi'

beforeEach(() => vi.clearAllMocks())

describe('searchCities', () => {
  it('encodes the query + limit and returns the cities array', async () => {
    apiFetch.mockResolvedValue({ data: { cities: [{ id: 'c1', canonicalName: 'Ludhiana' }] } })
    const out = await searchCities('ludh', { limit: 10 })
    expect(apiFetch).toHaveBeenCalledWith('/cities?q=ludh&limit=10', { signal: undefined })
    expect(out).toEqual([{ id: 'c1', canonicalName: 'Ludhiana' }])
  })

  it('forwards an abort signal for typeahead cancellation', async () => {
    apiFetch.mockResolvedValue({ data: { cities: [] } })
    const ctrl = new AbortController()
    await searchCities('x', { signal: ctrl.signal })
    expect(apiFetch).toHaveBeenCalledWith('/cities?q=x', { signal: ctrl.signal })
  })
})

describe('nearestCity', () => {
  it('GETs /cities/nearest with lat/lng and returns the city', async () => {
    apiFetch.mockResolvedValue({ data: { city: { id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 } } })
    const out = await nearestCity({ lat: 30.73, lng: 76.78 })
    expect(apiFetch).toHaveBeenCalledWith('/cities/nearest?lat=30.73&lng=76.78')
    expect(out).toEqual({ id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 })
  })

  it('returns null when none in range', async () => {
    apiFetch.mockResolvedValue({ data: { city: null } })
    expect(await nearestCity({ lat: 0, lng: 0 })).toBeNull()
  })
})
