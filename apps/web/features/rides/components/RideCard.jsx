'use client'

import { useTranslations } from 'next-intl'
import { Swap, Shield, Whatsapp, Phone, Flag, VehicleIcon } from '@/components/ui/icons'
import { statusOf, relParts, ageMinFrom, vehIconKey, RIDE_DISPLAY_STATUS } from '../lib/rideView'

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
        <div className="truncate text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{from || t('card.unknownCity')}</div>
      </div>
      <div className="shrink-0 pb-px text-ec-blue"><Swap size={17} /></div>
      <div className="min-w-0 flex-1 text-right">
        <div className="mb-px text-[11.5px] font-bold text-ec-ink60">{t('card.drop')}</div>
        <div className={`truncate text-[18px] font-extrabold leading-tight tracking-tight ${to ? 'text-ec-ink' : 'text-ec-ink40'}`}>{to || t('card.unknownCity')}</div>
      </div>
    </div>
  )
}

/** WhatsApp / Call / Report. Disabled (dim) when a bot ride has aged to "booked". */
function CardActions({ ride, disabled, onContact, onReport }) {
  const t = useTranslations('rides')
  const btn = 'flex h-[42px] items-center justify-center gap-1.5 rounded-[11px] text-[13.5px] font-bold text-white'
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
        className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-ec-dangerBg text-ec-danger"
      >
        <Flag size={17} />
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
  const verified = ride.kind === 'verified'
  const ageMin = ageMinFrom(ride.receivedAt, now)
  const display = statusOf({ kind: ride.kind, status: ride.status, ageMin })
  const booked = display === RIDE_DISPLAY_STATUS.BOOKED
  const rel = relParts(ageMin)

  return (
    <article
      data-status={display}
      className={`relative rounded-ec-card border p-3.5 shadow-ec-card transition-opacity ${
        verified ? 'border-ec-blue/20 bg-white' : 'border-ec-line bg-white'
      } ${booked ? 'opacity-[0.66] grayscale-[0.55]' : ''}`}
    >
      {verified && <div className="absolute left-3.5 right-3.5 top-0 h-[3px] rounded-b-[3px] bg-ec-blue" />}

      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">
          {t('card.postedAt')} · <b className="font-bold text-ec-ink">{t(`time.${rel.key}`, { count: rel.count ?? 0 })}</b>
        </span>
        <StatusBadge status={display} />
      </div>

      <RouteRow from={ride.from} to={ride.to} />

      <div className="mt-2.5 border-t border-ec-line pt-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ec-ink60">
          <span className="inline-flex text-ec-ink40"><VehicleIcon vehicleKey={vehIconKey(ride.vehicleType)} size={15} /></span>
          {t('card.vehicle')} : <span className="font-extrabold text-ec-ink">{ride.vehicleType || t('card.unknownCity')}</span>
          {verified && ride.fare ? <span className="font-extrabold text-ec-ink">· ₹{ride.fare}</span> : null}
          {verified && ride.date ? <span className="font-semibold text-ec-ink60">· {ride.date}</span> : null}
        </div>
        {ride.message ? (
          <p className="mt-1.5 whitespace-pre-line break-words text-[12.5px] font-medium leading-snug text-ec-ink60">{ride.message}</p>
        ) : null}
      </div>

      <div className="mt-2.5">
        <CardActions ride={ride} disabled={booked} onContact={onContact} onReport={onReport} />
      </div>
    </article>
  )
}
