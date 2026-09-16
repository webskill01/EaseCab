'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Pin, BellEdit, Lock, Check, Shield, ChevR } from '@/components/ui/icons'
import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { getCurrentPosition } from '@/features/notifications/services/geoClient'
import { PermBlockedSheet } from '@/features/notifications/components/PermBlockedSheet'

const ITEMS = [
  ['notifications', BellEdit],
  ['location', Pin],
]

/**
 * Onboarding step 3 — app permissions (docs/design/SCREENS.md §1/§10). Notifications
 * and location only, and each tap fires the REAL OS prompt. Token registration is not
 * done here: once the OS permission is granted, useSyncPushToken mints + registers the
 * FCM token on the first feed load. Both "Allow all → Continue" and "Not now" advance.
 * @param {{ onContinue: () => void }} props
 */
export function PermissionsStep({ onContinue }) {
  const t = useTranslations('auth')
  const [granted, setGranted] = useState({})
  const [denied, setDenied] = useState({})
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(null) // key of a blocked permission whose fix dialog is open
  const allOn = ITEMS.every(([k]) => granted[k])
  // A blocked permission can only be re-enabled in browser settings, so a denial has
  // to advance the step too — otherwise the user is stuck on a button that does nothing.
  const allDone = ITEMS.every(([k]) => granted[k] || denied[k])

  const request = {
    notifications: async () => {
      const { permission } = await requestPermissionAndToken()
      if (permission === 'granted') setGranted((g) => ({ ...g, notifications: true }))
      else {
        if (denied.notifications) setHelp('notifications') // tapped again while blocked
        setDenied((d) => ({ ...d, notifications: true }))
      }
    },
    location: async () => {
      try {
        await getCurrentPosition()
        setGranted((g) => ({ ...g, location: true }))
      } catch (err) {
        // code 1 = PERMISSION_DENIED; unavailable/timeout still means permission granted
        if (err?.code && err.code !== 1) setGranted((g) => ({ ...g, location: true }))
        else {
          if (denied.location) setHelp('location') // tapped again while blocked
          setDenied((d) => ({ ...d, location: true }))
        }
      }
    },
  }

  const fire = async (keys) => {
    if (busy) return
    setBusy(true)
    try {
      for (const key of keys) await request[key]()
    } finally {
      setBusy(false)
    }
  }

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
          const blocked = denied[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => !on && fire([key])}
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
                {blocked && (
                  <p className="mt-1 text-[11.5px] font-bold leading-snug text-ec-warning">{t('perms.blocked')}</p>
                )}
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
        {allDone ? (
          <Button type="button" size="lg" onClick={onContinue} className="w-full">
            {t('perms.continue')}
            <ChevR size={18} />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => fire(ITEMS.filter(([k]) => !granted[k]).map(([k]) => k))}
            className="w-full"
          >
            <Shield size={18} />
            {t('perms.allowAll')}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onContinue} className="mt-2 w-full font-bold text-ec-ink40">
          {t('perms.notNow')}
        </Button>
      </div>
      {help && <PermBlockedSheet kind={help} onRetry={() => fire([help])} onClose={() => setHelp(null)} />}
    </div>
  )
}
