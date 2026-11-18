import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWaInvites } from '../useWaInvites'
import * as api from '../../services/waInvitesApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useWaInvites', () => {
  it('opens on New, switches tabs, and avoids a link', async () => {
    const fetch = vi.spyOn(api, 'fetchWaInvites').mockResolvedValue({
      links: [{ id: 'l1', name: 'Patiala Taxi', sessions: [] }], counts: { new: 1, joined: 0, avoided: 0, invalid: 0 }, meta: { total: 1, limit: 50 },
    })
    const avoid = vi.spyOn(api, 'setWaInviteStatus').mockResolvedValue({ id: 'l1', status: 'avoided' })
    const { result } = renderHook(() => useWaInvites(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(fetch).toHaveBeenCalledWith({ page: 1, status: 'new', q: '' })
    await act(async () => { await result.current.setLinkStatus.mutateAsync({ id: 'l1', status: 'avoided' }) })
    expect(avoid).toHaveBeenCalledWith('l1', 'avoided')
    act(() => result.current.setStatus('joined'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith({ page: 1, status: 'joined', q: '' }))
  })
})
