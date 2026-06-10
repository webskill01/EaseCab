import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../services/ridesApi', () => ({ contactRide: vi.fn(), contactVerifiedRide: vi.fn() }))
import { contactRide } from '../../services/ridesApi'
import { ContactSheet } from '../ContactSheet'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'

function renderSheet(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return renderWithIntl(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

const ride = { id: 'r1', kind: 'bot' }

describe('ContactSheet', () => {
  it('expired member sees the subscribe gate (no reveal call)', async () => {
    const onUpgrade = vi.fn()
    const user = userEvent.setup()
    renderSheet(<ContactSheet ride={ride} membershipState={MEMBERSHIP_STATE.EXPIRED} onClose={vi.fn()} onUpgrade={onUpgrade} />)
    expect(screen.getByText(/subscribe to contact/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^subscribe$/i }))
    expect(onUpgrade).toHaveBeenCalled()
    expect(contactRide).not.toHaveBeenCalled()
  })

  it('active member reveals the phone with Call + WhatsApp deep links', async () => {
    contactRide.mockResolvedValue({ phoneNumber: '+919876543210', contactedAt: 't' })
    const user = userEvent.setup()
    renderSheet(<ContactSheet ride={ride} membershipState={MEMBERSHIP_STATE.TRIAL} onClose={vi.fn()} onUpgrade={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /contact driver/i }))
    await waitFor(() => expect(screen.getByText('+919876543210')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+919876543210')
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/919876543210')
  })

  it('falls back to the gate when the server rejects with SUBSCRIPTION_EXPIRED', async () => {
    contactRide.mockRejectedValue({ code: 'SUBSCRIPTION_EXPIRED' })
    const user = userEvent.setup()
    renderSheet(<ContactSheet ride={ride} membershipState={MEMBERSHIP_STATE.TRIAL} onClose={vi.fn()} onUpgrade={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /contact driver/i }))
    await waitFor(() => expect(screen.getByText(/subscribe to contact/i)).toBeInTheDocument())
  })
})
