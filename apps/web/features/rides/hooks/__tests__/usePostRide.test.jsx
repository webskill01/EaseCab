import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/postApi', () => ({ createPost: vi.fn() }))
import { createPost } from '../../services/postApi'
import { usePostRide } from '../usePostRide'

const FORM = {
  from: { id: 'a', name: 'A' }, to: { id: 'b', name: 'B' },
  vehicle: 'Sedan', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '', notes: '',
}

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('usePostRide', () => {
  it('sets posted on success', async () => {
    createPost.mockResolvedValue({ id: 'p1' })
    const { result } = renderHook(() => usePostRide(), { wrapper })
    act(() => result.current.submit(FORM))
    await waitFor(() => expect(result.current.posted).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it('flips gated on VERIFICATION_REQUIRED, no inline error', async () => {
    createPost.mockRejectedValue({ code: 'VERIFICATION_REQUIRED' })
    const { result } = renderHook(() => usePostRide(), { wrapper })
    act(() => result.current.submit(FORM))
    await waitFor(() => expect(result.current.gated).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it('surfaces a non-gate error inline', async () => {
    createPost.mockRejectedValue({ code: 'NETWORK_ERROR' })
    const { result } = renderHook(() => usePostRide(), { wrapper })
    act(() => result.current.submit(FORM))
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.gated).toBe(false)
  })
})
