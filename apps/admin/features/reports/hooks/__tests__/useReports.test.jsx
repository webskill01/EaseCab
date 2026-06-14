import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReports } from '../useReports'
import * as api from '../../services/reportsApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useReports', () => {
  it('loads the queue', async () => {
    vi.spyOn(api, 'fetchReports').mockResolvedValue({ reports: [{ id: 'r1' }], meta: { total: 1 } })
    const { result } = renderHook(() => useReports(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.total).toBe(1)
  })

  it('review mutation calls the api', async () => {
    vi.spyOn(api, 'fetchReports').mockResolvedValue({ reports: [], meta: { total: 0 } })
    const review = vi.spyOn(api, 'reviewReport').mockResolvedValue({ id: 'r1', action: 'remove', resolved: 1 })
    const { result } = renderHook(() => useReports(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.review.mutateAsync({ id: 'r1', action: 'remove' }) })
    expect(review).toHaveBeenCalledWith('r1', 'remove')
  })
})
