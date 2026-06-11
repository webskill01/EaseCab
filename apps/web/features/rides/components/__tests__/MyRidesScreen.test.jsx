import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const markDone = vi.fn()
vi.mock('../../hooks/useMyPostedRides', () => ({ useMyPostedRides: () => ({ posts: [{ id: 'p1', from: 'Mohali', to: 'Manali', vehicleType: 'Innova', fare: 4200, status: 'active', isClosed: false }], isLoading: false, isError: false, isEmpty: false, markDone, remove: vi.fn() }) }))
vi.mock('../../hooks/useContactedRides', () => ({ useContactedRides: () => ({ contacts: [{ id: 'k1', kind: 'bot', from: 'Ludhiana', to: 'Delhi', vehicleType: 'Sedan', phone: '+919876500000' }], isLoading: false, isError: false, isEmpty: false }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { MyRidesScreen } from '../MyRidesScreen'

describe('MyRidesScreen', () => {
  it('shows posted by default, confirms mark-done, and switches to contacted', () => {
    renderWithIntl(<MyRidesScreen />)
    expect(screen.getByText('Mohali')).toBeInTheDocument()
    // Open the confirm sheet from the card's action, then confirm with the distinct CTA.
    fireEvent.click(screen.getByRole('button', { name: /^mark done$/i }))
    fireEvent.click(screen.getByRole('button', { name: /yes, mark done/i }))
    expect(markDone).toHaveBeenCalledWith('p1')
    fireEvent.click(screen.getByRole('tab', { name: /contacted/i }))
    expect(screen.getByText('Ludhiana')).toBeInTheDocument()
  })
})
