import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

// The overlay owns the search/list; stub it to a button that picks a fixed city so
// the CityFilter trigger test stays focused on open + onPick wiring.
vi.mock('../AllLocationsOverlay', () => ({
  AllLocationsOverlay: ({ onPick, onClose }) => (
    <div role="dialog">
      <button type="button" onClick={() => { onPick({ id: 'c9', name: 'Mohali' }); onClose() }}>pick-mohali</button>
      <button type="button" onClick={onClose}>close-overlay</button>
    </div>
  ),
}))
import { CityFilter } from '../CityFilter'

describe('CityFilter', () => {
  it('shows the locked city name on the trigger', () => {
    renderWithIntl(<CityFilter locked={{ id: 'c1', name: 'Ludhiana' }} onPick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ludhiana/i })).toBeInTheDocument()
  })

  it('opens the All Locations overlay and forwards the picked city', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<CityFilter locked={null} onPick={onPick} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /filter by city/i }))
    await user.click(screen.getByText('pick-mohali'))
    expect(onPick).toHaveBeenCalledWith({ id: 'c9', name: 'Mohali' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument() // closed after pick
  })
})
