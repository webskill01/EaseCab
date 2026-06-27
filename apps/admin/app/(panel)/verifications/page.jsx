'use client'

import { useState } from 'react'
import { useVerifications } from '@/features/verifications/hooks/useVerifications'
import { VerificationCard } from '@/features/verifications/components/VerificationCard'
import { RejectDialog } from '@/features/verifications/components/RejectDialog'

/** Group a flat submission list into one entry per person (keyed by user id), keeping
 * submission order. Each group carries the shared user + that user's submissions. */
function groupByUser(items) {
  const map = new Map()
  for (const item of items) {
    const g = map.get(item.user.id) ?? { user: item.user, submissions: [] }
    g.submissions.push(item)
    map.set(item.user.id, g)
  }
  return [...map.values()]
}

export default function VerificationsPage() {
  const { items, isLoading, isError, review, badge } = useVerifications()
  const [rejecting, setRejecting] = useState(null)
  const groups = groupByUser(items)

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">
        Verifications <span className="text-sm font-normal text-ec-ink60">({groups.length})</span>
      </h1>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load the queue.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">Queue is clear.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {groups.map((group) => (
          <VerificationCard
            key={group.user.id}
            group={group}
            onApprove={(id) => review.mutate({ id, action: 'approve' })}
            onReject={(it) => setRejecting(it)}
            onBadge={(userId, status) => badge.mutate({ userId, status })}
          />
        ))}
      </div>

      <RejectDialog
        item={rejecting}
        onCancel={() => setRejecting(null)}
        onConfirm={(id, rejectionReason) => {
          review.mutate({ id, action: 'reject', rejectionReason })
          setRejecting(null)
        }}
      />
    </div>
  )
}
