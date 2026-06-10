import { PlaceholderScreen } from '@/features/shell/components/PlaceholderScreen'
import { LogoutButton } from '@/features/shell/components/LogoutButton'

/**
 * Profile — placeholder until Step 21 (profile / verification / membership / settings).
 * Logout lives here per the locked design (moved out of the top bar); the full
 * profile screen replaces this stub at Step 21.
 */
export default function ProfilePage() {
  return (
    <PlaceholderScreen titleKey="nav.profile">
      <div className="mt-6">
        <LogoutButton />
      </div>
    </PlaceholderScreen>
  )
}
