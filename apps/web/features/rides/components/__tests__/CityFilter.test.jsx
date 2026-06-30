import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

// The overlay owns the search/list; stub it to buttons that toggle/clear so the
// CityFilter trigger test stays focused on open + multi-select wiring.
vi.mock('../AllLocationsOverlay', () => ({
  AllLocationsOverlay: ({ onToggle, onClear, onClose }) => (
    <div role="dialog">
      <button type="button" onClick={() => onToggle({ id: 'c9', name: 'Mohali' })}>toggle-mohali</button>
      <button type="button" onClick={onClear}>clear-all</button>
      <button type="button" onClick={onClose}>close-overlay</button>
    </div>
  ),
}))
import { CityFilter } from '../CityFilter'

describe('CityFilter', () => {
  it('shows the single locked city name on the trigger', () => {
    renderWithIntl(<CityFilter selected={[{ id: 'c1', name: 'Ludhiana' }]} onToggle={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ludhiana/i })).toBeInTheDocument()
  })

  it('shows an "N cities" count when more than one is selected', () => {
    renderWithIntl(
      <CityFilter
        selected={[{ id: 'c1', name: 'Ludhiana' }, { id: 'c2', name: 'Mohali' }]}
        onToggle={vi.fn()}
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByText('2 cities')).toBeInTheDocument()
  })

  it('opens the overlay and forwards a toggled city', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<CityFilter selected={[]} onToggle={onToggle} onClear={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /filter by city/i }))
    await user.click(screen.getByText('toggle-mohali'))
    expect(onToggle).toHaveBeenCalledWith({ id: 'c9', name: 'Mohali' })
  })

  it('hides the clear button when nothing is selected', () => {
    renderWithIntl(<CityFilter selected={[]} onToggle={vi.fn()} onClear={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /clear filter/i })).not.toBeInTheDocument()
  })

  it('shows the clear button when filtered and fires onClear', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<CityFilter selected={[{ id: 'c1', name: 'Ludhiana' }]} onToggle={vi.fn()} onClear={onClear} />)
    await user.click(screen.getByRole('button', { name: /clear filter/i }))
    expect(onClear).toHaveBeenCalled()
  })
})
