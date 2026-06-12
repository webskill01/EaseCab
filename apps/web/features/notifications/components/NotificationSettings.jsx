'use client'

import { useTranslations } from 'next-intl'
import { BellEdit, Pin, Trash } from '@/components/ui/icons'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { usePushPreferences } from '../hooks/usePushPreferences'

// SCREENS §6 "up to 5 city slots" (visual SoT). Always ≤ the server cap (25), so valid.
const ALERT_CITIES_MAX = 5

function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
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

/** Ride-alert preferences: per-source toggles + alert-city manager (Step 21d). */
export function NotificationSettings() {
  const t = useTranslations('settings')
  const { prefs, isLoading, isError, update } = usePushPreferences()

  if (isLoading) return <div className="text-ec-ink40">…</div>
  if (isError || !prefs) return <p className="text-[13px] font-semibold text-ec-danger">{t('error.load')}</p>

  const cities = prefs.cities ?? []
  const ids = prefs.notificationCities ?? []
  const atMax = cities.length >= ALERT_CITIES_MAX

  const addCity = (city) => { if (!ids.includes(city.id) && !atMax) update({ notificationCities: [...ids, city.id] }) }
  const removeCity = (id) => update({ notificationCities: ids.filter((c) => c !== id) })

  return (
    <section className="rounded-2xl border border-ec-line bg-white p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ec-ink"><BellEdit size={16} /> {t('notifications.title')}</h2>
      <div className="mt-1 divide-y divide-ec-line">
        <Toggle on={!!prefs.notifyBotRides} onChange={(v) => update({ notifyBotRides: v })} label={t('notifications.botRides')} hint={t('notifications.botRidesHint')} />
        <Toggle on={!!prefs.notifyPostedRides} onChange={(v) => update({ notifyPostedRides: v })} label={t('notifications.postedRides')} hint={t('notifications.postedRidesHint')} />
      </div>

      <div className="mt-3">
        <p className="text-[13px] font-extrabold text-ec-ink">{t('notifications.cities.title')}</p>
        {cities.length === 0 ? (
          <p className="mt-1 text-[12px] font-medium text-ec-ink40">{t('notifications.cities.empty')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-full bg-ec-sky px-3 py-1.5 text-[12px] font-bold text-ec-blue">
                <Pin size={12} /> {c.name}
                <button type="button" aria-label={t('notifications.cities.remove', { city: c.name })} onClick={() => removeCity(c.id)} className="text-ec-ink40 hover:text-ec-danger"><Trash size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        {atMax ? (
          <p className="mt-2 text-[12px] font-medium text-ec-ink40">{t('notifications.cities.max', { max: ALERT_CITIES_MAX })}</p>
        ) : (
          <div className="mt-3"><CityPicker label={t('notifications.cities.add')} value={null} onPick={addCity} /></div>
        )}
      </div>
    </section>
  )
}
