import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/chatApi', () => ({ listChats: vi.fn() }))
import { listChats } from '../../services/chatApi'
import { useChats } from '../useChats'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('useChats', () => {
  it('exposes the chats and the summed unread count', async () => {
    listChats.mockResolvedValue([{ id: 'c1', unreadCount: 2 }, { id: 'c2', unreadCount: 3 }])
    const { result } = renderHook(() => useChats(), { wrapper })
    await waitFor(() => expect(result.current.chats).toHaveLength(2))
    expect(result.current.totalUnread).toBe(5)
  })

  it('defaults to an empty list + zero unread before data arrives', () => {
    listChats.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useChats(), { wrapper })
    expect(result.current.chats).toEqual([])
    expect(result.current.totalUnread).toBe(0)
  })
})
