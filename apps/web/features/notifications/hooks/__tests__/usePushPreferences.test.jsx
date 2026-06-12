import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/pushApi', () => ({
  getPreferences: vi.fn(() => Promise.resolve({ notificationCities: ['c1'], cities: [{ id: 'c1', name: 'Ludhiana' }], notifyBotRides: true, notifyPostedRides: false })),
  updatePreferences: vi.fn(() => Promise.resolve({ notificationCities: ['c1'], notifyBotRides: true, notifyPostedRides: true })),
}))
import { getPreferences, updatePreferences } from '../../services/pushApi'
import { usePushPreferences } from '../usePushPreferences'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('usePushPreferences', () => {
  it('loads prefs with resolved city names', async () => {
    const { result } = renderHook(() => usePushPreferences(), { wrapper })
    await waitFor(() => expect(result.current.prefs).not.toBeNull())
    expect(result.current.prefs.cities).toEqual([{ id: 'c1', name: 'Ludhiana' }])
  })

  it('update PATCHes and refetches the full prefs', async () => {
    const { result } = renderHook(() => usePushPreferences(), { wrapper })
    await waitFor(() => expect(result.current.prefs).not.toBeNull())
    act(() => result.current.update({ notifyPostedRides: true }))
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ notifyPostedRides: true }))
    // invalidation triggers a second getPreferences
    await waitFor(() => expect(getPreferences).toHaveBeenCalledTimes(2))
  })
})
