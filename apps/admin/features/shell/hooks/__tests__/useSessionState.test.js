import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionState } from '../useSessionState'

describe('useSessionState', () => {
  beforeEach(() => sessionStorage.clear())

  it('starts from the initial value, then remembers changes across remounts', () => {
    const first = renderHook(() => useSessionState('t', { q: '' }))
    expect(first.result.current[0]).toEqual({ q: '' })
    act(() => first.result.current[1]({ q: 'ram' }))
    first.unmount()
    const again = renderHook(() => useSessionState('t', { q: '' }))
    expect(again.result.current[0]).toEqual({ q: 'ram' })
  })
})
