'use client'

import { NextIntlClientProvider } from 'next-intl'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queryClient'

/**
 * Client-side provider stack: i18n messages + TanStack Query cache.
 * locale + messages are resolved on the server and passed down.
 */
export default function Providers({ locale, messages, children }) {
  const queryClient = getQueryClient()
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  )
}
