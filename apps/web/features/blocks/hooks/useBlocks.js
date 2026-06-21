'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBlocks, unblockUser } from '../services/blocksApi'

/**
 * Blocked-users list + unblock mutation. Optimistically drops the row on unblock
 * (the action is idempotent and the list is small), rolling back if the call fails.
 */
export function useBlocks() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['blocks'], queryFn: listBlocks })

  const unblock = useMutation({
    mutationFn: unblockUser,
    onMutate: async (blockedId) => {
      await qc.cancelQueries({ queryKey: ['blocks'] })
      const prev = qc.getQueryData(['blocks'])
      qc.setQueryData(['blocks'], (rows) => (rows ?? []).filter((r) => r.blockedId !== blockedId))
      return { prev }
    },
    onError: (_e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(['blocks'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  })

  return {
    blocks: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    unblock: unblock.mutate,
    unblockingId: unblock.isPending ? unblock.variables : null,
  }
}
