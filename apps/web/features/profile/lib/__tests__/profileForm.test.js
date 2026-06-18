import { describe, it, expect } from 'vitest'
import { profileToForm, canSaveProfile, isProfileFormComplete, toUpdateBody, PROFILE_VEHICLES, PROFILE_LANGUAGES } from '../profileForm'

const FULL = {
  name: 'Amrit Singh', bio: 'Sedan driver', baseCity: 'Ludhiana', vehicleType: 'Sedan',
  languagesSpoken: ['Punjabi'], profilePicUrl: 'https://r2/dp.png',
}

describe('profileForm', () => {
  it('exposes the canonical vehicle + language option lists', () => {
    expect(PROFILE_VEHICLES).toContain('Sedan')
    expect(PROFILE_LANGUAGES).toContain('Punjabi')
  })
  it('profileToForm maps API → form, dpPreview from profilePicUrl, dpKey null', () => {
    const f = profileToForm(FULL)
    expect(f).toMatchObject({ name: 'Amrit Singh', bio: 'Sedan driver', baseCity: 'Ludhiana', vehicle: 'Sedan', languages: ['Punjabi'], dpKey: null, dpPreview: 'https://r2/dp.png' })
  })
  it('profileToForm tolerates a null profile (onboarding)', () => {
    expect(profileToForm(null)).toMatchObject({ name: '', languages: [], dpKey: null, dpPreview: null })
  })
  it('canSaveProfile needs the core fields + ≥1 language but NOT a DP (#19 soft-gate)', () => {
    const f = profileToForm(FULL)
    expect(canSaveProfile(f)).toBe(true)
    expect(canSaveProfile({ ...f, dpPreview: null, dpKey: null })).toBe(true) // savable without a DP
    expect(canSaveProfile({ ...f, languages: [] })).toBe(false)
    expect(canSaveProfile({ ...f, bio: '  ' })).toBe(false)
  })
  it('isProfileFormComplete (L1 indicator) still needs a DP on top of the core fields', () => {
    const f = profileToForm(FULL)
    expect(isProfileFormComplete(f)).toBe(true)
    expect(isProfileFormComplete({ ...f, dpPreview: null, dpKey: null })).toBe(false)
    expect(isProfileFormComplete({ ...f, dpPreview: null, dpKey: 'newkey' })).toBe(true)
  })
  it('toUpdateBody emits schema fields; includes dpKey + optional stats only when set', () => {
    const f = profileToForm(FULL)
    expect(toUpdateBody(f)).toEqual({ name: 'Amrit Singh', bio: 'Sedan driver', baseCity: 'Ludhiana', vehicleType: 'Sedan', languagesSpoken: ['Punjabi'] })
    expect(toUpdateBody({ ...f, dpKey: 'k9' }).dpKey).toBe('k9')
    expect(toUpdateBody({ ...f, workingCity: 'Mohali', experience: '7' })).toMatchObject({ workingCity: 'Mohali', experience: 7 })
  })
})
