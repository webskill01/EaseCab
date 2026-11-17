import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * A user's name that opens their admin profile (/users/:id), the same link the Users
 * page uses. Plain text when the row carries no user id.
 * @param {{ id?: string|null, children: React.ReactNode, className?: string }} props
 */
export function UserLink({ id, children, className }) {
  if (!id) return <span className={className}>{children}</span>
  return (
    <Link href={`/users/${id}`} className={cn(className, 'hover:text-ec-blue hover:underline')}>
      {children}
    </Link>
  )
}
