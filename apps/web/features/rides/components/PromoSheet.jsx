'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'

/**
 * New-feature popup (promos.js), a centered card: at most once a day, random, until opened.
 * @param {{ promo: {key: string, icon: Function}, onOpen: () => void, onClose: () => void }} props
 */
export function PromoSheet({ promo, onOpen, onClose }) {
  const t = useTranslations('rides')
  const tc = useTranslations('common')
  const title = t(`promo.${promo.key}.popTitle`)
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={title}>
      <div className="flex flex-col items-center px-1 pb-1 pt-3 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-ec-blue text-white shadow-ec-blue">
          <promo.icon size={36} />
        </span>
        <span className="mt-4 rounded-full bg-ec-sky px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ec-blue">{t('promo.new')}</span>
        <h2 className="mt-2 text-[21px] font-extrabold leading-tight tracking-tight text-ec-ink">{title}</h2>
        <p className="mt-2 text-[14px] font-semibold leading-relaxed text-ec-ink60">{t(`promo.${promo.key}.popSub`)}</p>
        <Button type="button" size="lg" onClick={onOpen} className="mt-6 w-full">{t(`promo.${promo.key}.cta`)}</Button>
        <Button type="button" variant="ghost" onClick={onClose} className="mt-2 w-full bg-ec-bg font-bold text-ec-ink60">{t('promo.later')}</Button>
      </div>
    </BottomSheet>
  )
}
