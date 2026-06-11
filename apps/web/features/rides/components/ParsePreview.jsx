'use client'

import { useTranslations } from 'next-intl'
import { Pin, ChevR } from '@/components/ui/icons'

const cityLabel = (id, name, raw) => name || raw || null

/**
 * Read-only preview of a parsed draft (SCREENS §5 free-text mode). Date/fare are
 * not auto-read — shown as a hint to fill in the form. The user confirms to post
 * or edits the fields.
 *
 * @param {object} props
 * @param {object} props.draft - from POST /posted-rides/parse
 * @param {() => void} props.onEdit
 * @param {() => void} props.onConfirm
 * @param {boolean} props.posting
 */
export function ParsePreview({ draft, onEdit, onConfirm, posting }) {
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
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="h-[52px] flex-1 rounded-xl border-[1.5px] border-ec-line bg-white text-[15px] font-extrabold text-ec-blueInk">
          {t('paste.edit')}
        </button>
        <button type="button" disabled={posting} onClick={onConfirm} className="h-[52px] flex-1 rounded-xl bg-ec-blue text-[15px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">
          {posting ? '…' : t('paste.looksGood')}
        </button>
      </div>
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
