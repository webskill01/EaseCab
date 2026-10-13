import { StrictMode } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Overlay } from '../Overlay'

afterEach(() => vi.restoreAllMocks())

describe('Overlay history entry', () => {
  it('survives the StrictMode effect remount (no self-close in dev)', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const onClose = vi.fn()
    render(<StrictMode><Overlay onClose={onClose}>x</Overlay></StrictMode>)
    await act(() => new Promise((r) => setTimeout(r, 10)))
    expect(back).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(typeof window.history.state?.__ecOverlay).toBe('string')
  })

  it('consumes its history entry on a real unmount', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { unmount } = render(<Overlay onClose={vi.fn()}>x</Overlay>)
    unmount()
    await act(() => new Promise((r) => setTimeout(r, 10)))
    expect(back).toHaveBeenCalledTimes(1)
  })
  it('a closing overlay never pops an entry a newer overlay pushed on top', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const first = render(<Overlay onClose={vi.fn()}>a</Overlay>)
    first.unmount()
    render(<Overlay onClose={vi.fn()}>b</Overlay>) // opens before the deferred back() runs
    await act(() => new Promise((r) => setTimeout(r, 10)))
    expect(back).not.toHaveBeenCalled()
  })
})
