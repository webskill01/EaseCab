'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BellEdit, Pin } from '@/components/ui/icons'
import { usePushPreferences } from '../hooks/usePushPreferences'
import { useEnableAlerts } from '../hooks/useEnableAlerts'
import { useNearestCity } from '../hooks/useNearestCity'
import { permissionState } from '../lib/pushFlow'
import { geoDenied } from '../services/geoClient'
import { PermBlockedSheet, BLOCKED_PERM } from './PermBlockedSheet'
import { bubbleSupported, bubbleOn, setBubble } from '@/features/pwa/services/twaBubble'

function Toggle({ on, onChange, label, hint, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-50">
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-ec-ink">{label}</span>
        <span className="block text-[12px] font-medium text-ec-ink60">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-ec-blue' : 'bg-ec-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/**
 * Ride-alert settings (2026-10-24). Two controls only: the master on/off and alerts for
 * the city I'm in. WHICH rides alert is otherwise the feed city filter (one shared list,
 * useCityFilter): no filter = every ride; filter = those cities; geo on = filter cities +
 * my city, and the all-rides default switches off. Master off sets both per-source
 * toggles false server-side, so it holds across devices.
 */
export function NotificationSettings() {
  const t = useTranslations('settings')
  const tn = useTranslations('notifications')
  const { prefs, isLoading, isError, update } = usePushPreferences()
  const alerts = useEnableAlerts()
  const nearest = useNearestCity()
  const [help, setHelp] = useState(null) // BLOCKED_PERM while the fix dialog is open
  const [bubble, setBubbleState] = useState(bubbleOn)

  if (isLoading) return <div className="text-ec-ink40">…</div>
  if (isError || !prefs) return <p className="text-[13px] font-semibold text-ec-danger">{t('error.load')}</p>

  const masterOn = permissionState() === 'granted' && (!!prefs.notifyBotRides || !!prefs.notifyPostedRides)
  const filterNames = (prefs.cities ?? []).map((c) => c.name).join(', ')
  const mode = filterNames ? t('notifications.modeFilter', { cities: filterNames }) : prefs.geoCity ? t('notifications.modeGeo') : t('notifications.modeAll')

  const setMaster = async (next) => {
    if (!next) return update({ notifyBotRides: false, notifyPostedRides: false })
    if (permissionState() === 'denied') return setHelp(BLOCKED_PERM.NOTIFICATIONS)
    const res = await alerts.enable()
    if (res.permission === 'granted') update({ notifyBotRides: true, notifyPostedRides: true })
    else if (res.permission === 'denied') setHelp(BLOCKED_PERM.NOTIFICATIONS)
  }

  const setGeo = async (next) => {
    if (!next) return update({ notifyGeoCityId: null })
    const city = await nearest.locate()
    if (city) update({ notifyGeoCityId: city.id })
    else if (await geoDenied()) setHelp(BLOCKED_PERM.LOCATION)
  }

  return (
    <section className="rounded-2xl border border-ec-line bg-white p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ec-ink"><BellEdit size={16} /> {t('notifications.title')}</h2>
      <div className="mt-1 divide-y divide-ec-line">
        <Toggle on={masterOn} onChange={setMaster} disabled={alerts.isEnabling} label={t('notifications.master')} hint={mode} />
        <Toggle
          on={!!prefs.geoCity}
          onChange={setGeo}
          disabled={!masterOn || nearest.isLocating}
          label={t('notifications.geo')}
          hint={prefs.geoCity ? t('notifications.geoCity', { city: prefs.geoCity.name }) : t('notifications.geoHint')}
        />
        {bubbleSupported() && (
          <Toggle on={bubble} onChange={(next) => { setBubbleState(next); setBubble(next) }} label={t('notifications.bubble')} hint={t('notifications.bubbleHint')} />
        )}
      </div>
      {nearest.errorKey && !help && <p className="mt-1 text-[12px] font-semibold text-ec-danger">{tn(nearest.errorKey)}</p>}
      <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-ec-ink40"><Pin size={12} /> {t('notifications.filterNote')}</p>
      {help && (
        <PermBlockedSheet
          kind={help}
          onRetry={help === BLOCKED_PERM.LOCATION ? () => setGeo(true) : () => setMaster(true)}
          onClose={() => setHelp(null)}
        />
      )}
    </section>
  )
}
