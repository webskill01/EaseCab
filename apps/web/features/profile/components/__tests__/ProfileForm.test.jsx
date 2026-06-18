import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
vi.mock('../../hooks/useDpUpload', () => ({ useDpUpload: () => ({ upload: vi.fn(), uploading: false, errorKey: null }) }))
import { ProfileForm } from '../ProfileForm'
import { profileToForm } from '../../lib/profileForm'

const FULL = { name: 'Amrit', bio: 'driver', baseCity: 'Ludhiana', vehicleType: 'Sedan', languagesSpoken: ['Punjabi'], profilePicUrl: 'https://r2/dp.png' }

describe('ProfileForm', () => {
  it('submit is enabled when initial is full', () => {
    renderWithIntl(<ProfileForm initial={profileToForm(FULL)} onSubmit={vi.fn()} submitting={false} />)
    expect(screen.getByRole('button', { name: /save profile/i })).toBeEnabled()
  })
  it('allows save WITHOUT a DP when the core fields are filled (#19 soft-gate)', () => {
    const noDp = profileToForm({ ...FULL, profilePicUrl: undefined })
    renderWithIntl(<ProfileForm initial={noDp} onSubmit={vi.fn()} submitting={false} />)
    expect(screen.getByRole('button', { name: /save profile/i })).toBeEnabled()
  })
  it('blocks submit when the core fields are incomplete (onboarding)', () => {
    renderWithIntl(<ProfileForm initial={profileToForm(null)} onSubmit={vi.fn()} submitting={false} />)
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled()
  })
  it('emits the update body on submit', () => {
    const onSubmit = vi.fn()
    renderWithIntl(<ProfileForm initial={profileToForm(FULL)} onSubmit={onSubmit} submitting={false} />)
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Amrit', vehicleType: 'Sedan', languagesSpoken: ['Punjabi'] }))
  })
})
