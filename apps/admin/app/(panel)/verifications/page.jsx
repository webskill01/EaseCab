'use client'

import { useState } from 'react'
import { useVerifications } from '@/features/verifications/hooks/useVerifications'
import { VerificationCard } from '@/features/verifications/components/VerificationCard'
import { RejectDialog } from '@/features/verifications/components/RejectDialog'

export default function VerificationsPage() {
  const { items, total, isLoading, isError, review, badge } = useVerifications()
  const [rejecting, setRejecting] = useState(null)

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">
        Verifications <span className="text-sm font-normal text-ec-ink60">({total})</span>
      </h1>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load the queue.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">Queue is clear.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <VerificationCard
            key={item.id}
            item={item}
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
