import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('../../hooks/useUpdateProfile', () => ({ useUpdateProfile: () => ({ save: vi.fn(), saving: false, saved: false, data: null, errorKey: null }) }))
vi.mock('@/features/shell/components/LogoutButton', () => ({ LogoutButton: () => <div /> }))
import { useProfile } from '../../hooks/useProfile'
import { ProfileScreen } from '../ProfileScreen'

const PROFILE = {
  id: 'u1', phone: '+919876543210', name: 'Amrit', bio: 'driver', baseCity: 'Ludhiana',
  vehicleType: 'Sedan', profilePicUrl: 'p', languagesSpoken: ['Punjabi'], profileComplete: true,
  verification: { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted', aadhaarLast4: '1234' },
}

describe('ProfileScreen', () => {
  it('shows the completeness banner when incomplete', () => {
    useProfile.mockReturnValue({ data: { ...PROFILE, profileComplete: false }, isLoading: false, isError: false })
    renderWithIntl(<ProfileScreen />)
    expect(screen.getByText(/complete your profile to unlock posting/i)).toBeInTheDocument()
  })
  it('renders the masked Aadhaar + verification cards when complete', () => {
    useProfile.mockReturnValue({ data: PROFILE, isLoading: false, isError: false })
    renderWithIntl(<ProfileScreen />)
    expect(screen.getByText(/1234/)).toBeInTheDocument()
    expect(screen.queryByText(/complete your profile to unlock/i)).not.toBeInTheDocument()
  })
})
