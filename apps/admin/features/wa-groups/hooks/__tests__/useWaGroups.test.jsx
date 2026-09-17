import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWaGroups } from '../useWaGroups'
import * as api from '../../services/waGroupsApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useWaGroups', () => {
  it('loads groups with on/off counts and refetches on filter change', async () => {
    const fetch = vi.spyOn(api, 'fetchWaGroups').mockResolvedValue({
      groups: [{ id: 'g1', name: 'PUNJAB TAXI', enabled: true }], counts: { on: 299, off: 1 }, meta: { total: 300, limit: 50 },
    })
    const { result } = renderHook(() => useWaGroups(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.counts).toEqual({ on: 299, off: 1 })
    expect(fetch).toHaveBeenCalledWith({ page: 1, status: 'all', q: '' })
    act(() => result.current.setStatus('off'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, status: 'off', q: '' }))
  })

  it('switches one group and bulk-switches the current search', async () => {
    vi.spyOn(api, 'fetchWaGroups').mockResolvedValue({ groups: [], counts: { on: 0, off: 0 }, meta: { total: 0 } })
    const one = vi.spyOn(api, 'setWaGroupEnabled').mockResolvedValue({ id: 'g1', enabled: false })
    const all = vi.spyOn(api, 'setAllWaGroupsEnabled').mockResolvedValue({ updated: 3 })
    const { result } = renderHook(() => useWaGroups(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.setQ('delhi'))
    await act(async () => { await result.current.toggle.mutateAsync({ id: 'g1', enabled: false }) })
    await act(async () => { await result.current.bulk.mutateAsync(true) })
    expect(one).toHaveBeenCalledWith('g1', false)
    expect(all).toHaveBeenCalledWith(true, 'delhi')
  })
})
