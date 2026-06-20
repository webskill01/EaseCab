import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
let mockSearch = 'intent=l1'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams(mockSearch) }))
vi.mock('@/features/profile/hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('../CompleteProfileStep', () => ({ CompleteProfileStep: () => <div>complete-step</div> }))
vi.mock('../VerificationTimeline', () => ({ VerificationTimeline: () => <div>timeline</div> }))
vi.mock('../AadhaarDetail', () => ({ AadhaarDetail: () => <div>aadhaar-detail</div> }))
vi.mock('../DlDetail', () => ({ DlDetail: () => <div>dl-detail</div> }))
vi.mock('../VehicleDetail', () => ({ VehicleDetail: () => <div>rc-detail</div> }))
vi.mock('../DlVerify', () => ({ DlVerify: () => <div>dl-page</div> }))
vi.mock('../RcVerify', () => ({ RcVerify: () => <div>rc-page</div> }))
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
  it('intent=driver → renders the verification timeline', () => {
    mockSearch = 'intent=driver'; useProfile.mockReturnValue(VER())
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('timeline')).toBeInTheDocument()
  })
  it('intent=aadhaar-detail → renders the Aadhaar record', () => {
    mockSearch = 'intent=aadhaar-detail'; useProfile.mockReturnValue(VER({ aadhaarVerified: true }))
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('aadhaar-detail')).toBeInTheDocument()
  })
  it('intent=dl-detail → renders the DL record', () => {
    mockSearch = 'intent=dl-detail'; useProfile.mockReturnValue(VER({ dlSubmitted: true }))
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('dl-detail')).toBeInTheDocument()
  })
  it('intent=rc-detail → renders the vehicle/RC record', () => {
    mockSearch = 'intent=rc-detail'; useProfile.mockReturnValue(VER({ rcSubmitted: true }))
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('rc-detail')).toBeInTheDocument()
  })
  it('intent=dl → renders the dedicated DL page', () => {
    mockSearch = 'intent=dl'; useProfile.mockReturnValue(VER())
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('dl-page')).toBeInTheDocument()
  })
  it('intent=rc → renders the dedicated RC page', () => {
    mockSearch = 'intent=rc'; useProfile.mockReturnValue(VER())
    renderWithIntl(<VerifyScreen />)
    expect(screen.getByText('rc-page')).toBeInTheDocument()
  })
})
