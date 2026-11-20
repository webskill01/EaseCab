'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Forward, Phone } from '@/components/ui/icons'
import { toBotVM, toVerifiedVM } from '@/features/rides/lib/normalize'
import { rideSlot } from '@/features/rides/lib/rideView'
import { useVehicleLabel } from '@/features/rides/hooks/useLocalNames'
import { splitPhones } from '../lib/groupView'
import { useLongPress } from '../hooks/useGestures'

const BUBBLE = 'min-w-0 max-w-[85%] self-start [overflow-wrap:anywhere] select-none [-webkit-touch-callout:none]'
const CARD = 'rounded-2xl rounded-tl-sm bg-white px-3 pb-1.5 pt-2 shadow-ec-card transition-transform active:scale-[0.985]'
const clock = (at) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(at))

/** A number with a call glyph — reads as "tap to call", opens the contact popup. */
function PhoneLink({ text, onPhone }) {
  return (
    <button type="button" onClick={onPhone} className="inline-flex items-center gap-1 font-semibold text-ec-blueInk underline underline-offset-2">
      <span className="inline-flex rounded-full bg-ec-successBg p-[3px] text-ec-waDeep no-underline"><Phone size={12} /></span>{text}
    </button>
  )
}

/** +91XXXXXXXXXX from however the number was typed (spaces, 0/91 prefix). */
const toDial = (raw) => `+91${String(raw).replace(/\D/g, '').slice(-10)}`

/** Text with EVERY phone number as its own call link; onPhone gets the number tapped. */
function PhoneText({ text, onPhone }) {
  return splitPhones(text).map((p, i) => (p.phone
    ? <PhoneLink key={i} text={p.text} onPhone={() => onPhone(toDial(p.text))} />
    : <Fragment key={i}>{p.text}</Fragment>))
}

export function RideBubble({ ride, onContact, onHold, live }) {
  const t = useTranslations('rides.card')
  const vm = toBotVM(ride)
  const hold = useLongPress(() => onHold({ text: ride.text || '', vm }))
  return (
    <div {...hold} className={`${BUBBLE} ${CARD} ${live ? 'animate-ec-rise' : ''}`}>
      {ride.sourceGroupName && (
        <p className="mb-1 break-words text-[12px] font-semibold leading-snug text-ec-ink60">
          <span className="mr-1 inline-flex align-[-3px] text-ec-ink40"><Forward size={14} /></span>
          {t('forwardedGroup')}{' '}<span className="font-extrabold text-ec-ink">{ride.sourceGroupName}</span>
        </p>
      )}
      <p className="whitespace-pre-wrap text-[14.5px] leading-snug text-ec-ink">
        <PhoneText text={ride.text || ''} onPhone={(dialPhone) => onContact({ ...vm, dialPhone })} />
      </p>
      <p className="mt-0.5 text-right text-[10.5px] text-ec-ink40">{clock(ride.receivedAt)}</p>
    </div>
  )
}

function DutyAvatar({ vm }) {
  const initial = (vm.posterName || '?').trim().charAt(0).toUpperCase()
  return (
    <Link href={`/u/${vm.posterId}`} aria-label={vm.posterName || ''} className="shrink-0">
      {vm.posterPhotoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={vm.posterPhotoUrl} alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover" />
        : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ec-sky text-[14px] font-extrabold text-ec-blue">{initial}</span>}
    </Link>
  )
}

export function DutyBubble({ post, onContact, onHold, live }) {
  const t = useTranslations('rides.group')
  const locale = useLocale()
  const veh = useVehicleLabel()
  const vm = toVerifiedVM(post)
  const lines = [
    `${vm.from || '—'} → ${vm.to || '—'}`,
    [veh(vm.vehicleType), vm.fare ? `₹${vm.fare}` : null].filter(Boolean).join(' · '),
    rideSlot(vm.date, vm.time, locale), vm.message,
  ].filter(Boolean)
  // A done duty hides every number, incl. ones typed in the message; live ones are each tappable.
  const call = (dialPhone) => onContact({ ...vm, dialPhone })
  const hold = useLongPress(() => onHold({ text: lines.join('\n'), vm }))
  return (
    <div className={`${BUBBLE} flex items-start gap-2 ${vm.done ? 'opacity-60' : ''} ${live ? 'animate-ec-rise' : ''}`}>
      <DutyAvatar vm={vm} />
      <div {...hold} className={`min-w-0 ${CARD}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={`/u/${vm.posterId}`} className="text-[13.5px] font-extrabold text-ec-blueInk">{vm.posterName || '—'}</Link>
          <span className="rounded-full bg-ec-successBg px-2 py-px text-[10.5px] font-bold text-ec-successTx">{t('dutyTag')}</span>
          {vm.done && <span className="rounded-full bg-ec-bookedBg px-2 py-px text-[10.5px] font-bold text-ec-bookedTx">{t('booked')}</span>}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[14.5px] leading-snug text-ec-ink">
          {vm.done ? lines.join('\n') : <PhoneText text={lines.join('\n')} onPhone={call} />}
        </p>
        {!vm.done && post.phoneNumber && <p className="mt-1 text-[14.5px]"><PhoneText text={post.phoneNumber} onPhone={call} /></p>}
        <p className="mt-0.5 text-right text-[10.5px] text-ec-ink40">{clock(post.createdAt)}</p>
      </div>
    </div>
  )
}
