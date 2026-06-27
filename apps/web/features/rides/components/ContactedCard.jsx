'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Whatsapp, Phone, Chat, ChevR } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { openChat } from '@/features/chat/services/chatApi'
import { RouteRow, StatusBadge } from './RideCard'
import { ageMinFrom, relParts } from '../lib/rideView'

/** wa.me wants digits only. */
function waLink(phone) { return `https://wa.me/${String(phone).replace(/[^\d]/g, '')}` }

/**
 * My Rides → Contacted card. Phone is already revealed (snapshot), so Call/WhatsApp
 * are direct deep links — no re-gate. Verified contacts open the 1:1 chat (Step 22).
 * @param {{ contact: object }} props
 */
export function ContactedCard({ contact }) {
  const t = useTranslations('mine')
  const tr = useTranslations('rides')
  const router = useRouter()
  const [opening, setOpening] = useState(false)
  const verified = contact.kind === 'verified'
  const rel = relParts(ageMinFrom(contact.contactedAt))

  const handleChat = async () => {
    if (!contact.postedRideId || opening) return
    setOpening(true)
    try {
      const chat = await openChat(contact.postedRideId)
      router.push(`/messages/${chat.id}`)
    } catch {
      setOpening(false)
    }
  }
  return (
    <article className="rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">{tr(`time.${rel.key}`, { count: rel.count ?? 0 })}</span>
        {verified
          ? <StatusBadge status="verified" />
          : <span className="text-[11px] font-extrabold uppercase tracking-wide text-ec-ink40">{t('contacted.ridesLabel')}</span>}
      </div>
      <RouteRow from={contact.from} to={contact.to} />
      {verified && contact.posterId && (
        <button
          type="button"
          onClick={() => router.push(`/u/${contact.posterId}`)}
          aria-label={tr('card.viewProfile')}
          className="mt-2.5 flex w-full items-center gap-2.5 border-t border-ec-line pt-2.5 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ec-sky text-[14px] font-extrabold text-ec-blue">
            {(contact.posterName || '?').trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-ec-ink">{contact.posterName || '—'}</span>
          <span className="shrink-0 text-ec-ink40"><ChevR size={16} /></span>
        </button>
      )}
      <div className="mt-2.5 border-t border-ec-line pt-2.5 text-[13px] font-semibold text-ec-ink60">
        {t('contacted.vehicle')} : <span className="font-extrabold text-ec-ink">{contact.vehicleType || t('contacted.any')}</span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <Button asChild variant="wa" className="h-[42px] flex-1 gap-1.5 rounded-[11px] px-2 text-[13.5px] font-bold">
          <a href={waLink(contact.phone)} target="_blank" rel="noopener noreferrer">
            <Whatsapp size={17} />{t('contacted.whatsapp')}
          </a>
        </Button>
        <Button asChild variant="primary" className="h-[42px] flex-1 gap-1.5 rounded-[11px] px-2 text-[13.5px] font-bold shadow-none">
          <a href={`tel:${contact.phone}`}>
            <Phone size={16} />{t('contacted.call')}
          </a>
        </Button>
        {verified && (
          <Button type="button" variant="ghost" onClick={handleChat} disabled={opening || !contact.postedRideId} aria-label={t('contacted.chat')} className="h-[42px] w-[42px] rounded-[11px] bg-ec-sky text-ec-blue hover:bg-ec-sky">
            <Chat size={16} />
          </Button>
        )}
      </div>
    </article>
  )
}
