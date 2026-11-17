import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const { push, path, profile } = vi.hoisted(() => ({ push: vi.fn(), path: { current: '/feed' }, profile: { current: null } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => path.current }))
vi.mock('../../services/profileApi', () => ({ getProfile: vi.fn(async () => profile.current) }))

import { ProfileGate } from '../ProfileGate'

const INCOMPLETE = { id: 'u1', name: 'Gurpreet', baseCity: 'Ludhiana', bio: '', vehicleType: null, profilePicUrl: null, profileComplete: false, verification: { aadhaarVerified: true } }

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); path.current = '/feed' })

describe('ProfileGate', () => {
  it('shows progress for an incomplete profile and routes to the profile form', async () => {
    profile.current = INCOMPLETE
    renderWithIntl(<ProfileGate />)
    expect(await screen.findByText('2 of 5 done')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }))
    expect(push).toHaveBeenCalledWith('/profile/edit')
  })

  it('"Later" hides it for the session', async () => {
    profile.current = INCOMPLETE
    renderWithIntl(<ProfileGate />)
    fireEvent.click(await screen.findByRole('button', { name: /later/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sessionStorage.getItem('ec_profile_nudge')).toBe('1')
  })

  it('stays hidden for a complete profile and on the profile form itself', async () => {
    profile.current = { ...INCOMPLETE, profileComplete: true }
    renderWithIntl(<ProfileGate />)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
