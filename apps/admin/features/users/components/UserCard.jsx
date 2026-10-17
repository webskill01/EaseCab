'use client'

import { MapPin, Car, ShieldCheck, Crown, Trash2, RotateCcw } from 'lucide-react'
import { Avatar } from '@/features/shell/components/Avatar'
import { button, pill, card } from '@/lib/ui'

const BADGE_TONE = { approved: 'green', submitted: 'amber', rejected: 'red', none: 'slate' }
const SUB_TONE = { active: 'green', expired: 'slate', halted: 'amber', cancelled: 'red' }

function Fact({ icon: Icon, children }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-ec-ink60">
      <Icon size={14} className="text-ec-ink40" />
      <span className="text-ec-ink">{children}</span>
    </span>
  )
}

export function UserCard({ user, onAction }) {
  const sub = user.subscription
  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ec-ink">{user.name ?? '—'}</span>
            <span className="font-mono text-sm text-ec-ink60">{user.phoneMasked}</span>
            {user.isDeleted && <span className={pill({ tone: 'red' })}>Deleted</span>}
            {user.aadhaarVerified && <span className={pill({ tone: 'blue' })}><ShieldCheck size={12} />Aadhaar ✓</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <Fact icon={MapPin}>{user.baseCity ?? '—'}</Fact>
            <Fact icon={Car}>{user.vehicleType ?? '—'}</Fact>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className={pill({ tone: BADGE_TONE[user.verificationStatus] ?? 'slate' })}>Badge: {user.verificationStatus}</span>
            <span className={pill({ tone: sub ? SUB_TONE[sub.status] ?? 'slate' : 'slate' })}><Crown size={12} />{sub ? sub.status : 'no plan'}</span>
          </div>
        </div>
        <div className="shrink-0">
          {user.isDeleted ? (
            <button type="button" onClick={() => onAction(user.id, 'restore')} className={button({ size: 'sm' })}>
              <RotateCcw size={14} /> Restore
            </button>
          ) : (
            <button type="button" onClick={() => onAction(user.id, 'delete')} className={button({ variant: 'dangerOutline', size: 'sm' })}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
