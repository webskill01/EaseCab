import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../services/citiesApi', () => ({ allCities: vi.fn() }))
const locate = vi.fn()
vi.mock('@/features/notifications/hooks/useNearestCity', () => ({ useNearestCity: () => ({ locate, isLocating: false }) }))
import { allCities } from '../../services/citiesApi'
import { AllLocationsOverlay } from '../AllLocationsOverlay'

const ROWS = [
  { id: 'c1', canonicalName: 'Chandigarh', namePa: null, nameHi: null },
  { id: 'm1', canonicalName: 'Mohali', namePa: null, nameHi: null },
  { id: 'a1', canonicalName: 'Ambala', namePa: null, nameHi: null },
]

beforeEach(() => { vi.clearAllMocks(); allCities.mockResolvedValue(ROWS) })

describe('AllLocationsOverlay', () => {
  it('renders matched quick-pick chips and the A–Z list', async () => {
    renderWithIntl(<AllLocationsOverlay locked={null} onClose={vi.fn()} onPick={vi.fn()} />)
    // Chandigarh + Mohali are quick-pick chips (uppercased); also appear in the A–Z list.
    expect(await screen.findAllByText(/chandigarh/i)).not.toHaveLength(0)
    expect(screen.getByText('A')).toBeInTheDocument() // Ambala letter tile
  })

  it('clears the lock via "All cities"', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay locked={{ id: 'c1', name: 'Chandigarh' }} onClose={onClose} onPick={onPick} />)
    await user.click(await screen.findByRole('button', { name: /all cities/i }))
    expect(onPick).toHaveBeenCalledWith(null)
    expect(onClose).toHaveBeenCalled()
  })

  it('filters the list by query and picks a city', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay locked={null} onClose={vi.fn()} onPick={onPick} />)
    await screen.findByText('A')
    await user.type(screen.getByLabelText(/search cities/i), 'mohali')
    const btn = await screen.findByRole('button', { name: 'Mohali' })
    await user.click(btn)
    expect(onPick).toHaveBeenCalledWith({ id: 'm1', name: 'Mohali' })
  })

  it('"my location" resolves via geo and picks the nearest city', async () => {
    locate.mockResolvedValue({ id: 'c1', canonicalName: 'Chandigarh' })
    const onPick = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay locked={null} onClose={vi.fn()} onPick={onPick} />)
    await user.click(await screen.findByRole('button', { name: /my location/i }))
    await vi.waitFor(() => expect(onPick).toHaveBeenCalledWith({ id: 'c1', name: 'Chandigarh' }))
  })
})
