'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchWaInvites, setWaInviteStatus } from '../services/waInvitesApi'
import { useSessionState } from '@/features/shell/hooks/useSessionState'

/**
 * Group links controller (Phase 29): one status tab at a time, name search, avoid /
 * restore. Refetches on window focus, so after joining in WhatsApp and coming back the
 * link has moved to Joined once the bot sees the group.
 */
export function useWaInvites() {
  const qc = useQueryClient()
  const [page, setPage] = useSessionState('waInvites:page', 1)
  const [status, setStatusState] = useSessionState('waInvites:status', 'new')
  const [q, setQState] = useSessionState('waInvites:q', '')

  const query = useQuery({ queryKey: ['waInvites', page, status, q], queryFn: () => fetchWaInvites({ page, status, q }), placeholderData: keepPreviousData })
  const setLinkStatus = useMutation({
    mutationFn: ({ id, status: next }) => setWaInviteStatus(id, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waInvites'] }),
    meta: { success: ({ status: next }) => (next === 'avoided' ? 'Link avoided — it won\u2019t show again' : 'Link back in New') },
  })

  return {
    page, setPage,
    status, setStatus: (next) => { setStatusState(next); setPage(1) },
    q, setQ: (next) => { setQState(next); setPage(1) },
    items: query.data?.links ?? [],
    counts: query.data?.counts ?? { new: 0, joined: 0, avoided: 0, invalid: 0 },
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 50,
    isLoading: query.isLoading,
    isError: query.isError,
    setLinkStatus,
  }
}
