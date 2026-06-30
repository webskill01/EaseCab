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
    await user.click(screen.getByRole('tab', { name: /verified rides/i }))
    expect(onChange).toHaveBeenCalledWith('verified')
  })
})
