import { useTranslations } from 'next-intl'
import { Check } from '@/components/ui/icons'
import { paymentVM } from '../lib/paymentView'

/** One captured-payment row: green check tile + plan label/date, amount + status (membership.jsx history row). */
export function PaymentRow({ payment }) {
  const t = useTranslations('membership')
  const vm = paymentVM(payment)
  return (
    <li className="flex items-center gap-3 border-b border-ec-line px-4 py-[13px] last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ec-successBg text-ec-successTx"><Check size={16} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-ec-ink">{t('plan.title')}</p>
        <p className="text-[12px] font-medium text-ec-ink40">{vm.date}</p>
      </div>
      <div className="text-right">
        <p className="text-[14px] font-extrabold text-ec-ink">{vm.amount}</p>
        <p className="text-[11px] font-bold text-ec-successTx">{t('history.captured')}</p>
      </div>
    </li>
  )
}
