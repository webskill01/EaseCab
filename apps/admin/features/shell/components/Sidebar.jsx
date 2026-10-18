'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, TrendingUp, BadgeCheck, Flag, UserX, Users, MapPin, Route, Filter, MessagesSquare, Car, X, HandCoins,
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
    { href: '/bot-filters', label: 'Bot Filters', icon: Filter },
    { href: '/wa-groups', label: 'WhatsApp Groups', icon: MessagesSquare },
  ] },
]

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ec-blue to-ec-blueInk text-white shadow-lg shadow-ec-blue/30">
        <Car size={18} />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">EaseCab</span>
        <span className="block text-[11px] text-slate-400">Admin panel</span>
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
        'group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active ? 'bg-ec-blue text-white shadow-md shadow-ec-blue/25' : 'text-slate-300 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon size={17} className={active ? '' : 'text-slate-500 group-hover:text-slate-300'} />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        // aria-hidden keeps the link's accessible name exactly its label.
        <span aria-hidden="true" className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', active ? 'bg-white/25 text-white' : 'bg-amber-400 text-slate-900')}>
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
        className={cn('fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-900 p-4 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2 pt-1">
          <Brand />
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.group}</p>
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

        <div className="mt-4 border-t border-white/10 pt-4">
          <LogoutButton />
        </div>
      </nav>
    </>
  )
}
