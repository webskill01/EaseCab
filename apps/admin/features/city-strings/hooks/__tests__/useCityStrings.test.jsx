import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCityStrings } from '../useCityStrings'
import * as api from '../../services/cityStringsApi'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.restoreAllMocks())

describe('useCityStrings', () => {
  it('loads the unreviewed queue', async () => {
    const fetch = vi.spyOn(api, 'fetchCityStrings').mockResolvedValue({ cityStrings: [{ id: 'c1', rawText: 'amballa' }], meta: { total: 1 } })
    const { result } = renderHook(() => useCityStrings(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.total).toBe(1)
    expect(fetch).toHaveBeenCalledWith(1)
  })

  it('runs the resolve mutation with the chosen city', async () => {
    vi.spyOn(api, 'fetchCityStrings').mockResolvedValue({ cityStrings: [], meta: { total: 0 } })
    const act_ = vi.spyOn(api, 'actOnCityString').mockResolvedValue({ id: 'c1', action: 'resolve' })
    const { result } = renderHook(() => useCityStrings(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.action.mutateAsync({ id: 'c1', action: 'resolve', cityId: 'city-1' }) })
    expect(act_).toHaveBeenCalledWith('c1', 'resolve', 'city-1')
  })

  it('runs the dismiss mutation', async () => {
    vi.spyOn(api, 'fetchCityStrings').mockResolvedValue({ cityStrings: [], meta: { total: 0 } })
    const act_ = vi.spyOn(api, 'actOnCityString').mockResolvedValue({ id: 'c1', action: 'dismiss' })
    const { result } = renderHook(() => useCityStrings(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => { await result.current.action.mutateAsync({ id: 'c1', action: 'dismiss' }) })
    expect(act_).toHaveBeenCalledWith('c1', 'dismiss', undefined)
  })
})
