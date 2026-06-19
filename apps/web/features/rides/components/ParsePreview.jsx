'use client'

import { useTranslations } from 'next-intl'
import { Pin, ChevR } from '@/components/ui/icons'

const cityLabel = (id, name, raw) => name || raw || null

/**
 * Read-only preview of a parsed draft (SCREENS §5 free-text mode). Date/fare are
 * not auto-read. Paste never posts directly (#9 / F5) — the single CTA carries the
 * draft into the prefilled form where the user completes date+time and posts.
 *
 * @param {object} props
 * @param {object} props.draft - from POST /posted-rides/parse
 * @param {() => void} props.onEdit - continue into the prefilled form
 */
export function ParsePreview({ draft, onEdit }) {
  const t = useTranslations('post')
  const from = cityLabel(draft.fromCityId, draft.fromCityName, draft.fromCityRaw)
  const to = cityLabel(draft.toCityId, draft.toCityName, draft.toCityRaw)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-ec-card border border-ec-line bg-white p-4">
        <h3 className="mb-3 text-[14px] font-extrabold text-ec-ink">{t('paste.previewTitle')}</h3>
        <div className="flex items-center gap-2 text-[15px] font-bold text-ec-blueInk">
          <span className="inline-flex text-ec-blue"><Pin size={16} /></span>
          <span>{from || '—'}</span>
          <span className="inline-flex text-ec-ink40"><ChevR size={14} /></span>
          <span>{to || '—'}</span>
        </div>
        <dl className="mt-3 flex flex-col gap-1.5 text-[13.5px]">
          <Row label={t('post.vehicle')} value={draft.vehicleType || '—'} />
          <Row label={t('post.contact')} value={draft.phone || '—'} />
          <Row label={`${t('post.date')} / ${t('post.fare')}`} value={t('paste.noDate')} />
        </dl>
      </div>
      <button type="button" onClick={onEdit} className="h-[52px] w-full rounded-xl bg-ec-blue text-[15px] font-extrabold text-white shadow-ec-blue">
        {t('paste.continueToForm')}
      </button>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="font-semibold text-ec-ink40">{label}</dt>
      <dd className="font-bold text-ec-ink">{value}</dd>
    </div>
  )
}
