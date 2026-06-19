'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { VehicleIcon, Steer, Lock } from '@/components/ui/icons'
import { CityPicker } from '@/features/rides/components/CityPicker'
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
 *   errorKey?: ?string, header?: React.ReactNode, phone?: ?string }} props
 */
export function ProfileForm({ initial, onSubmit, submitting, errorKey = null, header = null, phone = null }) {
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

      {/* Working city — typeahead picker (mockup uses a city dropdown), so it resolves
          to a real city instead of free text. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.workingCity')}</span>
        <CityPicker
          label={t('fields.workingCity')}
          value={f.workingCity ? { id: null, name: f.workingCity } : null}
          onPick={(c) => set({ workingCity: c.name })}
        />
        <span className="text-[12px] font-medium text-ec-ink40">{t('fields.workingCityHint')}</span>
      </div>

      {/* Experience — icon prefix + "yrs" suffix (mockup) */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.experience')}</span>
        <div className="flex h-12 items-center overflow-hidden rounded-xl border-[1.5px] border-ec-line bg-white focus-within:border-ec-blue">
          <span className="flex h-full items-center border-r border-ec-line bg-ec-bg px-3 text-ec-blue"><Steer size={16} /></span>
          <input className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-ec-ink outline-none" inputMode="numeric" value={f.experience}
            onChange={(e) => set({ experience: e.target.value.replace(/\D/g, '').slice(0, 2) })} aria-label={t('fields.experience')} />
          <span className="px-3 text-[13.5px] font-medium text-ec-ink60">{t('stats.years')}</span>
        </div>
      </label>

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

      {/* Phone — read-only (login identity, never editable here). Mockup shows it locked. */}
      {phone && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ec-ink60">{t('phoneLabel')}</span>
          <div className="flex h-12 items-center justify-between rounded-xl border-[1.5px] border-ec-line bg-ec-bg px-3 text-[14px] font-semibold text-ec-ink40">
            <span>+91 {String(phone).replace(/^\+91/, '')}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold"><Lock size={12} />{t('locked')}</span>
          </div>
        </div>
      )}

      {errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t(errorKey)}</p>}

      <button type="submit" disabled={!canSave || submitting}
        className="h-[52px] rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">
        {submitting ? t('saving') : t('save')}
      </button>
    </form>
  )
}
