'use client'

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
    <div className="rounded-md border border-ec-line p-3">
      <div className="flex items-center justify-between">
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-ec-ink">{submission.docType}</span>
        <span className="text-sm text-ec-ink60">Verified name: <span className="text-ec-ink">{submission.verifiedName ?? '—'}</span></span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        {IMG_LABELS.map(([key, label]) =>
          images[key] ? (
            <a key={key} href={images[key]} target="_blank" rel="noreferrer" className="text-xs text-ec-blue underline">
              {label}
            </a>
          ) : (
            <span key={key} className="text-xs text-ec-ink40">{label}: none</span>
          ),
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onApprove(submission.id)} className="rounded-md bg-ec-blue px-3 py-1.5 text-sm font-medium text-white">
          Approve
        </button>
        <button type="button" onClick={() => onReject(submission)} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
          Reject
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
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-ec-ink">{user.name ?? '—'}</span>
          <span className="ml-2 text-sm text-ec-ink60">{user.phoneMasked}</span>
          <span className="ml-2 text-xs text-ec-ink40">({submissions.length} doc{submissions.length === 1 ? '' : 's'})</span>
        </div>
        <BadgeControl status={user.verificationStatus} onChange={(status) => onBadge(user.id, status)} />
      </div>

      <p className="mt-1 text-sm text-ec-ink60">Car: <span className="text-ec-ink">{car}</span></p>

      <div className="mt-3 flex flex-col gap-3">
        {submissions.map((submission) => (
          <SubmissionBlock key={submission.id} submission={submission} onApprove={onApprove} onReject={onReject} />
        ))}
      </div>
    </div>
  )
}
