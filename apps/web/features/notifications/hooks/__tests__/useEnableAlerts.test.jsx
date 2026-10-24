import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/features/notifications/services/fcmClient', () => ({ requestPermissionAndToken: vi.fn() }))
vi.mock('@/features/notifications/services/pushApi', () => ({ registerToken: vi.fn(), updatePreferences: vi.fn() }))
vi.mock('@/features/notifications/lib/pushStorage', () => ({ setStoredToken: vi.fn() }))

import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { registerToken, updatePreferences } from '@/features/notifications/services/pushApi'
import { setStoredToken } from '@/features/notifications/lib/pushStorage'
import { useEnableAlerts } from '../useEnableAlerts'

beforeEach(() => vi.clearAllMocks())

it('granted → registers + stores the token; leaves alert cities alone (empty = all rides)', async () => {
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'tok-1' })
  registerToken.mockResolvedValue({})
  const { result } = renderHook(() => useEnableAlerts())
  let out
  await act(async () => { out = await result.current.enable() })
  expect(registerToken).toHaveBeenCalledWith({ deviceToken: 'tok-1', platform: 'web' })
  expect(setStoredToken).toHaveBeenCalledWith('tok-1')
  expect(updatePreferences).not.toHaveBeenCalled()
  expect(out).toEqual({ permission: 'granted' })
})

it('denied → no token registration', async () => {
  requestPermissionAndToken.mockResolvedValue({ permission: 'denied', token: null })
  const { result } = renderHook(() => useEnableAlerts())
  let out
  await act(async () => { out = await result.current.enable() })
  expect(registerToken).not.toHaveBeenCalled()
  expect(out.permission).toBe('denied')
})
