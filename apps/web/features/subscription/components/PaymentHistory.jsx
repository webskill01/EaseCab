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
    <section className="rounded-2xl border border-ec-line bg-white p-4">
      <h2 className="text-[15px] font-extrabold text-ec-ink">{t('history.title')}</h2>
      {payments.length === 0 ? (
        <p className="mt-2 text-[13px] font-medium text-ec-ink40">{t('history.empty')}</p>
      ) : (
        <ul className="mt-1 divide-y divide-ec-line">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </ul>
      )}
    </section>
  )
}
