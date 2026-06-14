import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers } from '../useUsers'
import * as api from '../../services/usersApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useUsers', () => {
  it('loads the directory with the default active status', async () => {
    const fetch = vi.spyOn(api, 'fetchUsers').mockResolvedValue({ users: [{ id: 'u1', phoneMasked: '••••3210' }], meta: { total: 1 } })
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.total).toBe(1)
    expect(fetch).toHaveBeenCalledWith(1, 'active', '')
  })

  it('re-queries when the search term changes', async () => {
    const fetch = vi.spyOn(api, 'fetchUsers').mockResolvedValue({ users: [], meta: { total: 0 } })
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => result.current.setQ('98765'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(1, 'active', '98765'))
  })

  it('runs the soft-delete mutation', async () => {
    vi.spyOn(api, 'fetchUsers').mockResolvedValue({ users: [], meta: { total: 0 } })
    const update = vi.spyOn(api, 'updateUser').mockResolvedValue({ id: 'u1', isDeleted: true })
    const { result } = renderHook(() => useUsers(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.action.mutateAsync({ userId: 'u1', action: 'delete' }) })
    expect(update).toHaveBeenCalledWith('u1', 'delete')
  })
})
