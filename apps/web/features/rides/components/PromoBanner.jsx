'use client'

import { useTranslations } from 'next-intl'
import { ChevR } from '@/components/ui/icons'

/**
 * New-feature banner above the feed's filter row (promos.js). Shows for the promo's
 * whole window; the tap opens the feature.
 * @param {{ promo: {key: string, icon: Function}, onOpen: () => void }} props
 */
export function PromoBanner({ promo, onOpen }) {
  const t = useTranslations('rides')
  return (
    <div className="bg-ec-bg px-4 pt-2.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-ec-card border border-ec-blue/30 bg-ec-sky px-3.5 py-3 text-left"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ec-blue text-white"><promo.icon size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-ec-blue px-1.5 py-px text-[10px] font-extrabold uppercase tracking-wide text-white">{t('promo.new')}</span>
            <span className="truncate text-[14px] font-extrabold text-ec-blueInk">{t(`promo.${promo.key}.title`)}</span>
          </span>
          <span className="mt-px block text-[11.5px] font-semibold text-ec-ink60">{t(`promo.${promo.key}.sub`)}</span>
        </span>
        <span className="flex shrink-0 items-center text-[13px] font-extrabold text-ec-blue">{t(`promo.${promo.key}.cta`)}<ChevR size={16} /></span>
      </button>
    </div>
  )
}
