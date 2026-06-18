'use client'

import { useTranslations } from 'next-intl'
import { Swap, Shield } from '@/components/ui/icons'
import { CityPicker } from './CityPicker'
import { VehicleChips } from './VehicleChips'
import { isPostable, isFutureDateTime, todayStr } from '../lib/postForm'

const SECTION = 'rounded-ec-card border border-ec-line bg-white p-4'
const FIELD = 'h-12 w-full rounded-xl border border-ec-line bg-white px-3 text-[14px] font-semibold text-ec-ink outline-none'
const LABEL = 'mb-1.5 block text-[12.5px] font-bold uppercase tracking-wide text-ec-ink40'

/**
 * Structured Post-a-Ride form (SCREENS §5). Controlled — the parent owns `form`
 * (so the paste tab's "Edit fields" can prefill it) and merges partials via
 * `onChange`. The sticky Post button enables only when the form is postable.
 *
 * @param {object} props
 * @param {object} props.form - postForm state
 * @param {(patch: object) => void} props.onChange
 * @param {() => void} props.onSubmit
 * @param {boolean} props.submitting
 */
export function PostForm({ form, onChange, onSubmit, submitting }) {
  const t = useTranslations('post')
  const postable = isPostable(form)
  const pastSlot = Boolean(form.date && form.time && !isFutureDateTime(form.date, form.time))
  const onPhone = (e) => onChange({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })

  return (
    <div className="flex flex-col gap-3">
      {/* Route */}
      <section className={SECTION}>
        <div className="flex flex-col gap-2">
          <CityPicker label={t('post.from')} value={form.from} onPick={(c) => onChange({ from: c })} />
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={t('post.swap')}
              onClick={() => onChange({ from: form.to, to: form.from })}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ec-line bg-ec-bg text-ec-blue"
            >
              <Swap size={16} />
            </button>
          </div>
          <CityPicker label={t('post.to')} value={form.to} onPick={(c) => onChange({ to: c })} />
        </div>
      </section>

      {/* Vehicle */}
      <section className={SECTION}>
        <span className={LABEL}>{t('post.vehicle')}</span>
        <VehicleChips value={form.vehicle} onChange={(v) => onChange({ vehicle: v })} />
      </section>

      {/* When + Fare */}
      <section className={SECTION}>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className={LABEL}>{t('post.date')}</span>
            <input type="date" min={todayStr()} value={form.date} onChange={(e) => onChange({ date: e.target.value })} className={FIELD} aria-label={t('post.date')} />
          </label>
          <label className="flex-1">
            <span className={LABEL}>{t('post.time')}</span>
            <input type="time" value={form.time} onChange={(e) => onChange({ time: e.target.value })} className={FIELD} aria-label={t('post.time')} />
          </label>
        </div>
        {pastSlot && (
          <p className="mt-2 text-[12px] font-bold text-ec-danger">{t('post.pastDateError')}</p>
        )}
        <label className="mt-3 block">
          <span className={LABEL}>{t('post.fare')}</span>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-ec-ink40">₹</span>
            <input inputMode="numeric" value={form.fare} onChange={(e) => onChange({ fare: e.target.value.replace(/\D/g, '') })} className={FIELD} aria-label={t('post.fare')} />
          </div>
        </label>
      </section>

      {/* Contact */}
      <section className={SECTION}>
        <span className={LABEL}>{t('post.contact')}</span>
        <div className="flex items-center gap-2">
          <span className="flex h-12 items-center rounded-xl border border-ec-line bg-ec-bg px-3 text-[14px] font-bold text-ec-ink">+91</span>
          <input inputMode="numeric" maxLength={10} value={form.phone} onChange={onPhone} className={FIELD} aria-label={t('post.contact')} />
        </div>
      </section>

      {/* Notes */}
      <section className={SECTION}>
        <span className={LABEL}>{t('post.notes')}</span>
        <textarea
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          aria-label={t('post.notes')}
          className="w-full rounded-xl border border-ec-line bg-white p-3 text-[14px] font-semibold text-ec-ink outline-none"
        />
      </section>

      {/* Soft-gate note */}
      <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-ec-wa">
        <Shield size={14} />{t('post.verifiedNote')}
      </p>

      {/* Sticky footer action bar (spec §6.12) — full-bleed white bar pinned to the
          bottom of the scroll area, so the button never floats over the fields. */}
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-1 border-t border-ec-line bg-white px-4 py-3">
        <button
          type="button"
          disabled={!postable || submitting}
          onClick={onSubmit}
          className={`h-[54px] w-full rounded-xl text-[15.5px] font-extrabold text-white ${
            postable && !submitting ? 'bg-ec-blue shadow-ec-blue' : 'bg-ec-disabled shadow-none'
          }`}
        >
          {submitting ? '…' : t('post.submit')}
        </button>
      </div>
    </div>
  )
}
