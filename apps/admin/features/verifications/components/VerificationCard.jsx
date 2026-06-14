'use client'

import { BadgeControl } from './BadgeControl'

const IMG_LABELS = [
  ['licence', 'Licence'],
  ['rc', 'RC'],
  ['carFront', 'Car front'],
  ['carBack', 'Car back'],
  ['dp', 'Photo'],
]

export function VerificationCard({ item, onApprove, onReject, onBadge }) {
  const { user, images } = item
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-ec-ink">{item.docType}</span>
          <span className="ml-2 text-sm font-medium text-ec-ink">{user.name ?? '—'}</span>
          <span className="ml-2 text-sm text-ec-ink60">{user.phoneMasked}</span>
        </div>
        <BadgeControl status={user.verificationStatus} onChange={(status) => onBadge(user.id, status)} />
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ec-ink60">
        <div><dt className="inline">Verified name: </dt><dd className="inline text-ec-ink">{item.verifiedName ?? '—'}</dd></div>
        <div><dt className="inline">Car: </dt><dd className="inline text-ec-ink">{[user.carMake, user.carModel, user.carRegNo].filter(Boolean).join(' ') || '—'}</dd></div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-3">
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

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onApprove(item.id)} className="rounded-md bg-ec-blue px-3 py-1.5 text-sm font-medium text-white">
          Approve
        </button>
        <button type="button" onClick={() => onReject(item)} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
          Reject
        </button>
      </div>
    </div>
  )
}
