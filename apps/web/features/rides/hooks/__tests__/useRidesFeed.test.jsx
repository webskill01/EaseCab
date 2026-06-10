import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/ridesApi', () => ({
  listRides: vi.fn(),
  listVerifiedRides: vi.fn(),
  RIDES_STREAM_URL: 'http://x/stream',
}))
// Capture the onRide callback so the test can drive live events without EventSource.
let captured = { onRide: null, enabled: null }
vi.mock('../useRideStream', () => ({
  STREAM_STATUS: { IDLE: 'idle', CONNECTING: 'connecting', LIVE: 'live', RECONNECTING: 'reconnecting' },
  useRideStream: (args) => { captured = args; return 'live' },
}))

import { listRides, listVerifiedRides } from '../../services/ridesApi'
import { useRidesFeed, FEED_SUB } from '../useRidesFeed'

const botRow = (id, over = {}) => ({
  id, displayText: `msg ${id}`, status: 'fresh', pickupCityId: 'c1', dropCityId: 'c2',
  pickupCityName: 'Amritsar', dropCityName: 'Delhi', pickupRaw: 'a', dropRaw: 'b',
  vehicleType: 'Sedan', receivedAt: new Date().toISOString(), ...over,
})

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => { vi.clearAllMocks(); captured = { onRide: null, enabled: null } })

describe('useRidesFeed', () => {
  it('loads + normalizes the initial bot page', async () => {
    listRides.mockResolvedValue({ rides: [botRow('r1'), botRow('r2')], nextCursor: null })
    const { result } = renderHook(() => useRidesFeed({ sub: FEED_SUB.RIDES, cityId: null }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rides.map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(result.current.rides[0]).toMatchObject({ kind: 'bot', from: 'Amritsar', to: 'Delhi' })
    expect(captured.enabled).toBe(true) // SSE on for the bot tab
  })

  it('prepends a matching live ride at top, drops a non-matching one under a city lock', async () => {
    listRides.mockResolvedValue({ rides: [botRow('r1')], nextCursor: null })
    const { result } = renderHook(() => useRidesFeed({ sub: FEED_SUB.RIDES, cityId: 'c1' }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // touches c1 → kept
    act(() => captured.onRide(botRow('live1', { pickupCityId: 'c1', dropCityId: 'c9' })))
    // touches neither c1 → dropped
    act(() => captured.onRide(botRow('live2', { pickupCityId: 'c7', dropCityId: 'c9' })))
    expect(result.current.rides.map((r) => r.id)).toEqual(['live1', 'r1'])
  })

  it('queues live rides (not prepended) once scrolled down, surfacing a pending count', async () => {
    listRides.mockResolvedValue({ rides: [botRow('r1')], nextCursor: null })
    const { result } = renderHook(() => useRidesFeed({ sub: FEED_SUB.RIDES, cityId: null }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.onScroll({ target: { scrollTop: 500 } })) // scroll away from top
    act(() => captured.onRide(botRow('live1')))
    expect(result.current.pendingCount).toBe(1)
    expect(result.current.rides.map((r) => r.id)).toEqual(['r1']) // not yet shown
    act(() => result.current.flushPending())
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.rides.map((r) => r.id)).toEqual(['live1', 'r1'])
  })

  it('verified tab is query-only (SSE disabled) and unwraps posts', async () => {
    listVerifiedRides.mockResolvedValue({ posts: [{ id: 'p1', fromCityName: 'Patiala', toCityName: 'Delhi', fromCityId: 'c1', toCityId: 'c2', vehicleType: 'Innova', notes: 'x', createdAt: new Date().toISOString(), status: 'active' }], nextCursor: null })
    const { result } = renderHook(() => useRidesFeed({ sub: FEED_SUB.VERIFIED, cityId: null }), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rides[0]).toMatchObject({ kind: 'verified', id: 'p1', from: 'Patiala' })
    expect(captured.enabled).toBe(false)
  })
})
