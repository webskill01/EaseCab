'use client'

export function UserCard({ user, onAction }) {
  const sub = user.subscription
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
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
          <button type="button" onClick={() => onAction(user.id, 'restore')} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
            Restore
          </button>
        ) : (
          <button type="button" onClick={() => onAction(user.id, 'delete')} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
            Delete
          </button>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ec-ink60">
        <div><dt className="inline">City: </dt><dd className="inline text-ec-ink">{user.baseCity ?? '—'}</dd></div>
        <div><dt className="inline">Vehicle: </dt><dd className="inline text-ec-ink">{user.vehicleType ?? '—'}</dd></div>
        <div><dt className="inline">Badge: </dt><dd className="inline text-ec-ink">{user.verificationStatus}</dd></div>
        <div><dt className="inline">Subscription: </dt><dd className="inline text-ec-ink">{sub ? sub.status : '—'}</dd></div>
      </dl>
    </div>
  )
}
