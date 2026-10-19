'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from '@/components/ui/icons'
import { useClaimReferrer } from '../hooks/useReferrals'

// HTTP status → i18n key for the claim error line.
const ERROR_KEY = Object.freeze({ 404: 'notFound', 409: 'already', 422: 'invalid', 429: 'tooMany' })

/**
 * "Who told you about EaseCab?" — optional box on the signup Done screen and the Refer
 * screen (only while the 7-day window is open). Drivers type the referrer's mobile.
 * @param {{ compact?: boolean }} props - compact = no card chrome (Done screen)
 */
export function ClaimReferrer({ compact = false }) {
  const t = useTranslations('membership.refer.claim')
  const [phone, setPhone] = useState('')
  const claim = useClaimReferrer()
  const digits = phone.replace(/\D/g, '')

  if (claim.isSuccess) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[13.5px] font-bold text-ec-success">
        <Check size={16} />{t('done', { name: claim.data.referrer.name || t('driver') })}
      </p>
    )
  }

  const errKey = claim.error ? (ERROR_KEY[claim.error.status] || 'generic') : null
  return (
    <div className={compact ? 'w-full text-left' : 'rounded-2xl border border-ec-line bg-white p-4'}>
      <label htmlFor="referrer-phone" className="text-[13.5px] font-extrabold text-ec-ink">{t('title')}</label>
      <p className="mt-0.5 text-[12px] font-semibold text-ec-ink60">{t('sub')}</p>
      <div className="mt-2.5 flex gap-2">
        <input
          id="referrer-phone"
          type="tel"
          inputMode="numeric"
          maxLength={14}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('placeholder')}
          className="h-11 min-w-0 flex-1 rounded-xl border border-ec-line px-3 text-[15px] font-semibold text-ec-ink outline-none focus:border-ec-blue"
        />
        <button
          type="button"
          disabled={digits.length < 10 || claim.isPending}
          onClick={() => claim.mutate({ phone })}
          className="h-11 shrink-0 rounded-xl bg-ec-blue px-4 text-[14px] font-extrabold text-white disabled:opacity-50"
        >
          {t('save')}
        </button>
      </div>
      {errKey && <p className="mt-1.5 text-[12.5px] font-semibold text-ec-danger">{t(`error.${errKey}`)}</p>}
    </div>
  )
}
