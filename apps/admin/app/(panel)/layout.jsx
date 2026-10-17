import { AdminGuard } from '@/features/auth/components/AdminGuard'
import { PanelShell } from '@/features/shell/components/PanelShell'

/** Guarded panel shell — every route in this group requires an admin session. */
export default function PanelLayout({ children }) {
  return (
    <AdminGuard>
      <PanelShell>{children}</PanelShell>
    </AdminGuard>
  )
}
