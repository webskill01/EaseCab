import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { ContactedCard } from '../ContactedCard'

describe('ContactedCard', () => {
  it('renders route + call/whatsapp deep links to the revealed phone', () => {
    renderWithIntl(<ContactedCard contact={{ id: 'k1', kind: 'bot', from: 'Ludhiana', to: 'Delhi', vehicleType: 'Sedan', phone: '+919876500000' }} />)
    expect(screen.getByText('Ludhiana')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+919876500000')
  })

  it('shows an inert Chat stub for a verified contact', () => {
    renderWithIntl(<ContactedCard contact={{ id: 'k2', kind: 'verified', from: 'A', to: 'B', vehicleType: null, phone: '+910000000000' }} />)
    expect(screen.getByRole('button', { name: /chat/i })).toBeDisabled()
  })
})
