'use client'

import { useTranslations } from 'next-intl'
import { Road, Whatsapp, Gift, GasStation } from '@/components/ui/icons'
import { WaGroupSheet } from './WaGroupSheet'
import { SevaGateSheet } from './SevaGateSheet'
import { useSevaActions } from '../hooks/useSevaActions'

// [tileKey, Icon, useSevaActions key, gradient, badgeKey | null]
const ACTIONS = Object.freeze([
  ['borderTax', Road, 'openBorderTax', 'from-ec-blue to-ec-blueInk', 'free'],
  ['fuel', GasStation, 'openFuel', 'from-[#F59E0B] to-[#EA580C]', 'new'],
  ['waGroup', Whatsapp, 'openWaGroup', 'from-ec-wa to-[#128C7E]', null],
  ['refer', Gift, 'openRefer', 'from-[#8B5CF6] to-[#6D28D9]', null],
])
const BADGE_TONE = Object.freeze({ new: 'bg-ec-warning text-white', free: 'bg-ec-successBg text-ec-successTx' })

/** Launcher-style action: coloured icon tile with an optional corner tag, 2-line label under it. */
function Action({ onClick, Icon, label, tone, badge, badgeKey }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl pb-0.5 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
      <span className={`relative flex h-12 w-12 items-center justify-center rounded-[15px] bg-gradient-to-br text-white shadow-ec-card transition-transform duration-150 group-active:scale-[0.92] motion-reduce:transition-none ${tone}`}>
        <Icon size={24} />
        {badge && (
          <span className={`absolute -right-2.5 -top-1.5 rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide ring-2 ring-ec-bg ${BADGE_TONE[badgeKey]}`}>{badge}</span>
        )}
      </span>
      <span className="line-clamp-2 w-full px-0.5 text-center text-[11.5px] font-bold leading-[1.2] text-ec-ink">{label}</span>
    </button>
  )
}

/**
 * Feed's Seva row (between the filter row and the Rides tabs): a "Seva" heading over all
 * four live services in one 4-column grid, so every one is on screen without swiping.
 * The same services are tiles on the Seva tab.
 */
export function SevaStrip() {
  const t = useTranslations('seva')
  const seva = useSevaActions()
  return (
    <div className="bg-ec-bg px-4 pt-1.5">
      <h2 className="text-[13px] font-extrabold tracking-tight text-ec-ink">{t('title')}</h2>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {ACTIONS.map(([key, Icon, action, tone, badgeKey]) => (
          <Action key={key} onClick={seva[action]} Icon={Icon} label={t(`tiles.${key}`)} tone={tone} badgeKey={badgeKey} badge={badgeKey ? t(`tiles.${badgeKey}`) : null} />
        ))}
      </div>
      {seva.sheet === 'wa' && <WaGroupSheet onClose={seva.close} />}
      {seva.sheet === 'gate' && <SevaGateSheet onClose={seva.close} />}
    </div>
  )
}
