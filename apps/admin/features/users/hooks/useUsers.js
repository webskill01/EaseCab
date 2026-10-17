'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchUsers, updateUser } from '../services/usersApi'

/**
 * User-directory controller: paginated/filtered query + soft-delete/restore mutation.
 * The mutation invalidates the directory so a row moves between active/deleted lists.
 */
export function useUsers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const [q, setQ] = useState('')

  const query = useQuery({ queryKey: ['users', status, q, page], queryFn: () => fetchUsers(page, status, q), placeholderData: keepPreviousData })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const action = useMutation({
    mutationFn: ({ userId, action }) => updateUser(userId, action),
    onSuccess: invalidate,
    meta: { success: ({ action }) => (action === 'delete' ? 'User deleted' : 'User restored') },
  })

  return {
    items: query.data?.users ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    page, setPage, status, setStatus: (next) => { setStatus(next); setPage(1) }, q, setQ: (next) => { setQ(next); setPage(1) },
    isLoading: query.isLoading,
    isError: query.isError,
    action,
  }
}
