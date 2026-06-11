'use client'

import { useTranslations } from 'next-intl'
import { Whatsapp, Phone, Chat } from '@/components/ui/icons'
import { RouteRow, StatusBadge } from './RideCard'

/** wa.me wants digits only. */
function waLink(phone) { return `https://wa.me/${String(phone).replace(/[^\d]/g, '')}` }

/**
 * My Rides → Contacted card. Phone is already revealed (snapshot), so Call/WhatsApp
 * are direct deep links — no re-gate. Verified contacts show an inert Chat stub (Step 22).
 * @param {{ contact: object }} props
 */
export function ContactedCard({ contact }) {
  const t = useTranslations('mine')
  const verified = contact.kind === 'verified'
  return (
    <article className="rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ec-ink60">{t('contacted.label')}</span>
        {verified && <StatusBadge status="verified" />}
      </div>
      <RouteRow from={contact.from} to={contact.to} />
      <div className="mt-2.5 border-t border-ec-line pt-2.5 text-[13px] font-semibold text-ec-ink60">
        {t('contacted.vehicle')} : <span className="font-extrabold text-ec-ink">{contact.vehicleType || t('contacted.any')}</span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <a href={waLink(contact.phone)} target="_blank" rel="noopener noreferrer" className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-ec-wa text-[13.5px] font-bold text-white">
          <Whatsapp size={17} />{t('contacted.whatsapp')}
        </a>
        <a href={`tel:${contact.phone}`} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-ec-blue text-[13.5px] font-bold text-white">
          <Phone size={16} />{t('contacted.call')}
        </a>
        {verified && (
          <button type="button" disabled aria-label={t('contacted.chat')} className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-ec-bg text-ec-ink40">
            <Chat size={16} />
          </button>
        )}
      </div>
    </article>
  )
}
