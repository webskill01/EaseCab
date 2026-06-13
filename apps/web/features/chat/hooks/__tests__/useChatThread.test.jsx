import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/chatApi', () => ({
  mintFirebaseToken: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
}))
vi.mock('../../services/firestoreClient', () => ({ subscribeToChat: vi.fn() }))

import { mintFirebaseToken, sendMessage, markRead } from '../../services/chatApi'
import { subscribeToChat } from '../../services/firestoreClient'
import { useChatThread } from '../useChatThread'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('useChatThread', () => {
  it('mints a token, subscribes, and exposes live messages + meta', async () => {
    mintFirebaseToken.mockResolvedValue('ct:x')
    markRead.mockResolvedValue()
    let cbs
    subscribeToChat.mockImplementation(({ onMeta, onMessages }) => { cbs = { onMeta, onMessages }; return () => {} })

    const { result } = renderHook(() => useChatThread('c1', 'me'), { wrapper })
    await waitFor(() => expect(subscribeToChat).toHaveBeenCalled())
    expect(subscribeToChat).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'c1', token: 'ct:x' }))

    act(() => { cbs.onMeta({ isActive: true, posterId: 'other' }); cbs.onMessages([{ id: 'm1', senderId: 'other', sentAt: 'x' }]) })
    await waitFor(() => expect(result.current.live).toHaveLength(1))
    expect(result.current.isActive).toBe(true)
  })

  it('auto marks read when an inbound message arrives', async () => {
    mintFirebaseToken.mockResolvedValue('ct:x')
    markRead.mockResolvedValue()
    let cbs
    subscribeToChat.mockImplementation(({ onMeta, onMessages }) => { cbs = { onMeta, onMessages }; return () => {} })

    renderHook(() => useChatThread('c1', 'me'), { wrapper })
    await waitFor(() => expect(subscribeToChat).toHaveBeenCalled())
    act(() => { cbs.onMessages([{ id: 'm1', senderId: 'other', sentAt: 'x' }]) })
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('c1'))
  })

  it('optimistically appends on send then calls the API', async () => {
    mintFirebaseToken.mockResolvedValue('ct:x')
    sendMessage.mockResolvedValue({ id: 'm9' })
    subscribeToChat.mockImplementation(() => () => {})

    const { result } = renderHook(() => useChatThread('c1', 'me'), { wrapper })
    await waitFor(() => expect(subscribeToChat).toHaveBeenCalled())
    await act(async () => { await result.current.send('hello') })
    expect(sendMessage).toHaveBeenCalledWith('c1', 'hello')
  })
})
