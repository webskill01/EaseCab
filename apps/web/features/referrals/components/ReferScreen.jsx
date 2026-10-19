'use client'

import { useTranslations } from 'next-intl'
import { Whatsapp, Crown, Check } from '@/components/ui/icons'
import { PLAY_STORE_URL } from '@/features/landing/components/LandingHero'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { formatPaymentDate } from '@/features/subscription/lib/paymentView'
import { useReferrals } from '../hooks/useReferrals'
import { ClaimReferrer } from './ClaimReferrer'

/** WhatsApp app packages on Android — personal and Business can both be installed. */
const WA_APPS = Object.freeze({ personal: 'com.whatsapp', business: 'com.whatsapp.w4b' })

/**
 * Share link for the ready-made invite. With `pkg` (Android only) it is an intent URL that
 * opens that exact app (personal vs Business) instead of letting the OS pick; falls back
 * to wa.me when the app isn't installed. Without `pkg` it is the plain wa.me link.
 */
export function shareHref(text, pkg) {
  const waMe = `https://wa.me/?text=${encodeURIComponent(text)}`
  if (!pkg) return waMe
  return `intent://send?text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${encodeURIComponent(waMe)};end`
}

const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
const SHARE_BTN = 'flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15.5px] font-extrabold text-white'

/** Paid / counted / waiting pill for one referee. */
function StatusPill({ r, t }) {
  if (r.rewarded) return <span className="rounded-md bg-ec-successBg px-2 py-0.5 text-[11px] font-extrabold text-ec-success">{t('status.counted')}</span>
  if (r.paid) return <span className="rounded-md bg-ec-sky px-2 py-0.5 text-[11px] font-extrabold text-ec-blueInk">{t('status.paid')}</span>
  return <span className="rounded-md bg-ec-bg px-2 py-0.5 text-[11px] font-extrabold text-ec-ink40">{t('status.waiting')}</span>
}

/** Progress dots toward the next free month (towardNext of perReward filled). */
function Progress({ done, total, t }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${i < done ? 'border-white bg-white text-ec-blueInk' : 'border-white/50 text-white/60'}`}>
          {i < done ? <Check size={16} /> : i + 1}
        </span>
      ))}
      <span className="ml-1 text-[13px] font-bold text-white">{t('progress', { done, total })}</span>
    </div>
  )
}

/**
 * Refer & Earn (Phase 22): every 2 referred drivers who buy membership = 1 free month,
 * same as the WhatsApp-group offer. Share invite on WhatsApp, track who has paid.
 */
export function ReferScreen() {
  const t = useTranslations('membership.refer')
  const { data, isLoading, isError } = useReferrals()
  const { data: profile } = useProfile()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error')}</div>

  if (!data.enabled) return null // outside the rollout (REFERRAL_TESTERS) — entry points are hidden too

  const myNumber = profile ? String(profile.phone).replace(/^\+91/, '') : ''
  const invite = t('shareText', { link: PLAY_STORE_URL, phone: myNumber, box: t('claim.title') })
  const android = isAndroid()

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-ec-bg p-4">
      <h1 className="text-[20px] font-extrabold text-ec-ink">{t('title')}</h1>

      <section className="rounded-2xl bg-ec-blueInk p-[18px] text-white">
        <p className="text-[18px] font-extrabold leading-snug">{t('hero.title', { count: data.perReward })}</p>
        <p className="mt-1 text-[12.5px] font-medium text-ec-skyDeep">{t('hero.sub')}</p>
        <Progress done={data.towardNext} total={data.perReward} t={t} />
        {data.monthsEarned > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-bold"><Crown size={15} />{t('earned', { count: data.monthsEarned })}</p>
        )}
      </section>

      <div className="space-y-2">
        <a href={shareHref(invite, android ? WA_APPS.personal : undefined)} target="_blank" rel="noopener noreferrer" className={`${SHARE_BTN} bg-ec-success`}>
          <Whatsapp size={20} />{t('share')}
        </a>
        {android && (
          <a href={shareHref(invite, WA_APPS.business)} target="_blank" rel="noopener noreferrer" className={`${SHARE_BTN} bg-[#128C7E]`}>
            <Whatsapp size={20} />{t('shareBusiness')}
          </a>
        )}
      </div>

      <section className="rounded-2xl border border-ec-line bg-white p-4">
        <p className="text-[14px] font-extrabold text-ec-ink">{t('how.title')}</p>
        <ol className="mt-2 space-y-1.5 text-[13px] font-semibold text-ec-ink60">
          {['step1', 'step2', 'step3'].map((k, i) => <li key={k}>{i + 1}. {t(`how.${k}`, { count: data.perReward })}</li>)}
        </ol>
      </section>

      {data.canClaim && <ClaimReferrer />}
      {data.referredBy && (
        <p className="text-center text-[12.5px] font-semibold text-ec-ink40">{t('referredBy', { name: data.referredBy.name || t('claim.driver') })}</p>
      )}

      <section className="rounded-2xl border border-ec-line bg-white">
        <p className="border-b border-ec-line px-4 py-3 text-[14px] font-extrabold text-ec-ink">{t('list.title', { count: data.referrals.length })}</p>
        {data.referrals.length === 0 ? (
          <p className="px-4 py-5 text-center text-[13px] font-semibold text-ec-ink40">{t('list.empty')}</p>
        ) : (
          <ul>
            {data.referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-ec-line px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ec-ink">{r.name || t('claim.driver')}</p>
                  <p className="text-[11.5px] font-semibold text-ec-ink40">{t('list.joined', { date: formatPaymentDate(r.joinedAt) })}</p>
                </div>
                <StatusPill r={r} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
