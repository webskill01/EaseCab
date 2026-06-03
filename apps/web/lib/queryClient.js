import { QueryClient, isServer } from '@tanstack/react-query'

/**
 * Builds a QueryClient with EaseCab defaults: 5min staleTime (profile default,
 * CLAUDE.md §15 — feed queries override to 0), and no retries on 4xx (an
 * AUTH_REQUIRED / NOT_FOUND won't fix itself by retrying).
 * @returns {QueryClient}
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          const status = error?.status ?? 0
          if (status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
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
