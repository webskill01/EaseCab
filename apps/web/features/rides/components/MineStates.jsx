'use client'

import { useTranslations } from 'next-intl'
import { Plus, Chat } from '@/components/ui/icons'

export function MineCardSkeleton() {
  return <div className="h-[150px] animate-pulse rounded-ec-card border border-ec-line bg-white" />
}

/** Per-tab empty state with a CTA. @param {{ tab: 'posted'|'contacted', onCta: ()=>void }} props */
export function MineEmpty({ tab, onCta }) {
  const t = useTranslations('mine')
  const Icon = tab === 'posted' ? Plus : Chat
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {/* 72px sky icon tile (myrides.jsx EmptyState) */}
      <div className="mb-2 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-ec-sky text-ec-blue">
        <Icon size={30} />
      </div>
      <h2 className="text-[17px] font-extrabold text-ec-ink">{t(`empty.${tab}.title`)}</h2>
      <p className="text-[13.5px] font-medium text-ec-ink60">{t(`empty.${tab}.sub`)}</p>
      <button type="button" onClick={onCta} className="mt-2 h-[46px] rounded-xl bg-ec-blue px-5 text-[14.5px] font-extrabold text-white shadow-ec-blue">
        {t(`empty.${tab}.cta`)}
      </button>
    </div>
  )
}
