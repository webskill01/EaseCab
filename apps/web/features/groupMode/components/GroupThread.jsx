'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevL, ChevR } from '@/components/ui/icons'
import { ContactSheet } from '@/features/rides/components/ContactSheet'
import { pickCityName } from '@/features/rides/lib/rideView'
import { STREAM_STATUS } from '@/features/rides/hooks/useRideStream'
import { getMembership } from '@/features/subscription/services/subscriptionApi'
import { membershipView } from '@/features/subscription/lib/membership'
import { env } from '@/config/env'
import { useGroupMode, useGroupThread } from '../hooks/useGroupMode'
import { useThreadFollow, msgKey } from '../hooks/useThreadFollow'
import { useSwipeBack } from '../hooks/useGestures'
import { GROUP_KEY, istDayKey, groupNumber } from '../lib/groupView'
import { groupNav } from '../lib/inChatSound'
import { GroupAvatar } from './GroupListScreen'
import { RideBubble, DutyBubble } from './ThreadBubbles'
import { BubbleActions } from './BubbleActions'

const ms = (at) => new Date(at).getTime()
const SHIMMER = 'animate-ec-shimmer rounded-2xl rounded-tl-sm bg-[linear-gradient(90deg,#fff_25%,#f0f0f0_50%,#fff_75%)] bg-[length:200%_100%] shadow-ec-card'
const SKELETON_ROWS = [[78, 64], [62, 48], [84, 80], [55, 44], [70, 60], [66, 52], [80, 72], [58, 48], [74, 64], [64, 56], [82, 76], [60, 52]] // [width %, height px]
const WALLPAPER = "bg-[#EFEAE2] bg-[url('/chat-doodle.svg')] bg-[length:160px_160px]"

/** Shimmering bubble placeholders while a thread's first page loads. */
function ThreadSkeleton() {
  return (
    <div aria-hidden className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden">
      {SKELETON_ROWS.map(([w, h], i) => <div key={i} className={SHIMMER} style={{ width: `${w}%`, height: h }} />)}
    </div>
  )
}

function useTitle(groupKey) {
  const t = useTranslations('rides.group')
  const locale = useLocale()
  const { groups } = useGroupMode()
  if (groupKey === GROUP_KEY.ALL) return t('allGroup')
  if (groupKey === GROUP_KEY.DUTIES) return t('dutiesGroup')
  const g = groups.find((x) => x.cityId === groupKey)
  return g ? t('cityGroup', { city: pickCityName(g.name, { pa: g.namePa, hi: g.nameHi }, locale) }) : t('title')
}

/** Header subtitle: green "● Live" while the ride stream is connected, else the 24h note. */
function LiveLine({ stream }) {
  const t = useTranslations('rides.group')
  if (stream === STREAM_STATUS.LIVE) {
    return (
      <p className="flex items-center gap-1.5 truncate text-[11.5px] font-bold text-ec-waDeep">
        <span className="inline-flex h-2 w-2 rounded-full bg-ec-wa" />
        {t('live')} · <span className="font-semibold text-ec-ink60">{t('readOnly')}</span>
      </p>
    )
  }
  const reconnecting = stream === STREAM_STATUS.RECONNECTING || stream === STREAM_STATUS.CONNECTING
  if (!reconnecting) return <p className="truncate text-[11.5px] font-semibold text-ec-ink60">{t('readOnly')}</p>
  return (
    <p className="flex items-center gap-1.5 truncate text-[11.5px] font-bold text-ec-ink60">
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-ec-wa" />{t('reconnecting')}
    </p>
  )
}

function Empty({ isError }) {
  const t = useTranslations('rides.group')
  return (
    <div className="m-auto max-w-[80%] rounded-2xl bg-white/90 px-4 py-3 text-center shadow-ec-card">
      <p className="text-[14px] font-bold text-ec-ink">{isError ? t('loadError') : t('emptyTitle')}</p>
      {!isError && <p className="mt-0.5 text-[12.5px] font-semibold text-ec-ink60">{t('empty')}</p>}
    </div>
  )
}

function Messages({ msgs, follow, onContact, onHold }) {
  const t = useTranslations('rides.group')
  const [today] = useState(() => istDayKey(Date.now()))
  const days = msgs.map((m) => istDayKey(m.at))
  return msgs.map((m, i) => {
    const live = follow.isLive(m)
    return (
      <Fragment key={msgKey(m)}>
        {days[i] !== days[i - 1] && <p className="mx-auto my-1 rounded-lg bg-white/90 px-2.5 py-0.5 text-[11.5px] font-semibold text-ec-ink60">{days[i] === today ? t('today') : t('yesterday')}</p>}
        {i === follow.firstUnread && (
          <p ref={follow.dividerRef} className="-mx-3 my-1.5 bg-white/70 py-1 text-center text-[12px] font-bold text-ec-ink60">{t('unreadDivider', { n: follow.unreadCount })}</p>
        )}
        {m.kind === 'ride'
          ? <RideBubble ride={m.item} onContact={onContact} onHold={onHold} live={live} />
          : <DutyBubble post={m.item} onContact={onContact} onHold={onHold} live={live} />}
      </Fragment>
    )
  })
}

/** Read-only WhatsApp-style thread for one group (newest at the bottom, live). */
export function GroupThread({ groupKey }) {
  const t = useTranslations('rides.group')
  const router = useRouter()
  const qc = useQueryClient()
  const title = useTitle(groupKey)
  const { groups } = useGroupMode()
  const thread = useGroupThread(groupKey)
  const msgs = thread.messages
  const follow = useThreadFollow(groupKey, msgs)
  // Back (button or swipe) slides the chat out, then the list fades in (groupNav.back).
  const swipe = useSwipeBack(() => { groupNav.back = true; router.back() })
  const [contact, setContact] = useState(null)
  const [held, setHeld] = useState(null)
  const membershipQuery = useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
  const membership = membershipQuery.data ? membershipView(membershipQuery.data) : { state: null }

  if (thread.error?.code === 'SUBSCRIPTION_EXPIRED') { qc.invalidateQueries({ queryKey: ['membership'] }); router.replace('/feed'); return null }

  return (
    <div {...swipe.bind} className={`flex min-h-0 flex-1 animate-ec-thread-in flex-col overflow-x-hidden ${WALLPAPER}`}>
      <div className="flex items-center gap-2.5 bg-white px-2 py-2 shadow-ec-card">
        <button type="button" onClick={swipe.leave} aria-label={t('back')} className="flex h-10 w-8 items-center justify-center text-ec-ink"><ChevL size={22} /></button>
        <GroupAvatar groupKey={groupKey} num={groupNumber(groupKey, groups)} size={38} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-extrabold text-ec-ink">{title}</p>
          <LiveLine stream={thread.stream} />
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={follow.scrollRef} onScroll={follow.onScroll} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-3 py-3">
          {thread.hasOlder && (
            <button type="button" onClick={thread.loadOlder} disabled={thread.loadingOlder}
              className="mx-auto mb-1 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-ec-ink60 shadow-ec-card">
              {thread.loadingOlder ? '…' : t('loadOlder')}
            </button>
          )}
          {thread.isLoading && <ThreadSkeleton />}
          {!thread.isLoading && msgs.length === 0 && <Empty isError={thread.isError} />}
          <Messages msgs={msgs} follow={follow} onContact={setContact} onHold={setHeld} />
        </div>
        {follow.unseen > 0 && (
          // Centering on a wrapper: the button's pop animation owns `transform`, which would wipe a translate-x.
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <button type="button" onClick={follow.jumpDown}
              className="pointer-events-auto inline-flex h-[38px] animate-ec-pop items-center gap-1.5 rounded-ec-chip bg-ec-wa px-4 text-[13px] font-extrabold text-white shadow-ec-float">
              <span className="inline-flex rotate-90"><ChevR size={15} /></span>{follow.unseen} {t('newRides')}
            </button>
          </div>
        )}
      </div>
      {held && <BubbleActions target={held} onClose={() => setHeld(null)} onContact={setContact} />}
      {contact && (
        <ContactSheet
          ride={contact}
          membershipState={membership.state}
          membershipLoading={membershipQuery.isPending}
          onClose={() => setContact(null)}
          onUpgrade={() => { setContact(null); router.push('/membership') }}
          onVerify={() => { setContact(null); router.push(env.NEXT_PUBLIC_VERIFICATION_ENABLED ? '/verify?intent=l1' : '/profile/edit') }}
        />
      )}
    </div>
  )
}
