import Link from 'next/link'
import Image from 'next/image'
import { getTranslations, getLocale } from 'next-intl/server'
import { Bolt, Phone } from '@/components/ui/icons'
import { LanguageMenu } from '@/features/shell/components/LanguageMenu'
import { COMPANY } from '@/config/company'

/** Play Store listing URL — fill in once the app is live (Step 27c), badge turns into a link. */
export const PLAY_STORE_URL = null

export async function LandingHeader() {
  const t = await getTranslations('landing')
  const locale = await getLocale()
  return (
    <header className="sticky top-0 z-40 border-b border-ec-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <Image src="/icons/icon-96.png" unoptimized alt="EaseCab logo" width={36} height={36} className="rounded-[10px]" />
          <span className="leading-tight">
            <span className="block text-[19px] font-extrabold tracking-tight text-ec-ink">{COMPANY.brand}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ec-ink40">
              Mobility Solutions Private Limited
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <LanguageMenu current={locale} />
          <Link
            href="/feed"
            className="flex h-[38px] items-center rounded-[10px] bg-ec-blue px-4 text-[14px] font-extrabold text-white shadow-ec-blue transition-colors hover:bg-ec-blueDeep"
          >
            {t('header.open')}
          </Link>
        </div>
      </div>
    </header>
  )
}

export async function LandingHero() {
  const t = await getTranslations('landing')
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 pb-16 pt-12 lg:flex-row lg:gap-8 lg:pt-20">
      <div className="max-w-xl text-center lg:text-left">
        <p className="inline-flex items-center gap-1.5 rounded-ec-chip bg-ec-sky px-3.5 py-1.5 text-[13px] font-extrabold text-ec-blueInk">
          <Bolt size={14} className="text-ec-blue" />
          {t('hero.badge')}
        </p>
        <h1 className="mt-4 text-[34px] font-extrabold leading-[1.15] tracking-tight text-ec-ink sm:text-[44px]">
          {t('hero.title')}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ec-ink60">{t('hero.subtitle')}</p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
          <Link
            href="/feed"
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-ec-blue px-7 text-[16px] font-extrabold text-white shadow-ec-blue transition-colors hover:bg-ec-blueDeep sm:w-auto"
          >
            {t('hero.ctaApp')}
          </Link>
          <PlayBadge label={PLAY_STORE_URL ? t('hero.playOn') : t('hero.playSoon')} store={t('hero.playStore')} />
        </div>
        <p className="mt-4 text-[14px] font-semibold text-ec-ink40">{t('hero.trial')}</p>
        <p className="mt-2 text-[13px] font-semibold text-ec-ink60">
          {t('hero.operatedBy')} <span className="text-ec-ink">{COMPANY.legalName}</span>
        </p>
      </div>
      <PhoneMockup />
    </section>
  )
}

/** Placeholder Play badge until the listing is live — swap for Google's official badge asset then. */
function PlayBadge({ label, store }) {
  const inner = (
    <>
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
        <path d="M4 2.5v19l10-9.5L4 2.5z" fill="#00D7FE" />
        <path d="M4 2.5L14 12l3.5-3.3L6 2 4 2.5z" fill="#00F076" />
        <path d="M14 12L4 21.5 6 22l11.5-6.7L14 12z" fill="#FF3A44" />
        <path d="M17.5 8.7L14 12l3.5 3.3 3-1.8c1-.6 1-2.4 0-3l-3-1.8z" fill="#FFC900" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
        <span className="block text-[16px] font-extrabold">{store}</span>
      </span>
    </>
  )
  const base = 'flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] px-6 text-white sm:w-auto'
  if (PLAY_STORE_URL) {
    return (
      <a href={PLAY_STORE_URL} className={`${base} bg-ec-ink transition-opacity hover:opacity-90`}>
        {inner}
      </a>
    )
  }
  return <span className={`${base} cursor-default bg-ec-ink/70`}>{inner}</span>
}

async function PhoneMockup() {
  const t = await getTranslations('landing')
  return (
    <div className="w-[290px] shrink-0 rounded-[36px] border-[6px] border-ec-ink bg-ec-ink p-2 shadow-ec-float" aria-hidden="true">
      <div className="rounded-[26px] bg-ec-bg p-3">
        <div className="mb-3 flex items-center justify-between px-1 pt-1">
          <span className="text-[15px] font-extrabold text-ec-ink">EaseCab</span>
          <span className="h-2 w-2 rounded-full bg-ec-success" />
        </div>
        <MockRideCard from="Chandigarh" to="Delhi" vehicle="Dzire" time={t('mock.justNow')} tag={t('mock.fresh')} call={t('mock.call')} />
        <MockRideCard from="Ludhiana" to="Amritsar" vehicle="Innova" time={t('mock.minAgo')} tag={t('mock.fresh')} call={t('mock.call')} />
      </div>
    </div>
  )
}

function MockRideCard({ from, to, vehicle, time, tag, call }) {
  return (
    <div className="mb-3 rounded-ec-card bg-white p-3.5 shadow-ec-card">
      <div className="flex items-center justify-between">
        <span className="rounded-ec-chip bg-ec-successBg px-2.5 py-0.5 text-[11px] font-extrabold text-ec-successTx">{tag}</span>
        <span className="text-[11px] font-semibold text-ec-ink40">{time}</span>
      </div>
      <p className="mt-2.5 text-[15px] font-extrabold text-ec-ink">
        {from} <span className="text-ec-blue">→</span> {to}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-ec-ink60">{vehicle}</p>
      <div className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-ec-blue text-[13px] font-extrabold text-white">
        <Phone size={14} />
        {call}
      </div>
    </div>
  )
}
