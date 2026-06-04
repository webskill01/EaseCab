import { describe, it, expect } from 'vitest'
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_LABELS } from '../config'

describe('i18n config', () => {
  it('lists the four supported locales with the en default', () => {
    expect(LOCALES).toEqual(['en', 'pa', 'hi', 'hinglish'])
    expect(DEFAULT_LOCALE).toBe('en')
    expect(LOCALE_COOKIE).toBe('locale')
  })
  it('has a label for every locale', () => {
    for (const l of LOCALES) expect(LOCALE_LABELS[l]).toBeTruthy()
  })
})
