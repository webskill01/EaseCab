'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Pin, BellEdit, User, Battery, Lock, Check, Shield, ChevR } from '@/components/ui/icons'

const ITEMS = [
  ['location', Pin],
  ['notifications', BellEdit],
  ['contacts', User],
  ['background', Battery],
]

/**
 * Onboarding step 3 — app permissions (docs/design/SCREENS.md §1/§10, prototype
 * login.jsx PermissionsStep). UI-only for now: toggling marks intent and "Allow all"
 * selects everything; the real OS permission prompts (notifications/location) are wired
 * in the dedicated push flow (Step 23). Both "Allow all → Continue" and "Not now" advance.
 * @param {{ onContinue: () => void }} props
 */
export function PermissionsStep({ onContinue }) {
  const t = useTranslations('auth')
  const [granted, setGranted] = useState({})
  const allOn = ITEMS.every(([k]) => granted[k])
  const grantAll = () => setGranted({ location: true, notifications: true, contacts: true, background: true })

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="px-[22px] pt-5">
        <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[15px] bg-ec-sky text-ec-blue">
          <Lock size={26} />
        </div>
        <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('perms.title')}</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ec-ink60">{t('perms.subtitle')}</p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-[22px] pb-2 pt-[18px]">
        {ITEMS.map(([key, Icon]) => {
          const on = granted[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => setGranted((g) => ({ ...g, [key]: !g[key] }))}
              className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left ${
                on ? 'border-ec-success/40 bg-ec-successBg/50' : 'border-ec-line bg-white'
              }`}
            >
              <div
                className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${
                  on ? 'bg-ec-success text-white' : 'bg-ec-sky text-ec-blue'
                }`}
              >
                {on ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-extrabold text-ec-ink">{t(`perms.items.${key}.title`)}</p>
                <p className="mt-0.5 text-[12px] font-medium leading-snug text-ec-ink60">
                  {t(`perms.items.${key}.desc`)}
                </p>
              </div>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-white ${
                  on ? 'border-ec-success bg-ec-success' : 'border-ec-line bg-white'
                }`}
              >
                {on && <Check size={13} />}
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t border-ec-line p-[22px]">
        {allOn ? (
          <Button type="button" size="lg" onClick={onContinue} className="w-full">
            {t('perms.continue')}
            <ChevR size={18} />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={grantAll} className="w-full">
            <Shield size={18} />
            {t('perms.allowAll')}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onContinue} className="mt-2 w-full font-bold text-ec-ink40">
          {t('perms.notNow')}
        </Button>
      </div>
    </div>
  )
}
