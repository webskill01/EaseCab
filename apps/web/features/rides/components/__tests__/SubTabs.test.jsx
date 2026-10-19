import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { SubTabs } from '../SubTabs'

describe('SubTabs', () => {
  it('marks the active tab and switches on click', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<SubTabs sub="rides" onChange={onChange} />)
    expect(screen.getByRole('tab', { name: 'Live Rides' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: /driver duties/i }))
    expect(onChange).toHaveBeenCalledWith('verified')
  })

  it('pins the duties count badge to the tab corner, capped at 99+', () => {
    renderWithIntl(<SubTabs sub="rides" onChange={vi.fn()} dutiesCount={150} />)
    const badge = screen.getByText('99+')
    expect(badge.className).toMatch(/absolute/)
    expect(screen.getByRole('tab', { name: /driver duties/i })).toContainElement(badge)
  })

  it('no badge when there are no duties', () => {
    renderWithIntl(<SubTabs sub="rides" onChange={vi.fn()} dutiesCount={0} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
