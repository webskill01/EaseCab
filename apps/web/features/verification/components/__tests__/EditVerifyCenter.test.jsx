import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/profile/hooks/useProfile', () => ({ useProfile: vi.fn() }))
import { useProfile } from '@/features/profile/hooks/useProfile'
import { EditVerifyCenter } from '../EditVerifyCenter'

const profile = (over = {}) => ({
  data: {
    name: 'Amrit', baseCity: 'Ludhiana', workingCity: 'Ludhiana', profileComplete: false,
    languagesSpoken: ['Punjabi'],
    verification: { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false },
    ...over,
  },
  isLoading: false,
  isError: false,
})

describe('EditVerifyCenter', () => {
  it('shows the completion %, both section labels, and all six option rows', () => {
    useProfile.mockReturnValue(profile())
    renderWithIntl(<EditVerifyCenter />)
    expect(screen.getByText('Identity & documents')).toBeInTheDocument()
    expect(screen.getByText('Profile details')).toBeInTheDocument()
    expect(screen.getByText('Aadhaar')).toBeInTheDocument()
    expect(screen.getByText('Working city')).toBeInTheDocument()
    // aadhaar + languages + workingCity done of 6 rows → 50%.
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('reaches 100% when every credential + profile field is done', () => {
    useProfile.mockReturnValue(profile({
      profileComplete: true,
      verification: { aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true },
    }))
    renderWithIntl(<EditVerifyCenter />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows a rejected document with its reason and drops it from the %', () => {
    useProfile.mockReturnValue(profile({
      profileComplete: true,
      verification: {
        aadhaarVerified: true,
        dl: { status: 'rejected', rejectionReason: 'Blurry photo' },
        rc: { status: 'approved', rejectionReason: null },
      },
    }))
    renderWithIntl(<EditVerifyCenter />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText(/Blurry photo/)).toBeInTheDocument()
    // aadhaar + rc + profile + languages + workingCity = 5/6; the rejected DL drops out.
    expect(screen.getByText('83%')).toBeInTheDocument()
  })
})
