import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
import { VerificationTimeline } from '../VerificationTimeline'

const profile = {
  name: 'Raj',
  profilePicUrl: 'https://img/dp.jpg',
  verification: { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: true },
}

beforeEach(() => vi.clearAllMocks())

describe('VerificationTimeline', () => {
  it('counts completed steps and reflects posting-unlock state', () => {
    renderWithIntl(<VerificationTimeline profile={profile} />)
    expect(screen.getByText('3 of 4 steps completed')).toBeInTheDocument()
    expect(screen.getByText(/Posting unlocked/i)).toBeInTheDocument()
  })

  it('routes the pending DL step to its verify page', () => {
    renderWithIntl(<VerificationTimeline profile={profile} />)
    fireEvent.click(screen.getByText('Complete now'))
    expect(push).toHaveBeenCalledWith('/verify?intent=dl')
  })

  it('opens the verified Aadhaar detail record', () => {
    renderWithIntl(<VerificationTimeline profile={profile} />)
    // Aadhaar is the first verified node; its "view" button precedes RC's.
    fireEvent.click(screen.getAllByText('View verified details')[0])
    expect(push).toHaveBeenCalledWith('/verify?intent=aadhaar-detail')
  })

  it('opens the verified vehicle/RC detail record', () => {
    renderWithIntl(<VerificationTimeline profile={profile} />)
    // RC is the second verified node (after Aadhaar).
    fireEvent.click(screen.getAllByText('View verified details')[1])
    expect(push).toHaveBeenCalledWith('/verify?intent=rc-detail')
  })
})
