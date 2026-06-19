'use client'

import { useTranslations } from 'next-intl'
import { usePayments } from '../hooks/usePayments'
import { PaymentRow } from './PaymentRow'

/** Captured-payment history list under the membership card (Step 21d). */
export function PaymentHistory() {
  const t = useTranslations('membership')
  const { data } = usePayments()
  const payments = data?.payments ?? []
  return (
    <section>
      <h2 className="mb-2.5 text-[12.5px] font-extrabold uppercase tracking-wide text-ec-ink60">{t('history.title')}</h2>
      {payments.length === 0 ? (
        <p className="text-[13px] font-medium text-ec-ink40">{t('history.empty')}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </ul>
      )}
    </section>
  )
}
