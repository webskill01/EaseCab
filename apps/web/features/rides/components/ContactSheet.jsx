'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Crown, Whatsapp, Phone, Swap, Check, Ban } from '@/components/ui/icons'
import { contactRide, contactVerifiedRide } from '../services/ridesApi'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { RIDE_KIND } from '../lib/rideView'

/** wa.me wants the number without the leading +. */
function waLink(phone) {
  return `https://wa.me/${String(phone).replace(/[^\d]/g, '')}`
}

/** Map a non-subscription contact failure to a `reveal.*` i18n sub-key (subscription
 * errors short-circuit to the gate, so they never reach here). */
function contactErrorKey(err) {
  switch (err?.code) {
    case 'RATE_LIMITED':
      return 'errorRate'
    case 'NOT_FOUND':
      return 'errorGone'
    case 'NETWORK_ERROR':
      return 'errorNetwork'
    default:
      return 'error'
  }
}

/** Route summary line (sheets.jsx RouteLine) — pickup → drop · vehicle. Always renders
 * with "—" fallbacks so every ride's sheet looks consistent (missing pickup no longer
 * collapses the line to nothing). */
function RouteLine({ ride }) {
  const t = useTranslations('rides')
  return (
    <div className="flex items-center gap-2 rounded-ec-card bg-ec-bg px-3.5 py-3">
      <span className={`text-[15px] font-extrabold ${ride.from ? 'text-ec-ink' : 'text-ec-ink40'}`}>{ride.from || t('card.unknownCity')}</span>
      <span className="inline-flex text-ec-blue"><Swap size={18} /></span>
      <span className={`min-w-0 flex-1 truncate text-[15px] font-extrabold ${ride.to ? 'text-ec-ink' : 'text-ec-ink40'}`}>{ride.to || t('card.unknownCity')}</span>
      <span className="shrink-0 text-[12.5px] font-bold text-ec-ink60">{ride.vehicleType || t('card.unknownCity')}</span>
    </div>
  )
}

/**
 * Contact soft-gate sheet (SCREENS §11). Expired members see the subscribe gate;
 * otherwise the reveal runs the server-gated contact call and shows Call/WhatsApp
 * deep links (the server is the real gate — an expired error falls back to the gate).
 *
 * @param {object} props
 * @param {{ id: string, kind: string, from?: string, to?: string, vehicleType?: string }} props.ride
 * @param {string} props.membershipState - MEMBERSHIP_STATE value
 * @param {() => void} props.onClose
 * @param {() => void} props.onUpgrade
 */
export function ContactSheet({ ride, membershipState, onClose, onUpgrade }) {
  const t = useTranslations('rides')
  const qc = useQueryClient()
  const reveal = useMutation({
    mutationFn: () => (ride.kind === RIDE_KIND.VERIFIED ? contactVerifiedRide(ride.id) : contactRide(ride.id)),
    // The contact is snapshotted server-side immediately; refresh the Contacted tab
    // so it shows up right away rather than after the 60s stale window (#13).
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacted'] }),
  })

  const gatedOut =
    membershipState === MEMBERSHIP_STATE.EXPIRED ||
    reveal.error?.code === 'SUBSCRIPTION_EXPIRED'

  // Reveal the number immediately on open — no second "reveal" tap. The server is the
  // real gate, so expired members short-circuit to the subscribe sheet instead of calling.
  const fire = reveal.mutate
  useEffect(() => {
    if (membershipState !== MEMBERSHIP_STATE.EXPIRED) fire()
  }, [fire, membershipState])

  if (gatedOut) {
    return (
      <BottomSheet onClose={onClose} label={t('gate.contactTitle')}>
        <SheetTitle icon={<Crown size={22} />} tone="blue" title={t('gate.contactTitle')} sub={t('gate.contactSub')} />
        <div className="flex flex-col gap-3 pb-2">
          <RouteLine ride={ride} />
          <div className="flex items-center gap-3 rounded-2xl bg-ec-sky px-4 py-3.5">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-ec-blue">₹149<span className="text-[14px] font-bold text-ec-ink60">{t('gate.perMonth')}</span></span>
            <p className="flex-1 text-[12.5px] font-semibold leading-snug text-ec-blueInk">{t('gate.planNote')}</p>
          </div>
          <Button type="button" size="lg" onClick={onUpgrade} className="w-full">
            {t('gate.subscribe')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="w-full bg-ec-bg font-bold text-ec-ink60">
            {t('gate.notNow')}
          </Button>
        </div>
      </BottomSheet>
    )
  }

  // Non-subscription failure (404 / contact cap / network) — gatedOut already handled
  // the subscription case above, so a remaining error means the reveal genuinely failed.
  if (reveal.isError) {
    return (
      <BottomSheet onClose={onClose} label={t('reveal.failTitle')}>
        <SheetTitle icon={<Ban size={22} />} tone="danger" title={t('reveal.failTitle')} sub={t(`reveal.${contactErrorKey(reveal.error)}`)} />
        <div className="flex flex-col gap-3 pb-2">
          <RouteLine ride={ride} />
          <Button type="button" size="lg" onClick={() => reveal.mutate()} disabled={reveal.isPending} className="w-full">
            {reveal.isPending ? '…' : t('reveal.retry')}
          </Button>
        </div>
      </BottomSheet>
    )
  }

  const phone = reveal.data?.phoneNumber
  return (
    <BottomSheet onClose={onClose} label={t('reveal.title')}>
      <SheetTitle icon={<Check size={22} />} tone="success" title={t('reveal.title')} />
      <div className="flex flex-col gap-3 pb-2">
        <RouteLine ride={ride} />
        <div className="rounded-ec-card border border-ec-line bg-ec-bg py-3 text-center text-[20px] font-extrabold tracking-tight text-ec-ink">
          {phone || '…'}
        </div>
        <div className="flex gap-2">
          <Button asChild size="lg" variant="wa" className={`flex-1 ${phone ? '' : 'pointer-events-none bg-ec-disabled'}`}>
            <a href={phone ? waLink(phone) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!phone}>
              <Whatsapp size={18} />{t('reveal.waBtn')}
            </a>
          </Button>
          <Button asChild size="lg" variant="primary" className={`flex-1 ${phone ? '' : 'pointer-events-none bg-ec-disabled shadow-none'}`}>
            <a href={phone ? `tel:${phone}` : undefined} aria-disabled={!phone}>
              <Phone size={17} />{t('reveal.callBtn')}
            </a>
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
