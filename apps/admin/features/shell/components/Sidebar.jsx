import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

// The four feature sections (24b–24e). Their pages are stubs until each sub-step lands.
const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/verifications', label: 'Verifications' },
  { href: '/reports', label: 'Reports' },
  { href: '/user-reports', label: 'User Reports' },
  { href: '/users', label: 'Users' },
  { href: '/city-strings', label: 'City Strings' },
  { href: '/unresolved-rides', label: 'Unresolved Rides' },
]

export function Sidebar() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-card p-3 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-4">
      <div className="hidden px-3 text-sm font-semibold text-ec-ink md:mb-4 md:block">EaseCab Admin</div>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm text-ec-ink60 hover:bg-muted hover:text-ec-ink"
        >
          {item.label}
        </Link>
      ))}
      <div className="shrink-0 md:mt-auto md:pt-4">
        <LogoutButton />
      </div>
    </nav>
  )
}
