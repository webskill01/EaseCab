import { getLocale } from 'next-intl/server'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { TopBar } from '@/features/shell/components/TopBar'

/**
 * Authenticated app shell. AuthGuard (client) gates the whole subtree on a
 * session probe; TopBar carries the language switcher + logout. Locale is read
 * on the server so the first paint already has the right script font.
 */
export default async function AppLayout({ children }) {
  const locale = await getLocale()
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-ec-bg">
        <TopBar locale={locale} />
        <main className="flex-1 px-4 py-4">{children}</main>
      </div>
    </AuthGuard>
  )
}
