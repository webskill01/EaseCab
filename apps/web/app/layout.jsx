import './globals.css'
import { getLocale, getMessages } from 'next-intl/server'
import { fontClassFor } from '@/lib/fonts'
import { metadataIcons, appleWebApp, THEME_COLOR } from '@/lib/pwaMeta'
import { PwaRegister } from '@/features/pwa/components/PwaRegister'
import Providers from './providers'

export const metadata = {
  metadataBase: new URL('https://easecab.com'),
  title: 'EaseCab — Taxi Ride Leads',
  description:
    'Real-time taxi ride leads for drivers and vendors across Punjab, Haryana, and Delhi NCR.',
  manifest: '/manifest.webmanifest',
  icons: metadataIcons,
  appleWebApp,
}

// App-like feel in the TWA: no pinch/double-tap zoom (layout is already mobile-sized).
export const viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({ children }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={fontClassFor(locale)}>
      <body className="bg-background text-foreground antialiased">
        <PwaRegister />
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
