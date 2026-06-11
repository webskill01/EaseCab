'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'

/**
 * Generic confirm sheet for a destructive/lifecycle action.
 * @param {{ title: string, body?: string, confirmLabel: string, danger?: boolean,
 *   onConfirm: ()=>void, onClose: ()=>void }} props
 */
export function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onClose }) {
  const t = useTranslations('mine')
  return (
    <BottomSheet onClose={onClose} label={title}>
      <div className="flex flex-col gap-3 pb-2 text-center">
        <h2 className="text-[18px] font-extrabold text-ec-ink">{title}</h2>
        {body ? <p className="text-[13.5px] font-medium text-ec-ink60">{body}</p> : null}
        <button type="button" onClick={onConfirm} className={`mt-1 h-[52px] w-full rounded-xl text-[15.5px] font-extrabold text-white ${danger ? 'bg-ec-danger' : 'bg-ec-blue shadow-ec-blue'}`}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onClose} className="h-[46px] w-full rounded-xl bg-ec-bg text-[14.5px] font-bold text-ec-ink60">
          {t('confirm.cancel')}
        </button>
      </div>
    </BottomSheet>
  )
}
