'use client'

import { Check, X, ExternalLink, Car } from 'lucide-react'
import { Avatar } from '@/features/shell/components/Avatar'
import { PhoneLink } from '@/features/shell/components/PhoneLink'
import { button, pill, card } from '@/lib/ui'
import { BadgeControl } from './BadgeControl'

const IMG_LABELS = [
  ['licence', 'Licence'],
  ['rc', 'RC'],
  ['carFront', 'Car front'],
  ['carBack', 'Car back'],
  ['dp', 'Photo'],
]

/** One submission's images + verified name + its own Approve/Reject (review is per
 * submission, even though submissions are grouped under one person). */
function SubmissionBlock({ submission, onApprove, onReject }) {
  const { images } = submission
  return (
    <div className="rounded-xl border border-ec-line bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`${pill({ tone: submission.docType === 'dl' ? 'blue' : 'violet' })} uppercase`}>{submission.docType}</span>
        <span className="min-w-0 break-words text-sm text-ec-ink60">Verified name: <span className="font-medium text-ec-ink">{submission.verifiedName ?? '—'}</span></span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {IMG_LABELS.map(([key, label]) =>
          images[key] ? (
            <a
              key={key}
              href={images[key]}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-ec-line bg-white px-2.5 py-1 text-xs font-medium text-ec-blue transition hover:border-ec-blue hover:bg-ec-sky"
            >
              {label} <ExternalLink size={12} />
            </a>
          ) : (
            <span key={key} className="rounded-lg border border-dashed border-ec-line px-2.5 py-1 text-xs text-ec-ink40">{label}: none</span>
          ),
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onApprove(submission.id)} className={button({ variant: 'success', size: 'sm' })}>
          <Check size={14} /> Approve
        </button>
        <button type="button" onClick={() => onReject(submission)} className={button({ variant: 'dangerOutline', size: 'sm' })}>
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  )
}

/**
 * One card per PERSON. All of a user's pending submissions (DL, RC, …) are grouped
 * here — shared identity (name, phone, car) shown once, with the verified-driver badge
 * control, then a block per submission carrying its own images + Approve/Reject.
 * @param {{ group: { user: object, submissions: object[] } }} props
 */
export function VerificationCard({ group, onApprove, onReject, onBadge }) {
  const { user, submissions } = group
  const car = [user.carMake, user.carModel, user.carRegNo].filter(Boolean).join(' ') || '—'
  return (
    <div className={card}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-ec-ink">{user.name ?? '—'}</span>
              <PhoneLink phone={user.phone} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ec-ink60">
              <Car size={14} className="text-ec-ink40" /> <span className="text-ec-ink">{car}</span>
              <span className="text-xs text-ec-ink40">· {submissions.length} doc{submissions.length === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
        <BadgeControl status={user.verificationStatus} onChange={(status) => onBadge(user.id, status)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {submissions.map((submission) => (
          <SubmissionBlock key={submission.id} submission={submission} onApprove={onApprove} onReject={onReject} />
        ))}
      </div>
    </div>
  )
}
