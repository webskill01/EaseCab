'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Crown, Trash2, RotateCcw, ExternalLink, Car, User, Receipt, Activity, Bell } from 'lucide-react'
import { useUser } from '@/features/users/hooks/useUsers'
import { Avatar } from '@/features/shell/components/Avatar'
import { ListSkeleton, ErrorState } from '@/features/shell/components/QueryState'
import { planOf, fmtDate } from '@/features/users/lib/plan'
import { button, pill, card } from '@/lib/ui'

const BADGE_TONE = { approved: 'green', submitted: 'amber', rejected: 'red', none: 'slate' }
const PAY_TONE = { captured: 'green', created: 'slate', failed: 'red' }

function Section({ icon: Icon, title, children }) {
  return (
    <section className={card}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-ec-ink"><Icon size={16} className="text-ec-blue" />{title}</h2>
      {children}
    </section>
  )
}

/** Label/value grid; null/empty values render as an em dash. */
function Facts({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-ec-ink40">{label}</dt>
          <dd className="break-words text-ec-ink">{value === null || value === undefined || value === '' ? '—' : value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DocLink({ href, children }) {
  if (!href) return <span className={pill({ tone: 'slate' })}>{children}: none</span>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${pill({ tone: 'blue' })} hover:bg-blue-100`}>
      {children} <ExternalLink size={11} />
    </a>
  )
}

export default function UserProfilePage() {
  const { userId } = useParams()
  const { user, isLoading, isError, action } = useUser(userId)

  const back = (
    <Link href="/users" className={`${button({ variant: 'ghost', size: 'sm' })} mb-4`}><ArrowLeft size={14} /> All users</Link>
  )
  if (isLoading) return <div>{back}<ListSkeleton /></div>
  if (isError || !user) return <div>{back}<ErrorState message="Could not load this user." /></div>

  const plan = planOf(user.subscription)
  const sub = user.subscription
  return (
    <div>
      {back}
      <div className={`${card} mb-4 flex flex-col gap-4 sm:flex-row sm:items-center`}>
        <Avatar name={user.name} src={user.avatarUrl} size="h-20 w-20 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ec-ink sm:text-2xl">{user.name ?? 'No name'}</h1>
          <p className="font-mono text-sm text-ec-ink60">{user.phoneMasked}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.isDeleted && <span className={pill({ tone: 'red' })}>Deleted {fmtDate(user.deletedAt)}</span>}
            {user.flaggedAt && <span className={pill({ tone: 'red' })}>Hidden by reports</span>}
            <span className={pill({ tone: plan.tone })}><Crown size={12} />{plan.label}</span>
            <span className={pill({ tone: BADGE_TONE[user.verificationStatus] ?? 'slate' })}>Badge: {user.verificationStatus}</span>
            {user.aadhaarVerified && <span className={pill({ tone: 'blue' })}><ShieldCheck size={12} />Aadhaar ✓</span>}
          </div>
        </div>
        <button
          type="button"
          disabled={action.isPending}
          onClick={() => action.mutate({ userId: user.id, action: user.isDeleted ? 'restore' : 'delete' })}
          className={button({ variant: user.isDeleted ? 'outline' : 'dangerOutline' })}
        >
          {user.isDeleted ? <><RotateCcw size={15} /> Restore</> : <><Trash2 size={15} /> Delete</>}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={User} title="Profile">
          <Facts rows={[
            ['Joined', fmtDate(user.createdAt)],
            ['Base city', user.baseCity],
            ['Working city', user.workingCity],
            ['Last known city', user.lastKnownCity],
            ['Experience', user.experience !== null && user.experience !== undefined ? `${user.experience} yrs` : null],
            ['Languages', user.languagesSpoken?.join(', ')],
            ['Bio', user.bio],
          ]} />
        </Section>

        <Section icon={Car} title="Vehicle & documents">
          <Facts rows={[
            ['Vehicle type', user.vehicleType],
            ['Car', [user.carMake, user.carModel].filter(Boolean).join(' ')],
            ['Registration', user.carRegNo],
            ['Aadhaar', user.aadhaarLast4 ? `•••• ${user.aadhaarLast4}` : null],
          ]} />
          <div className="mt-3 flex flex-wrap gap-2">
            <DocLink href={user.images.licence}>Licence</DocLink>
            <DocLink href={user.images.rc}>RC</DocLink>
            <DocLink href={user.images.carFront}>Car front</DocLink>
            <DocLink href={user.images.carBack}>Car back</DocLink>
          </div>
        </Section>

        <Section icon={Receipt} title="Membership & payments">
          <Facts rows={[
            ['Status', plan.label],
            ['First paid', fmtDate(sub?.paidStartedAt)],
            ['Valid until', fmtDate(sub?.validUntil)],
          ]} />
          {user.payments.length > 0 ? (
            <ul className="mt-3 divide-y divide-ec-line rounded-lg border border-ec-line text-sm">
              {user.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-ec-ink60">{fmtDate(p.createdAt)}</span>
                  <span className="font-semibold text-ec-ink">₹{p.amount}</span>
                  <span className={pill({ tone: PAY_TONE[p.status] ?? 'slate' })}>{p.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-ec-ink60">No payments yet.</p>}
        </Section>

        <Section icon={Activity} title="Activity">
          <div className="grid grid-cols-2 gap-3">
            {[['Rides posted', user.counts.postedRides], ['Rides contacted', user.counts.contacts], ['Reports against', user.counts.reportsReceived], ['Reports filed', user.counts.reportsFiled]].map(([label, n]) => (
              <div key={label} className="rounded-lg bg-ec-bg p-3">
                <p className="text-2xl font-bold text-ec-ink">{n}</p>
                <p className="text-xs text-ec-ink60">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ec-ink60">
            <Bell size={12} /> Push: bot rides {user.notifyBotRides ? 'on' : 'off'} · posted rides {user.notifyPostedRides ? 'on' : 'off'}
          </p>
        </Section>
      </div>
    </div>
  )
}
