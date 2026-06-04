import { useTranslations } from 'next-intl'
import { LanguageMenu } from './LanguageMenu'
import { LogoutButton } from './LogoutButton'

/**
 * App chrome (DESIGN.md §6.1): brand on the left, language switcher + logout on
 * the right. The language switcher lives here (not the login screen) per the
 * locked decision. `locale` comes from the server layout.
 */
export function TopBar({ locale }) {
  const t = useTranslations('common')
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ec-line bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ec-blue font-extrabold text-white">
          E
        </div>
        <div className="leading-none">
          <p className="text-[18px] font-extrabold tracking-tight text-ec-ink">{t('appName')}</p>
          <p className="text-[10.5px] font-semibold text-ec-ink40">{t('tagline')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageMenu current={locale} />
        <LogoutButton />
      </div>
    </header>
  )
}
