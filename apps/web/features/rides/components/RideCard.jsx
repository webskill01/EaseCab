'use client'

import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Swap, Shield, Whatsapp, Phone, Flag, VehicleIcon } from '@/components/ui/icons'
import { statusOf, relParts, ageMinFrom, vehIconKey, pickCityName, rideDateParts, RIDE_DISPLAY_STATUS } from '../lib/rideView'

/** Status pill — Fresh (green dot) / Likely-booked (blue dot) / Verified (shield). */
export function StatusBadge({ status }) {
  const t = useTranslations('rides')
  if (status === RIDE_DISPLAY_STATUS.VERIFIED) {
    return (
      <span className="inline-flex h-[23px] items-center gap-1.5 rounded-ec-chip bg-ec-successBg px-2.5 text-[11.5px] font-extrabold text-ec-successTx">
        <span className="inline-flex text-ec-success"><Shield size={12} /></span>
        {t('status.verified')}
      </span>
    )
  }
  const booked = status === RIDE_DISPLAY_STATUS.BOOKED
  return (
    <span
      className={`inline-flex h-[23px] items-center gap-1.5 rounded-ec-chip px-2.5 text-[11.5px] font-extrabold ${
        booked ? 'bg-ec-bookedBg text-ec-bookedTx' : 'bg-ec-successBg text-ec-successTx'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${booked ? 'bg-ec-bookedTx' : 'bg-ec-success'}`} />
      {booked ? t('status.booked') : t('status.fresh')}
    </span>
  )
}

/** Pickup → Drop route row; renders "—" for an unknown drop. */
export function RouteRow({ from, to }) {
  const t = useTranslations('rides')
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <div className="mb-px text-[11.5px] font-bold text-ec-ink60">{t('card.pickup')}</div>
        <div className="truncate text-[16px] font-extrabold leading-tight tracking-tight text-ec-ink">{from || t('card.unknownCity')}</div>
      </div>
      <div className="shrink-0 pb-px text-ec-blue"><Swap size={17} /></div>
      <div className="min-w-0 flex-1 text-right">
        <div className="mb-px text-[11.5px] font-bold text-ec-ink60">{t('card.drop')}</div>
        <div className={`truncate text-[16px] font-extrabold leading-tight tracking-tight ${to ? 'text-ec-ink' : 'text-ec-ink40'}`}>{to || t('card.unknownCity')}</div>
      </div>
    </div>
  )
}

/** WhatsApp / Call / Report. Disabled (dim) when a bot ride has aged to "booked". */
function CardActions({ ride, disabled, onContact, onReport }) {
  const t = useTranslations('rides')
  const btn = 'flex h-[40px] items-center justify-center gap-1.5 rounded-[11px] text-[13.5px] font-bold text-white'
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : () => onContact(ride, 'wa')}
        className={`${btn} flex-1 ${disabled ? 'cursor-default bg-ec-disabled' : 'bg-ec-wa'}`}
      >
        <Whatsapp size={17} />{t('actions.whatsapp')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={disabled ? undefined : () => onContact(ride, 'call')}
        className={`${btn} flex-1 ${disabled ? 'cursor-default bg-ec-disabled' : 'bg-ec-blue'}`}
      >
        <Phone size={16} />{t('actions.call')}
      </button>
      <button
        type="button"
        onClick={() => onReport(ride)}
        aria-label={t('actions.report')}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-[11px] bg-ec-dangerBg text-ec-danger"
      >
        <Flag size={17} />
      </button>
    </div>
  )
}

/** Verified-ride poster block (dirA): initials avatar + name + Verified-driver line,
 * with a "View profile" button → /u/[id]. Only rendered when the ride carries a posterId. */
function PosterRow({ ride }) {
  const t = useTranslations('rides')
  const router = useRouter()
  const initial = (ride.posterName || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="mt-2 flex items-center gap-2.5 border-t border-ec-line pt-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ec-sky text-[15px] font-extrabold text-ec-blue">{initial}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-extrabold text-ec-ink">{ride.posterName || '—'}</span>
          {ride.verifiedDriver && <span className="inline-flex text-ec-success"><Shield size={13} /></span>}
        </div>
        <div className="truncate text-[11.5px] font-medium text-ec-ink60">
          {[ride.posterBaseCity, ride.verifiedDriver ? t('card.verifiedDriver') : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/u/${ride.posterId}`)}
        className="h-8 shrink-0 rounded-[9px] bg-ec-blueInk px-3 text-[12px] font-bold text-white"
      >
        {t('card.viewProfile')}
      </button>
    </div>
  )
}

/**
 * Ride card — CardA "Professional" (design_handoff dirA.jsx). Bot rides grey out +
 * read "Likely booked" past the 5-min fresh window; verified rides get a blue accent
 * + Verified badge. `now` is injected so the card ages live without re-fetching.
 *
 * @param {object} props
 * @param {object} props.ride - a normalized ride VM (see lib/normalize)
 * @param {number} props.now - epoch ms for live ageing
 * @param {(ride: object, channel: 'wa'|'call') => void} props.onContact
 * @param {(ride: object) => void} props.onReport
 */
export function RideCard({ ride, now, onContact, onReport }) {
  const t = useTranslations('rides')
  const locale = useLocale()
  const verified = ride.kind === 'verified'
  const ageMin = ageMinFrom(ride.receivedAt, now)
  const display = statusOf({ kind: ride.kind, status: ride.status, ageMin })
  const booked = display === RIDE_DISPLAY_STATUS.BOOKED
  const rel = relParts(ageMin)
  const from = pickCityName(ride.from, ride.fromLocalized, locale)
  const to = pickCityName(ride.to, ride.toLocalized, locale)
  const dateParts = verified ? rideDateParts(ride.date, locale, now) : null

  return (
    <article
      data-status={display}
      className={`relative rounded-ec-card border p-3 shadow-ec-card transition-opacity ${
        verified ? 'border-ec-blue/20 bg-white' : 'border-ec-line bg-white'
      } ${booked ? 'opacity-[0.66] grayscale-[0.55]' : ''}`}
    >
      {verified && <div className="absolute left-3 right-3 top-0 h-[3px] rounded-b-[3px] bg-ec-blue" />}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">
          {t('card.postedAt')} · <b className="font-bold text-ec-ink">{t(`time.${rel.key}`, { count: rel.count ?? 0 })}</b>
        </span>
        <StatusBadge status={display} />
      </div>

      <RouteRow from={from} to={to} />

      {verified && ride.posterId ? <PosterRow ride={ride} /> : null}

      <div className="mt-2 border-t border-ec-line pt-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-semibold text-ec-ink60">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="inline-flex shrink-0 text-ec-ink40"><VehicleIcon vehicleKey={vehIconKey(ride.vehicleType)} size={15} /></span>
            <span className="truncate font-extrabold text-ec-ink">{ride.vehicleType || t('card.unknownCity')}</span>
          </span>
          {verified && ride.fare ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-ec-sky px-2 py-0.5 text-[12.5px] font-extrabold text-ec-blueInk">₹{ride.fare}</span>
          ) : null}
          {dateParts ? (
            <span className="shrink-0 text-[12.5px] font-semibold text-ec-ink60">{dateParts.text ?? t(`time.${dateParts.key}`)}</span>
          ) : null}
        </div>
        {ride.message ? (
          <p className="mt-1.5 whitespace-pre-line break-words text-[12.5px] font-medium leading-snug text-ec-ink60">{ride.message}</p>
        ) : null}
      </div>

      <div className="mt-2">
        <CardActions ride={ride} disabled={booked} onContact={onContact} onReport={onReport} />
      </div>
    </article>
  )
}
