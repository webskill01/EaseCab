/**
 * Shared PWA metadata (Step 25). Single source of truth for icon paths + brand
 * colors, consumed by app/manifest.js and app/layout.jsx so the two never drift.
 */
export const THEME_COLOR = '#4D8DF6'
export const BACKGROUND_COLOR = '#FFFFFF'
export const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

/** Full manifest icon array: one "any" icon per size + a dedicated maskable 512. */
export function manifestIcons() {
  const any = ICON_SIZES.map((s) => ({
    src: `/icons/icon-${s}.png`,
    sizes: `${s}x${s}`,
    type: 'image/png',
    purpose: 'any',
  }))
  return [
    ...any,
    { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]
}

/** Subset used by Next metadata.icons (favicon + apple-touch). */
export const metadataIcons = {
  icon: [
    { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  apple: '/icons/apple-touch-icon.png',
}

export const appleWebApp = { capable: true, statusBarStyle: 'default', title: 'EaseCab' }
