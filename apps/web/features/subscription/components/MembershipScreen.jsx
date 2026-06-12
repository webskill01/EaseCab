'use client'

import { useTranslations } from 'next-intl'
import { Crown } from '@/components/ui/icons'
import { membershipView, MEMBERSHIP_STATE } from '../lib/membership'
import { formatPaymentDate } from '../lib/paymentView'
import { useMembership } from '../hooks/useMembership'
import { useCheckout } from '../hooks/useCheckout'
import { PaymentHistory } from './PaymentHistory'

const BADGE = Object.freeze({
  trial: 'bg-ec-warnBg text-ec-amberTx',
  active: 'bg-ec-successBg text-ec-successTx',
  expired: 'bg-ec-dangerBg text-ec-danger',
})

const CTA_KEY = Object.freeze({ trial: 'upgrade', active: 'renew', expired: 'subscribe' })

/** Membership hub (SCREENS §6/§8) — status card + Razorpay upgrade/renew + payment history. */
export function MembershipScreen() {
  const t = useTranslations('membership')
  const { data: sub, isLoading, isError } = useMembership()
  const checkout = useCheckout()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = membershipView(sub)
  const note =
    v.state === MEMBERSHIP_STATE.TRIAL
      ? t('trial.note', { date: formatPaymentDate(sub?.trialExpiresAt) })
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
        <section className="rounded-2xl border border-ec-line bg-white p-5">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${BADGE[v.state]}`}>{t(`${v.state}.badge`)}</span>
            {v.state === MEMBERSHIP_STATE.TRIAL && (
              <span className="text-[12px] font-bold text-ec-amberTx">{t('trial.daysLeft', { days: v.daysLeft })}</span>
            )}
          </div>
          <p className="mt-3 text-[14px] font-semibold text-ec-ink">{note}</p>
          <p className="mt-0.5 text-[13px] font-bold text-ec-blueInk">{t('price')}</p>

          {checkout.errorKey && <p className="mt-3 text-[13px] font-semibold text-ec-danger">{t('error.checkout')}</p>}

          <button
            type="button"
            disabled={checkout.checkingOut}
            onClick={() => checkout.start()}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:opacity-60"
          >
            <Crown size={18} />
            {checkout.checkingOut ? t('cta.processing') : t(`cta.${CTA_KEY[v.state]}`)}
          </button>
        </section>
      )}

      <PaymentHistory />
    </div>
  )
}
