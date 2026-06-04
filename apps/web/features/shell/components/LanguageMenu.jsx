'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LOCALES, LOCALE_LABELS } from '@/i18n/config'
import { setLocale } from '@/i18n/actions'

/**
 * Top-bar language switcher. Writes the locale cookie via the setLocale server
 * action, then router.refresh() so the server layout re-reads the cookie and
 * re-renders messages + the script font. (CLAUDE.md §14.)
 */
export function LanguageMenu({ current }) {
  const t = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function choose(locale) {
    setOpen(false)
    await setLocale(locale)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t('shell.language')}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md bg-ec-sky px-2 py-1 text-sm font-bold text-ec-blue"
      >
        {LOCALE_LABELS[current] ?? current}
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-30 mt-1 w-28 rounded-md bg-white p-1 shadow-ec-float">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="menuitem"
                aria-label={LOCALE_LABELS[l]}
                onClick={() => choose(l)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-ec-sky"
              >
                {LOCALE_LABELS[l]}
                {l === current && <span className="text-ec-blue">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
