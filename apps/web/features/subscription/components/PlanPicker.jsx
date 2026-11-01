'use client'

import { Check } from '@/components/ui/icons'
import { PLANS, PLAN_TAG, planSavings, rupees } from '../lib/plans'

const TAG_STYLE = Object.freeze({
  [PLAN_TAG.POPULAR]: 'bg-ec-blue text-white',
  [PLAN_TAG.BEST]: 'bg-ec-success text-white',
})

/** One selectable plan row: radio dot, duration + per-month, price + struck MRP, savings badge. */
function PlanOption({ plan, selected, onSelect, t }) {
  const s = planSavings(plan)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(plan.id)}
      className={`relative w-full rounded-2xl border-[1.5px] bg-white px-4 pb-3.5 text-left transition-colors ${plan.tag ? 'pt-5' : 'pt-3.5'} ${selected ? 'border-ec-blue bg-ec-sky shadow-[0_6px_18px_rgba(37,99,235,0.15)]' : 'border-ec-line'}`}
    >
      {plan.tag && (
        <span className={`absolute -top-2.5 left-4 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${TAG_STYLE[plan.tag]}`}>
          {t(`plan.tag.${plan.tag}`)}
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-ec-blue bg-ec-blue text-white' : 'border-ec-ink40'}`}>
          {selected && <Check size={12} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold text-ec-ink">{t('plan.months', { count: plan.months })}</p>
          <p className="text-[12.5px] font-semibold text-ec-ink60">{t('plan.perMonthPrice', { price: rupees(s.perMonth) })}</p>
        </div>
        <div className="text-right">
          <p className="text-[19px] font-extrabold leading-none text-ec-ink">{rupees(plan.price)}</p>
          {s.off > 0 && <p className="mt-1 text-[12px] font-semibold text-ec-ink40 line-through">{rupees(s.mrp)}</p>}
        </div>
      </div>
      {s.off > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-8">
          <span className="rounded-md bg-ec-successBg px-2 py-0.5 text-[11.5px] font-extrabold text-ec-successTx">
            {t('plan.save', { amount: rupees(s.off) })} · {t('plan.off', { pct: s.pct })}
          </span>
          {plan.tag === PLAN_TAG.BEST && (
            <span className="text-[11.5px] font-bold text-ec-successTx">{t('plan.bestNote', { price: rupees(s.perMonth) })}</span>
          )}
        </div>
      )}
    </button>
  )
}

/** 4-plan radio list + shared feature list. */
export function PlanPicker({ value, onChange, t }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-extrabold text-ec-ink">{t('plan.choose')}</h2>
      <div role="radiogroup" aria-label={t('plan.choose')} className="space-y-3.5 pt-1">
        {PLANS.map((p) => (
          <PlanOption key={p.id} plan={p} selected={p.id === value} onSelect={onChange} t={t} />
        ))}
      </div>
      <ul className="rounded-2xl border border-ec-line bg-white p-4">
        {['feat1', 'feat2', 'feat3'].map((k) => (
          <li key={k} className="mb-2.5 flex items-start gap-2.5 last:mb-0">
            <span className="mt-0.5 inline-flex text-ec-success"><Check size={17} /></span>
            <span className="text-[13.5px] font-semibold leading-snug text-ec-ink">{t(`plan.${k}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
