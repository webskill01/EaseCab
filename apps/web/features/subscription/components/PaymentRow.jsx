import { useTranslations } from 'next-intl'
import { paymentVM } from '../lib/paymentView'

/** One captured-payment row in the history list. */
export function PaymentRow({ payment }) {
  const t = useTranslations('membership')
  const vm = paymentVM(payment)
  return (
    <li className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-[14px] font-extrabold text-ec-ink">{vm.amount}</p>
        <p className="text-[12px] font-semibold text-ec-ink60">{vm.date}</p>
      </div>
      <span className="rounded-full bg-ec-successBg px-2.5 py-1 text-[11px] font-bold text-ec-successTx">{t('history.captured')}</span>
    </li>
  )
}
