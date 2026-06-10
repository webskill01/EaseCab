'use client'

import { useTranslations } from 'next-intl'

/**
 * Stub screen for nav destinations not yet built (Post/My Rides/Profile/Messages →
 * Steps 19–22). Keeps the bottom nav fully navigable; replaced by the real screen
 * at its step. @param {{ titleKey: string }} props - a `common` key, e.g. "nav.mine"
 */
export function PlaceholderScreen({ titleKey, children }) {
  const t = useTranslations('common')
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t(titleKey)}</h1>
      <p className="text-[14px] font-medium text-ec-ink60">{t('placeholder.soon')}</p>
      {children}
    </div>
  )
}
