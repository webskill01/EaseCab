import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { VerifyGateSheet, postEligibility } from '../VerifyGateSheet'

describe('VerifyGateSheet', () => {
  it('sends a user with an incomplete profile to edit profile (KYC off)', () => {
    const onGo = vi.fn()
    renderWithIntl(<VerifyGateSheet profile={{ profileComplete: false, verification: { aadhaarVerified: false } }} onClose={vi.fn()} onGo={onGo} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }))
    expect(onGo).toHaveBeenCalledWith('/profile/edit')
  })

  it('sends an Aadhaar-verified user with an incomplete profile to edit profile', () => {
    const onGo = vi.fn()
    renderWithIntl(<VerifyGateSheet profile={{ profileComplete: false, verification: { aadhaarVerified: true } }} onClose={vi.fn()} onGo={onGo} />)
    fireEvent.click(screen.getByRole('button', { name: /^complete profile$/i }))
    expect(onGo).toHaveBeenCalledWith('/profile/edit')
  })

  it('postEligibility mirrors the server gate', () => {
    expect(postEligibility(null).eligible).toBe(false)
    // Phase 19 default: a complete profile is the whole gate, Aadhaar is irrelevant.
    expect(postEligibility({ profileComplete: true, verification: { aadhaarVerified: false } }).eligible).toBe(true)
    expect(postEligibility({ profileComplete: true, verification: { aadhaarVerified: true } }).eligible).toBe(true)
  })
})
