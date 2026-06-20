import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
vi.mock('../../hooks/usePosterProfile', () => ({ usePosterProfile: vi.fn() }))
import { usePosterProfile } from '../../hooks/usePosterProfile'
import { PosterProfileScreen } from '../PosterProfileScreen'

const POSTER = {
  id: 'u1', name: 'Gurpreet Singh', profilePicUrl: null, baseCity: 'Ludhiana', vehicleType: 'Innova',
  carMake: 'Toyota', carModel: 'Innova', experience: 3, bio: 'Punjab driver of 3 years.',
  languagesSpoken: ['pa', 'hi'], memberSince: '2026-01-01T00:00:00Z', verifiedDriver: true,
  verification: { aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true, verificationStatus: 'approved' },
}

beforeEach(() => vi.clearAllMocks())

describe('PosterProfileScreen', () => {
  it('renders name, verified-driver badge, bio and language chips', () => {
    usePosterProfile.mockReturnValue({ data: POSTER, isLoading: false, isError: false })
    renderWithIntl(<PosterProfileScreen userId="u1" />)
    expect(screen.getByText('Gurpreet Singh')).toBeInTheDocument()
    expect(screen.getByText('Verified driver')).toBeInTheDocument()
    expect(screen.getByText('Punjab driver of 3 years.')).toBeInTheDocument()
    expect(screen.getByText('About Gurpreet')).toBeInTheDocument()
  })

  it('hides the verified-driver badge when not fully verified', () => {
    usePosterProfile.mockReturnValue({
      data: { ...POSTER, verifiedDriver: false, verification: { ...POSTER.verification, dlSubmitted: false } },
      isLoading: false, isError: false,
    })
    renderWithIntl(<PosterProfileScreen userId="u1" />)
    expect(screen.queryByText('Verified driver')).not.toBeInTheDocument()
  })

  it('shows an error message when the load fails', () => {
    usePosterProfile.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWithIntl(<PosterProfileScreen userId="u1" />)
    expect(screen.getByText("Couldn't load this profile.")).toBeInTheDocument()
  })
})
