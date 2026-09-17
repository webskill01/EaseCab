'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Crown, Whatsapp, Phone, Swap, Ban, Shield, Warning } from '@/components/ui/icons'
import { contactRide, contactVerifiedRide, logContactRide, logContactVerifiedRide } from '../services/ridesApi'
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
 * @param {() => void} props.onVerify - route to L1 verification (verified-ride pick gate)
 */
export function ContactSheet({ ride, membershipState, onClose, onUpgrade, onVerify }) {
  const t = useTranslations('rides')
  const tc = useTranslations('common')
  const qc = useQueryClient()
  const reveal = useMutation({
    // Reveal only shows the number — it no longer writes history, so the Contacted
    // tab isn't touched here. The row is logged on the actual Call/WhatsApp tap below.
    mutationFn: () => (ride.kind === RIDE_KIND.VERIFIED ? contactVerifiedRide(ride.id) : contactRide(ride.id)),
  })

  // Fire-and-forget on the Call/WhatsApp tap: record the contact, then refresh the
  // Contacted tab. The deep link navigates regardless — a failed log just means the
  // ride isn't listed, never a blocked call. Idempotent server-side (Call+WhatsApp
  // = one row), so tapping both is fine.
  const logContact = () => {
    const log = ride.kind === RIDE_KIND.VERIFIED ? logContactVerifiedRide : logContactRide
    log(ride.id)
      .then(() => qc.invalidateQueries({ queryKey: ['contacted'] }))
      .catch(() => {})
  }

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
      <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('gate.contactTitle')}>
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

  // Picking a verified ride needs the same L1 KYC as posting one — the server returns
  // VERIFICATION_REQUIRED for an unverified user, so route them to verification.
  if (reveal.error?.code === 'VERIFICATION_REQUIRED') {
    return (
      <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('gate.verifyTitle')}>
        <SheetTitle icon={<Shield size={22} />} tone="blueInk" title={t('gate.verifyTitle')} sub={t('gate.verifyBody')} />
        <div className="flex flex-col gap-2.5 pb-2">
          <RouteLine ride={ride} />
          <Button type="button" size="lg" onClick={onVerify} className="w-full">
            {t('gate.verifyCta')}
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
      <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('reveal.failTitle')}>
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
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('reveal.title')}>
      <h2 className="pr-9 text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{t('reveal.title')}</h2>
      <div className="mt-3.5 flex flex-col gap-3">
        <RouteLine ride={ride} />

        <div className="flex items-center gap-3 rounded-ec-card border border-ec-line px-3.5 py-2.5">
          <span className="inline-flex text-ec-ink40"><Phone size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold text-ec-ink40">{t('reveal.numberLabel')}</p>
            <p className="text-[15.5px] font-bold tracking-wide text-ec-ink">{phone || '…'}</p>
          </div>
        </div>

        {/* Fraud warning — shown every time before Call/WhatsApp are usable. */}
        <div role="alert" className="flex items-start gap-2.5 rounded-ec-card border border-ec-warning/40 bg-ec-warnBg px-3.5 py-3">
          <span className="mt-0.5 shrink-0 text-ec-warning"><Warning size={20} /></span>
          <div>
            <p className="text-[13.5px] font-extrabold text-ec-amberTx">{t('reveal.warningTitle')}</p>
            <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ec-amberTx/90">{t('reveal.advanceWarning')}</p>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ec-amberTx/90">{t('reveal.fareNote')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild size="lg" variant="wa" className={`flex-1 ${phone ? '' : 'pointer-events-none bg-ec-disabled'}`}>
            <a href={phone ? waLink(phone) : undefined} onClick={logContact} target="_blank" rel="noopener noreferrer" aria-disabled={!phone}>
              <Whatsapp size={18} />{t('reveal.waBtn')}
            </a>
          </Button>
          <Button asChild size="lg" variant="primary" className={`flex-1 ${phone ? '' : 'pointer-events-none bg-ec-disabled shadow-none'}`}>
            <a href={phone ? `tel:${phone}` : undefined} onClick={logContact} aria-disabled={!phone}>
              <Phone size={17} />{t('reveal.callBtn')}
            </a>
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
