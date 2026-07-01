import { describe, it, expect } from 'vitest'
import { manifestIcons, metadataIcons, appleWebApp, THEME_COLOR, ICON_SIZES } from '@/lib/pwaMeta'

describe('pwaMeta', () => {
  it('builds an icon for every required size plus one maskable entry', () => {
    const icons = manifestIcons()
    expect(icons).toHaveLength(ICON_SIZES.length + 1)
    expect(icons.filter((i) => i.purpose === 'maskable')).toHaveLength(1)
    expect(icons.every((i) => i.type === 'image/png' && i.src.startsWith('/icons/'))).toBe(true)
  })

  it('exposes apple-touch + theme metadata', () => {
    expect(metadataIcons.apple).toBe('/icons/apple-touch-icon.png')
    expect(appleWebApp).toMatchObject({ capable: true, title: 'EaseCab' })
    expect(THEME_COLOR).toBe('#12233F')
  })
})
