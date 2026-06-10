import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRideStream, STREAM_STATUS } from '../useRideStream'

/** Minimal EventSource double — records instances + lets tests drive lifecycle. */
class FakeES {
  constructor(url, opts) {
    this.url = url
    this.opts = opts
    this.listeners = {}
    this.closed = false
    FakeES.instances.push(this)
  }
  addEventListener(type, fn) { this.listeners[type] = fn }
  close() { this.closed = true }
  emitOpen() { this.onopen?.() }
  emitError() { this.onerror?.() }
  emitRide(obj) { this.listeners.ride?.({ data: JSON.stringify(obj) }) }
}
FakeES.instances = []

beforeEach(() => { FakeES.instances = []; globalThis.EventSource = FakeES; vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); delete globalThis.EventSource })

describe('useRideStream', () => {
  it('opens with credentials and reports live on open', () => {
    const onRide = vi.fn()
    const { result } = renderHook(() => useRideStream({ url: 'http://x/stream', onRide }))
    expect(result.current).toBe(STREAM_STATUS.CONNECTING)
    expect(FakeES.instances).toHaveLength(1)
    expect(FakeES.instances[0].opts).toEqual({ withCredentials: true })
    act(() => FakeES.instances[0].emitOpen())
    expect(result.current).toBe(STREAM_STATUS.LIVE)
  })

  it('parses ride events and forwards them to onRide', () => {
    const onRide = vi.fn()
    renderHook(() => useRideStream({ url: 'http://x/stream', onRide }))
    act(() => FakeES.instances[0].emitRide({ id: 'r1' }))
    expect(onRide).toHaveBeenCalledWith({ id: 'r1' })
  })

  it('reconnects with exponential backoff after an error', () => {
    renderHook(() => useRideStream({ url: 'http://x/stream', onRide: vi.fn() }))
    const { result } = renderHook(() => useRideStream({ url: 'http://x/stream', onRide: vi.fn() }))
    act(() => FakeES.instances.at(-1).emitError())
    expect(result.current).toBe(STREAM_STATUS.RECONNECTING)
    const before = FakeES.instances.length
    act(() => vi.advanceTimersByTime(1000)) // first backoff = 1s
    expect(FakeES.instances.length).toBe(before + 1)
  })

  it('does not open when disabled, and closes on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => useRideStream({ url: 'http://x/stream', enabled, onRide: vi.fn() }),
      { initialProps: { enabled: false } },
    )
    expect(result.current).toBe(STREAM_STATUS.IDLE)
    expect(FakeES.instances).toHaveLength(0)
    rerender({ enabled: true })
    expect(FakeES.instances).toHaveLength(1)
    unmount()
    expect(FakeES.instances[0].closed).toBe(true)
  })
})
