import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProfile } from '../services/profileApi'

/**
 * PATCH /me/profile mutation. On success refreshes the ['profile'] cache and exposes
 * the updated profile (callers read `data.profileComplete`). Errors map to a generic
 * profile i18n key (§9).
 */
export function useUpdateProfile() {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (body) => updateProfile(body),
    onSuccess: (data) => qc.setQueryData(['profile'], data),
  })
  return {
    save: (body) => m.mutate(body),
    data: m.data ?? null,
    saving: m.isPending,
    saved: m.isSuccess,
    errorKey: m.isError ? 'error.save' : null,
  }
}
