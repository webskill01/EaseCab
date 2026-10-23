import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'EaseCab Admin',
  robots: 'noindex, nofollow',
  icons: { icon: '/logo.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'EC Admin', statusBarStyle: 'default' },
}

export const viewport = { themeColor: '#2563EB' }

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
