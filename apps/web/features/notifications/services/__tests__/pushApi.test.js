import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { getPreferences, updatePreferences, registerToken, unregisterToken } from '../pushApi'

beforeEach(() => vi.clearAllMocks())

describe('getPreferences', () => {
  it('GETs /push/preferences and returns the prefs', async () => {
    apiFetch.mockResolvedValue({ data: { notificationCities: ['c1'], cities: [{ id: 'c1', name: 'Ludhiana' }], notifyBotRides: true, notifyPostedRides: false } })
    const out = await getPreferences()
    expect(apiFetch).toHaveBeenCalledWith('/push/preferences')
    expect(out.cities).toEqual([{ id: 'c1', name: 'Ludhiana' }])
    expect(out.notifyPostedRides).toBe(false)
  })
})

describe('updatePreferences', () => {
  it('PATCHes /push/preferences with the partial body', async () => {
    apiFetch.mockResolvedValue({ data: { notificationCities: [], notifyBotRides: false, notifyPostedRides: true } })
    const out = await updatePreferences({ notifyBotRides: false })
    expect(apiFetch).toHaveBeenCalledWith('/push/preferences', { method: 'PATCH', body: JSON.stringify({ notifyBotRides: false }) })
    expect(out.notifyBotRides).toBe(false)
  })
})

describe('token registration', () => {
  it('registerToken POSTs the device token', async () => {
    apiFetch.mockResolvedValue({ data: { registered: true } })
    await registerToken({ deviceToken: 'tok-1', platform: 'web' })
    expect(apiFetch).toHaveBeenCalledWith('/push/subscriptions', {
      method: 'POST', body: JSON.stringify({ deviceToken: 'tok-1', platform: 'web' }),
    })
  })

  it('unregisterToken DELETEs the device token', async () => {
    apiFetch.mockResolvedValue({ data: { removed: true } })
    await unregisterToken({ deviceToken: 'tok-1' })
    expect(apiFetch).toHaveBeenCalledWith('/push/subscriptions', {
      method: 'DELETE', body: JSON.stringify({ deviceToken: 'tok-1' }),
    })
  })
})
