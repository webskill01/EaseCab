'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
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
          <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">
            {t('confirm.cancel')}
          </Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} size="lg" onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
