'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Verified } from '@/components/ui/icons'
import { SavedVehicleOptions, SAVED_RC_LIST } from '@/features/profile/components/SavedVehicleOptions'
import { BT_LIVE_STATES } from '../lib/states'
import { BT_STATES, BT_SEATS, BT_MAX_DAYS, BT_MAX_AHEAD_DAYS, BT_DAYS_MODE, isDaysMode, isFilable, isStarted, validUpto, fmtWhen, titleCase, toLocalInput, rateFor, rupees, fmtClock } from '../lib/borderTax'
import { useRates, useSecondsLeft } from '../hooks/useBorderTax'

const CARD = 'rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card'
const FIELD = 'h-12 w-full rounded-xl border border-ec-line bg-white px-3 text-[14px] font-semibold text-ec-ink outline-none focus:border-ec-blue'
const LABEL = 'mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ec-ink40'
const DAY_MS = 86_400_000

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
  const upto = fmtWhen(validUpto(form.startAt, form.days, st?.calendarDays))
  const daysMode = isDaysMode(form)
  const now = new Date()
  const more = isStarted(form) // the rest of the form opens once cab + state are in (keeps the first screen short)
  return (
    <section className={CARD}>
      <h2 className="mb-3.5 text-[17px] font-extrabold tracking-tight text-ec-ink">{t('bt.formTitle')}</h2>
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <Field label={t('bt.vehicle')} className="flex-1">
            <input className={`${FIELD} uppercase tracking-wide`} value={form.vehicleNo} maxLength={13} autoCapitalize="characters" autoComplete="off" list={SAVED_RC_LIST}
              onChange={(e) => onChange({ vehicleNo: e.target.value })} />
          </Field>
          <Field label={t('bt.seats')} className="w-[96px]">
            <select className={FIELD} value={form.seats} onChange={(e) => onChange({ seats: e.target.value })}>
              {BT_SEATS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <SavedVehicleOptions />
        <div className="flex gap-3">
          <Field label={t('bt.state')} className="flex-1">
            <select className={FIELD} value={form.stateCd} onChange={(e) => onChange({ stateCd: e.target.value, checkpost: '', taxMode: BT_DAYS_MODE })}>
              <option value="" disabled>{t('bt.statePh')}</option>
              {Object.entries(BT_STATES).filter(([code]) => BT_LIVE_STATES.includes(code)).map(([code, s]) => <option key={code} value={code}>{s.name}</option>)}
            </select>
          </Field>
          <Field label={t('bt.border')} className="flex-1">
            <select className={FIELD} value={form.checkpost} disabled={!st} onChange={(e) => onChange({ checkpost: e.target.value })}>
              <option value="">{t('bt.borderAny')}</option>
              {st?.checkposts.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
            </select>
          </Field>
        </div>
        {more && (<>
          {daysMode && <LatestFee form={form} />}
          {st?.taxModes.length > 1 && <ModePicker modes={st.taxModes} value={form.taxMode} onChange={(taxMode) => onChange({ taxMode })} />}
          <Field label={t('bt.start')}>
            <input type="datetime-local" className={FIELD} value={form.startAt}
              min={toLocalInput(now)} max={toLocalInput(new Date(now.getTime() + BT_MAX_AHEAD_DAYS * DAY_MS))}
              onChange={(e) => onChange({ startAt: e.target.value })} />
          </Field>
          {daysMode && <DaysStepper days={form.days} label={t('bt.days')} onChange={(days) => onChange({ days })} />}
          {st?.needsDistance && (
            <Field label={t('bt.distance')}>
              <input type="number" inputMode="numeric" className={FIELD} value={form.distanceKm}
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
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-ec-blue" checked={form.declare} onChange={(e) => onChange({ declare: e.target.checked })} />
            <span className="text-[12.5px] font-medium leading-snug text-ec-ink60">{t('bt.declare')}</span>
          </label>
          {errorText && <p className="rounded-xl bg-ec-dangerBg px-3 py-2 text-[13px] font-semibold text-ec-danger" role="status">{errorText}</p>}
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[12px] font-semibold leading-snug text-ec-successTx">{t('bt.freeNote')}</p>
            <Button type="button" size="lg" className="min-w-[150px]" disabled={submitting || Boolean(busyLeft) || !isFilable(form, now)} onClick={onSubmit}>
              {submitting ? t('bt.submitting') : t('bt.submit')}
            </Button>
          </div>
        </>)}
      </div>
    </section>
  )
}
