'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Shield, User, Check } from '@/components/ui/icons'

/**
 * Posting eligibility for a /me profile — mirrors the server L1 gate
 * (@easecab/shared hasSubmittedKyc: Aadhaar verified AND profile complete).
 * @param {?object} profile
 * @returns {{ aadhaar: boolean, profile: boolean, eligible: boolean }}
 */
export function postEligibility(profile) {
  const aadhaar = Boolean(profile?.verification?.aadhaarVerified)
  const complete = Boolean(profile?.profileComplete)
  return { aadhaar, profile: complete, eligible: aadhaar && complete }
}

function Step({ icon, title, sub, done, t }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-3 ${done ? 'border-ec-success/30 bg-ec-successBg/50' : 'border-ec-line bg-white'}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-ec-success text-white' : 'bg-ec-sky text-ec-blue'}`}>
        {done ? <Check size={18} /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-extrabold text-ec-ink">{title}</p>
        <p className="text-[11.5px] font-medium leading-snug text-ec-ink60">{sub}</p>
      </div>
      <span className={`shrink-0 text-[11.5px] font-extrabold ${done ? 'text-ec-successTx' : 'text-ec-warning'}`}>
        {done ? t('gate.done') : t('gate.pending')}
      </span>
    </li>
  )
}

/**
 * Post gate (SCREENS §5) — opens when an ineligible user taps Post (client check) or
 * the server returns 403 VERIFICATION_REQUIRED. Shows both L1 steps with their state
 * and routes to the first unfinished one: Aadhaar first, then profile completion.
 *
 * @param {{ profile: ?object, onClose: () => void, onGo: (path: string) => void }} props
 */
export function VerifyGateSheet({ profile, onClose, onGo }) {
  const t = useTranslations('post')
  const tc = useTranslations('common')
  const e = postEligibility(profile)
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('gate.title')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ec-blueInk text-white"><Shield size={22} /></span>
      <h2 className="mt-3 pr-9 text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{t('gate.title')}</h2>
      <p className="mt-1 text-[13px] font-medium leading-snug text-ec-ink60">{t('gate.body')}</p>
      <ol className="mt-3.5 flex flex-col gap-2">
        <Step icon={<Shield size={18} />} title={t('gate.stepAadhaar')} sub={t('gate.stepAadhaarSub')} done={e.aadhaar} t={t} />
        <Step icon={<User size={18} />} title={t('gate.stepProfile')} sub={t('gate.stepProfileSub')} done={e.profile} t={t} />
      </ol>
      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" size="lg" className="w-full" onClick={() => onGo(e.aadhaar ? '/profile/edit' : '/verify?intent=l1')}>
          {e.aadhaar ? t('gate.ctaProfile') : t('gate.ctaAadhaar')}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="w-full bg-ec-bg font-bold text-ec-ink60">
          {t('gate.notNow')}
        </Button>
      </div>
    </BottomSheet>
  )
}
