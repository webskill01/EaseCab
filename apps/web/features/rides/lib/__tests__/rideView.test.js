import { describe, it, expect } from 'vitest'
import {
  ageMinFrom, statusOf, relParts, vehIconKey, cityLabel,
  RIDE_KIND, RIDE_DISPLAY_STATUS, FRESH_WINDOW_MIN,
} from '../rideView'

describe('ageMinFrom', () => {
  it('floors elapsed whole minutes, never negative', () => {
    const now = Date.parse('2026-06-06T10:00:00.000Z')
    expect(ageMinFrom('2026-06-06T09:48:30.000Z', now)).toBe(11)
    expect(ageMinFrom(new Date('2026-06-06T10:00:00.000Z'), now)).toBe(0)
    // a clock-skew future timestamp clamps to 0, not a negative age
    expect(ageMinFrom('2026-06-06T10:05:00.000Z', now)).toBe(0)
  })
  it('returns 0 for an unparseable timestamp', () => {
    expect(ageMinFrom('not-a-date', Date.now())).toBe(0)
  })
})

describe('statusOf', () => {
  it('verified rides always read as verified', () => {
    expect(statusOf({ kind: RIDE_KIND.VERIFIED, status: 'booked', ageMin: 999 })).toBe(RIDE_DISPLAY_STATUS.VERIFIED)
  })
  it('bot ride is fresh only while status=fresh AND within the fresh window', () => {
    expect(statusOf({ kind: RIDE_KIND.BOT, status: 'fresh', ageMin: FRESH_WINDOW_MIN })).toBe(RIDE_DISPLAY_STATUS.FRESH)
    expect(statusOf({ kind: RIDE_KIND.BOT, status: 'fresh', ageMin: FRESH_WINDOW_MIN + 1 })).toBe(RIDE_DISPLAY_STATUS.BOOKED)
    // server already aged it → booked regardless of client clock
    expect(statusOf({ kind: RIDE_KIND.BOT, status: 'booked', ageMin: 0 })).toBe(RIDE_DISPLAY_STATUS.BOOKED)
  })
})

describe('relParts', () => {
  it('maps an age to an i18n token + count (no literal strings)', () => {
    expect(relParts(0)).toEqual({ key: 'justNow' })
    expect(relParts(-3)).toEqual({ key: 'justNow' })
    expect(relParts(1)).toEqual({ key: 'minAgo', count: 1 })
    expect(relParts(59)).toEqual({ key: 'minAgo', count: 59 })
    expect(relParts(60)).toEqual({ key: 'hourAgo', count: 1 })
    expect(relParts(185)).toEqual({ key: 'hourAgo', count: 3 })
  })
})

describe('vehIconKey', () => {
  it('maps every vehicle-type enum label to a glyph key, default car', () => {
    expect(vehIconKey('Sedan')).toBe('sedan')
    expect(vehIconKey('Auto')).toBe('sedan')
    expect(vehIconKey('Innova')).toBe('suv')
    expect(vehIconKey('SUV')).toBe('suv')
    expect(vehIconKey('Bolero')).toBe('suv')
    expect(vehIconKey('Tempo Traveller')).toBe('tt')
    expect(vehIconKey('Urbania')).toBe('tt')
    expect(vehIconKey('Bus')).toBe('bus')
    expect(vehIconKey(null)).toBe('car')
    expect(vehIconKey('Spaceship')).toBe('car')
  })
})

describe('cityLabel', () => {
  it('prefers the resolved canonical name', () => {
    expect(cityLabel('Ludhiana', 'ludhiana airport')).toBe('Ludhiana')
  })
  it('title-cases the raw fragment when no resolved name', () => {
    expect(cityLabel(null, 'ludhiana airport')).toBe('Ludhiana Airport')
    expect(cityLabel(undefined, 'delhi')).toBe('Delhi')
  })
  it('returns null when neither is present (caller renders the — dash)', () => {
    expect(cityLabel(null, null)).toBeNull()
    expect(cityLabel(null, '   ')).toBeNull()
  })
})
