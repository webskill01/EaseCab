'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, TrendingUp, BadgeCheck, Flag, UserX, Users, MapPin, Route, Filter, MessagesSquare, X, HandCoins, Gift, HeartHandshake,
} from 'lucide-react'
import { useStats } from '@/features/dashboard/hooks/useStats'
import { cn } from '@/lib/utils'
import { LogoutButton } from './LogoutButton'

// `count` = key in /admin/stats; shown as a live badge so open queues stand out.
const NAV = [
  { group: 'Overview', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/statistics', label: 'Statistics', icon: BarChart3 },
    { href: '/track-record', label: 'Track Record', icon: TrendingUp },
  ] },
  { group: 'Queues', items: [
    { href: '/verifications', label: 'Verifications', icon: BadgeCheck, count: 'pendingVerifications' },
    { href: '/reports', label: 'Reports', icon: Flag, count: 'openReports' },
    { href: '/user-reports', label: 'User Reports', icon: UserX },
    { href: '/city-strings', label: 'City Strings', icon: MapPin, count: 'unresolvedCities' },
    { href: '/unresolved-rides', label: 'Unresolved Rides', icon: Route },
  ] },
  { group: 'Manage', items: [
    { href: '/users', label: 'Users', icon: Users },
    { href: '/founder-payments', label: 'Founder Payments', icon: HandCoins },
    { href: '/free-members', label: 'Free Members', icon: HeartHandshake },
    { href: '/referrals', label: 'Referrals', icon: Gift },
    { href: '/bot-filters', label: 'Bot Filters', icon: Filter },
    { href: '/wa-groups', label: 'WhatsApp Groups', icon: MessagesSquare },
  ] },
]

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- static 192px brand icon */}
      <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ec-ink">Admin</span>
        <span className="block text-xs text-ec-ink60">EaseCab</span>
      </span>
    </div>
  )
}

function NavLink({ href, label, icon: Icon, count, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'mb-0.5 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
        active ? 'bg-ec-sky text-ec-blueDeep' : 'text-ec-ink60 hover:bg-ec-bg hover:text-ec-ink',
      )}
    >
      <Icon size={16} />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        // aria-hidden keeps the link's accessible name exactly its label.
        <span aria-hidden="true" className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {count}
        </span>
      )}
    </Link>
  )
}

/** Left nav. Static on md+, slide-in drawer below md (`open` + `onClose`). */
export function Sidebar({ open = false, onClose = () => {} }) {
  const pathname = usePathname()
  const { data: stats } = useStats()
  const isActive = (href) => (href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href)))

  return (
    <>
      <div
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-ec-ink/20 transition-opacity md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-ec-line bg-white transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ec-line px-5">
          <Brand />
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-ec-ink60 hover:bg-ec-bg md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-ec-ink40">{section.group}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  count={item.count ? stats?.[item.count] ?? 0 : 0}
                  active={isActive(item.href)}
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-ec-line p-3">
          <LogoutButton />
        </div>
      </nav>
    </>
  )
}
