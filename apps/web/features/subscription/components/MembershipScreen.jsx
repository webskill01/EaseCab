'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Crown, Check, Info, Shield } from '@/components/ui/icons'
import { membershipView, MEMBERSHIP_STATE } from '../lib/membership'
import { formatPaymentDate } from '../lib/paymentView'
import { useMembership } from '../hooks/useMembership'
import { useCheckout } from '../hooks/useCheckout'
import { PaymentHistory } from './PaymentHistory'
import { PlanPicker } from './PlanPicker'
import { PLANS, DEFAULT_PLAN_ID, RENEW_PLAN_ID, rupees } from '../lib/plans'

const CTA_KEY = Object.freeze({ none: 'subscribe', active: 'renew', expired: 'renew' })

// Status-card chrome per state (membership.jsx stateMeta).
const STATUS_META = Object.freeze({
  none: { wrap: 'border-ec-line bg-white', tile: 'bg-ec-blue', Icon: Crown },
  active: { wrap: 'border-ec-success/30 bg-ec-successBg', tile: 'bg-ec-success', Icon: Check },
  expired: { wrap: 'border-ec-danger/30 bg-ec-dangerBg', tile: 'bg-ec-danger', Icon: Info },
})

/** Status card — state-tinted tile + "EaseCab · <plan>" + note. */
function StatusCard({ state, note, t }) {
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
    </section>
  )
}

/** Membership hub (SCREENS §6/§8) — status card + plan picker + Cashfree upgrade/renew + history. */
export function MembershipScreen() {
  const t = useTranslations('membership')
  const { data: sub, isLoading, isError } = useMembership()
  const checkout = useCheckout()
  const [picked, setPicked] = useState(null)

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = membershipView(sub)
  // New users start on the cheapest entry point; returning members on the popular 6-month plan.
  const planId = picked ?? (v.state === MEMBERSHIP_STATE.NONE ? DEFAULT_PLAN_ID : RENEW_PLAN_ID)
  const price = rupees(PLANS.find((p) => p.id === planId).price)
  const note =
    v.state === MEMBERSHIP_STATE.ACTIVE
      ? t('active.note', { date: formatPaymentDate(sub?.expiresAt) })
      : t(`${v.state}.note`)

  return (
    // Block + space-y, not flex-col: flex children with overflow-hidden get
    // min-height:0 and shrink, so on short screens the plan card was cut off.
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-ec-bg p-4">
      <h1 className="text-[20px] font-extrabold text-ec-ink">{t('title')}</h1>

      {checkout.succeeded ? (
        <section className="rounded-2xl border border-ec-line bg-white p-5 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-ec-successBg text-ec-success"><Crown size={26} /></div>
          <p className="text-[17px] font-extrabold text-ec-ink">{t('success.title')}</p>
          <p className="mt-1 text-[13px] font-medium text-ec-ink60">{t('success.body')}</p>
        </section>
      ) : (
        <>
          <StatusCard state={v.state} note={note} t={t} />
          <PlanPicker value={planId} onChange={setPicked} t={t} />

          {checkout.errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t('error.checkout')}</p>}
          {checkout.pending && <p className="text-[13px] font-semibold text-ec-ink60">{t('notice.pending')}</p>}

          <div>
            <button
              type="button"
              disabled={checkout.checkingOut}
              onClick={() => checkout.start(planId)}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:opacity-60"
            >
              <Crown size={18} />
              {checkout.checkingOut ? t('cta.processing') : t('cta.withPrice', { label: t(`cta.${CTA_KEY[v.state]}`), price })}
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
