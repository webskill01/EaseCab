'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Road, Grid } from '@/components/ui/icons'

/**
 * Driver Seva — driver services as square tiles in sections (CabsWale "Suvidha" layout).
 * Only Border Tax is live; the greyed tiles are generic "Coming soon" — never name an unbuilt feature.
 * [sectionKey, [[tileKey, Icon, href | null], ...]]
 */
const SECTIONS = [
  ['services', [['borderTax', Road, '/seva/border-tax'], ['comingSoon', Grid, null], ['comingSoon', Grid, null]]],
]

function Tile({ label, badge, Icon, onClick }) {
  const live = Boolean(onClick)
  return (
    <button
      type="button"
      disabled={!live}
      onClick={onClick}
      className="relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-ec-line bg-white p-2 shadow-ec-card transition-transform active:scale-[0.97] disabled:shadow-none"
    >
      {badge && (
        <span className="absolute right-1.5 top-1.5 rounded-ec-chip bg-ec-successBg px-1.5 py-[1px] text-[9.5px] font-extrabold uppercase tracking-wide text-ec-successTx">
          {badge}
        </span>
      )}
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${live ? 'bg-ec-sky text-ec-blue' : 'bg-ec-bg text-ec-ink40'}`}>
        <Icon size={26} />
      </span>
      <span className={`px-1 text-center text-[12.5px] font-bold leading-tight ${live ? 'text-ec-ink' : 'text-ec-ink40'}`}>{label}</span>
    </button>
  )
}

export function SevaScreen() {
  const t = useTranslations('seva')
  const router = useRouter()
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ec-bg px-4 pb-6 pt-2.5">
      <h1 className="text-[20px] font-extrabold tracking-tight text-ec-ink">{t('title')}</h1>
      <p className="mt-0.5 text-[13px] font-medium text-ec-ink60">{t('sub')}</p>
      {SECTIONS.map(([section, tiles]) => (
        <section key={section} className="mt-5">
          <h2 className="mb-2.5 text-[15px] font-extrabold tracking-tight text-ec-ink">{t(`sections.${section}`)}</h2>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map(([key, Icon, href], i) => (
              <Tile key={`${key}-${i}`} Icon={Icon} label={t(`tiles.${key}`)} badge={href ? t('tiles.free') : null} onClick={href ? () => router.push(href) : undefined} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
