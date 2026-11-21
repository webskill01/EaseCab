'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { clearUnread } from './useGroupMode'
import { markSeen, readSeen } from '../lib/groupView'
import { playInChatPop } from '../lib/inChatSound'

const AT_BOTTOM_PX = 80
const DIVIDER_GAP_PX = 12
const ms = (at) => new Date(at).getTime()
export const msgKey = (m) => `${m.kind}-${m.item.id}`

/**
 * Scroll-follow + read marker + unread divider + "N new rides" pill for a live thread.
 * `since` = the read marker when the chat opened: rides after it sit under the divider,
 * and the first load scrolls to that divider (WhatsApp) instead of the very bottom.
 */
export function useThreadFollow(groupKey, msgs) {
  const qc = useQueryClient()
  const scrollRef = useRef(null)
  const dividerRef = useRef(null)
  const first = useRef(true)
  // "Stuck to bottom" lives in a ref read before the DOM grows: a new bubble pushes the old
  // bottom >80px up, so re-measuring after the render would wrongly say "scrolled up".
  const stuck = useRef(true)
  const [since] = useState(() => readSeen()[groupKey] || 0)
  const [atBottom, setAtBottom] = useState(true)
  const [seenUpTo, setSeenUpTo] = useState(since)
  const newest = msgs.length ? ms(msgs[msgs.length - 1].at) : 0
  // Frozen at the first load: rides that land while the chat is open slide in, they never
  // spawn a divider row mid-chat (that popped in as a one-time full-chat jump).
  const opened = useRef(null)
  if (!opened.current && msgs.length) {
    const u = since ? msgs.find((m) => ms(m.at) >= since) : null
    opened.current = { keys: new Set(msgs.map(msgKey)), oldest: ms(msgs[0].at), anchor: u ? msgKey(u) : null }
  }
  const o = opened.current
  const firstUnread = o?.anchor ? msgs.findIndex((m) => msgKey(m) === o.anchor) : -1
  // Live = not in the first load (and not an older page loaded on demand).
  const isLive = (m) => Boolean(o) && !o.keys.has(msgKey(m)) && ms(m.at) >= o.oldest

  // Badge clears the moment the group opens and again on leave (no wait for a refetch).
  useEffect(() => {
    clearUnread(qc, groupKey)
    return () => { clearUnread(qc, groupKey); qc.invalidateQueries({ queryKey: ['groupSummary'] }) }
  }, [groupKey, qc])
  // A newer message than any shown (not the first load, not an older page) → in-chat pop.
  const lastNewest = useRef(0)
  useEffect(() => {
    if (lastNewest.current && newest > lastNewest.current && document.visibilityState === 'visible') playInChatPop()
    lastNewest.current = newest
  }, [newest])
  // Read marker = newest message actually shown (server time, +1ms past it), not the phone clock.
  useEffect(() => { if (newest && atBottom) markSeen(groupKey, newest + 1) }, [groupKey, newest, atBottom])

  // First load: land on the unread divider if any; after that, pin to the bottom while stuck.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !msgs.length) return
    if (first.current && dividerRef.current) {
      first.current = false
      el.scrollTop = dividerRef.current.offsetTop - DIVIDER_GAP_PX
      stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_PX
      return
    }
    first.current = false
    if (stuck.current) el.scrollTop = el.scrollHeight
  }, [msgs.length, newest]) // newest too: a full 50-row page swaps oldest→newest at the same length

  const onScroll = (e) => {
    const el = e.currentTarget
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_PX
    stuck.current = bottom
    setAtBottom(bottom)
    if (bottom) setSeenUpTo(newest)
  }
  const jumpDown = () => { stuck.current = true; scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }
  const unseen = atBottom ? 0 : msgs.filter((m) => ms(m.at) > seenUpTo).length
  const unreadCount = firstUnread >= 0 ? msgs.length - firstUnread : 0
  return { scrollRef, dividerRef, onScroll, jumpDown, unseen, firstUnread, unreadCount, isLive }
}
