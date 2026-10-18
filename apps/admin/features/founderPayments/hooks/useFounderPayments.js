'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchFounderPayments, linkFounderPayment } from '../services/founderPaymentsApi'

/** Founder payments list + the link mutation (the refetched row then shows the member). */
export function useFounderPayments() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['founderPayments', page], queryFn: () => fetchFounderPayments(page), placeholderData: keepPreviousData })
  const link = useMutation({
    mutationFn: linkFounderPayment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['founderPayments'] }),
    meta: { success: 'Payment linked' },
  })

  return {
    page, setPage,
    items: query.data?.payments ?? [],
    unlinked: query.data?.unlinked ?? 0,
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    isLoading: query.isLoading,
    isError: query.isError,
    link,
  }
}
