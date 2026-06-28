'use client'

export function UserCard({ user, onAction }) {
  const sub = user.subscription
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <span className="text-sm font-semibold text-ec-ink">{user.name ?? '—'}</span>
          <span className="ml-2 text-sm text-ec-ink60">{user.phoneMasked}</span>
          {user.isDeleted && (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Deleted</span>
          )}
          {user.aadhaarVerified && (
            <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-ec-ink60">Aadhaar ✓</span>
          )}
        </div>
        {user.isDeleted ? (
          <button type="button" onClick={() => onAction(user.id, 'restore')} className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
            Restore
          </button>
        ) : (
          <button type="button" onClick={() => onAction(user.id, 'delete')} className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
            Delete
          </button>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 break-words text-sm text-ec-ink60 sm:grid-cols-2">
        <div><dt className="inline">City: </dt><dd className="inline text-ec-ink">{user.baseCity ?? '—'}</dd></div>
        <div><dt className="inline">Vehicle: </dt><dd className="inline text-ec-ink">{user.vehicleType ?? '—'}</dd></div>
        <div><dt className="inline">Badge: </dt><dd className="inline text-ec-ink">{user.verificationStatus}</dd></div>
        <div><dt className="inline">Subscription: </dt><dd className="inline text-ec-ink">{sub ? sub.status : '—'}</dd></div>
      </dl>
    </div>
  )
}
