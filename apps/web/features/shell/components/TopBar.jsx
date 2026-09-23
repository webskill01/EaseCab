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
      {/* Logo and the two-line wordmark share one 36px box: 20px name + 5px gap + 11px tagline. */}
      <Image src="/icons/icon-96.png" unoptimized alt="" width={36} height={36} priority className="h-9 w-9 shrink-0 rounded-[9px]" />
      <div className="flex h-9 min-w-0 flex-1 flex-col justify-center gap-[5px]">
        <p className="truncate text-[20px] font-extrabold leading-none tracking-tight text-ec-ink">{t('appName')}</p>
        <p className="truncate text-[11px] font-semibold leading-none text-ec-ink40">{t('tagline')}</p>
      </div>
      <LanguageMenu current={locale} />
      <SupportButton />
    </header>
  )
}
