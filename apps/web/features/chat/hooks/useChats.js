'use client'

import { useQuery } from '@tanstack/react-query'
import { listChats } from '../services/chatApi'

/**
 * The caller's chat list (Step 22). API-driven (not Firestore — the list is
 * low-churn and needs server-side joins), refetched on window focus so reordering
 * and unread counts stay current. The live thread is where Firestore takes over.
 */
export function useChats() {
  const q = useQuery({ queryKey: ['chats'], queryFn: listChats, refetchOnWindowFocus: true })
  const chats = q.data ?? []
  return {
    chats,
    totalUnread: chats.reduce((n, c) => n + (c.unreadCount || 0), 0),
    isLoading: q.isLoading,
    isError: q.isError,
  }
}
