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
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card p-4">
      <div className="mb-4 px-3 text-sm font-semibold text-ec-ink">EaseCab Admin</div>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm text-ec-ink60 hover:bg-muted hover:text-ec-ink"
        >
          {item.label}
        </Link>
      ))}
      <div className="mt-auto pt-4">
        <LogoutButton />
      </div>
    </nav>
  )
}
