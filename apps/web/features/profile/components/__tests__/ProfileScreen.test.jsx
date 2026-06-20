import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('@/features/subscription/hooks/useMembership', () => ({ useMembership: () => ({ data: { isActive: true } }) }))
vi.mock('@/features/notifications/hooks/usePushPreferences', () => ({ usePushPreferences: vi.fn() }))
vi.mock('@/features/shell/components/LogoutButton', () => ({ LogoutButton: () => <div /> }))
import { useProfile } from '../../hooks/useProfile'
import { usePushPreferences } from '@/features/notifications/hooks/usePushPreferences'
import { ProfileScreen } from '../ProfileScreen'

const PROFILE = {
  id: 'u1', phone: '+919876543210', name: 'Amrit', bio: 'driver', baseCity: 'Ludhiana',
  vehicleType: 'Sedan', profilePicUrl: 'p', languagesSpoken: ['Punjabi'], experience: 5, workingCity: 'Mohali',
  profileComplete: true,
  verification: { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted', aadhaarLast4: '1234' },
}

describe('ProfileScreen', () => {
  beforeEach(() => { usePushPreferences.mockReturnValue({ prefs: null }) })

  it('shows the completeness banner when incomplete', () => {
    useProfile.mockReturnValue({ data: { ...PROFILE, profileComplete: false }, isLoading: false, isError: false })
    renderWithIntl(<ProfileScreen />)
    expect(screen.getByText(/complete your profile to unlock posting/i)).toBeInTheDocument()
  })

  it('shows the subscribed-city count on the Notifications row', () => {
    useProfile.mockReturnValue({ data: PROFILE, isLoading: false, isError: false })
    usePushPreferences.mockReturnValue({ prefs: { notificationCities: ['c1', 'c2', 'c3'] } })
    renderWithIntl(<ProfileScreen />)
    expect(screen.getByText('3 cities')).toBeInTheDocument()
  })
  it('renders stats, masked Aadhaar + verification cards when complete', () => {
    useProfile.mockReturnValue({ data: PROFILE, isLoading: false, isError: false })
    renderWithIntl(<ProfileScreen />)
    expect(screen.getByText(/1234/)).toBeInTheDocument()
    expect(screen.getByText('Mohali')).toBeInTheDocument() // working-city stat
    expect(screen.queryByText(/complete your profile to unlock/i)).not.toBeInTheDocument()
  })
  it('navigates to /profile/edit from the header card', () => {
    useProfile.mockReturnValue({ data: PROFILE, isLoading: false, isError: false })
    renderWithIntl(<ProfileScreen />)
    fireEvent.click(screen.getByText('Amrit'))
    expect(push).toHaveBeenCalledWith('/profile/edit')
  })
})
