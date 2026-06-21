'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevL, Ban, User } from '@/components/ui/icons'
import { useBlocks } from '../hooks/useBlocks'

/** One blocked user row — avatar, name·city, and an unblock button. */
function BlockedRow({ row, label, busy, onUnblock }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {row.profilePicUrl ? (
        <img src={row.profilePicUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><User size={18} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-ec-ink">{row.name || '—'}</span>
        {row.baseCity && <span className="block truncate text-[12.5px] font-semibold text-ec-ink60">{row.baseCity}</span>}
      </span>
      <button
        type="button"
        onClick={() => onUnblock(row.blockedId)}
        disabled={busy}
        className="shrink-0 rounded-lg border-[1.5px] border-ec-line px-3 py-1.5 text-[13px] font-extrabold text-ec-blueInk disabled:opacity-50"
      >
        {label}
      </button>
    </li>
  )
}

/** Blocked-users management (Profile → Blocked) — list each blocked user with an unblock action. */
export function BlockedUsersScreen() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const router = useRouter()
  const { blocks, isLoading, isError, unblock, unblockingId } = useBlocks()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-ec-line bg-white px-3.5 py-3">
        <button type="button" onClick={() => router.push('/profile')} aria-label={tc('actions.back')} className="flex h-9 w-9 items-center justify-center rounded-lg text-ec-ink">
          <ChevL size={24} />
        </button>
        <div className="flex-1 text-[18px] font-extrabold tracking-tight text-ec-ink">{t('blocked.title')}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
        ) : isError ? (
          <p className="px-2 py-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</p>
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><Ban size={22} /></span>
            <p className="text-[14px] font-bold text-ec-ink">{t('blocked.emptyTitle')}</p>
            <p className="text-[12.5px] font-semibold text-ec-ink60">{t('blocked.emptyHint')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ec-line overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
            {blocks.map((row) => (
              <BlockedRow
                key={row.id}
                row={row}
                label={unblockingId === row.blockedId ? t('blocked.unblocking') : t('blocked.unblock')}
                busy={unblockingId === row.blockedId}
                onUnblock={unblock}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
