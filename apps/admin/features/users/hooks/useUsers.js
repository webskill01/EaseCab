'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchUsers, fetchUser, updateUser } from '../services/usersApi'
import { useSessionState } from '@/features/shell/hooks/useSessionState'

/** Soft-delete/restore mutation shared by the directory and the profile page. */
function useUserAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, action }) => updateUser(userId, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    meta: { success: ({ action }) => (action === 'delete' ? 'User deleted' : 'User restored') },
  })
}

/**
 * User-directory controller: paginated query filtered by account status, membership
 * (plan) and join window (since launch hides pre-launch test accounts). Any filter
 * change goes back to page 1.
 */
export function useUsers() {
  const [page, setPage] = useSessionState('users:page', 1)
  const [filters, setFilters] = useSessionState('users:filters', { status: 'active', plan: 'all', joined: 'launch', q: '' })

  const query = useQuery({
    queryKey: ['users', filters, page],
    queryFn: () => fetchUsers({ page, ...filters }),
    placeholderData: keepPreviousData,
  })
  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }

  return {
    items: query.data?.users ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    page, setPage,
    ...filters,
    setStatus: setFilter('status'), setPlan: setFilter('plan'), setJoined: setFilter('joined'), setQ: setFilter('q'),
    isLoading: query.isLoading,
    isError: query.isError,
    action: useUserAction(),
  }
}

/** One user's full profile (admin user page). */
export function useUser(userId) {
  const query = useQuery({ queryKey: ['users', 'detail', userId], queryFn: () => fetchUser(userId) })
  return { user: query.data, isLoading: query.isLoading, isError: query.isError, action: useUserAction() }
}
