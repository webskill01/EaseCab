'use client'

import { useProfile } from '../hooks/useProfile'
import { useFilings } from '@/features/seva/hooks/useBorderTax'
import { savedVehicles } from '../lib/savedVehicles'

/** `list` id for any RC number input that should suggest the driver's saved numbers. */
export const SAVED_RC_LIST = 'ec-saved-rc'

/**
 * Saved RC numbers (profile + past filings) as the browser's own suggestion dropdown: shown when the
 * box is focused/empty, narrowed as the driver types (native <datalist>, user ask 2026-11-07 — no chips).
 * Render once next to an `<input list={SAVED_RC_LIST}>`.
 */
export function SavedVehicleOptions() {
  const profile = useProfile()
  const filings = useFilings() // non-members get a 403 here → profile RC only
  const list = savedVehicles(profile.data?.verification?.carRegNo, filings.data)
  return (
    <datalist id={SAVED_RC_LIST}>
      {list.map((v) => <option key={v} value={v} />)}
    </datalist>
  )
}
