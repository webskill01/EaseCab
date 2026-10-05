'use client'

import { useRouter } from 'next/navigation'

/** "← Back" that returns to wherever the user came from (Profile, login, landing) —
 * a hard link to "/" dumped in-app users on the marketing page. Direct opens (no
 * history) fall back to the home page. */
export function BackLink() {
  const router = useRouter()
  const onBack = () => (window.history.length > 1 ? router.back() : router.push('/'))
  return (
    <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
      &larr; Back
    </button>
  )
}
