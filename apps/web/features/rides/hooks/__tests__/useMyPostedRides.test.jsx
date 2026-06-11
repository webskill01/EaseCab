import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMyPostedRides } from '../useMyPostedRides'

vi.mock('../../services/myRidesApi', () => ({
  listMyPosts: vi.fn(() => Promise.resolve({ posts: [{ id: 'p1', fromCityName: 'Mohali', fromCityRaw: null, toCityName: null, toCityRaw: 'manali', vehicleType: 'Innova', fare: 4200, rideDate: null, status: 'active', isClosed: false, createdAt: '2026-06-11T00:00:00Z' }] })),
  closeMyPost: vi.fn(() => Promise.resolve({ id: 'p1', status: 'done' })),
  deleteMyPost: vi.fn(() => Promise.resolve({ id: 'p1', status: 'deleted' })),
}))
import { closeMyPost } from '../../services/myRidesApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useMyPostedRides', () => {
  beforeEach(() => vi.clearAllMocks())
  it('loads posts and fires markDone', async () => {
    const { result } = renderHook(() => useMyPostedRides(), { wrapper })
    await waitFor(() => expect(result.current.posts.length).toBe(1))
    expect(result.current.posts[0].to).toBe('Manali')
    act(() => result.current.markDone('p1'))
    await waitFor(() => expect(closeMyPost).toHaveBeenCalledWith('p1'))
  })
})
