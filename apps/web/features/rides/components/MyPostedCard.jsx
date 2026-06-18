'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Trash, Chat } from '@/components/ui/icons'
import { RouteRow } from './RideCard'
import { ageMinFrom, relParts } from '../lib/rideView'

/** Active (green dot) / Completed (grey dot) status pill — myrides.jsx StatusPill. */
function StatusPill({ active, label }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-ec-chip px-2.5 text-[11.5px] font-extrabold ${
        active ? 'bg-ec-successBg text-ec-successTx' : 'bg-ec-bg text-ec-ink60'
      }`}
    >
      <span className={`h-[7px] w-[7px] rounded-full ${active ? 'bg-ec-success' : 'bg-ec-ink40'}`} />
      {label}
    </span>
  )
}

/**
 * My Rides → Posted card (myrides.jsx PostedCard). Active posts get a green left accent +
 * lifecycle actions; completed posts are greyed and read-only. View-chats opens the
 * Messages list (Step 22; per-post filtering deferred). Repost stays deferred (Step 20).
 * @param {{ post: object, onMarkDone: (p)=>void, onDelete: (p)=>void }} props
 */
export function MyPostedCard({ post, onMarkDone, onDelete }) {
  const t = useTranslations('mine')
  const tr = useTranslations('rides')
  const router = useRouter()
  const active = post.status === 'active'
  const rel = relParts(ageMinFrom(post.createdAt))
  return (
    <article
      className={`rounded-ec-card border border-l-4 p-3.5 ${
        active
          ? 'border-ec-line border-l-ec-success bg-white shadow-ec-card'
          : 'border-ec-line border-l-ec-ink40 bg-ec-bg'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">
          {t('posted.postedAt')} · <b className="font-bold text-ec-ink">{tr(`time.${rel.key}`, { count: rel.count ?? 0 })}</b>
        </span>
        <StatusPill active={active} label={active ? t('posted.active') : t('posted.done')} />
      </div>

      <div className={active ? '' : 'opacity-[0.62]'}>
        <RouteRow from={post.from} to={post.to} />
        <div className="mt-2.5 border-t border-ec-line pt-2.5 text-[13px] font-semibold text-ec-ink60">
          {t('posted.vehicle')} : <span className="font-extrabold text-ec-ink">{post.vehicleType || t('posted.any')}</span>
          {post.fare ? <span className="font-extrabold text-ec-ink"> · ₹{post.fare}</span> : null}
          {post.date ? <span> · {post.date}</span> : null}
        </div>
      </div>

      {active && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onMarkDone(post)} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-ec-success/40 bg-ec-successBg/60 text-[13.5px] font-bold text-ec-successTx">
            <Check size={16} />{t('posted.markDone')}
          </button>
          <button type="button" onClick={() => router.push('/messages')} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-ec-blue/30 bg-ec-sky text-[13.5px] font-bold text-ec-blueInk">
            <Chat size={16} />{t('posted.chat')}
          </button>
          <button type="button" onClick={() => onDelete(post)} aria-label={t('posted.delete')} className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border-[1.5px] border-ec-danger/30 bg-ec-dangerBg text-ec-danger">
            <Trash size={16} />
          </button>
        </div>
      )}
    </article>
  )
}
