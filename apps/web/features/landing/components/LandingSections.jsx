import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Bolt, Pin, Phone, Plus, Globe } from '@/components/ui/icons'
import { LOCALE_NAMES } from '@/i18n/config'

const FEATURES = [
  { key: 'live', Icon: Bolt },
  { key: 'city', Icon: Pin },
  { key: 'direct', Icon: Phone },
  { key: 'post', Icon: Plus },
]

export async function FeatureGrid() {
  const t = await getTranslations('landing')
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-center text-[26px] font-extrabold tracking-tight text-ec-ink sm:text-[32px]">
          {t('features.title')}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, Icon }) => (
            <div key={key} className="rounded-ec-card border border-ec-line bg-ec-bg p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-ec-sky text-ec-blue">
                <Icon size={20} />
              </span>
              <h3 className="mt-3.5 text-[17px] font-extrabold text-ec-ink">{t(`features.${key}.title`)}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ec-ink60">{t(`features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export async function LanguageStrip() {
  const t = await getTranslations('landing')
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-ec-sky text-ec-blue">
        <Globe size={20} />
      </span>
      <h2 className="mt-4 text-[26px] font-extrabold tracking-tight text-ec-ink sm:text-[32px]">{t('languages.title')}</h2>
      <p className="mx-auto mt-3 max-w-lg text-[16px] text-ec-ink60">{t('languages.body')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {Object.entries(LOCALE_NAMES).map(([code, name]) => (
          <span key={code} className="rounded-ec-chip border border-ec-line bg-white px-4 py-2 text-[15px] font-extrabold text-ec-ink">
            {name}
          </span>
        ))}
      </div>
    </section>
  )
}

export async function IosInstall() {
  const t = await getTranslations('landing')
  const steps = [t('ios.step1'), t('ios.step2'), t('ios.step3')]
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-[26px] font-extrabold tracking-tight text-ec-ink sm:text-[32px]">{t('ios.title')}</h2>
        <ol className="mx-auto mt-8 flex max-w-md flex-col gap-3 text-left">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3.5 rounded-ec-card border border-ec-line bg-ec-bg px-4 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ec-blue text-[14px] font-extrabold text-white">
                {i + 1}
              </span>
              <span className="text-[15px] font-semibold text-ec-ink">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export async function LandingFooter() {
  const t = await getTranslations('landing')
  return (
    <footer className="border-t border-ec-line bg-ec-bg">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-[16px] font-extrabold text-ec-ink">EaseCab</p>
          <p className="mt-1 text-[13px] text-ec-ink60">{t('footer.tagline')}</p>
        </div>
        <div className="flex flex-col items-center gap-2 text-[13px] font-semibold text-ec-ink60 sm:items-end">
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="transition-colors hover:text-ec-ink">{t('footer.privacy')}</Link>
            <Link href="/terms" className="transition-colors hover:text-ec-ink">{t('footer.terms')}</Link>
          </div>
          <a href="mailto:support@easecab.com" className="transition-colors hover:text-ec-ink">support@easecab.com</a>
        </div>
      </div>
    </footer>
  )
}
