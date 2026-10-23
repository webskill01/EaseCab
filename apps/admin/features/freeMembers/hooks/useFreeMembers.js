'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFreeMembers, addFreeMember, removeFreeMember } from '../services/freeMembersApi'

/** Free members list + add/remove. Both change analytics, so every query refetches. */
export function useFreeMembers() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['freeMembers'], queryFn: fetchFreeMembers })
  const refresh = () => qc.invalidateQueries()
  const add = useMutation({ mutationFn: addFreeMember, onSuccess: refresh, meta: { success: 'Free member added' } })
  const remove = useMutation({ mutationFn: removeFreeMember, onSuccess: refresh, meta: { success: 'Removed from free list' } })

  return { items: query.data ?? [], isLoading: query.isLoading, isError: query.isError, add, remove }
}
