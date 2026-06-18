'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { VehicleIcon } from '@/components/ui/icons'
import { DpUploader } from './DpUploader'
import {
  PROFILE_VEHICLES, PROFILE_LANGUAGES, vehIconKeyOf,
  canSaveProfile, toUpdateBody,
} from '../lib/profileForm'

const field = 'h-12 w-full rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[14px] font-semibold text-ec-ink outline-none focus:border-ec-blue'

/**
 * Shared profile form (SCREENS §6) — used for both hub edit and Aadhaar-onboarding
 * completion. Manages its own state from `initial`; calls `onSubmit(updateBody)`.
 * Submit is gated on the core fields only — the DP is NOT a save gate (#19); it's a
 * soft nudge for the posting gate. Above the form the caller may pass a `header`.
 * @param {{ initial: object, onSubmit: (body: object) => void, submitting: boolean,
 *   errorKey?: ?string, header?: React.ReactNode }} props
 */
export function ProfileForm({ initial, onSubmit, submitting, errorKey = null, header = null }) {
  const t = useTranslations('profile')
  const [f, setF] = useState(initial)
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }))
  const toggleLang = (l) =>
    set({ languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l] })
  const canSave = canSaveProfile(f)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSave && !submitting) onSubmit(toUpdateBody(f)) }}
      className="flex flex-col gap-4"
    >
      {header}
      <DpUploader preview={f.dpPreview} onUploaded={({ key, previewUrl }) => set({ dpKey: key, dpPreview: previewUrl ?? f.dpPreview })} />
      {!f.dpPreview && !f.dpKey && <p className="-mt-2 text-center text-[12.5px] font-semibold text-ec-warning">{t('dp.required')}</p>}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.name')}</span>
        <input className={field} value={f.name} onChange={(e) => set({ name: e.target.value })} aria-label={t('fields.name')} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.baseCity')}</span>
        <input className={field} value={f.baseCity} onChange={(e) => set({ baseCity: e.target.value })} aria-label={t('fields.baseCity')} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ec-ink60">{t('fields.workingCity')}</span>
          <input className={field} value={f.workingCity} onChange={(e) => set({ workingCity: e.target.value })} aria-label={t('fields.workingCity')} />
        </label>
        <label className="flex w-28 flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ec-ink60">{t('fields.experience')}</span>
          <input className={field} inputMode="numeric" value={f.experience}
            onChange={(e) => set({ experience: e.target.value.replace(/\D/g, '').slice(0, 2) })} aria-label={t('fields.experience')} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.bio')}</span>
        <textarea className={`${field} h-20 py-2`} value={f.bio} onChange={(e) => set({ bio: e.target.value })} aria-label={t('fields.bio')} maxLength={300} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.vehicle')}</span>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {PROFILE_VEHICLES.map((v) => {
            const on = f.vehicle === v
            return (
              <button key={v} type="button" role="radio" aria-checked={on} onClick={() => set({ vehicle: v })}
                className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-bold ${on ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk'}`}>
                <VehicleIcon vehicleKey={vehIconKeyOf(v)} size={16} />{v}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.languages')}</span>
        <div className="flex flex-wrap gap-2">
          {PROFILE_LANGUAGES.map((l) => {
            const on = f.languages.includes(l)
            return (
              <button key={l} type="button" aria-pressed={on} onClick={() => toggleLang(l)}
                className={`h-10 rounded-xl px-3 text-[13.5px] font-bold ${on ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk'}`}>
                {l}
              </button>
            )
          })}
        </div>
      </div>

      {errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t(errorKey)}</p>}

      <button type="submit" disabled={!canSave || submitting}
        className="h-[52px] rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">
        {submitting ? t('saving') : t('save')}
      </button>
    </form>
  )
}
