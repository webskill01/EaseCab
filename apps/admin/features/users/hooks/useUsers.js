'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

  const query = useQuery({ queryKey: ['users', status, q, page], queryFn: () => fetchUsers(page, status, q) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const action = useMutation({
    mutationFn: ({ userId, action }) => updateUser(userId, action),
    onSuccess: invalidate,
  })

  return {
    items: query.data?.users ?? [],
    total: query.data?.meta?.total ?? 0,
    page, setPage, status, setStatus, q, setQ,
    isLoading: query.isLoading,
    isError: query.isError,
    action,
  }
}
