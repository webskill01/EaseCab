import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { SupportButton } from './SupportButton'
import { LanguageMenu } from './LanguageMenu'

/**
 * App chrome (chrome.jsx TopBar): brand name + tagline · language pill · Support.
 * Per the locked design there is NO logout here — logout lives on the Profile
 * screen (Step 21; the profile placeholder carries it for now). `locale` comes
 * from the server layout.
 */
export function TopBar({ locale }) {
  const t = useTranslations('common')
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-ec-line bg-white px-3.5 py-2.5">
      <Image src="/icons/icon-96.png" alt="" width={34} height={34} priority className="shrink-0 rounded-[9px]" />
      <div className="min-w-0 flex-1 leading-none">
        <p className="text-[18px] font-extrabold tracking-tight text-ec-ink">{t('appName')}</p>
        <p className="mt-0.5 text-[10.5px] font-semibold text-ec-ink40">{t('tagline')}</p>
      </div>
      <LanguageMenu current={locale} />
      <SupportButton />
    </header>
  )
}
