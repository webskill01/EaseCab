'use client'

import Link from 'next/link'
import { MapPin, Car, ShieldCheck, Crown, Trash2, RotateCcw, CalendarDays, ChevronRight } from 'lucide-react'
import { Avatar } from '@/features/shell/components/Avatar'
import { PhoneLink } from '@/features/shell/components/PhoneLink'
import { button, pill, card } from '@/lib/ui'
import { planOf, fmtDate } from '../lib/plan'

const BADGE_TONE = { approved: 'green', submitted: 'amber', rejected: 'red', none: 'slate' }

function Fact({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-ec-ink60">
      <Icon size={14} className="shrink-0 text-ec-ink40" />
      <span className="text-ec-ink">{children}</span>
    </span>
  )
}

export function UserCard({ user, onAction }) {
  const plan = planOf(user.subscription)
  const car = [user.carMake, user.carModel].filter(Boolean).join(' ') || user.vehicleType
  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <Avatar name={user.name} src={user.avatarUrl} size="h-12 w-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/users/${user.id}`} className="font-semibold text-ec-ink hover:text-ec-blue hover:underline">{user.name ?? '—'}</Link>
            <PhoneLink phone={user.phone} />
            {user.isDeleted && <span className={pill({ tone: 'red' })}>Deleted</span>}
            {user.aadhaarVerified && <span className={pill({ tone: 'blue' })}><ShieldCheck size={12} />Aadhaar ✓</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <Fact icon={MapPin}>{user.baseCity ?? '—'}{user.workingCity && user.workingCity !== user.baseCity ? ` · works ${user.workingCity}` : ''}</Fact>
            <Fact icon={Car}>{car ?? '—'}{user.carRegNo ? ` · ${user.carRegNo}` : ''}</Fact>
            <Fact icon={CalendarDays}>Joined {fmtDate(user.createdAt)}</Fact>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className={pill({ tone: BADGE_TONE[user.verificationStatus] ?? 'slate' })}>Badge: {user.verificationStatus}</span>
            <span className={pill({ tone: plan.tone })}><Crown size={12} />{plan.label}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-ec-line pt-3">
        {user.isDeleted ? (
          <button type="button" onClick={() => onAction(user.id, 'restore')} className={button({ size: 'sm' })}>
            <RotateCcw size={14} /> Restore
          </button>
        ) : (
          <button type="button" onClick={() => onAction(user.id, 'delete')} className={button({ variant: 'dangerOutline', size: 'sm' })}>
            <Trash2 size={14} /> Delete
          </button>
        )}
        <Link href={`/users/${user.id}`} className={button({ variant: 'primary', size: 'sm' })}>
          Open profile <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}
