'use client'

import { useTranslations } from 'next-intl'
import { Road, Whatsapp, Gift } from '@/components/ui/icons'
import { WaGroupSheet } from './WaGroupSheet'
import { SevaGateSheet } from './SevaGateSheet'
import { useSevaActions } from '../hooks/useSevaActions'

/** One highlighted quick-action button: icon tile + title/sub + a NEW tag on the corner. */
function Action({ onClick, Icon, title, sub, tone, badge }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex h-[52px] w-[43%] shrink-0 snap-start items-center gap-2 rounded-xl px-2.5 text-left text-white shadow-ec-card transition-transform active:scale-[0.97] ${tone}`}>
      <span className="absolute -top-1.5 right-2 rounded-full bg-ec-warning px-1.5 text-[9.5px] font-extrabold uppercase leading-4 tracking-wide text-white ring-2 ring-ec-bg">{badge}</span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white/20"><Icon size={18} /></span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-extrabold leading-tight">{title}</span>
        <span className="hidden truncate text-[10.5px] font-semibold leading-tight text-white/85 min-[360px]:block">{sub}</span>
      </span>
    </button>
  )
}

/**
 * Feed's Seva strip (between the filter row and the Rides tabs): a "Seva" heading over
 * the live services as a horizontal scroller. Cards are 43% wide so the third one peeks
 * in at the right edge — that's the "swipe for more" hint. The scroller bleeds to the
 * screen edges (-mx-4 px-4); pt-2 leaves room for the NEW tag, which overflow would clip.
 */
export function SevaStrip() {
  const t = useTranslations('seva')
  const seva = useSevaActions()
  return (
    <div className="bg-ec-bg pt-1.5">
      <h2 className="px-4 text-[13px] font-extrabold tracking-tight text-ec-ink">{t('title')}</h2>
      <div className="flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Action onClick={seva.openBorderTax} Icon={Road} tone="bg-gradient-to-br from-ec-blue to-ec-blueInk" title={t('tiles.borderTax')} sub={t('strip.btSub')} badge={t('tiles.new')} />
        <Action onClick={seva.openWaGroup} Icon={Whatsapp} tone="bg-gradient-to-br from-ec-wa to-[#128C7E]" title={t('tiles.waGroup')} sub={t('strip.waSub')} badge={t('tiles.new')} />
        <Action onClick={seva.openRefer} Icon={Gift} tone="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]" title={t('tiles.refer')} sub={t('strip.referSub')} badge={t('tiles.new')} />
      </div>
      {seva.sheet === 'wa' && <WaGroupSheet onClose={seva.close} />}
      {seva.sheet === 'gate' && <SevaGateSheet onClose={seva.close} />}
    </div>
  )
}
