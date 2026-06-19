import { NotificationSettings } from '@/features/notifications/components/NotificationSettings'

/** Notifications screen (Profile → Notifications) — ride-alert prefs + alert cities. */
export default function NotificationsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-ec-bg p-4">
      <NotificationSettings />
    </div>
  )
}
