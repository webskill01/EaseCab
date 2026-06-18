'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMyPostedRides } from '../hooks/useMyPostedRides'
import { useContactedRides } from '../hooks/useContactedRides'
import { MineTabs, MINE_SUB } from './MineTabs'
import { MyPostedCard } from './MyPostedCard'
import { ContactedCard } from './ContactedCard'
import { ConfirmSheet } from './ConfirmSheet'
import { MineCardSkeleton, MineEmpty } from './MineStates'

/**
 * My Rides (SCREENS §4) — Posted (mark-done/delete) + Contacted (revealed phone).
 * Wired into /mine. Repost/View-chats/Chat are deferred stubs (Steps 20/22).
 */
export function MyRidesScreen() {
  const t = useTranslations('mine')
  const router = useRouter()
  const [sub, setSub] = useState(MINE_SUB.POSTED)
  const [confirm, setConfirm] = useState(null) // { kind: 'done'|'delete', post }

  const posted = useMyPostedRides()
  const contacted = useContactedRides()

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.kind === 'done') posted.markDone(confirm.post.id)
    else posted.remove(confirm.post.id)
    setConfirm(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="px-3.5 pb-2 pt-2.5">
        <h1 className="text-[20px] font-extrabold tracking-tight text-ec-ink">{t('title')}</h1>
      </div>
      <MineTabs sub={sub} onChange={setSub} />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-2">
        {sub === MINE_SUB.POSTED ? (
          posted.isLoading ? [0, 1, 2].map((i) => <MineCardSkeleton key={i} />)
            : posted.isEmpty ? <MineEmpty tab="posted" onCta={() => router.push('/post')} />
            : posted.posts.map((p) => (
                <MyPostedCard key={p.id} post={p}
                  onMarkDone={(post) => setConfirm({ kind: 'done', post })}
                  onDelete={(post) => setConfirm({ kind: 'delete', post })} />
              ))
        ) : (
          contacted.isLoading ? [0, 1, 2].map((i) => <MineCardSkeleton key={i} />)
            : contacted.isEmpty ? <MineEmpty tab="contacted" onCta={() => router.push('/feed')} />
            : contacted.contacts.map((c) => <ContactedCard key={c.id} contact={c} />)
        )}
      </div>

      {confirm && (
        <ConfirmSheet
          title={t(confirm.kind === 'done' ? 'confirm.doneTitle' : 'confirm.deleteTitle')}
          body={t(confirm.kind === 'done' ? 'confirm.doneBody' : 'confirm.deleteBody')}
          confirmLabel={t(confirm.kind === 'done' ? 'confirm.doneCta' : 'confirm.deleteCta')}
          danger={confirm.kind === 'delete'}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
