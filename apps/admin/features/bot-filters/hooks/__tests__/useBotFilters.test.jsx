import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBotFilters } from '../useBotFilters'
import * as api from '../../services/botFiltersApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useBotFilters', () => {
  it('loads the selected list and refetches when the list changes', async () => {
    const fetch = vi.spyOn(api, 'fetchBotFilters').mockResolvedValue({ entries: [{ id: 'e1', value: 'khali' }], meta: { total: 1 } })
    const { result } = renderHook(() => useBotFilters('ignore_keyword'), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(fetch).toHaveBeenCalledWith('ignore_keyword', 1, '')
    act(() => result.current.setList('branding'))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('branding', 1, ''))
  })

  it('adds to and removes from the current list', async () => {
    vi.spyOn(api, 'fetchBotFilters').mockResolvedValue({ entries: [], meta: { total: 0 } })
    const add = vi.spyOn(api, 'addBotFilter').mockResolvedValue({ added: 1, duplicates: 0, invalid: [] })
    const remove = vi.spyOn(api, 'removeBotFilter').mockResolvedValue({ id: 'e1' })
    const { result } = renderHook(() => useBotFilters('blocked_phone'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.add.mutateAsync('9876543210') })
    await act(async () => { await result.current.remove.mutateAsync('e1') })
    expect(add).toHaveBeenCalledWith('blocked_phone', '9876543210')
    expect(remove).toHaveBeenCalledWith('e1')
  })
})
