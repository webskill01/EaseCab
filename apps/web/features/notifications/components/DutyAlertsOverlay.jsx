'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Overlay, OverlayHeader } from '@/components/ui/Overlay'
import { BellEdit, Pin, Trash } from '@/components/ui/icons'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { usePushPreferences } from '../hooks/usePushPreferences'
import { useEnableAlerts } from '../hooks/useEnableAlerts'
import { permissionState } from '../lib/pushFlow'
import { getStoredToken } from '../lib/pushStorage'

// Design-spec §7.3 "up to 5 city slots". Always ≤ the server cap (25), so valid.
const ALERT_CITIES_MAX = 5

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="shrink-0">
      <span className={`relative block h-7 w-[46px] rounded-full transition-colors ${on ? 'bg-ec-blue' : 'bg-ec-line'}`}>
        <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${on ? 'left-[21px]' : 'left-[3px]'}`} />
      </span>
    </button>
  )
}

/**
 * "Get Duty Alerts" overlay (design-spec §7.3): a master notification toggle (drives
 * the real OS permission/token flow), up to 5 alert-city slots, Clear All, and a
 * sticky "Save Preferences" that persists notificationCities. Opened from the feed
 * notifications button (#5). Changes are batched locally and committed on Save.
 *
 * @param {{ onClose: () => void }} props
 */
export function DutyAlertsOverlay({ onClose }) {
  const t = useTranslations('notifications')
  const tc = useTranslations('common')
  const { prefs, isLoading, isError, update, saving } = usePushPreferences()
  const alerts = useEnableAlerts()

  const [slots, setSlots] = useState(null) // {id,name}[] — seeded from prefs once loaded
  const [notifOn, setNotifOn] = useState(false)

  // Seed local slots + the master-toggle state once preferences arrive.
  useEffect(() => {
    if (prefs && slots === null) {
      setSlots((prefs.cities ?? []).slice(0, ALERT_CITIES_MAX))
      setNotifOn(permissionState() === 'granted' && !!getStoredToken())
    }
  }, [prefs, slots])

  if (isLoading || slots === null) return <Overlay onClose={onClose} label={t('dutyAlerts.title')}><OverlayHeader title={t('dutyAlerts.title')} onBack={onClose} backLabel={tc('actions.back')} /><div className="p-6 text-center text-ec-ink40">…</div></Overlay>
  if (isError || !prefs) return <Overlay onClose={onClose} label={t('dutyAlerts.title')}><OverlayHeader title={t('dutyAlerts.title')} onBack={onClose} backLabel={tc('actions.back')} /><div className="p-6 text-center text-[13px] font-semibold text-ec-danger">{t('error.geo')}</div></Overlay>

  const ids = new Set(slots.map((s) => s.id))
  const addCity = (city) => { if (!ids.has(city.id) && slots.length < ALERT_CITIES_MAX) setSlots([...slots, city]) }
  const removeCity = (id) => setSlots(slots.filter((s) => s.id !== id))
  const clearAll = () => setSlots([])

  const toggleNotif = async (next) => {
    if (next) {
      const res = await alerts.enable()
      const granted = res.permission === 'granted'
      setNotifOn(granted)
      if (granted && res.city && !ids.has(res.city.id) && slots.length < ALERT_CITIES_MAX) {
        setSlots((cur) => [...cur, { id: res.city.id, name: res.city.canonicalName }])
      }
    } else {
      await alerts.disable()
      setNotifOn(false)
    }
  }

  const save = () => update({ notificationCities: slots.map((s) => s.id) }, { onSuccess: onClose })

  return (
    <Overlay onClose={onClose} label={t('dutyAlerts.title')}>
      <OverlayHeader title={t('dutyAlerts.title')} onBack={onClose} backLabel={tc('actions.back')} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3 rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card">
          <span className="inline-flex text-ec-blue"><BellEdit size={22} /></span>
          <div className="flex-1 text-[14.5px] font-bold text-ec-ink">{t('dutyAlerts.notifLabel')}</div>
          <Toggle on={notifOn} onChange={toggleNotif} label={t('dutyAlerts.notifLabel')} />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[16px] font-extrabold text-ec-ink">
            <span className="inline-flex text-ec-blue"><Pin size={20} /></span>{t('dutyAlerts.locationPrefs')}
          </div>
          <button type="button" onClick={clearAll} className="text-[13.5px] font-bold text-ec-danger">✕ {t('dutyAlerts.clearAll')}</button>
        </div>
        <p className="mb-3 mt-1 text-[12.5px] font-medium text-ec-ink60">{t('dutyAlerts.addUpTo', { max: ALERT_CITIES_MAX })}</p>

        {Array.from({ length: ALERT_CITIES_MAX }).map((_, i) => {
          const slot = slots[i]
          return (
            <div key={i} className="mb-3">
              <p className="mb-1.5 text-[12.5px] font-semibold text-ec-ink60">{t('dutyAlerts.locationN', { n: i + 1 })}</p>
              {slot ? (
                <div className="flex h-[50px] items-center gap-2 rounded-xl border border-ec-line bg-ec-sky px-3.5">
                  <span className="inline-flex text-ec-blue"><Pin size={16} /></span>
                  <span className="flex-1 truncate text-[14.5px] font-bold text-ec-ink">{slot.name}</span>
                  <button type="button" aria-label={t('dutyAlerts.remove', { city: slot.name })} onClick={() => removeCity(slot.id)} className="text-ec-ink40 hover:text-ec-danger"><Trash size={14} /></button>
                </div>
              ) : i === slots.length ? (
                <CityPicker label={t('dutyAlerts.searchCity')} value={null} onPick={addCity} />
              ) : (
                <div className="flex h-[50px] items-center gap-2 rounded-xl border border-ec-line bg-white px-3.5 text-[14.5px] font-medium text-ec-ink40">
                  <span className="inline-flex"><Pin size={16} /></span>{t('dutyAlerts.searchCity')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
        <button type="button" onClick={save} disabled={saving} className="h-[52px] w-full rounded-xl bg-ec-blueInk text-[15.5px] font-extrabold text-white disabled:opacity-60">
          {t('dutyAlerts.save')}
        </button>
      </div>
    </Overlay>
  )
}
