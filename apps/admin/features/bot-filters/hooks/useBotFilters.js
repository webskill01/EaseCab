'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBotFilters, addBotFilter, removeBotFilter } from '../services/botFiltersApi'

/**
 * Bot filter editor controller: one list at a time (switching list resets page
 * and search), substring search, and add/remove mutations that refetch the list.
 */
export function useBotFilters(initialList) {
  const qc = useQueryClient()
  const [list, setListState] = useState(initialList)
  const [page, setPage] = useState(1)
  const [q, setQState] = useState('')

  const query = useQuery({ queryKey: ['botFilters', list, page, q], queryFn: () => fetchBotFilters(list, page, q) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['botFilters', list] })

  const add = useMutation({ mutationFn: (value) => addBotFilter(list, value), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id) => removeBotFilter(id), onSuccess: invalidate })

  return {
    list,
    setList: (next) => { setListState(next); setPage(1); setQState('') },
    page, setPage,
    q,
    setQ: (next) => { setQState(next); setPage(1) },
    items: query.data?.entries ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 50,
    isLoading: query.isLoading,
    isError: query.isError,
    add,
    remove,
  }
}
