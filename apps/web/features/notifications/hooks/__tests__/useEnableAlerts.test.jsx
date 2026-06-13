import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/features/notifications/services/fcmClient', () => ({ requestPermissionAndToken: vi.fn() }))
vi.mock('@/features/notifications/services/pushApi', () => ({ registerToken: vi.fn(), updatePreferences: vi.fn() }))
vi.mock('@/features/notifications/services/geoClient', () => ({ getCurrentPosition: vi.fn() }))
vi.mock('@/features/rides/services/citiesApi', () => ({ nearestCity: vi.fn() }))
vi.mock('@/features/notifications/lib/pushStorage', () => ({ setStoredToken: vi.fn() }))

import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { registerToken, updatePreferences } from '@/features/notifications/services/pushApi'
import { getCurrentPosition } from '@/features/notifications/services/geoClient'
import { nearestCity } from '@/features/rides/services/citiesApi'
import { setStoredToken } from '@/features/notifications/lib/pushStorage'
import { useEnableAlerts } from '../useEnableAlerts'

beforeEach(() => vi.clearAllMocks())

it('granted → registers token, stores it, suggests + saves nearest city', async () => {
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'tok-1' })
  registerToken.mockResolvedValue({})
  getCurrentPosition.mockResolvedValue({ lat: 30.7, lng: 76.7 })
  nearestCity.mockResolvedValue({ id: 'c1', canonicalName: 'Chandigarh' })
  updatePreferences.mockResolvedValue({})
  const { result } = renderHook(() => useEnableAlerts())
  let out
  await act(async () => { out = await result.current.enable() })
  expect(registerToken).toHaveBeenCalledWith({ deviceToken: 'tok-1', platform: 'web' })
  expect(setStoredToken).toHaveBeenCalledWith('tok-1')
  expect(updatePreferences).toHaveBeenCalledWith({ notificationCities: ['c1'] })
  expect(out).toEqual({ permission: 'granted', city: { id: 'c1', canonicalName: 'Chandigarh' } })
})

it('denied → no token registration', async () => {
  requestPermissionAndToken.mockResolvedValue({ permission: 'denied', token: null })
  const { result } = renderHook(() => useEnableAlerts())
  let out
  await act(async () => { out = await result.current.enable() })
  expect(registerToken).not.toHaveBeenCalled()
  expect(out.permission).toBe('denied')
})

it('granted but geo denied → token still registered, city null', async () => {
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'tok-1' })
  registerToken.mockResolvedValue({})
  getCurrentPosition.mockRejectedValue(new Error('denied'))
  const { result } = renderHook(() => useEnableAlerts())
  let out
  await act(async () => { out = await result.current.enable() })
  expect(registerToken).toHaveBeenCalled()
  expect(updatePreferences).not.toHaveBeenCalled()
  expect(out).toEqual({ permission: 'granted', city: null })
})
