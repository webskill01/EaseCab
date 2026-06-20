import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { RideCard } from '../RideCard'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const NOW = Date.parse('2026-06-06T10:00:00.000Z')
const ago = (min) => new Date(NOW - min * 60000).toISOString()

const botRide = (over = {}) => ({
  kind: 'bot', id: 'r1', status: 'fresh', receivedAt: ago(0),
  from: 'Amritsar', to: 'Delhi', vehicleType: 'Sedan', message: 'Need a sedan', cityIds: ['c1', 'c2'], ...over,
})

describe('RideCard', () => {
  it('renders a fresh bot ride: route, vehicle, Fresh badge + contact actions', () => {
    renderWithIntl(<RideCard ride={botRide()} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.getByText('Amritsar')).toBeInTheDocument()
    expect(screen.getByText('Delhi')).toBeInTheDocument()
    expect(screen.getByText('Fresh')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /call/i })).toBeEnabled()
  })

  it('a bot ride past the fresh window reads "Likely booked" and disables contact', () => {
    renderWithIntl(<RideCard ride={botRide({ receivedAt: ago(10) })} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.getByText('Likely booked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeDisabled()
  })

  it('renders "—" for an unknown drop city', () => {
    renderWithIntl(<RideCard ride={botRide({ to: null })} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('verified ride shows the Verified badge', () => {
    renderWithIntl(<RideCard ride={botRide({ kind: 'verified', status: 'verified', fare: 4200 })} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText(/₹4200/)).toBeInTheDocument()
  })

  it('verified ride with a poster shows the poster block and links to their profile', async () => {
    const user = userEvent.setup()
    const ride = botRide({ kind: 'verified', status: 'verified', posterId: 'u9', posterName: 'Gurpreet', posterBaseCity: 'Patiala', verifiedDriver: true })
    renderWithIntl(<RideCard ride={ride} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.getByText('Gurpreet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view profile/i }))
    expect(push).toHaveBeenCalledWith('/u/u9')
  })

  it('verified ride without a posterId renders no poster block', () => {
    renderWithIntl(<RideCard ride={botRide({ kind: 'verified', status: 'verified' })} now={NOW} onContact={vi.fn()} onReport={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /view profile/i })).toBeNull()
  })

  it('fires onContact with the tapped channel', async () => {
    const onContact = vi.fn()
    const user = userEvent.setup()
    const ride = botRide()
    renderWithIntl(<RideCard ride={ride} now={NOW} onContact={onContact} onReport={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /whatsapp/i }))
    expect(onContact).toHaveBeenCalledWith(ride, 'wa')
  })
})
