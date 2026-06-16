import { describe, it, expect } from 'vitest'
import manifest from '../manifest'

describe('app manifest', () => {
  it('declares an installable standalone PWA', () => {
    const m = manifest()
    expect(m.name).toContain('EaseCab')
    expect(m.short_name).toBe('EaseCab')
    expect(m.start_url).toBe('/feed')
    expect(m.display).toBe('standalone')
    expect(m.background_color).toBe('#FFFFFF')
    expect(m.theme_color).toBe('#4D8DF6')
    expect(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true)
  })
})
