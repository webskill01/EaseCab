import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVerifications } from '../useVerifications'
import * as api from '../../services/verificationsApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useVerifications', () => {
  it('loads the queue page', async () => {
    vi.spyOn(api, 'fetchVerifications').mockResolvedValue({ verifications: [{ id: 's1' }], meta: { page: 1, total: 1 } })
    const { result } = renderHook(() => useVerifications(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.total).toBe(1)
  })

  it('approve mutation invalidates the queue', async () => {
    vi.spyOn(api, 'fetchVerifications').mockResolvedValue({ verifications: [], meta: { page: 1, total: 0 } })
    const review = vi.spyOn(api, 'reviewSubmission').mockResolvedValue({ id: 's1', status: 'approved' })
    const { result } = renderHook(() => useVerifications(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.review.mutateAsync({ id: 's1', action: 'approve' }) })
    expect(review).toHaveBeenCalledWith('s1', 'approve', undefined)
  })
})
