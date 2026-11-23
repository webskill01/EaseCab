import { describe, it, expect, vi, beforeAll } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { FuelSheet, SNAPS } from '../FuelSheet'

beforeAll(() => {
  // jsdom has no layout: report an 800px-tall screen so peek / half / full differ.
  globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb } observe() { this.cb([{ contentRect: { height: 800 } }]) } disconnect() {} }
})

const swipe = (el, y0, y1) => {
  fireEvent.touchStart(el, { touches: [{ clientY: y0 }] })
  fireEvent.touchMove(el, { touches: [{ clientY: (y0 + y1) / 2 }] })
  fireEvent.touchMove(el, { touches: [{ clientY: y1 }] })
  fireEvent.touchEnd(el, { touches: [] })
}

function setup(snap) {
  const onSnap = vi.fn()
  renderWithIntl(<FuelSheet snap={snap} onSnap={onSnap}><p>list</p></FuelSheet>)
  return { onSnap, body: screen.getByText('list').parentElement }
}

describe('FuelSheet list ↔ sheet coupling', () => {
  it('swiping the list up while folded opens the sheet fully instead of scrolling', () => {
    const { onSnap, body } = setup(SNAPS.PEEK)
    expect(body.className).toContain('overflow-hidden')
    swipe(body, 600, 560)
    expect(onSnap).toHaveBeenCalledWith(SNAPS.FULL)
  })

  it('at full: pulling down from the top folds it; a scrolled list just scrolls', () => {
    const { onSnap, body } = setup(SNAPS.FULL)
    expect(body.className).toContain('overflow-y-auto')
    body.scrollTop = 120
    swipe(body, 300, 500)
    expect(onSnap).not.toHaveBeenCalled()
    body.scrollTop = 0
    swipe(body, 300, 700)
    expect(onSnap).toHaveBeenCalledWith(expect.not.stringMatching(SNAPS.FULL))
  })

  it('a tap on a row is not a drag', () => {
    const { onSnap, body } = setup(SNAPS.PEEK)
    swipe(body, 600, 598)
    expect(onSnap).not.toHaveBeenCalled()
  })
})
