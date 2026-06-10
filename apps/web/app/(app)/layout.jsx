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
      <div className="flex h-[100dvh] flex-col bg-ec-bg">
        <TopBar locale={locale} />
        {/* min-h-0 lets a full-height child (the feed) own its own scroll region */}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </AuthGuard>
  )
}
