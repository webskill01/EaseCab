'use client'

import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queryClient'

/** Client-side provider stack — TanStack Query cache + PWA worker (no i18n; admin is English-only). */
export default function Providers({ children }) {
  const queryClient = getQueryClient()
  useEffect(() => {
    // Install-only worker (see public/sw.js); failure just means no install prompt.
    navigator.serviceWorker?.register('/sw.js').catch((err) => console.warn('sw register failed', err))
  }, [])
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
