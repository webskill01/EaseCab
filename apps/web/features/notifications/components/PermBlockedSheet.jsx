'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { BellEdit, Pin } from '@/components/ui/icons'

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
  const tc = useTranslations('common')
  const perm = t(`permHelp.perm.${kind}`)
  const steps = [t('permHelp.step1'), t('permHelp.step2', { perm }), t('permHelp.step3')]
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('permHelp.title', { perm })}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ec-warnBg text-ec-warning">
        {kind === BLOCKED_PERM.LOCATION ? <Pin size={22} /> : <BellEdit size={22} />}
      </span>
      <h2 className="mt-3 pr-9 text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{t('permHelp.title', { perm })}</h2>
      <p className="mt-1 text-[13px] font-medium leading-snug text-ec-ink60">{t('permHelp.intro')}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-xl bg-ec-bg px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ec-blue text-[12px] font-extrabold text-white">{i + 1}</span>
            <span className="text-[13.5px] font-bold leading-snug text-ec-ink">{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 text-[11.5px] font-medium leading-snug text-ec-ink40">{t('permHelp.browser')}</p>
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">{t('permHelp.later')}</Button>
        {onRetry && (
          <Button type="button" size="lg" onClick={() => { onClose(); onRetry() }} className="flex-1">{t('permHelp.retry')}</Button>
        )}
      </div>
    </BottomSheet>
  )
}
