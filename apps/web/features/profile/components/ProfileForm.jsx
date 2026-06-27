'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { VehicleIcon, Bolt, Lock, Pin, Plus, Check } from '@/components/ui/icons'
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
 * `lockBaseCity` renders base city as a read-only, Aadhaar-sourced field (hub edit);
 * onboarding leaves it editable since that's where it's first captured.
 * `pinnedFooter` (hub edit overlay) puts the Save button in a sticky footer below a
 * scrollable body (mockup §4.A); onboarding keeps the inline button.
 * @param {{ initial: object, onSubmit: (body: object) => void, submitting: boolean,
 *   errorKey?: ?string, header?: React.ReactNode, phone?: ?string, lockBaseCity?: boolean,
 *   pinnedFooter?: boolean }} props
 */
export function ProfileForm({ initial, onSubmit, submitting, errorKey = null, header = null, phone = null, lockBaseCity = false, pinnedFooter = false }) {
  const t = useTranslations('profile')
  const [f, setF] = useState(initial)
  const [langOpen, setLangOpen] = useState(false)
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }))
  const toggleLang = (l) =>
    set({ languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l] })
  const canSave = canSaveProfile(f)

  const body = (
    <>
      {header}
      <div className="flex flex-col items-center gap-2">
        <DpUploader preview={f.dpPreview} onUploaded={({ key, previewUrl }) => set({ dpKey: key, dpPreview: previewUrl ?? f.dpPreview })} />
        <p className="text-[11.5px] font-medium text-ec-ink40">{t('dp.caption')}</p>
      </div>
      {!f.dpPreview && !f.dpKey && <p className="-mt-1 text-center text-[12.5px] font-semibold text-ec-warning">{t('dp.required')}</p>}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.name')}</span>
        <input className={field} value={f.name} onChange={(e) => set({ name: e.target.value })} aria-label={t('fields.name')} />
      </label>

      {/* Base city — Aadhaar-sourced. Locked on the hub edit screen; editable only in
          onboarding (where it's first captured). */}
      {lockBaseCity ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ec-ink60">{t('fields.baseCity')}</span>
          <div className="flex h-12 items-center justify-between rounded-xl border-[1.5px] border-ec-line bg-ec-bg px-3 text-[14px] font-semibold text-ec-ink">
            <span className="inline-flex items-center gap-2"><Pin size={16} className="text-ec-blue" />{f.baseCity || '—'}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ec-ink40"><Lock size={12} />{t('fields.baseCityFrom')}</span>
          </div>
        </div>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ec-ink60">{t('fields.baseCity')}</span>
          <input className={field} value={f.baseCity} onChange={(e) => set({ baseCity: e.target.value })} aria-label={t('fields.baseCity')} />
        </label>
      )}

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
          <span className="flex h-full items-center border-r border-ec-line bg-ec-bg px-3 text-ec-blue"><Bolt size={16} /></span>
          <input className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] font-semibold text-ec-ink outline-none" inputMode="numeric" value={f.experience}
            onChange={(e) => set({ experience: e.target.value.replace(/\D/g, '').slice(0, 2) })} aria-label={t('fields.experience')} />
          <span className="px-3 text-[13.5px] font-medium text-ec-ink60">{t('stats.years')}</span>
        </div>
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

      {/* Languages — selected as removable chips + an "add language" picker. The picker
          expands IN-FLOW (not a floating dropdown) so it can never be clipped or pushed
          below the viewport inside the scrollable edit overlay. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.languages')}</span>
        <div className="flex flex-wrap items-center gap-2">
          {f.languages.map((l) => (
            <span key={l} className="flex h-9 items-center gap-1.5 rounded-full bg-ec-sky pl-3 pr-1.5 text-[13px] font-bold text-ec-blueInk">
              {l}
              <button type="button" aria-label={`${t('removeLanguage')} ${l}`} onClick={() => toggleLang(l)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[14px] leading-none text-ec-ink60">×</button>
            </span>
          ))}
          <button type="button" aria-expanded={langOpen} onClick={() => setLangOpen((o) => !o)}
            className="flex h-9 items-center gap-1 rounded-full border-[1.5px] border-dashed border-ec-blue/50 px-3 text-[13px] font-bold text-ec-blue">
            <Plus size={14} />{t('addLanguage')}
          </button>
        </div>
        {langOpen && (
          <div className="mt-1 flex flex-wrap gap-2 rounded-xl border border-ec-line bg-white p-2.5 shadow-ec-card">
            {PROFILE_LANGUAGES.map((l) => {
              const on = f.languages.includes(l)
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => toggleLang(l)}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${on ? 'bg-ec-sky text-ec-blue' : 'border-[1.5px] border-ec-line text-ec-ink'}`}>
                  {l}{on && <Check size={14} className="text-ec-blue" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* About me — last field before the locked phone (matches prototype EditProfile order). */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('fields.bio')}</span>
        <textarea className={`${field} h-20 py-2`} value={f.bio} onChange={(e) => set({ bio: e.target.value })} aria-label={t('fields.bio')} maxLength={300} />
      </label>

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
    </>
  )

  const submitBtn = (
    <Button type="submit" size="lg" disabled={!canSave || submitting} className="w-full">
      {submitting ? t('saving') : t('save')}
    </Button>
  )

  const onSubmit_ = (e) => { e.preventDefault(); if (canSave && !submitting) onSubmit(toUpdateBody(f)) }

  // Hub edit overlay: scrollable body + sticky Save footer (mockup §4.A).
  if (pinnedFooter) {
    return (
      <form onSubmit={onSubmit_} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">{body}</div>
        <div className="shrink-0 border-t border-ec-line bg-white p-3.5">{submitBtn}</div>
      </form>
    )
  }

  // Onboarding: inline button at the end of the scrolling form.
  return (
    <form onSubmit={onSubmit_} className="flex flex-col gap-4">
      {body}
      {submitBtn}
    </form>
  )
}
