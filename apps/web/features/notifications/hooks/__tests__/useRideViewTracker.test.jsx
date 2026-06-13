import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRideViewTracker } from '../useRideViewTracker'

let lastObserver
beforeEach(() => {
  localStorage.clear()
  global.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; lastObserver = this }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

it('counts distinct rides as they intersect', () => {
  const { result } = renderHook(() => useRideViewTracker({ enabled: true }))
  act(() => { result.current.observe(document.createElement('div'), 'r1') })
  act(() => { lastObserver.cb([{ isIntersecting: true, target: { dataset: { rideId: 'r1' } } }]) })
  act(() => { lastObserver.cb([{ isIntersecting: true, target: { dataset: { rideId: 'r2' } } }]) })
  expect(result.current.viewedCount).toBe(2)
})

it('does nothing when disabled', () => {
  const { result } = renderHook(() => useRideViewTracker({ enabled: false }))
  expect(result.current.viewedCount).toBe(0)
  act(() => { result.current.observe(document.createElement('div'), 'r1') })
  expect(result.current.viewedCount).toBe(0)
})
