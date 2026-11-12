'use client'

import { useTranslations } from 'next-intl'
import { ChevL, Check, Warning } from '@/components/ui/icons'
import { useBorderTaxActions, useSecondsLeft } from '../hooks/useBorderTax'
import { BT_STATUS as S, BT_STATES, BT_PREP_SEC, BT_CAPTCHA_SEC, prepStep, prepDeadline, daysOf, isDaysMode, fmtWhen, fmtClock } from '../lib/borderTax'
import { CaptchaStep } from './FilingSteps'

const STEPS = ['verify', 'docs', 'fetch', 'redirect']
const R = 70
const C = 2 * Math.PI * R

/** Countdown ring: the captcha deadline while one waits, else the usual time a filing takes. */
function Ring({ seconds, total }) {
  const left = Math.min(seconds ?? 0, total)
  return (
    <div className="relative mx-auto h-[168px] w-[168px]">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" strokeWidth="9" className="stroke-ec-skyDeep" />
        <circle cx="80" cy="80" r={R} fill="none" strokeWidth="9" className="stroke-ec-blueInk transition-[stroke-dashoffset] duration-1000"
          strokeDasharray={C} strokeDashoffset={C * (left / total)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-ec-blueInk">
        <span className="text-[30px] font-extrabold tabular-nums tracking-tight">{fmtClock(left)}</span>
      </div>
    </div>
  )
}

function Checklist({ at }) {
  const t = useTranslations('seva')
  return (
    <ul className="space-y-4 rounded-ec-card bg-white px-5 py-5 shadow-ec-card">
      {STEPS.map((k, i) => (
        <li key={k} className="flex items-center gap-3.5">
          {i < at
            ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ec-successBg text-ec-successTx"><Check size={16} /></span>
            : <span className={`h-7 w-7 rounded-full border-[3px] ${i === at ? 'animate-spin border-ec-blueInk border-t-transparent' : 'border-ec-line'}`} />}
          <span className={`text-[15px] ${i === at ? 'font-extrabold text-ec-blueInk' : i < at ? 'font-semibold text-ec-ink' : 'font-medium text-ec-ink60'}`}>
            {t(`bt.prep.${k}`)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Amount (once known), RC chip, STATE • days, validity window. */
export function SummaryCard({ f }) {
  const t = useTranslations('seva')
  const from = fmtWhen(f.taxFrom)
  const upto = fmtWhen(f.taxUpto)
  return (
    <div className="rounded-ec-card border border-ec-line bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[22px] font-extrabold text-ec-blueInk">{f.taxPaise !== null && `₹ ${Math.round(f.taxPaise / 100)}`}</p>
        <span className="rounded-lg border border-ec-skyDeep bg-ec-sky px-3 py-1 text-[14px] font-extrabold text-ec-blueInk">{f.vehicleNo}</span>
      </div>
      <p className="mt-1 text-[14px] font-semibold uppercase text-ec-ink60">
        {BT_STATES[f.stateCd]?.name || f.stateCd} • {isDaysMode(f) ? t('bt.dayCount', { n: daysOf(f) }) : t(`bt.modes.${f.taxMode}`)}
      </p>
      {(isDaysMode(f) || f.taxPaise !== null) && ( // other periods: the portal's end date arrives with the quote
        <p className="mt-1 text-[12.5px] font-bold text-ec-blueInk">
          {t('bt.prep.validity', { from: `${from.date}, ${from.time}`, to: `${upto.date}, ${upto.time}` })}
        </p>
      )}
    </div>
  )
}

/**
 * Full-screen "Preparing your border tax payment" (CabsWale-style) while the filing runs.
 * The captcha box shows inline only when OCR missed. Back just hides it — the filing keeps going
 * and reopens when the driver returns.
 * @param {{ f: object, onBack: () => void }} props
 */
export function PreparingScreen({ f, onBack }) {
  const t = useTranslations('seva')
  const a = useBorderTaxActions()
  const captcha = f.status === S.AWAITING_CAPTCHA && f.live?.captcha
  const deadline = prepDeadline(f)
  const seconds = useSecondsLeft(deadline) ?? BT_PREP_SEC // queued: full ring until the worker picks it up
  const startsIn = useSecondsLeft(f.status === S.QUEUED ? f.live?.startsAt : null) // behind the portal's lookup gap
  const pending = a.captcha.isPending || a.refresh.isPending || a.cancel.isPending
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ec-bg">
      <div className="flex items-center gap-1 px-2 pb-1 pt-2">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-ec-ink" aria-label={t('back')}>
          <ChevL />
        </button>
        <h1 className="text-[19px] font-extrabold tracking-tight text-ec-ink">{t('bt.title')}</h1>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-8 pt-3">
        <Ring seconds={seconds} total={captcha ? BT_CAPTCHA_SEC : BT_PREP_SEC} />
        <h2 className="text-center text-[19px] font-extrabold tracking-tight text-ec-ink">{t('bt.prep.title')}</h2>
        {!deadline && <p className="-mt-3 text-center text-[13px] font-semibold text-ec-ink60">{startsIn ? t('bt.prep.startsIn', { time: fmtClock(startsIn) }) : t('bt.prep.queued')}</p>}
        {captcha && (
          <div className="rounded-ec-card border border-ec-skyDeep bg-white px-4 py-4">
            <p className="text-[15px] font-extrabold text-ec-ink">{t('bt.live.captchaTitle')}</p>
            <p className="mb-3 text-[12.5px] font-medium text-ec-ink60">{t('bt.live.captchaSub')}</p>
            <CaptchaStep key={f.live.captcha} image={f.live.captcha} pending={pending} canRefresh={f.live.canRefresh}
              onSubmit={(answer) => a.captcha.mutate({ id: f.id, answer })} onRefresh={() => a.refresh.mutate(f.id)} />
          </div>
        )}
        <Checklist at={prepStep(f)} />
        <SummaryCard f={f} />
        <div className="flex gap-3 rounded-ec-card border border-[#FDE68A] bg-ec-warnBg px-4 py-3.5">
          <span className="mt-0.5 text-ec-amberTx"><Warning size={20} /></span>
          <div>
            <p className="text-[14.5px] font-extrabold text-ec-ink">{t('bt.prep.keepOpenT')}</p>
            <p className="text-[12.5px] font-medium leading-snug text-ec-ink60">{t('bt.prep.keepOpenS')}</p>
          </div>
        </div>
        <button type="button" disabled={pending} onClick={() => a.cancel.mutate(f.id)} className="w-full py-2 text-center text-[13.5px] font-bold text-ec-ink60">
          {t('bt.live.cancel')}
        </button>
      </div>
    </div>
  )
}
