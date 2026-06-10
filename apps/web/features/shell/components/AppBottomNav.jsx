'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Steer, Plus, List, User } from '@/components/ui/icons'

/**
 * App bottom navigation (appshell.jsx AppBottomNav): Rides · Post (blue FAB) · My
 * Rides · Profile. Post/Mine/Profile route to their screens as they're built
 * (Steps 19–21) — placeholder pages stand in until then.
 */
const ITEMS = [
  ['/feed', 'nav.rides', Steer, false],
  ['/post', 'nav.post', Plus, true],
  ['/mine', 'nav.mine', List, false],
  ['/profile', 'nav.profile', User, false],
]

export function AppBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')
  return (
    <nav className="z-10 flex shrink-0 items-center justify-around border-t border-ec-line bg-white px-2 pb-2 pt-1.5 shadow-[0_-2px_12px_rgba(15,23,42,0.04)]">
      {ITEMS.map(([href, key, Icon, isPost]) => {
        const active = pathname === href
        if (isPost) {
          return (
            <button key={href} type="button" onClick={() => router.push(href)} className="flex flex-1 flex-col items-center gap-0.5">
              <span className="flex h-9 w-[52px] items-center justify-center rounded-xl bg-ec-blue text-white shadow-ec-blue"><Icon size={24} /></span>
              <span className={`text-[10.5px] ${active ? 'font-extrabold text-ec-blue' : 'font-bold text-ec-ink60'}`}>{t(key)}</span>
            </button>
          )
        }
        return (
          <button key={href} type="button" onClick={() => router.push(href)} className={`flex flex-1 flex-col items-center gap-1 ${active ? 'text-ec-blue' : 'text-ec-ink40'}`} aria-current={active ? 'page' : undefined}>
            <Icon size={23} />
            <span className={`text-[10.5px] ${active ? 'font-extrabold' : 'font-semibold'}`}>{t(key)}</span>
          </button>
        )
      })}
    </nav>
  )
}
