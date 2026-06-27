'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings'

/** Notifications screen — single shared destination for both the feed's Notifications
 * button and the profile → Notifications row (ride-alert prefs + alert cities). */
export default function NotificationsPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('notifications.title')} onBack={() => router.back()} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <NotificationSettings />
      </div>
    </div>
  )
}
