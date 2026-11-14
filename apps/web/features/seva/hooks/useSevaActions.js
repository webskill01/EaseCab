'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMembership } from '@/features/subscription/hooks/useMembership'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'

/**
 * Seva buttons (feed strip + Seva tab) are members-only: a non-member's tap opens the
 * gate instead. Loading membership counts as not-member (membershipView(undefined) = EXPIRED).
 * @returns {{ openBorderTax: () => void, openWaGroup: () => void, sheet: null | 'gate' | 'wa', close: () => void }}
 */
export function useSevaActions() {
  const router = useRouter()
  const membership = useMembership()
  const [sheet, setSheet] = useState(null)
  const member = membershipView(membership.data).state === MEMBERSHIP_STATE.ACTIVE
  const guard = (fn) => () => (member ? fn() : setSheet('gate'))
  return {
    openBorderTax: guard(() => router.push('/seva/border-tax')),
    openWaGroup: guard(() => setSheet('wa')),
    sheet,
    close: () => setSheet(null),
  }
}
