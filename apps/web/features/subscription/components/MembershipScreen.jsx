'use client'

import { useTranslations } from 'next-intl'
import { Crown, Check, Info, Shield } from '@/components/ui/icons'
import { membershipView, MEMBERSHIP_STATE } from '../lib/membership'
import { formatPaymentDate } from '../lib/paymentView'
import { useMembership } from '../hooks/useMembership'
import { useCheckout } from '../hooks/useCheckout'
import { PaymentHistory } from './PaymentHistory'

const CTA_KEY = Object.freeze({ trial: 'upgrade', active: 'renew', expired: 'subscribe' })

// Status-card chrome per state (membership.jsx stateMeta).
const STATUS_META = Object.freeze({
  trial: { wrap: 'border-ec-warning/30 bg-ec-warnBg', tile: 'bg-ec-warning', Icon: Crown },
  active: { wrap: 'border-ec-success/30 bg-ec-successBg', tile: 'bg-ec-success', Icon: Check },
  expired: { wrap: 'border-ec-danger/30 bg-ec-dangerBg', tile: 'bg-ec-danger', Icon: Info },
})

/** Status card — state-tinted tile + "EaseCab · <plan>" + note, with a trial progress bar. */
function StatusCard({ state, note, daysLeft, t }) {
  const meta = STATUS_META[state]
  const Icon = meta.Icon
  return (
    <section className={`rounded-2xl border p-[18px] ${meta.wrap}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[11px] text-white ${meta.tile}`}><Icon size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-extrabold text-ec-ink">EaseCab · {t(`${state}.badge`)}</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-ec-ink60">{note}</p>
        </div>
      </div>
      {state === MEMBERSHIP_STATE.TRIAL && (
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-[3px] bg-ec-warning/25">
          <div className="h-full rounded-[3px] bg-ec-warning" style={{ width: `${Math.max(8, ((daysLeft ?? 0) / 7) * 100)}%` }} />
        </div>
      )}
    </section>
  )
}

/** Featured ₹149 "Popular" plan card (membership.jsx plan card). */
function PlanCard({ t }) {
  return (
    <section className="overflow-hidden rounded-2xl border-[1.5px] border-ec-blue shadow-[0_8px_24px_rgba(37,99,235,0.15)]">
      <div className="bg-ec-blueInk px-[18px] pb-4 pt-[18px] text-white">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold">{t('plan.title')}</span>
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ec-blueInk">{t('plan.popular')}</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-[40px] font-extrabold leading-none tracking-tight">₹149</span>
          <span className="text-[15px] font-semibold text-ec-skyDeep">{t('plan.perMonth')}</span>
        </div>
        <p className="mt-1 text-[13px] font-medium text-ec-skyDeep">{t('plan.tagline')}</p>
      </div>
      <ul className="bg-white p-4">
        {['feat1', 'feat2', 'feat3'].map((k) => (
          <li key={k} className="mb-2.5 flex items-start gap-2.5 last:mb-0">
            <span className="mt-0.5 inline-flex text-ec-success"><Check size={17} /></span>
            <span className="text-[13.5px] font-semibold leading-snug text-ec-ink">{t(`plan.${k}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Membership hub (SCREENS §6/§8) — status card + ₹149 plan + Razorpay upgrade/renew + history. */
export function MembershipScreen() {
  const t = useTranslations('membership')
  const { data: sub, isLoading, isError } = useMembership()
  const checkout = useCheckout()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = membershipView(sub)
  const note =
    v.state === MEMBERSHIP_STATE.TRIAL
      ? t('trial.daysLeft', { days: v.daysLeft })
      : v.state === MEMBERSHIP_STATE.ACTIVE
        ? t('active.note', { date: formatPaymentDate(sub?.expiresAt) })
        : t('expired.note')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-ec-bg p-4">
      <h1 className="text-[20px] font-extrabold text-ec-ink">{t('title')}</h1>

      {checkout.succeeded ? (
        <section className="rounded-2xl border border-ec-line bg-white p-5 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-ec-successBg text-ec-success"><Crown size={26} /></div>
          <p className="text-[17px] font-extrabold text-ec-ink">{t('success.title')}</p>
          <p className="mt-1 text-[13px] font-medium text-ec-ink60">{t('success.body')}</p>
        </section>
      ) : (
        <>
          <StatusCard state={v.state} note={note} daysLeft={v.daysLeft} t={t} />
          <PlanCard t={t} />

          {checkout.errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t('error.checkout')}</p>}

          <div>
            <button
              type="button"
              disabled={checkout.checkingOut}
              onClick={() => checkout.start()}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:opacity-60"
            >
              <Crown size={18} />
              {checkout.checkingOut ? t('cta.processing') : t(`cta.${CTA_KEY[v.state]}`)}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-ec-ink40">
              <Shield size={13} />{t('securedBy')}
            </p>
          </div>
        </>
      )}

      <PaymentHistory />
    </div>
  )
}
