'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'

/**
 * New-feature popup (promos.js) — at most once a day, random, until opened.
 * @param {{ promo: {key: string, icon: Function}, onOpen: () => void, onClose: () => void }} props
 */
export function PromoSheet({ promo, onOpen, onClose }) {
  const t = useTranslations('rides')
  const title = t(`promo.${promo.key}.popTitle`)
  return (
    <BottomSheet onClose={onClose} label={title}>
      <SheetTitle icon={<promo.icon size={22} />} title={title} sub={t(`promo.${promo.key}.popSub`)} />
      <div className="flex gap-2.5 pb-2">
        <Button type="button" variant="outline" size="lg" onClick={onClose} className="flex-1">{t('promo.later')}</Button>
        <Button type="button" variant="primary" size="lg" onClick={onOpen} className="flex-1">{t(`promo.${promo.key}.cta`)}</Button>
      </div>
    </BottomSheet>
  )
}
