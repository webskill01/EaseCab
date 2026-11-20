'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Steer, Grid, Plus, List, User } from '@/components/ui/icons'

/**
 * App bottom navigation: Rides · Seva · Post (raised blue FAB in the middle) · My Rides ·
 * Profile. A tab stays active on its sub-pages.
 */
const ITEMS = [
  ['/feed', 'nav.rides', Steer, false],
  ['/seva', 'nav.seva', Grid, false],
  ['/post', 'nav.post', Plus, true],
  ['/mine', 'nav.mine', List, false],
  ['/profile', 'nav.profile', User, false],
]

export function AppBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')
  return (
    <nav className="z-10 flex shrink-0 items-center justify-around border-t border-ec-line bg-white px-2 pb-1.5 pt-1 shadow-[0_-2px_12px_rgba(15,23,42,0.04)]">
      {ITEMS.map(([href, key, Icon, isPost]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        if (isPost) {
          return (
            <button key={href} type="button" onClick={() => router.push(href)} className="flex flex-1 flex-col items-center gap-0.5" aria-current={active ? 'page' : undefined}>
              <span className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-ec-blue text-white shadow-ec-blue ring-4 ring-white transition-transform active:scale-95"><Icon size={24} /></span>
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
