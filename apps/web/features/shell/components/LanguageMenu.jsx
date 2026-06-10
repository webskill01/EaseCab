'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Globe, ChevR } from '@/components/ui/icons'
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
        className="flex h-[38px] shrink-0 items-center gap-1 rounded-[10px] bg-ec-sky px-2 text-[13px] font-extrabold text-ec-blue"
      >
        <Globe size={16} />
        {LOCALE_LABELS[current] ?? current}
        <span className={`inline-flex transition-transform ${open ? 'rotate-180' : ''} text-ec-blue`}><ChevR size={13} /></span>
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
