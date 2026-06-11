'use client'

import { useTranslations } from 'next-intl'
import { Check, Trash, Repeat, Chat } from '@/components/ui/icons'
import { RouteRow } from './RideCard'

/**
 * My Rides → Posted card. Shows the user's own post + lifecycle actions. Repost +
 * View-chats are deferred (Step 20-adjacent / Step 22) → rendered disabled.
 * @param {{ post: object, onMarkDone: (p)=>void, onDelete: (p)=>void }} props
 */
export function MyPostedCard({ post, onMarkDone, onDelete }) {
  const t = useTranslations('mine')
  const active = post.status === 'active'
  return (
    <article className="rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">
          {active ? t('posted.active') : t('posted.done')}
        </span>
        {post.fare ? <span className="text-[13px] font-extrabold text-ec-ink">₹{post.fare}</span> : null}
      </div>
      <RouteRow from={post.from} to={post.to} />
      <div className="mt-2.5 border-t border-ec-line pt-2.5 text-[13px] font-semibold text-ec-ink60">
        {t('posted.vehicle')} : <span className="font-extrabold text-ec-ink">{post.vehicleType || t('posted.any')}</span>
      </div>
      {active && (
        <div className="mt-2.5 flex gap-1.5">
          <button type="button" onClick={() => onMarkDone(post)} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-ec-blue text-[13.5px] font-bold text-white">
            <Check size={16} />{t('posted.markDone')}
          </button>
          <button type="button" disabled aria-label={t('posted.repost')} className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-ec-bg text-ec-ink40">
            <Repeat size={16} />
          </button>
          <button type="button" disabled aria-label={t('posted.viewChats')} className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-ec-bg text-ec-ink40">
            <Chat size={16} />
          </button>
          <button type="button" onClick={() => onDelete(post)} aria-label={t('posted.delete')} className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-ec-dangerBg text-ec-danger">
            <Trash size={16} />
          </button>
        </div>
      )}
    </article>
  )
}
