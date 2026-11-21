'use client'

import { useTranslations } from 'next-intl'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { BellEdit, Pin } from '@/components/ui/icons'
import { isNative, openAppSettings } from '../services/nativePush'

/** Which blocked permission the dialog explains. */
export const BLOCKED_PERM = Object.freeze({ NOTIFICATIONS: 'notifications', LOCATION: 'location' })

/**
 * "Turn it back on" dialog for a permission the user denied. Browsers never re-show the
 * OS prompt after a denial, so tapping the feature again would otherwise do nothing —
 * this walks them to phone Settings and lets them retry once they've switched it on.
 * @param {{ kind: 'notifications'|'location', onRetry?: () => void, onClose: () => void }} props
 */
export function PermBlockedSheet({ kind, onRetry, onClose }) {
  const t = useTranslations('notifications')
  const perm = t(`permHelp.perm.${kind}`)
  const steps = [t('permHelp.step1'), t('permHelp.step2', { perm }), t('permHelp.step3')]
  return (
    <StatusSheet
      tone="warning"
      icon={kind === BLOCKED_PERM.LOCATION ? <Pin size={24} /> : <BellEdit size={24} />}
      title={t('permHelp.title', { perm })}
      body={t('permHelp.intro')}
      onClose={onClose}
    >
      <ol className="flex flex-col gap-2 text-left">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-xl bg-ec-bg px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ec-blue text-[12px] font-extrabold text-white">{i + 1}</span>
            <span className="text-[13.5px] font-bold leading-snug text-ec-ink">{s}</span>
          </li>
        ))}
      </ol>
      {isNative() ? (
        <Button type="button" size="lg" onClick={openAppSettings} className="mt-3 w-full">{t('permHelp.openSettings')}</Button>
      ) : (
        <p className="mt-2.5 text-[11.5px] font-medium leading-snug text-ec-ink40">{t('permHelp.browser')}</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">{t('permHelp.later')}</Button>
        {onRetry && (
          <Button type="button" size="lg" onClick={() => { onClose(); onRetry() }} className="flex-1">{t('permHelp.retry')}</Button>
        )}
      </div>
    </StatusSheet>
  )
}
