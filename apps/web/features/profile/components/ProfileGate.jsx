'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User, Check, ArrowR } from '@/components/ui/icons'
import { env } from '@/config/env'
import { useProfile } from '../hooks/useProfile'

/** The 5 L1 fields (shared PROFILE_REQUIRED_STRINGS) → their profile.fields label key. */
const ITEMS = [['profilePicUrl', 'photo'], ['name', 'name'], ['baseCity', 'baseCity'], ['vehicleType', 'vehicle'], ['bio', 'bio']]
const DISMISS_KEY = 'ec_profile_nudge'
/** Screens that already are the profile form, or show the steps inline (payment success). */
const SKIP = ['/profile/edit', '/verify', '/membership']

const filled = (v) => typeof v === 'string' && v.trim().length > 0

/** Same routing as the profile tab's CompletenessBanner: Aadhaar first when verification is on. */
export function profileSetupHref(profile) {
  return env.NEXT_PUBLIC_VERIFICATION_ENABLED && !profile?.verification?.aadhaarVerified ? '/verify?intent=l1' : '/profile/edit'
}

/**
 * "One step left" card: progress, the 5 fields ticked/unticked, and a CTA to the
 * profile form. Used by the app-wide popup, the WhatsApp-group sheet and payment success.
 * @param {{ profile: object, sub?: string, onLater?: () => void }} props
 */
export function ProfileSteps({ profile, sub, onLater }) {
  const t = useTranslations('profile')
  const router = useRouter()
  const done = ITEMS.filter(([f]) => filled(profile[f])).length
  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ec-blue text-white"><User size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="pr-8 text-[18px] font-extrabold leading-tight text-ec-ink">{t('gate.title')}</h2>
          <p className="mt-[3px] text-[13.5px] font-medium leading-snug text-ec-ink60">{sub || t('gate.sub')}</p>
        </div>
      </div>
      <div className="mb-1 flex items-center justify-between text-[12px] font-bold text-ec-ink60">
        <span>{t('gate.progress', { done, total: ITEMS.length })}</span>
        <span>{Math.round((done / ITEMS.length) * 100)}%</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-ec-line">
        <div className="h-full rounded-full bg-ec-success" style={{ width: `${(done / ITEMS.length) * 100}%` }} />
      </div>
      <ul className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {ITEMS.map(([f, label]) => {
          const ok = filled(profile[f])
          return (
            <li key={f} className={`flex items-center gap-1.5 text-[13px] font-semibold ${ok ? 'text-ec-ink40 line-through' : 'text-ec-ink'}`}>
              <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${ok ? 'bg-ec-success text-white' : 'border-[1.5px] border-ec-line'}`}>
                {ok && <Check size={12} />}
              </span>
              {t(`fields.${label}`)}
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => router.push(profileSetupHref(profile))}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ec-blue text-[15px] font-extrabold text-white active:scale-[0.98]"
      >
        {t('gate.cta')}<ArrowR size={18} />
      </button>
      {onLater && (
        <button type="button" onClick={onLater} className="mt-1.5 h-10 w-full text-[13.5px] font-bold text-ec-ink60">
          {t('gate.later')}
        </button>
      )}
    </div>
  )
}

/**
 * App-wide nudge: an incomplete profile gets the steps popup once per app session
 * (so after every login/app open). "Later" hides it until the next session.
 */
export function ProfileGate() {
  const t = useTranslations('profile')
  const { data } = useProfile()
  const path = usePathname() || ''
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1') } catch { setDismissed(false) }
  }, [])
  if (!data || data.profileComplete || dismissed || SKIP.some((p) => path.startsWith(p))) return null

  const later = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode: hides for this render only */ }
    setDismissed(true)
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ec-ink/45 px-4">
      <div role="dialog" aria-modal="true" aria-label={t('gate.title')} className="w-full max-w-sm rounded-[22px] bg-white p-[18px] shadow-[0_20px_60px_rgba(15,23,42,0.3)]">
        <ProfileSteps profile={data} onLater={later} />
      </div>
    </div>
  )
}
