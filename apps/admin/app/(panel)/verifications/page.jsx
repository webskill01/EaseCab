'use client'

import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useVerifications } from '@/features/verifications/hooks/useVerifications'
import { VerificationCard } from '@/features/verifications/components/VerificationCard'
import { RejectDialog } from '@/features/verifications/components/RejectDialog'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

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
  const { items, total, limit, page, setPage, isLoading, isError, review, badge } = useVerifications()
  const [rejecting, setRejecting] = useState(null)
  const groups = groupByUser(items)

  return (
    <div>
      <PageHeader
        icon={BadgeCheck}
        title="Verifications"
        count={total}
        description="Driving licence and RC submissions waiting for review, grouped per driver."
      />

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load the queue." emptyMessage="Queue is clear." emptyHint="New DL / RC submissions show up here.">
        <div className="flex flex-col gap-4">
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
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      <RejectDialog
        key={rejecting?.id ?? 'none'}
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
