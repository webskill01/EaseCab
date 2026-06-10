'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Crown, Whatsapp, Phone } from '@/components/ui/icons'
import { contactRide, contactVerifiedRide } from '../services/ridesApi'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { RIDE_KIND } from '../lib/rideView'

/** wa.me wants the number without the leading +. */
function waLink(phone) {
  return `https://wa.me/${String(phone).replace(/[^\d]/g, '')}`
}

/**
 * Contact soft-gate sheet (SCREENS §11). Expired members see the subscribe gate;
 * otherwise the reveal runs the server-gated contact call and shows Call/WhatsApp
 * deep links (the server is the real gate — an expired error falls back to the gate).
 *
 * @param {object} props
 * @param {{ id: string, kind: string }} props.ride
 * @param {string} props.membershipState - MEMBERSHIP_STATE value
 * @param {() => void} props.onClose
 * @param {() => void} props.onUpgrade
 */
export function ContactSheet({ ride, membershipState, onClose, onUpgrade }) {
  const t = useTranslations('rides')
  const reveal = useMutation({
    mutationFn: () => (ride.kind === RIDE_KIND.VERIFIED ? contactVerifiedRide(ride.id) : contactRide(ride.id)),
  })
  const [tried, setTried] = useState(false)

  const gatedOut =
    membershipState === MEMBERSHIP_STATE.EXPIRED ||
    reveal.error?.code === 'SUBSCRIPTION_EXPIRED'

  if (gatedOut) {
    return (
      <BottomSheet onClose={onClose} label={t('gate.contactTitle')}>
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ec-sky text-ec-blue"><Crown size={26} /></div>
          <h2 className="text-[18px] font-extrabold text-ec-ink">{t('gate.contactTitle')}</h2>
          <p className="max-w-[300px] text-[13.5px] font-medium text-ec-ink60">{t('gate.contactSub')}</p>
          <button type="button" onClick={onUpgrade} className="mt-1 h-[52px] w-full rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue">
            {t('gate.subscribe')}
          </button>
        </div>
      </BottomSheet>
    )
  }

  const phone = reveal.data?.phoneNumber
  return (
    <BottomSheet onClose={onClose} label={t('reveal.title')}>
      <div className="flex flex-col gap-3 pb-2">
        <h2 className="text-center text-[18px] font-extrabold text-ec-ink">{t('reveal.title')}</h2>
        {!phone ? (
          <button
            type="button"
            disabled={reveal.isPending}
            onClick={() => { setTried(true); reveal.mutate() }}
            className="h-[52px] w-full rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none"
          >
            {tried && reveal.isPending ? '…' : t('reveal.title')}
          </button>
        ) : (
          <>
            <div className="rounded-ec-card border border-ec-line bg-ec-bg py-3 text-center text-[20px] font-extrabold tracking-tight text-ec-ink">{phone}</div>
            <div className="flex gap-2">
              <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ec-wa text-[15px] font-extrabold text-white">
                <Whatsapp size={18} />{t('reveal.waBtn')}
              </a>
              <a href={`tel:${phone}`} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ec-blue text-[15px] font-extrabold text-white">
                <Phone size={17} />{t('reveal.callBtn')}
              </a>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
