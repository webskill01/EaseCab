import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
let mockSearch = 'intent=l1'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams(mockSearch) }))
vi.mock('@/features/profile/hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('../CompleteProfileStep', () => ({ CompleteProfileStep: () => <div>complete-step</div> }))
vi.mock('../DriverVerify', () => ({ DriverVerify: () => <div>driver-step</div> }))
import { useProfile } from '@/features/profile/hooks/useProfile'
import { VerifyScreen } from '../VerifyScreen'

const VER = (over) => ({ data: { verification: { aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'none', ...over } }, isLoading: false })

describe('VerifyScreen', () => {
  it('intent=l1 + not verified → shows the Aadhaar number step', () => {
    mockSearch = 'intent=l1'; useProfile.mockReturnValue(VER())
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByLabelText(/aadhaar number/i)).toBeInTheDocument()
  })
  it('intent=l1 + already aadhaarVerified → jumps to completion', () => {
    mockSearch = 'intent=l1'; useProfile.mockReturnValue(VER({ aadhaarVerified: true }))
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('complete-step')).toBeInTheDocument()
  })
  it('intent=driver → renders DriverVerify', () => {
    mockSearch = 'intent=driver'; useProfile.mockReturnValue(VER())
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('driver-step')).toBeInTheDocument()
  })
})
