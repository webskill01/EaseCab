import { QueryClient, MutationCache, isServer } from '@tanstack/react-query'
import { toast } from './toast'

/**
 * Builds a QueryClient with admin defaults: 60s staleTime and no retries on 4xx
 * (an AUTH_REQUIRED / NOT_FOUND won't fix itself by retrying).
 * @returns {QueryClient}
 */
function makeQueryClient() {
  const client = new QueryClient({
    // Every mutation reports its outcome as a toast (see lib/toast.js).
    mutationCache: new MutationCache({
      onSuccess: (_data, variables, _ctx, mutation) => {
        const msg = mutation.meta?.success
        if (msg) toast(typeof msg === 'function' ? msg(variables) : msg)
        client.invalidateQueries({ queryKey: ['admin-stats'] }) // sidebar queue badges
      },
      onError: (error) => toast(error?.message || 'Something went wrong', 'error'),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          const status = error?.status ?? 0
          if (status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
  return client
}

let browserQueryClient

/**
 * One client per request on the server; a lazy singleton in the browser
 * (the TanStack-recommended App Router pattern).
 * @returns {QueryClient}
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
