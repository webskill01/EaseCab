import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('@/features/notifications/services/geoClient', () => ({ getCurrentPosition: vi.fn() }))
vi.mock('@/features/rides/services/citiesApi', () => ({ nearestCity: vi.fn() }))
import { getCurrentPosition } from '@/features/notifications/services/geoClient'
import { nearestCity } from '@/features/rides/services/citiesApi'
import { useNearestCity } from '../useNearestCity'

beforeEach(() => vi.clearAllMocks())

it('locate() resolves geo → nearest city', async () => {
  getCurrentPosition.mockResolvedValue({ lat: 30.7, lng: 76.7 })
  nearestCity.mockResolvedValue({ id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4 })
  const { result } = renderHook(() => useNearestCity())
  let city
  await act(async () => { city = await result.current.locate() })
  expect(city).toEqual({ id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4 })
  await waitFor(() => expect(result.current.suggestion?.id).toBe('c1'))
})

it('locate() returns null and sets error when geo denied', async () => {
  getCurrentPosition.mockRejectedValue(new Error('denied'))
  const { result } = renderHook(() => useNearestCity())
  let city
  await act(async () => { city = await result.current.locate() })
  expect(city).toBeNull()
  expect(result.current.errorKey).toBe('error.geo')
})
