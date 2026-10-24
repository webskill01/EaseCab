import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/features/notifications/services/fcmClient', () => ({ requestPermissionAndToken: vi.fn() }))
vi.mock('@/features/notifications/services/pushApi', () => ({ registerToken: vi.fn(), unregisterToken: vi.fn() }))
vi.mock('@/features/notifications/lib/pushStorage', () => ({ setStoredToken: vi.fn(), getStoredToken: vi.fn() }))

import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { registerToken, unregisterToken } from '@/features/notifications/services/pushApi'
import { setStoredToken, getStoredToken } from '@/features/notifications/lib/pushStorage'
import { useSyncPushToken } from '../useSyncPushToken'

beforeEach(() => vi.clearAllMocks())
afterEach(() => { delete global.Notification })

it('permission granted → re-mints + registers the token on mount', async () => {
  global.Notification = { permission: 'granted' }
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'tok-9' })
  registerToken.mockResolvedValue({})
  renderHook(() => useSyncPushToken())
  await waitFor(() => expect(registerToken).toHaveBeenCalledWith({ deviceToken: 'tok-9', platform: 'web' }))
  expect(setStoredToken).toHaveBeenCalledWith('tok-9')
})

it('permission not granted → does nothing (no mint, no register)', async () => {
  global.Notification = { permission: 'default' }
  renderHook(() => useSyncPushToken())
  await Promise.resolve()
  expect(requestPermissionAndToken).not.toHaveBeenCalled()
  expect(registerToken).not.toHaveBeenCalled()
})

it('granted but no token minted → never registers', async () => {
  global.Notification = { permission: 'granted' }
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: null })
  renderHook(() => useSyncPushToken())
  await waitFor(() => expect(requestPermissionAndToken).toHaveBeenCalled())
  expect(registerToken).not.toHaveBeenCalled()
})

it('a new token (web → Play app native) unregisters the old one', async () => {
  global.Notification = { permission: 'granted' }
  getStoredToken.mockReturnValue('old-web')
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'native-1' })
  registerToken.mockResolvedValue({})
  unregisterToken.mockResolvedValue({})
  renderHook(() => useSyncPushToken())
  await waitFor(() => expect(setStoredToken).toHaveBeenCalledWith('native-1'))
  expect(unregisterToken).toHaveBeenCalledWith({ deviceToken: 'old-web' })
})
