import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { listChats, listMessages, sendMessage, sendImageMessage, blockUser, markRead, touchPresence, openChat, mintFirebaseToken } from '../chatApi'

beforeEach(() => vi.clearAllMocks())

describe('listChats', () => {
  it('GETs /chats and returns the chats array', async () => {
    apiFetch.mockResolvedValue({ data: { chats: [{ id: 'c1' }] } })
    const out = await listChats()
    expect(apiFetch).toHaveBeenCalledWith('/chats')
    expect(out).toHaveLength(1)
  })
})

describe('listMessages', () => {
  it('GETs the first page without a cursor and defaults nextCursor to null', async () => {
    apiFetch.mockResolvedValue({ data: { messages: [{ id: 'm1' }] }, meta: {} })
    const out = await listMessages('c1')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/messages')
    expect(out.messages).toHaveLength(1)
    expect(out.nextCursor).toBeNull()
  })

  it('appends an encoded cursor', async () => {
    apiFetch.mockResolvedValue({ data: { messages: [] }, meta: { nextCursor: 'c2' } })
    const out = await listMessages('c1', 'a b')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/messages?cursor=a%20b')
    expect(out.nextCursor).toBe('c2')
  })
})

describe('sendMessage', () => {
  it('POSTs the text to the chat', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'm1', messageText: 'hi' } })
    const out = await sendMessage('c1', 'hi')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/messages', { method: 'POST', body: JSON.stringify({ messageText: 'hi' }) })
    expect(out.messageText).toBe('hi')
  })
})

describe('sendImageMessage', () => {
  it('POSTs an image message with the attachment key', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'm1', messageType: 'image' } })
    await sendImageMessage('c1', 'chat/u1/a.jpg')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/messages', { method: 'POST', body: JSON.stringify({ messageType: 'image', attachmentKey: 'chat/u1/a.jpg' }) })
  })
})

describe('blockUser', () => {
  it('POSTs /blocks with the blockedId', async () => {
    apiFetch.mockResolvedValue({ data: {} })
    await blockUser('u2')
    expect(apiFetch).toHaveBeenCalledWith('/blocks', { method: 'POST', body: JSON.stringify({ blockedId: 'u2' }) })
  })
})

describe('markRead', () => {
  it('POSTs /chats/:id/read', async () => {
    apiFetch.mockResolvedValue({ data: { readAt: 't' } })
    await markRead('c1')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/read', { method: 'POST' })
  })
})

describe('touchPresence', () => {
  it('POSTs /chats/:id/presence', async () => {
    apiFetch.mockResolvedValue({ data: { activeAt: 't' } })
    await touchPresence('c1')
    expect(apiFetch).toHaveBeenCalledWith('/chats/c1/presence', { method: 'POST' })
  })
})

describe('openChat', () => {
  it('POSTs /chats with the postedRideId and returns the chat', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'c1', postedRideId: 'p1' } })
    const out = await openChat('p1')
    expect(apiFetch).toHaveBeenCalledWith('/chats', { method: 'POST', body: JSON.stringify({ postedRideId: 'p1' }) })
    expect(out.id).toBe('c1')
  })
})

describe('mintFirebaseToken', () => {
  it('POSTs /auth/firebase-token and returns the token', async () => {
    apiFetch.mockResolvedValue({ data: { token: 'ct:x' } })
    expect(await mintFirebaseToken()).toBe('ct:x')
    expect(apiFetch).toHaveBeenCalledWith('/auth/firebase-token', { method: 'POST' })
  })
})
