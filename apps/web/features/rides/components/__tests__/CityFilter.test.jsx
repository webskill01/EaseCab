import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../services/citiesApi', () => ({ searchCities: vi.fn() }))
import { searchCities } from '../../services/citiesApi'
import { CityFilter } from '../CityFilter'

beforeEach(() => vi.clearAllMocks())

describe('CityFilter', () => {
  it('opens the dropdown and clears the lock via "All cities"', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<CityFilter locked={{ id: 'c1', name: 'Ludhiana' }} onPick={onPick} />)
    await user.click(screen.getByRole('button', { name: /ludhiana/i }))
    await user.click(screen.getByRole('button', { name: /all cities/i }))
    expect(onPick).toHaveBeenCalledWith(null)
  })

  it('searches the typeahead and locks the picked city', async () => {
    searchCities.mockResolvedValue([{ id: 'c9', canonicalName: 'Mohali' }])
    const onPick = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<CityFilter locked={null} onPick={onPick} />)
    await user.click(screen.getByRole('button', { name: /filter by city/i }))
    await user.type(screen.getByLabelText(/search cities/i), 'moh')
    await waitFor(() => expect(searchCities).toHaveBeenCalled())
    await user.click(await screen.findByRole('button', { name: 'Mohali' }))
    expect(onPick).toHaveBeenCalledWith({ id: 'c9', name: 'Mohali' })
  })
})
