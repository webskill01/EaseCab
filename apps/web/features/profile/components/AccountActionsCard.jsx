'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { LogOut, Trash, ChevR } from '@/components/ui/icons'
import { useLogout } from '@/features/shell/hooks/useLogout'
import { useDeleteAccount } from '../hooks/useDeleteAccount'

/** One row in the danger card — tinted square tile, title (+ optional sub), chevron. */
function ActionRow({ icon, title, sub, onClick, last }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? '' : 'border-b border-ec-line'}`}>
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-ec-danger/10 text-ec-danger">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14.5px] ${sub ? 'font-bold text-ec-ink' : 'font-extrabold text-ec-danger'}`}>{title}</span>
        {sub && <span className="mt-0.5 block text-[11.5px] font-semibold text-ec-ink40">{sub}</span>}
      </span>
      <ChevR size={18} className="shrink-0 text-ec-ink40" />
    </button>
  )
}

/**
 * Account actions (profile.jsx §6) — logout + delete as one two-row danger card, each
 * opening a confirm bottom-sheet. Delete is destructive with a loading/error state; the
 * copy makes the 30-day restore window explicit. Replaces the stacked LogoutButton +
 * DeleteAccountButton on the profile hub.
 */
export function AccountActionsCard() {
  const t = useTranslations('profile')
  const [confirm, setConfirm] = useState(null) // null | 'logout' | 'delete'
  const doLogout = useLogout()
  const del = useDeleteAccount()
  const close = () => setConfirm(null)

  return (
    <>
      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
        <ActionRow icon={<LogOut size={18} />} title={t('logout.action')} onClick={() => setConfirm('logout')} />
        <ActionRow icon={<Trash size={17} />} title={t('deleteAccount.action')} sub={t('deleteAccount.sub')} onClick={() => setConfirm('delete')} last />
      </nav>

      {confirm === 'logout' && (
        <StatusSheet tone="danger" icon={<LogOut size={22} />} title={t('logout.title')} body={t('logout.body')} onClose={close}>
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" size="lg" onClick={close} className="flex-1">{t('deleteAccount.cancel')}</Button>
            <Button type="button" variant="danger" size="lg" onClick={doLogout} className="flex-1">{t('logout.action')}</Button>
          </div>
        </StatusSheet>
      )}

      {confirm === 'delete' && (
        <StatusSheet tone="danger" icon={<Trash size={22} />} title={t('deleteAccount.title')} body={t('deleteAccount.body')} onClose={close}>
          {del.error && <p className="mb-3 text-[12.5px] font-bold text-ec-danger">{t('deleteAccount.error')}</p>}
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" size="lg" onClick={close} disabled={del.submitting} className="flex-1">{t('deleteAccount.cancel')}</Button>
            <Button type="button" variant="danger" size="lg" onClick={del.run} disabled={del.submitting} className="flex-1">
              {del.submitting ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
            </Button>
          </div>
        </StatusSheet>
      )}
    </>
  )
}
