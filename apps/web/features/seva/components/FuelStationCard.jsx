'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FUEL_TYPES, FUEL_REPORT_KIND } from '@easecab/shared'
import { GasStation, ArrowR, X, Check } from '@/components/ui/icons'
import { MAP_COLORS } from '../lib/mapIcons'

const DAY_MS = 86400000
/** Whole days since `at` (0 = today). */
export const daysSince = (at, now = Date.now()) => Math.floor((now - new Date(at).getTime()) / DAY_MS)
const MAPS_DIR = 'https://www.google.com/maps/dir/?api=1'
/** Straight to the pump; on a route, pickup → pump → drop (no origin = Maps uses the phone's position). */
export const mapsUrl = (s, route) => (route
  ? `${MAPS_DIR}${route.fromMe ? '' : `&origin=${route.from.lat},${route.from.lng}`}&destination=${route.to.lat},${route.to.lng}&waypoints=${s.lat},${s.lng}`
  : `${MAPS_DIR}&destination=${s.lat},${s.lng}`)

/** Which report buttons a station shows for the selected fuel. */
const reportKinds = (fuel) => (fuel === FUEL_TYPES.CNG ? [FUEL_REPORT_KIND.CNG_YES, FUEL_REPORT_KIND.CNG_NO, FUEL_REPORT_KIND.CLOSED] : [FUEL_REPORT_KIND.CLOSED])
const STAGGER_MS = 35
const MAX_STAGGER = 8


/** Fuel-coloured disc matching the map pin. */
const Disc = ({ fuel, big = false }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full text-white ${big ? 'h-12 w-12' : 'h-10 w-10'}`} style={{ backgroundColor: MAP_COLORS[fuel] }}>
    <GasStation size={big ? 24 : 20} />
  </span>
)

function Meta({ station, fuel, route }) {
  const t = useTranslations('seva.fuel')
  return (
    <>
      <p className="mt-0.5 truncate text-[12.5px] font-medium text-ec-ink60">
        {t(`brands.${station.brand}`)}{station.address ? ` · ${station.address}` : ''}
      </p>
      {route && <p className="mt-0.5 text-[12px] font-semibold text-ec-ink60">{t('off', { km: station.offKm })}</p>}
      {fuel === FUEL_TYPES.CNG && station.cngConfirmedAt && (
        <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-ec-successTx"><Check size={14} />{t('confirmed', { days: daysSince(station.cngConfirmedAt) })}</p>
      )}
    </>
  )
}

const distance = (t, s, route) => (route ? t('along', { km: Math.round(s.alongKm) }) : t('km', { km: s.distanceKm }))

/** One list row: tap opens the pump; the round arrow starts navigation straight away. */
export function FuelStationRow({ station, fuel, route, index, onOpen }) {
  const t = useTranslations('seva.fuel')
  return (
    <li className="flex animate-ec-rise items-center gap-3 border-b border-ec-line/70 py-3 last:border-b-0 motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` }}>
      <button type="button" onClick={() => onOpen(station.id)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
        <Disc fuel={fuel} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ec-ink">{station.name}</span>
            <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-ec-blue">{distance(t, station, route)}</span>
          </span>
          <Meta station={station} fuel={fuel} route={route} />
        </span>
      </button>
      <a href={mapsUrl(station, route)} target="_blank" rel="noopener noreferrer" aria-label={t('navigate')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ec-sky text-ec-blue transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
        <ArrowR size={20} />
      </a>
    </li>
  )
}

/** The tapped pump: big navigate button + driver reports. */
export function FuelStationDetail({ station, fuel, route, onReport, onClose }) {
  const t = useTranslations('seva.fuel')
  const [sent, setSent] = useState(false)
  const report = (kind) => { setSent(true); onReport(station.id, kind) }
  return (
    <div className="animate-ec-rise motion-reduce:animate-none">
      <div className="flex items-start gap-3">
        <Disc fuel={fuel} big />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-extrabold leading-snug text-ec-ink [text-wrap:balance]">{station.name}</h2>
          <Meta station={station} fuel={fuel} route={route} />
        </div>
        <button type="button" onClick={onClose} aria-label={t('sheet.close')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ec-bg text-ec-ink60 active:bg-ec-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
          <X size={18} />
        </button>
      </div>
      <a href={mapsUrl(station, route)} target="_blank" rel="noopener noreferrer"
        className="mt-3 flex h-12 items-center justify-center gap-2 rounded-ec-chip bg-ec-blue text-[15px] font-extrabold text-white shadow-ec-blue transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blueInk focus-visible:ring-offset-2">
        {t('navigate')} <span className="font-bold opacity-80 tabular-nums">· {distance(t, station, route)}</span>
      </a>
      {sent ? (
        <p role="status" className="mt-3 animate-ec-fade text-center text-[12.5px] font-bold text-ec-ink60">{t('thanks')}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          {reportKinds(fuel).map((k) => (
            <button key={k} type="button" onClick={() => report(k)}
              className="min-h-[36px] flex-1 rounded-ec-chip border border-ec-line bg-white px-2 text-[12.5px] font-bold text-ec-ink transition-colors active:bg-ec-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
              {t(`report.${k}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
