'use client'

import { useEffect, useState } from 'react'
import { useReferrals, useClaimReferrer } from '../hooks/useReferrals'
import { readInvite, clearInvite } from '../lib/invite'

const isFinal = (err) => [404, 409, 422].includes(err?.status)

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
    // Success, 404 (bad link), 409 (already set) and 422 (window/self) are final. Network,
    // 401, 429 or 5xx keep the code so the next app open tries again (7-day window still applies).
    claim.mutate({ code }, { onSuccess: clearInvite, onError: (err) => isFinal(err) && clearInvite() })
  }, [code, data, claim])

  return null
}
