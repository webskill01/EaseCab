'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Verified, ChevD } from '@/components/ui/icons'
import { FormIssues } from '@/components/ui/FormIssues'
import { SavedVehicleOptions, SAVED_RC_LIST } from '@/features/profile/components/SavedVehicleOptions'
import { BT_STATES, BT_SEATS, BT_MAX_DAYS, BT_MAX_AHEAD_DAYS, BT_DAYS_MODE, isDaysMode, btIssues, isStarted, validUpto, fmtWhen, titleCase, toLocalInput, rateFor, rupees, fmtClock } from '../lib/borderTax'
import { useRates, useSecondsLeft, useLiveStates } from '../hooks/useBorderTax'

const CARD = 'rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card'
const FIELD = 'h-12 w-full rounded-xl border border-ec-line bg-white px-3 text-[14px] font-semibold text-ec-ink outline-none focus:border-ec-blue'
const LABEL = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ec-ink40'
const DAY_MS = 86_400_000

const BAD = '!border-ec-danger ring-1 ring-ec-danger'

/** Native select (keeps the phone's own picker) with our chevron instead of the browser arrow. */
function Select({ bad, className = '', children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={`${FIELD} appearance-none truncate pr-9 disabled:bg-ec-bg disabled:text-ec-ink40 ${bad ? BAD : ''} ${className}`}>{children}</select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ec-ink40"><ChevD size={18} /></span>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

/** "Latest fee here: ₹230 for 1 day (07 Nov)" — a real quote from a recent filing at this border. */
function LatestFee({ form }) {
  const t = useTranslations('seva')
  const rate = rateFor(useRates().data, form)
  if (!rate) return null
  return (
    <p className="-mt-1.5 text-[12.5px] font-semibold text-ec-ink60">
      {t('bt.latestFee', { amount: rupees(rate.taxPaise), n: rate.days, date: fmtWhen(rate.at).date })}
    </p>
  )
}

function DaysStepper({ days, onChange, label }) {
  const t = useTranslations('seva')
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg text-ec-ink disabled:text-ec-disabled'
  return (
    <div className="flex items-center justify-between rounded-xl bg-ec-bg px-3 py-2">
      <span className="text-[13.5px] font-bold text-ec-ink60">{label}</span>
      <div className="flex items-center gap-1 rounded-xl border border-ec-line bg-white px-1">
        <button type="button" className={btn} disabled={days <= 1} onClick={() => onChange(days - 1)} aria-label="-"><Minus /></button>
        <span className="min-w-[72px] text-center text-[14px] font-extrabold text-ec-ink">{t('bt.dayCount', { n: days })}</span>
        <button type="button" className={btn} disabled={days >= BT_MAX_DAYS} onClick={() => onChange(days + 1)} aria-label="+"><Plus size={18} /></button>
      </div>
    </div>
  )
}

/** Tax period chips, the same choices the govt portal offers in this state (Days / Monthly / …). */
function ModePicker({ modes, value, onChange }) {
  const t = useTranslations('seva')
  return (
    <div>
      <span className={LABEL}>{t('bt.mode')}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('bt.mode')}>
        {modes.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} onClick={() => onChange(m)}
            className={`h-10 rounded-xl border px-3.5 text-[13.5px] font-bold active:scale-[0.97] ${value === m ? 'border-ec-blue bg-ec-sky text-ec-blueInk' : 'border-ec-line bg-white text-ec-ink60'}`}>
            {t(`bt.modes.${m}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Border Tax form card (CabsWale layout): RC + seats, state + border, start, days, validity.
 * Controlled — the parent owns `form` and merges patches.
 */
export function BorderTaxForm({ form, onChange, onSubmit, submitting, error, busyUntil }) {
  const t = useTranslations('seva')
  const busyLeft = useSecondsLeft(error === 'busy' ? busyUntil : null) // form kept; Submit is the "try again"
  const errorText = error === 'busy' ? (busyLeft ? t('bt.errors.busy', { time: fmtClock(busyLeft) }) : null) : error && t(`bt.errors.${error}`)
  const st = BT_STATES[form.stateCd]
  const live = useLiveStates()
  const upto = fmtWhen(validUpto(form.startAt, form.days, st?.calendarDays))
  const daysMode = isDaysMode(form)
  const now = new Date()
  const more = isStarted(form) // the rest of the form opens once cab + state are in (keeps the first screen short)
  // Pay Now stays tappable: a tap on an incomplete form lists what's missing and marks the fields.
  const [tried, setTried] = useState(false)
  const issues = tried ? btIssues(form, now) : []
  const bad = (k) => issues.includes(k)
  const pay = () => { if (btIssues(form, now).length) setTried(true); else onSubmit() }
  return (
    <section className={CARD}>
      <h2 className="mb-3.5 text-[17px] font-extrabold tracking-tight text-ec-ink">{t('bt.formTitle')}</h2>
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <Field label={t('bt.vehicle')} className="flex-1">
            <input className={`${FIELD} uppercase tracking-wide ${bad('vehicle') ? BAD : ''}`} value={form.vehicleNo} maxLength={13} autoCapitalize="characters" autoComplete="off" list={SAVED_RC_LIST}
              onChange={(e) => onChange({ vehicleNo: e.target.value })} />
          </Field>
          <Field label={t('bt.seats')} className="w-[96px]">
            <Select bad={bad('seats')} value={form.seats} onChange={(e) => onChange({ seats: e.target.value })}>
              {BT_SEATS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <SavedVehicleOptions />
        <div className="flex gap-3">
          <Field label={t('bt.state')} className="flex-1">
            <Select bad={bad('state')} value={form.stateCd} onChange={(e) => onChange({ stateCd: e.target.value, checkpost: '', taxMode: BT_DAYS_MODE })}>
              <option value="" disabled>{t('bt.statePh')}</option>
              {Object.entries(BT_STATES).filter(([code]) => live.includes(code)).map(([code, s]) => <option key={code} value={code}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label={t('bt.border')} className="flex-1">
            <Select bad={bad('border')} value={form.checkpost} disabled={!st} onChange={(e) => onChange({ checkpost: e.target.value })}>
              <option value="" disabled>{t('bt.borderPh')}</option>
              {st?.checkposts.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
            </Select>
          </Field>
        </div>
        {more && (<>
          {daysMode && <LatestFee form={form} />}
          {st?.taxModes.length > 1 && <ModePicker modes={st.taxModes} value={form.taxMode} onChange={(taxMode) => onChange({ taxMode })} />}
          <Field label={t('bt.start')}>
            <input type="datetime-local" className={`${FIELD} ${bad('start') ? BAD : ''}`} value={form.startAt}
              min={toLocalInput(now)} max={toLocalInput(new Date(now.getTime() + BT_MAX_AHEAD_DAYS * DAY_MS))}
              onChange={(e) => onChange({ startAt: e.target.value })} />
          </Field>
          {daysMode && <DaysStepper days={form.days} label={t('bt.days')} onChange={(days) => onChange({ days })} />}
          {st?.needsDistance && (
            <Field label={t('bt.distance')}>
              <input type="number" inputMode="numeric" className={`${FIELD} ${bad('distance') ? BAD : ''}`} value={form.distanceKm}
                onChange={(e) => onChange({ distanceKm: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </Field>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-ec-skyDeep bg-ec-sky px-3.5 py-3">
            <span className="text-ec-blueInk"><Verified /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ec-ink60">{t('bt.validity')}</p>
              <p className="text-[14.5px] font-extrabold text-ec-blueInk">
                {daysMode ? t('bt.validUpto', { date: upto.date, time: upto.time }) : t('bt.periodEnd', { mode: t(`bt.modes.${form.taxMode}`) })}
              </p>
            </div>
          </div>
          <label className={`flex items-start gap-2.5 rounded-lg ${bad('declare') ? 'bg-ec-dangerBg p-2 ring-1 ring-ec-danger' : ''}`}>
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-ec-blue" checked={form.declare} onChange={(e) => onChange({ declare: e.target.checked })} />
            <span className="text-[12.5px] font-medium leading-snug text-ec-ink60">{t('bt.declare')}</span>
          </label>
          <FormIssues items={issues.map((k) => t(`bt.issues.${k}`))} />
          {errorText && <p className="rounded-xl bg-ec-dangerBg px-3 py-2 text-[13px] font-semibold text-ec-danger" role="status">{errorText}</p>}
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[12px] font-semibold leading-snug text-ec-successTx">{t('bt.freeNote')}</p>
            <Button type="button" size="lg" className="min-w-[150px]" disabled={submitting || Boolean(busyLeft)} onClick={pay}>
              {submitting ? t('bt.submitting') : t('bt.submit')}
            </Button>
          </div>
        </>)}
      </div>
    </section>
  )
}
