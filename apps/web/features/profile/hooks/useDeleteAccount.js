import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '../services/accountApi'
import { unregisterToken } from '@/features/notifications/services/pushApi'
import { getStoredToken, clearStoredToken } from '@/features/notifications/lib/pushStorage'

/**
 * Soft-delete the account, then tear the session down like logout (drop this device's
 * push token, send the user to /login). Only redirects on success — a failed delete
 * surfaces via `error` so the user isn't dumped at login thinking it worked.
 */
export function useDeleteAccount() {
  const router = useRouter()
  const m = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      const tok = getStoredToken()
      if (tok) { await unregisterToken({ deviceToken: tok }).catch(() => {}); clearStoredToken() }
      router.replace('/login')
    },
  })
  return { run: () => m.mutate(), submitting: m.isPending, error: m.isError }
}
