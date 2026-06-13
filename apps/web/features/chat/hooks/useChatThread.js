'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { mintFirebaseToken, sendMessage as sendApi, markRead } from '../services/chatApi'
import { subscribeToChat } from '../services/firestoreClient'

/**
 * Live thread for one chat (Step 22): mints a Firebase token, subscribes to the
 * Firestore messages subcollection + chat doc, exposes the live messages and meta
 * (isActive + participant ids + lastReadAt), sends through the API with an optimistic
 * bubble, and auto-marks inbound messages read while the thread is open.
 *
 * @param {string} chatId
 * @param {string} myId - the caller's user id (for optimistic bubbles + read logic)
 */
export function useChatThread(chatId, myId) {
  const qc = useQueryClient()
  const [live, setLive] = useState([])
  const [meta, setMeta] = useState({})
  const [pending, setPending] = useState([])
  const unsubRef = useRef(null)

  useEffect(() => {
    let active = true
    setLive([])
    setMeta({})
    setPending([])
    mintFirebaseToken().then((token) => {
      if (!active) return
      unsubRef.current = subscribeToChat({
        chatId,
        token,
        onMeta: setMeta,
        onMessages: (msgs) => {
          setLive(msgs)
          // Drop any optimistic message the snapshot has now confirmed by id.
          setPending((p) => p.filter((m) => !msgs.some((x) => x.id === m.id)))
        },
      })
    })
    return () => { active = false; if (unsubRef.current) unsubRef.current() }
  }, [chatId])

  // Auto mark-read whenever the thread holds inbound messages (idempotent server-side).
  useEffect(() => {
    if (live.some((m) => m.senderId !== myId)) {
      markRead(chatId).then(() => qc.invalidateQueries({ queryKey: ['chats'] })).catch(() => {})
    }
  }, [live, chatId, myId, qc])

  const send = useCallback(async (text) => {
    const tmp = { id: `tmp-${Date.now()}`, senderId: myId, messageText: text, sentAt: new Date().toISOString(), pending: true }
    setPending((p) => [...p, tmp])
    try {
      await sendApi(chatId, text)
      qc.invalidateQueries({ queryKey: ['chats'] })
    } catch (e) {
      setPending((p) => p.filter((m) => m.id !== tmp.id))
      throw e
    }
  }, [chatId, myId, qc])

  return { live, pending, meta, isActive: meta.isActive !== false, send }
}
