'use client'

import { useEffect, useState } from 'react'
import { useReferrals, useClaimReferrer } from '../hooks/useReferrals'
import { readInvite, clearInvite } from '../lib/invite'

/**
 * Signed-in shell: if this device opened someone's invite link, link me to them once
 * (inside the 7-day window). Renders nothing; only queries when an invite is stored.
 */
export function AutoClaimReferral() {
  const [code] = useState(readInvite)
  const { data } = useReferrals({ enabled: Boolean(code) })
  const claim = useClaimReferrer()

  useEffect(() => {
    if (!code || !data?.enabled || claim.isPending || claim.isSuccess || claim.isError) return
    if (!data.canClaim) { clearInvite(); return }
    claim.mutate({ code }, { onSettled: clearInvite }) // 404/409/422 are final too — don't retry
  }, [code, data, claim])

  return null
}
