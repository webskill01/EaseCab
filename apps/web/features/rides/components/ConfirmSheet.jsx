'use client'

import { useTranslations } from 'next-intl'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { Trash, Check } from '@/components/ui/icons'

/**
 * Generic confirm sheet for a destructive/lifecycle action.
 * @param {{ title: string, body?: string, confirmLabel: string, danger?: boolean,
 *   onConfirm: ()=>void, onClose: ()=>void }} props
 */
export function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onClose }) {
  const t = useTranslations('mine')
  return (
    <StatusSheet tone={danger ? 'danger' : 'success'} icon={danger ? <Trash size={22} /> : <Check size={24} />} title={title} body={body} onClose={onClose}>
      <div className="flex gap-2.5">
        <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">
          {t('confirm.cancel')}
        </Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} size="lg" onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
      </div>
    </StatusSheet>
  )
}
