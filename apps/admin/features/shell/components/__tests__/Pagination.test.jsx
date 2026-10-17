import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination, pageWindow } from '../Pagination'

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4])
  })
  it('collapses gaps around the current page', () => {
    expect(pageWindow(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10])
    expect(pageWindow(1, 10)).toEqual([1, 2, '…', 10])
  })
})

describe('Pagination', () => {
  it('hides when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} total={20} limit={20} onChange={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
  it('shows the range and pages forward', () => {
    window.scrollTo = vi.fn()
    const onChange = vi.fn()
    render(<Pagination page={2} total={45} limit={20} onChange={onChange} />)
    expect(screen.getByText('21–40')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(onChange).toHaveBeenCalledWith(3)
  })
})
