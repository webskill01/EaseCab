'use client'

import { useEffect } from 'react'
import { touchPresence } from '../services/chatApi'
import { PRESENCE_HEARTBEAT_MS } from '../lib/chatView'

/**
 * Presence heartbeat (P12-8): while a chat thread is mounted and the tab is visible,
 * POST a heartbeat so the OTHER party sees us online. Beats once immediately, then on
 * an interval; pauses when the tab is hidden and beats again on re-focus. Best-effort —
 * a failed beat is swallowed (the other side will just show us offline after the window).
 */
export function useChatPresence(chatId) {
  useEffect(() => {
    if (!chatId) return undefined
    let stopped = false
    const beat = () => { if (!stopped && !document.hidden) touchPresence(chatId).catch(() => {}) }

    beat()
    const id = setInterval(beat, PRESENCE_HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)

    return () => {
      stopped = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [chatId])
}
