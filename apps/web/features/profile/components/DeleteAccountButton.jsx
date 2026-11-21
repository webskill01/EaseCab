'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { Trash } from '@/components/ui/icons'
import { useDeleteAccount } from '../hooks/useDeleteAccount'

/**
 * Danger account action (profile.jsx) — opens a confirm sheet, then soft-deletes the
 * account and logs the user out. The copy makes the 30-day restore window explicit so
 * the choice is informed; a failed delete keeps the sheet open with an error line.
 */
export function DeleteAccountButton() {
  const t = useTranslations('profile')
  const [open, setOpen] = useState(false)
  const del = useDeleteAccount()
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-center text-[12.5px] font-bold text-ec-ink40 hover:text-ec-danger">
        {t('deleteAccount.action')}
      </button>

      {open && (
        <StatusSheet tone="danger" icon={<Trash size={22} />} title={t('deleteAccount.title')} body={t('deleteAccount.body')} onClose={() => setOpen(false)}>
          {del.error && <p className="mb-3 text-[12.5px] font-bold text-ec-danger">{t('deleteAccount.error')}</p>}
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)} disabled={del.submitting} className="flex-1">{t('deleteAccount.cancel')}</Button>
            <Button type="button" variant="danger" size="lg" onClick={del.run} disabled={del.submitting} className="flex-1">
              {del.submitting ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
            </Button>
          </div>
        </StatusSheet>
      )}
    </>
  )
}
