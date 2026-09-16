import { getLocale } from 'next-intl/server'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { TopBar } from '@/features/shell/components/TopBar'
import { AppBottomNav } from '@/features/shell/components/AppBottomNav'
import { PageTransition } from '@/features/shell/components/PageTransition'

/**
 * Authenticated app shell. AuthGuard (client) gates the whole subtree on a
 * session probe; TopBar carries the language switcher + logout. Locale is read
 * on the server so the first paint already has the right script font.
 */
export default async function AppLayout({ children }) {
  const locale = await getLocale()
  return (
    <AuthGuard>
      {/* fixed inset-0, not h-[100dvh]: Android Chrome/TWA can keep a stale dvh after
          returning from wa.me/tel:, pushing the bottom nav under the phone's nav bar. */}
      <div className="fixed inset-0 flex flex-col bg-ec-bg">
        <TopBar locale={locale} />
        {/* min-h-0 lets a full-height child (the feed) own its own scroll region */}
        <main className="flex min-h-0 flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
        <AppBottomNav />
      </div>
    </AuthGuard>
  )
}
