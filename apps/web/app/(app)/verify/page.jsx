import { Suspense } from 'react'
import { VerifyScreen } from '@/features/verification/components/VerifyScreen'

/** /verify — Aadhaar (L1) + driver (L2) flows (Step 21c). Suspense for useSearchParams. */
export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyScreen />
    </Suspense>
  )
}
