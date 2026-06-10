import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { searchCities } from '../citiesApi'

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
