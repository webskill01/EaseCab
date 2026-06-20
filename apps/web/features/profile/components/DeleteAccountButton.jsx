'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
        <BottomSheet onClose={() => setOpen(false)} label={t('deleteAccount.title')}>
          <div className="flex flex-col gap-3 pb-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ec-dangerBg text-ec-danger"><Trash size={22} /></span>
            <h2 className="text-[18px] font-extrabold text-ec-ink">{t('deleteAccount.title')}</h2>
            <p className="text-[13.5px] font-medium leading-relaxed text-ec-ink60">{t('deleteAccount.body')}</p>
            {del.error && <p className="text-[12.5px] font-bold text-ec-danger">{t('deleteAccount.error')}</p>}
            <div className="mt-1 flex gap-2.5">
              <button type="button" onClick={() => setOpen(false)} disabled={del.submitting} className="h-[52px] flex-1 rounded-xl border-[1.5px] border-ec-line bg-white text-[15px] font-extrabold text-ec-ink disabled:opacity-60">
                {t('deleteAccount.cancel')}
              </button>
              <button type="button" onClick={del.run} disabled={del.submitting} className="h-[52px] flex-1 rounded-xl bg-ec-danger text-[15px] font-extrabold text-white disabled:opacity-60">
                {del.submitting ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
