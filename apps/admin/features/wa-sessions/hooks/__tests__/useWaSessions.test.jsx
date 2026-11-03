import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWaSessions, usePairing } from '../useWaSessions'
import * as api from '../../services/waSessionsApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useWaSessions', () => {
  it('loads sessions and pauses one', async () => {
    vi.spyOn(api, 'fetchWaSessions').mockResolvedValue({ sessions: [{ id: 's1', status: 'live' }], totals: { groups: 9, max: 20 } })
    const upd = vi.spyOn(api, 'updateWaSession').mockResolvedValue({ id: 's1', enabled: false })
    const { result } = renderHook(() => useWaSessions(), { wrapper })
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    expect(result.current.totals.groups).toBe(9)
    await act(async () => { await result.current.update.mutateAsync({ id: 's1', enabled: false }) })
    expect(upd).toHaveBeenCalledWith('s1', { enabled: false })
  })
})

describe('usePairing', () => {
  it('admin target uses the session id; phone goes to the pair call', async () => {
    vi.spyOn(api, 'fetchPairState').mockResolvedValue({ status: null })
    const start = vi.spyOn(api, 'startPairing').mockResolvedValue({ status: 'starting' })
    const { result } = renderHook(() => usePairing({ id: 's1' }), { wrapper })
    await act(async () => { await result.current.start.mutateAsync('919876543210') })
    expect(start).toHaveBeenCalledWith('s1', '919876543210')
    await waitFor(() => expect(result.current.state.status).toBe('starting'))
  })

  it('public target uses the share token', async () => {
    const pub = vi.spyOn(api, 'fetchPublicPair').mockResolvedValue({ name: 'Ambala', status: 'qr', qrSvg: '<svg/>' })
    const { result } = renderHook(() => usePairing({ token: 'tok' }), { wrapper })
    await waitFor(() => expect(result.current.state?.name).toBe('Ambala'))
    expect(pub).toHaveBeenCalledWith('tok')
  })
})
