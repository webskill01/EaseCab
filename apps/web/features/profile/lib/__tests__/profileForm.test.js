import { describe, it, expect } from 'vitest'
import { profileToForm, isProfileFormComplete, toUpdateBody, PROFILE_VEHICLES, PROFILE_LANGUAGES } from '../profileForm'

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
  it('isProfileFormComplete needs all strings + ≥1 language + a DP (preview or key)', () => {
    const f = profileToForm(FULL)
    expect(isProfileFormComplete(f)).toBe(true)
    expect(isProfileFormComplete({ ...f, dpPreview: null, dpKey: null })).toBe(false)
    expect(isProfileFormComplete({ ...f, dpPreview: null, dpKey: 'newkey' })).toBe(true)
    expect(isProfileFormComplete({ ...f, languages: [] })).toBe(false)
    expect(isProfileFormComplete({ ...f, bio: '  ' })).toBe(false)
  })
  it('toUpdateBody emits schema fields; includes dpKey only when set', () => {
    const f = profileToForm(FULL)
    expect(toUpdateBody(f)).toEqual({ name: 'Amrit Singh', bio: 'Sedan driver', baseCity: 'Ludhiana', vehicleType: 'Sedan', languagesSpoken: ['Punjabi'] })
    expect(toUpdateBody({ ...f, dpKey: 'k9' }).dpKey).toBe('k9')
  })
})
