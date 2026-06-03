import './globals.css'
import { getLocale, getMessages } from 'next-intl/server'
import { fontClassFor } from '@/lib/fonts'
import Providers from './providers'

export const metadata = {
  title: 'EaseCab — Taxi Ride Leads',
  description:
    'Real-time taxi ride leads for drivers and vendors across Punjab, Haryana, and Delhi NCR.',
}

export default async function RootLayout({ children }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={fontClassFor(locale)}>
      <body className="bg-background text-foreground antialiased">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
