import { AdminGuard } from '@/features/auth/components/AdminGuard'
import { Sidebar } from '@/features/shell/components/Sidebar'

/** Guarded panel shell — every route in this group requires an admin session. */
export default function PanelLayout({ children }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </AdminGuard>
  )
}
