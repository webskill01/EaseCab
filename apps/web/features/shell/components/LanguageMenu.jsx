'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, ChevR, Check } from '@/components/ui/icons'
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES } from '@/i18n/config'
import { setLocale } from '@/i18n/actions'

/**
 * Top-bar language switcher. Writes the locale cookie via the setLocale server
 * action, which revalidatePath('/', 'layout')s so the server layout re-reads the
 * cookie and re-renders messages + the script font. No client router.refresh():
 * a second refresh races the action's revalidate and the switch lags a step behind
 * on repeat changes. (CLAUDE.md §14.)
 */
export function LanguageMenu({ current }) {
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)

  async function choose(locale) {
    setOpen(false)
    await setLocale(locale)
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
        <>
          {/* Tapping anywhere off the menu collapses it (mirrors the in-app dropdowns). */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-xl bg-white p-1 shadow-ec-float">
          {LOCALES.map((l) => {
            const active = l === current
            return (
              <li key={l}>
                <button
                  type="button"
                  role="menuitem"
                  aria-label={LOCALE_NAMES[l]}
                  onClick={() => choose(l)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${active ? 'bg-ec-sky' : 'hover:bg-ec-sky/60'}`}
                >
                  <span className={`inline-flex w-7 shrink-0 justify-center text-[12px] font-extrabold ${active ? 'text-ec-blue' : 'text-ec-ink40'}`}>{LOCALE_LABELS[l]}</span>
                  <span className={`flex-1 text-[14px] ${active ? 'font-extrabold text-ec-blue' : 'font-semibold text-ec-ink'}`}>{LOCALE_NAMES[l]}</span>
                  {active && <Check size={16} className="shrink-0 text-ec-blue" />}
                </button>
              </li>
            )
          })}
          </ul>
        </>
      )}
    </div>
  )
}
