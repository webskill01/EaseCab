import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPreferences, updatePreferences } from '../services/pushApi'

/**
 * Notification preferences for the settings screen. The PATCH response omits the
 * resolved `cities` names, so on success we invalidate to refetch the full snapshot
 * (toggles flip optimistically-fast either way since the query is already warm).
 */
export function usePushPreferences() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['pushPreferences'], queryFn: getPreferences, staleTime: 300000 })
  const m = useMutation({
    mutationFn: (body) => updatePreferences(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pushPreferences'] }),
  })
  return {
    prefs: q.data ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    update: (body) => m.mutate(body),
    saving: m.isPending,
    errorKey: m.isError ? 'error.save' : null,
  }
}
