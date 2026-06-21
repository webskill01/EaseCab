import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('../../services/chatApi', () => ({ touchPresence: vi.fn().mockResolvedValue(undefined) }))
import { touchPresence } from '../../services/chatApi'
import { useChatPresence } from '../useChatPresence'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})
afterEach(() => vi.useRealTimers())

describe('useChatPresence', () => {
  it('beats immediately on mount and again each interval', () => {
    renderHook(() => useChatPresence('c1'))
    expect(touchPresence).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(30000)
    expect(touchPresence).toHaveBeenCalledTimes(2)
    expect(touchPresence).toHaveBeenCalledWith('c1')
  })

  it('does not beat while the tab is hidden', () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    renderHook(() => useChatPresence('c1'))
    vi.advanceTimersByTime(60000)
    expect(touchPresence).not.toHaveBeenCalled()
  })

  it('no-ops without a chatId', () => {
    renderHook(() => useChatPresence(null))
    vi.advanceTimersByTime(60000)
    expect(touchPresence).not.toHaveBeenCalled()
  })

  it('stops beating after unmount', () => {
    const { unmount } = renderHook(() => useChatPresence('c1'))
    expect(touchPresence).toHaveBeenCalledTimes(1)
    unmount()
    vi.advanceTimersByTime(60000)
    expect(touchPresence).toHaveBeenCalledTimes(1)
  })
})
