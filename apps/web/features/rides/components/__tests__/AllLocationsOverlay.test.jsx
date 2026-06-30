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
    renderWithIntl(<AllLocationsOverlay selected={[]} onClose={vi.fn()} onToggle={vi.fn()} onClear={vi.fn()} />)
    // Chandigarh + Mohali are quick-pick chips (uppercased); also appear in the A–Z list.
    expect(await screen.findAllByText(/chandigarh/i)).not.toHaveLength(0)
    expect(screen.getByText('A')).toBeInTheDocument() // Ambala letter tile
  })

  it('clears the lock via "All cities"', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay selected={[{ id: 'c1', name: 'Chandigarh' }]} onClose={vi.fn()} onToggle={vi.fn()} onClear={onClear} />)
    await user.click(await screen.findByRole('button', { name: /all cities/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('toggles a city without closing (multi-select)', async () => {
    const onToggle = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay selected={[]} onClose={onClose} onToggle={onToggle} onClear={vi.fn()} />)
    await screen.findByText('A')
    await user.type(screen.getByLabelText(/search cities/i), 'mohali')
    const btn = await screen.findByRole('button', { name: 'Mohali' })
    await user.click(btn)
    expect(onToggle).toHaveBeenCalledWith({ id: 'm1', name: 'Mohali' })
    expect(onClose).not.toHaveBeenCalled() // stays open for more picks
  })

  it('"my location" resolves via geo and toggles the nearest city', async () => {
    locate.mockResolvedValue({ id: 'c1', canonicalName: 'Chandigarh' })
    const onToggle = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<AllLocationsOverlay selected={[]} onClose={vi.fn()} onToggle={onToggle} onClear={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: /my location/i }))
    await vi.waitFor(() => expect(onToggle).toHaveBeenCalledWith({ id: 'c1', name: 'Chandigarh' }))
  })
})
