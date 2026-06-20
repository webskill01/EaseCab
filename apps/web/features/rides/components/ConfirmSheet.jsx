'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Flag, Check } from '@/components/ui/icons'

/**
 * Generic confirm sheet for a destructive/lifecycle action.
 * @param {{ title: string, body?: string, confirmLabel: string, danger?: boolean,
 *   onConfirm: ()=>void, onClose: ()=>void }} props
 */
export function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onClose }) {
  const t = useTranslations('mine')
  return (
    <BottomSheet onClose={onClose} label={title}>
      <SheetTitle
        icon={danger ? <Flag size={20} /> : <Check size={20} />}
        tone={danger ? 'danger' : 'success'}
        title={title}
        sub={body}
      />
      <div className="pb-2">
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className="h-[52px] flex-1 rounded-xl border-[1.5px] border-ec-line bg-white text-[15px] font-extrabold text-ec-ink">
            {t('confirm.cancel')}
          </button>
          <button type="button" onClick={onConfirm} className={`h-[52px] flex-1 rounded-xl text-[15px] font-extrabold text-white ${danger ? 'bg-ec-danger' : 'bg-ec-blue shadow-ec-blue'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
